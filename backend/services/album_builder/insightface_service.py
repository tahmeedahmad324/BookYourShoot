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
    
    def __init__(self, similarity_threshold: float = 0.38):
        """
        Initialize InsightFace with ArcFace model
        
        Args:
            similarity_threshold: Distance threshold (0.35-0.4 recommended for events)
                                Lower = more strict, Higher = more lenient
        """
        self.threshold = similarity_threshold
        self.face_app = None
        
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
    
    def _load_and_preprocess_image(self, image_path: str, max_size: int = 1600) -> Optional[np.ndarray]:
        """
        Load and preprocess image for face detection
        Resize to max 1600px for speed without quality loss
        """
        try:
            img = cv2.imread(str(image_path))
            if img is None:
                logger.error(f"Could not load image: {image_path}")
                return None
            
            # Resize if too large (keeps quality for faces)
            h, w = img.shape[:2]
            if max(h, w) > max_size:
                scale = max_size / max(h, w)
                img = cv2.resize(img, (int(w * scale), int(h * scale)))
            
            return img
            
        except Exception as e:
            logger.error(f"Error loading {image_path}: {e}")
            return None
    
    def get_face_encoding(self, image_path: str, strict: bool = True) -> Optional[np.ndarray]:
        """
        Extract face encoding from reference photo
        
        Args:
            image_path: Path to reference image
            strict: If True, reject if multiple faces or low quality
            
        Returns:
            512-D face embedding (ArcFace), or None if no valid face
        """
        try:
            img = self._load_and_preprocess_image(image_path)
            if img is None:
                return None
            
            # Detect faces
            faces = self.face_app.get(img)
            
            if len(faces) == 0:
                logger.warning(f"No face detected in {image_path}")
                return None
            
            if strict and len(faces) > 1:
                logger.warning(f"Multiple faces in reference photo {image_path} - using largest")
            
            # Use largest/best face
            best_face = max(faces, key=lambda f: f.bbox[2] * f.bbox[3])  # area
            
            # Quality check
            if best_face.det_score < 0.6:
                logger.warning(f"Low quality face in {image_path} (score: {best_face.det_score:.2f})")
                if strict:
                    return None
            
            # Return 512-D embedding
            embedding = best_face.embedding
            logger.debug(f"Extracted embedding from {image_path} (score: {best_face.det_score:.2f})")
            
            return embedding
            
        except Exception as e:
            logger.error(f"Error processing {image_path}: {e}")
            return None
    
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
        """
        # Normalize
        emb1_norm = emb1 / (np.linalg.norm(emb1) + 1e-6)
        emb2_norm = emb2 / (np.linalg.norm(emb2) + 1e-6)
        
        # Cosine similarity
        similarity = np.dot(emb1_norm, emb2_norm)
        
        # Convert to 0-1 range
        similarity = (similarity + 1) / 2
        
        return float(similarity)
    
    def find_person_in_photo(
        self, 
        reference_embedding: np.ndarray, 
        photo_path: str
    ) -> Tuple[bool, float, int]:
        """
        Check if reference person is in the photo
        
        Args:
            reference_embedding: 512-D embedding of reference person
            photo_path: Path to photo to search
            
        Returns:
            Tuple of (found: bool, best_similarity: float, num_faces: int)
        """
        try:
            img = self._load_and_preprocess_image(photo_path)
            if img is None:
                return False, 0.0, 0
            
            # Detect all faces in photo
            faces = self.face_app.get(img)
            
            if len(faces) == 0:
                return False, 0.0, 0
            
            # Compare with each face
            best_similarity = 0.0
            for face in faces:
                # Skip low quality faces
                if face.det_score < 0.5:
                    continue
                
                similarity = self._cosine_similarity(reference_embedding, face.embedding)
                best_similarity = max(best_similarity, similarity)
                
                # Early exit if strong match
                if similarity > (1 - self.threshold):
                    return True, similarity, len(faces)
            
            # Check if best match passes threshold
            found = best_similarity > (1 - self.threshold)
            return found, best_similarity, len(faces)
            
        except Exception as e:
            logger.error(f"Error searching {photo_path}: {e}")
            return False, 0.0, 0
    
    def find_multiple_people(
        self,
        reference_embeddings: Dict[str, np.ndarray],
        photo_paths: List[str],
        progress_callback=None
    ) -> Dict[str, List[str]]:
        """
        Search for multiple people across multiple photos
        Optimized for batch processing
        
        Args:
            reference_embeddings: Dict of {person_name: 512-D embedding}
            photo_paths: List of photo paths to search
            progress_callback: Optional callback(current, total, photo_path)
            
        Returns:
            Dict of {person_name: [photo_paths where found]}
        """
        results = {name: [] for name in reference_embeddings.keys()}
        
        for i, photo_path in enumerate(photo_paths):
            try:
                img = self._load_and_preprocess_image(photo_path)
                if img is None:
                    continue
                
                # Detect all faces in photo (once per photo)
                faces = self.face_app.get(img)
                
                if len(faces) == 0:
                    continue
                
                # Check each reference person
                for person_name, ref_embedding in reference_embeddings.items():
                    # Compare with each face in photo
                    for face in faces:
                        if face.det_score < 0.5:
                            continue
                        
                        similarity = self._cosine_similarity(ref_embedding, face.embedding)
                        
                        if similarity > (1 - self.threshold):
                            results[person_name].append(photo_path)
                            logger.debug(f"Found {person_name} in {photo_path} (sim: {similarity:.2f})")
                            break  # Don't add same photo multiple times for same person
                
                # Progress callback
                if progress_callback:
                    progress_callback(i + 1, len(photo_paths), photo_path)
                    
            except Exception as e:
                logger.error(f"Error processing {photo_path}: {e}")
                continue
        
        return results
