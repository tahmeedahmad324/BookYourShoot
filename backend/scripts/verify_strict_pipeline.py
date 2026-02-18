"""
Verify the NEW STRICT pipeline is correctly implemented
Run this to see what changed and test if it works
"""

def check_code_changes():
    """Verify the code changes were applied"""
    print("="*70)
    print("  VERIFYING NEW STRICT PIPELINE IMPLEMENTATION")
    print("="*70 + "\n")
    
    checks_passed = 0
    checks_total = 0
    
    # Check 1: Threshold in face recognition service
    print("📋 Check 1: Strict Threshold (0.78)")
    try:
        with open("backend/services/album_face_recognition.py", "r", encoding="utf-8") as f:
            content = f.read()
            if "similarity_threshold: float = 0.78" in content:
                print("   ✅ PASS - Threshold set to 0.78 (STRICT)")
                checks_passed += 1
            elif "similarity_threshold: float = 0.6" in content:
                print("   ❌ FAIL - Still using old threshold 0.6")
            else:
                print("   ⚠️  WARNING - Could not find threshold setting")
    except Exception as e:
        print(f"   ❌ Error reading file: {e}")
    checks_total += 1
    
    # Check 2: No embedding averaging
    print("\n📋 Check 2: No Embedding Averaging")
    try:
        with open("backend/services/album_face_recognition.py", "r", encoding="utf-8") as f:
            content = f.read()
            if "STRICT MODE: Expected 1 reference photo" in content:
                print("   ✅ PASS - Single reference photo enforcement")
                checks_passed += 1
            else:
                print("   ❌ FAIL - Still allows multiple photos per person")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    checks_total += 1
    
    # Check 3: Strict face validation (reject multiple faces)
    print("\n📋 Check 3: Strict Reference Validation")
    try:
        with open("backend/services/album_face_recognition.py", "r", encoding="utf-8") as f:
            content = f.read()
            if "REJECTED: Multiple faces" in content and "return None" in content:
                print("   ✅ PASS - Rejects reference photos with multiple faces")
                checks_passed += 1
            else:
                print("   ❌ FAIL - Still accepts multiple faces in reference")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    checks_total += 1
    
    # Check 4: No OpenCV fallback
    print("\n📋 Check 4: No OpenCV Fallback")
    try:
        with open("backend/routers/album_builder.py", "r", encoding="utf-8") as f:
            content = f.read()
            if "InsightFace required" in content and "no fallback allowed" in content:
                print("   ✅ PASS - InsightFace ONLY (no OpenCV fallback)")
                checks_passed += 1
            elif "OpenCVFaceRecognitionService" in content:
                print("   ❌ FAIL - Still has OpenCV fallback")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    checks_total += 1
    
    # Check 5: Debug mode enabled
    print("\n📋 Check 5: Debug Logging Enabled")
    try:
        with open("backend/routers/album_builder.py", "r", encoding="utf-8") as f:
            content = f.read()
            if "debug=True" in content:
                print("   ✅ PASS - Debug logging enabled (you'll see similarity scores)")
                checks_passed += 1
            else:
                print("   ⚠️  WARNING - Debug mode not enabled (won't see match details)")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    checks_total += 1
    
    # Check 6: 1:1 photo assignment
    print("\n📋 Check 6: One-to-One Photo Assignment")
    try:
        with open("backend/routers/album_builder.py", "r", encoding="utf-8") as f:
            content = f.read()
            if "STRICT MODE: Upload exactly" in content:
                print("   ✅ PASS - Enforces 1 photo per person")
                checks_passed += 1
            elif "photos_per_person" in content and "distribute evenly" in content:
                print("   ❌ FAIL - Still using auto-distribution")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    checks_total += 1
    
    # Summary
    print("\n" + "="*70)
    print(f"  RESULTS: {checks_passed}/{checks_total} checks passed")
    print("="*70 + "\n")
    
    if checks_passed == checks_total:
        print("🎉 ALL CHECKS PASSED!")
        print("   The STRICT pipeline is correctly implemented.")
        print("\n📝 Next Steps:")
        print("   1. Install InsightFace: pip install insightface onnxruntime")
        print("   2. Start backend: cd backend && python -m uvicorn main:app --reload")
        print("   3. Test with Album Builder UI")
        print("   4. Watch logs for similarity scores (should be 0.75-0.90 for matches)")
        return True
    else:
        print("⚠️  SOME CHECKS FAILED")
        print("   Review the failed checks above")
        return False


def test_insightface():
    """Test if InsightFace is installed and working"""
    print("\n" + "="*70)
    print("  TESTING INSIGHTFACE INSTALLATION")
    print("="*70 + "\n")
    
    try:
        print("📦 Importing InsightFace...")
        from insightface.app import FaceAnalysis
        import onnxruntime
        import insightface
        print(f"   ✅ InsightFace imported successfully")
        print(f"   ✅ InsightFace version: {getattr(insightface, '__version__', 'unknown')}")
        print(f"   ✅ ONNX Runtime version: {onnxruntime.__version__}")
        
        print("\n🔧 Initializing face detection model...")
        # Compatible with InsightFace 0.2.1 (doesn't support providers argument)
        app = FaceAnalysis(name="buffalo_l")
        app.prepare(ctx_id=0, det_size=(640, 640))
        print("   ✅ Model initialized successfully")
        
        print("\n🎉 INSIGHTFACE IS READY!")
        print("   You can now use the strict face recognition pipeline")
        return True
        
    except ImportError as e:
        print(f"   ❌ ImportError: {e}")
        print("\n📝 To install:")
        print("   pip install insightface onnxruntime opencv-python")
        return False
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False


def show_key_differences():
    """Show what changed from old to new pipeline"""
    print("\n" + "="*70)
    print("  KEY DIFFERENCES: OLD vs NEW PIPELINE")
    print("="*70 + "\n")
    
    differences = [
        ("Similarity Threshold", "0.55 (too lenient)", "0.78 (strict)", "Prevents random matches"),
        ("Reference Photos", "Multiple per person", "1 per person", "No mixed embeddings"),
        ("Embedding Method", "Averaged", "Single clean", "Deterministic matching"),
        ("Face Validation", "Warns about multiple", "Rejects multiple", "Ensures clean reference"),
        ("Fallback Method", "OpenCV histograms", "None (InsightFace only)", "No color-based matching"),
        ("Photo Assignment", "Auto-distribute", "1:1 mapping", "Correct person-photo pairs"),
        ("Match Quality", "55%-60% = match", "78%+ = match", "Only real matches count"),
    ]
    
    print(f"{'Aspect':<20} | {'OLD (Broken)':<25} | {'NEW (Fixed)':<25} | Impact")
    print("-" * 110)
    
    for aspect, old, new, impact in differences:
        print(f"{aspect:<20} | {old:<25} | {new:<25} | {impact}")
    
    print("\n" + "="*70 + "\n")


if __name__ == "__main__":
    # Show what changed
    show_key_differences()
    
    # Verify code changes
    code_ok = check_code_changes()
    
    # Test InsightFace
    if code_ok:
        insightface_ok = test_insightface()
        
        if insightface_ok:
            print("\n" + "="*70)
            print("  ✅ EVERYTHING IS READY!")
            print("="*70)
            print("\n🚀 Start the backend:")
            print("   cd backend")
            print("   python -m uvicorn main:app --reload --port 8000")
            print("\n📖 Test guide: See TEST_NEW_PIPELINE.md")
    else:
        print("\n⚠️  Fix the failed checks and run this script again")
