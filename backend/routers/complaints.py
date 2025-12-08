from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from backend.supabase_client import supabase
from backend.auth import get_current_user

router = APIRouter(prefix="/complaints", tags=["Complaints"])


class CreateComplaintRequest(BaseModel):
    complaint_type: str  # photographer_behavior, quality_issues, payment_dispute, other
    subject: str
    description: str
    booking_id: Optional[str] = None
    photographer_id: Optional[str] = None
    evidence_urls: Optional[list] = None


class UpdateComplaintRequest(BaseModel):
    status: Optional[str] = None  # open, investigating, resolved, closed
    admin_notes: Optional[str] = None
    resolution: Optional[str] = None


@router.post("/")
def create_complaint(payload: CreateComplaintRequest, current_user: dict = Depends(get_current_user)):
    """Create a new complaint"""
    try:
        user_id = current_user.get("id") or current_user.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")

        complaint = {
            "user_id": user_id,
            "complaint_type": payload.complaint_type,
            "subject": payload.subject,
            "description": payload.description,
            "booking_id": payload.booking_id,
            "photographer_id": payload.photographer_id,
            "evidence_urls": payload.evidence_urls,
            "status": "open",
            "priority": "medium"
        }

        resp = supabase.table('complaints').insert(complaint).execute()
        return {"success": True, "data": resp.data}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/my-complaints")
def get_my_complaints(current_user: dict = Depends(get_current_user)):
    """Get all complaints filed by current user"""
    try:
        user_id = current_user.get("id") or current_user.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")

        resp = supabase.table('complaints').select('*, photographer:photographer_profile(*, user:users(*)), booking:booking(*)').eq('user_id', user_id).order('created_at', desc=True).execute()
        return {"success": True, "data": resp.data}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.get("/{complaint_id}")
def get_complaint(complaint_id: str, current_user: dict = Depends(get_current_user)):
    """Get specific complaint details"""
    try:
        user_id = current_user.get("id") or current_user.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")

        # Get user role
        user = supabase.table('users').select('role').eq('id', user_id).limit(1).execute()
        is_admin = user.data and user.data[0].get('role') == 'admin'

        resp = supabase.table('complaints').select('*, user:users(*), photographer:photographer_profile(*, user:users(*)), booking:booking(*)').eq('id', complaint_id).limit(1).execute()
        
        if not resp.data:
            raise HTTPException(status_code=404, detail="Complaint not found")
        
        # Verify access (user's own complaint or admin)
        complaint = resp.data[0]
        if complaint['user_id'] != user_id and not is_admin:
            raise HTTPException(status_code=403, detail="Unauthorized to view this complaint")
        
        return {"success": True, "data": complaint}
    except HTTPException:
        raise
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.get("/")
def get_all_complaints(status: Optional[str] = None, limit: int = 50, offset: int = 0, current_user: dict = Depends(get_current_user)):
    """Get all complaints (admin only)"""
    try:
        user_id = current_user.get("id") or current_user.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")

        # Verify admin
        user = supabase.table('users').select('role').eq('id', user_id).limit(1).execute()
        if not user.data or user.data[0].get('role') != 'admin':
            raise HTTPException(status_code=403, detail="Admin access required")

        query = supabase.table('complaints').select('*, user:users(*), photographer:photographer_profile(*)')
        
        if status:
            query = query.eq('status', status)
        
        resp = query.order('created_at', desc=True).range(offset, offset + limit - 1).execute()
        return {"success": True, "data": resp.data}
    except HTTPException:
        raise
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.put("/{complaint_id}")
def update_complaint(complaint_id: str, payload: UpdateComplaintRequest, current_user: dict = Depends(get_current_user)):
    """Update complaint status (admin only)"""
    try:
        user_id = current_user.get("id") or current_user.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")

        # Verify admin
        user = supabase.table('users').select('role').eq('id', user_id).limit(1).execute()
        if not user.data or user.data[0].get('role') != 'admin':
            raise HTTPException(status_code=403, detail="Admin access required")

        updates = {}
        if payload.status is not None:
            updates['status'] = payload.status
        if payload.admin_notes is not None:
            updates['admin_notes'] = payload.admin_notes
        if payload.resolution is not None:
            updates['resolution'] = payload.resolution

        resp = supabase.table('complaints').update(updates).eq('id', complaint_id).execute()
        return {"success": True, "data": resp.data}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
