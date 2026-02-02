"""
Smart Album Builder - Core Processing
Module 6: AI-powered photo organization using ResNet-50
"""

import os
import shutil
import threading
from typing import Dict
import logging

# Use ResNet-50 for face recognition instead of face_recognition library
from backend.services.resnet_face_recognition import process_album_with_resnet
from backend.services.thumbnail_service import generate_album_thumbnails

logger = logging.getLogger(__name__)


class AlbumProcessor:
    """Handles AI-powered photo processing for album organization"""
    
    def __init__(self, user_id: str, upload_folder: str, output_folder: str):
        self.user_id = user_id
        self.upload_folder = upload_folder
        self.output_folder = output_folder
        self.status_file = os.path.join(output_folder, "_processing_status.txt")
        
    def _update_status(self, message: str):
        """Update processing status to file"""
        os.makedirs(self.output_folder, exist_ok=True)
        with open(self.status_file, 'a', encoding='utf-8') as f:
            f.write(f"{message}\n")
        logger.info(f"[Album Processor] {message}")
    
    def get_status(self) -> Dict:
        """Read current processing status"""
        if not os.path.exists(self.status_file):
            return {"status": "not_started", "messages": []}
        
        with open(self.status_file, 'r', encoding='utf-8') as f:
            messages = f.readlines()
        
        # Determine overall status
        if "COMPLETE" in messages[-1] if messages else "":
            status = "completed"
        elif "ERROR" in messages[-1] if messages else "":
            status = "error"
        else:
            status = "processing"
            
        return {
            "status": status,
            "messages": [msg.strip() for msg in messages],
            "highlights_ready": os.path.exists(os.path.join(self.output_folder, "Highlights")),
            "person_albums_ready": any(d.startswith("Person_") for d in os.listdir(self.output_folder)) if os.path.exists(self.output_folder) else False
        }
    
    def worker_create_highlights(self):
        """Worker 1: Create highlight album with quality scoring"""
        try:
            self._update_status(">>> [Worker 1] Started: Creating Highlight Album...")
            
            highlights_dir = os.path.join(self.output_folder, "Highlights")
            os.makedirs(highlights_dir, exist_ok=True)
            
            scored_images = []
            
            # Loop through all images
            for file in os.listdir(self.upload_folder):
                if not file.lower().endswith(('.png', '.jpg', '.jpeg')):
                    continue
                
                file_path = os.path.join(self.upload_folder, file)
                img = cv2.imread(file_path)
                if img is None:
                    continue

                # --- SCORING LOGIC ---
                gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
                sharpness = cv2.Laplacian(gray, cv2.CV_64F).var()
                brightness = np.mean(gray)
                
                # Simple Formula: High sharpness + balanced brightness
                score = sharpness
                if brightness < 40 or brightness > 220:  # Penalty for too dark/bright
                    score -= 50
                    
                scored_images.append((score, file_path, file))

            # Pick Top 25 Photos
            scored_images.sort(key=lambda x: x[0], reverse=True)
            top_photos = scored_images[:25]
            
            for _, src, filename in top_photos:
                dst = os.path.join(highlights_dir, filename)
                shutil.copy2(src, dst)
                
            self._update_status(f">>> [Worker 1] Finished: {len(top_photos)} highlights created.")
            
        except Exception as e:
            self._update_status(f">>> [Worker 1] ERROR: {str(e)}")
            logger.error(f"Highlight creation error: {e}", exc_info=True)
    
    def worker_create_person_albums(self):
        """Worker 2: Create person-based albums using face clustering"""
        try:
            self._update_status(">>> [Worker 2] Started: Creating Person Albums...")
            
            encodings = []
            files_with_faces = []
            
            # 1. Detect Faces
            for file in os.listdir(self.upload_folder):
                if not file.lower().endswith(('.png', '.jpg', '.jpeg')):
                    continue
                
                path = os.path.join(self.upload_folder, file)
                
                try:
                    image = face_recognition.load_image_file(path)
                    faces = face_recognition.face_encodings(image)
                    
                    if len(faces) > 0:
                        encodings.append(faces[0])
                        files_with_faces.append(file)
                except Exception as e:
                    logger.warning(f"Could not process {file}: {e}")
                    continue
                    
            # 2. Cluster (DBSCAN)
            if not encodings:
                self._update_status(">>> [Worker 2] No faces found.")
                return

            clt = DBSCAN(eps=0.5, min_samples=3, metric="euclidean")
            clt.fit(encodings)
            
            # 3. Create Folders
            labels = clt.labels_
            unique_ids = np.unique(labels)
            person_count = 0
            
            for label_id in unique_ids:
                if label_id == -1:  # Unknown faces
                    continue
                
                person_dir = os.path.join(self.output_folder, f"Person_{label_id + 1}")
                os.makedirs(person_dir, exist_ok=True)
                
                # Get all images for this person
                indices = np.where(labels == label_id)[0]
                for i in indices:
                    filename = files_with_faces[i]
                    src = os.path.join(self.upload_folder, filename)
                    dst = os.path.join(person_dir, filename)
                    if not os.path.exists(dst):
                        shutil.copy2(src, dst)
                
                person_count += 1
                    
            self._update_status(f">>> [Worker 2] Finished: {person_count} Person Albums created.")
            
        except Exception as e:
            self._update_status(f">>> [Worker 2] ERROR: {str(e)}")
            logger.error(f"Person album creation error: {e}", exc_info=True)
    
    def start_parallel_processing(self):
        """
        Master function: Process album using ResNet-50
        Uses ResNet-50 for both face recognition and quality scoring
        """
        try:
            self._update_status("=== PROCESSING STARTED WITH RESNET-50 ===")
            self._update_status("Using deep learning for intelligent organization...")
            
            # Call ResNet-50 processing function
            result = process_album_with_resnet(
                image_folder=self.upload_folder,
                output_folder=self.output_folder,
                eps=0.5,
                min_samples=3,
                highlights_count=25
            )
            
            # Log results
            self._update_status(f"✓ Detected {result['total_faces']} faces")
            self._update_status(f"✓ Created {len(result['person_folders'])} person albums (solo)")
            self._update_status(f"✓ Found {result['groups']['count']} group photos")
            self._update_status(f"✓ Selected {len(result['highlights'])} highlights")
            
            # Generate thumbnails for fast preview
            self._update_status("Generating thumbnails for preview...")
            generate_album_thumbnails(self.output_folder)
            self._update_status("✓ Thumbnails generated")
            
            self._update_status("=== ALL PROCESSING COMPLETE ===")
            
        except Exception as e:
            self._update_status(f"=== ERROR: {str(e)} ===")
            logger.error(f"Processing error: {e}", exc_info=True)


def get_album_structure(output_folder: str) -> Dict:
    """
    Get organized folder structure after processing
    Returns: {
        "highlights": ["img1.jpg", "img2.jpg", ...],
        "persons": {
            "Person_1": ["img1.jpg", ...],
            "Person_2": ["img2.jpg", ...],
        },
        "groups": ["img1.jpg", "img2.jpg", ...]
    }
    """
    if not os.path.exists(output_folder):
        return {"highlights": [], "persons": {}, "groups": []}
    
    result = {
        "highlights": [],
        "persons": {},
        "groups": []
    }
    
    # Get highlights
    highlights_dir = os.path.join(output_folder, "Highlights")
    if os.path.exists(highlights_dir):
        result["highlights"] = [f for f in os.listdir(highlights_dir) 
                               if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
    
    # Get groups
    groups_dir = os.path.join(output_folder, "Groups")
    if os.path.exists(groups_dir):
        result["groups"] = [f for f in os.listdir(groups_dir)
                           if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
    
    # Get person albums
    for folder in os.listdir(output_folder):
        if folder.startswith("Person_"):
            person_dir = os.path.join(output_folder, folder)
            if os.path.isdir(person_dir):
                result["persons"][folder] = [
                    f for f in os.listdir(person_dir)
                    if f.lower().endswith(('.png', '.jpg', '.jpeg'))
                ]
    
    return result
