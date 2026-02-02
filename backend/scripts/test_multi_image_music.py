"""
Test script for Multi-Image Music Suggestion endpoint
Tests the new /api/music/suggest-from-images endpoint

Run after starting backend server:
python backend/scripts/test_multi_image_music.py
"""

import requests
import sys
from pathlib import Path

# Test configuration
BACKEND_URL = "http://localhost:8000"
TEST_IMAGES_DIR = Path("backend/test_images")  # Create this folder and add test images

def test_multi_image_endpoint():
    """Test the multi-image music suggestion endpoint"""
    
    print("=" * 70)
    print("🎵 TESTING MULTI-IMAGE MUSIC SUGGESTION ENDPOINT")
    print("=" * 70)
    
    # Check if test images directory exists
    if not TEST_IMAGES_DIR.exists():
        print(f"\n⚠️  Test images directory not found: {TEST_IMAGES_DIR}")
        print("Creating directory and instructions...\n")
        TEST_IMAGES_DIR.mkdir(parents=True, exist_ok=True)
        
        instructions = """
📁 Please add test images to: backend/test_images/

Recommended test images:
- 3-5 mehndi ceremony photos (yellow decorations, henna)
- 2-3 barat photos (red bridal dress, groom with turban)
- 2-3 walima photos (formal wedding portraits)

Then run this script again.
"""
        print(instructions)
        return
    
    # Find test images
    image_files = list(TEST_IMAGES_DIR.glob("*.jpg")) + \
                  list(TEST_IMAGES_DIR.glob("*.jpeg")) + \
                  list(TEST_IMAGES_DIR.glob("*.png"))
    
    if not image_files:
        print(f"\n⚠️  No images found in {TEST_IMAGES_DIR}")
        print("Please add at least 1 test image (.jpg, .jpeg, or .png)")
        return
    
    # Limit to 10 images for testing
    image_files = image_files[:10]
    
    print(f"\n📸 Found {len(image_files)} test images:")
    for img in image_files:
        print(f"   - {img.name}")
    
    # Prepare multipart form data
    files = []
    for img_path in image_files:
        files.append(('images', (img_path.name, open(img_path, 'rb'), 'image/jpeg')))
    
    print(f"\n🚀 Sending request to {BACKEND_URL}/api/music/suggest-from-images...")
    
    try:
        # Make request
        response = requests.post(
            f"{BACKEND_URL}/api/music/suggest-from-images",
            files=files,
            timeout=60  # 60 seconds timeout for processing
        )
        
        # Close file handles
        for _, (_, file_obj, _) in files:
            file_obj.close()
        
        # Check response
        if response.status_code == 200:
            data = response.json()
            
            print("\n✅ SUCCESS! Analysis complete.\n")
            print("=" * 70)
            print("📊 ANALYSIS RESULTS")
            print("=" * 70)
            
            analysis = data.get("analysis", {})
            print(f"Total images uploaded:    {analysis.get('total_images_uploaded')}")
            print(f"Successfully analyzed:    {analysis.get('successfully_analyzed')}")
            print(f"\n🎯 Detected Event Type:   {analysis.get('aggregate_event_type').upper()}")
            print(f"   Confidence:            {analysis.get('confidence_percentage')}")
            
            print("\n📈 All Event Votes (confidence-weighted):")
            for event, score in analysis.get('all_event_votes', {}).items():
                bar = "█" * int(score * 50)
                print(f"   {event:12s} {bar} {score:.2f}")
            
            print("\n🔍 Individual Image Predictions:")
            for pred in analysis.get('individual_predictions', [])[:5]:  # Show first 5
                print(f"   Image {pred['image_index']}: {pred['detected_event']} ({pred['confidence']:.2f})")
            
            music = data.get("music_suggestions", {})
            print(f"\n🎵 Music Suggestions:")
            print(f"   Found {music.get('total_tracks')} tracks for '{music.get('event_type')}'")
            
            print("\n🎼 Top 5 Recommended Tracks:")
            for idx, track in enumerate(music.get('tracks', [])[:5], 1):
                print(f"   {idx}. {track['title']} - {track['artist']}")
            
            print("\n" + "=" * 70)
            print("✅ TEST PASSED - Multi-image endpoint working correctly!")
            print("=" * 70)
            
        else:
            print(f"\n❌ ERROR: HTTP {response.status_code}")
            print(f"Response: {response.text}")
    
    except requests.exceptions.ConnectionError:
        print(f"\n❌ ERROR: Could not connect to backend at {BACKEND_URL}")
        print("Make sure the backend server is running:")
        print("   PowerShell: .\\start-backend.ps1")
        print("   Or: uvicorn backend.main:app --reload")
    
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    test_multi_image_endpoint()
