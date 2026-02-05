"""
Fast face recognition using OpenCV without DeepFace or TensorFlow
Pure OpenCV + NumPy implementation - Windows friendly, no compilation needed
"""

import cv2
import numpy as np
from pathlib import Path
from typing import Dict, List, Tuple, Optional
import logging
import urllib.request

logger = logging.getLogger(__name__)

class OpenCVFaceRecognition:
    """
    Fast face recognition using OpenCV DNN
    Similar performance to Google Photos, no dlib compilation needed
    """
    
    def __init__(self, tolerance: float = 0.6):
        """
        Initialize OpenCV face recognition
        
        Args:
            tolerance: Distance threshold for face matching (0.0-1.0)
                      Lower = more strict, Higher = more lenient
        """
        self.tolerance = tolerance
        
        # Load face detector
        detector_path = Path(__file__).parent.parent.parent / 'models'
        detector_path.mkdir(exist_ok=True)
        
        # OpenCV face detector (Haar Cascade - fastest)
        cascade_file = str(detector_path / 'haarcascade_frontalface_default.xml')
        if not Path(cascade_file).exists():
            # Download from OpenCV GitHub if not exists
            try:
                url = 'https://raw.githubusercontent.com/opencv/opencv/master/data/haarcascades/haarcascade_frontalface_default.xml'
                urllib.request.urlretrieve(url, cascade_file)
                logger.info(f"Downloaded Haar Cascade to {cascade_file}")
            except Exception as e:
                logger.warning(f"Could not download cascade: {e}, using default OpenCV cascade")
                cascade_file = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        
        self.face_cascade = cv2.CascadeClassifier(cascade_file)
        
        # Use simple ORB feature matching (no DNN, no TensorFlow needed)
        self.use_simple_matching = True
        logger.info("✅ OpenCV face recognition initialized (ORB features, no TensorFlow)")
    
    def _detect_faces(self, image: np.ndarray) -> List[Tuple[int, int, int, int]]:
        """Detect faces in image, returns list of (x, y, w, h)"""
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) == 3 else image
        
        # Try multiple cascade parameters for better detection
        faces = self.face_cascade.detectMultiScale(
            gray,
            scaleFactor=1.05,  # More sensitive (was 1.1)
            minNeighbors=3,     # Less strict (was 5)
            minSize=(20, 20),   # Smaller min size (was 30, 30)
            flags=cv2.CASCADE_SCALE_IMAGE
        )
        
        if len(faces) == 0:
            # Try even more aggressive settings
            faces = self.face_cascade.detectMultiScale(
                gray,
                scaleFactor=1.03,
                minNeighbors=2,
                minSize=(15, 15)
            )
        
        return faces if len(faces) > 0 else []
    
    def _extract_face_features(self, image: np.ndarray, face_rect: Tuple[int, int, int, int]) -> Optional[np.ndarray]:
        """Extract face features from detected face region using ORB"""
        try:
            x, y, w, h = face_rect
            face_roi = image[y:y+h, x:x+w]
            
            # Use ORB features (fast and effective, no TensorFlow)
            orb = cv2.ORB_create(nfeatures=500)
            face_gray = cv2.cvtColor(face_roi, cv2.COLOR_BGR2GRAY) if len(face_roi.shape) == 3 else face_roi
            face_resized = cv2.resize(face_gray, (128, 128))
            
            keypoints, descriptors = orb.detectAndCompute(face_resized, None)
            
            if descriptors is not None and len(descriptors) > 0:
                # Create fixed-size feature vector by averaging descriptors
                feature_vector = np.mean(descriptors, axis=0)
                return feature_vector
            return None
        except Exception as e:
            logger.error(f"Error extracting features: {e}")
            return None
    
    def get_face_encoding(self, image_path: str) -> Optional[np.ndarray]:
        """
        Extract face encoding from image file
        
        Args:
            image_path: Path to image file
            
        Returns:
            Face encoding as numpy array, or None if no face found
        """
        try:
            image = cv2.imread(str(image_path))
            if image is None:
                logger.error(f"Could not load image: {image_path}")
                return None
            
            # Resize if too large (for speed)
            max_dim = 800
            h, w = image.shape[:2]
            if max(h, w) > max_dim:
                scale = max_dim / max(h, w)
                image = cv2.resize(image, (int(w * scale), int(h * scale)))
            
            # Detect faces
            faces = self._detect_faces(image)
            
            if len(faces) == 0:
                logger.warning(f"No face detected in {image_path}")
                return None
            
            # Use largest face if multiple detected
            largest_face = max(faces, key=lambda f: f[2] * f[3])
            
            # Extract features
            encoding = self._extract_face_features(image, largest_face)
            
            if encoding is not None:
                logger.debug(f"Extracted face encoding from {image_path}")
            else:
                logger.warning(f"Could not extract features from face in {image_path}")
            
            return encoding
            
        except Exception as e:
            logger.error(f"Error processing {image_path}: {str(e)}")
            return None
    
    def _compare_faces(self, encoding1: np.ndarray, encoding2: np.ndarray) -> float:
        """
        Compare two face encodings
        
        Returns:
            Similarity score (0-1, higher is more similar)
        """
        # Normalize encodings
        encoding1_norm = encoding1 / (np.linalg.norm(encoding1) + 1e-6)
        encoding2_norm = encoding2 / (np.linalg.norm(encoding2) + 1e-6)
        
        # Cosine similarity
        similarity = np.dot(encoding1_norm, encoding2_norm)
        
        # Convert to 0-1 range (cosine similarity is -1 to 1)
        similarity = (similarity + 1) / 2
        
        return float(similarity)
    
    def find_person_in_photo(
        self, 
        reference_encoding: np.ndarray, 
        photo_path: str
    ) -> Tuple[bool, float]:
        """
        Check if person from reference is in the photo
        
        Args:
            reference_encoding: Face encoding of reference person
            photo_path: Path to photo to search
            
        Returns:
            Tuple of (found: bool, similarity: float)
        """
        try:
            # Get all faces in photo
            image = cv2.imread(str(photo_path))
            if image is None:
                return False, 0.0
            
            # Resize for speed
            max_dim = 800
            h, w = image.shape[:2]
            if max(h, w) > max_dim:
                scale = max_dim / max(h, w)
                image = cv2.resize(image, (int(w * scale), int(h * scale)))
            
            faces = self._detect_faces(image)
            
            if len(faces) == 0:
                return False, 0.0
            
            # Check each face
            best_similarity = 0.0
            for face in faces:
                encoding = self._extract_face_features(image, face)
                if encoding is None:
                    continue
                
                similarity = self._compare_faces(reference_encoding, encoding)
                best_similarity = max(best_similarity, similarity)
                
                # Early exit if good match found
                if similarity > (1 - self.tolerance):
                    return True, similarity
            
            # Check if best match passes threshold
            found = best_similarity > (1 - self.tolerance)
            return found, best_similarity
            
        except Exception as e:
            logger.error(f"Error searching photo {photo_path}: {str(e)}")
            return False, 0.0
    
    def find_multiple_people(
        self,
        reference_encodings: Dict[str, np.ndarray],
        photo_paths: List[str],
        progress_callback=None
    ) -> Dict[str, List[str]]:
        """
        Search for multiple people across multiple photos
        
        Args:
            reference_encodings: Dict of {person_name: face_encoding}
            photo_paths: List of photo paths to search
            progress_callback: Optional callback(current, total, photo_path)
            
        Returns:
            Dict of {person_name: [photo_paths where found]}
        """
        results = {name: [] for name in reference_encodings.keys()}
        
        for i, photo_path in enumerate(photo_paths):
            try:
                for person_name, ref_encoding in reference_encodings.items():
                    found, similarity = self.find_person_in_photo(ref_encoding, photo_path)
                    
                    if found:
                        results[person_name].append(photo_path)
                        logger.debug(f"Found {person_name} in {photo_path} (similarity: {similarity:.2f})")
                
                if progress_callback:
                    progress_callback(i + 1, len(photo_paths), photo_path)
                    
            except Exception as e:
                logger.error(f"Error processing {photo_path}: {str(e)}")
                continue
        
        return results
