"""
=============================================================================
AI Detection API Router - Event & Mood Detection
=============================================================================

This router provides the API endpoint for AI-based event and mood detection
using CLIP (Contrastive Language-Image Pre-training) zero-shot classification.

ENDPOINTS:
----------
POST /api/ai/detect-event-mood
  - Accepts image or video file
  - Returns detected event type and mood with confidence scores

WHY THIS IS BETTER THAN MANUAL SELECTION:
-----------------------------------------
1. User doesn't need to know event types - AI detects automatically
2. More accurate mood detection based on actual visual content
3. Supports video analysis with frame aggregation
4. Zero-shot learning - no training data needed

Author: BookYourShoot Team
Course: Final Year Project
Date: January 2026
=============================================================================
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, List
import base64
import os
import sys
from pathlib import Path

# Add backend directory to path for imports
backend_dir = str(Path(__file__).resolve().parent.parent)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# Import CLIP analysis service
try:
    from services.clip_analysis_service import (
        clip_analysis_service,
        detect_event_mood_from_image,
        detect_event_mood_from_video,
        get_music_params_for_event,
        EVENT_TO_MUSIC_VIBE
    )
    CLIP_SERVICE_AVAILABLE = True
except ImportError as e:
    print(f"⚠️ CLIP service not available: {e}")
    CLIP_SERVICE_AVAILABLE = False

# Import Spotify service for music suggestions
try:
    from services.spotify_service import spotify_service
    SPOTIFY_AVAILABLE = True
except ImportError:
    SPOTIFY_AVAILABLE = False


# =============================================================================
# ROUTER SETUP
# =============================================================================

router = APIRouter(prefix="/ai", tags=["AI Detection"])


# =============================================================================
# REQUEST/RESPONSE MODELS
# =============================================================================

class ImageAnalysisRequest(BaseModel):
    """Request model for base64 image analysis"""
    image_data: str  # Base64 encoded image
    include_music: bool = True  # Whether to include music suggestions


class DetectionResponse(BaseModel):
    """Response model for event/mood detection"""
    success: bool
    detected_event: str
    event_confidence: float
    detected_mood: str
    mood_confidence: float
    event_label: Optional[str] = None  # Friendly label like "Mehndi Ceremony 💛"
    mood_label: Optional[str] = None  # Friendly label like "Energetic 🔥"
    all_event_scores: Optional[dict] = None
    all_mood_scores: Optional[dict] = None
    music_suggestions: Optional[List[dict]] = None
    error: Optional[str] = None


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

# Friendly labels with emojis for UI display
EVENT_LABELS = {
    "mehndi": "Mehndi Ceremony 💛",
    "barat": "Baraat Procession 🎊",
    "walima": "Walima Reception 💕",
    "birthday": "Birthday Party 🎂",
    "corporate": "Corporate Event 💼",
    "general": "General Event 🎉"
}

MOOD_LABELS = {
    "romantic": "Romantic 💕",
    "energetic": "Energetic 🔥",
    "dance": "Dance Party 💃",
    "calm": "Calm & Relaxed 😌"
}


def get_event_label(event_type: str) -> str:
    """Get friendly event label with emoji"""
    return EVENT_LABELS.get(event_type, EVENT_LABELS["general"])


def get_mood_label(mood: str) -> str:
    """Get friendly mood label with emoji"""
    return MOOD_LABELS.get(mood, f"{mood.title()} 🎵")


def validate_file_type(content_type: str, filename: str) -> tuple:
    """
    Validate uploaded file is an image or video.
    
    Returns:
        (is_valid, file_type, error_message)
    """
    # Check content type
    if content_type:
        if content_type.startswith("image/"):
            return True, "image", None
        elif content_type.startswith("video/"):
            return True, "video", None
    
    # Fallback to extension check
    if filename:
        ext = filename.lower().split(".")[-1] if "." in filename else ""
        image_exts = {"jpg", "jpeg", "png", "gif", "webp", "bmp"}
        video_exts = {"mp4", "mov", "avi", "mkv", "webm"}
        
        if ext in image_exts:
            return True, "image", None
        elif ext in video_exts:
            return True, "video", None
    
    return False, None, "Invalid file type. Please upload an image (JPG, PNG) or video (MP4, MOV)."


async def get_music_suggestions(event_type: str, mood: str, limit: int = 10) -> List[dict]:
    """
    Get music suggestions based on detected event and mood.
    Uses the existing Spotify service integration.
    """
    if not SPOTIFY_AVAILABLE or not spotify_service:
        return []
    
    try:
        # Get music parameters for the event
        params = get_music_params_for_event(event_type)
        
        # Build search query combining event keywords and mood
        query = f"{params['keywords']} {mood}"
        
        # Search for tracks
        tracks = spotify_service.search_tracks(query, limit=limit)
        
        # Format for response
        suggestions = []
        for track in tracks:
            suggestions.append({
                "id": track.get("id"),
                "name": track.get("name"),
                "artist": ", ".join([a.get("name", "") for a in track.get("artists", [])]),
                "album": track.get("album", {}).get("name", ""),
                "image": track.get("album", {}).get("images", [{}])[0].get("url", ""),
                "preview_url": track.get("preview_url"),
                "spotify_url": track.get("external_urls", {}).get("spotify", "")
            })
        
        return suggestions
        
    except Exception as e:
        print(f"⚠️ Failed to get music suggestions: {e}")
        return []


# =============================================================================
# API ENDPOINTS
# =============================================================================

@router.post("/detect-event-mood", response_model=DetectionResponse)
async def detect_event_mood(file: UploadFile = File(...)):
    """
    Detect event type and mood from an uploaded image or video.
    
    This endpoint uses CLIP (Contrastive Language-Image Pre-training) for
    zero-shot classification. No training data is needed - CLIP understands
    images in relation to natural language descriptions.
    
    SUPPORTED FORMATS:
    - Images: JPG, PNG, GIF, WebP
    - Videos: MP4, MOV, AVI, MKV, WebM
    
    For videos, the system extracts key frames (1 per second, max 10 frames)
    and aggregates predictions across all frames for robust detection.
    
    RETURNS:
    - detected_event: mehndi | barat | walima | birthday | corporate | general
    - event_confidence: 0.0 to 1.0
    - detected_mood: romantic | energetic | dance | calm
    - mood_confidence: 0.0 to 1.0
    - music_suggestions: List of Spotify tracks matching the event/mood
    """
    # Check if CLIP service is available
    if not CLIP_SERVICE_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="AI service not available. Please install: pip install transformers torch Pillow"
        )
    
    # Validate file type
    is_valid, file_type, error = validate_file_type(file.content_type, file.filename)
    
    if not is_valid:
        raise HTTPException(status_code=400, detail=error)
    
    try:
        # Read file content
        content = await file.read()
        
        if len(content) == 0:
            raise HTTPException(status_code=400, detail="Empty file uploaded")
        
        # Analyze based on file type
        if file_type == "video":
            # Video analysis with frame extraction
            result = detect_event_mood_from_video(content)
        else:
            # Image analysis
            # Convert to base64 for the service
            image_base64 = base64.b64encode(content).decode("utf-8")
            result = detect_event_mood_from_image(image_base64, is_base64=True)
        
        # Check if image was rejected as not a valid event
        if not result.get("is_valid_event", True):
            return {
                "success": False,
                "is_valid_event": False,
                "rejection_reason": result.get("rejection_reason", "This doesn't appear to be an event photo."),
                "detected_event": result.get("detected_event", "unknown"),
                "event_confidence": result.get("event_confidence", 0.0),
                "detected_mood": result.get("detected_mood", "unknown"),
                "mood_confidence": result.get("mood_confidence", 0.0),
                "not_event_score": result.get("not_event_score", 0.0),
                "all_event_scores": result.get("all_event_scores"),
                "all_mood_scores": result.get("all_mood_scores"),
                "music_suggestions": [],
                "error": result.get("rejection_reason")
            }
        
        if not result.get("success"):
            return JSONResponse(
                status_code=500,
                content={
                    "success": False,
                    "detected_event": "general",
                    "event_confidence": 0.0,
                    "detected_mood": "calm",
                    "mood_confidence": 0.0,
                    "error": result.get("error", "Analysis failed")
                }
            )
        
        # Get music suggestions
        music = await get_music_suggestions(
            result["detected_event"],
            result["detected_mood"],
            limit=10
        )
        
        # Build response
        return {
            "success": True,
            "is_valid_event": True,
            "rejection_reason": None,
            "detected_event": result["detected_event"],
            "event_confidence": result["event_confidence"],
            "detected_mood": result["detected_mood"],
            "mood_confidence": result["mood_confidence"],
            "event_label": get_event_label(result["detected_event"]),
            "mood_label": get_mood_label(result["detected_mood"]),
            "all_event_scores": result.get("all_event_scores"),
            "all_mood_scores": result.get("all_mood_scores"),
            "not_event_score": result.get("not_event_score", 0.0),
            "music_suggestions": music,
            "error": None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Detection error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/detect-from-base64")
async def detect_from_base64(request: ImageAnalysisRequest):
    """
    Detect event and mood from a base64 encoded image.
    
    This endpoint is useful for:
    - Direct integration with frontend file readers
    - Processing images from other sources (URLs, etc.)
    
    INPUT:
    - image_data: Base64 encoded image string
    - include_music: Whether to include music suggestions (default: true)
    """
    if not CLIP_SERVICE_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="AI service not available. Please install required packages."
        )
    
    try:
        # Analyze image
        result = detect_event_mood_from_image(
            request.image_data, 
            is_base64=True
        )
        
        if not result.get("success"):
            return {
                "success": False,
                "error": result.get("error", "Analysis failed"),
                "detected_event": "general",
                "event_confidence": 0.0,
                "detected_mood": "calm",
                "mood_confidence": 0.0
            }
        
        # Get music suggestions if requested
        music = []
        if request.include_music:
            music = await get_music_suggestions(
                result["detected_event"],
                result["detected_mood"]
            )
        
        return {
            "success": True,
            "detected_event": result["detected_event"],
            "event_confidence": result["event_confidence"],
            "detected_mood": result["detected_mood"],
            "mood_confidence": result["mood_confidence"],
            "event_label": get_event_label(result["detected_event"]),
            "mood_label": get_mood_label(result["detected_mood"]),
            "all_event_scores": result.get("all_event_scores"),
            "all_mood_scores": result.get("all_mood_scores"),
            "music_suggestions": music
        }
        
    except Exception as e:
        print(f"❌ Base64 detection error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/supported-events")
async def get_supported_events():
    """
    Get list of supported event types with their descriptions.
    Useful for UI display and documentation.
    """
    return {
        "events": [
            {"id": "mehndi", "label": EVENT_LABELS["mehndi"], "description": "Mehndi/Sangeet ceremony with henna and music"},
            {"id": "barat", "label": EVENT_LABELS["barat"], "description": "Baraat wedding procession with groom entry"},
            {"id": "walima", "label": EVENT_LABELS["walima"], "description": "Walima reception dinner and celebration"},
            {"id": "birthday", "label": EVENT_LABELS["birthday"], "description": "Birthday party with cake and decorations"},
            {"id": "corporate", "label": EVENT_LABELS["corporate"], "description": "Professional corporate event or conference"},
            {"id": "general", "label": EVENT_LABELS["general"], "description": "General celebration or gathering"}
        ],
        "moods": [
            {"id": "romantic", "label": MOOD_LABELS["romantic"], "description": "Soft, romantic atmosphere"},
            {"id": "energetic", "label": MOOD_LABELS["energetic"], "description": "High energy, exciting vibe"},
            {"id": "dance", "label": MOOD_LABELS["dance"], "description": "Dance party atmosphere"},
            {"id": "calm", "label": MOOD_LABELS["calm"], "description": "Calm, relaxed setting"}
        ]
    }


@router.get("/health")
async def health_check():
    """Check if the AI service is operational"""
    return {
        "status": "healthy" if CLIP_SERVICE_AVAILABLE else "degraded",
        "clip_available": CLIP_SERVICE_AVAILABLE,
        "spotify_available": SPOTIFY_AVAILABLE,
        "message": "Ready for analysis" if CLIP_SERVICE_AVAILABLE else "CLIP model not loaded"
    }
