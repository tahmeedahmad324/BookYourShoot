from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from backend.supabase_client import supabase
from backend.auth import get_current_user
from datetime import datetime
import cv2
import numpy as np
import pytesseract
import re
from typing import Optional, List, Dict, Any, Tuple, cast
from pydantic import BaseModel
try:
    from pyzbar import pyzbar as pyzbar_mod
    PYZBAR_AVAILABLE = True
except ImportError:
    pyzbar_mod = None
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
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("Invalid image data")
        self.image = cast(np.ndarray, img)
    
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

    # Valid first digits for Pakistani CNIC province codes (1-8)
    _VALID_PROVINCE_DIGITS = set("12345678")

    def _normalize_cnic(self, text: str) -> Optional[str]:
        """Extract CNIC from QR: drop last digit, take last 13, format."""
        if not text:
            return None
        
        # Strip all non-digits
        digits = re.sub(r"\D", "", text)
        
        # Drop last digit, take last 13, format
        cnic_digits = digits[:-1][-13:]
        return f"{cnic_digits[:5]}-{cnic_digits[5:12]}-{cnic_digits[12]}"

    def _mask_cnic(self, cnic: Optional[str]) -> Optional[str]:
        if not cnic or not re.match(r"^\d{5}-\d{7}-\d$", cnic):
            return None
        return f"{cnic}"

    def _quick_ocr_text(self) -> str:
        """Fast, low-cost OCR pass used for document-type gating (avoid random docs)."""
        gray = cv2.cvtColor(self.image, cv2.COLOR_BGR2GRAY)
        h, w = gray.shape[:2]

        # Downscale large images for speed/stability
        max_w = 1200
        if w > max_w:
            scale = max_w / float(w)
            gray = cv2.resize(gray, (max_w, int(h * scale)), interpolation=cv2.INTER_AREA)

        gray = cv2.GaussianBlur(gray, (3, 3), 0)
        try:
            txt = pytesseract.image_to_string(gray, lang="eng", config="--psm 6")
        except Exception:
            txt = ""
        return (txt or "").upper()

    def _card_aspect_ratio_ok(self) -> Tuple[bool, float]:
        h, w = self.image.shape[:2]
        if h == 0 or w == 0:
            return False, 0.0
        ratio = max(w, h) / float(min(w, h))
        # CNIC is credit-card-like (~1.58). Be tolerant.
        return 1.30 <= ratio <= 1.90, float(ratio)

    def _front_face_count(self) -> int:
        try:
            gray = cv2.cvtColor(self.image, cv2.COLOR_BGR2GRAY)
            cv2_data = getattr(cv2, "data", None)
            haar_dir = getattr(cv2_data, "haarcascades", "") if cv2_data else ""
            if not haar_dir:
                return 0
            cascade_path = haar_dir + "haarcascade_frontalface_default.xml"
            face_cascade = cv2.CascadeClassifier(cascade_path)
            if face_cascade.empty():
                return 0
            faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=4, minSize=(40, 40))
            return int(len(faces))
        except Exception:
            return 0

    def looks_like_cnic_front(self) -> Dict[str, Any]:
        """Heuristic gate to reduce OCR on random documents."""
        txt = self._quick_ocr_text()
        keywords = [
            "IDENTITY", "CARD", "PAKISTAN", "ISLAMIC", "REPUBLIC", "NADRA", "NATIONAL"
        ]
        hits = [k for k in keywords if k in txt]

        aspect_ok, ratio = self._card_aspect_ratio_ok()
        face_count = self._front_face_count()

        # Strong signal: a CNIC-like number pattern somewhere in text
        maybe_cnic = self._normalize_cnic(txt)

        # Scoring: require multiple independent signals
        score = 0
        if len(hits) >= 2:
            score += 2
        if aspect_ok:
            score += 1
        if face_count >= 1:
            score += 1
        if maybe_cnic:
            score += 2

        is_cnic = score >= 4  # conservative: reduce false positives
        reason = []
        if len(hits) < 2:
            reason.append("missing_cnic_keywords")
        if not aspect_ok:
            reason.append("unexpected_aspect_ratio")
        if face_count < 1:
            reason.append("no_face_detected")
        if not maybe_cnic:
            reason.append("cnic_number_not_found")

        return {
            "is_cnic": bool(is_cnic),
            "score": int(score),
            "keyword_hits": hits,
            "aspect_ratio": ratio,
            "face_count": int(face_count),
            "reason": reason,
        }

    def looks_like_cnic_back(self) -> Dict[str, Any]:
        txt = self._quick_ocr_text()
        keywords = ["NADRA", "PAKISTAN", "IDENTITY", "CARD", "ADDRESS"]
        hits = [k for k in keywords if k in txt]
        aspect_ok, ratio = self._card_aspect_ratio_ok()
        return {
            "is_cnic": bool(aspect_ok and len(hits) >= 1),
            "keyword_hits": hits,
            "aspect_ratio": ratio,
        }
    
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

    def extract_cnic_from_qr_payloads(self, payloads: List[str]) -> Optional[str]:
        """Extract CNIC from one or more QR payload strings.

        Each payload may be a raw numeric string (e.g. 26 digits) where the
        13-digit CNIC is embedded, or a formatted string with separators.
        We try every payload through _normalize_cnic which now handles the
        long-numeric-string case.
        """
        candidates: List[str] = []
        for p in payloads or []:
            if not p:
                continue
            n = self._normalize_cnic(p)
            if n:
                candidates.append(n)

        if not candidates:
            return None

        # Prefer candidates whose first digit is a valid province code
        for c in candidates:
            first_digit = c[0] if c else ""
            if first_digit in self._VALID_PROVINCE_DIGITS:
                return c

        return candidates[0]
    
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
    
    def _build_qr_preprocessing_variants(self) -> List[np.ndarray]:
        """Build a comprehensive list of preprocessed image variants for QR scanning."""
        variants: List[np.ndarray] = []
        h, w = self.image.shape[:2]

        # 1. Original
        variants.append(self.image)

        # 2. Grayscale
        gray = cv2.cvtColor(self.image, cv2.COLOR_BGR2GRAY)
        variants.append(gray)

        # 3. Binary (fixed threshold)
        _, binary = cv2.threshold(gray, 127, 255, cv2.THRESH_BINARY)
        variants.append(binary)

        # 4. Otsu threshold (better for varying lighting)
        _, otsu = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        variants.append(otsu)

        # 5. Adaptive threshold
        adaptive = cv2.adaptiveThreshold(
            gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
        )
        variants.append(adaptive)

        # 6. CLAHE (enhanced contrast)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        enhanced = clahe.apply(gray)
        variants.append(enhanced)

        # 7. Sharpened
        kernel = np.array([[0, -1, 0], [-1, 5, -1], [0, -1, 0]], dtype=np.float32)
        sharpened = cv2.filter2D(gray, -1, kernel)
        variants.append(sharpened)

        # 8. Inverted binary
        _, inverted = cv2.threshold(gray, 127, 255, cv2.THRESH_BINARY_INV)
        variants.append(inverted)

        # 9-10. Upscaled variants (2x, 3x) — helps when QR is small in the image
        for scale in [2.0, 3.0]:
            upscaled = cv2.resize(gray, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_CUBIC)
            variants.append(upscaled)
            _, up_otsu = cv2.threshold(upscaled, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
            variants.append(up_otsu)

        # 11. Cropped to right-half of the card (QR is typically in upper-right)
        right_half = gray[:, w // 2 :]
        variants.append(right_half)
        right_up = cv2.resize(right_half, (right_half.shape[1] * 2, right_half.shape[0] * 2), interpolation=cv2.INTER_CUBIC)
        variants.append(right_up)

        return variants

    def scan_qr_code(self):
        """Scan QR code from CNIC back side with comprehensive preprocessing."""
        payloads: List[str] = []
        images_to_try = self._build_qr_preprocessing_variants()

        # ---- Pass 1: OpenCV QRCodeDetector ----
        detector = cv2.QRCodeDetector()
        for img in images_to_try:
            if payloads:
                break  # stop early once we have data
            try:
                # Multi-detect
                try:
                    ok, decoded_info, points, _ = detector.detectAndDecodeMulti(cast(Any, img))
                    if ok and decoded_info:
                        for data in decoded_info:
                            if data and data not in payloads:
                                payloads.append(data)
                except Exception:
                    pass
                # Single detect
                data, points, _ = detector.detectAndDecode(cast(Any, img))
                if data and data not in payloads:
                    payloads.append(data)
            except Exception:
                continue

        # ---- Pass 2: pyzbar (reads QR and many other barcode types) ----
        if PYZBAR_AVAILABLE and not payloads:
            try:
                for img in images_to_try:
                    if payloads:
                        break
                    decoded_objects = pyzbar_mod.decode(img) if pyzbar_mod else []
                    for obj in decoded_objects:
                        try:
                            data = obj.data.decode('utf-8')
                            if data and data not in payloads:
                                payloads.append(data)
                        except Exception:
                            continue
            except Exception:
                pass

        if not payloads:
            return {
                "success": False,
                "message": "No QR code found. Please ensure the QR code is clearly visible and not obscured.",
                "payloads": [],
            }

        return {"success": True, "message": "QR code scanned successfully", "payloads": payloads}


class VerificationResponse(BaseModel):
    is_readable: bool
    quality: str
    looks_like_cnic: Optional[bool] = None
    document_check: Optional[dict] = None
    cnic_number: Optional[str] = None
    possible_name: Optional[str] = None
    dates: list = []
    expiry_info: Optional[dict] = None
    message: str


class PairVerificationResponse(BaseModel):
    front_is_readable: bool
    back_is_readable: bool
    front_looks_like_cnic: bool
    back_looks_like_cnic: bool
    cnic_number_front: Optional[str] = None
    cnic_number_from_qr: Optional[str] = None
    cnic_match: bool
    expiry_info: Optional[dict] = None
    message: str


@router.post("/verify", response_model=VerificationResponse)
async def verify_cnic(
    file: UploadFile = File(...),
    current_user: Any = Depends(get_current_user)
):
    """
    Verify CNIC readability and extract basic information.
    Always prompt user to use Computerized NIC (not old handwritten NICOP).
    """
    try:
        # Validate file format
        if not file.filename or not file.filename.lower().endswith((".jpg", ".jpeg", ".png")):
            raise HTTPException(
                status_code=400, 
                detail="Invalid file format. Please upload JPG or PNG image of your Computerized NIC (not handwritten NICOP)"
            )
        
        # Read file bytes
        file_bytes = await file.read()
        
        # Process CNIC
        processor = CNICProcessor(file_bytes)

        # Reject non-CNIC-looking images early (avoid OCR on random docs)
        doc_check = processor.looks_like_cnic_front()
        if not doc_check.get("is_cnic"):
            raise HTTPException(
                status_code=400,
                detail="This image does not look like a Pakistani Computerized CNIC front side. Please upload a clear photo of the CNIC front (with photo + CNIC number)."
            )
        
        # Check readability
        readability = processor.check_readability()
        
        if not readability["is_readable"]:
            return VerificationResponse(
                is_readable=False,
                quality=readability["quality"],
                looks_like_cnic=bool(doc_check.get("is_cnic")),
                document_check=doc_check,
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
            looks_like_cnic=True,
            document_check=doc_check,
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
    current_user: Any = Depends(get_current_user)
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

        doc_check = processor.looks_like_cnic_back()
        
        # Scan QR code
        qr_result = processor.scan_qr_code()

        cnic_from_qr = None
        if qr_result.get("success"):
            cnic_from_qr = processor.extract_cnic_from_qr_payloads(qr_result.get("payloads", []))
        
        return {
            "is_readable": True,
            "looks_like_cnic": bool(doc_check.get("is_cnic")),
            "qr_success": qr_result.get("success", False),
            "cnic_number_from_qr": processor._mask_cnic(cnic_from_qr),
            "message": qr_result.get("message", "QR code scanned") if qr_result.get("success") else qr_result.get("message", "No QR code found")
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Back side verification failed: {str(e)}")


@router.post("/verify-pair", response_model=PairVerificationResponse)
async def verify_cnic_pair(
    front_file: UploadFile = File(...),
    back_file: UploadFile = File(...),
    current_user: Any = Depends(get_current_user)
):
    """Verify CNIC belongs to the same person by matching front OCR CNIC number with the CNIC number embedded in the back-side QR."""
    try:
        for f in [front_file, back_file]:
            if not f.filename or not f.filename.lower().endswith((".jpg", ".jpeg", ".png")):
                raise HTTPException(status_code=400, detail="Invalid file format. Please upload JPG or PNG images.")

        front_bytes = await front_file.read()
        back_bytes = await back_file.read()

        front = CNICProcessor(front_bytes)
        back = CNICProcessor(back_bytes)

        front_doc = front.looks_like_cnic_front()
        back_doc = back.looks_like_cnic_back()

        # QR presence is a strong back-side signal; use it to avoid false rejects
        qr_result = back.scan_qr_code()
        back_is_cnic = bool(back_doc.get("is_cnic")) or bool(qr_result.get("success"))
        if not front_doc.get("is_cnic"):
            raise HTTPException(status_code=400, detail="Front image does not look like a Pakistani Computerized CNIC front side.")
        if not back_is_cnic:
            raise HTTPException(status_code=400, detail="Back image does not look like a Pakistani Computerized CNIC back side.")

        front_readability = front.check_readability()
        back_readability = back.check_readability()
        if not front_readability.get("is_readable"):
            return PairVerificationResponse(
                front_is_readable=False,
                back_is_readable=bool(back_readability.get("is_readable")),
                front_looks_like_cnic=True,
                back_looks_like_cnic=bool(back_is_cnic),
                cnic_number_front=None,
                cnic_number_from_qr=None,
                cnic_match=False,
                expiry_info=None,
                message="Front image is too blurry/low quality. Please upload a clearer CNIC front photo."
            )

        cnic_front = front.extract_cnic_number()
        if not cnic_front:
            return PairVerificationResponse(
                front_is_readable=True,
                back_is_readable=bool(back_readability.get("is_readable")),
                front_looks_like_cnic=True,
                back_looks_like_cnic=bool(back_is_cnic),
                cnic_number_front=None,
                cnic_number_from_qr=None,
                cnic_match=False,
                expiry_info=None,
                message="Could not detect CNIC number on the front side. Please upload a clearer front image where the CNIC number is visible."
            )

        dates = front.extract_dates()
        expiry_info = front.check_expiry(dates)

        if not qr_result.get("success"):
            return PairVerificationResponse(
                front_is_readable=True,
                back_is_readable=bool(back_readability.get("is_readable")),
                front_looks_like_cnic=True,
                back_looks_like_cnic=bool(back_is_cnic),
                cnic_number_front=cnic_front,
                cnic_number_from_qr=None,
                cnic_match=False,
                expiry_info=expiry_info,
                message="Could not read QR code on the back side. Please upload a clearer back image (QR fully visible, no glare)."
            )

        cnic_qr = back.extract_cnic_from_qr_payloads(qr_result.get("payloads", []))
        
        if not cnic_qr:
            return PairVerificationResponse(
                front_is_readable=True,
                back_is_readable=True,
                front_looks_like_cnic=True,
                back_looks_like_cnic=bool(back_is_cnic),
                cnic_number_front=cnic_front,
                cnic_number_from_qr=None,
                cnic_match=False,
                expiry_info=expiry_info,
                message="QR was detected but CNIC number could not be parsed from it. Please retake the back photo." 
            )

        # Compare digits only (strip dashes) so formatting differences
        # between front OCR and QR extraction don't cause false mismatches.
        front_digits = re.sub(r"\D", "", cnic_front) if cnic_front else ""
        qr_digits = re.sub(r"\D", "", cnic_qr) if cnic_qr else ""
        cnic_match = (front_digits == qr_digits) and len(front_digits) == 13

        # Best-effort DB write (keep current schema assumptions)
        try:
            if hasattr(current_user, 'id'):
                user_id = current_user.id
            elif hasattr(current_user, 'get'):
                user_id = current_user.get("id") or current_user.get("sub")
            else:
                user_id = current_user["id"] if "id" in current_user else current_user["sub"]

            status = "approved" if (cnic_match and not expiry_info.get("is_expired")) else "rejected"
            notes = []
            notes.append(f"QR match: {cnic_match}")
            notes.append(expiry_info.get("message", ""))
            notes.append(f"QR CNIC: {back._mask_cnic(cnic_qr) or 'N/A'}")
            
            # Save to cnic_verification table
            supabase.table("cnic_verification").insert({
                "user_id": user_id,
                "upload_path": f"{front_file.filename} | {back_file.filename}",
                "extracted_cnic": cnic_front,
                "extracted_name": front.extract_name(),
                "extracted_dob": None,
                "status": status,
                "notes": " | ".join([n for n in notes if n])
            }).execute()
            
            # Update user's profile with CNIC verification status
            if cnic_match:
                supabase.table("users").update({
                    "cnic_verified": True,
                    "cnic_number": cnic_front
                }).eq("id", user_id).execute()
        except Exception as db_error:
            print(f"Warning: Could not save pair verification to database: {db_error}")

        msg = "CNIC verified: front number matches back QR." if cnic_match else "CNIC mismatch: front number does not match back QR."
        if expiry_info.get("is_expired") is True:
            msg = msg + " CNIC appears expired."

        return PairVerificationResponse(
            front_is_readable=True,
            back_is_readable=bool(back_readability.get("is_readable")),
            front_looks_like_cnic=True,
            back_looks_like_cnic=bool(back_is_cnic),
            cnic_number_front=cnic_front,
            cnic_number_from_qr=back._mask_cnic(cnic_qr),
            cnic_match=bool(cnic_match),
            expiry_info=expiry_info,
            message=msg
        )

    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Pair verification failed: {str(e)}")
