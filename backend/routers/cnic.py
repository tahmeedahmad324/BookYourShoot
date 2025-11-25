from fastapi import APIRouter, UploadFile, File, HTTPException
from backend.supabase_client import supabase
from datetime import datetime
import uuid

router = APIRouter(prefix="/cnic", tags=["CNIC Verification"])


@router.post("/upload")
async def upload_cnic(user_id: str, file: UploadFile = File(...)):
    try:
        # Validate file format
        if not file.filename.lower().endswith((".jpg", ".jpeg", ".png")):
            raise HTTPException(status_code=400, detail="Invalid file format")

        ext = file.filename.split(".")[-1]
        storage_path = f"cnic/{user_id}/{uuid.uuid4()}.{ext}"

        file_bytes = await file.read()
        upload_response = supabase.storage.from_("cnic-uploads").upload(storage_path, file_bytes)

        if hasattr(upload_response, 'error') and upload_response.error:
            raise HTTPException(status_code=500, detail="Upload failed")

        supabase.table("cnic_verification").insert({
            "user_id": user_id,
            "upload_path": storage_path,
            "status": "pending",
            "created_at": datetime.utcnow().isoformat()
        }).execute()

        return {"message": "CNIC uploaded successfully. Awaiting admin verification.", "path": storage_path}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/ocr")
async def ocr_cnic():
    return {"msg": "CNIC OCR processing"}
