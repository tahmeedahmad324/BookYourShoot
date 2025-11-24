from fastapi import APIRouter, UploadFile, File

router = APIRouter(prefix="/cnic", tags=["CNIC Verification"])

@router.post("/upload")
async def upload_cnic(file: UploadFile = File(...)):
    return {"msg": "CNIC uploaded"}

@router.post("/ocr")
async def ocr_cnic():
    return {"msg": "CNIC OCR processing"}
