# Module 6: Smart Album Builder - AI Implementation

## 🎯 Overview
AI-powered photo organization system that converts unstructured photo dumps into intelligent albums using:
- **Face Recognition** (face_recognition + dlib)
- **Face Clustering** (DBSCAN)
- **Quality Scoring** (OpenCV - sharpness & brightness)
- **Video Generation** (MoviePy)

## 📁 Architecture

### File Structure
```
backend/
├── services/
│   ├── album_processor.py      # Core AI logic (face clustering + highlights)
│   └── reel_generator.py       # Video creation from highlights
├── routers/
│   └── albums.py               # API endpoints (/albums/smart/*)
└── storage/
    └── albums/
        └── {user_id}/
            ├── uploads/         # Raw uploaded photos
            └── organized/
                ├── Highlights/  # Best 25 photos
                ├── Person_1/    # Face cluster 1
                ├── Person_2/    # Face cluster 2
                └── _processing_status.txt
```

### Processing Pipeline
```
Upload Photos → AI Processing (parallel) → Organized Albums → Reel Generation
     ↓                ↓                         ↓                    ↓
   /upload    /process (background)         /albums          /generate-reel
```

## 🔄 API Endpoints

### 1. Upload Photos
```http
POST /api/albums/smart/upload
Content-Type: multipart/form-data

files: [file1.jpg, file2.jpg, ...]
```
**Response:**
```json
{
  "success": true,
  "message": "10 photos uploaded successfully",
  "files": ["img1.jpg", "img2.jpg"],
  "next_step": "Call /albums/smart/process"
}
```

### 2. Start AI Processing
```http
POST /api/albums/smart/process
Authorization: Bearer <token>
```
**Response:**
```json
{
  "success": true,
  "message": "AI processing started in background",
  "status": "processing",
  "check_status_at": "/api/albums/smart/status"
}
```

**What Happens:**
- Worker 1: Scans photos, scores quality, creates `Highlights/` folder
- Worker 2: Detects faces, clusters them, creates `Person_X/` folders
- Both run in parallel (threading)

### 3. Check Processing Status
```http
GET /api/albums/smart/status
Authorization: Bearer <token>
```
**Response:**
```json
{
  "success": true,
  "data": {
    "status": "completed",  // not_started | processing | completed | error
    "messages": [
      "=== PROCESSING STARTED ===",
      ">>> [Worker 1] Started: Creating Highlight Album...",
      ">>> [Worker 1] Finished: 25 highlights created.",
      ">>> [Worker 2] Started: Creating Person Albums...",
      ">>> [Worker 2] Finished: 3 Person Albums created.",
      "=== ALL PROCESSING COMPLETE ==="
    ],
    "highlights_ready": true,
    "person_albums_ready": true
  }
}
```

### 4. Get Organized Albums
```http
GET /api/albums/smart/albums
Authorization: Bearer <token>
```
**Response:**
```json
{
  "success": true,
  "data": {
    "highlights": {
      "count": 25,
      "photos": ["img1.jpg", "img2.jpg", ...]
    },
    "persons": {
      "Person_1": {
        "count": 15,
        "photos": ["img3.jpg", "img4.jpg", ...]
      },
      "Person_2": {
        "count": 12,
        "photos": ["img5.jpg", ...]
      }
    },
    "total_albums": 3
  }
}
```

### 5. Check Reel Readiness
```http
GET /api/albums/smart/reel/status
Authorization: Bearer <token>
```
**Response:**
```json
{
  "success": true,
  "data": {
    "ready": true,
    "image_count": 25,
    "message": "Ready to generate reel with 25 photos."
  }
}
```

### 6. Generate Reel
```http
POST /api/albums/smart/generate-reel
Authorization: Bearer <token>
Content-Type: application/json

{
  "duration_per_image": 2.0,
  "transition_type": "crossfade",
  "music_file": "/path/to/music.mp3"  // optional
}
```
**Response:**
```json
{
  "success": true,
  "message": "Reel generated successfully",
  "data": {
    "video_path": "/backend/storage/albums/user123/organized/reel_user123.mp4",
    "duration": 50.0,
    "image_count": 25
  }
}
```

## 🧠 AI Algorithms

### Face Clustering (DBSCAN)
- **Library**: `face_recognition` (FaceNet embeddings) + `scikit-learn`
- **Algorithm**: DBSCAN (Density-Based Spatial Clustering)
- **Parameters**:
  - `eps=0.5`: Distance threshold (lower = stricter matching)
  - `min_samples=3`: Minimum photos to form a cluster
- **Output**: Person_1, Person_2, ... folders

### Quality Scoring (Highlights)
- **Library**: OpenCV
- **Metrics**:
  - **Sharpness**: Laplacian variance (higher = sharper)
  - **Brightness**: Mean pixel value (50-200 = well-lit)
- **Formula**: `score = sharpness - penalty(if too dark/bright)`
- **Output**: Top 25 photos → Highlights folder

### Video Generation
- **Library**: MoviePy
- **Effects**: Fade in/out, crossfade, zoom, slide
- **Format**: 1080p HD, 24fps, H.264 codec
- **Audio**: Optional background music

## 📦 Dependencies

Install with:
```bash
pip install face-recognition scikit-learn moviepy opencv-python dlib
```

**Added to `requirements.txt`:**
```
face-recognition>=1.3.0
scikit-learn>=1.3.0
moviepy>=1.0.3
dlib>=19.24.0
opencv-python>=4.10.0
numpy>=2.0.0
```

## 🚀 Usage Flow

### Frontend Flow
```javascript
// 1. Upload photos
const formData = new FormData();
files.forEach(file => formData.append('files', file));
await api.post('/albums/smart/upload', formData);

// 2. Start processing
await api.post('/albums/smart/process');

// 3. Poll for status
const interval = setInterval(async () => {
  const { data } = await api.get('/albums/smart/status');
  if (data.status === 'completed') {
    clearInterval(interval);
    loadAlbums();
  }
}, 2000);

// 4. View organized albums
const albums = await api.get('/albums/smart/albums');
// Display: Highlights, Person 1, Person 2, ...

// 5. Generate reel (user clicks button)
await api.post('/albums/smart/generate-reel', {
  duration_per_image: 2.0,
  transition_type: 'crossfade'
});
```

## 🎨 Frontend Components

### AlbumUpload.js
- Drag-and-drop photo upload
- Progress indicator
- Calls `/upload` → `/process`

### ProcessingStatus.js
- Shows processing status with spinner
- Polls `/status` every 2 seconds
- Displays log messages

### SmartAlbums.js
- Grid view of organized albums
- Tabs: Highlights | Person 1 | Person 2 | ...
- Click photo to view full size

### ReelGenerator.js
- "Generate Reel" button
- Settings: duration, transition, music
- Download video link after generation

## ⚠️ Important Notes

### Performance
- **Face Detection**: ~0.5-2s per image (depends on resolution)
- **Clustering**: <1s for 100 images
- **Highlight Scoring**: ~0.1s per image
- **Video Generation**: ~2-5s for 25 images (2s each = 50s video)

### Limitations
- Assumes 1 main face per photo for clustering
- Quality scoring is heuristic (no deep learning)
- Video generation is CPU-intensive (consider background task)

### Production Considerations
1. **Task Queue**: Use Celery/Redis for long-running tasks
2. **Storage**: Use S3/cloud storage instead of local filesystem
3. **Caching**: Cache face encodings to avoid re-processing
4. **Error Handling**: Retry failed face detections
5. **Scaling**: Distribute processing across multiple workers

## 🧪 Testing

### Manual Test
```bash
# 1. Start backend
python -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000

# 2. Upload test photos
curl -X POST http://localhost:8000/api/albums/smart/upload \
  -H "Authorization: Bearer <token>" \
  -F "files=@photo1.jpg" \
  -F "files=@photo2.jpg"

# 3. Start processing
curl -X POST http://localhost:8000/api/albums/smart/process \
  -H "Authorization: Bearer <token>"

# 4. Check status
curl http://localhost:8000/api/albums/smart/status \
  -H "Authorization: Bearer <token>"

# 5. Get albums
curl http://localhost:8000/api/albums/smart/albums \
  -H "Authorization: Bearer <token>"

# 6. Generate reel
curl -X POST http://localhost:8000/api/albums/smart/generate-reel \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"duration_per_image": 2.0}'
```

## 📊 Database Schema (Optional)

If you want to persist processing status:

```sql
CREATE TABLE album_processing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  status TEXT CHECK (status IN ('pending', 'processing', 'completed', 'error')),
  upload_count INTEGER,
  highlights_count INTEGER,
  person_count INTEGER,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 🔐 Security

- ✅ User-isolated folders (`/storage/albums/{user_id}/`)
- ✅ Authorization required for all endpoints
- ✅ File type validation (only .jpg, .jpeg, .png)
- ⚠️ TODO: File size limits
- ⚠️ TODO: Malware scanning

## 📝 Future Enhancements

1. **Face Labeling**: Allow users to name Person_1, Person_2, etc.
2. **Custom Highlights**: Let users pick photos for reel
3. **Transition Effects**: More video effects (pan, zoom, Ken Burns)
4. **Music Library**: Integration with Spotify API (already in project)
5. **Social Sharing**: Direct upload to Instagram/TikTok
6. **AI Captions**: Generate captions with GPT-4 Vision

## 🎓 FYP Presentation Points

- **Innovation**: First Pakistani photography platform with AI album organization
- **Technical Depth**: Face recognition + clustering + video generation
- **Real-world Value**: Saves photographers hours of manual sorting
- **Scalability**: Designed for parallel processing and cloud deployment
- **User Experience**: One-click intelligent organization + reel generation
