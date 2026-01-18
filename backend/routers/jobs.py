from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, Literal
from backend.supabase_client import supabase
from backend.auth import get_current_user

router = APIRouter(prefix="/jobs", tags=["Job Queue"])


class CreateJobRequest(BaseModel):
    job_type: Literal["generate_reel", "process_cnic_ocr", "index_faces"]
    payload: dict


@router.post("/")
def create_job(job: CreateJobRequest, current_user: dict = Depends(get_current_user)):
    """Create a new background job"""
    try:
        user_id = current_user.get("id") or current_user.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")

        job_data = {
            "user_id": user_id,
            "job_type": job.job_type,
            "status": "pending",
            "payload": job.payload
        }

        resp = supabase.table('job_queue').insert(job_data).execute()
        return {
            "success": True,
            "data": resp.data,
            "message": f"Job {job.job_type} created and queued for processing"
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/")
def get_my_jobs(
    status: Optional[str] = None,
    limit: int = 50,
    current_user: dict = Depends(get_current_user)
):
    """Get jobs for current user"""
    try:
        user_id = current_user.get("id") or current_user.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")

        query = supabase.table('job_queue').select('*').eq('user_id', user_id)
        
        if status:
            query = query.eq('status', status)
        
        resp = query.order('created_at', desc=True).limit(limit).execute()
        
        return {"success": True, "data": resp.data}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.get("/{job_id}")
def get_job_status(job_id: str, current_user: dict = Depends(get_current_user)):
    """Get specific job status"""
    try:
        user_id = current_user.get("id") or current_user.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")

        resp = supabase.table('job_queue').select('*').eq('id', job_id).eq('user_id', user_id).limit(1).execute()
        
        if not resp.data:
            raise HTTPException(status_code=404, detail="Job not found")
        
        return {"success": True, "data": resp.data[0]}
    except HTTPException:
        raise
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.put("/{job_id}/status")
def update_job_status(
    job_id: str,
    status: Literal["pending", "processing", "completed", "failed"],
    result: Optional[dict] = None,
    error_message: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Update job status (internal use, can add admin check)"""
    try:
        updates = {"status": status}
        
        if result:
            updates["result"] = result
        if error_message:
            updates["error_message"] = error_message
        
        resp = supabase.table('job_queue').update(updates).eq('id', job_id).execute()
        
        if not resp.data:
            raise HTTPException(status_code=404, detail="Job not found")
        
        return {"success": True, "data": resp.data}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/admin/pending")
def get_pending_jobs(current_user: dict = Depends(get_current_user)):
    """Get all pending jobs (admin endpoint)"""
    try:
        # TODO: Add admin role check
        user_id = current_user.get("id") or current_user.get("sub")
        
        # Check if user is admin
        user = supabase.table('users').select('role').eq('id', user_id).limit(1).execute()
        if not user.data or user.data[0].get('role') != 'admin':
            raise HTTPException(status_code=403, detail="Admin access required")
        
        resp = supabase.table('job_queue').select('*').eq('status', 'pending').order('created_at', desc=False).limit(100).execute()
        
        return {"success": True, "data": resp.data}
    except HTTPException:
        raise
    except Exception as e:
        return {"success": False, "error": str(e)}
