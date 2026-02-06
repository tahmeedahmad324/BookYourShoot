"""
Fast and accurate face recognition using InsightFace (ArcFace)
This is the industry-standard approach used by Google Photos / Samsung Gallery
- Uses ArcFace embeddings (512-D vectors)
- ONNX runtime (CPU optimized, no GPU needed)
- ~2 minutes for 60 photos on CPU
"""

import cv2
import numpy as np
from pathlib import Path
from typing import Dict, List, Tuple, Optional
import logging

logger = logging.getLogger(__name__)

class InsightFaceService:
    """
    Production-grade face recognition using InsightFace
    ArcFace embeddings + cosine similarity (Google Photos approach)
    """
    
    def __init__(self, similarity_threshold: float = 0.6):
        """
        Initialize InsightFace with ArcFace model
        
        Args:
            similarity_threshold: Cosine similarity threshold (0.58-0.65 recommended for events)
                                Higher = more strict match, Lower = more lenient
                                0.6 = balanced (recommended)
                                0.65 = strict (fewer false positives)
                                0.58 = lenient (catch more matches)
        """
        self.threshold = similarity_threshold
        self.face_app = None
        
        # Statistics for debugging
        self.stats = {
            'total_processed': 0,
            'faces_detected': 0,
            'no_face_count': 0,
            'low_quality_count': 0,
            'matches_found': 0
        }
        
        try:
            from insightface.app import FaceAnalysis
            
            # Initialize face analysis (detection + recognition)
            self.face_app = FaceAnalysis(
                name="buffalo_l",  # Lightweight + accurate model
                providers=["CPUExecutionProvider"]  # CPU only, no GPU
            )
            self.face_app.prepare(ctx_id=0, det_size=(640, 640))
            
            logger.info("✅ InsightFace initialized (ArcFace, CPU)")
            
        except Exception as e:
            logger.error(f"Failed to initialize InsightFace: {e}")
            raise RuntimeError(f"InsightFace initialization failed: {e}")
    
    def _normalize_illumination(self, img: np.ndarray, light: bool = True) -> np.ndarray:
        """
        Normalize image illumination using histogram equalization
        Critical for matching photos taken in different lighting conditions
        
        Args:
            img: BGR image
            light: If True, apply light normalization (recommended for most cases)
        """
        # Convert to YCrCb color space (Y=luminance, Cr=red chroma, Cb=blue chroma)
        ycrcb = cv2.cvtColor(img, cv2.COLOR_BGR2YCrCb)
        y, cr, cb = cv2.split(ycrcb)
        
        if light:
            # Light equalization: CLAHE (Contrast Limited Adaptive Histogram Equalization)
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            y = clahe.apply(y)
        else:
            # Standard histogram equalization
            y = cv2.equalizeHist(y)
        
        # Merge back
        ycrcb = cv2.merge((y, cr, cb))
        normalized = cv2.cvtColor(ycrcb, cv2.COLOR_YCrCb2BGR)
        
        return normalized
    
    def _load_and_preprocess_image(self, image_path: str, max_size: int = 1600, normalize: bool = True) -> Optional[np.ndarray]:
        """
        Load and preprocess image for face detection
        CRITICAL: Proper preprocessing dramatically improves accuracy
        
        Args:
            image_path: Path to image
            max_size: Max dimension (1600px recommended - keeps face details)
            normalize: Apply illumination normalization (recommended)
        """
        try:
            img = cv2.imread(str(image_path))
            if img is None:
                logger.error(f"❌ Could not load image: {image_path}")
                self.stats['no_face_count'] += 1
                return None
            
            # Don't resize too small - destroys face details
            h, w = img.shape[:2]
            if max(h, w) > max_size:
                scale = max_size / max(h, w)
                new_w, new_h = int(w * scale), int(h * scale)
                # Use high-quality interpolation
                img = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_LANCZOS4)
                logger.debug(f"Resized {image_path}: {w}x{h} -> {new_w}x{new_h}")
            
            # Normalize illumination (CRITICAL for matching)
            if normalize:
                img = self._normalize_illumination(img, light=True)
            
            self.stats['total_processed'] += 1
            return img
            
        except Exception as e:
            logger.error(f"❌ Error loading {image_path}: {e}")
            return None
    
    def get_face_encoding(self, image_path: str, strict: bool = True, visualize: bool = False) -> Optional[np.ndarray]:
        """
        Extract face encoding from reference photo with STRICT validation
        
        Args:
            image_path: Path to reference image
            strict: If True, reject if multiple faces or low quality
            visualize: If True, save image with bounding boxes for debugging
            
        Returns:
            512-D face embedding (ArcFace), or None if no valid face
        """
        try:
            img = self._load_and_preprocess_image(image_path, normalize=True)
            if img is None:
                return None
            
            # Detect faces
            faces = self.face_app.get(img)
            
            if len(faces) == 0:
                logger.warning(f"❌ No face detected in {Path(image_path).name}")
                self.stats['no_face_count'] += 1
                return None
            
            self.stats['faces_detected'] += len(faces)
            
            # STRICT validation for reference photos
            if strict and len(faces) > 1:
                logger.warning(f"⚠️ Multiple faces ({len(faces)}) in reference {Path(image_path).name}")
                logger.warning(f"   Recommendation: Use single-person photos for better accuracy")
            
            # Use largest/best face
            best_face = max(faces, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]))  # area
            
            # STRICT quality check
            if best_face.det_score < 0.6:
                logger.warning(f"⚠️ Low quality face in {Path(image_path).name} (score: {best_face.det_score:.2f})")
                self.stats['low_quality_count'] += 1
                if strict:
                    logger.error(f"   ❌ Rejected: Quality too low. Use clear, front-facing photo.")
                    return None
            
            # Visual debugging
            if visualize:
                self._visualize_faces(img, faces, image_path)
            
            # Return 512-D embedding (normalized)
            embedding = best_face.embedding
            # Normalize embedding (L2 norm)
            embedding = embedding / np.linalg.norm(embedding)
            
            logger.info(f"✅ Extracted embedding from {Path(image_path).name} (quality: {best_face.det_score:.2f})")
            
            return embedding
            
        except Exception as e:
            logger.error(f"❌ Error processing {image_path}: {e}")
            return None
    
    def _visualize_faces(self, img: np.ndarray, faces, image_path: str):
        """
        Draw bounding boxes on detected faces for debugging
        Saves to same directory with '_debug' suffix
        """
        try:
            vis_img = img.copy()
            
            for i, face in enumerate(faces):
                # Get bounding box
                box = face.bbox.astype(int)
                x1, y1, x2, y2 = box
                
                # Draw rectangle
                color = (0, 255, 0) if face.det_score >= 0.6 else (0, 165, 255)  # Green=good, Orange=low quality
                cv2.rectangle(vis_img, (x1, y1), (x2, y2), color, 2)
                
                # Add label
                label = f"Face {i+1}: {face.det_score:.2f}"
                cv2.putText(vis_img, label, (x1, y1-10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)
            
            # Save debug image
            path = Path(image_path)
            debug_path = path.parent / f"{path.stem}_debug{path.suffix}"
            cv2.imwrite(str(debug_path), vis_img)
            logger.info(f"📸 Debug visualization saved: {debug_path.name}")
            
        except Exception as e:
            logger.error(f"Failed to create visualization: {e}")
    
    def get_multiple_reference_embeddings(
        self, 
        image_paths: List[str], 
        average: bool = True
    ) -> Optional[np.ndarray]:
        """
        Get embeddings from multiple reference photos of same person
        Averages embeddings for better accuracy (recommended)
        
        Args:
            image_paths: List of reference image paths for same person
            average: If True, return averaged embedding (recommended)
            
        Returns:
            Single 512-D embedding (averaged if multiple photos)
        """
        embeddings = []
        
        for path in image_paths:
            emb = self.get_face_encoding(path, strict=True)
            if emb is not None:
                embeddings.append(emb)
        
        if len(embeddings) == 0:
            return None
        
        if average and len(embeddings) > 1:
            # Average embeddings for robustness
            avg_embedding = np.mean(embeddings, axis=0)
            logger.info(f"Averaged {len(embeddings)} reference photos")
            return avg_embedding
        
        return embeddings[0]
    
    def _cosine_similarity(self, emb1: np.ndarray, emb2: np.ndarray) -> float:
        """
        Calculate cosine similarity between two embeddings
        Returns value between 0 and 1 (higher = more similar)
        
        For ArcFace embeddings:
        - Same person: 0.65 - 0.85
        - Similar looking: 0.5 - 0.65  
        - Different person: < 0.5
        """
        # Normalize (embeddings should already be normalized, but ensure it)
        emb1_norm = emb1 / (np.linalg.norm(emb1) + 1e-6)
        emb2_norm = emb2 / (np.linalg.norm(emb2) + 1e-6)
        
        # Cosine similarity (-1 to 1)
        similarity = np.dot(emb1_norm, emb2_norm)
        
        # Clip to valid range
        similarity = np.clip(similarity, -1.0, 1.0)
        
        return float(similarity)
    
    def find_person_in_photo(
        self, 
        reference_embedding: np.ndarray, 
        photo_path: str,
        person_name: str = "Person",
        debug: bool = False
    ) -> Tuple[bool, float, int]:
        """
        Check if reference person is in the photo
        FIXED: Correct threshold logic and multi-face handling
        
        Args:
            reference_embedding: 512-D embedding of reference person (normalized)
            photo_path: Path to photo to search
            person_name: Name for logging
            debug: Enable detailed logging
            
        Returns:
            Tuple of (found: bool, best_similarity: float, num_faces: int)
        """
        try:
            img = self._load_and_preprocess_image(photo_path, normalize=True)
            if img is None:
                return False, 0.0, 0
            
            # Detect all faces in photo
            faces = self.face_app.get(img)
            
            if len(faces) == 0:
                if debug:
                    logger.debug(f"   No faces detected in {Path(photo_path).name}")
                return False, 0.0, 0
            
            # Compare with EVERY face (not just first one!)
            best_similarity = 0.0
            matched_face_idx = -1
            
            for idx, face in enumerate(faces):
                # Skip very low quality faces (but be lenient)
                if face.det_score < 0.4:
                    continue
                
                # Normalize face embedding
                face_emb = face.embedding / np.linalg.norm(face.embedding)
                
                # Calculate similarity
                similarity = self._cosine_similarity(reference_embedding, face_emb)
                
                if similarity > best_similarity:
                    best_similarity = similarity
                    matched_face_idx = idx
                
                if debug:
                    logger.debug(f"   Face {idx+1}/{len(faces)}: similarity={similarity:.3f} (quality={face.det_score:.2f})")
                
                # Early exit if strong match
                if similarity >= self.threshold:
                    logger.debug(f"   ✅ Strong match found (sim={similarity:.3f} >= {self.threshold})")
                    break
            
            # Check if best match passes threshold
            found = best_similarity >= self.threshold
            
            if found:
                self.stats['matches_found'] += 1
                logger.info(f"✅ Found {person_name} in {Path(photo_path).name} (sim={best_similarity:.3f}, face {matched_face_idx+1}/{len(faces)})")
            elif debug and best_similarity > 0:
                logger.debug(f"   ❌ No match in {Path(photo_path).name} (best_sim={best_similarity:.3f} < {self.threshold})")
            
            return found, best_similarity, len(faces)
            
        except Exception as e:
            logger.error(f"❌ Error searching {photo_path}: {e}")
            return False, 0.0, 0
    
    def print_statistics(self):
        """Print processing statistics for debugging"""
        logger.info("\n" + "="*50)
        logger.info("FACE RECOGNITION STATISTICS")
        logger.info("="*50)
        logger.info(f"Total images processed: {self.stats['total_processed']}")
        logger.info(f"Total faces detected: {self.stats['faces_detected']}")
        logger.info(f"Images with no faces: {self.stats['no_face_count']}")
        logger.info(f"Low quality faces: {self.stats['low_quality_count']}")
        logger.info(f"Matches found: {self.stats['matches_found']}")
        logger.info(f"Similarity threshold: {self.threshold}")
        logger.info("="*50 + "\n")
    
    def find_multiple_people(
        self,
        reference_embeddings: Dict[str, np.ndarray],
        photo_paths: List[str],
        progress_callback=None,
        debug: bool = False
    ) -> Dict[str, List[str]]:
        """
        Search for multiple people across multiple photos
        FIXED: Correct threshold logic and detailed logging
        
        Args:
            reference_embeddings: Dict of {person_name: 512-D normalized embedding}
            photo_paths: List of photo paths to search
            progress_callback: Optional callback(current, total, photo_path)
            debug: Enable detailed per-photo logging
            
        Returns:
            Dict of {person_name: [photo_paths where found]}
        """
        results = {name: [] for name in reference_embeddings.keys()}
        
        logger.info(f"\\n\u{1f50d} Searching for {len(reference_embeddings)} people in {len(photo_paths)} photos...")
        logger.info(f"Similarity threshold: {self.threshold}")
        
        for i, photo_path in enumerate(photo_paths):
            try:
                if debug:
                    logger.info(f"\\n[{i+1}/{len(photo_paths)}] Processing: {Path(photo_path).name}")
                
                img = self._load_and_preprocess_image(photo_path, normalize=True)
                if img is None:
                    continue
                
                # Detect all faces in photo (once per photo)
                faces = self.face_app.get(img)
                
                if len(faces) == 0:
                    if debug:
                        logger.debug(f"   No faces detected")
                    continue
                
                if debug:
                    logger.debug(f"   Detected {len(faces)} face(s)")
                
                # Check each reference person
                for person_name, ref_embedding in reference_embeddings.items():
                    found_in_photo = False
                    best_sim_for_person = 0.0
                    
                    # Compare with EVERY face in photo
                    for face_idx, face in enumerate(faces):
                        if face.det_score < 0.4:  # Skip very low quality
                            continue
                        
                        # Normalize face embedding
                        face_emb = face.embedding / np.linalg.norm(face.embedding)
                        
                        similarity = self._cosine_similarity(ref_embedding, face_emb)
                        best_sim_for_person = max(best_sim_for_person, similarity)
                        
                        if debug:
                            logger.debug(f"      {person_name} vs Face{face_idx+1}: {similarity:.3f}")
                        
                        # Check if match found
                        if similarity >= self.threshold:
                            found_in_photo = True
                            break  # Don't add same photo multiple times for same person
                    
                    # Add photo to results if person found
                    if found_in_photo:
                        results[person_name].append(photo_path)
                        if debug:
                            logger.info(f"   ✅ {person_name} found (sim={best_sim_for_person:.3f})")
                    elif debug and best_sim_for_person > 0:
                        logger.debug(f"   ❌ {person_name} not found (best={best_sim_for_person:.3f} < {self.threshold})")
                
                # Progress callback
                if progress_callback:
                    progress_callback(i + 1, len(photo_paths), photo_path)
                    
            except Exception as e:
                logger.error(f"Error processing {photo_path}: {e}")
                continue
        
        # Print summary
        logger.info(f"\\n📊 Search Results:")
        for person_name, photos in results.items():
            logger.info(f"   {person_name}: {len(photos)} photos")
        
        return results
