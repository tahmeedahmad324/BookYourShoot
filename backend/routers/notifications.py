from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from backend.supabase_client import supabase
from backend.auth import get_current_user

router = APIRouter(prefix="/notifications", tags=["Notifications"])


class CreateNotificationRequest(BaseModel):
    user_id: str
    title: str
    message: str
    type: str  # 'booking', 'system', 'money'
    link: Optional[str] = None


@router.get("/")
def get_my_notifications(
    unread_only: bool = False,
    limit: int = 50,
    current_user: dict = Depends(get_current_user)
):
    """Get notifications for current user"""
    try:
        user_id = current_user.get("id") or current_user.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")

        query = supabase.table('notifications').select('*').eq('user_id', user_id)
        
        if unread_only:
            query = query.eq('read', False)
        
        resp = query.order('created_at', desc=True).limit(limit).execute()
        
        return {"success": True, "data": resp.data}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.get("/unread-count")
def get_unread_count(current_user: dict = Depends(get_current_user)):
    """Get count of unread notifications"""
    try:
        user_id = current_user.get("id") or current_user.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")

        resp = supabase.table('notifications').select('id', count='exact').eq('user_id', user_id).eq('read', False).execute()
        
        return {
            "success": True,
            "count": resp.count if hasattr(resp, 'count') else 0
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.put("/{notification_id}/read")
def mark_notification_read(notification_id: str, current_user: dict = Depends(get_current_user)):
    """Mark a notification as read"""
    try:
        user_id = current_user.get("id") or current_user.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")

        # Verify ownership
        notification = supabase.table('notifications').select('*').eq('id', notification_id).eq('user_id', user_id).limit(1).execute()
        if not notification.data:
            raise HTTPException(status_code=404, detail="Notification not found")

        resp = supabase.table('notifications').update({'read': True}).eq('id', notification_id).execute()
        return {"success": True, "data": resp.data}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/mark-all-read")
def mark_all_read(current_user: dict = Depends(get_current_user)):
    """Mark all notifications as read for current user"""
    try:
        user_id = current_user.get("id") or current_user.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")

        resp = supabase.table('notifications').update({'read': True}).eq('user_id', user_id).eq('read', False).execute()
        return {"success": True, "message": "All notifications marked as read"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/")
def create_notification(payload: CreateNotificationRequest, current_user: dict = Depends(get_current_user)):
    """Create a notification (admin/system use)"""
    try:
        # Verify admin role (you can add role check here)
        notification = {
            "user_id": payload.user_id,
            "title": payload.title,
            "message": payload.message,
            "type": payload.type,
            "link": payload.link,
            "read": False
        }

        resp = supabase.table('notifications').insert(notification).execute()
        return {"success": True, "data": resp.data}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{notification_id}")
def delete_notification(notification_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a notification"""
    try:
        user_id = current_user.get("id") or current_user.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")

        # Verify ownership
        notification = supabase.table('notifications').select('*').eq('id', notification_id).eq('user_id', user_id).limit(1).execute()
        if not notification.data:
            raise HTTPException(status_code=404, detail="Notification not found")

        resp = supabase.table('notifications').delete().eq('id', notification_id).execute()
        return {"success": True, "message": "Notification deleted"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
