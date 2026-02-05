"""
Album Builder Processing Script
Runs with Python 3.12 to use production face recognition (MediaPipe + ArcFace)
"""

# Suppress TensorFlow warnings FIRST (before any imports)
import os
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'  # Suppress INFO/WARNING/ERROR from TensorFlow
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'  # Disable oneDNN messages
os.environ['PYTHONWARNINGS'] = 'ignore'  # Suppress Python warnings
import warnings
warnings.filterwarnings('ignore')  # Suppress all warnings including TensorFlow deprecation warnings

import sys
import json
import logging
from pathlib import Path

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Import album builder modules
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from services.album_builder.preprocessing import ImagePreprocessor

# Try face recognition services (PRODUCTION > Simple ONNX > OpenCV > DeepFace)
RECOGNITION_METHOD = None
try:
    # 🥇 BEST: Production (MediaPipe + ArcFace ONNX) - Roadmap implementation
    from services.album_builder.production_face_recognition import ProductionFaceRecognition
    RECOGNITION_METHOD = "production"
    logger.info("✅ Using PRODUCTION face recognition (MediaPipe + ArcFace - Google Photos style)")
except ImportError as e:
    logger.warning(f"Production not available: {e}")
    try:
        # 🥈 Simple ONNX (no MediaPipe, works on Windows)
        from services.album_builder.simple_face_recognition import SimpleFaceRecognition
        RECOGNITION_METHOD = "simple_onnx"
        logger.info("✅ Using Simple ONNX (ArcFace, no compilation)")
    except ImportError as e2:
        logger.warning(f"Simple ONNX not available: {e2}")
        try:
            # 🥉 InsightFace (if compiled)
            from services.album_builder.insightface_service import InsightFaceService
            RECOGNITION_METHOD = "insightface"
            logger.info("✅ Using InsightFace (ArcFace)")
        except ImportError:
            try:
                # OpenCV version  
                from services.album_builder.opencv_face_recognition import OpenCVFaceRecognition
                RECOGNITION_METHOD = "opencv"
                logger.info("✅ Using OpenCV (fallback)")
            except ImportError:
                try:
                    # dlib-based version  
                    from services.album_builder.fast_face_recognition import FastFaceRecognition
                    RECOGNITION_METHOD = "dlib"
                    logger.info("✅ Using face_recognition library (dlib fallback)")
                except ImportError:
                    # ⚠️ Slowest: DeepFace
                    from services.album_builder.face_recognition_service import FaceRecognitionService  
                    RECOGNITION_METHOD = "deepface"
                    logger.warning("⚠️ Using DeepFace (SLOW fallback)")

from services.album_builder.album_organizer import AlbumOrganizer


def update_progress(progress_file: str, status: str, stage: str, progress: int, message: str, time_remaining: int = None):
    """Update progress file with time estimate"""
    try:
        data = {
            'status': status,
            'stage': stage,
            'progress': progress,
            'message': message
        }
        if time_remaining is not None:
            data['time_remaining_seconds'] = time_remaining
            data['time_remaining_text'] = f"{time_remaining // 60}m {time_remaining % 60}s"
        
        with open(progress_file, 'w') as f:
            json.dump(data, f)
    except Exception as e:
        logger.warning(f"Failed to update progress: {e}")


def process_albums(config_path: str):
    """
    Process album building request
    
    Args:
        config_path: Path to config JSON file
    """
    logger.info(f"Loading config from {config_path}")
    
    with open(config_path, 'r') as f:
        config = json.load(f)
    
    session_id = config['session_id']
    references_dir = Path(config['references_dir'])
    photos_dir = Path(config['photos_dir'])
    output_dir = Path(config['output_dir'])
    person_names = config['person_names']
    similarity_threshold = config.get('similarity_threshold', 0.4)
    model_name = config.get('model_name', 'VGG-Face')  # Use VGG-Face for speed
    progress_file = config.get('progress_file')
    
    output_dir.mkdir(parents=True, exist_ok=True)
    
    logger.info(f"Session: {session_id}")
    logger.info(f"People to find: {', '.join(person_names)}")
    
    try:
        # Step 1: Initialize services
        if progress_file:
            update_progress(progress_file, 'processing', 'initializing', 5, 'Loading AI models...')
        
        logger.info("Initializing services...")
        preprocessor = ImagePreprocessor(target_size_mb=1.0, max_dimension=1600)  # Keep quality for InsightFace
        
        # Initialize face recognition based on available library
        if RECOGNITION_METHOD == "production":
            face_service = ProductionFaceRecognition(tolerance=similarity_threshold)
            logger.info("✅ Using PRODUCTION (MediaPipe + ArcFace)")
        elif RECOGNITION_METHOD == "simple_onnx":
            face_service = SimpleFaceRecognition(tolerance=similarity_threshold)
            logger.info("✅ Using Simple ONNX (ArcFace, Windows-friendly)")
        elif RECOGNITION_METHOD == "insightface":
            face_service = InsightFaceService(similarity_threshold=similarity_threshold)
            logger.info("✅ Using InsightFace (ArcFace)")
        elif RECOGNITION_METHOD == "opencv":
            face_service = OpenCVFaceRecognition(tolerance=similarity_threshold)
            logger.info("✅ Using OpenCV (fallback)")
        elif RECOGNITION_METHOD == "dlib":
            face_service = FastFaceRecognition(tolerance=similarity_threshold)
            logger.info("✅ Using dlib (fallback)")
        else:  # deepface
            face_service = FaceRecognitionService(
                model_name=model_name,
                detector_backend="opencv",
                similarity_threshold=similarity_threshold
            )
            logger.info("⚠️ Using DeepFace (SLOW)")
        
        organizer = AlbumOrganizer(str(output_dir.parent))
        
        # Step 2: Preprocess photos
        if progress_file:
            update_progress(progress_file, 'processing', 'preprocessing', 10, 'Optimizing photos for analysis...')
        
        logger.info("Preprocessing photos...")
        processed_dir = output_dir / "processed"
        processed_dir.mkdir(exist_ok=True)
        
        photo_files = list(photos_dir.glob("*.jpg")) + list(photos_dir.glob("*.jpeg")) + list(photos_dir.glob("*.png"))
        logger.info(f"Found {len(photo_files)} photos to process")
        
        processed_photos = preprocessor.preprocess_batch(
            [str(p) for p in photo_files],
            str(processed_dir)
        )
        
        processed_paths = [result[0] for result in processed_photos]
        logger.info(f"Preprocessed {len(processed_paths)} photos")
        
        # Step 3: Extract reference face embeddings
        if progress_file:
            update_progress(progress_file, 'processing', 'references', 25, 'Analyzing reference faces...')
        
        logger.info("Extracting reference face embeddings...")
        reference_files = sorted(references_dir.glob("reference_*"))
        
        if len(reference_files) != len(person_names):
            raise ValueError(f"Mismatch: {len(reference_files)} references, {len(person_names)} names")
        
        reference_embeddings = {}
        
        for ref_file, person_name in zip(reference_files, person_names):
            logger.info(f"Processing reference for {person_name}: {ref_file.name}")
            
            # All services use get_face_encoding() method
            # Use strict_validation=False for more tolerance
            embedding = face_service.get_face_encoding(str(ref_file), strict_validation=False)
            
            if embedding is None:
                logger.error(f"❌ Failed to extract face from reference photo for {person_name}")
                logger.error(f"   Photo: {ref_file.name}")
                logger.error(f"   Tip: Use a clear photo with one person's face visible")
                continue
            
            reference_embeddings[person_name] = embedding
            logger.info(f"✅ Successfully extracted face embedding for {person_name}")
        
        if not reference_embeddings:
            logger.error("❌ NO VALID REFERENCE FACES FOUND!")
            logger.error("   None of the reference photos had detectable faces.")
            logger.error("   Please upload:")
            logger.error("   ✓ Clear photos (not blurry screenshots)")
            logger.error("   ✓ Face clearly visible (front-facing)")
            logger.error("   ✓ Well-lit photos")
            logger.error("   ✓ One person per photo")
            raise ValueError("No valid reference faces found")
        
        # Step 4: Find people in photos
        if progress_file:
            update_progress(progress_file, 'processing', 'searching', 30, f'Searching {len(processed_paths)} photos...')
        
        logger.info(f"Searching for {len(reference_embeddings)} people in {len(processed_paths)} photos...")
        
        total_photos = len(processed_paths)
        import time
        start_time = time.time()
        
        def progress_callback(current, total, photo_path):
            if progress_file and current % 3 == 0:  # Update every 3 photos
                progress_pct = 30 + int((current / total) * 50)
                
                # Estimate time remaining
                elapsed = time.time() - start_time
                if current > 0:
                    avg_time_per_photo = elapsed / current
                    remaining_photos = total - current
                    time_remaining = int(avg_time_per_photo * remaining_photos)
                else:
                    time_remaining = None
                
                update_progress(progress_file, 'processing', 'searching', progress_pct, 
                              f'Analyzed {current}/{total} photos...', time_remaining)
            if current % 10 == 0:
                logger.info(f"Progress: {current}/{total} photos processed")
        
        search_results = face_service.find_multiple_people(
            reference_embeddings,
            processed_paths,
            progress_callback
        )
        
        # Log results
        for person, matches in search_results.items():
            logger.info(f"Found {len(matches)} photos of {person}")
        
        # Step 5: Create albums
        if progress_file:
            update_progress(progress_file, 'processing', 'organizing', 85, 'Creating albums...')
        
        logger.info("Creating albums...")
        album_result = organizer.create_albums(
            search_results,
            session_id,
            copy_photos=True
        )
        
        # Step 6: Create ZIP
        if progress_file:
            update_progress(progress_file, 'processing', 'packaging', 95, 'Creating ZIP archive...')
        
        logger.info("Creating ZIP archive...")
        zip_path = organizer.create_zip_archive(album_result['session_dir'])
        
        # Step 7: Save result
        result = {
            'success': True,
            'session_id': session_id,
            'albums': album_result['summary']['albums'],
            'summary': album_result['summary'],
            'zip_path': zip_path
        }
        
        result_path = output_dir / "result.json"
        with open(result_path, 'w') as f:
            json.dump(result, f, indent=2)
        
        if progress_file:
            update_progress(progress_file, 'completed', 'done', 100, '✅ Albums ready!')
        
        logger.info("✅ Album building completed successfully!")
        return result
    
    except Exception as e:
        logger.error(f"❌ Error building albums: {str(e)}")
        
        if progress_file:
            update_progress(progress_file, 'error', 'failed', 0, f'Error: {str(e)}')
        
        # Save error result
        error_result = {
            'success': False,
            'error': str(e),
            'session_id': session_id
        }
        
        result_path = output_dir / "result.json"
        with open(result_path, 'w') as f:
            json.dump(error_result, f, indent=2)
        
        raise


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python run_album_builder.py <config_path>")
        sys.exit(1)
    
    config_path = sys.argv[1]
    
    try:
        process_albums(config_path)
        sys.exit(0)
    except Exception as e:
        logger.error(f"Fatal error: {str(e)}")
        sys.exit(1)
