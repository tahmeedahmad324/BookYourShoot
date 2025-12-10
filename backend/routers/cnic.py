from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from backend.supabase_client import supabase
from backend.auth import get_current_user
from datetime import datetime
import uuid
import cv2
import numpy as np
import pytesseract
import re
import io
from typing import Optional
from pydantic import BaseModel
try:
    from pyzbar import pyzbar
    PYZBAR_AVAILABLE = True
except ImportError:
    PYZBAR_AVAILABLE = False

router = APIRouter(prefix="/cnic", tags=["CNIC Verification"])

# Configure Tesseract path (adjust based on your system)
try:
    pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
except:
    pass  # Will use system PATH if available


class CNICProcessor:
    """CNIC OCR Processor for validation"""
    
    def __init__(self, image_bytes):
        # Convert bytes to numpy array
        nparr = np.frombuffer(image_bytes, np.uint8)
        self.image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if self.image is None:
            raise ValueError("Invalid image data")
    
    def preprocess_image(self):
        """Prepares image for OCR"""
        gray = cv2.cvtColor(self.image, cv2.COLOR_BGR2GRAY)
        gray = cv2.bilateralFilter(gray, 11, 17, 17)
        thresh = cv2.adaptiveThreshold(
            gray, 255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY, 31, 2
        )
        return gray, thresh
    
    def check_readability(self):
        """Check if CNIC is readable (not blurry)"""
        gray = cv2.cvtColor(self.image, cv2.COLOR_BGR2GRAY)
        
        # Calculate Laplacian variance (blur detection)
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        
        # Check edge density (micro-print patterns)
        edges = cv2.Canny(gray, 60, 150)
        edge_density = (edges > 0).mean()
        
        is_readable = laplacian_var > 100 and edge_density > 0.05
        
        return {
            "is_readable": is_readable,
            "blur_score": float(laplacian_var),
            "edge_density": float(edge_density),
            "quality": "Good" if is_readable else "Poor - Image too blurry or low quality"
        }
    
    def extract_cnic_number(self):
        """Extract CNIC number using multi-scale OCR"""
        gray, _ = self.preprocess_image()
        
        def ocr_data_for(img):
            try:
                data = pytesseract.image_to_data(img, lang="eng", output_type=pytesseract.Output.DICT)
                words = []
                confs = []
                n = len(data.get('text', []))
                for i in range(n):
                    w = data['text'][i].strip() if data['text'][i] is not None else ''
                    if w:
                        words.append(w)
                        try:
                            confs.append(int(data['conf'][i]))
                        except:
                            try:
                                confs.append(float(data['conf'][i]))
                            except:
                                confs.append(-1)
                return {"words": words, "conf": confs}
            except:
                return {"words": [], "conf": []}
        
        best_cnic = None
        best_score = -1
        
        # Try multiple scales
        for scale in [1.0, 1.5, 2.0]:
            if scale == 1.0:
                img = gray
            else:
                h, w = gray.shape[:2]
                img = cv2.resize(gray, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_LINEAR)
            
            od = ocr_data_for(img)
            words = od.get('words', [])
            confs = od.get('conf', [])
            
            # Sliding window to find CNIC pattern
            for i in range(len(words)):
                for L in range(1, 6):
                    if i + L > len(words):
                        break
                    window = words[i:i+L]
                    window_text = ' '.join(window)
                    
                    # Look for explicit 5-7-1 pattern
                    m = re.search(r"(\d{5})[-\s]?(\d{7})[-\s]?(\d)\b", window_text)
                    if m:
                        normalized = f"{m.group(1)}-{m.group(2)}-{m.group(3)}"
                        avg_conf = 50
                        if confs and len(confs) >= i+L:
                            window_confs = confs[i:i+L]
                            valid = [c for c in window_confs if c >= 0]
                            if valid:
                                avg_conf = sum(valid) / len(valid)
                        score = avg_conf + (L * 5)
                        if score > best_score:
                            best_score = score
                            best_cnic = normalized
        
        # Fallback: extract from full text
        if best_cnic is None:
            raw_text = pytesseract.image_to_string(gray, lang="eng")
            m = re.search(r"\b(\d{5})[-\s](\d{7})[-\s](\d)\b", raw_text)
            if m:
                best_cnic = f"{m.group(1)}-{m.group(2)}-{m.group(3)}"
            else:
                all_digits = re.sub(r"\D", "", raw_text)
                m2 = re.search(r"(\d{13})", all_digits)
                if m2:
                    d = m2.group(1)
                    best_cnic = f"{d[:5]}-{d[5:12]}-{d[12]}"
        
        return best_cnic
    
    def extract_dates(self):
        """Extract dates for expiry check"""
        gray, _ = self.preprocess_image()
        raw_text = pytesseract.image_to_string(gray, lang="eng")
        
        date_matches = re.findall(r"\b\d{2}[./-]\d{2}[./-]\d{4}\b", raw_text)
        date_matches += re.findall(r"\b\d{4}[./-]\d{2}[./-]\d{2}\b", raw_text)
        
        return list(set(date_matches))
    
    def extract_name(self):
        """Extract name from CNIC with multiple OCR attempts"""
        gray, _ = self.preprocess_image()
        
        # Try multiple OCR configs for better accuracy
        possible_names = []
        
        # Config 1: Default
        raw_text = pytesseract.image_to_string(gray, lang="eng")
        possible_names.extend(self._parse_names_from_text(raw_text))
        
        # Config 2: PSM 6 (uniform block of text)
        raw_text2 = pytesseract.image_to_string(gray, lang="eng", config="--psm 6")
        possible_names.extend(self._parse_names_from_text(raw_text2))
        
        # Return most common name or first found
        return possible_names[0] if possible_names else None
    
    def _parse_names_from_text(self, text):
        """Helper to parse names from OCR text"""
        lines = text.split('\n')
        names = []
        
        for line in lines:
            # Skip lines with common CNIC keywords
            if re.search(r'(IDENTITY|CARD|ISLAMIC|REPUBLIC|PAKISTAN|DATE|BIRTH|HOLDER|SIGNATURE|FATHER|S/O|D/O)', line.upper()):
                continue
            
            # Clean the line
            cleaned = re.sub(r'[^A-Z\s]', '', line.upper()).strip()
            if not cleaned:
                continue
            
            words = cleaned.split()
            # Name should have 2-4 words, each at least 2 chars
            valid_words = [w for w in words if len(w) >= 2]
            
            if 2 <= len(valid_words) <= 4:
                names.append(' '.join(valid_words))
        
        return names
    
    def check_expiry(self, dates):
        """Check if CNIC is expired"""
        if not dates:
            return {"is_expired": None, "message": "No expiry date found"}
        
        parsed_dates = []
        for date_str in dates:
            for fmt in ["%d.%m.%Y", "%d-%m-%Y", "%d/%m/%Y", "%Y-%m-%d", "%Y/%m/%d"]:
                try:
                    dt = datetime.strptime(date_str, fmt)
                    parsed_dates.append((dt, date_str))
                    break
                except ValueError:
                    continue
        
        if not parsed_dates:
            return {"is_expired": None, "message": "Could not parse dates"}
        
        # Latest date is typically expiry
        parsed_dates.sort(key=lambda x: x[0], reverse=True)
        expiry_dt, expiry_str = parsed_dates[0]
        
        today = datetime.now()
        is_expired = expiry_dt < today
        
        if is_expired:
            days_diff = (today - expiry_dt).days
            message = f"EXPIRED {days_diff} days ago"
        else:
            days_diff = (expiry_dt - today).days
            message = f"Valid - {days_diff} days remaining"
        
        return {
            "expiry_date": expiry_str,
            "is_expired": is_expired,
            "days_difference": days_diff,
            "message": message
        }
    
    def scan_qr_code(self):
        """Scan QR code from CNIC back side"""
        if not PYZBAR_AVAILABLE:
            return {"success": False, "message": "QR code scanner not available"}
        
        try:
            # Convert to format pyzbar expects
            decoded_objects = pyzbar.decode(self.image)
            
            if not decoded_objects:
                return {"success": False, "message": "No QR code found"}
            
            qr_data = []
            for obj in decoded_objects:
                data = obj.data.decode('utf-8')
                qr_data.append({
                    "type": obj.type,
                    "data": data
                })
            
            return {"success": True, "qr_data": qr_data}
        except Exception as e:
            return {"success": False, "message": f"QR scan error: {str(e)}"}


class VerificationResponse(BaseModel):
    is_readable: bool
    quality: str
    cnic_number: Optional[str] = None
    possible_name: Optional[str] = None
    dates: list = []
    expiry_info: Optional[dict] = None
    message: str


@router.post("/verify", response_model=VerificationResponse)
async def verify_cnic(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Verify CNIC readability and extract basic information.
    Always prompt user to use Computerized NIC (not old handwritten NICOP).
    """
    try:
        # Validate file format
        if not file.filename.lower().endswith((".jpg", ".jpeg", ".png")):
            raise HTTPException(
                status_code=400, 
                detail="Invalid file format. Please upload JPG or PNG image of your Computerized NIC (not handwritten NICOP)"
            )
        
        # Read file bytes
        file_bytes = await file.read()
        
        # Process CNIC
        processor = CNICProcessor(file_bytes)
        
        # Check readability
        readability = processor.check_readability()
        
        if not readability["is_readable"]:
            return VerificationResponse(
                is_readable=False,
                quality=readability["quality"],
                message="CNIC image quality is too poor. Please upload a clear photo of your Computerized NIC in good lighting."
            )
        
        # Extract CNIC number
        cnic_number = processor.extract_cnic_number()
        
        # Extract name
        possible_name = processor.extract_name()
        
        # Extract and check expiry
        dates = processor.extract_dates()
        expiry_info = processor.check_expiry(dates)
        
        # Store in database for verification
        try:
            # Handle both dict and User object
            if hasattr(current_user, 'id'):
                user_id = current_user.id
            elif hasattr(current_user, 'get'):
                user_id = current_user.get("id") or current_user.get("sub")
            else:
                # Fallback: try dict-like access
                user_id = current_user["id"] if "id" in current_user else current_user["sub"]
            
            if cnic_number:
                # Parse DOB from dates if available
                extracted_dob = None
                if dates:
                    for date_str in dates:
                        for fmt in ["%d.%m.%Y", "%d-%m-%Y", "%d/%m/%Y", "%Y-%m-%d", "%Y/%m/%d"]:
                            try:
                                dt = datetime.strptime(date_str, fmt)
                                # Assume oldest date is DOB
                                if not extracted_dob or dt < extracted_dob:
                                    extracted_dob = dt.date()
                                break
                            except ValueError:
                                continue
                
                # Insert CNIC verification record matching your schema
                supabase.table("cnic_verification").insert({
                    "user_id": user_id,
                    "upload_path": file.filename,  # Store filename as placeholder
                    "extracted_cnic": cnic_number,
                    "extracted_name": possible_name,
                    "extracted_dob": extracted_dob.isoformat() if extracted_dob else None,
                    "status": "approved" if not expiry_info.get("is_expired") else "rejected",
                    "notes": expiry_info.get("message", "")
                }).execute()
        except Exception as db_error:
            # Log error but don't fail the request
            print(f"Warning: Could not save to database: {db_error}")
            # Continue without saving to DB
        
        return VerificationResponse(
            is_readable=True,
            quality=readability["quality"],
            cnic_number=cnic_number,
            possible_name=possible_name,
            dates=dates,
            expiry_info=expiry_info,
            message="CNIC verified successfully" if cnic_number and not expiry_info.get("is_expired") 
                    else "CNIC expired or invalid. Please use a valid Computerized NIC."
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Verification failed: {str(e)}")


@router.post("/verify-back")
async def verify_cnic_back(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Verify CNIC back side and scan QR code for additional verification.
    """
    try:
        # Validate file format
        if file.filename and not file.filename.lower().endswith((".jpg", ".jpeg", ".png")):
            raise HTTPException(
                status_code=400, 
                detail="Invalid file format. Please upload JPG or PNG image"
            )
        
        # Read file bytes
        file_bytes = await file.read()
        
        # Process CNIC back side
        processor = CNICProcessor(file_bytes)
        
        # Scan QR code
        qr_result = processor.scan_qr_code()
        
        return {
            "is_readable": True,
            "qr_success": qr_result.get("success", False),
            "qr_data": qr_result.get("qr_data", []),
            "message": qr_result.get("message", "QR code scanned")
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Back side verification failed: {str(e)}")
