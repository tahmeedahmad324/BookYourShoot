"""
Album Builder Face Recognition & Matching Service
Handles face embeddings, similarity matching, and album creation
Uses InsightFace with proper preprocessing pipeline
"""

import cv2
import numpy as np
import os
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Set
import logging
import shutil

logger = logging.getLogger(__name__)


class FaceRecognitionService:
    """
    Production-grade face recognition service
    - Uses InsightFace ArcFace for embeddings 
    - Proper cosine similarity thresholds
    - Safe album creation logic
    """
    
    def __init__(self, similarity_threshold: float = 0.6):
        """
        Initialize face recognition service
        
        Args:
            similarity_threshold: Cosine similarity threshold (0.58-0.65 recommended)
                                0.6 = balanced (recommended)
                                0.65 = strict (fewer false positives)
                                0.58 = lenient (catch more matches)
        """
        self.threshold = similarity_threshold
        self.face_app = None
        self.initialized = False
        
        # Statistics for debugging
        self.stats = {
            'total_processed': 0,
            'faces_detected': 0,
            'no_face_count': 0,
            'low_quality_count': 0,
            'matches_found': 0,
            'reference_embeddings_generated': 0
        }
        
        logger.info(f"FaceRecognitionService initialized (threshold={similarity_threshold})")
    
    def initialize_insightface(self) -> bool:
        """
        Initialize InsightFace model (lazy loading)
        
        Returns:
            True if successful, False if InsightFace not available
        """
        if self.initialized:
            return True
        
        try:
            from insightface.app import FaceAnalysis
            
            logger.info("📦 Loading InsightFace (ArcFace, CPU)...")
            
            # Initialize face analysis (detection + recognition)  
            self.face_app = FaceAnalysis(
                name="buffalo_l",  # Lightweight + accurate model
                providers=["CPUExecutionProvider"]  # CPU only
            )
            self.face_app.prepare(ctx_id=0, det_size=(640, 640))
            
            self.initialized = True
            logger.info("✅ InsightFace initialized successfully")
            return True
            
        except ImportError:
            logger.warning("⚠️ InsightFace not installed. Install with: pip install insightface onnxruntime")
            return False
        except Exception as e:
            logger.error(f"❌ InsightFace initialization failed: {e}")
            return False
    
    def get_reference_embedding(self, image_path: str, person_name: str, strict: bool = True) -> Optional[np.ndarray]:
        """
        Extract face embedding from reference photo with STRICT validation
        
        Args:
            image_path: Path to reference image
            person_name: Name of person for logging
            strict: Strict validation for reference photos
            
        Returns:
            512-D face embedding (normalized) or None if failed
        """
        if not self.initialize_insightface():
            logger.error("InsightFace not available")
            return None
        
        try:
            logger.info(f"🔍 Extracting embedding for {person_name}: {Path(image_path).name}")
            
            # Load and preprocess image
            img = cv2.imread(image_path)
            if img is None:
                logger.error(f"❌ Cannot load image: {image_path}")
                return None
            
            # Apply light normalization (same as preprocessing)
            img = self._normalize_illumination(img)
            
            # Detect faces with InsightFace
            faces = self.face_app.get(img)
            
            if len(faces) == 0:
                logger.warning(f"❌ No faces detected in {person_name}'s reference photo")
                self.stats['no_face_count'] += 1
                return None
            
            if strict and len(faces) > 1:
                logger.warning(f"⚠️ Multiple faces ({len(faces)}) in {person_name}'s reference photo")
                logger.warning("   💡 Recommendation: Use single-person photos for better accuracy")
            
            # Use largest/best face
            best_face = max(faces, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]))
            
            # Quality validation
            if best_face.det_score < 0.6:
                logger.warning(f"⚠️ Low quality face for {person_name} (score: {best_face.det_score:.2f})")
                self.stats['low_quality_count'] += 1
                if strict:
                    logger.error(f"   ❌ Rejected: Quality too low. Use clear, front-facing photo.")
                    return None
            
            # Get normalized embedding
            embedding = best_face.embedding
            embedding = embedding / np.linalg.norm(embedding)  # L2 normalization
            
            self.stats['reference_embeddings_generated'] += 1
            self.stats['faces_detected'] += len(faces)
            
            logger.info(f"✅ Embedding extracted for {person_name} (quality: {best_face.det_score:.2f})")
            return embedding
            
        except Exception as e:
            logger.error(f"❌ Failed to extract embedding for {person_name}: {e}")
            return None
    
    def get_multiple_reference_embeddings(
        self, 
        image_paths: List[str], 
        person_name: str,
        average: bool = True
    ) -> Optional[np.ndarray]:
        """
        Get embeddings from multiple reference photos of same person
        Averages embeddings for better accuracy (recommended)
        
        Args:
            image_paths: List of reference image paths for same person
            person_name: Name of person
            average: If True, return averaged embedding (recommended)
            
        Returns:
            Single 512-D embedding (averaged if multiple photos)
        """
        embeddings = []
        
        logger.info(f"👤 Processing {len(image_paths)} reference photo(s) for {person_name}")
        
        for i, path in enumerate(image_paths, 1):
            logger.info(f"   📸 Photo {i}/{len(image_paths)}: {Path(path).name}")
            emb = self.get_reference_embedding(path, f"{person_name} (photo {i})", strict=True)
            if emb is not None:
                embeddings.append(emb)
        
        if len(embeddings) == 0:
            logger.error(f"❌ No valid embeddings extracted for {person_name}")
            return None
        
        if average and len(embeddings) > 1:
            # Average embeddings for robustness
            avg_embedding = np.mean(embeddings, axis=0)
            # Renormalize after averaging
            avg_embedding = avg_embedding / np.linalg.norm(avg_embedding)
            logger.info(f"✅ Averaged {len(embeddings)} embeddings for {person_name}")
            return avg_embedding
        
        logger.info(f"✅ Using single embedding for {person_name}")
        return embeddings[0]
    
    def find_people_in_event_photos(
        self,
        reference_embeddings: Dict[str, np.ndarray],
        event_photo_paths: List[str],
        progress_callback=None,
        debug: bool = False
    ) -> Dict[str, List[str]]:
        """
        Search for multiple people across event photos
        OPTIMIZED: Processes each photo once, matches all people
        
        Args:
            reference_embeddings: Dict of {person_name: 512-D normalized embedding}
            event_photo_paths: List of event photo paths to search
            progress_callback: Optional callback(current, total, photo_path)
            debug: Enable detailed per-photo logging
            
        Returns:
            Dict of {person_name: [photo_paths where found]}
        """
        if not self.initialize_insightface():
            logger.error("InsightFace not available")
            return {}
        
        # Initialize results
        results = {name: [] for name in reference_embeddings.keys()}
        results["Unknown"] = []
        
        logger.info(f"\n🔍 Searching for {len(reference_embeddings)} people in {len(event_photo_paths)} photos...")
        logger.info(f"Similarity threshold: {self.threshold}")
        logger.info(f"People to find: {list(reference_embeddings.keys())}")
        
        for i, photo_path in enumerate(event_photo_paths):
            try:
                if debug:
                    logger.info(f"\n[{i+1}/{len(event_photo_paths)}] Processing: {Path(photo_path).name}")
                elif i % 50 == 0:  # Log every 50 photos
                    logger.info(f"Progress: {i+1}/{len(event_photo_paths)} photos processed")
                
                # Load and preprocess image
                img = cv2.imread(photo_path)
                if img is None:
                    if debug:
                        logger.debug(f"   ⚠️ Cannot load {Path(photo_path).name}")
                    continue
                
                # Apply same normalization as references
                img = self._normalize_illumination(img)
                
                # Detect all faces in photo (once per photo)
                faces = self.face_app.get(img)
                
                if len(faces) == 0:
                    if debug:
                        logger.debug(f"   No faces detected in {Path(photo_path).name}")
                    results["Unknown"].append(photo_path)
                    continue
                
                if debug:
                    logger.debug(f"   Detected {len(faces)} face(s)")
                
                # Track which people found in this photo
                people_found_in_photo = set()
                
                # Check each detected face against all reference people
                for face_idx, face in enumerate(faces):
                    # Skip low quality faces
                    if face.det_score < 0.4:
                        continue
                    
                    # Normalize face embedding
                    face_emb = face.embedding / np.linalg.norm(face.embedding)
                    
                    # Compare with each reference person
                    for person_name, ref_embedding in reference_embeddings.items():
                        similarity = self._cosine_similarity(ref_embedding, face_emb)
                        
                        if debug:
                            logger.debug(f"      {person_name} vs Face{face_idx+1}: {similarity:.3f}")
                        
                        # Check if match found
                        if similarity >= self.threshold:
                            people_found_in_photo.add(person_name)
                            self.stats['matches_found'] += 1
                            
                            if debug:
                                logger.info(f"   ✅ Found {person_name} (sim={similarity:.3f})")
                            break  # Move to next face (person already found)
                
                # Add photo to appropriate albums
                if people_found_in_photo:
                    for person in people_found_in_photo:
                        results[person].append(photo_path)
                else:
                    results["Unknown"].append(photo_path)
                    
                # Progress callback
                if progress_callback:
                    progress_callback(i + 1, len(event_photo_paths), photo_path)
                
                self.stats['total_processed'] += 1
                self.stats['faces_detected'] += len(faces)
                    
            except Exception as e:
                logger.error(f"❌ Error processing {Path(photo_path).name}: {e}")
                continue
        
        # Log final results
        logger.info(f"\n📊 Search Results:")
        for person_name, photos in results.items():
            if person_name != "Unknown" or len(photos) > 0:
                logger.info(f"   {person_name}: {len(photos)} photo(s)")
        
        return results
    
    def create_albums(
        self,
        search_results: Dict[str, List[str]], 
        output_dir: str,
        copy_files: bool = True
    ) -> Dict:
        """
        Create physical album folders from search results
        
        Args:
            search_results: Results from find_people_in_event_photos
            output_dir: Base directory to create albums
            copy_files: If True, copy images. If False, just create file lists
            
        Returns:
            Dict with album creation summary
        """
        logger.info(f"\n📁 Creating albums in: {output_dir}")
        
        # Create base directory
        os.makedirs(output_dir, exist_ok=True)
        
        album_summary = {
            "albums_created": 0,
            "total_photos_organized": 0,
            "albums": {},
            "output_directory": output_dir
        }
        
        for person_name, photo_paths in search_results.items():
            if len(photo_paths) == 0:
                continue
            
            # Create person folder
            person_folder = os.path.join(output_dir, self._sanitize_folder_name(person_name))
            os.makedirs(person_folder, exist_ok=True)
            
            if copy_files:
                # Copy photos to album folder
                copied_count = 0
                for photo_path in photo_paths:
                    try:
                        filename = Path(photo_path).name
                        dest_path = os.path.join(person_folder, filename)
                        
                        # Avoid overwriting if same filename exists 
                        if os.path.exists(dest_path):
                            stem = Path(photo_path).stem
                            suffix = Path(photo_path).suffix
                            dest_path = os.path.join(person_folder, f"{stem}_{copied_count}{suffix}")
                        
                        shutil.copy2(photo_path, dest_path)
                        copied_count += 1
                        
                    except Exception as e:
                        logger.warning(f"Failed to copy {photo_path}: {e}")
                
                logger.info(f"✅ {person_name}: {copied_count}/{len(photo_paths)} photos copied")
                album_summary["albums"][person_name] = copied_count
                album_summary["total_photos_organized"] += copied_count
            else:
                # Just create file list
                list_file = os.path.join(person_folder, "photo_list.txt")
                with open(list_file, 'w') as f:
                    for photo_path in photo_paths:
                        f.write(f"{photo_path}\n")
                
                logger.info(f"✅ {person_name}: {len(photo_paths)} photos listed")
                album_summary["albums"][person_name] = len(photo_paths)
                album_summary["total_photos_organized"] += len(photo_paths)
            
            album_summary["albums_created"] += 1
        
        logger.info(f"\n📊 Album Creation Summary:")
        logger.info(f"   Albums created: {album_summary['albums_created']}")
        logger.info(f"   Photos organized: {album_summary['total_photos_organized']}")
        
        return album_summary
    
    def print_statistics(self):
        """Print processing statistics for debugging"""
        logger.info("\n" + "="*50)
        logger.info("FACE RECOGNITION STATISTICS")
        logger.info("="*50)
        logger.info(f"Total images processed: {self.stats['total_processed']}")
        logger.info(f"Total faces detected: {self.stats['faces_detected']}")
        logger.info(f"Reference embeddings: {self.stats['reference_embeddings_generated']}")
        logger.info(f"Images with no faces: {self.stats['no_face_count']}")
        logger.info(f"Low quality faces: {self.stats['low_quality_count']}") 
        logger.info(f"Matches found: {self.stats['matches_found']}")
        logger.info(f"Similarity threshold: {self.threshold}")
        logger.info("="*50 + "\n")
    
    def _cosine_similarity(self, emb1: np.ndarray, emb2: np.ndarray) -> float:
        """
        Calculate cosine similarity between two normalized embeddings
        
        For ArcFace embeddings:
        - Same person: 0.65 - 0.85
        - Similar looking: 0.5 - 0.65  
        - Different person: < 0.5
        
        Args:
            emb1: First embedding (normalized)
            emb2: Second embedding (normalized)
            
        Returns:
            Cosine similarity (-1 to 1, higher = more similar)
        """
        # Both embeddings should already be L2 normalized
        similarity = np.dot(emb1, emb2)
        similarity = np.clip(similarity, -1.0, 1.0)
        return float(similarity)
    
    def _normalize_illumination(self, img: np.ndarray) -> np.ndarray:
        """
        Apply same illumination normalization as preprocessing
        Light CLAHE normalization
        
        Args:
            img: Input image (BGR)
            
        Returns:
            Normalized image
        """
        # Convert to YCrCb color space
        ycrcb = cv2.cvtColor(img, cv2.COLOR_BGR2YCrCb)
        y, cr, cb = cv2.split(ycrcb)
        
        # Apply light CLAHE 
        clahe = cv2.createCLAHE(clipLimit=1.5, tileGridSize=(8, 8))
        y = clahe.apply(y)
        
        # Merge back and convert to BGR
        ycrcb = cv2.merge((y, cr, cb))
        return cv2.cvtColor(ycrcb, cv2.COLOR_YCrCb2BGR)
    
    def _sanitize_folder_name(self, name: str) -> str:
        """
        Sanitize person name for folder creation
        
        Args:
            name: Person name
            
        Returns:
            Safe folder name
        """
        # Remove/replace invalid characters
        import re
        safe_name = re.sub(r'[<>:"/\\|?*]', '_', name)
        safe_name = safe_name.strip('. ')
        return safe_name if safe_name else "Person"


class OpenCVFaceRecognitionService(FaceRecognitionService):
    """
    Face recognition using OpenCV DNN (no compilation required)
    Uses Haar Cascade for detection and histogram-based matching
    Works on Windows without special build tools
    """
    
    def __init__(self, similarity_threshold: float = 0.55):
        super().__init__(similarity_threshold)
        self.face_cascade = None
        self.reference_histograms = {}
        logger.info("📦 OpenCVFaceRecognitionService initialized")
    
    def initialize_insightface(self) -> bool:
        """Initialize OpenCV face detector"""
        if self.initialized:
            return True
        
        try:
            # Load Haar Cascade
            cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
            self.face_cascade = cv2.CascadeClassifier(cascade_path)
            
            if self.face_cascade.empty():
                logger.error("Failed to load face cascade")
                return False
            
            self.initialized = True
            logger.info("✅ OpenCV Face Recognition initialized")
            return True
            
        except Exception as e:
            logger.error(f"❌ OpenCV initialization failed: {e}")
            return False
    
    def get_reference_embedding(self, image_path: str, person_name: str, strict: bool = True) -> Optional[np.ndarray]:
        """
        Extract face features using color histogram + LBP texture
        """
        if not self.initialize_insightface():
            return None
        
        try:
            logger.info(f"🔍 Processing reference: {person_name} - {Path(image_path).name}")
            
            img = cv2.imread(image_path)
            if img is None:
                logger.error(f"Cannot load: {image_path}")
                return None
            
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            
            # Detect faces
            faces = self.face_cascade.detectMultiScale(
                gray, scaleFactor=1.1, minNeighbors=5, minSize=(60, 60)
            )
            
            if len(faces) == 0:
                logger.warning(f"No face detected in {person_name}'s photo")
                # Try with more lenient settings
                faces = self.face_cascade.detectMultiScale(
                    gray, scaleFactor=1.05, minNeighbors=3, minSize=(40, 40)
                )
                if len(faces) == 0:
                    self.stats['no_face_count'] += 1
                    return None
            
            # Use largest face
            x, y, w, h = max(faces, key=lambda f: f[2] * f[3])
            
            # Add padding around face
            padding = int(w * 0.3)
            x1 = max(0, x - padding)
            y1 = max(0, y - padding)  
            x2 = min(img.shape[1], x + w + padding)
            y2 = min(img.shape[0], y + h + padding)
            
            face_roi = img[y1:y2, x1:x2]
            
            # Create feature embedding
            embedding = self._extract_face_features(face_roi)
            
            self.stats['reference_embeddings_generated'] += 1
            logger.info(f"✅ Features extracted for {person_name}")
            return embedding
            
        except Exception as e:
            logger.error(f"❌ Reference processing failed: {e}")
            return None
    
    def _extract_face_features(self, face_roi: np.ndarray) -> np.ndarray:
        """
        Extract combined features: color histogram + texture (LBP-like)
        Returns normalized feature vector
        """
        # Resize face to standard size
        face = cv2.resize(face_roi, (128, 128))
        
        features = []
        
        # 1. Color histogram (HSV - more robust to lighting)
        hsv = cv2.cvtColor(face, cv2.COLOR_BGR2HSV)
        for channel in range(3):
            hist = cv2.calcHist([hsv], [channel], None, [32], [0, 256])
            hist = cv2.normalize(hist, hist).flatten()
            features.extend(hist)
        
        # 2. Grayscale histogram
        gray = cv2.cvtColor(face, cv2.COLOR_BGR2GRAY)
        gray_hist = cv2.calcHist([gray], [0], None, [64], [0, 256])
        gray_hist = cv2.normalize(gray_hist, gray_hist).flatten()
        features.extend(gray_hist)
        
        # 3. Local texture features (simplified LBP)
        # Divide face into 4x4 grid and compute local stats
        cell_h, cell_w = face.shape[0] // 4, face.shape[1] // 4
        for i in range(4):
            for j in range(4):
                cell = gray[i*cell_h:(i+1)*cell_h, j*cell_w:(j+1)*cell_w]
                features.extend([
                    np.mean(cell) / 255.0,
                    np.std(cell) / 255.0
                ])
        
        # 4. Edge features
        edges = cv2.Canny(gray, 50, 150)
        edge_hist = cv2.calcHist([edges], [0], None, [16], [0, 256])
        edge_hist = cv2.normalize(edge_hist, edge_hist).flatten()
        features.extend(edge_hist)
        
        # Convert to numpy and normalize
        embedding = np.array(features, dtype=np.float32)
        embedding = embedding / (np.linalg.norm(embedding) + 1e-6)
        
        return embedding
    
    def find_people_in_event_photos(
        self,
        reference_embeddings: Dict[str, np.ndarray],
        event_photo_paths: List[str],
        progress_callback=None,
        debug: bool = False
    ) -> Dict[str, List[str]]:
        """
        Search for people using feature matching
        """
        if not self.initialize_insightface():
            return {}
        
        results = {name: [] for name in reference_embeddings.keys()}
        results["Unknown"] = []
        
        logger.info(f"\n🔍 Searching for {len(reference_embeddings)} people in {len(event_photo_paths)} photos...")
        logger.info(f"Threshold: {self.threshold}")
        
        for i, photo_path in enumerate(event_photo_paths):
            try:
                if (i + 1) % 20 == 0:
                    logger.info(f"Progress: {i+1}/{len(event_photo_paths)}")
                
                img = cv2.imread(photo_path)
                if img is None:
                    continue
                
                gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
                
                # Detect faces
                faces = self.face_cascade.detectMultiScale(
                    gray, scaleFactor=1.1, minNeighbors=4, minSize=(50, 50)
                )
                
                if len(faces) == 0:
                    results["Unknown"].append(photo_path)
                    continue
                
                # Check each face
                matched_people = set()
                
                for (x, y, w, h) in faces:
                    # Add padding
                    padding = int(w * 0.25)
                    x1 = max(0, x - padding)
                    y1 = max(0, y - padding)  
                    x2 = min(img.shape[1], x + w + padding)
                    y2 = min(img.shape[0], y + h + padding)
                    
                    face_roi = img[y1:y2, x1:x2]
                    face_embedding = self._extract_face_features(face_roi)
                    
                    # Compare with references
                    best_match = None
                    best_score = 0
                    
                    for person_name, ref_emb in reference_embeddings.items():
                        similarity = self._cosine_similarity(ref_emb, face_embedding)
                        
                        if similarity > best_score and similarity >= self.threshold:
                            best_score = similarity
                            best_match = person_name
                    
                    if best_match:
                        matched_people.add(best_match)
                        if debug:
                            logger.info(f"Match: {best_match} (score={best_score:.3f}) in {Path(photo_path).name}")
                
                # Assign photo to albums
                if matched_people:
                    for person in matched_people:
                        results[person].append(photo_path)
                        self.stats['matches_found'] += 1
                else:
                    results["Unknown"].append(photo_path)
                
                self.stats['total_processed'] += 1
                
                if progress_callback:
                    progress_callback(i + 1, len(event_photo_paths), photo_path)
                
            except Exception as e:
                logger.error(f"Error processing {Path(photo_path).name}: {e}")
                continue
        
        # Log results
        logger.info("\n📊 Results:")
        for name, photos in results.items():
            if photos:
                logger.info(f"  {name}: {len(photos)} photos")
        
        return results


# Alias for backward compatibility
MockFaceRecognitionService = OpenCVFaceRecognitionService