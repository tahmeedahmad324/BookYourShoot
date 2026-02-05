"""
Face Recognition Service using DeepFace
Finds specific people in photos without training
"""

import os
import sys
import logging
from typing import List, Dict, Tuple, Optional
import numpy as np
from pathlib import Path

# Add Python 3.12 path for DeepFace
PYTHON312_PATH = r"C:\Users\hp\AppData\Local\Programs\Python\Python312\python.exe"

try:
    from deepface import DeepFace
    DEEPFACE_AVAILABLE = True
except ImportError:
    DEEPFACE_AVAILABLE = False
    print("⚠️ DeepFace not available. Install with Python 3.12: pip install deepface")

logger = logging.getLogger(__name__)


class FaceRecognitionService:
    """
    Face recognition service using DeepFace
    - No training needed
    - Works with any person's photo
    - Fast and accurate
    """
    
    def __init__(
        self,
        model_name: str = "Facenet512",
        detector_backend: str = "opencv",  # Changed from retinaface to opencv (much faster)
        distance_metric: str = "cosine",
        similarity_threshold: float = 0.4
    ):
        """
        Initialize face recognition service
        
        Args:
            model_name: Face recognition model (Facenet512, VGG-Face, ArcFace)
            detector_backend: Face detection backend (opencv, retinaface, ssd) 
            distance_metric: Distance metric (cosine, euclidean)
            similarity_threshold: Threshold for face matching (0-1, lower = stricter)
        """
        if not DEEPFACE_AVAILABLE:
            raise ImportError("DeepFace is not installed")
        
        self.model_name = model_name
        self.detector_backend = detector_backend
        self.distance_metric = distance_metric
        self.similarity_threshold = similarity_threshold
        
        logger.info(f"✅ Face Recognition Service initialized "
                   f"(model={model_name}, detector={detector_backend})")
    
    def get_face_encoding(self, image_path: str) -> Optional[np.ndarray]:
        """
        Extract face encoding (alias for extract_face_embedding for API consistency)
        """
        return self.extract_face_embedding(image_path)
    
    def extract_face_embedding(self, image_path: str) -> Optional[np.ndarray]:
        """
        Extract face embedding from image
        
        Args:
            image_path: Path to image file
            
        Returns:
            Face embedding vector or None if no face found
        """
        try:
            # Use DeepFace to extract embedding - fast opencv detector
            embedding_objs = DeepFace.represent(
                img_path=image_path,
                model_name=self.model_name,
                detector_backend="opencv",  # Force fast detector
                enforce_detection=True,
                align=False  # Skip alignment for speed
            )
            
            if embedding_objs and len(embedding_objs) > 0:
                # Return the first face's embedding
                return np.array(embedding_objs[0]["embedding"])
            
            logger.warning(f"No face detected in {os.path.basename(image_path)}")
            return None
        
        except Exception as e:
            logger.error(f"Error extracting embedding from {image_path}: {str(e)}")
            return None
    
    def find_person_in_photo(
        self,
        reference_embedding: np.ndarray,
        photo_path: str
    ) -> Tuple[bool, float, Optional[Dict]]:
        """
        Check if reference person appears in photo
        
        Args:
            reference_embedding: Face embedding of person to find
            photo_path: Path to photo to search
            
        Returns:
            Tuple of (found, similarity_score, face_details)
        """
        try:
            # Extract all faces from photo - use fast opencv detector
            faces = DeepFace.represent(
                img_path=photo_path,
                model_name=self.model_name,
                detector_backend="opencv",  # Force fast opencv detector
                enforce_detection=False,
                align=False  # Skip alignment for speed
            )
            
            if not faces:
                return False, 0.0, None
            
            # Compare reference with each face
            for face in faces:
                face_embedding = np.array(face["embedding"])
                
                # Calculate similarity
                if self.distance_metric == "cosine":
                    distance = self._cosine_distance(reference_embedding, face_embedding)
                else:
                    distance = self._euclidean_distance(reference_embedding, face_embedding)
                
                # Check if match
                if distance < self.similarity_threshold:
                    similarity_score = 1 - distance  # Convert to similarity (0-1)
                    
                    face_details = {
                        'facial_area': face.get('facial_area', {}),
                        'confidence': face.get('face_confidence', 0),
                        'similarity': round(similarity_score, 3),
                        'distance': round(distance, 3)
                    }
                    
                    return True, similarity_score, face_details
            
            return False, 0.0, None
        
        except Exception as e:
            logger.error(f"Error finding person in {photo_path}: {str(e)}")
            return False, 0.0, None
    
    def find_multiple_people(
        self,
        reference_embeddings: Dict[str, np.ndarray],
        photo_paths: List[str],
        progress_callback: Optional[callable] = None
    ) -> Dict[str, List[Dict]]:
        """
        Find multiple people in batch of photos
        
        Args:
            reference_embeddings: Dict of {person_name: embedding}
            photo_paths: List of photo paths to search
            progress_callback: Optional callback for progress updates
            
        Returns:
            Dict of {person_name: [list of matching photos with details]}
        """
        results = {person: [] for person in reference_embeddings.keys()}
        total_photos = len(photo_paths)
        
        for i, photo_path in enumerate(photo_paths, 1):
            try:
                # Check each person
                for person_name, reference_embedding in reference_embeddings.items():
                    found, similarity, face_details = self.find_person_in_photo(
                        reference_embedding, photo_path
                    )
                    
                    if found:
                        results[person_name].append({
                            'photo_path': photo_path,
                            'photo_name': os.path.basename(photo_path),
                            'similarity': similarity,
                            'face_details': face_details
                        })
                
                # Progress update
                if progress_callback:
                    progress_callback(i, total_photos, photo_path)
                
                if i % 10 == 0:
                    logger.info(f"Progress: {i}/{total_photos} photos processed")
            
            except Exception as e:
                logger.error(f"Error processing {photo_path}: {str(e)}")
                continue
        
        # Log summary
        for person, matches in results.items():
            logger.info(f"✅ Found {len(matches)} photos of {person}")
        
        return results
    
    @staticmethod
    def _cosine_distance(embedding1: np.ndarray, embedding2: np.ndarray) -> float:
        """Calculate cosine distance between two embeddings"""
        dot_product = np.dot(embedding1, embedding2)
        norm1 = np.linalg.norm(embedding1)
        norm2 = np.linalg.norm(embedding2)
        
        if norm1 == 0 or norm2 == 0:
            return 1.0
        
        cosine_similarity = dot_product / (norm1 * norm2)
        cosine_distance = 1 - cosine_similarity
        
        return max(0.0, min(1.0, cosine_distance))
    
    @staticmethod
    def _euclidean_distance(embedding1: np.ndarray, embedding2: np.ndarray) -> float:
        """Calculate Euclidean distance between two embeddings"""
        return float(np.linalg.norm(embedding1 - embedding2))
    
    def verify_faces(self, img1_path: str, img2_path: str) -> Dict:
        """
        Verify if two images contain the same person
        
        Args:
            img1_path: Path to first image
            img2_path: Path to second image
            
        Returns:
            Verification result with similarity score
        """
        try:
            result = DeepFace.verify(
                img1_path=img1_path,
                img2_path=img2_path,
                model_name=self.model_name,
                detector_backend=self.detector_backend,
                distance_metric=self.distance_metric
            )
            
            return {
                'verified': result['verified'],
                'distance': result['distance'],
                'threshold': result['threshold'],
                'similarity': 1 - result['distance'] if result['distance'] < 1 else 0
            }
        
        except Exception as e:
            logger.error(f"Error verifying faces: {str(e)}")
            return {
                'verified': False,
                'error': str(e)
            }


# Test function
def test_face_recognition():
    """Test face recognition with sample images"""
    if not DEEPFACE_AVAILABLE:
        print("❌ DeepFace not installed")
        return
    
    try:
        service = FaceRecognitionService()
        print("✅ Face Recognition Service initialized successfully")
        print(f"Model: {service.model_name}")
        print(f"Detector: {service.detector_backend}")
        print(f"Distance metric: {service.distance_metric}")
        print(f"Similarity threshold: {service.similarity_threshold}")
    except Exception as e:
        print(f"❌ Error initializing service: {str(e)}")


if __name__ == "__main__":
    test_face_recognition()
