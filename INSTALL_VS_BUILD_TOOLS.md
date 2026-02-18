# 🛠️ Visual Studio Build Tools Installation Guide

## Why You Need This

InsightFace 0.7.3 requires C++ compiler to install on Windows. This guide will help you install it correctly.

---

## ⏱️ Time Required: 30-45 minutes

- Download: 5 minutes
- Installation: 20-30 minutes
- InsightFace install: 5-10 minutes

---

## 📥 Step 1: Download Build Tools

**Link:** https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022

1. Scroll to "Tools for Visual Studio"
2. Click **"Build Tools for Visual Studio 2022"**
3. Download `vs_BuildTools.exe` (~4MB)

---

## 🔧 Step 2: Install Build Tools

### Run the installer

1. Double-click `vs_BuildTools.exe`
2. Wait for the Visual Studio Installer to load

### Select Components

**IMPORTANT:** Only select these to save disk space:

#### Workloads Tab:
✅ **Desktop development with C++**

#### Individual Components Tab (should auto-select):
✅ MSVC v143 - VS 2022 C++ x64/x86 build tools (Latest)
✅ Windows 11 SDK (10.0.22621.0) OR Windows 10 SDK
✅ C++ CMake tools for Windows

### Install Location
- Default: `C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools`
- Disk space needed: **~6GB**

### Click "Install"
- Takes 20-30 minutes
- Requires internet connection

---

## ✅ Step 3: Verify Installation

Open **NEW PowerShell window** (important - must restart terminal):

```powershell
cl
```

**Expected output:**
```
Microsoft (R) C/C++ Optimizing Compiler ...
```

If you see this, C++ compiler is installed! ✅

---

## 📦 Step 4: Uninstall Old InsightFace

```powershell
cd BookYourShoot
pip uninstall insightface -y
```

---

## 🚀 Step 5: Install InsightFace 0.7.3

```powershell
pip install insightface==0.7.3 onnxruntime
```

**This will:**
- Download InsightFace source code
- **Compile C++ extensions** (takes 5-10 minutes)
- Install the package

You'll see compilation output - this is normal!

---

## 🧪 Step 6: Test It Works

```powershell
python test_insightface_standalone.py
```

**Expected output:**
```
[1/5] Testing imports...
✅ All imports successful

[2/5] Initializing InsightFace model...
   (This will download ~300MB on first run)
✅ InsightFace model loaded successfully

[3/5] Checking test images...
✅ Test images found

[4/5] Extracting face embeddings...
✅ Reference embedding extracted

[5/5] Comparing faces...
Face #1: Similarity = 0.8542 | ✅ MATCH
```

---

## ❌ Troubleshooting

### Error: "cl.exe not found"
- Close ALL PowerShell/terminal windows
- Open NEW PowerShell
- Try again

### Error: "Failed building wheel"
- Verify C++ tools installed: Run `cl` command
- Check disk space (need 10GB free)
- Restart computer

### Error: "No module named 'insightface.app'"
- Wrong version installed
- Run: `pip list | Select-String insightface`
- Should show version 0.7.3
- If not: `pip uninstall insightface -y` and reinstall

---

## 📞 Need Help?

If stuck, tell me:
1. Which step failed?
2. Full error message (copy-paste)
3. Output of: `pip list | Select-String "insightface|onnx"`

---

## ⏭️ After Installation Works

Run this to continue with album builder:

```powershell
python test_insightface_standalone.py
```

Once this passes, your album builder backend is ready! ✅
