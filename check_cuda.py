#!/usr/bin/env python3
"""
Quick diagnostic script to verify PyTorch CUDA installation
Run this to see why GPU might not be detected
"""

import sys

print("=" * 70)
print("PyTorch CUDA Diagnostic Report")
print("=" * 70)

try:
    import torch
    print(f"✅ PyTorch installed: {torch.__version__}")
except ImportError as e:
    print(f"❌ PyTorch not installed: {e}")
    sys.exit(1)

# Check CUDA availability
print(f"\n📍 CUDA Status:")
print(f"   - torch.cuda.is_available(): {torch.cuda.is_available()}")
print(f"   - torch.version.cuda: {torch.version.cuda}")
print(f"   - CUDNN version: {torch.backends.cudnn.version()}")

if not torch.cuda.is_available():
    print("\n❌ CUDA is NOT available")
    print("\n🔧 Troubleshooting steps:")
    print("   1. Check if NVIDIA driver is installed:")
    print("      Run: nvidia-smi")
    print("")
    print("   2. Your setup info:")
    print(f"      - Python: {sys.version}")
    print(f"      - PyTorch build: {torch.__version__}")
    print("")
    print("   3. Try reinstalling PyTorch with correct CUDA version:")
    print("      CUDA 13.1 requires cu118 (latest compatible)")
    print("      Run: pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118 --upgrade --force-reinstall")
    print("")
    print("   4. Verify installation:")
    print("      python -c 'import torch; print(torch.cuda.is_available())'")
else:
    print("\n✅ CUDA is AVAILABLE")
    print(f"\n📊 GPU Details:")
    print(f"   - Device Count: {torch.cuda.device_count()}")
    
    for i in range(torch.cuda.device_count()):
        print(f"\n   GPU {i}:")
        print(f"      - Name: {torch.cuda.get_device_name(i)}")
        print(f"      - Capability: {torch.cuda.get_device_capability(i)}")
        
        # Memory info
        props = torch.cuda.get_device_properties(i)
        total_memory = props.total_memory / 1e9
        print(f"      - Total Memory: {total_memory:.2f} GB")
    
    # Test tensor on GPU
    print(f"\n🧪 GPU Tensor Test:")
    try:
        x = torch.randn(1000, 1000).cuda()
        y = torch.randn(1000, 1000).cuda()
        z = torch.matmul(x, y)
        print(f"   ✅ Matrix multiplication on GPU successful!")
        print(f"   Result shape: {z.shape}")
        print(f"   Result device: {z.device}")
    except Exception as e:
        print(f"   ❌ GPU test failed: {e}")

print("\n" + "=" * 70)

# Additional system info
print("\n📋 System Information:")
try:
    import subprocess
    result = subprocess.run(['nvidia-smi', '--query-gpu=index,name,driver_version,memory.total', 
                           '--format=csv,noheader'], 
                          capture_output=True, text=True, timeout=5)
    if result.returncode == 0:
        print("   NVIDIA GPU Status (from nvidia-smi):")
        for line in result.stdout.strip().split('\n'):
            print(f"      {line}")
    else:
        print("   ❌ nvidia-smi not found (NVIDIA driver may not be installed)")
except Exception as e:
    print(f"   ⚠️ Could not run nvidia-smi: {e}")

print("\n" + "=" * 70)
