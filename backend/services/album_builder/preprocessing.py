"""
Image Preprocessing Module
Resizes images to ~1MB for faster processing without quality loss
Crops reference photos to focus on faces
"""

import os
from PIL import Image
from typing import Tuple, List
import logging
import cv2
import numpy as np

logger = logging.getLogger(__name__)


class ImagePreprocessor:
    """
    Preprocesses images for album builder
    - Resizes to optimal size (~1MB)
    - Maintains aspect ratio
    - Converts to RGB
    """
    
    def __init__(self, target_size_mb: float = 0.3, max_dimension: int = 800, face_crop_size: int = 400):
        """
        Initialize preprocessor - optimized for SPEED
        
        Args:
            target_size_mb: Target file size in MB (0.3MB for speed)
            max_dimension: Maximum width/height in pixels
            face_crop_size: Size for cropped face images (default 512x512)
        """
        self.target_size_mb = target_size_mb
        self.max_dimension = max_dimension
        self.target_size_bytes = target_size_mb * 1024 * 1024
        self.face_crop_size = face_crop_size
        
        # Load Haar Cascade for face detection
        cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        self.face_cascade = cv2.CascadeClassifier(cascade_path)
    
    def preprocess_image(self, image_path: str, output_path: str = None) -> Tuple[str, dict]:
        """
        Preprocess single image
        
        Args:
            image_path: Path to input image
            output_path: Path to save processed image (optional)
            
        Returns:
            Tuple of (processed_image_path, metadata)
        """
        try:
            # Open image
            with Image.open(image_path) as img:
                # Convert to RGB if needed
                if img.mode != 'RGB':
                    img = img.convert('RGB')
                
                original_size = os.path.getsize(image_path)
                original_dimensions = img.size
                
                # Resize if needed
                if max(img.size) > self.max_dimension or original_size > self.target_size_bytes:
                    img = self._resize_image(img)
                
                # Save processed image
                if output_path is None:
                    output_path = self._generate_output_path(image_path)
                
                # Compress more aggressively for event photos (target ~1MB)
                target_size = min(self.target_size_bytes, 1024 * 1024)  # 1MB max
                quality = self._calculate_quality(img, target_size)
                quality = max(60, quality)  # Minimum quality 60 for good visuals
                img.save(output_path, 'JPEG', quality=quality, optimize=True)
                
                processed_size = os.path.getsize(output_path)
                
                metadata = {
                    'original_path': image_path,
                    'processed_path': output_path,
                    'original_size_mb': round(original_size / (1024 * 1024), 2),
                    'processed_size_mb': round(processed_size / (1024 * 1024), 2),
                    'original_dimensions': original_dimensions,
                    'processed_dimensions': img.size,
                    'compression_ratio': round(original_size / processed_size, 2) if processed_size > 0 else 1
                }
                
                logger.info(f"Preprocessed {os.path.basename(image_path)}: "
                          f"{metadata['original_size_mb']}MB → {metadata['processed_size_mb']}MB")
                
                return output_path, metadata
        
        except Exception as e:
            logger.error(f"Error preprocessing {image_path}: {str(e)}")
            raise
    
    def preprocess_batch(self, image_paths: List[str], output_dir: str) -> List[Tuple[str, dict]]:
        """
        Preprocess multiple images
        
        Args:
            image_paths: List of image paths
            output_dir: Directory to save processed images
            
        Returns:
            List of (processed_path, metadata) tuples
        """
        os.makedirs(output_dir, exist_ok=True)
        results = []
        
        for i, image_path in enumerate(image_paths, 1):
            try:
                output_filename = f"processed_{i:04d}_{os.path.basename(image_path)}"
                output_path = os.path.join(output_dir, output_filename)
                
                result = self.preprocess_image(image_path, output_path)
                results.append(result)
                
                logger.info(f"Progress: {i}/{len(image_paths)} images processed")
            
            except Exception as e:
                logger.error(f"Failed to process {image_path}: {str(e)}")
                continue
        
        return results
    
    def extract_all_faces_from_reference(self, image_path: str, base_output_path: str) -> Tuple[List[str], dict]:
        """
        Extract ALL faces from a reference photo for multi-person detection
        Handles screenshots, PNGs with transparency, and all image formats
        
        Args:
            image_path: Path to input image
            base_output_path: Base path for saving cropped faces
            
        Returns:
            Tuple of (list_of_cropped_paths, metadata)
        """
        try:
            # Read image with PIL first to handle all formats (especially screenshots)
            pil_img = Image.open(image_path)
            
            # Convert RGBA to RGB (for screenshots with transparency)
            if pil_img.mode == 'RGBA':
                logger.info(f"Converting RGBA screenshot to RGB: {os.path.basename(image_path)}")
                # Create white background
                background = Image.new('RGB', pil_img.size, (255, 255, 255))
                background.paste(pil_img, mask=pil_img.split()[3])  # Use alpha channel as mask
                pil_img = background
            elif pil_img.mode != 'RGB':
                logger.info(f"Converting {pil_img.mode} to RGB: {os.path.basename(image_path)}")
                pil_img = pil_img.convert('RGB')
            
            # Convert to OpenCV format
            img = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
            
            if img is None or img.size == 0:
                raise Exception(f"Failed to load image: {image_path}")
            
            original_dimensions = img.shape[:2]
            
            # Enhance contrast for better face detection (helps with screenshots)
            img_enhanced = cv2.convertScaleAbs(img, alpha=1.2, beta=10)
            gray = cv2.cvtColor(img_enhanced, cv2.COLOR_BGR2GRAY)
            
            # Apply histogram equalization for screenshots with poor contrast
            gray = cv2.equalizeHist(gray)
            
            # Try multiple detection strategies to catch all faces
            all_faces = []
            
            # Strategy 1: Standard detection (catches clear faces)
            faces1 = self.face_cascade.detectMultiScale(
                gray,
                scaleFactor=1.1,
                minNeighbors=3,  # More lenient
                minSize=(60, 60)  # Smaller minimum
            )
            all_faces.extend(faces1)
            logger.info(f"Strategy 1 found {len(faces1)} face(s)")
            
            # Strategy 2: Very aggressive (catches smaller/angled faces)
            faces2 = self.face_cascade.detectMultiScale(
                gray,
                scaleFactor=1.05,  # More sensitive to size changes
                minNeighbors=2,    # Very lenient
                minSize=(40, 40)   # Very small faces
            )
            
            # Remove duplicates using overlap detection
            for face2 in faces2:
                is_duplicate = False
                x2, y2, w2, h2 = face2
                for face1 in all_faces:
                    x1, y1, w1, h1 = face1
                    # Check if faces overlap significantly
                    overlap_x = max(0, min(x1 + w1, x2 + w2) - max(x1, x2))
                    overlap_y = max(0, min(y1 + h1, y2 + h2) - max(y1, y2))
                    overlap_area = overlap_x * overlap_y
                    area1 = w1 * h1
                    area2 = w2 * h2
                    if overlap_area > 0.5 * min(area1, area2):  # 50% overlap = duplicate
                        is_duplicate = True
                        break
                if not is_duplicate:
                    all_faces.append(face2)
            
            faces = np.array(all_faces)
            logger.info(f"Total {len(faces)} unique face(s) detected after deduplication")
            
            cropped_paths = []
            
            if len(faces) == 0:
                logger.warning(f"⚠️ No face detected in {os.path.basename(image_path)} (possibly a screenshot without faces). Using center crop as fallback.")
                # Fallback: center crop
                h, w = img.shape[:2]
                size = min(h, w)
                start_x = (w - size) // 2
                start_y = (h - size) // 2
                cropped = img[start_y:start_y+size, start_x:start_x+size]
                
                # Resize and save
                cropped_resized = cv2.resize(cropped, (self.face_crop_size, self.face_crop_size))
                cropped_pil = Image.fromarray(cv2.cvtColor(cropped_resized, cv2.COLOR_BGR2RGB))
                cropped_pil.save(base_output_path, 'JPEG', quality=95, optimize=True)
                cropped_paths.append(base_output_path)
            else:
                # Sort faces by size (largest first)
                faces_sorted = sorted(faces, key=lambda f: f[2] * f[3], reverse=True)
                
                for idx, (x, y, w, h) in enumerate(faces_sorted, 1):
                    # Add padding around face (30% on each side)
                    padding = int(max(w, h) * 0.3)
                    x_start = max(0, x - padding)
                    y_start = max(0, y - padding)
                    x_end = min(img.shape[1], x + w + padding)
                    y_end = min(img.shape[0], y + h + padding)
                    
                    cropped = img[y_start:y_end, x_start:x_end]
                    
                    # Resize to fixed size
                    cropped_resized = cv2.resize(cropped, (self.face_crop_size, self.face_crop_size))
                    
                    # Convert to PIL for saving
                    cropped_pil = Image.fromarray(cv2.cvtColor(cropped_resized, cv2.COLOR_BGR2RGB))
                    
                    # Generate output path for each face
                    if idx == 1:
                        face_output_path = base_output_path
                    else:
                        # Add suffix for multiple faces
                        base_name = os.path.splitext(base_output_path)[0]
                        ext = os.path.splitext(base_output_path)[1]
                        face_output_path = f"{base_name}_face{idx}{ext}"
                    
                    cropped_pil.save(face_output_path, 'JPEG', quality=95, optimize=True)
                    cropped_paths.append(face_output_path)
            
            metadata = {
                'original_path': image_path,
                'cropped_paths': cropped_paths,
                'original_dimensions': original_dimensions,
                'face_detected': len(faces) > 0,
                'num_faces': len(faces),
                'crop_size': (self.face_crop_size, self.face_crop_size),
                'file_sizes_mb': [round(os.path.getsize(p) / (1024 * 1024), 2) for p in cropped_paths]
            }
            
            logger.info(f"Extracted {len(cropped_paths)} face(s) from {os.path.basename(image_path)}")
            
            return cropped_paths, metadata
            
        except Exception as e:
            logger.error(f"Failed to extract faces from {image_path}: {str(e)}")
            raise
    
    def crop_face_from_reference(self, image_path: str, output_path: str = None) -> Tuple[str, dict]:
        """
        Crop and focus on face in reference photo for better recognition (single face)
        Handles screenshots, PNGs with transparency, and all image formats
        
        Args:
            image_path: Path to input image
            output_path: Path to save cropped face
            
        Returns:
            Tuple of (cropped_image_path, metadata)
        """
        try:
            # Read image with PIL first to handle all formats (especially screenshots)
            pil_img = Image.open(image_path)
            
            # Convert RGBA to RGB (for screenshots with transparency)
            if pil_img.mode == 'RGBA':
                logger.info(f"Converting RGBA screenshot to RGB: {os.path.basename(image_path)}")
                background = Image.new('RGB', pil_img.size, (255, 255, 255))
                background.paste(pil_img, mask=pil_img.split()[3])
                pil_img = background
            elif pil_img.mode != 'RGB':
                logger.info(f"Converting {pil_img.mode} to RGB: {os.path.basename(image_path)}")
                pil_img = pil_img.convert('RGB')
            
            # Convert to OpenCV format
            img = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
            
            if img is None or img.size == 0:
                raise Exception(f"Failed to load image: {image_path}")
            
            original_dimensions = img.shape[:2]
            
            # Enhance contrast for better face detection
            img_enhanced = cv2.convertScaleAbs(img, alpha=1.2, beta=10)
            gray = cv2.cvtColor(img_enhanced, cv2.COLOR_BGR2GRAY)
            
            # Apply histogram equalization
            gray = cv2.equalizeHist(gray)
            
            # Aggressive face detection
            faces = self.face_cascade.detectMultiScale(
                gray,
                scaleFactor=1.05,
                minNeighbors=3,
                minSize=(40, 40)
            )
            
            logger.info(f"Detected {len(faces)} face(s) in {os.path.basename(image_path)}")
            
            if len(faces) == 0:
                logger.warning(f"⚠️ No face detected in {os.path.basename(image_path)} (possibly a screenshot without faces). Using center crop.")
                # Fallback: center crop
                h, w = img.shape[:2]
                size = min(h, w)
                start_x = (w - size) // 2
                start_y = (h - size) // 2
                cropped = img[start_y:start_y+size, start_x:start_x+size]
            else:
                # Use largest face
                x, y, w, h = max(faces, key=lambda f: f[2] * f[3])
                
                # Add padding around face (30% on each side)
                padding = int(max(w, h) * 0.3)
                x_start = max(0, x - padding)
                y_start = max(0, y - padding)
                x_end = min(img.shape[1], x + w + padding)
                y_end = min(img.shape[0], y + h + padding)
                
                cropped = img[y_start:y_end, x_start:x_end]
            
            # Resize to fixed size
            cropped_resized = cv2.resize(cropped, (self.face_crop_size, self.face_crop_size))
            
            # Convert to PIL for saving
            cropped_pil = Image.fromarray(cv2.cvtColor(cropped_resized, cv2.COLOR_BGR2RGB))
            
            # Save
            if output_path is None:
                output_path = self._generate_output_path(image_path)
            
            cropped_pil.save(output_path, 'JPEG', quality=95, optimize=True)
            
            metadata = {
                'original_path': image_path,
                'cropped_path': output_path,
                'original_dimensions': original_dimensions,
                'face_detected': len(faces) > 0,
                'num_faces': len(faces),
                'crop_size': (self.face_crop_size, self.face_crop_size),
                'file_size_mb': round(os.path.getsize(output_path) / (1024 * 1024), 2)
            }
            
            logger.info(f"Cropped face from {os.path.basename(image_path)}: "
                       f"{len(faces)} face(s) detected")
            
            return output_path, metadata
            
        except Exception as e:
            logger.error(f"Error cropping face from {image_path}: {str(e)}")
            raise
    
    def _resize_image(self, img: Image.Image) -> Image.Image:
        """Resize image maintaining aspect ratio"""
        width, height = img.size
        
        if width > height:
            new_width = min(width, self.max_dimension)
            new_height = int((new_width / width) * height)
        else:
            new_height = min(height, self.max_dimension)
            new_width = int((new_height / height) * width)
        
        return img.resize((new_width, new_height), Image.Resampling.LANCZOS)
    
    def _calculate_quality(self, img: Image.Image, target_bytes: int) -> int:
        """Calculate JPEG quality to meet target file size"""
        # Start with high quality
        quality = 95
        
        # Estimate file size based on dimensions
        pixels = img.size[0] * img.size[1]
        estimated_bytes = pixels * 3 * 0.1  # Rough estimate for JPEG
        
        if estimated_bytes > target_bytes:
            # Reduce quality proportionally
            quality = int(95 * (target_bytes / estimated_bytes))
            quality = max(60, min(95, quality))  # Keep between 60-95
        
        return quality
    
    def _generate_output_path(self, input_path: str) -> str:
        """Generate output path for processed image"""
        directory = os.path.dirname(input_path)
        filename = os.path.basename(input_path)
        name, ext = os.path.splitext(filename)
        
        return os.path.join(directory, f"{name}_processed.jpg")
    
    @staticmethod
    def get_supported_formats() -> List[str]:
        """Get list of supported image formats"""
        return ['.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.webp']
    
    @staticmethod
    def is_supported_image(file_path: str) -> bool:
        """Check if file is a supported image format"""
        ext = os.path.splitext(file_path)[1].lower()
        return ext in ImagePreprocessor.get_supported_formats()
