"""
Album Builder Router - FastAPI endpoints for AI face recognition album creation
Provides 3-step upload flow: References → Events → Build Album
"""

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends, BackgroundTasks
from fastapi.responses import StreamingResponse, FileResponse
import os
import tempfile
import zipfile
from pathlib import Path
from typing import Dict, List, Optional
import json
import shutil
import time
from datetime import datetime, timezone
import logging

from backend.auth import get_current_user
from backend.services.album_preprocessing import ImagePreprocessor
from backend.services.album_face_recognition import FaceRecognitionService

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/album-builder",
    tags=["Album Builder"]
)

# Global services (initialized on first use)
preprocessor = None
face_service = None

# Session storage (in production, use Redis or database)
# Format: {session_id: {step_data}}
sessions = {}

def get_preprocessor():
    """Get singleton preprocessor instance"""
    global preprocessor
    if preprocessor is None:
        preprocessor = ImagePreprocessor()
    return preprocessor

def get_face_service():
    """Get singleton face recognition service - STRICT INSIGHTFACE ONLY"""
    global face_service 
    if face_service is None:
        # Very permissive threshold for challenging Google Images
        # Threshold 0.20 = Maximum recall (catches difficult angles/poses)
        face_service = FaceRecognitionService(similarity_threshold=0.20)
        if not face_service.initialize_insightface():
            logger.error("❌ CRITICAL: InsightFace not available")
            logger.error("   Install: pip install insightface onnxruntime")
            raise RuntimeError("InsightFace required for album builder (no fallback allowed)")
        logger.info("✅ Using InsightFace service (threshold=0.78, STRICT mode)")
    return face_service


@router.post("/start-session")
async def start_album_session(
    current_user: dict = Depends(get_current_user)
):
    """
    Start a new album building session
    Returns session ID to track progress across steps
    """
    session_id = f"{current_user['id']}_{int(time.time())}"
    
    sessions[session_id] = {
        "user_id": current_user["id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "step": 1,  # Current step (1=references, 2=events, 3=build)
        "reference_photos": {},
        "event_photos": [],
        "status": "started"
    }
    
    logger.info(f"🚀 New album session started: {session_id} (user: {current_user['email']})")
    
    return {
        "success": True,
        "session_id": session_id,
        "message": "Album session started",
        "next_step": "upload_reference_photos"
    }


@router.post("/upload-references/{session_id}")
async def upload_reference_photos(
    session_id: str,
    reference_files: List[UploadFile] = File(...),
    person_names: str = Form(...),  # JSON string: ["John", "Sarah", "Mike"]
    current_user: dict = Depends(get_current_user)
):
    """
    Step 1: Upload reference photos for people to find
    Each person should have 1-3 clear photos for best accuracy
    """
    # Validate session
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session = sessions[session_id]
    if session["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Parse person names
    try:
        names = json.loads(person_names)
        if not isinstance(names, list) or len(names) == 0:
            raise ValueError("Person names must be non-empty list")
    except (json.JSONDecodeError, ValueError) as e:
        raise HTTPException(status_code=400, detail=f"Invalid person names: {e}")
    
    if len(reference_files) == 0:
        raise HTTPException(status_code=400, detail="No reference photos uploaded")
    
    logger.info(f"📸 Step 1 - Processing {len(reference_files)} reference photos for {len(names)} people")
    logger.info(f"   People: {names}")
    
    preprocessor = get_preprocessor()
    face_service = get_face_service()
    
    # Create temp directory for session
    temp_dir = os.path.join(tempfile.gettempdir(), f"album_session_{session_id}")
    ref_dir = os.path.join(temp_dir, "references")
    os.makedirs(ref_dir, exist_ok=True)
    
    try:
        # DUAL-PATH: Save originals + create preprocessed versions
        uploaded_files = []  # (filename, original_path, preprocessed_path)
        failed_files = []
        
        preprocessed_dir = os.path.join(ref_dir, "preprocessed")
        os.makedirs(preprocessed_dir, exist_ok=True)
        
        for i, file in enumerate(reference_files):
            try:
                # Save ORIGINAL file (for albums later)
                filename = f"ref_{i:03d}_{file.filename}"
                original_path = os.path.join(ref_dir, filename)
                
                with open(original_path, "wb") as buffer:
                    content = await file.read()
                    buffer.write(content)
                
                # Create PREPROCESSED version (for AI matching)
                preprocessed_path, metadata = preprocessor.preprocess_reference_photo(original_path, preprocessed_dir)
                
                if preprocessed_path:
                    uploaded_files.append((file.filename, original_path, preprocessed_path))
                    logger.info(f"   ✅ Saved: {file.filename} (original + preprocessed for AI)")
                else:
                    failed_files.append(file.filename)
                    logger.warning(f"   ❌ Preprocessing failed: {file.filename}")
                
            except Exception as e:
                logger.error(f"   ❌ Error processing {file.filename}: {e}")
                failed_files.append(file.filename)
        
        if len(uploaded_files) == 0:
            raise HTTPException(
                status_code=400, 
                detail="No valid reference photos uploaded. Please upload clear, front-facing photos."
            )
        
        # STRICT MODE: ONE photo per person (Google Photos style)
        # NO auto-distribution - MUST match count
        if len(uploaded_files) != len(names):
            raise HTTPException(
                status_code=400,
                detail=f"STRICT MODE: Upload exactly {len(names)} photo(s) for {len(names)} person(s). Got {len(uploaded_files)} valid photos."
            )
        
        reference_embeddings = {}
        photo_assignments = {}
        
        # One-to-one mapping: photo[i] → person[i]
        for i, person_name in enumerate(names):
            person_file = uploaded_files[i]  # (filename, original_path, preprocessed_path)
            
            # Extract embedding from PREPROCESSED version (better AI matching)
            preprocessed_path = person_file[2]
            embedding = face_service.get_multiple_reference_embeddings(
                [preprocessed_path], person_name, average=False  # NO AVERAGING
            )
            
            if embedding is not None:
                reference_embeddings[person_name] = embedding.tolist()  # Convert to JSON-serializable
                photo_assignments[person_name] = [person_file[0]]  # Original filename
                logger.info(f"   ✅ {person_name}: 1 photo (preprocessed for AI, original saved)")
            else:
                logger.error(f"   ❌ {person_name}: Failed validation (check: exactly 1 face?)")
                raise HTTPException(
                    status_code=400,
                    detail=f"Reference photo for {person_name} validation failed. Ensure photo has exactly ONE clear face."
                )
        
        # Update session
        session["reference_photos"] = reference_embeddings
        session["photo_assignments"] = photo_assignments
        session["reference_dir"] = ref_dir
        session["step"] = 2
        session["processed_count"] = len(uploaded_files)
        session["failed_count"] = len(failed_files)
        
        response_data = {
            "success": True,
            "processed_photos": len(uploaded_files),
            "failed_photos": len(failed_files),
            "people_registered": len(reference_embeddings),
            "photo_assignments": photo_assignments,
            "next_step": "upload_event_photos"
        }
        
        if len(failed_files) > 0:
            response_data["failed_files"] = failed_files
            response_data["message"] = f"Processed {len(uploaded_files)} photos (originals saved + preprocessed for AI). {len(failed_files)} failed."
        else:
            response_data["message"] = f"All {len(uploaded_files)} reference photos processed (originals + preprocessed for AI)"
        
        logger.info(f"✅ Step 1 complete: {len(reference_embeddings)} people registered")
        return response_data
        
    except Exception as e:
        # Cleanup on error
        if os.path.exists(temp_dir):
            shutil.rmtree(temp_dir, ignore_errors=True)
        raise HTTPException(status_code=500, detail=f"Reference processing failed: {str(e)}")


@router.post("/upload-events/{session_id}")
async def upload_event_photos(
    session_id: str,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
    event_files: List[UploadFile] = File(...)
):
    """
    Step 2: Upload event photos to search for registered people
    Preprocessing is more flexible to handle varied photo quality
    """
    # Validate session
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session = sessions[session_id]
    if session["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    if session["step"] != 2:
        raise HTTPException(status_code=400, detail="Upload reference photos first")
    
    if len(event_files) == 0:
        raise HTTPException(status_code=400, detail="No event photos uploaded")
    
    logger.info(f"🎉 Step 2 - Processing {len(event_files)} event photos")
    
    preprocessor = get_preprocessor()
    
    # Get temp directory
    temp_dir = os.path.join(tempfile.gettempdir(), f"album_session_{session_id}")
    event_dir = os.path.join(temp_dir, "events")
    os.makedirs(event_dir, exist_ok=True)
    
    try:
        # DUAL-PATH: Save originals + create preprocessed versions
        uploaded_files = []  # [(original_path, preprocessed_path)]
        failed_files = []
        
        preprocessed_dir = os.path.join(event_dir, "preprocessed")
        os.makedirs(preprocessed_dir, exist_ok=True)
        
        for i, file in enumerate(event_files):
            try:
                # Save ORIGINAL file (for albums later)
                filename = f"event_{i:04d}_{file.filename}"
                original_path = os.path.join(event_dir, filename)
                
                with open(original_path, "wb") as buffer:
                    content = await file.read()
                    buffer.write(content)
                
                # Create PREPROCESSED version (for AI matching)
                preprocessed_path, metadata = preprocessor.preprocess_event_photo(original_path, preprocessed_dir)
                
                if preprocessed_path:
                    uploaded_files.append((original_path, preprocessed_path))
                    if i % 100 == 0:  # Log progress every 100 files
                        logger.info(f"   Processed: {i+1}/{len(event_files)} (originals + preprocessed)")
                else:
                    failed_files.append(file.filename)
                
            except Exception as e:
                logger.error(f"   ❌ Error processing {file.filename}: {e}")
                failed_files.append(file.filename)
        
        if len(uploaded_files) == 0:
            raise HTTPException(
                status_code=400,
                detail="No valid event photos uploaded"
            )
        
        # Update session with BOTH paths
        session["event_photos"] = uploaded_files  # [(original, preprocessed)]
        session["event_originals"] = [f[0] for f in uploaded_files]  # Original paths
        session["event_preprocessed"] = [f[1] for f in uploaded_files]  # Preprocessed paths
        session["event_dir"] = event_dir
        session["step"] = 3
        session["event_processed_count"] = len(uploaded_files)
        session["event_failed_count"] = len(failed_files)
        
        response_data = {
            "success": True,
            "processed_photos": len(uploaded_files),
            "failed_photos": len(failed_files),
            "next_step": "build_album"
        }
        
        if len(failed_files) > 0:
            response_data["failed_files"] = failed_files[:10]  # Show first 10 failed files
            response_data["message"] = f"Processed {len(uploaded_files)} photos (originals saved + preprocessed for AI). {len(failed_files)} failed."
        else:
            response_data["message"] = f"All {len(event_files)} event photos processed (originals + preprocessed for AI)"
        
        logger.info(f"✅ Step 2 complete: {len(uploaded_files)} event photos ready (dual-path: originals + preprocessed)")
        return response_data
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Event processing failed: {str(e)}")


@router.post("/build-album/{session_id}")
async def build_album(
    session_id: str,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    """
    Step 3: Run face recognition and create albums
    This is the big processing step - may take time for large photo sets
    """
    # Validate session
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session = sessions[session_id]
    if session["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    if session["step"] != 3:
        raise HTTPException(status_code=400, detail="Upload event photos first")
    
    logger.info(f"🤖 Step 3 - Building AI albums for session {session_id}")
    
    face_service = get_face_service()
    
    try:
        session["status"] = "processing"
        
        # Convert reference embeddings back from JSON
        import numpy as np
        reference_embeddings = {}
        for name, embedding_list in session["reference_photos"].items():
            reference_embeddings[name] = np.array(embedding_list)
        
        # Run face recognition on PREPROCESSED photos (threshold 0.20 for maximum recall)
        logger.info("🔍 Searching using PREPROCESSED photos (threshold 0.20 - maximum recall)...")
        logger.info(f"📊 Total event photos to search: {len(session['event_preprocessed'])}")
        
        # Match using preprocessed versions
        preprocessed_paths = session["event_preprocessed"]
        original_paths = session["event_originals"]
        
        start_time = time.time()
        
        search_results_preprocessed = face_service.find_people_in_event_photos(
            reference_embeddings=reference_embeddings,
            event_photo_paths=preprocessed_paths,
            debug=True  # Enable detailed logging to see match quality
        )
        
        # MAP BACK: Convert preprocessed paths to ORIGINAL paths
        preprocessed_to_original = dict(zip(preprocessed_paths, original_paths))
        
        search_results = {}
        for person_name, preprocessed_photo_list in search_results_preprocessed.items():
            # Convert each preprocessed path back to original
            original_photo_list = [
                preprocessed_to_original.get(p, p) for p in preprocessed_photo_list
            ]
            search_results[person_name] = original_photo_list
            logger.info(f"   📸 {person_name}: Mapped {len(original_photo_list)} preprocessed → originals")
        
        # REMOVE "Unknown" album - user only wants matched photos
        if "Unknown" in search_results:
            logger.info(f"🗑️ Removing 'Unknown' album ({len(search_results['Unknown'])} unmatched photos)")
            del search_results["Unknown"]
        
        search_time = time.time() - start_time
        
        # Create album folders
        temp_dir = os.path.join(tempfile.gettempdir(), f"album_session_{session_id}")
        albums_dir = os.path.join(temp_dir, "albums")
        
        logger.info("📁 Creating album folders...")
        album_summary = face_service.create_albums(
            search_results=search_results,
            output_dir=albums_dir,
            copy_files=True
        )
        
        # Update session with results
        session["albums_dir"] = albums_dir
        session["search_results"] = {name: len(photos) for name, photos in search_results.items()}
        session["album_summary"] = album_summary
        session["search_time_seconds"] = round(search_time, 2)
        session["status"] = "completed"
        session["completed_at"] = datetime.now(timezone.utc).isoformat()
        
        # Print statistics
        face_service.print_statistics()
        
        logger.info(f"✅ Albums created successfully in {search_time:.1f} seconds")
        
        return {
            "success": True,
            "message": "Albums created successfully",
            "processing_time_seconds": round(search_time, 2),
            "albums_created": album_summary["albums_created"],
            "photos_organized": album_summary["total_photos_organized"],
            "album_breakdown": session["search_results"],
            "download_ready": True
        }
        
    except Exception as e:
        session["status"] = "failed"
        session["error"] = str(e)
        logger.error(f"❌ Album building failed: {e}")
        raise HTTPException(status_code=500, detail=f"Album building failed: {str(e)}")


@router.get("/download-albums/{session_id}")
async def download_albums(
    session_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Download created albums as a ZIP file
    """
    # Validate session
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session = sessions[session_id]
    if session["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    if session["status"] != "completed":
        raise HTTPException(status_code=400, detail="Albums not ready for download")
    
    albums_dir = session.get("albums_dir")
    if not albums_dir or not os.path.exists(albums_dir):
        raise HTTPException(status_code=404, detail="Albums directory not found")
    
    logger.info(f"📦 Preparing album download for session {session_id}")
    
    try:
        # Create ZIP file
        zip_filename = f"AI_Albums_{session_id}.zip"
        zip_path = os.path.join(tempfile.gettempdir(), zip_filename)
        
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            for root, dirs, files in os.walk(albums_dir):
                for file in files:
                    file_path = os.path.join(root, file)
                    # Create archive path relative to albums directory
                    archive_name = os.path.relpath(file_path, albums_dir)
                    zip_file.write(file_path, archive_name)
        
        logger.info(f"✅ ZIP created: {zip_filename} ({os.path.getsize(zip_path) / 1024 / 1024:.1f} MB)")
        
        # Return file as download
        return FileResponse(
            path=zip_path,
            filename=zip_filename,
            media_type='application/zip'
        )
        
    except Exception as e:
        logger.error(f"❌ ZIP creation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Download preparation failed: {str(e)}")


@router.get("/session-status/{session_id}")
async def get_session_status(
    session_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Check status of album building session
    """
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session = sessions[session_id]
    if session["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Clean response (remove large data)
    status = {
        "session_id": session_id,
        "step": session["step"],
        "status": session["status"],
        "created_at": session["created_at"]
    }
    
    if "processed_count" in session:
        status["reference_photos_processed"] = session["processed_count"]
        status["people_registered"] = len(session.get("reference_photos", {}))
    
    if "event_processed_count" in session:
        status["event_photos_processed"] = session["event_processed_count"]
    
    if "search_results" in session:
        status["album_breakdown"] = session["search_results"]
        status["albums_created"] = session.get("album_summary", {}).get("albums_created", 0)
    
    if "completed_at" in session:
        status["completed_at"] = session["completed_at"]
    
    if "error" in session:
        status["error"] = session["error"]
    
    return {"success": True, "data": status}


@router.delete("/cleanup-session/{session_id}")
async def cleanup_session(
    session_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Clean up session files and data
    """
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session = sessions[session_id]
    if session["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        # Remove temp files
        temp_dir = os.path.join(tempfile.gettempdir(), f"album_session_{session_id}")
        if os.path.exists(temp_dir):
            shutil.rmtree(temp_dir, ignore_errors=True)
            logger.info(f"🗑️ Cleaned up temp files for session {session_id}")
        
        # Remove session data
        del sessions[session_id]
        
        return {"success": True, "message": "Session cleaned up"}
        
    except Exception as e:
        logger.warning(f"Cleanup error for session {session_id}: {e}")
        # Still remove from sessions dict
        sessions.pop(session_id, None)
        return {"success": True, "message": "Session removed (partial cleanup)"}


@router.get("/test-services")
async def test_services():
    """
    Test endpoint to verify services are working
    """
    preprocessor = get_preprocessor()
    face_service = get_face_service()
    
    status = {
        "preprocessor": "✅ Ready",
        "face_recognition": "✅ Ready" if face_service.initialize_insightface() else "❌ Failed",
        "service_type": "Real InsightFace" if isinstance(face_service, FaceRecognitionService) else "Mock Service"
    }
    
    return {"success": True, "services": status}
