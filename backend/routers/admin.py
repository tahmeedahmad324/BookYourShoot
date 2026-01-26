from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from backend.supabase_client import supabase
from backend.auth import get_current_user

router = APIRouter(prefix="/admin", tags=["Admin"])


def verify_admin(current_user: dict = Depends(get_current_user)):
    """Verify user is an admin"""
    # get_current_user already fetches role from database
    if current_user.get('role') != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    
    return current_user


@router.get("/dashboard/stats")
def get_dashboard_stats(current_user: dict = Depends(verify_admin)):
    """Get admin dashboard statistics"""
    try:
        # Get counts
        users_count = supabase.table('users').select('id', count='exact').execute()  # type: ignore[arg-type]
        photographers_count = supabase.table('photographer_profile').select('id', count='exact').execute()  # type: ignore[arg-type]
        bookings_count = supabase.table('booking').select('id', count='exact').execute()  # type: ignore[arg-type]
        pending_verifications = supabase.table('photographer_profile').select('id', count='exact').eq('admin_approved', False).execute()  # type: ignore[arg-type]
        active_complaints = supabase.table('complaints').select('id', count='exact').eq('status', 'open').execute()  # type: ignore[arg-type]
        
        # Get recent bookings
        recent_bookings = supabase.table('booking').select('*, users!booking_client_id_fkey(full_name), photographer_profile!booking_photographer_id_fkey(*)').order('created_at', desc=True).limit(10).execute()
        
        return {
            "success": True,
            "stats": {
                "total_users": len(users_count.data) if users_count.data else 0,
                "total_photographers": len(photographers_count.data) if photographers_count.data else 0,
                "total_bookings": len(bookings_count.data) if bookings_count.data else 0,
                "pending_verifications": len(pending_verifications.data) if pending_verifications.data else 0,
                "active_complaints": len(active_complaints.data) if active_complaints.data else 0
            },
            "recent_bookings": recent_bookings.data
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.get("/verifications/pending")
def get_pending_verifications(current_user: dict = Depends(verify_admin)):
    """Get all pending photographer verifications"""
    try:
        resp = supabase.table('photographer_profile').select('*, users!photographer_profile_user_id_fkey(*)').eq('admin_approved', False).order('created_at', desc=True).execute()
        return {"success": True, "data": resp.data}
    except Exception as e:
        return {"success": False, "error": str(e)}


class VerifyPhotographerRequest(BaseModel):
    approved: bool
    rejection_reason: Optional[str] = None


@router.put("/verifications/{photographer_id}")
def verify_photographer(photographer_id: str, payload: VerifyPhotographerRequest, current_user: dict = Depends(verify_admin)):
    """Approve or reject photographer verification"""
    try:
        updates: dict = {
            "admin_approved": payload.approved,
            "verified": payload.approved
        }
        
        if not payload.approved and payload.rejection_reason:
            updates["rejection_reason"] = payload.rejection_reason
        
        resp = supabase.table('photographer_profile').update(updates).eq('id', photographer_id).execute()
        return {"success": True, "data": resp.data}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/users")
def get_all_users(role: Optional[str] = None, limit: int = 50, offset: int = 0, current_user: dict = Depends(verify_admin)):
    """Get all users with optional role filter"""
    try:
        query = supabase.table('users').select('*')
        
        if role:
            query = query.eq('role', role)
        
        resp = query.order('created_at', desc=True).range(offset, offset + limit - 1).execute()
        return {"success": True, "data": resp.data}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.get("/users/{user_id}")
def get_user_details(user_id: str, current_user: dict = Depends(verify_admin)):
    """Get detailed user information"""
    try:
        user = supabase.table('users').select('*').eq('id', user_id).limit(1).execute()
        
        # Get photographer profile if exists
        photographer = supabase.table('photographer_profile').select('*').eq('user_id', user_id).limit(1).execute()
        
        # Get user's bookings (need to lookup photographer_id first if user is photographer)
        bookings = supabase.table('booking').select('*').eq('client_id', user_id).execute()
        if photographer.data and len(photographer.data) > 0:
            photographer_profile = photographer.data[0]
            if isinstance(photographer_profile, dict):
                photographer_id = photographer_profile.get('id')
                if photographer_id:
                    photographer_bookings = supabase.table('booking').select('*').eq('photographer_id', photographer_id).execute()
                    if bookings.data and photographer_bookings.data:
                        bookings.data.extend(photographer_bookings.data)
        
        return {
            "success": True,
            "data": {
                "user": user.data[0] if user.data else None,
                "photographer_profile": photographer.data[0] if photographer.data else None,
                "bookings": bookings.data
            }
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


class UpdateUserStatusRequest(BaseModel):
    is_active: bool
    reason: Optional[str] = None


@router.put("/users/{user_id}/status")
def update_user_status(user_id: str, payload: UpdateUserStatusRequest, current_user: dict = Depends(verify_admin)):
    """Activate or deactivate a user account"""
    try:
        updates: dict = {"is_active": payload.is_active}
        
        if not payload.is_active and payload.reason:
            updates["deactivation_reason"] = payload.reason
        
        resp = supabase.table('users').update(updates).eq('id', user_id).execute()
        return {"success": True, "data": resp.data}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/bookings")
def get_all_bookings(status: Optional[str] = None, limit: int = 50, offset: int = 0, current_user: dict = Depends(verify_admin)):
    """Get all bookings with optional status filter"""
    try:
        query = supabase.table('booking').select('*, users!booking_client_id_fkey(*), photographer_profile!booking_photographer_id_fkey(*)')
        
        if status:
            query = query.eq('status', status)
        
        resp = query.order('created_at', desc=True).range(offset, offset + limit - 1).execute()
        return {"success": True, "data": resp.data}
    except Exception as e:
        return {"success": False, "error": str(e)}
