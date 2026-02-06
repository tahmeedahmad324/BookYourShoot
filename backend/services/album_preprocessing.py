"""
Album Builder Preprocessing Service
Handles reference photo preprocessing (strict) and event photo compression (flexible)
Following production-grade face recognition pipeline
"""

import cv2
import numpy as np
from PIL import Image
import os
from pathlib import Path
from typing import Tuple, List, Optional, Dict
import logging

logger = logging.getLogger(__name__)


class ImagePreprocessor:
    """
    Production-grade image preprocessing for face recognition
    Reference photos: STRICT preprocessing for clean embeddings
    Event photos: FLEXIBLE preprocessing for speed + quality balance
    """
    
    def __init__(self):
        """Initialize preprocessor with optimal settings"""
        
        # Reference photo settings (STRICT)
        self.ref_max_size = 1600  # Keep face details
        self.ref_min_face_size = 60  # Minimum face size
        self.ref_quality_threshold = 0.7  # High quality requirement
        
        # Event photo settings (FLEXIBLE) 
        self.event_max_size = 1600  # Max 1600px for speed
        self.event_target_size_mb = 1.0  # Target ~1MB per image
        self.event_jpeg_quality = 85  # Visually lossless
        self.event_quality_threshold = 0.5  # More lenient
        
        logger.info("✅ ImagePreprocessor initialized")
    
    def preprocess_reference_photo(self, image_path: str, output_dir: str) -> Tuple[Optional[str], Dict]:
        """
        SIMPLE preprocessing for reference photos - just clean and resize
        No strict face detection to avoid blocking users
        
        Args:
            image_path: Path to reference image
            output_dir: Directory to save processed image
            
        Returns:
            Tuple of (processed_image_path, metadata)
        """
        try:
            logger.info(f"📷 Processing reference: {Path(image_path).name}")
            
            # Load image
            img = cv2.imread(image_path)
            if img is None:
                raise ValueError(f"Cannot load image: {image_path}")
            
            original_size = img.shape[:2]
            
            # Convert RGBA to RGB if needed
            img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            pil_img = Image.fromarray(img_rgb)
            
            if pil_img.mode == 'RGBA':
                background = Image.new('RGB', pil_img.size, (255, 255, 255))
                background.paste(pil_img, mask=pil_img.split()[-1])
                pil_img = background
            
            # Convert back to OpenCV
            img = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
            
            # Smart resize to reasonable size
            max_size = 1200
            if max(img.shape[:2]) > max_size:
                scale = max_size / max(img.shape[:2])
                new_w = int(img.shape[1] * scale)
                new_h = int(img.shape[0] * scale)
                img = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_AREA)
            
            # Light normalization
            img = self._normalize_illumination(img)
            
            # Save processed image
            os.makedirs(output_dir, exist_ok=True)
            output_path = os.path.join(output_dir, f"ref_{Path(image_path).stem}.jpg")
            cv2.imwrite(output_path, img, [cv2.IMWRITE_JPEG_QUALITY, 90])
            
            # Metadata
            file_size = os.path.getsize(output_path)
            metadata = {
                "original_size": original_size,
                "processed_size": img.shape[:2],
                "file_size_mb": file_size / (1024 * 1024),
                "status": "success"
            }
            
            logger.info(f"✅ Processed: {Path(image_path).name}")
            return output_path, metadata
            
        except Exception as e:
            logger.error(f"❌ Reference processing failed: {e}")
            return None, {"error": str(e), "status": "failed"}
            
            # Get the single face
            x, y, w, h = faces[0]
            
            # Validate face size
            if w < self.ref_min_face_size or h < self.ref_min_face_size:
                return None, {"error": "Face too small", "suggestion": "Face should cover ~40% of image"}
            
            # Crop face with margin (30% padding)
            margin = int(max(w, h) * 0.3)
            x_start = max(0, x - margin)
            y_start = max(0, y - margin)
            x_end = min(img.shape[1], x + w + margin)
            y_end = min(img.shape[0], y + h + margin)
            
            face_img = img[y_start:y_end, x_start:x_end]
            
            # Light illumination normalization
            face_img = self._normalize_illumination(face_img, intensity=0.3)
            
            # Save processed image
            output_path = os.path.join(output_dir, f"ref_processed_{Path(image_path).stem}.jpg")
            os.makedirs(output_dir, exist_ok=True)
            
            # Save with high quality
            cv2.imwrite(output_path, face_img, [cv2.IMWRITE_JPEG_QUALITY, 95])
            
            # Metadata
            processed_size = os.path.getsize(output_path)
            metadata = {
                "original_size": original_size,
                "processed_size": face_img.shape[:2],
                "face_bbox": (x, y, w, h),
                "face_size_percent": (w * h) / (original_size[0] * original_size[1]) * 100,
                "file_size_mb": processed_size / (1024 * 1024),
                "quality": "high",
                "status": "success"
            }
            
            logger.info(f"✅ Reference processed: {Path(image_path).name} ({metadata['face_size_percent']:.1f}% face)")
            return output_path, metadata
            
        except Exception as e:
            logger.error(f"❌ Reference processing failed: {e}")
            return None, {"error": str(e), "status": "failed"}
    
    def preprocess_event_photo(self, image_path: str, output_dir: str) -> Tuple[Optional[str], Dict]:
        """
        FLEXIBLE preprocessing for event photos
        Just resize and optimize for face recognition
        
        Args:
            image_path: Path to event image
            output_dir: Directory to save processed image
            
        Returns:
            Tuple of (processed_image_path, metadata)
        """
        try:
            logger.debug(f"🎉 Processing event photo: {Path(image_path).name}")
            
            # Load with PIL for better format support
            pil_img = Image.open(image_path)
            
            # Convert RGBA to RGB if needed
            if pil_img.mode == 'RGBA':
                background = Image.new('RGB', pil_img.size, (255, 255, 255))
                background.paste(pil_img, mask=pil_img.split()[-1])
                pil_img = background
            elif pil_img.mode != 'RGB':
                pil_img = pil_img.convert('RGB')
            
            original_size = pil_img.size
            
            # Smart resize for speed
            max_dim = 1600
            if max(pil_img.size) > max_dim:
                pil_img.thumbnail((max_dim, max_dim), Image.Resampling.LANCZOS)
            
            # Convert to OpenCV for final processing
            img = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
            
            # Light normalization
            img = self._normalize_illumination(img)
            
            # Save processed image
            os.makedirs(output_dir, exist_ok=True)
            output_path = os.path.join(output_dir, f"event_{Path(image_path).stem}.jpg")
            cv2.imwrite(output_path, img, [cv2.IMWRITE_JPEG_QUALITY, 85])
            
            # Metadata
            file_size = os.path.getsize(output_path)
            metadata = {
                "original_size": original_size,
                "processed_size": img.shape[:2],
                "file_size_mb": file_size / (1024 * 1024),
                "status": "success"
            }
            
            return output_path, metadata
            
        except Exception as e:
            logger.error(f"❌ Event processing failed: {e}")
            return None, {"error": str(e), "status": "failed"}
            
            # Convert RGBA/P to RGB
            if pil_img.mode in ['RGBA', 'P']:
                # Create white background for transparency
                rgb_img = Image.new('RGB', pil_img.size, (255, 255, 255))
                if pil_img.mode == 'RGBA':
                    rgb_img.paste(pil_img, mask=pil_img.split()[3])
                else:
                    rgb_img.paste(pil_img)
                pil_img = rgb_img
            elif pil_img.mode != 'RGB':
                pil_img = pil_img.convert('RGB')
            
            original_size = pil_img.size
            original_file_size = os.path.getsize(image_path)
            
            # Smart resize (keep aspect ratio)
            pil_img = self._smart_resize_pil(pil_img, self.event_max_size)
            
            # Calculate JPEG quality for target file size
            quality = self._calculate_jpeg_quality(pil_img, target_size_mb=self.event_target_size_mb)
            
            # Save compressed image
            output_path = os.path.join(output_dir, f"event_{Path(image_path).stem}.jpg")
            os.makedirs(output_dir, exist_ok=True)
            
            pil_img.save(output_path, 'JPEG', quality=quality, optimize=True)
            
            # Metadata
            processed_file_size = os.path.getsize(output_path)
            metadata = {
                "original_size": original_size,
                "processed_size": pil_img.size,
                "original_file_size_mb": original_file_size / (1024 * 1024),
                "processed_file_size_mb": processed_file_size / (1024 * 1024),
                "compression_ratio": original_file_size / processed_file_size if processed_file_size > 0 else 1,
                "jpeg_quality": quality,
                "status": "success"
            }
            
            return output_path, metadata
            
        except Exception as e:
            logger.error(f"❌ Event processing failed: {e}")
            return None, {"error": str(e), "status": "failed"}
    
    def _detect_faces_opencv(self, img: np.ndarray, strict: bool = False) -> List[Tuple[int, int, int, int]]:
        """
        Detect faces using OpenCV Haar Cascade (fallback before InsightFace)
        
        Args:
            img: Input image (BGR)
            strict: If True, use stricter parameters
            
        Returns:
            List of face bounding boxes (x, y, w, h)
        """
        # Load Haar Cascade
        cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        face_cascade = cv2.CascadeClassifier(cascade_path)
        
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # Apply histogram equalization for better detection
        gray = cv2.equalizeHist(gray)
        
        if strict:
            # Strict parameters for reference photos
            faces = face_cascade.detectMultiScale(
                gray,
                scaleFactor=1.1,
                minNeighbors=5,
                minSize=(self.ref_min_face_size, self.ref_min_face_size),
                maxSize=(min(img.shape[:2]) // 2, min(img.shape[:2]) // 2)
            )
        else:
            # Lenient parameters for event photos
            faces = face_cascade.detectMultiScale(
                gray,
                scaleFactor=1.05,
                minNeighbors=3,
                minSize=(30, 30)
            )
        
        return list(faces)
    
    def _smart_resize(self, img: np.ndarray, max_size: int, preserve_details: bool = True) -> np.ndarray:
        """
        Smart resize maintaining aspect ratio
        
        Args:
            img: Input image (BGR)
            max_size: Maximum dimension
            preserve_details: Use high-quality interpolation
            
        Returns:
            Resized image
        """
        h, w = img.shape[:2]
        
        if max(h, w) <= max_size:
            return img
        
        # Calculate new size
        scale = max_size / max(h, w)
        new_w, new_h = int(w * scale), int(h * scale)
        
        # Use high-quality interpolation if preserving details
        interpolation = cv2.INTER_LANCZOS4 if preserve_details else cv2.INTER_AREA
        
        return cv2.resize(img, (new_w, new_h), interpolation=interpolation)
    
    def _smart_resize_pil(self, img: Image.Image, max_size: int) -> Image.Image:
        """
        Smart resize PIL image maintaining aspect ratio
        
        Args:
            img: PIL Image
            max_size: Maximum dimension
            
        Returns:
            Resized PIL Image
        """
        if max(img.size) <= max_size:
            return img
        
        # PIL thumbnail maintains aspect ratio
        img.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
        return img
    
    def _normalize_illumination(self, img: np.ndarray, intensity: float = 0.5) -> np.ndarray:
        """
        Light illumination normalization using CLAHE
        
        Args:
            img: Input image (BGR)
            intensity: Normalization intensity (0-1)
            
        Returns:
            Normalized image
        """
        # Convert to YCrCb color space
        ycrcb = cv2.cvtColor(img, cv2.COLOR_BGR2YCrCb)
        y, cr, cb = cv2.split(ycrcb)
        
        # Apply CLAHE (Contrast Limited Adaptive Histogram Equalization)
        clip_limit = 1.0 + intensity * 2.0  # Scale clip limit
        clahe = cv2.createCLAHE(clipLimit=clip_limit, tileGridSize=(8, 8))
        y = clahe.apply(y)
        
        # Merge back and convert to BGR
        ycrcb = cv2.merge((y, cr, cb))
        return cv2.cvtColor(ycrcb, cv2.COLOR_YCrCb2BGR)
    
    def _calculate_jpeg_quality(self, img: Image.Image, target_size_mb: float) -> int:
        """
        Calculate JPEG quality to achieve target file size
        
        Args:
            img: PIL Image
            target_size_mb: Target file size in MB
            
        Returns:
            JPEG quality (30-95)
        """
        import io
        
        # Estimate quality based on image dimensions
        pixels = img.size[0] * img.size[1]
        
        if pixels > 3000000:  # > 3MP
            base_quality = 75
        elif pixels > 1000000:  # > 1MP
            base_quality = 82
        else:
            base_quality = 90
        
        # Test quality and adjust
        for quality in range(base_quality, 30, -5):
            buffer = io.BytesIO()
            img.save(buffer, 'JPEG', quality=quality, optimize=True)
            size_mb = buffer.tell() / (1024 * 1024)
            
            if size_mb <= target_size_mb:
                return min(quality, 95)
        
        return max(30, base_quality - 20)  # Minimum quality fallback