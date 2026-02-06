#!/usr/bin/env python3
"""
Album Builder Fresh Implementation Test Script

Tests the complete album builder pipeline:
1. Image preprocessing (strict for references, flexible for events)
2. Face recognition with InsightFace (or mock fallback)  
3. Album creation and organization

Usage:
    python test_fresh_album_builder.py

Requirements:
    - Python 3.8+
    - cv2, PIL, numpy (for preprocessing)
    - insightface, onnxruntime (optional, will use mock if not available)
"""

import sys
import os
import tempfile
import shutil
from pathlib import Path
import time
import logging

# Add backend to path
sys.path.append(str(Path(__file__).parent.parent))

try:
    from backend.services.album_preprocessing import ImagePreprocessor
    from backend.services.album_face_recognition import FaceRecognitionService, MockFaceRecognitionService
except ImportError as e:
    print(f"❌ Import error: {e}")
    print("Make sure you're running this from the project root directory")
    sys.exit(1)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('album_builder_test.log')
    ]
)
logger = logging.getLogger(__name__)


def create_test_images():
    """
    Create minimal test images for testing
    Since we don't have real photos, create simple colored squares
    """
    try:
        import cv2
        import numpy as np
    except ImportError:
        logger.error("OpenCV not available - cannot create test images")
        return None, None
    
    # Create temp directory
    test_dir = Path(tempfile.mkdtemp(prefix="album_test_"))
    ref_dir = test_dir / "references"
    event_dir = test_dir / "events"
    
    ref_dir.mkdir()
    event_dir.mkdir()
    
    logger.info(f"📁 Created test directory: {test_dir}")
    
    # Create reference images (different colors to simulate different people)
    colors = [(255, 0, 0), (0, 255, 0), (0, 0, 255)]  # Red, Green, Blue
    people = ["Alice", "Bob", "Charlie"]
    
    reference_paths = []
    for i, (person, color) in enumerate(zip(people, colors)):
        img = np.full((400, 400, 3), color, dtype=np.uint8)
        
        # Add some simple "face-like" features (white rectangle as face)
        cv2.rectangle(img, (150, 120), (250, 220), (255, 255, 255), -1)  # Face
        cv2.circle(img, (180, 160), 15, (0, 0, 0), -1)  # Left eye
        cv2.circle(img, (220, 160), 15, (0, 0, 0), -1)  # Right eye
        cv2.rectangle(img, (190, 180), (210, 200), (0, 0, 0), -1)  # Nose
        
        ref_path = ref_dir / f"{person}_ref.jpg"
        cv2.imwrite(str(ref_path), img)
        reference_paths.append(str(ref_path))
        
        logger.info(f"   📷 Created reference for {person}: {ref_path.name}")
    
    # Create event images (mix of colors to simulate group photos)
    event_paths = []
    for i in range(10):
        # Random mix of colors
        sections = np.random.choice(len(colors), 6)  # 6 sections in image
        img = np.zeros((480, 640, 3), dtype=np.uint8)
        
        for j, section_color_idx in enumerate(sections):
            color = colors[section_color_idx]
            x = (j % 3) * 213
            y = (j // 3) * 240
            
            # Draw colored section  
            cv2.rectangle(img, (x, y), (x + 213, y + 240), color, -1)
            
            # Add simple face features randomly
            if np.random.random() > 0.5:
                face_x = x + 50
                face_y = y + 50
                cv2.rectangle(img, (face_x, face_y), (face_x + 80, face_y + 80), (255, 255, 255), -1)
                cv2.circle(img, (face_x + 20, face_y + 30), 8, (0, 0, 0), -1)
                cv2.circle(img, (face_x + 60, face_y + 30), 8, (0, 0, 0), -1)
        
        event_path = event_dir / f"event_{i:03d}.jpg"
        cv2.imwrite(str(event_path), img)
        event_paths.append(str(event_path))
        
        if i == 0 or i % 5 == 0:
            logger.info(f"   🎉 Created event photo: {event_path.name}")
    
    logger.info(f"✅ Created {len(reference_paths)} reference and {len(event_paths)} event test images")
    return reference_paths, event_paths


def test_preprocessing():
    """Test image preprocessing service"""
    logger.info("\n" + "="*60)
    logger.info("🔧 TESTING IMAGE PREPROCESSING")
    logger.info("="*60)
    
    try:
        preprocessor = ImagePreprocessor()
        logger.info("✅ ImagePreprocessor initialized")
        
        # Test basic capabilities
        logger.info(f"   📊 Target size: ~{preprocessor.target_size_mb} MB")
        logger.info(f"   📊 Max dimension: {preprocessor.max_dimension}px") 
        logger.info(f"   📊 JPEG quality: {preprocessor.jpeg_quality}")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Preprocessing test failed: {e}")
        return False


def test_face_recognition():
    """Test face recognition service"""
    logger.info("\n" + "="*60)
    logger.info("🤖 TESTING FACE RECOGNITION")
    logger.info("="*60)
    
    try:
        # Try real InsightFace first
        face_service = FaceRecognitionService(similarity_threshold=0.6)
        
        if face_service.initialize_insightface():
            logger.info("✅ Real InsightFace service initialized")
            service_type = "Real InsightFace"
        else:
            # Fall back to mock
            face_service = MockFaceRecognitionService(similarity_threshold=0.6)
            face_service.initialize_insightface()
            logger.info("🎭 Mock face recognition service initialized")
            service_type = "Mock Service"
        
        logger.info(f"   🎯 Similarity threshold: {face_service.threshold}")
        logger.info(f"   🎭 Service type: {service_type}")
        
        return face_service
        
    except Exception as e:
        logger.error(f"❌ Face recognition test failed: {e}")
        return None


def test_full_pipeline():
    """Test complete album builder pipeline"""
    logger.info("\n" + "="*60) 
    logger.info("🚀 TESTING COMPLETE PIPELINE")
    logger.info("="*60)
    
    # Step 1: Create test images
    logger.info("📸 Step 1: Creating test images...")
    reference_paths, event_paths = create_test_images()
    
    if not reference_paths or not event_paths:
        logger.error("❌ Failed to create test images")
        return False
    
    try:
        # Step 2: Initialize services
        logger.info("🔧 Step 2: Loading services...")
        preprocessor = ImagePreprocessor()
        face_service = test_face_recognition()  # This returns initialized service
        
        if not face_service:
            return False
        
        # Step 3: Process reference photos 
        logger.info("📷 Step 3: Processing reference photos...")
        reference_embeddings = {}
        people = ["Alice", "Bob", "Charlie"]
        
        for person, ref_path in zip(people, reference_paths):
            logger.info(f"   Processing reference for {person}...")
            
            # Preprocess with strict validation
            processed_path = preprocessor.preprocess_reference_photo(ref_path, strict=True)
            
            if processed_path:
                logger.info(f"   ✅ Preprocessed: {Path(processed_path).name}")
                
                # Extract embedding
                embedding = face_service.get_reference_embedding(
                    processed_path, person, strict=True
                )
                
                if embedding is not None:
                    reference_embeddings[person] = embedding
                    logger.info(f"   ✅ Embedding extracted for {person}")
                else:
                    logger.warning(f"   ❌ No embedding for {person}")
            else:
                logger.warning(f"   ❌ Preprocessing failed for {person}")
        
        if len(reference_embeddings) == 0:
            logger.error("❌ No valid reference embeddings extracted")
            return False
        
        logger.info(f"✅ {len(reference_embeddings)} people registered: {list(reference_embeddings.keys())}")
        
        # Step 4: Process event photos
        logger.info("🎉 Step 4: Processing event photos...")
        processed_event_paths = []
        
        for i, event_path in enumerate(event_paths):
            processed_path = preprocessor.preprocess_event_photo(event_path)
            if processed_path:
                processed_event_paths.append(processed_path)
            
            if i % 5 == 0:
                logger.info(f"   Processed: {i+1}/{len(event_paths)} event photos")
        
        logger.info(f"✅ {len(processed_event_paths)} event photos processed")
        
        # Step 5: Run face recognition
        logger.info("🤖 Step 5: Running face recognition search...")
        start_time = time.time()
        
        search_results = face_service.find_people_in_event_photos(
            reference_embeddings=reference_embeddings,
            event_photo_paths=processed_event_paths,
            debug=True  # Enable detailed logging
        )
        
        search_time = time.time() - start_time
        logger.info(f"🔍 Search completed in {search_time:.2f} seconds")
        
        # Step 6: Create albums
        logger.info("📁 Step 6: Creating album folders...")
        albums_dir = Path(tempfile.mkdtemp(prefix="albums_"))
        
        album_summary = face_service.create_albums(
            search_results=search_results,
            output_dir=str(albums_dir),
            copy_files=True
        )
        
        # Step 7: Show results  
        logger.info("\n" + "🎯 FINAL RESULTS")
        logger.info("-" * 40)
        logger.info(f"Processing time: {search_time:.2f} seconds")
        logger.info(f"Albums created: {album_summary['albums_created']}")
        logger.info(f"Photos organized: {album_summary['total_photos_organized']}")
        logger.info(f"Output directory: {albums_dir}")
        
        logger.info("\n📊 Album breakdown:")
        for person, photo_count in search_results.items():
            logger.info(f"   {person}: {len(photo_count)} photos")
        
        # Show statistics
        face_service.print_statistics()
        
        logger.info(f"\n💾 Test files created in:")
        logger.info(f"   📁 References: {Path(reference_paths[0]).parent}")
        logger.info(f"   📁 Events: {Path(event_paths[0]).parent}")
        logger.info(f"   📁 Albums: {albums_dir}")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Pipeline test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_api_endpoints():
    """Test that backend router can be imported"""
    logger.info("\n" + "="*60)
    logger.info("🌐 TESTING API ROUTER IMPORT") 
    logger.info("="*60)
    
    try:
        from backend.routers.album_builder import router, get_preprocessor, get_face_service
        
        logger.info("✅ Router imported successfully")
        
        # Test service initialization
        preprocessor = get_preprocessor()
        face_service = get_face_service() 
        
        logger.info(f"   ✅ Preprocessor: {type(preprocessor).__name__}")
        logger.info(f"   ✅ Face service: {type(face_service).__name__}")
        
        # Check router endpoints
        route_count = len(router.routes)
        logger.info(f"   📡 API endpoints: {route_count} routes")
        
        endpoint_names = []
        for route in router.routes:
            if hasattr(route, 'path'):
                endpoint_names.append(f"{route.methods} {route.path}")
        
        logger.info("   📡 Available endpoints:")
        for endpoint in sorted(endpoint_names):
            logger.info(f"      {endpoint}")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ API router test failed: {e}")
        return False


def main():
    """Run all tests"""
    logger.info("🧪 ALBUM BUILDER FRESH IMPLEMENTATION TEST")
    logger.info("=" * 60)
    
    start_time = time.time()
    
    # Test components  
    tests = [
        ("Preprocessing", test_preprocessing),
        ("Face Recognition", test_face_recognition),
        ("API Router", test_api_endpoints),
        ("Full Pipeline", test_full_pipeline)
    ]
    
    results = {}
    
    for test_name, test_func in tests:
        logger.info(f"\n🧪 Running {test_name} test...")
        try:
            result = test_func()
            results[test_name] = result
            
            if result:
                logger.info(f"✅ {test_name} test: PASSED")
            else:
                logger.info(f"❌ {test_name} test: FAILED")
                
        except Exception as e:
            logger.error(f"❌ {test_name} test crashed: {e}")
            results[test_name] = False
    
    # Summary
    total_time = time.time() - start_time
    
    logger.info("\n" + "="*60)
    logger.info("📊 TEST SUMMARY")
    logger.info("="*60)
    
    passed = sum(1 for result in results.values() if result)
    total = len(results)
    
    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        logger.info(f"{status} {test_name}")
    
    logger.info("-" * 60)
    logger.info(f"Results: {passed}/{total} tests passed")
    logger.info(f"Time: {total_time:.2f} seconds")
    
    if passed == total:
        logger.info("🎉 ALL TESTS PASSED! Album Builder is ready.")
        return 0
    else:
        logger.info("⚠️ Some tests failed. Check logs above.")
        return 1


if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)