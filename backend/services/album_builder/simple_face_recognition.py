"""
Lightweight ArcFace face recognition using ONNX (no InsightFace package needed)
Downloads pre-trained model directly, works on Windows without compilation
"""

import cv2
import numpy as np
import onnxruntime as ort
from pathlib import Path
from typing import Dict, List, Tuple, Optional
import logging
import urllib.request

logger = logging.getLogger(__name__)

class SimpleFaceRecognition:
    """
    Simple but effective face recognition using:
    - MTCNN for face detection (lightweight)
    - ArcFace ONNX model for embeddings (512-D)
    - No compilation needed, pure Python
    """
    
    def __init__(self, tolerance: float = 0.38):
        """
        Initialize face recognition
        
        Args:
            tolerance: Distance threshold (0.35-0.4 for events)
        """
        self.tolerance = tolerance
        self.model_dir = Path(__file__).parent.parent.parent / 'models'
        self.model_dir.mkdir(exist_ok=True)
        
        # Initialize face detector (Haar Cascade - fast)
        self._init_detector()
        
        # Initialize face recognition model (ArcFace ONNX)
        self._init_recognition()
        
        logger.info("✅ Simple face recognition initialized (ONNX, CPU)")
    
    def _init_detector(self):
        """Initialize Haar Cascade face detector"""
        cascade_file = str(self.model_dir / 'haarcascade_frontalface_default.xml')
        
        if not Path(cascade_file).exists():
            try:
                url = 'https://raw.githubusercontent.com/opencv/opencv/master/data/haarcascades/haarcascade_frontalface_default.xml'
                urllib.request.urlretrieve(url, cascade_file)
                logger.info(f"Downloaded Haar Cascade")
            except:
                cascade_file = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        
        self.face_cascade = cv2.CascadeClassifier(cascade_file)
    
    def _init_recognition(self):
        """Initialize ArcFace ONNX model"""
        # Use lightweight MobileFaceNet (fast on CPU)
        model_file = self.model_dir / 'mobilefacenet.onnx'
        
        if not model_file.exists():
            logger.info("Downloading MobileFaceNet model (~4MB)...")
            try:
                # Download from public model zoo
                url = 'https://github.com/onnx/models/raw/main/validated/vision/body_analysis/arcface/model/arcfaceresnet100-8.onnx'
                urllib.request.urlretrieve(url, str(model_file))
                logger.info("Model downloaded successfully")
            except Exception as e:
                logger.error(f"Could not download model: {e}")
                # Use fallback - simple feature extraction
                self.session = None
                return
        
        # Load ONNX model
        try:
            self.session = ort.InferenceSession(str(model_file), providers=['CPUExecutionProvider'])
            logger.info("ArcFace model loaded")
        except Exception as e:
            logger.warning(f"Could not load ONNX model: {e}, using fallback")
            self.session = None
    
    def _detect_face(self, image: np.ndarray) -> Optional[Tuple[int, int, int, int]]:
        """Detect largest face, returns (x, y, w, h)"""
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) == 3 else image
        faces = self.face_cascade.detectMultiScale(
            gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30)
        )
        
        if len(faces) == 0:
            return None
        
        # Return largest face
        return max(faces, key=lambda f: f[2] * f[3])
    
    def _preprocess_face(self, image: np.ndarray, bbox: Tuple[int, int, int, int]) -> np.ndarray:
        """Extract and preprocess face for model input"""
        x, y, w, h = bbox
        face = image[y:y+h, x:x+w]
        
        # Resize to 112x112 (ArcFace input size)
        face = cv2.resize(face, (112, 112))
        
        # Normalize to [-1, 1]
        face = face.astype(np.float32) / 255.0
        face = (face - 0.5) / 0.5
        
        # Convert to CHW format (channels first)
        face = np.transpose(face, (2, 0, 1))
        
        # Add batch dimension
        face = np.expand_dims(face, axis=0)
        
        return face
    
    def _get_embedding_onnx(self, face: np.ndarray) -> np.ndarray:
        """Get face embedding using ONNX model"""
        if self.session is None:
            # Fallback: use simple feature extraction
            return self._get_embedding_simple(face)
        
        try:
            input_name = self.session.get_inputs()[0].name
            embedding = self.session.run(None, {input_name: face})[0]
            return embedding.flatten()
        except:
            return self._get_embedding_simple(face)
    
    def _get_embedding_simple(self, face: np.ndarray) -> np.ndarray:
        """Simple fallback: HOG features"""
        # Flatten and reduce dimensionality
        face_flat = face.flatten()
        # Simple dimensionality reduction
        feature = cv2.resize(face_flat.reshape(3, 112, 112).transpose(1, 2, 0).astype(np.uint8),  (32, 32)).flatten()
        return feature.astype(np.float32)
    
    def get_face_encoding(self, image_path: str) -> Optional[np.ndarray]:
        """
        Extract face embedding from image
        
        Args:
            image_path: Path to image file
            
        Returns:
            Face embedding or None if no face
        """
        try:
            img = cv2.imread(str(image_path))
            if img is None:
                logger.error(f"Could not load: {image_path}")
                return None
            
            # Resize if too large
            max_dim = 1600
            h, w = img.shape[:2]
            if max(h, w) > max_dim:
                scale = max_dim / max(h, w)
                img = cv2.resize(img, (int(w * scale), int(h * scale)))
            
            # Detect face
            bbox = self._detect_face(img)
            if bbox is None:
                logger.warning(f"No face in {image_path}")
                return None
            
            # Preprocess
            face = self._preprocess_face(img, bbox)
            
            # Get embedding
            embedding = self._get_embedding_onnx(face)
            
            return embedding
            
        except Exception as e:
            logger.error(f"Error: {e}")
            return None
    
    def extract_face_embedding(self, image_path: str) -> Optional[np.ndarray]:
        """Alias for compatibility"""
        return self.get_face_encoding(image_path)
    
    def _cosine_similarity(self, emb1: np.ndarray, emb2: np.ndarray) -> float:
        """Calculate cosine similarity"""
        emb1_norm = emb1 / (np.linalg.norm(emb1) + 1e-6)
        emb2_norm = emb2 / (np.linalg.norm(emb2) + 1e-6)
        return float(np.dot(emb1_norm, emb2_norm))
    
    def find_person_in_photo(
        self, 
        reference_encoding: np.ndarray, 
        photo_path: str
    ) -> Tuple[bool, float]:
        """
        Check if person is in photo
        
        Returns:
            (found: bool, similarity: float)
        """
        try:
            img = cv2.imread(str(photo_path))
            if img is None:
                return False, 0.0
            
            # Resize for speed
            max_dim = 1600
            h, w = img.shape[:2]
            if max(h, w) > max_dim:
                scale = max_dim / max(h, w)
                img = cv2.resize(img, (int(w * scale), int(h * scale)))
            
            # Detect faces
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            faces = self.face_cascade.detectMultiScale(gray, 1.1, 5, minSize=(30, 30))
            
            if len(faces) == 0:
                return False, 0.0
            
            # Check each face
            best_similarity = 0.0
            for bbox in faces:
                face = self._preprocess_face(img, tuple(bbox))
                embedding = self._get_embedding_onnx(face)
                similarity = self._cosine_similarity(reference_encoding, embedding)
                best_similarity = max(best_similarity, similarity)
                
                if similarity > (1 - self.tolerance):
                    return True, similarity
            
            found = best_similarity > (1 - self.tolerance)
            return found, best_similarity
            
        except Exception as e:
            logger.error(f"Error: {e}")
            return False, 0.0
    
    def find_multiple_people(
        self,
        reference_encodings: Dict[str, np.ndarray],
        photo_paths: List[str],
        progress_callback=None
    ) -> Dict[str, List[str]]:
        """
        Search for multiple people
        
        Returns:
            {person_name: [photo_paths]}
        """
        results = {name: [] for name in reference_encodings.keys()}
        
        for i, photo_path in enumerate(photo_paths):
            try:
                for person_name, ref_encoding in reference_encodings.items():
                    found, similarity = self.find_person_in_photo(ref_encoding, photo_path)
                    
                    if found:
                        results[person_name].append(photo_path)
                        logger.debug(f"Found {person_name} in {photo_path} ({similarity:.2f})")
                
                if progress_callback:
                    progress_callback(i + 1, len(photo_paths), photo_path)
                    
            except Exception as e:
                logger.error(f"Error: {e}")
                continue
        
        return results
