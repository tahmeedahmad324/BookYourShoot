from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from supabase_client import supabase
from datetime import datetime
import uuid

router = APIRouter(prefix="/cnic", tags=["CNIC Verification"])


@router.post("/upload")
async def upload_cnic(
    user_id: str,
    file: UploadFile = File(...)
):

    try:
        # Step 1: Validate file format
        if not file.filename.lower().endswith((".jpg", ".jpeg", ".png")):
            raise HTTPException(status_code=400, detail="Invalid file format")

        # Step 2: Generate unique storage path
        ext = file.filename.split(".")[-1]
        storage_path = f"cnic/{user_id}/{uuid.uuid4()}.{ext}"

        # Step 3: Upload to Supabase Storage
        file_bytes = await file.read()
        upload_response = supabase.storage.from_("cnic-uploads").upload(
            storage_path,
            file_bytes
        )

        if "error" in str(upload_response).lower():
            raise HTTPException(status_code=500, detail="Upload failed")

        # Step 4: Create CNIC verification request in DB
        supabase.table("cnic_verification").insert({
            "user_id": user_id,
            "upload_path": storage_path,
            "status": "pending",
            "created_at": datetime.utcnow().isoformat()
        }).execute()

        return {
            "message": "CNIC uploaded successfully. Awaiting admin verification.",
            "path": storage_path
        }

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
