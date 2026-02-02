"""
Face Recognition using ResNet-50 (Module 6)
Transfer learning approach for face embeddings and clustering
"""

import numpy as np
import cv2
import os
from typing import List, Tuple
import logging

logger = logging.getLogger(__name__)

# Optional imports - make ResNet optional to allow app to run without it
RESNET_AVAILABLE = False
try:
    # Try TensorFlow 2.x first (recommended)
    from tensorflow.keras.applications.resnet50 import ResNet50, preprocess_input
    from tensorflow.keras.preprocessing import image
    from tensorflow.keras.models import Model
    RESNET_AVAILABLE = True
except ImportError:
    try:
        # Fallback to standalone Keras (legacy)
        from keras.applications.resnet50 import ResNet50, preprocess_input
        from keras.preprocessing import image
        from keras.models import Model
        RESNET_AVAILABLE = True
    except ImportError:
        logger.warning("ResNet not available. Face recognition features will be disabled. Install tensorflow with: pip install tensorflow")
        # Create dummy classes to prevent import errors
        ResNet50 = None
        preprocess_input = None
        image = None
        Model = None

# Optional sklearn imports
try:
    from sklearn.cluster import DBSCAN
    from sklearn.preprocessing import normalize
    SKLEARN_AVAILABLE = True
except ImportError:
    logger.warning("sklearn not available. Install with: pip install scikit-learn")
    DBSCAN = None
    normalize = None
    SKLEARN_AVAILABLE = False
    if RESNET_AVAILABLE:
        RESNET_AVAILABLE = False  # ResNet needs sklearn to work

logger = logging.getLogger(__name__)


class ResNetFaceRecognizer:
    """
    Face recognition using ResNet-50 transfer learning
    Better for FYP: Shows deep learning knowledge
    """
    
    def __init__(self):
        if not RESNET_AVAILABLE:
            raise ImportError(
                "ResNet face recognition requires TensorFlow. "
                "Install it with: pip install tensorflow\n"
                "Or enable Windows Long Paths: https://pip.pypa.io/warnings/enable-long-paths"
            )
        
        # Load ResNet-50 pre-trained on ImageNet
        # Remove top layer to get feature embeddings
        base_model = ResNet50(weights='imagenet', include_top=False, pooling='avg')
        
        # Model outputs 2048-dimensional feature vector
        self.model = Model(inputs=base_model.input, outputs=base_model.output)
        
        # Load Haar Cascade for face detection (lightweight)
        cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        self.face_cascade = cv2.CascadeClassifier(cascade_path)
        
        logger.info("ResNet-50 face recognizer initialized")
    
    def detect_faces(self, img_path: str) -> List[Tuple[int, int, int, int]]:
        """
        Detect faces in image using Haar Cascade
        Returns: List of (x, y, w, h) bounding boxes
        """
        img = cv2.imread(img_path)
        if img is None:
            return []
        
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # Detect faces
        faces = self.face_cascade.detectMultiScale(
            gray,
            scaleFactor=1.1,
            minNeighbors=5,
            minSize=(30, 30)
        )
        
        return faces
    
    def extract_face_embedding(self, img_path: str, face_box: Tuple[int, int, int, int]) -> np.ndarray:
        """
        Extract ResNet-50 feature embedding from detected face
        Returns: 2048-dimensional feature vector
        """
        x, y, w, h = face_box
        
        # Load and crop face region
        img = cv2.imread(img_path)
        face_img = img[y:y+h, x:x+w]
        
        # Resize to 224x224 (ResNet-50 input size)
        face_img = cv2.resize(face_img, (224, 224))
        face_img = cv2.cvtColor(face_img, cv2.COLOR_BGR2RGB)
        
        # Preprocess for ResNet-50
        face_array = image.img_to_array(face_img)
        face_array = np.expand_dims(face_array, axis=0)
        face_array = preprocess_input(face_array)
        
        # Extract features
        embedding = self.model.predict(face_array, verbose=0)
        
        # Normalize (important for clustering)
        embedding = normalize(embedding, norm='l2')
        
        return embedding.flatten()
    
    def cluster_faces(self, embeddings: np.ndarray, eps: float = 0.5, min_samples: int = 3) -> np.ndarray:
        """
        Cluster face embeddings using DBSCAN
        
        Args:
            embeddings: Array of shape (n_faces, 2048)
            eps: DBSCAN epsilon parameter (distance threshold)
            min_samples: Minimum cluster size
            
        Returns:
            Cluster labels (-1 for outliers)
        """
        if len(embeddings) == 0:
            return np.array([])
        
        # DBSCAN clustering
        clustering = DBSCAN(eps=eps, min_samples=min_samples, metric='cosine')
        labels = clustering.fit_predict(embeddings)
        
        logger.info(f"Clustered {len(embeddings)} faces into {len(set(labels)) - (1 if -1 in labels else 0)} groups")
        
        return labels


class ResNetImageQualityScorer:
    """
    Image quality assessment using ResNet-50 features
    Better than simple sharpness/brightness for FYP presentation
    """
    
    def __init__(self):
        # Load ResNet-50
        base_model = ResNet50(weights='imagenet', include_top=True)
        self.model = base_model
        
        logger.info("ResNet-50 quality scorer initialized")
    
    def score_image_quality(self, img_path: str) -> float:
        """
        Score image quality using ResNet-50 feature analysis
        Combines multiple factors:
        - Feature diversity (high-level semantic content)
        - Prediction confidence (well-composed images have clear subjects)
        - Traditional metrics (sharpness, brightness)
        """
        img = cv2.imread(img_path)
        if img is None:
            return 0.0
        
        # 1. ResNet-50 semantic score
        img_resized = cv2.resize(img, (224, 224))
        img_rgb = cv2.cvtColor(img_resized, cv2.COLOR_BGR2RGB)
        img_array = image.img_to_array(img_rgb)
        img_array = np.expand_dims(img_array, axis=0)
        img_array = preprocess_input(img_array)
        
        predictions = self.model.predict(img_array, verbose=0)
        confidence = np.max(predictions)  # Higher = clearer subject
        
        # 2. Traditional metrics
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        sharpness = cv2.Laplacian(gray, cv2.CV_64F).var()
        brightness = np.mean(gray)
        
        # 3. Combined score
        semantic_score = confidence * 100
        sharpness_score = min(sharpness / 10, 100)  # Normalize
        brightness_penalty = 0 if 50 < brightness < 200 else -20
        
        total_score = semantic_score + sharpness_score + brightness_penalty
        
        return total_score
    
    def select_highlights(self, image_paths: List[str], top_n: int = 25) -> List[Tuple[str, float]]:
        """
        Select top N highlights using ResNet-50 quality scoring
        
        Returns:
            List of (image_path, score) tuples, sorted by score
        """
        scored_images = []
        
        for img_path in image_paths:
            score = self.score_image_quality(img_path)
            scored_images.append((img_path, score))
        
        # Sort by score (highest first)
        scored_images.sort(key=lambda x: x[1], reverse=True)
        
        return scored_images[:top_n]


# ============================================================================
# INTEGRATION FUNCTIONS
# ============================================================================

def process_album_with_resnet(
    image_folder: str,
    output_folder: str,
    eps: float = 0.5,
    min_samples: int = 3,
    highlights_count: int = 25
) -> dict:
    """
    Complete album processing using ResNet-50
    
    This is what goes in your FYP report:
    1. Face detection (Haar Cascade - CV technique)
    2. Face embedding extraction (ResNet-50 - Deep Learning)
    3. Face clustering (DBSCAN - ML clustering)
    4. Quality scoring (ResNet-50 predictions - AI assessment)
    
    Returns:
        {
            "person_folders": [{"folder": "Person_1", "count": 15}, ...],
            "highlights": [{"path": "img1.jpg", "score": 87.5}, ...],
            "groups": {"count": 10},
            "total_faces": 45
        }
    """
    if not RESNET_AVAILABLE:
        logger.warning("ResNet not available - album processing disabled")
        return {
            "error": "ResNet face recognition requires TensorFlow. Install with: pip install tensorflow",
            "person_folders": [],
            "highlights": [],
            "groups": {"count": 0},
            "total_faces": 0,
            "status": "disabled"
        }
    
    os.makedirs(output_folder, exist_ok=True)
    
    face_recognizer = ResNetFaceRecognizer()
    quality_scorer = ResNetImageQualityScorer()
    
    # Step 1: Detect faces and extract embeddings
    logger.info("Step 1/4: Detecting faces with Haar Cascade...")
    all_embeddings = []
    face_image_map = []  # (image_path, face_box, embedding_idx)
    image_face_count = {}  # Track how many faces per image
    
    image_files = [f for f in os.listdir(image_folder) 
                   if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
    
    for img_file in image_files:
        img_path = os.path.join(image_folder, img_file)
        faces = face_recognizer.detect_faces(img_path)
        image_face_count[img_path] = len(faces)
        
        for face_box in faces:
            embedding = face_recognizer.extract_face_embedding(img_path, face_box)
            all_embeddings.append(embedding)
            face_image_map.append((img_path, face_box, len(all_embeddings) - 1))
    
    logger.info(f"Detected {len(all_embeddings)} faces")
    
    # Step 2: Cluster faces
    logger.info("Step 2/4: Clustering faces with DBSCAN...")
    if all_embeddings:
        embeddings_array = np.array(all_embeddings)
        labels = face_recognizer.cluster_faces(embeddings_array, eps, min_samples)
        
        # Create person folders (SOLO - 1 face only)
        unique_labels = set(labels)
        if -1 in unique_labels:
            unique_labels.remove(-1)  # Remove outliers
        
        person_results = []
        for label in unique_labels:
            person_folder = os.path.join(output_folder, f"Person_{label + 1}")
            os.makedirs(person_folder, exist_ok=True)
            
            # Copy images of this person WHERE THEY ARE SOLO (1 face only)
            indices = [i for i, l in enumerate(labels) if l == label]
            copied = set()
            for idx in indices:
                img_path, _, _ = face_image_map[idx]
                # Only copy if this image has exactly 1 face (solo)
                if img_path not in copied and image_face_count.get(img_path, 0) == 1:
                    import shutil
                    shutil.copy2(img_path, person_folder)
                    copied.add(img_path)
            
            if copied:  # Only create folder if there are solo images
                person_results.append({"folder": f"Person_{label + 1}", "count": len(copied)})
            else:
                # Remove empty folder
                import shutil
                shutil.rmtree(person_folder, ignore_errors=True)
        
        logger.info(f"Created {len(person_results)} person folders (solo only)")
    else:
        person_results = []
    
    # Step 2.5: Create Groups folder (2+ faces)
    logger.info("Step 2.5/4: Organizing group photos...")
    groups_folder = os.path.join(output_folder, "Groups")
    os.makedirs(groups_folder, exist_ok=True)
    
    group_count = 0
    for img_path, face_count in image_face_count.items():
        if face_count >= 2:
            import shutil
            shutil.copy2(img_path, groups_folder)
            group_count += 1
    
    logger.info(f"Found {group_count} group photos (2+ faces)")
    
    # Step 3: Select highlights
    logger.info("Step 3/4: Scoring images with ResNet-50...")
    all_image_paths = [os.path.join(image_folder, f) for f in image_files]
    highlights = quality_scorer.select_highlights(all_image_paths, highlights_count)
    
    # Save highlights
    highlights_folder = os.path.join(output_folder, "Highlights")
    os.makedirs(highlights_folder, exist_ok=True)
    
    highlight_results = []
    for img_path, score in highlights:
        import shutil
        shutil.copy2(img_path, highlights_folder)
        highlight_results.append({"path": os.path.basename(img_path), "score": float(score)})
    
    logger.info(f"Selected {len(highlight_results)} highlights")
    
    return {
        "person_folders": person_results,
        "highlights": highlight_results,
        "groups": {"count": group_count},
        "total_faces": len(all_embeddings),
        "status": "completed"
    }
