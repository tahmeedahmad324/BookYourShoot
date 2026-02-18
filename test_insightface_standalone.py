"""
STANDALONE INSIGHTFACE TEST - NO FASTAPI
Tests face detection and matching in isolation

REQUIREMENTS:
- 2 test images of the SAME person: ref1.jpg and event1.jpg
- Place them in BookYourShoot/test_images/ folder

EXPECTED RESULTS:
- Same person: similarity 0.80-0.95
- Different person: similarity < 0.60
"""

import sys
import os
from pathlib import Path

# Add backend to path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

print("="*60)
print("INSIGHTFACE STANDALONE TEST")
print("="*60)

# Step 1: Import test
print("\n[1/5] Testing imports...")
try:
    from insightface.app import FaceAnalysis
    import cv2
    import numpy as np
    print("✅ All imports successful")
    print(f"   - InsightFace: 0.7.3+ API")
    print(f"   - OpenCV: {cv2.__version__}")
    print(f"   - NumPy: {np.__version__}")
except ImportError as e:
    print(f"❌ Import failed: {e}")
    sys.exit(1)

# Step 2: Initialize InsightFace
print("\n[2/5] Initializing InsightFace model...")
print("   Using: buffalo_l (ArcFace model)")
print("   (This will download ~300MB on first run)")
try:
    app = FaceAnalysis(
        name="buffalo_l",
        providers=["CPUExecutionProvider"]
    )
    app.prepare(ctx_id=0, det_size=(640, 640))
    print("✅ InsightFace model loaded successfully")
except Exception as e:
    print(f"❌ Model initialization failed: {e}")
    print("\nTROUBLESHOOTING:")
    print("1. Check internet connection (needs to download model)")
    print("2. Check disk space (~500MB required)")
    print(f"3. Error details: {type(e).__name__}: {e}")
    print("\nIf error mentions missing modules or compilation:")
    print("   → Install Visual Studio Build Tools first")
    print("   → Then: pip uninstall insightface -y")
    print("   → Then: pip install insightface==0.7.3")
    sys.exit(1)

# Step 3: Check test images
print("\n[3/5] Checking test images...")
test_dir = project_root / "test_images"
ref_image = test_dir / "ref1.jpg"
event_image = test_dir / "event1.jpg"

if not test_dir.exists():
    print(f"❌ Test images folder not found: {test_dir}")
    print("\nCREATE TEST IMAGES:")
    print(f"1. Create folder: {test_dir}")
    print("2. Add 2 images of SAME person:")
    print("   - ref1.jpg (single face, clear)")
    print("   - event1.jpg (can be group photo)")
    sys.exit(1)

if not ref_image.exists() or not event_image.exists():
    print(f"❌ Missing test images in {test_dir}")
    print(f"   - ref1.jpg: {'✅ Found' if ref_image.exists() else '❌ Missing'}")
    print(f"   - event1.jpg: {'✅ Found' if event_image.exists() else '❌ Missing'}")
    sys.exit(1)

print(f"✅ Test images found")
print(f"   - Reference: {ref_image.name}")
print(f"   - Event: {event_image.name}")

# Step 4: Extract embeddings
print("\n[4/5] Extracting face embeddings...")

# Load reference image
img_ref = cv2.imread(str(ref_image))
if img_ref is None:
    print(f"❌ Cannot load {ref_image}")
    sys.exit(1)

faces_ref = app.get(img_ref)
print(f"   Reference image: {len(faces_ref)} face(s) detected")

if len(faces_ref) == 0:
    print("❌ FAILED: No face in reference image")
    print("   REQUIREMENT: Reference must have EXACTLY 1 face")
    sys.exit(1)

if len(faces_ref) > 1:
    print(f"⚠️  WARNING: {len(faces_ref)} faces detected in reference")
    print("   STRICT MODE: Should have exactly 1 face")
    print("   Using largest face...")

# Use largest face
best_face_ref = max(faces_ref, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]))
emb_ref = best_face_ref.embedding / np.linalg.norm(best_face_ref.embedding)
print(f"✅ Reference embedding extracted (quality: {best_face_ref.det_score:.2f})")

# Load event image
img_event = cv2.imread(str(event_image))
if img_event is None:
    print(f"❌ Cannot load {event_image}")
    sys.exit(1)

faces_event = app.get(img_event)
print(f"   Event image: {len(faces_event)} face(s) detected")

if len(faces_event) == 0:
    print("❌ FAILED: No face in event image")
    sys.exit(1)

print(f"✅ Event image processed")

# Step 5: Compare embeddings
print("\n[5/5] Comparing faces (STRICT threshold = 0.78)...")
print("-" * 60)

match_found = False
for i, face_event in enumerate(faces_event):
    emb_event = face_event.embedding / np.linalg.norm(face_event.embedding)
    similarity = np.dot(emb_ref, emb_event)
    
    status = "✅ MATCH" if similarity >= 0.78 else "❌ NO MATCH"
    print(f"Face #{i+1}: Similarity = {similarity:.4f} | {status}")
    
    if similarity >= 0.78:
        match_found = True

print("-" * 60)

# Final result
print("\n" + "="*60)
print("TEST RESULT")
print("="*60)

if match_found:
    print("✅ SUCCESS: Person found in event photo!")
    print("\nINTERPRETATION:")
    print("- Similarity >= 0.78 = SAME PERSON (STRICT mode)")
    print("- Your AI module is working correctly")
else:
    print("❌ FAILED: Person not found in event photo")
    print("\nPOSSIBLE REASONS:")
    print("1. Different people in ref1.jpg and event1.jpg")
    print("2. Poor image quality (blur, low light, occlusion)")
    print("3. Face angle too different (profile vs frontal)")
    print("\nRECOMMENDATION:")
    print("- Use images of SAME person")
    print("- Use clear, front-facing photos")
    print("- Avoid sunglasses, masks, heavy shadows")

print("\n" + "="*60)
print("EXPECTED SIMILARITY RANGES:")
print("- Same person (good): 0.80 - 0.95")
print("- Same person (OK): 0.75 - 0.80")
print("- Different person: < 0.60")
print("- STRICT threshold: 0.78")
print("="*60)
