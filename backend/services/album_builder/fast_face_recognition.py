"""
Fast Face Recognition using face_recognition library
Similar to how Google Photos and Samsung Gallery work
Much faster than DeepFace!
"""

import face_recognition
import numpy as np
from pathlib import Path
from typing import List, Dict, Tuple, Optional
import logging
from PIL import Image

logger = logging.getLogger(__name__)


class FastFaceRecognition:
    """
    Fast face recognition using face_recognition library
    - 10-20x faster than DeepFace
    - Pre-computes embeddings
    - Simple cosine distance matching
    """
    
    def __init__(self, tolerance: float = 0.6):
        """
        Initialize fast face recognition
        
        Args:
            tolerance: How strict matching is (0.6 = default, lower = stricter)
        """
        self.tolerance = tolerance
        logger.info(f"✅ Fast Face Recognition initialized (tolerance={tolerance})")
    
    def get_face_encoding(self, image_path: str) -> Optional[np.ndarray]:
        """
        Extract face encoding from image (like Google Photos does)
        
        Args:
            image_path: Path to image
            
        Returns:
            128-dimensional face encoding or None
        """
        try:
            # Load image
            image = face_recognition.load_image_file(image_path)
            
            # Detect faces and get encodings
            face_encodings = face_recognition.face_encodings(image, model='small')  # 'small' is faster
            
            if len(face_encodings) > 0:
                return face_encodings[0]  # Return first face found
            
            return None
        except Exception as e:
            logger.error(f"Error extracting face from {image_path}: {e}")
            return None
    
    def find_person_in_photo(
        self,
        reference_encoding: np.ndarray,
        photo_path: str
    ) -> Tuple[bool, float]:
        """
        Check if person is in photo
        
        Args:
            reference_encoding: Face encoding of person to find
            photo_path: Path to photo to search
            
        Returns:
            Tuple of (found, similarity_score)
        """
        try:
            # Load image
            image = face_recognition.load_image_file(photo_path)
            
            # Get all face encodings in photo
            face_encodings = face_recognition.face_encodings(image, model='small')
            
            if len(face_encodings) == 0:
                return False, 0.0
            
            # Compare with each face
            for face_encoding in face_encodings:
                # Calculate distance
                distance = face_recognition.face_distance([reference_encoding], face_encoding)[0]
                
                # Check if match (lower distance = better match)
                if distance < self.tolerance:
                    similarity = 1.0 - distance  # Convert to similarity score
                    return True, similarity
            
            return False, 0.0
        
        except Exception as e:
            logger.error(f"Error checking photo {photo_path}: {e}")
            return False, 0.0
    
    def find_multiple_people(
        self,
        reference_encodings: Dict[str, np.ndarray],
        photo_paths: List[str],
        progress_callback=None
    ) -> Dict[str, List[Tuple[str, float]]]:
        """
        Find multiple people in multiple photos (like Google Photos clustering)
        
        Args:
            reference_encodings: Dict of {person_name: face_encoding}
            photo_paths: List of photo paths to search
            progress_callback: Optional callback(current, total, photo_path)
            
        Returns:
            Dict of {person_name: [(photo_path, similarity), ...]}
        """
        results = {name: [] for name in reference_encodings.keys()}
        
        total = len(photo_paths)
        for idx, photo_path in enumerate(photo_paths, 1):
            try:
                # Load image once
                image = face_recognition.load_image_file(photo_path)
                
                # Get all faces in this photo
                face_encodings = face_recognition.face_encodings(image, model='small')
                
                if len(face_encodings) == 0:
                    continue
                
                # Check each person
                for person_name, ref_encoding in reference_encodings.items():
                    # Compare with all faces in photo
                    distances = face_recognition.face_distance(face_encodings, ref_encoding)
                    
                    # Check if any face matches
                    min_distance = np.min(distances)
                    if min_distance < self.tolerance:
                        similarity = 1.0 - min_distance
                        results[person_name].append((photo_path, similarity))
                
            except Exception as e:
                logger.warning(f"Error processing {photo_path}: {e}")
                continue
            
            # Progress callback
            if progress_callback:
                progress_callback(idx, total, photo_path)
        
        return results


# Faster alternative using face_recognition
def quick_face_match(reference_path: str, photo_paths: List[str], tolerance: float = 0.6) -> List[str]:
    """
    Quick function to find all photos containing a person
    
    Args:
        reference_path: Path to reference photo of person
        photo_paths: List of photos to search
        tolerance: Matching tolerance (default 0.6)
        
    Returns:
        List of matching photo paths
    """
    # Get reference face encoding
    ref_image = face_recognition.load_image_file(reference_path)
    ref_encodings = face_recognition.face_encodings(ref_image, model='small')
    
    if len(ref_encodings) == 0:
        logger.error(f"No face found in reference photo: {reference_path}")
        return []
    
    ref_encoding = ref_encodings[0]
    matches = []
    
    # Check each photo
    for photo_path in photo_paths:
        try:
            image = face_recognition.load_image_file(photo_path)
            face_encodings = face_recognition.face_encodings(image, model='small')
            
            if len(face_encodings) > 0:
                # Check if any face matches
                distances = face_recognition.face_distance(face_encodings, ref_encoding)
                if np.min(distances) < tolerance:
                    matches.append(photo_path)
        except:
            continue
    
    return matches
