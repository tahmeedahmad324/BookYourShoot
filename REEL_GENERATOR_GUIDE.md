# 🎬 Reel Generator - AI-Powered Video Creation

## Overview

The **Reel Generator** is a fully automated module that transforms your event photos into professional 30-second video reels using AI-powered photo selection and quality analysis.

---

## ✨ Key Features

### 🤖 AI Photo Selection
- **Sharpness Detection**: Uses Laplacian variance to identify blur
- **Brightness Analysis**: HSV V-channel for optimal lighting
- **Contrast Measurement**: Standard deviation for depth
- **Face Detection**: Haar Cascade for people identification
- **Color Vibrancy**: Saturation analysis for engaging colors

### 🎨 Auto Video Editing
- **Smooth Transitions**: Crossfade between photos
- **Ken Burns Effect**: Subtle zoom animation (1.08x)
- **Color Filters**: Vibrant, vintage, warm, cool, B&W
- **Aspect Ratios**: 9:16 (Reels), 16:9 (YouTube), 1:1 (Instagram)
- **Professional Output**: 1080p HD, 24 FPS, H.264 codec

---

## 🚀 How to Use

### Step 1: Access Reel Generator
1. Login to your account
2. Go to **Client Dashboard**
3. Click on **"Reel Generator"** card

### Step 2: Upload Photos
1. Click the upload zone or drag & drop
2. Select **10-30 event photos** (JPG/PNG)
3. Photos preview in a grid
4. Remove unwanted photos by clicking the ✕ button

### Step 3: Generate Reel
1. Click **"✨ Generate Reel (30 sec)"** button
2. AI analyzes all photos (takes 30-60 seconds)
3. Selects exactly **10 best photos**
4. Applies filters and transitions
5. Renders final 30-second video

### Step 4: Download & Share
1. Preview quality analysis stats
2. Click **"📥 Download Reel"** to save video
3. Click **"🔄 Create Another"** for new reel

---

## 📊 AI Selection Criteria

The AI ranks photos based on **weighted scoring**:

| Metric | Weight | Description |
|--------|--------|-------------|
| **Sharpness** | 25% | Clear, focused photos (Laplacian variance) |
| **Face Score** | 25% | Photos with people (Haar Cascade detection) |
| **Brightness** | 20% | Well-lit photos (optimal: 100-160 on 0-255 scale) |
| **Contrast** | 15% | Dynamic range (standard deviation) |
| **Color Vibrancy** | 15% | Saturated, engaging colors |

**Overall Score**: 0-100 (higher is better)

---

## 🎯 What Makes a Good Reel Photo?

### ✅ High-Scoring Photos
- Sharp focus (no motion blur)
- Well-lit (not too dark/bright)
- Contains faces (people, close-ups)
- Vibrant colors (decorations, food)
- Good composition

### ❌ Low-Scoring Photos
- Blurry or out of focus
- Too dark or overexposed
- Low contrast (flat, washed out)
- Dull colors
- Poor framing

---

## 🎬 Technical Specifications

### Backend (OpenCV + MoviePy)
- **Photo Analysis**: OpenCV 4.x with Haar Cascades
- **Video Generation**: MoviePy 2.2.1 with FFmpeg
- **Quality Metrics**: Scientific CV algorithms
- **Processing Time**: 30-60 seconds for 10-30 photos

### Output Video
- **Resolution**: 1080p HD (1080x1920 for 9:16)
- **Frame Rate**: 24 FPS
- **Codec**: H.264 (libx264)
- **Duration**: 30 seconds (10 photos × 3 sec each)
- **File Size**: ~3-5 MB (medium preset)

---

## 📁 File Structure

```
BookYourShoot/
├── backend/
│   ├── routers/
│   │   └── reels.py                    # API endpoints
│   └── services/
│       ├── reel_generator.py           # Video creation logic
│       └── reel_photo_selector.py      # AI quality analysis
│
├── src/
│   └── pages/
│       └── client/
│           └── ReelGenerator.js        # Frontend UI
│
└── storage/
    └── reels/
        └── generated/
            └── {user_id}/
                └── auto_reel_*.mp4     # Generated videos
```

---

## 🔧 API Endpoints

### `POST /api/reels/generate-auto`
Auto-generates reel with AI selection.

**Request:**
```javascript
FormData:
  - files: [File] (10-30 photos)
  - ratio: "9:16" | "16:9" | "1:1"
  - filter_type: "vibrant" | "vintage" | "warm" | "cool" | "bw"
```

**Response:**
```json
{
  "video_url": "/api/reels/videos/{user_id}/auto_reel_20241222_143022.mp4",
  "duration": 30.0,
  "num_images_uploaded": 15,
  "num_images_selected": 10,
  "aspect_ratio": "9:16",
  "file_size": 4523890,
  "quality_summary": {
    "num_selected": 10,
    "average_quality": 78.5,
    "min_quality": 65.2,
    "max_quality": 92.3,
    "avg_sharpness": 82.1,
    "avg_brightness": 75.4,
    "avg_contrast": 68.9,
    "avg_face_score": 85.6,
    "avg_color_vibrancy": 71.2,
    "photos_with_faces": 8
  },
  "selected_photos_info": [...]
}
```

### `GET /api/reels/videos/{user_id}/{filename}`
Downloads generated video file.

### `GET /api/reels/user-reels`
Lists all reels created by the user.

---

## 🎨 Available Filters

| Filter | Description | Use Case |
|--------|-------------|----------|
| **Vibrant** | +40% saturation, +10% brightness | Events, parties, celebrations |
| **Vintage** | Sepia tone, -15% contrast | Retro, nostalgia, weddings |
| **Warm** | +15% red, +5% green | Sunset, cozy, intimate |
| **Cool** | +15% blue, +5% green | Modern, professional, corporate |
| **B&W** | Grayscale | Artistic, dramatic, portraits |

---

## 🐛 Troubleshooting

### Issue: "Need at least 10 photos"
**Solution**: Upload minimum 10 photos (AI needs variety to select best highlights)

### Issue: "Video generation service unavailable"
**Solution**: 
```bash
pip install moviepy
# MoviePy already installed, FFmpeg bundled via imageio_ffmpeg
```

### Issue: "Failed to generate reel"
**Solution**: 
- Check photo formats (only JPG/PNG)
- Ensure photos aren't corrupted
- Check backend logs for specific error

### Issue: Video won't download
**Solution**: 
- Check browser pop-up blocker
- Try right-click → "Save Link As"
- Verify video URL is accessible

---

## 💡 Tips for Best Results

1. **Upload variety**: Include people, decorations, food, venues
2. **Quality over quantity**: 15-20 good photos better than 30 mediocre
3. **Good lighting**: Well-lit photos score higher
4. **Include faces**: People photos are highlights
5. **Avoid duplicates**: AI might select similar photos

---

## 🎯 Use Cases

- **Wedding Highlights**: Couple, guests, venue, decorations
- **Birthday Parties**: Cake, people, decorations, gifts
- **Corporate Events**: Team, presentations, networking
- **Travel Memories**: Landscapes, activities, group photos
- **Product Launches**: Products, audience, branding

---

## 🚀 Future Enhancements

- [ ] Custom music upload
- [ ] Text overlays (titles, captions)
- [ ] Category detection (food, decorations, people groups)
- [ ] Longer reel options (60 sec, 90 sec)
- [ ] Advanced transitions (slide, zoom, rotate)
- [ ] Social media direct sharing
- [ ] Reel templates (birthday, wedding, corporate)

---

## 📞 Support

For issues or questions:
- Check console logs (F12 in browser)
- Review backend logs (terminal)
- Contact development team

---

**Last Updated**: December 22, 2024  
**Version**: 1.0  
**Status**: ✅ Fully Functional
