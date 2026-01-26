"""
Test if AI modules for Smart Album Builder are installed correctly
Now using ResNet-50 instead of face_recognition library
Run this before using Module 6 features
"""

def test_imports():
    print("="*60)
    print("  Smart Album Builder - ResNet-50 Dependency Check")
    print("="*60 + "\n")
    
    all_passed = True
    
    # Test 1: TensorFlow (MOST IMPORTANT)
    try:
        import tensorflow as tf
        print("✅ TensorFlow".ljust(40), f"v{tf.__version__}")
    except ImportError as e:
        print("❌ TensorFlow".ljust(40), "NOT INSTALLED")
        print(f"   Error: {e}")
        print("   Install with: pip install tensorflow")
        all_passed = False
    
    # Test 2: ResNet-50 model
    try:
        from tensorflow.keras.applications.resnet50 import ResNet50
        print("✅ ResNet-50 (Keras)".ljust(40), "available")
    except ImportError as e:
        print("❌ ResNet-50".ljust(40), "NOT AVAILABLE")
        print(f"   Error: {e}")
        all_passed = False
    
    # Test 3: OpenCV
    try:
        import cv2
        print("✅ OpenCV (cv2)".ljust(40), f"v{cv2.__version__}")
    except ImportError as e:
        print("❌ OpenCV (cv2)".ljust(40), "NOT INSTALLED")
        print(f"   Error: {e}")
        all_passed = False
    
    # Test 4: NumPy
    try:
        import numpy as np
        print("✅ NumPy".ljust(40), f"v{np.__version__}")
    except ImportError as e:
        print("❌ NumPy".ljust(40), "NOT INSTALLED")
        print(f"   Error: {e}")
        all_passed = False
    
    # Test 5: scikit-learn (for DBSCAN clustering)
    try:
        import sklearn
        from sklearn.cluster import DBSCAN
        print("✅ scikit-learn (DBSCAN)".ljust(40), f"v{sklearn.__version__}")
    except ImportError as e:
        print("❌ scikit-learn".ljust(40), "NOT INSTALLED")
        print(f"   Error: {e}")
        all_passed = False
    
    # Test 6: MoviePy
    try:
        import moviepy
        from moviepy.editor import ImageClip
        print("✅ MoviePy".ljust(40), "installed")
    except ImportError as e:
        print("❌ MoviePy".ljust(40), "NOT INSTALLED")
        print(f"   Error: {e}")
        all_passed = False
    
    # Test 7: Pillow (image processing)
    try:
        import PIL
        print("✅ Pillow (PIL)".ljust(40), f"v{PIL.__version__}")
    except ImportError as e:
        print("❌ Pillow (PIL)".ljust(40), "NOT INSTALLED")
        print(f"   Error: {e}")
        all_passed = False
    
    print("\n" + "="*60)
    if all_passed:
        print("  ✅ ALL DEPENDENCIES INSTALLED!")
        print("  You're ready to use ResNet-50 Smart Album Builder")
    else:
        print("  ❌ SOME DEPENDENCIES ARE MISSING")
        print("  Install them with:")
        print("     pip install tensorflow scikit-learn moviepy opencv-python")
    print("="*60)
    
    return all_passed


def test_resnet50_load():
    """Test if ResNet-50 model actually loads"""
    print("\n" + "="*60)
    print("  Testing ResNet-50 Model Loading...")
    print("="*60 + "\n")
    
    try:
        from tensorflow.keras.applications.resnet50 import ResNet50
        
        print("Loading ResNet-50 pre-trained weights from ImageNet...")
        model = ResNet50(weights='imagenet', include_top=False, pooling='avg')
        print(f"✅ Model loaded successfully!")
        print(f"   Input shape: {model.input_shape}")
        print(f"   Output shape: {model.output_shape}")
        print(f"   Total parameters: {model.count_params():,}")
        
        return True
        
    except Exception as e:
        print(f"❌ ResNet-50 loading failed: {e}")
        return False


if __name__ == "__main__":
    imports_ok = test_imports()
    
    if imports_ok:
        model_ok = test_resnet50_load()
        
        if model_ok:
            print("\n🎉 READY FOR FYP!")
            print("   Architecture: ResNet-50 CNN (50 layers)")
            print("   Pre-trained: ImageNet (1.2M images, 1000 classes)")
            print("   Face embeddings: 2048-dimensional feature vectors")
            print("   Clustering: DBSCAN (density-based)")
    
    print("\n📝 Next Steps:")
    print("   1. Start backend: ./start-backend.ps1")
    print("   2. Test upload: POST /api/albums/smart/upload")
    print("   3. Check Swagger: http://localhost:8000/docs")
