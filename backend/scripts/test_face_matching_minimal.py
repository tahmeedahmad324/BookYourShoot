"""
MINIMAL FACE MATCHING TEST
Run this FIRST before anything else!

Tests if the system can recognize ONE person in TWO images.
If this fails, nothing else will work.

USAGE:
1. Put two photos of the SAME person in backend/scripts/test_images/
   - Name them: ref.jpg (reference) and event.jpg (test photo)
   - Make sure ref.jpg has ONE clear face
2. Run: python backend/scripts/test_face_matching_minimal.py
3. Check the similarity score

EXPECTED RESULTS:
- Similarity 0.65 - 0.85 → SAME person ✅
- Similarity 0.5 - 0.65  → Maybe same (borderline)
- Similarity < 0.5       → Different person ❌
"""

import cv2
import numpy as np
import sys
import os
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from services.album_builder.insightface_service import InsightFaceService


def test_minimal_matching():
    """Absolute minimum test: Can we match ONE person in TWO images?"""
    
    print("\n" + "="*60)
    print("🔬 MINIMAL FACE MATCHING TEST")
    print("="*60)
    
    # Setup test directory
    test_dir = Path(__file__).parent / "test_images"
    test_dir.mkdir(exist_ok=True)
    
    ref_path = test_dir / "ref.jpg"
    event_path = test_dir / "event.jpg"
    
    # Check if test images exist
    if not ref_path.exists() or not event_path.exists():
        print("\n❌ TEST IMAGES NOT FOUND!")
        print(f"\nPlease create: {test_dir}")
        print("And add:")
        print("  - ref.jpg   (clear photo of person)")
        print("  - event.jpg (photo with same person)")
        print("\nThen run this script again.")
        return False
    
    print(f"\n✅ Test images found:")
    print(f"   Reference: {ref_path.name}")
    print(f"   Event:     {event_path.name}")
    
    # Initialize InsightFace
    print(f"\n📦 Loading InsightFace (ArcFace, CPU)...")
    try:
        service = InsightFaceService(similarity_threshold=0.6)
        print("✅ InsightFace loaded")
    except Exception as e:
        print(f"❌ Failed to load InsightFace: {e}")
        print("\nInstall with: pip install insightface onnxruntime")
        return False
    
    # Step 1: Extract reference embedding
    print(f"\n🔍 Step 1: Extracting face from reference photo...")
    ref_embedding = service.get_face_encoding(str(ref_path), strict=True, visualize=True)
    
    if ref_embedding is None:
        print("❌ FAILED: No valid face in reference photo")
        print("\nTroubleshooting:")
        print("  - Make sure ref.jpg has ONE clear face")
        print("  - Face should be front-facing")
        print("  - Good lighting, no filters")
        print("  - Check ref_debug.jpg to see what was detected")
        return False
    
    print(f"✅ Reference embedding extracted (512-D vector)")
    print(f"   Embedding shape: {ref_embedding.shape}")
    print(f"   Embedding norm: {np.linalg.norm(ref_embedding):.3f}")
    
    # Step 2: Search in event photo
    print(f"\n🔍 Step 2: Searching for person in event photo...")
    found, similarity, num_faces = service.find_person_in_photo(
        ref_embedding, 
        str(event_path),
        person_name="Test Person",
        debug=True
    )
    
    # Step 3: Results
    print(f"\n" + "="*60)
    print("📊 RESULTS")
    print("="*60)
    print(f"Faces detected in event photo: {num_faces}")
    print(f"Best similarity score:         {similarity:.3f}")
    print(f"Match found (threshold=0.6):   {found}")
    
    # Interpretation
    print(f"\n💡 INTERPRETATION:")
    if similarity >= 0.65:
        print(f"   ✅ EXCELLENT MATCH (same person)")
    elif similarity >= 0.6:
        print(f"   ✅ GOOD MATCH (same person)")
    elif similarity >= 0.5:
        print(f"   ⚠️  BORDERLINE (maybe same person, lower threshold to 0.55)")
    elif similarity >= 0.4:
        print(f"   ❌ WEAK MATCH (likely different person)")
    else:
        print(f"   ❌ NO MATCH (different person)")
    
    # Recommendations
    print(f"\n📋 RECOMMENDATIONS:")
    if not found:
        if similarity >= 0.55:
            print(f"   → Lower threshold to 0.55 or 0.58")
        elif similarity >= 0.4:
            print(f"   → Check reference photo quality")
            print(f"   → Use multiple reference photos (averaged)")
        else:
            print(f"   → Photos are of different people")
            print(f"   → OR: Very poor photo quality/lighting")
    else:
        print(f"   ✅ System working correctly!")
        print(f"   → Ready for album building")
    
    # Check debug images
    ref_debug = ref_path.parent / f"{ref_path.stem}_debug{ref_path.suffix}"
    if ref_debug.exists():
        print(f"\n🖼️  Check debug images:")
        print(f"   {ref_debug}")
    
    print(f"\n" + "="*60)
    return found


if __name__ == "__main__":
    try:
        success = test_minimal_matching()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n⚠️  Test interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ TEST FAILED WITH ERROR:")
        print(f"   {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
