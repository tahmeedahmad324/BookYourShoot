# AI-Powered Music Suggestion Module

## Overview

This module provides **AI-based event and mood detection** using CLIP (Contrastive Language-Image Pre-training) zero-shot classification. Unlike simple Spotify search, this approach:

1. **Analyzes visual content** from images or videos
2. **Automatically detects event type** (Mehndi, Barat, Walima, Birthday, Corporate)
3. **Detects mood** (Romantic, Energetic, Dance, Calm)
4. **Suggests perfect music** based on the detected event + mood combination

## Why CLIP Zero-Shot Classification?

### The Problem with Manual Selection
- Users had to manually select event type and mood
- This was "not good enough" for supervisors
- Users may not know the best music genre for their event

### The CLIP Solution
- **Zero-shot learning**: No training data needed
- **Visual understanding**: AI "sees" the actual event photos/videos
- **Automatic detection**: No user input required beyond uploading media
- **Multi-modal**: Supports both images AND videos

## Technical Architecture

### Backend Components

#### 1. CLIP Analysis Service
**File**: `backend/services/clip_analysis_service.py`

```python
# Key features:
- Uses openai/clip-vit-base-patch32 model
- Lazy loading (model loads on first request)
- Zero-shot classification with custom Pakistani event prompts
- Video support with ffmpeg frame extraction
- Confidence scores for all categories
```

**Event Prompts** (for zero-shot classification):
```python
EVENT_PROMPTS = {
    "mehndi": [
        "a mehndi ceremony with yellow decorations and henna",
        "women dancing at a mehndi function with colorful dresses",
        ...
    ],
    "barat": [...],
    "walima": [...],
    "birthday": [...],
    "corporate": [...],
    "general": [...]
}
```

#### 2. AI Detection Router
**File**: `backend/routers/ai_detection.py`

**Endpoints**:
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/ai/detect-event-mood` | POST | File upload (image/video) |
| `/api/ai/detect-from-base64` | POST | Base64 image input |
| `/api/ai/supported-events` | GET | List of events/moods |
| `/api/ai/health` | GET | Service health check |

**Response Format**:
```json
{
  "success": true,
  "detected_event": "mehndi",
  "event_confidence": 0.85,
  "detected_mood": "energetic",
  "mood_confidence": 0.72,
  "event_label": "Mehndi Ceremony 💛",
  "mood_label": "Energetic 🔥",
  "all_event_scores": {...},
  "all_mood_scores": {...},
  "music_suggestions": [...]
}
```

### Frontend Component

**File**: `src/pages/client/MusicDiscoveryUI.js`

Features:
- ✅ Image upload (JPG, PNG, WebP)
- ✅ Video upload (MP4, MOV, AVI)
- ✅ Drag-and-drop support
- ✅ Video preview with playback
- ✅ Confidence bars for event and mood
- ✅ Expandable view of all scores
- ✅ "Browse by Event" fallback mode
- ✅ Spotify integration for music playback

## Installation

### 1. Install Python Dependencies
```bash
cd backend
pip install transformers>=4.36.0 torch>=2.1.0 Pillow
```

### 2. Install ffmpeg (for video support)
**Windows**:
```bash
# Using Chocolatey
choco install ffmpeg

# Or download from: https://ffmpeg.org/download.html
```

**Mac**:
```bash
brew install ffmpeg
```

**Linux**:
```bash
sudo apt install ffmpeg
```

### 3. First Run Note
The CLIP model (~600MB) downloads on first request. This takes 30-60 seconds. Subsequent requests are fast.

## API Usage Examples

### 1. Upload Image for Analysis
```javascript
const formData = new FormData();
formData.append('file', imageFile);

const response = await fetch('/api/ai/detect-event-mood', {
  method: 'POST',
  body: formData
});

const data = await response.json();
// data.detected_event = "mehndi"
// data.event_confidence = 0.85
```

### 2. Analyze Base64 Image
```javascript
const response = await fetch('/api/ai/detect-from-base64', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    image_data: base64String,
    include_music: true
  })
});
```

### 3. Get Supported Events
```javascript
const response = await fetch('/api/ai/supported-events');
const data = await response.json();
// data.events = [{id: "mehndi", label: "Mehndi Ceremony 💛", ...}, ...]
```

## How CLIP Zero-Shot Classification Works

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIP MODEL ARCHITECTURE                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   Image ─────► Vision Encoder ─────► Image Embedding        │
│                                            │                 │
│                                            ▼                 │
│                                      Similarity              │
│                                      Calculation             │
│                                            ▲                 │
│                                            │                 │
│   Text  ─────► Text Encoder   ─────► Text Embedding         │
│   Prompts                                                    │
│                                                              │
│   "a mehndi ceremony with henna"  ──► 0.85 (highest!)       │
│   "a baraat wedding procession"   ──► 0.10                  │
│   "a walima reception dinner"     ──► 0.05                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Why this works without training**:
- CLIP was trained on 400 million image-text pairs
- It understands the relationship between images and descriptions
- We provide descriptive prompts for each event type
- CLIP computes similarity scores between image and all prompts
- Highest similarity = detected category

## Video Analysis Pipeline

```
┌──────────────────────────────────────────────────────────────┐
│                     VIDEO ANALYSIS FLOW                       │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│   Video ─────► ffmpeg ─────► Frame 1 ─────► CLIP ─────►      │
│                              Frame 2 ─────► CLIP ─────►      │
│                              Frame 3 ─────► CLIP ─────►      │
│                                 ...                   │      │
│                              Frame N ─────► CLIP ─────►      │
│                                                       │      │
│                                                       ▼      │
│                                              Aggregate        │
│                                              Predictions      │
│                                                       │      │
│                                                       ▼      │
│                                              Final Result     │
│                                              (averaged)       │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

## Supported Events & Moods

### Events
| ID | Label | Description |
|----|-------|-------------|
| mehndi | Mehndi Ceremony 💛 | Henna, yellow decorations, dholki |
| barat | Baraat Procession 🎊 | Groom entry, dhol, high energy |
| walima | Walima Reception 💕 | Formal dinner, romantic |
| birthday | Birthday Party 🎂 | Cake, balloons, celebration |
| corporate | Corporate Event 💼 | Formal, professional |
| general | General Event 🎉 | Any other gathering |

### Moods
| ID | Label | Description |
|----|-------|-------------|
| romantic | Romantic 💕 | Soft, intimate atmosphere |
| energetic | Energetic 🔥 | High energy, exciting |
| dance | Dance Party 💃 | Rhythmic, movement |
| calm | Calm & Relaxed 😌 | Peaceful, serene |

## Music Mapping

Each event type maps to Spotify search parameters:

```python
EVENT_TO_MUSIC_VIBE = {
    "mehndi": {
        "genres": ["desi", "bollywood", "punjabi"],
        "keywords": "mehndi dholki sangeet dance pakistani bollywood",
        "energy_range": (0.6, 1.0),
        "danceability_min": 0.6
    },
    "barat": {
        "genres": ["punjabi", "bhangra", "desi"],
        "keywords": "barat baraat dulha entry bhangra dhol high energy",
        "energy_range": (0.7, 1.0),
        "danceability_min": 0.7
    },
    ...
}
```

## Error Handling

The module handles various error scenarios:
- **Model not loaded**: Shows friendly message, retries on click
- **ffmpeg not installed**: Falls back to image-only analysis
- **Empty file**: Returns clear error message
- **Invalid file type**: Validates before processing

## FYP Evaluation Points

This implementation demonstrates:
1. **AI/ML Integration**: CLIP zero-shot classification
2. **Computer Vision**: Image and video analysis
3. **Full-stack Development**: FastAPI + React integration
4. **Third-party APIs**: Spotify integration
5. **Clean Code**: Comprehensive comments and documentation
6. **Error Handling**: Graceful fallbacks and user-friendly errors
7. **Modern Practices**: Lazy loading, async/await, type hints

## Author
BookYourShoot Team - Final Year Project 2026
