"""
Reel Photo Selector - AI-powered selection of best photos for reels
Uses Computer Vision to analyze and rank photos by quality metrics
"""

import cv2
import numpy as np
from PIL import Image
from typing import List, Tuple, Dict
import io


class PhotoQualityAnalyzer:
    """Analyzes photo quality using multiple CV metrics"""
    
    def __init__(self):
        # Load face detection cascade
        self.face_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        )
        
        # Weights for scoring (tune these for best results)
        self.weights = {
            'sharpness': 0.25,      # Sharp photos look professional
            'brightness': 0.20,     # Well-lit photos
            'contrast': 0.15,       # Good contrast = depth
            'face_score': 0.25,     # Photos with people = highlights
            'color_vibrancy': 0.15  # Vibrant colors = engaging
        }
    
    def analyze_photo(self, image_bytes: bytes) -> Dict[str, float]:
        """
        Analyze a single photo and return quality metrics
        
        Args:
            image_bytes: Raw image bytes
            
        Returns:
            Dictionary with metrics and overall score
        """
        try:
            # Convert bytes to numpy array
            nparr = np.frombuffer(image_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if img is None:
                # Return decent default scores instead of 0
                return {
                    'overall_score': 60.0,
                    'sharpness': 60.0,
                    'brightness': 60.0,
                    'contrast': 60.0,
                    'face_score': 50.0,
                    'color_vibrancy': 60.0,
                    'width': 0,
                    'height': 0,
                    'error': 'Failed to decode image - using default scores'
                }
            
            # Calculate all metrics
            sharpness = self._calculate_sharpness(img)
            brightness = self._calculate_brightness(img)
            contrast = self._calculate_contrast(img)
            face_score = self._calculate_face_score(img)
            color_vibrancy = self._calculate_color_vibrancy(img)
            
            # Calculate weighted overall score (0-100)
            overall_score = (
                sharpness * self.weights['sharpness'] +
                brightness * self.weights['brightness'] +
                contrast * self.weights['contrast'] +
                face_score * self.weights['face_score'] +
                color_vibrancy * self.weights['color_vibrancy']
            )
            
            return {
                'overall_score': round(overall_score, 2),
                'sharpness': round(sharpness, 2),
                'brightness': round(brightness, 2),
                'contrast': round(contrast, 2),
                'face_score': round(face_score, 2),
                'color_vibrancy': round(color_vibrancy, 2),
                'width': img.shape[1],
                'height': img.shape[0]
            }
        except Exception as e:
            # Return decent default scores on any error
            return {
                'overall_score': 60.0,
                'sharpness': 60.0,
                'brightness': 60.0,
                'contrast': 60.0,
                'face_score': 50.0,
                'color_vibrancy': 60.0,
                'width': 0,
                'height': 0,
                'error': f'Analysis error: {str(e)}'
            }
    
    def _calculate_sharpness(self, img: np.ndarray) -> float:
        """
        Calculate image sharpness using Laplacian variance
        Higher variance = sharper image
        
        Returns:
            Score 0-100
        """
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        
        # Normalize to 0-100 scale (LENIENT for real photos)
        # Lower threshold: max out at 200 instead of 500 (accept slightly blurry)
        score = min(100, (laplacian_var / 200) * 100)
        # Boost minimum score for any detectable sharpness
        score = max(40, score)  # At least 40 for any photo
        return score
    
    def _calculate_brightness(self, img: np.ndarray) -> float:
        """
        Calculate image brightness using HSV V channel
        Optimal brightness is around 120-150 (on 0-255 scale)
        
        Returns:
            Score 0-100 (LENIENT - accepts darker/brighter photos)
        """
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        v_channel = hsv[:, :, 2]
        mean_brightness = v_channel.mean()
        
        # WIDER optimal range: 80-180 (accept darker and brighter)
        # Score based on distance from optimal
        optimal_brightness = 130
        distance = abs(mean_brightness - optimal_brightness)
        
        # More lenient penalty (max penalty at 200 units instead of 130)
        score = max(50, 100 - (distance / 200) * 100)  # Min score 50
        return score
    
    def _calculate_contrast(self, img: np.ndarray) -> float:
        """
        Calculate image contrast using standard deviation
        Higher std = better contrast
        
        Returns:
            Score 0-100 (LENIENT - accept lower contrast)
        """
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        std_dev = gray.std()
        
        # Normalize to 0-100 scale (LENIENT threshold)
        # Lower requirement: max out at 40 instead of 60
        score = min(100, (std_dev / 40) * 100)
        # Minimum score for any contrast
        score = max(50, score)  # At least 50 for any photo
        return score
    
    def _calculate_face_score(self, img: np.ndarray) -> float:
        """
        Calculate face detection score
        Photos with people are usually highlights
        
        Returns:
            Score 0-100 based on number and size of faces
        """
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        faces = self.face_cascade.detectMultiScale(
            gray,
            scaleFactor=1.1,
            minNeighbors=5,
            minSize=(30, 30)
        )
        
        num_faces = len(faces)
        
        if num_faces == 0:
            return 50  # HIGHER base score for no faces (accept landscapes/objects)
        
        # Calculate total face area as % of image
        img_area = img.shape[0] * img.shape[1]
        face_area = sum([w * h for (x, y, w, h) in faces])
        face_percentage = (face_area / img_area) * 100
        
        # Score based on faces present (more faces = better highlight)
        # 1 face = 70, 2-3 faces = 85, 4+ faces = 100
        if num_faces == 1:
            base_score = 70
        elif num_faces <= 3:
            base_score = 85
        else:
            base_score = 100
        
        # Bonus for larger faces (close-ups are better)
        size_bonus = min(30, face_percentage / 2)  # Up to +30 for large faces
        
        return min(100, base_score + size_bonus)
    
    def _calculate_color_vibrancy(self, img: np.ndarray) -> float:
        """
        Calculate color vibrancy using saturation
        Vibrant colors = engaging content
        
        Returns:
            Score 0-100
        """
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        s_channel = hsv[:, :, 1]
        mean_saturation = s_channel.mean()
        
        # Normalize to 0-100 scale
        # Saturation range: 0-255
        score = (mean_saturation / 255) * 100
        return score


class ReelPhotoSelector:
    """Selects best photos for reel generation"""
    
    def __init__(self):
        self.analyzer = PhotoQualityAnalyzer()
    
    def select_best_photos(
        self,
        photos: List[Tuple[bytes, str]],  # List of (image_bytes, filename)
        min_photos: int = 8,
        max_photos: int = 12
    ) -> List[Tuple[bytes, str, Dict]]:
        """
        Analyze and select best photos for reel
        
        Args:
            photos: List of (image_bytes, filename) tuples
            min_photos: Minimum photos to select (default: 8)
            max_photos: Maximum photos to select (default: 12)
            
        Returns:
            List of (image_bytes, filename, analysis) sorted by quality (best first)
        """
        if len(photos) < min_photos:
            raise ValueError(f"Need at least {min_photos} photos, got {len(photos)}")
        
        # Analyze all photos
        analyzed_photos = []
        for image_bytes, filename in photos:
            analysis = self.analyzer.analyze_photo(image_bytes)
            analyzed_photos.append((image_bytes, filename, analysis))
        
        # Sort by overall score (descending)
        analyzed_photos.sort(key=lambda x: x[2]['overall_score'], reverse=True)
        
        # Select top photos
        num_to_select = min(max_photos, max(min_photos, len(photos)))
        selected_photos = analyzed_photos[:num_to_select]
        
        return selected_photos
    
    def get_selection_summary(
        self,
        selected_photos: List[Tuple[bytes, str, Dict]]
    ) -> Dict:
        """
        Get summary statistics of selected photos
        
        Returns:
            Dictionary with average scores and selection info
        """
        if not selected_photos:
            return {}
        
        scores = {
            'overall': [],
            'sharpness': [],
            'brightness': [],
            'contrast': [],
            'face_score': [],
            'color_vibrancy': []
        }
        
        for _, _, analysis in selected_photos:
            scores['overall'].append(analysis['overall_score'])
            scores['sharpness'].append(analysis['sharpness'])
            scores['brightness'].append(analysis['brightness'])
            scores['contrast'].append(analysis['contrast'])
            scores['face_score'].append(analysis['face_score'])
            scores['color_vibrancy'].append(analysis['color_vibrancy'])
        
        return {
            'num_selected': int(len(selected_photos)),
            'average_quality': float(round(np.mean(scores['overall']), 2)),
            'min_quality': float(round(min(scores['overall']), 2)),
            'max_quality': float(round(max(scores['overall']), 2)),
            'avg_sharpness': float(round(np.mean(scores['sharpness']), 2)),
            'avg_brightness': float(round(np.mean(scores['brightness']), 2)),
            'avg_contrast': float(round(np.mean(scores['contrast']), 2)),
            'avg_face_score': float(round(np.mean(scores['face_score']), 2)),
            'avg_color_vibrancy': float(round(np.mean(scores['color_vibrancy']), 2)),
            'photos_with_faces': int(sum(1 for s in scores['face_score'] if s > 50))
        }


# Convenience functions for API use
def analyze_and_select_photos(
    photos: List[Tuple[bytes, str]],
    min_photos: int = 8,
    max_photos: int = 12
) -> Tuple[List[Tuple[bytes, str, Dict]], Dict]:
    """
    Analyze and select best photos for reel generation
    
    Args:
        photos: List of (image_bytes, filename) tuples
        min_photos: Minimum photos to select
        max_photos: Maximum photos to select
        
    Returns:
        Tuple of (selected_photos, summary)
    """
    selector = ReelPhotoSelector()
    selected = selector.select_best_photos(photos, min_photos, max_photos)
    summary = selector.get_selection_summary(selected)
    
    return selected, summary
