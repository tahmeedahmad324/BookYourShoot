"""
SAFE, WORKING ALBUM CREATION LOGIC
Use this after the minimal test passes

FOLDER STRUCTURE:
backend/scripts/test_images/
  ├── references/
  │   ├── ali.jpg
  │   └── sara.jpg
  └── event_photos/
      ├── photo1.jpg
      ├── photo2.jpg
      └── ...

OUTPUT:
backend/scripts/albums/
  ├── Ali/
  │   └── [photos with Ali]
  ├── Sara/
  │   └── [photos with Sara]
  └── Unknown/
      └── [photos without recognized faces]
"""

import cv2
import numpy as np
import sys
import os
import shutil
from pathlib import Path
from typing import Dict

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from services.album_builder.insightface_service import InsightFaceService


def create_albums(
    references_dir: Path,
    event_photos_dir: Path,
    output_dir: Path,
    threshold: float = 0.6,
    debug: bool = False
):
    """
    Create personalized albums from event photos
    
    Args:
        references_dir: Folder with reference photos (named after people)
        event_photos_dir: Folder with event photos to search
        output_dir: Where to save albums
        threshold: Similarity threshold (0.58-0.65 recommended)
        debug: Enable detailed logging
    """
    
    print("\n" + "="*70)
    print("🎨 ALBUM BUILDER - PRODUCTION VERSION")
    print("="*70)
    
    # Validate inputs
    if not references_dir.exists():
        print(f"❌ References folder not found: {references_dir}")
        return False
    
    if not event_photos_dir.exists():
        print(f"❌ Event photos folder not found: {event_photos_dir}")
        return False
    
    # Initialize InsightFace
    print(f"\n📦 Loading InsightFace...")
    try:
        service = InsightFaceService(similarity_threshold=threshold)
        print(f"✅ InsightFace loaded (threshold={threshold})")
    except Exception as e:
        print(f"❌ Failed: {e}")
        return False
    
    # STEP 1: Process reference photos
    print(f"\n" + "-"*70)
    print("STEP 1: PROCESSING REFERENCE PHOTOS")
    print("-"*70)
    
    reference_embeddings: Dict[str, np.ndarray] = {}
    ref_photos = list(references_dir.glob("*.jpg")) + list(references_dir.glob("*.png"))
    
    if len(ref_photos) == 0:
        print(f"❌ No reference photos found in {references_dir}")
        return False
    
    print(f"Found {len(ref_photos)} reference photo(s)")
    
    for ref_photo in ref_photos:
        person_name = ref_photo.stem  # Filename without extension
        print(f"\n👤 Processing: {person_name}")
        print(f"   File: {ref_photo.name}")
        
        # Extract embedding with strict validation
        embedding = service.get_face_encoding(
            str(ref_photo),
            strict=True,
            visualize=debug  # Save debug image
        )
        
        if embedding is None:
            print(f"   ⚠️  SKIPPED: No valid face detected")
            print(f"   → Use a clear, single-person photo")
            continue
        
        reference_embeddings[person_name] = embedding
        print(f"   ✅ Embedding extracted")
    
    if len(reference_embeddings) == 0:
        print(f"\n❌ No valid reference embeddings extracted")
        print(f"Check your reference photos:")
        print(f"  ✅  Single person photo")
        print(f"  ✅  Clear face, front-facing")
        print(f"  ✅  Good lighting")
        print(f"  ❌  No group photos")
        print(f"  ❌  No heavy filters")
        return False
    
    print(f"\n✅ {len(reference_embeddings)} person(s) ready: {list(reference_embeddings.keys())}")
    
    # STEP 2: Search event photos
    print(f"\n" + "-"*70)
    print("STEP 2: SEARCHING EVENT PHOTOS")
    print("-"*70)
    
    event_photos = list(event_photos_dir.glob("*.jpg")) + list(event_photos_dir.glob("*.png"))
    print(f"Found {len(event_photos)} event photo(s)")
    
    if len(event_photos) == 0:
        print(f"❌ No photos to search")
        return False
    
    # Initialize albums
    albums = {person: [] for person in reference_embeddings.keys()}
    albums["Unknown"] = []
    
    # Search each photo
    for i, photo_path in enumerate(event_photos, 1):
        if debug:
            print(f"\n[{i}/{len(event_photos)}] {photo_path.name}")
        elif i % 10 == 0:
            print(f"   Progress: {i}/{len(event_photos)} photos")
        
        try:
            # Load and preprocess
            img = cv2.imread(str(photo_path))
            if img is None:
                if debug:
                    print(f"   ⚠️  Could not load image")
                continue
            
            # Detect all faces
            faces = service.face_app.get(img)
            
            if len(faces) == 0:
                if debug:
                    print(f"   No faces detected")
                albums["Unknown"].append(photo_path)
                continue
            
            # Check each person
            matched_people = set()
            
            for person_name, ref_embedding in reference_embeddings.items():
                # Check ALL faces in photo
                best_similarity = 0.0
                
                for face in faces:
                    if face.det_score < 0.4:  # Skip very low quality
                        continue
                    
                    # Normalize embedding
                    face_emb = face.embedding / np.linalg.norm(face.embedding)
                    
                    # Calculate similarity
                    similarity = np.dot(ref_embedding, face_emb)
                    best_similarity = max(best_similarity, similarity)
                    
                    if debug:
                        print(f"      {person_name}: {similarity:.3f}")
                    
                    # Check threshold
                    if similarity >= threshold:
                        matched_people.add(person_name)
                        break
            
            # Add to albums
            if matched_people:
                for person in matched_people:
                    albums[person].append(photo_path)
                if debug:
                    print(f"   ✅ Matched: {', '.join(matched_people)}")
            else:
                albums["Unknown"].append(photo_path)
                if debug:
                    print(f"   ❌ No match (best: {best_similarity:.3f})")
        
        except Exception as e:
            print(f"   ❌ Error: {e}")
            continue
    
    # STEP 3: Create album folders
    print(f"\n" + "-"*70)
    print("STEP 3: CREATING ALBUM FOLDERS")
    print("-"*70)
    
    # Clear output dir
    if output_dir.exists():
        shutil.rmtree(output_dir)
    output_dir.mkdir(parents=True)
    
    # Create folders and copy photos
    total_organized = 0
    
    for person_name, photos in albums.items():
        if len(photos) == 0:
            continue
        
        # Create person folder
        person_folder = output_dir / person_name
        person_folder.mkdir(exist_ok=True)
        
        # Copy photos
        for photo_path in photos:
            dest = person_folder / photo_path.name
            shutil.copy2(photo_path, dest)
        
        total_organized += len(photos)
        print(f"✅ {person_name}: {len(photos)} photos")
    
    # Print statistics
    print(f"\n" + "="*70)
    print("📊 FINAL STATISTICS")
    print("="*70)
    service.print_statistics()
    
    print(f"Total event photos:    {len(event_photos)}")
    print(f"Photos organized:      {total_organized}")
    print(f"Unknown photos:        {len(albums['Unknown'])}")
    print(f"\n✅ Albums saved to: {output_dir}")
    
    return True


def main():
    """Run album builder with default paths"""
    
    # Setup paths
    script_dir = Path(__file__).parent
    test_dir = script_dir / "test_images"
    
    references_dir = test_dir / "references"
    event_photos_dir = test_dir / "event_photos"
    output_dir = script_dir / "albums"
    
    # Create directories if they don't exist
    references_dir.mkdir(parents=True, exist_ok=True)
    event_photos_dir.mkdir(parents=True, exist_ok=True)
    
    print("\n📁 FOLDER STRUCTURE:")
    print(f"References:    {references_dir}")
    print(f"Event Photos:  {event_photos_dir}")
    print(f"Output Albums: {output_dir}")
    
    # Check if setup is ready
    ref_count = len(list(references_dir.glob("*.jpg"))) + len(list(references_dir.glob("*.png")))
    event_count = len(list(event_photos_dir.glob("*.jpg"))) + len(list(event_photos_dir.glob("*.png")))
    
    if ref_count == 0:
        print(f"\n⚠️  NO REFERENCE PHOTOS FOUND")
        print(f"\nAdd reference photos to: {references_dir}")
        print(f"  Example: ali.jpg, sara.jpg, ahmed.jpg")
        print(f"  ✅ One person per photo")
        print(f"  ✅ Clear, front-facing")
        return
    
    if event_count == 0:
        print(f"\n⚠️  NO EVENT PHOTOS FOUND")
        print(f"\nAdd event photos to: {event_photos_dir}")
        return
    
    # Run album builder
    try:
        success = create_albums(
            references_dir=references_dir,
            event_photos_dir=event_photos_dir,
            output_dir=output_dir,
            threshold=0.6,  # Adjust if needed (0.58-0.65)
            debug=False     # Set True for detailed logs
        )
        
        if success:
            print(f"\n✅ ALBUM BUILDING COMPLETE!")
        else:
            print(f"\n❌ ALBUM BUILDING FAILED")
    
    except KeyboardInterrupt:
        print(f"\n\n⚠️  Interrupted by user")
    except Exception as e:
        print(f"\n\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
