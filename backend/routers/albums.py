from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks, UploadFile, File
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel
from typing import Optional, List
import os
import shutil
import zipfile
import io
from pathlib import Path
from backend.supabase_client import supabase
from backend.auth import get_current_user
from backend.services.album_processor import AlbumProcessor, get_album_structure
from backend.services.reel_generator import ReelGenerator

router = APIRouter(prefix="/albums", tags=["Albums"])

# Storage configuration
STORAGE_BASE = Path("backend/storage/albums")
STORAGE_BASE.mkdir(parents=True, exist_ok=True)


class CreateAlbumRequest(BaseModel):
    title: str
    booking_id: Optional[str] = None
    event_date: Optional[str] = None
    cover_image_path: Optional[str] = None


class UpdateAlbumRequest(BaseModel):
    title: Optional[str] = None
    event_date: Optional[str] = None
    cover_image_path: Optional[str] = None


@router.post("/")
def create_album(payload: CreateAlbumRequest, current_user: dict = Depends(get_current_user)):
    """Create a new photo album"""
    try:
        user_id = current_user.get("id") or current_user.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")

        album = {
            "user_id": user_id,
            "title": payload.title,
            "booking_id": payload.booking_id,
            "event_date": payload.event_date,
            "cover_image_path": payload.cover_image_path
        }

        resp = supabase.table('albums').insert(album).execute()
        return {"success": True, "data": resp.data}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/")
def get_my_albums(current_user: dict = Depends(get_current_user)):
    """Get all albums for current user"""
    try:
        user_id = current_user.get("id") or current_user.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")

        resp = supabase.table('albums').select('*').eq('user_id', user_id).order('created_at', desc=True).execute()
        return {"success": True, "data": resp.data}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.get("/{album_id}")
def get_album(album_id: str, current_user: dict = Depends(get_current_user)):
    """Get specific album with photos"""
    try:
        user_id = current_user.get("id") or current_user.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")

        # Get album
        album = supabase.table('albums').select('*').eq('id', album_id).eq('user_id', user_id).limit(1).execute()
        if not album.data:
            raise HTTPException(status_code=404, detail="Album not found")

        # Get photos in album
        photos = supabase.table('photos').select('*').eq('album_id', album_id).order('created_at', desc=False).execute()

        return {
            "success": True,
            "data": {
                "album": album.data[0],
                "photos": photos.data
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.put("/{album_id}")
def update_album(album_id: str, payload: UpdateAlbumRequest, current_user: dict = Depends(get_current_user)):
    """Update album details"""
    try:
        user_id = current_user.get("id") or current_user.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")

        # Verify ownership
        album = supabase.table('albums').select('*').eq('id', album_id).eq('user_id', user_id).limit(1).execute()
        if not album.data:
            raise HTTPException(status_code=404, detail="Album not found or unauthorized")

        updates = {}
        if payload.title is not None:
            updates['title'] = payload.title
        if payload.event_date is not None:
            updates['event_date'] = payload.event_date
        if payload.cover_image_path is not None:
            updates['cover_image_path'] = payload.cover_image_path

        if not updates:
            return {"success": True, "message": "No updates provided"}

        resp = supabase.table('albums').update(updates).eq('id', album_id).execute()
        return {"success": True, "data": resp.data}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{album_id}")
def delete_album(album_id: str, current_user: dict = Depends(get_current_user)):
    """Delete album (cascades to photos and faces)"""
    try:
        user_id = current_user.get("id") or current_user.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")

        # Verify ownership
        album = supabase.table('albums').select('*').eq('id', album_id).eq('user_id', user_id).limit(1).execute()
        if not album.data:
            raise HTTPException(status_code=404, detail="Album not found or unauthorized")

        resp = supabase.table('albums').delete().eq('id', album_id).execute()
        return {"success": True, "message": "Album deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# Photo endpoints
class AddPhotoRequest(BaseModel):
    album_id: str
    storage_path: str
    is_group_shot: bool = False
    metadata: Optional[dict] = None


@router.post("/photos")
def add_photo_to_album(payload: AddPhotoRequest, current_user: dict = Depends(get_current_user)):
    """Add a photo to an album"""
    try:
        user_id = current_user.get("id") or current_user.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")

        # Verify album ownership
        album = supabase.table('albums').select('*').eq('id', payload.album_id).eq('user_id', user_id).limit(1).execute()
        if not album.data:
            raise HTTPException(status_code=404, detail="Album not found or unauthorized")

        photo = {
            "album_id": payload.album_id,
            "storage_path": payload.storage_path,
            "is_group_shot": payload.is_group_shot,
            "metadata": payload.metadata
        }

        resp = supabase.table('photos').insert(photo).execute()
        return {"success": True, "data": resp.data}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/photos/{photo_id}")
def delete_photo(photo_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a photo from album"""
    try:
        user_id = current_user.get("id") or current_user.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")

        # Get photo and verify album ownership
        photo = supabase.table('photos').select('*, albums!photos_album_id_fkey(user_id)').eq('id', photo_id).limit(1).execute()
        if not photo.data or photo.data[0]['albums']['user_id'] != user_id:
            raise HTTPException(status_code=404, detail="Photo not found or unauthorized")

        resp = supabase.table('photos').delete().eq('id', photo_id).execute()
        return {"success": True, "message": "Photo deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============================================================================
# MODULE 6: SMART ALBUM BUILDER - AI PROCESSING ENDPOINTS
# ============================================================================

@router.post("/smart/upload")
async def upload_photos_for_processing(
    files: List[UploadFile] = File(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Upload photos for AI processing (Module 6)
    Creates person albums and highlight reel automatically
    """
    try:
        user_id = current_user.get("id") or current_user.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")

        # Create user-specific folders
        upload_folder = STORAGE_BASE / user_id / "uploads"
        upload_folder.mkdir(parents=True, exist_ok=True)
        
        # Save uploaded files
        saved_files = []
        for file in files:
            if not file.filename.lower().endswith(('.png', '.jpg', '.jpeg')):
                continue
            
            file_path = upload_folder / file.filename
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            saved_files.append(file.filename)
        
        if not saved_files:
            raise HTTPException(status_code=400, detail="No valid image files uploaded")
        
        return {
            "success": True,
            "message": f"{len(saved_files)} photos uploaded successfully",
            "files": saved_files,
            "next_step": "Call /albums/smart/process to start AI processing"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/smart/process")
async def start_smart_processing(
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    """
    Start AI processing: Face clustering + Highlight selection
    Runs in background - check status with /smart/status
    """
    try:
        user_id = current_user.get("id") or current_user.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")

        upload_folder = str(STORAGE_BASE / user_id / "uploads")
        output_folder = str(STORAGE_BASE / user_id / "organized")
        thumbnails_folder = str(STORAGE_BASE / user_id / "thumbnails")
        
        # Clear old processed albums before starting new processing
        if os.path.exists(output_folder):
            shutil.rmtree(output_folder)
            os.makedirs(output_folder, exist_ok=True)
        if os.path.exists(thumbnails_folder):
            shutil.rmtree(thumbnails_folder)
            os.makedirs(thumbnails_folder, exist_ok=True)
        
        # Check if photos exist
        if not os.path.exists(upload_folder) or not os.listdir(upload_folder):
            raise HTTPException(
                status_code=400, 
                detail="No photos found. Upload photos first using /albums/smart/upload"
            )
        
        # Create processor and start in background
        processor = AlbumProcessor(user_id, upload_folder, output_folder)
        background_tasks.add_task(processor.start_parallel_processing)
        
        return {
            "success": True,
            "message": "AI processing started in background",
            "status": "processing",
            "check_status_at": "/api/albums/smart/status"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/smart/status")
def get_processing_status(current_user: dict = Depends(get_current_user)):
    """
    Check AI processing status
    Returns: not_started | processing | completed | error
    """
    try:
        user_id = current_user.get("id") or current_user.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")

        output_folder = str(STORAGE_BASE / user_id / "organized")
        processor = AlbumProcessor(user_id, "", output_folder)
        
        status = processor.get_status()
        
        return {
            "success": True,
            "data": status
        }
        
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.get("/smart/albums")
def get_smart_albums(current_user: dict = Depends(get_current_user)):
    """
    Get organized albums after AI processing
    Returns highlights and person-based folders
    """
    try:
        user_id = current_user.get("id") or current_user.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")

        output_folder = str(STORAGE_BASE / user_id / "organized")
        
        if not os.path.exists(output_folder):
            return {
                "success": False,
                "message": "No processed albums found. Upload and process photos first."
            }
        
        structure = get_album_structure(output_folder)
        
        # Convert filenames to full URLs for frontend (use thumbnails for preview)
        user_id_path = f"/storage/albums/{user_id}"
        thumbnails_path = f"{user_id_path}/thumbnails"
        
        return {
            "success": True,
            "data": {
                "highlights": {
                    "count": len(structure["highlights"]),
                    "photos": [f"{thumbnails_path}/Highlights/{photo}" for photo in structure["highlights"]],
                    "original_path": f"{user_id_path}/organized/Highlights"
                },
                "groups": {
                    "count": len(structure["groups"]),
                    "photos": [f"{thumbnails_path}/Groups/{photo}" for photo in structure["groups"]],
                    "original_path": f"{user_id_path}/organized/Groups"
                },
                "persons": {
                    name: {
                        "count": len(photos),
                        "photos": [f"{thumbnails_path}/{name}/{photo}" for photo in photos],
                        "original_path": f"{user_id_path}/organized/{name}"
                    }
                    for name, photos in structure["persons"].items()
                },
                "total_albums": len(structure["persons"]) + (1 if structure["highlights"] else 0) + (1 if structure["groups"] else 0)
            }
        }
        
    except Exception as e:
        return {"success": False, "error": str(e)}


class GenerateReelRequest(BaseModel):
    music_file: Optional[str] = None
    duration_per_image: float = 2.0
    transition_type: str = "crossfade"  # crossfade, slide, zoom


@router.post("/smart/generate-reel")
async def generate_reel(
    payload: GenerateReelRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    """
    Generate video reel from highlights
    Uses photos from Highlights folder created during processing
    """
    try:
        user_id = current_user.get("id") or current_user.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")

        output_folder = str(STORAGE_BASE / user_id / "organized")
        
        # Check if highlights are ready
        generator = ReelGenerator(output_folder)
        status = generator.check_highlights_ready()
        
        if not status["ready"]:
            raise HTTPException(status_code=400, detail=status["message"])
        
        # Generate reel (this might take a while, consider background task for production)
        result = generator.generate_reel(
            output_filename=f"reel_{user_id}.mp4",
            music_file=payload.music_file,
            duration_per_image=payload.duration_per_image
        )
        
        if not result["success"]:
            raise HTTPException(status_code=500, detail=result["error"])
        
        return {
            "success": True,
            "message": "Reel generated successfully",
            "data": {
                "video_path": result["output_path"],
                "duration": result["duration"],
                "image_count": result["image_count"]
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/smart/reel/status")
def check_reel_readiness(current_user: dict = Depends(get_current_user)):
    """Check if highlights are ready for reel generation"""
    try:
        user_id = current_user.get("id") or current_user.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")

        output_folder = str(STORAGE_BASE / user_id / "organized")
        generator = ReelGenerator(output_folder)
        status = generator.check_highlights_ready()
        
        return {
            "success": True,
            "data": status
        }
        
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.get("/smart/download/{album_type}")
def download_album_zip(
    album_type: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Download an album as ZIP file (original quality)
    
    album_type: highlights, groups, or Person_1, Person_2, etc.
    """
    try:
        user_id = current_user.get("id") or current_user.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")

        organized_folder = STORAGE_BASE / user_id / "organized"
        album_folder = organized_folder / album_type.replace("_", "_")  # Handle Person_1, Person_2
        
        # Map album types
        if album_type.lower() == "highlights":
            album_folder = organized_folder / "Highlights"
        elif album_type.lower() == "groups":
            album_folder = organized_folder / "Groups"
        elif album_type.startswith("Person_"):
            album_folder = organized_folder / album_type
        else:
            raise HTTPException(status_code=400, detail=f"Invalid album type: {album_type}")
        
        if not album_folder.exists():
            raise HTTPException(status_code=404, detail=f"Album not found: {album_type}")
        
        # Create ZIP in memory
        zip_buffer = io.BytesIO()
        
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            for img_file in album_folder.iterdir():
                if img_file.suffix.lower() in ['.jpg', '.jpeg', '.png']:
                    zip_file.write(img_file, arcname=img_file.name)
        
        zip_buffer.seek(0)
        
        # Generate filename
        filename = f"{album_type}_{user_id[:8]}.zip"
        
        return StreamingResponse(
            zip_buffer,
            media_type="application/zip",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create ZIP: {str(e)}")


@router.delete("/smart/albums")
def delete_all_albums(current_user: dict = Depends(get_current_user)):
    """
    Delete all processed albums for current user
    """
    try:
        user_id = current_user.get("id") or current_user.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")

        user_folder = STORAGE_BASE / user_id
        
        # Delete organized and thumbnails folders
        organized_folder = user_folder / "organized"
        thumbnails_folder = user_folder / "thumbnails"
        
        deleted_items = []
        if organized_folder.exists():
            shutil.rmtree(organized_folder)
            deleted_items.append("organized albums")
        if thumbnails_folder.exists():
            shutil.rmtree(thumbnails_folder)
            deleted_items.append("thumbnails")
        
        return {
            "success": True,
            "message": f"Deleted: {', '.join(deleted_items) if deleted_items else 'No albums found'}",
            "deleted": deleted_items
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete albums: {str(e)}")
