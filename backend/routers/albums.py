from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from backend.supabase_client import supabase
from backend.auth import get_current_user

router = APIRouter(prefix="/albums", tags=["Albums"])


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
