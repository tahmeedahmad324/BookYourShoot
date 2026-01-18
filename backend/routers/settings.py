from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from backend.supabase_client import supabase
from backend.auth import get_current_user

router = APIRouter(prefix="/settings", tags=["Platform Settings"])


class UpdateSettingRequest(BaseModel):
    value: str
    description: Optional[str] = None


@router.get("/")
def get_all_settings():
    """Get all platform settings (public)"""
    try:
        resp = supabase.table('platform_settings').select('*').execute()
        return {"success": True, "data": resp.data}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.get("/{key}")
def get_setting(key: str):
    """Get a specific setting by key"""
    try:
        resp = supabase.table('platform_settings').select('*').eq('key', key).limit(1).execute()
        
        if not resp.data:
            raise HTTPException(status_code=404, detail="Setting not found")
        
        return {"success": True, "data": resp.data[0]}
    except HTTPException:
        raise
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.put("/{key}")
def update_setting(key: str, payload: UpdateSettingRequest, current_user: dict = Depends(get_current_user)):
    """Update a platform setting (admin only)"""
    try:
        user_id = current_user.get("id") or current_user.get("sub")
        
        # Check if user is admin
        user = supabase.table('users').select('role').eq('id', user_id).limit(1).execute()
        if not user.data or user.data[0].get('role') != 'admin':
            raise HTTPException(status_code=403, detail="Admin access required")
        
        updates = {"value": payload.value}
        if payload.description:
            updates["description"] = payload.description
        
        resp = supabase.table('platform_settings').update(updates).eq('key', key).execute()
        
        if not resp.data:
            raise HTTPException(status_code=404, detail="Setting not found")
        
        return {"success": True, "data": resp.data}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/")
def create_setting(key: str, value: str, description: str = "", current_user: dict = Depends(get_current_user)):
    """Create a new platform setting (admin only)"""
    try:
        user_id = current_user.get("id") or current_user.get("sub")
        
        # Check if user is admin
        user = supabase.table('users').select('role').eq('id', user_id).limit(1).execute()
        if not user.data or user.data[0].get('role') != 'admin':
            raise HTTPException(status_code=403, detail="Admin access required")
        
        setting = {
            "key": key,
            "value": value,
            "description": description
        }
        
        resp = supabase.table('platform_settings').insert(setting).execute()
        return {"success": True, "data": resp.data}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
