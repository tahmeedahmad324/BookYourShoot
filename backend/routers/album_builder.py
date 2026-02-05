"""
Album Builder API - Create personalized photo albums using AI
Finds specific people in large photo collections
"""

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks, Depends, Query
from fastapi.responses import FileResponse
from typing import List, Optional
from pydantic import BaseModel
import os
import tempfile
import uuid
import subprocess
import json
from pathlib import Path
import logging
from backend.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/album-builder", tags=["Album Builder"])

# Storage paths
STORAGE_DIR = Path("backend/storage/album_builder")
STORAGE_DIR.mkdir(parents=True, exist_ok=True)

UPLOADS_DIR = STORAGE_DIR / "uploads"
PROCESSED_DIR = STORAGE_DIR / "processed"
ALBUMS_DIR = STORAGE_DIR / "albums"

for dir_path in [UPLOADS_DIR, PROCESSED_DIR, ALBUMS_DIR]:
    dir_path.mkdir(exist_ok=True)

# Python 3.12 executable path
PYTHON312 = r"C:\Users\hp\AppData\Local\Programs\Python\Python312\python.exe"


class AlbumBuildRequest(BaseModel):
    """Request model for building albums"""
    session_id: str
    person_names: List[str]  # Names for each reference photo
    similarity_threshold: Optional[float] = 0.4
    model_name: Optional[str] = "Facenet512"


class FaceDetectionResponse(BaseModel):
    """Response for face detection in reference photos"""
    success: bool
    detected_faces: List[dict]  # Each dict has: face_id, photo_index, cropped_path, thumbnail_url
    total_faces: int
    message: str


class AlbumBuildResponse(BaseModel):
    """Response model for album building"""
    success: bool
    session_id: str
    message: str
    albums: Optional[dict] = None
    download_url: Optional[str] = None
    summary: Optional[dict] = None


@router.post("/upload-references", summary="Upload reference photos (up to 5 people)")
async def upload_reference_photos(
    files: List[UploadFile] = File(..., description="Reference photos (1-5 people)"),
    current_user: dict = Depends(get_current_user)
):
    """
    Upload reference photos of people to find
    Maximum 5 people
    Automatically crops to face for better recognition
    Requires authentication: Client only
    """
    # Only clients can use album builder
    if current_user['role'] != 'client':
        raise HTTPException(status_code=403, detail="Only clients can create albums")
    
    if not files or len(files) == 0:
        raise HTTPException(status_code=400, detail="No files uploaded")
    
    if len(files) > 5:
        raise HTTPException(status_code=400, detail="Maximum 5 reference photos allowed")
    
    # Create session with user ID
    session_id = str(uuid.uuid4())
    user_id = current_user['id']
    session_dir = UPLOADS_DIR / session_id / "references"
    session_dir.mkdir(parents=True, exist_ok=True)
    
    # Save user info
    import json
    user_info = {
        'user_id': user_id,
        'email': current_user['email'],
        'session_id': session_id
    }
    with open(session_dir.parent / "user_info.json", 'w') as f:
        json.dump(user_info, f)
    
    # Initialize preprocessor for face cropping and image enhancement
    from backend.services.album_builder.preprocessing import ImagePreprocessor
    preprocessor = ImagePreprocessor(target_size_mb=0.5, max_dimension=1280)
    
    saved_files = []
    
    for i, file in enumerate(files, 1):
        # Validate file type
        if not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail=f"File {file.filename} is not an image")
        
        # Save temp original
        temp_path = session_dir / f"temp_{file.filename}"
        content = await file.read()
        with open(temp_path, "wb") as f:
            f.write(content)
        
        # Preprocess: RGBA->RGB, contrast enhancement, resize for better AI detection
        final_path = session_dir / f"reference_{i}_{file.filename}"
        preprocessor.preprocess_image(str(temp_path), str(final_path))
        
        # Remove temp
        temp_path.unlink()
        
        # Get preprocessed file size
        preprocessed_size = final_path.stat().st_size
        
        saved_files.append({
            'index': i,
            'filename': file.filename,
            'path': str(final_path),
            'size_mb': round(preprocessed_size / (1024 * 1024), 2)
        })
        
        logger.info(f"Preprocessed reference {i}: {file.filename} -> {final_path.name}")
    
    return {
        'success': True,
        'session_id': session_id,
        'message': f'Uploaded {len(saved_files)} reference photo(s)',
        'files': saved_files
    }


@router.post("/detect-faces", response_model=FaceDetectionResponse, summary="Detect all faces in reference photos")
async def detect_faces_in_references(
    session_id: str = Form(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Detect ALL faces in uploaded reference photos
    Returns list of detected faces for user to name
    Requires authentication: Client only
    """
    if current_user['role'] != 'client':
        raise HTTPException(status_code=403, detail="Only clients can create albums")
    
    session_dir = UPLOADS_DIR / session_id / "references"
    
    if not session_dir.exists():
        raise HTTPException(status_code=404, detail="Session not found. Upload reference photos first.")
    
    # Import preprocessor
    import sys
    sys.path.append(str(Path("backend/services/album_builder")))
    from preprocessing import ImagePreprocessor
    
    preprocessor = ImagePreprocessor()
    
    # Find all reference photos
    reference_photos = list(session_dir.glob("reference_*"))
    if not reference_photos:
        raise HTTPException(status_code=404, detail="No reference photos found")
    
    detected_faces = []
    face_counter = 0
    
    for photo_index, ref_photo in enumerate(reference_photos, 1):
        try:
            # Extract all faces from this photo
            base_name = ref_photo.stem + "_extracted"
            base_output = session_dir / base_name
            
            cropped_paths, metadata = preprocessor.extract_all_faces_from_reference(
                str(ref_photo),
                str(base_output) + ".jpg"
            )
            
            # Create entries for each detected face
            for face_idx, cropped_path in enumerate(cropped_paths, 1):
                face_counter += 1
                detected_faces.append({
                    'face_id': face_counter,
                    'photo_index': photo_index,
                    'original_filename': ref_photo.name,
                    'cropped_path': cropped_path,
                    'thumbnail_url': f"/storage/album_builder/uploads/{session_id}/references/{Path(cropped_path).name}",
                    'face_number_in_photo': face_idx,
                    'total_faces_in_photo': len(cropped_paths)
                })
                
        except Exception as e:
            logger.error(f"Failed to extract faces from {ref_photo.name}: {str(e)}")
            continue
    
    if not detected_faces:
        raise HTTPException(status_code=400, detail="No faces could be detected in any reference photo")
    
    return {
        'success': True,
        'detected_faces': detected_faces,
        'total_faces': face_counter,
        'message': f'Detected {face_counter} face(s) across {len(reference_photos)} photo(s)'
    }


@router.post("/upload-photos", summary="Upload batch of photos to search")
async def upload_photo_batch(
    session_id: str = Form(...),
    files: List[UploadFile] = File(..., description="Photos to search (up to 1000)"),
    current_user: dict = Depends(get_current_user)
):
    """
    Upload batch of photos to search for people
    Maximum 1000 photos
    Requires authentication: Client only
    """
    if current_user['role'] != 'client':
        raise HTTPException(status_code=403, detail="Only clients can create albums")
    
    if not files or len(files) == 0:
        raise HTTPException(status_code=400, detail="No files uploaded")
    
    if len(files) > 1000:
        raise HTTPException(status_code=400, detail="Maximum 1000 photos allowed per batch")
    
    # Verify session exists
    session_dir = UPLOADS_DIR / session_id
    if not session_dir.exists():
        raise HTTPException(status_code=404, detail="Session not found. Upload references first.")
    
    # Create photos directory
    photos_dir = session_dir / "photos"
    photos_dir.mkdir(exist_ok=True)
    
    saved_files = []
    total_size = 0
    
    for i, file in enumerate(files, 1):
        if not file.content_type.startswith('image/'):
            continue  # Skip non-images
        
        file_path = photos_dir / f"photo_{i:04d}_{file.filename}"
        
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)
            total_size += len(content)
        
        saved_files.append(str(file_path))
    
    return {
        'success': True,
        'session_id': session_id,
        'message': f'Uploaded {len(saved_files)} photo(s)',
        'total_photos': len(saved_files),
        'total_size_mb': round(total_size / (1024 * 1024), 2)
    }


@router.post("/build-albums", response_model=AlbumBuildResponse, summary="Build personalized albums")
async def build_albums(
    request: AlbumBuildRequest, 
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    """
    Build personalized albums by finding specific people in photos
    This runs the album builder with Python 3.12
    Requires authentication: Client only
    """
    if current_user['role'] != 'client':
        raise HTTPException(status_code=403, detail="Only clients can create albums")
    
    session_id = request.session_id
    session_dir = UPLOADS_DIR / session_id
    
    if not session_dir.exists():
        raise HTTPException(status_code=404, detail="Session not found")
    
    references_dir = session_dir / "references"
    photos_dir = session_dir / "photos"
    
    if not references_dir.exists() or not photos_dir.exists():
        raise HTTPException(status_code=400, detail="Upload references and photos first")
    
    # Count files
    reference_files = list(references_dir.glob("*.jpg")) + list(references_dir.glob("*.jpeg")) + list(references_dir.glob("*.png"))
    photo_files = list(photos_dir.glob("*.jpg")) + list(photos_dir.glob("*.jpeg")) + list(photos_dir.glob("*.png"))
    
    if len(request.person_names) != len(reference_files):
        raise HTTPException(
            status_code=400,
            detail=f"Person names count ({len(request.person_names)}) must match reference photos ({len(reference_files)})"
        )
    
    try:
        # Run album builder script with Python 3.12
        script_path = Path(__file__).parent.parent / "services" / "album_builder" / "run_album_builder.py"
        
        # Create progress file
        progress_path = session_dir / "progress.json"
        progress_data = {
            'status': 'processing',
            'stage': 'starting',
            'progress': 0,
            'message': 'Starting album builder...'
        }
        with open(progress_path, 'w') as f:
            json.dump(progress_data, f)
        
        # Create config file for the script
        config = {
            'session_id': session_id,
            'references_dir': str(references_dir),
            'photos_dir': str(photos_dir),
            'output_dir': str(ALBUMS_DIR / session_id),
            'person_names': request.person_names,
            'similarity_threshold': request.similarity_threshold,
            'model_name': 'VGG-Face',  # Faster than Facenet512
            'progress_file': str(progress_path)
        }
        
        config_path = session_dir / "config.json"
        with open(config_path, 'w') as f:
            json.dump(config, f)
        
        # Run the processor in background
        logger.info(f"Starting album builder for session {session_id} in background")
        
        def run_album_builder_task():
            """Background task to run album builder"""
            try:
                result = subprocess.run(
                    [PYTHON312, str(script_path), str(config_path)],
                    capture_output=True,
                    text=True,
                    timeout=3600,  # 60 minutes timeout (increased from 10)
                    env={**os.environ, 'PYTHONWARNINGS': 'ignore', 'TF_CPP_MIN_LOG_LEVEL': '3'}
                )
                
                # Check if result.json was created (success indicator)
                result_path = session_dir / "result.json"
                if result_path.exists():
                    logger.info(f"✅ Album builder completed successfully for session {session_id}")
                    return  # Success! Don't treat as error
                
                # Check progress.json for actual status
                if progress_path.exists():
                    try:
                        with open(progress_path, 'r') as f:
                            progress_data = json.load(f)
                            if progress_data.get('status') == 'completed':
                                logger.info(f"✅ Album builder completed (via progress.json)")
                                return
                    except:
                        pass
                
                # Only treat as error if there are actual ERROR/CRITICAL messages in stderr
                if result.returncode != 0:
                    stderr_lines = result.stderr.split('\n')
                    real_errors = [
                        line for line in stderr_lines 
                        if line.strip() and (
                            'ERROR' in line or 
                            'CRITICAL' in line or
                            'Traceback' in line or
                            'Exception' in line
                        ) and 
                        'tensorflow' not in line.lower() and
                        'WARNING' not in line
                    ]
                    
                    # If no real errors found, don't fail
                    if not real_errors:
                        logger.info(f"Process completed with warnings (non-critical)")
                        return
                    
                    error_message = '\n'.join(real_errors[:5])
                    logger.error(f"Album builder failed: {error_message}")
                    
                    # Update progress with error
                    with open(progress_path, 'w') as f:
                        json.dump({
                            'status': 'error',
                            'progress': 0,
                            'message': f'Failed: {error_message}'
                        }, f)
            except subprocess.TimeoutExpired:
                logger.error(f"Album builder timed out for session {session_id}")
                with open(progress_path, 'w') as f:
                    json.dump({
                        'status': 'error',
                        'progress': 0,
                        'message': 'Processing timed out. Try with fewer photos.'
                    }, f)
            except Exception as e:
                logger.error(f"Error in album builder: {str(e)}")
                with open(progress_path, 'w') as f:
                    json.dump({
                        'status': 'error',
                        'progress': 0,
                        'message': f'Error: {str(e)}'
                    }, f)
        
        # Start background task
        background_tasks.add_task(run_album_builder_task)
        
        # Return immediately so frontend can poll progress
        return AlbumBuildResponse(
            success=True,
            session_id=session_id,
            message=f"Album building started. Use /progress/{session_id} to track progress.",
            albums={},
            download_url=f"/api/album-builder/download/{session_id}",
            summary={}
        )
    
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=408, detail="Album building timed out. Try with fewer photos.")
    except Exception as e:
        logger.error(f"Error building albums: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/progress/{session_id}")
async def get_progress(session_id: str):
    """Get album building progress"""
    session_dir = UPLOADS_DIR / session_id
    progress_path = session_dir / "progress.json"
    
    if not progress_path.exists():
        return {
            'status': 'not_started',
            'progress': 0,
            'message': 'Processing not started'
        }
    
    try:
        with open(progress_path, 'r') as f:
            content = f.read()
            if not content.strip():
                return {
                    'status': 'processing',
                    'progress': 0,
                    'message': 'Initializing...'
                }
            progress_data = json.loads(content)
        return progress_data
    except (json.JSONDecodeError, Exception) as e:
        logger.warning(f"Error reading progress file: {e}")
        return {
            'status': 'processing',
            'progress': 0,
            'message': 'Processing...'
        }


@router.get("/download/{session_id}", summary="Download albums as ZIP")
async def download_albums(
    session_id: str, 
    token: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    """
    Download album ZIP file
    Requires authentication: Client only
    Token can be passed as query parameter for direct download links
    """
    if current_user['role'] != 'client':
        raise HTTPException(status_code=403, detail="Only clients can download albums")
    
    zip_path = ALBUMS_DIR / f"{session_id}.zip"
    
    if not zip_path.exists():
        raise HTTPException(status_code=404, detail="Albums not found or not yet created")
    
    return FileResponse(
        path=str(zip_path),
        filename=f"albums_{session_id}.zip",
        media_type="application/zip"
    )


@router.get("/result/{session_id}")
async def get_result(session_id: str):
    """Get final album building results"""
    result_path = ALBUMS_DIR / session_id / "result.json"
    
    if not result_path.exists():
        raise HTTPException(status_code=404, detail="Results not found. Processing may still be in progress.")
    
    try:
        with open(result_path, 'r') as f:
            result_data = json.load(f)
        
        return AlbumBuildResponse(
            success=True,
            session_id=session_id,
            message="Albums created successfully!",
            albums=result_data.get('albums', {}),
            download_url=f"/api/album-builder/download/{session_id}",
            summary=result_data.get('summary', {})
        )
    except Exception as e:
        logger.error(f"Error reading results: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status/{session_id}", summary="Get album building status")
async def get_status(session_id: str, current_user: dict = Depends(get_current_user)):
    """
    Check status of album building
    Requires authentication: Client only
    """
    if current_user['role'] != 'client':
        raise HTTPException(status_code=403, detail="Only clients can check status")
    
    session_dir = UPLOADS_DIR / session_id
    albums_dir = ALBUMS_DIR / session_id
    zip_path = ALBUMS_DIR / f"{session_id}.zip"
    
    status = {
        'session_id': session_id,
        'references_uploaded': (session_dir / "references").exists(),
        'photos_uploaded': (session_dir / "photos").exists(),
        'albums_created': albums_dir.exists(),
        'zip_ready': zip_path.exists()
    }
    
    if albums_dir.exists():
        summary_path = albums_dir / "session_summary.json"
        if summary_path.exists():
            import json
            with open(summary_path, 'r') as f:
                status['summary'] = json.load(f)
    
    return status


@router.delete("/cleanup/{session_id}", summary="Clean up session")
async def cleanup_session(session_id: str, current_user: dict = Depends(get_current_user)):
    """
    Clean up session files
    Requires authentication: Client only
    """
    if current_user['role'] != 'client':
        raise HTTPException(status_code=403, detail="Only clients can clean up sessions")
    
    import shutil
    
    cleaned = []
    
    # Remove uploads
    upload_dir = UPLOADS_DIR / session_id
    if upload_dir.exists():
        shutil.rmtree(upload_dir)
        cleaned.append("uploads")
    
    # Remove albums
    albums_dir = ALBUMS_DIR / session_id
    if albums_dir.exists():
        shutil.rmtree(albums_dir)
        cleaned.append("albums")
    
    # Remove ZIP
    zip_path = ALBUMS_DIR / f"{session_id}.zip"
    if zip_path.exists():
        os.remove(zip_path)
        cleaned.append("zip")
    
    return {
        'success': True,
        'session_id': session_id,
        'cleaned': cleaned
    }
