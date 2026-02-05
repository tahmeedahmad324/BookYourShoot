"""
Quick test script for Album Builder
"""

import subprocess
import sys

PYTHON312 = r"C:\Users\hp\AppData\Local\Programs\Python\Python312\python.exe"

tests = [
    ("Face Recognition Service", "backend/services/album_builder/face_recognition_service.py"),
]

print("=" * 60)
print("Album Builder Module - Test Suite")
print("=" * 60)
print()

for test_name, script_path in tests:
    print(f"Testing: {test_name}...")
    try:
        result = subprocess.run(
            [PYTHON312, script_path],
            capture_output=True,
            text=True,
            timeout=30
        )
        
        if result.returncode == 0:
            print(f"✅ {test_name}: PASSED")
            if result.stdout:
                print(f"   Output: {result.stdout.strip()[:200]}")
        else:
            print(f"❌ {test_name}: FAILED")
            if result.stderr:
                print(f"   Error: {result.stderr.strip()[:200]}")
    except subprocess.TimeoutExpired:
        print(f"⏱️  {test_name}: TIMEOUT")
    except Exception as e:
        print(f"❌ {test_name}: ERROR - {str(e)}")
    print()

print("=" * 60)
print("Test suite completed!")
print("=" * 60)
