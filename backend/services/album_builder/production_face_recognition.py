"""
Production-grade face recognition following Google Photos architecture:
1. MediaPipe for fast face detection
2. ArcFace ONNX for embeddings (512-D)
3. Strict reference validation
4. Face quality filtering
5. Cosine similarity matching

This is the CORRECT implementation from the roadmap.
"""

# Suppress TensorFlow warnings before importing MediaPipe
import os
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'  # Suppress TensorFlow INFO/WARNING messages
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'  # Disable oneDNN warnings

import cv2
import numpy as np
import onnxruntime as ort
from pathlib import Path
from typing import Dict, List, Tuple, Optional
import logging
import urllib.request
from sklearn.metrics.pairwise import cosine_similarity

try:
    import mediapipe as mp
    MEDIAPIPE_AVAILABLE = True
except:
    MEDIAPIPE_AVAILABLE = False

logger = logging.getLogger(__name__)

class ProductionFaceRecognition:
    """
    Production-grade face recognition (Google Photos approach)
    - MediaPipe face detection (fast + accurate)
    - ArcFace embeddings (512-D ONNX)
    - Reference validation
    - Quality filtering
    """
    
    def __init__(self, tolerance: float = 0.38):
        """
        Initialize face recognition
        
        Args:
            tolerance: Distance threshold (0.35-0.4 for events, 0.38 recommended)
        """
        self.tolerance = tolerance
        self.model_dir = Path(__file__).parent.parent.parent / 'models'
        self.model_dir.mkdir(exist_ok=True)
        
        # Initialize MediaPipe face detection (or fallback to Haar)
        if MEDIAPIPE_AVAILABLE:
            try:
                self.mp_face = mp.solutions.face_detection.FaceDetection(
                    model_selection=1,
                    min_detection_confidence=0.6
                )
                self.use_mediapipe = True
                logger.info("✅ Using MediaPipe face detection")
            except:
                self.use_mediapipe = False
                self._init_haar_fallback()
        else:
            self.use_mediapipe = False
            self._init_haar_fallback()
        
        # Initialize ArcFace ONNX model
        self._init_arcface()
        
        logger.info("✅ Production face recognition initialized")
    
    def _init_haar_fallback(self):
        """Initialize Haar Cascade as fallback"""
        cascade_file = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        self.face_cascade = cv2.CascadeClassifier(cascade_file)
        logger.info("Using Haar Cascade (MediaPipe not available)")
    
    def _init_arcface(self):
        """Initialize ArcFace ONNX model"""
        model_file = self.model_dir / 'arcface.onnx'
        
        if not model_file.exists():
            logger.info("Downloading ArcFace model (~100MB)...")
            try:
                url = 'https://github.com/onnx/models/raw/main/validated/vision/body_analysis/arcface/model/arcfaceresnet100-8.onnx'
                urllib.request.urlretrieve(url, str(model_file))
                logger.info("✅ ArcFace model downloaded")
            except Exception as e:
                logger.error(f"Could not download model: {e}")
                self.session = None
                return
        
        try:
            self.session = ort.InferenceSession(str(model_file), providers=['CPUExecutionProvider'])
            logger.info("✅ ArcFace ONNX loaded")
        except Exception as e:
            logger.error(f"Could not load ONNX: {e}")
            self.session = None
    
    def _detect_faces_mediapipe(self, image: np.ndarray) -> List[Tuple[int, int, int, int, float]]:
        """
        Detect faces using MediaPipe or Haar fallback
        Returns: [(x, y, w, h, confidence), ...]
        """
        if self.use_mediapipe:
            return self._detect_faces_mediapipe_impl(image)
        else:
            return self._detect_faces_haar(image)
    
    def _detect_faces_mediapipe_impl(self, image: np.ndarray) -> List[Tuple[int, int, int, int, float]]:
        """MediaPipe implementation"""
        try:
            rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            results = self.mp_face.process(rgb)
            
            if not results.detections:
                return []
            
            h, w = image.shape[:2]
            faces = []
            
            for detection in results.detections:
                bbox = detection.location_data.relative_bounding_box
                x = int(bbox.xmin * w)
                y = int(bbox.ymin * h)
                width = int(bbox.width * w)
                height = int(bbox.height * h)
                confidence = detection.score[0]
                
                # Ensure bbox is within image
                x = max(0, x)
                y = max(0, y)
                width = min(width, w - x)
                height = min(height, h - y)
                
                faces.append((x, y, width, height, confidence))
            
            return faces
        except Exception as e:
            logger.error(f"MediaPipe error: {e}")
            return []
    
    def _detect_faces_haar(self, image: np.ndarray) -> List[Tuple[int, int, int, int, float]]:
        """Haar Cascade fallback"""
        try:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) == 3 else image
            faces = self.face_cascade.detectMultiScale(gray, 1.1, 5, minSize=(30, 30))
            
            # Convert to same format as MediaPipe (x, y, w, h, confidence)
            return [(int(x), int(y), int(w), int(h), 0.8) for x, y, w, h in faces]
        except Exception as e:
            logger.error(f"Haar error: {e}")
            return []
    
    def _align_face(self, image: np.ndarray, bbox: Tuple[int, int, int, int]) -> np.ndarray:
        """
        Align face to standard orientation
        Simple cropping + margin for now (proper alignment needs landmarks)
        """
        x, y, w, h = bbox
        
        # Add 20% margin
        margin_x = int(w * 0.2)
        margin_y = int(h * 0.2)
        
        x1 = max(0, x - margin_x)
        y1 = max(0, y - margin_y)
        x2 = min(image.shape[1], x + w + margin_x)
        y2 = min(image.shape[0], y + h + margin_y)
        
        face = image[y1:y2, x1:x2]
        return face
    
    def _preprocess_face_for_arcface(self, face: np.ndarray) -> np.ndarray:
        """
        Preprocess face for ArcFace model input
        Input: 112x112, normalized to [-1, 1], CHW format
        """
        # Resize to 112x112 (ArcFace input size)
        face = cv2.resize(face, (112, 112))
        
        # Normalize to [-1, 1]
        face = face.astype(np.float32) / 255.0
        face = (face - 0.5) / 0.5
        
        # Convert BGR to RGB
        face = cv2.cvtColor(face, cv2.COLOR_BGR2RGB)
        
        # Convert to CHW format (channels first)
        face = np.transpose(face, (2, 0, 1))
        
        # Add batch dimension
        face = np.expand_dims(face, axis=0)
        
        return face
    
    def _get_embedding(self, face: np.ndarray) -> Optional[np.ndarray]:
        """Get 512-D ArcFace embedding"""
        if self.session is None:
            return None
        
        try:
            face_preprocessed = self._preprocess_face_for_arcface(face)
            input_name = self.session.get_inputs()[0].name
            embedding = self.session.run(None, {input_name: face_preprocessed})[0]
            return embedding.flatten()
        except Exception as e:
            logger.error(f"Embedding error: {e}")
            return None
    
    def _is_face_quality_good(self, face: np.ndarray, confidence: float) -> bool:
        """
        Check if face quality is good enough
        - Confidence > 0.4 (relaxed from 0.6)
        - Size > 40x40 (relaxed from 50x50)
        - Not too blurry (Laplacian variance > 50, relaxed from 100)
        """
        if confidence < 0.4:
            logger.warning(f"Low confidence: {confidence:.2f} < 0.4")
            return False
        
        h, w = face.shape[:2]
        if h < 40 or w < 40:
            logger.warning(f"Face too small: {w}x{h} < 40x40")
            return False
        
        # Blur detection (Laplacian variance)
        gray = cv2.cvtColor(face, cv2.COLOR_BGR2GRAY) if len(face.shape) == 3 else face
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        
        if laplacian_var < 50:  # Relaxed threshold
            logger.warning(f"Too blurry: variance {laplacian_var:.1f} < 50")
            return False
        if laplacian_var < 100:  # Too blurry
            logger.debug(f"Face too blurry (var={laplacian_var:.1f})")
            return False
        
        return True
    
    def get_face_encoding(self, image_path: str, strict_validation: bool = True) -> Optional[np.ndarray]:
        """
        Extract face embedding from image
        
        Args:
            image_path: Path to image
            strict_validation: If True, reject multi-face/blurry images (for references)
            
        Returns:
            512-D embedding or None
        """
        try:
            img = cv2.imread(str(image_path))
            if img is None:
                logger.error(f"❌ Could not load image: {image_path}")
                return None
            
            # Resize if too large (speed optimization)
            max_dim = 1600
            h, w = img.shape[:2]
            if max(h, w) > max_dim:
                scale = max_dim / max(h, w)
                img = cv2.resize(img, (int(w * scale), int(h * scale)))
            
            logger.info(f"🔍 Processing reference: {image_path} ({w}x{h})")
            
            # Detect faces
            faces = self._detect_faces_mediapipe(img)
            
            if len(faces) == 0:
                logger.error(f"❌ No face detected in {image_path}. Try a clearer photo with visible face.")
                return None
            
            logger.info(f"✅ Detected {len(faces)} face(s) in reference photo")
            
            # Strict validation for reference photos
            if strict_validation:
                if len(faces) > 1:
                    logger.error(f"❌ Multiple faces ({len(faces)}) in reference photo: {image_path}. Use photo with ONLY ONE person.")
                    return None
            
            # Use largest/most confident face
            face_data = max(faces, key=lambda f: f[2] * f[3] * f[4])  # area * confidence
            x, y, w, h, confidence = face_data
            
            logger.info(f"📏 Face size: {w}x{h}, confidence: {confidence:.2f}")
            
            # Extract and align face
            face = self._align_face(img, (x, y, w, h))
            
            # Quality check
            if not self._is_face_quality_good(face, confidence):
                logger.error(f"❌ Low quality face in {image_path} - Photo is too blurry, dark, or face too small (<50px). Use a clear, well-lit photo.")
                return None
            
            logger.info(f"✅ Reference face passed quality check")
            # Get embedding
            embedding = self._get_embedding(face)
            
            if embedding is not None:
                logger.debug(f"✅ Got embedding from {image_path}")
            
            return embedding
            
        except Exception as e:
            logger.error(f"Error processing {image_path}: {e}")
            return None
    
    def extract_face_embedding(self, image_path: str) -> Optional[np.ndarray]:
        """Alias for compatibility"""
        return self.get_face_encoding(image_path, strict_validation=False)
    
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
            
            # Detect all faces
            faces = self._detect_faces_mediapipe(img)
            
            if len(faces) == 0:
                return False, 0.0
            
            # Check each face
            best_similarity = 0.0
            for face_data in faces:
                x, y, w, h, confidence = face_data
                
                # Skip low confidence faces
                if confidence < 0.5:
                    continue
                
                # Extract face
                face = self._align_face(img, (x, y, w, h))
                
                # Get embedding
                embedding = self._get_embedding(face)
                if embedding is None:
                    continue
                
                # Calculate similarity
                similarity = cosine_similarity([reference_encoding], [embedding])[0][0]
                best_similarity = max(best_similarity, similarity)
                
                # Early exit if good match
                if similarity > (1 - self.tolerance):
                    return True, similarity
            
            found = best_similarity > (1 - self.tolerance)
            return found, best_similarity
            
        except Exception as e:
            logger.error(f"Error searching {photo_path}: {e}")
            return False, 0.0
    
    def find_multiple_people(
        self,
        reference_encodings: Dict[str, np.ndarray],
        photo_paths: List[str],
        progress_callback=None
    ) -> Dict[str, List[str]]:
        """
        Search for multiple people across photos
        
        Returns:
            {person_name: [photo_paths where found]}
        """
        results = {name: [] for name in reference_encodings.keys()}
        
        for i, photo_path in enumerate(photo_paths):
            try:
                # Read image once
                img = cv2.imread(str(photo_path))
                if img is None:
                    continue
                
                # Resize for speed
                max_dim = 1600
                h, w = img.shape[:2]
                if max(h, w) > max_dim:
                    scale = max_dim / max(h, w)
                    img = cv2.resize(img, (int(w * scale), int(h * scale)))
                
                # Detect all faces once
                faces = self._detect_faces_mediapipe(img)
                
                if len(faces) == 0:
                    continue
                
                # Extract embeddings for all faces in photo
                face_embeddings = []
                for face_data in faces:
                    x, y, w, h, confidence = face_data
                    if confidence < 0.5:
                        continue
                    
                    face = self._align_face(img, (x, y, w, h))
                    embedding = self._get_embedding(face)
                    if embedding is not None:
                        face_embeddings.append(embedding)
                
                # Match each reference person against all faces
                for person_name, ref_encoding in reference_encodings.items():
                    found = False
                    for face_emb in face_embeddings:
                        similarity = cosine_similarity([ref_encoding], [face_emb])[0][0]
                        if similarity > (1 - self.tolerance):
                            results[person_name].append(photo_path)
                            logger.debug(f"Found {person_name} in {photo_path} (sim: {similarity:.2f})")
                            found = True
                            break
                    if found:
                        continue
                
                if progress_callback:
                    progress_callback(i + 1, len(photo_paths), photo_path)
                    
            except Exception as e:
                logger.error(f"Error processing {photo_path}: {e}")
                continue
        
        return results
