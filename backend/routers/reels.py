"""  
Reel Generator Router - Create video reels from images
Uses MoviePy for video processing and local file storage
"""

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from typing import Optional, List, Dict
import requests
from io import BytesIO
from pathlib import Path
import tempfile
import shutil
from datetime import datetime
import traceback
import numpy as np

# MoviePy imports - Direct from moviepy module
MOVIEPY_AVAILABLE = False
ImageClip = None
TextClip = None
concatenate_videoclips = None
ColorClip = None
CompositeVideoClip = None
AudioFileClip = None

try:
    from moviepy import ImageClip, TextClip, concatenate_videoclips, ColorClip, CompositeVideoClip, AudioFileClip
    MOVIEPY_AVAILABLE = True
    print("✅ MoviePy loaded successfully")
except ImportError as e:
    if "ffmpeg" in str(e).lower():
        print(f"⚠️  MoviePy available but FFmpeg not found: {e}")
        print("Install FFmpeg for video generation: https://ffmpeg.org/download.html")
    else:
        print(f"⚠️  MoviePy not available - {e}")
        print("Install with: pip install moviepy")

from PIL import Image, ImageDraw, ImageFont, ImageEnhance
from PIL.ExifTags import TAGS as ExifTags

# Supabase - fix import path
from backend.supabase_client import supabase
from backend.auth import get_current_user

# Import photo selector for auto-generation
from backend.services.reel_photo_selector import analyze_and_select_photos

# Import CLIP for event detection
try:
    from backend.services.clip_analysis_service import clip_analysis_service
    CLIP_AVAILABLE = True
except ImportError:
    print("⚠️ CLIP service not available - event detection disabled")
    CLIP_AVAILABLE = False
    clip_analysis_service = None

# Import Spotify service for music
try:
    from backend.services.spotify_service import spotify_service
    SPOTIFY_AVAILABLE = True
except ImportError:
    print("⚠️ Spotify service not available - music disabled")
    SPOTIFY_AVAILABLE = False
    spotify_service = None

router = APIRouter(prefix="/reels", tags=["Reel Generator"])


class ReelRequest(BaseModel):
    images: List[str] = Field(..., min_items=1, max_items=15, description="List of image URLs from Supabase storage")
    transition: str = Field(default="fade", description="Transition type: 'fade' or 'none'")
    ratio: str = Field(default="9:16", description="Aspect ratio: '9:16', '16:9', or '1:1'")
    intro_text: Optional[str] = Field(default=None, description="Optional intro text")
    duration_per_image: float = Field(default=3.0, ge=1.0, le=5.0, description="Duration per image in seconds")
    fade_duration: float = Field(default=0.5, ge=0.1, le=2.0, description="Fade transition duration")
    fit_mode: str = Field(default="fit", description="Image fit mode: 'fit' (letterbox) or 'fill' (crop)")
    ken_burns: bool = Field(default=False, description="Apply Ken Burns effect (zoom/pan animation)")
    music_upload_url: Optional[str] = Field(default=None, description="URL to uploaded music file")
    spotify_preview_url: Optional[str] = Field(default=None, description="Spotify preview URL")
    music_volume: int = Field(default=70, ge=0, le=100, description="Music volume (0-100%)")
    filter: str = Field(default="none", description="Color filter: 'none', 'vintage', 'bw', 'vibrant', 'warm', 'cool'")


class ReelResponse(BaseModel):
    video_url: str
    duration: float
    num_images: int
    aspect_ratio: str
    file_size: Optional[int] = None


class AutoReelResponse(BaseModel):
    """Response for auto-generated reel with quality analysis"""
    video_url: str
    duration: float
    num_images_uploaded: int
    num_images_selected: int
    aspect_ratio: str
    file_size: Optional[int] = None
    quality_summary: Dict
    selected_photos_info: List[Dict]
    # Music integration
    detected_event: Optional[str] = None
    event_confidence: Optional[float] = None
    music_track: Optional[Dict] = None  # {title, artist, spotify_url, preview_url}


def apply_filter(img: Image.Image, filter_name: str) -> Image.Image:
    """Apply color filter to image
    
    Args:
        img: PIL Image
        filter_name: Filter name ('none', 'vintage', 'bw', 'vibrant', 'warm', 'cool')
    
    Returns:
        Filtered PIL Image
    """
    if filter_name == "none":
        return img
    
    elif filter_name == "bw":
        # Black and White - convert to grayscale
        return img.convert('L').convert('RGB')
    
    elif filter_name == "vintage":
        # Vintage - sepia tone with reduced saturation
        # Convert to grayscale first
        grayscale = img.convert('L')
        
        # Apply sepia tone
        sepia = Image.new('RGB', img.size)
        pixels = sepia.load()
        gray_pixels = grayscale.load()
        
        for y in range(img.size[1]):
            for x in range(img.size[0]):
                gray = gray_pixels[x, y]
                # Sepia formula
                r = min(255, int(gray * 1.0))
                g = min(255, int(gray * 0.85))
                b = min(255, int(gray * 0.65))
                pixels[x, y] = (r, g, b)
        
        # Reduce contrast slightly
        enhancer = ImageEnhance.Contrast(sepia)
        sepia = enhancer.enhance(0.85)
        
        return sepia
    
    elif filter_name == "vibrant":
        # Vibrant - SUBTLE increase in saturation and brightness for natural look
        enhancer = ImageEnhance.Color(img)
        img = enhancer.enhance(1.15)  # Gentle saturation boost (was 1.4)
        
        enhancer = ImageEnhance.Brightness(img)
        img = enhancer.enhance(1.05)  # Very subtle brightness (was 1.1)
        
        enhancer = ImageEnhance.Contrast(img)
        img = enhancer.enhance(1.05)  # Very subtle contrast (was 1.1)
        
        return img
    
    elif filter_name == "warm":
        # Warm - add orange/red tones
        pixels = img.load()
        for y in range(img.size[1]):
            for x in range(img.size[0]):
                r, g, b = pixels[x, y]
                # Increase red, slightly increase green, keep blue
                r = min(255, int(r * 1.15))
                g = min(255, int(g * 1.05))
                pixels[x, y] = (r, g, b)
        
        return img
    
    elif filter_name == "cool":
        # Cool - add blue tones
        pixels = img.load()
        for y in range(img.size[1]):
            for x in range(img.size[0]):
                r, g, b = pixels[x, y]
                # Keep red, slightly increase green, increase blue
                g = min(255, int(g * 1.05))
                b = min(255, int(b * 1.15))
                pixels[x, y] = (r, g, b)
        
        return img
    
    else:
        return img


def fix_image_orientation(image_bytes: bytes) -> Image.Image:
    """Fix image orientation based on EXIF data"""
    try:
        img = Image.open(BytesIO(image_bytes))
        
        # Try to get EXIF data and fix orientation
        try:
            exif = img.getexif()
            if exif:
                # Orientation tag is 274
                orientation = exif.get(274)
                
                if orientation == 3:
                    img = img.rotate(180, expand=True)
                elif orientation == 6:
                    img = img.rotate(270, expand=True)
                elif orientation == 8:
                    img = img.rotate(90, expand=True)
        except Exception:
            # No EXIF or error reading it - just use image as-is
            pass
        
        # Convert to RGB if needed (handle RGBA, grayscale, etc.)
        if img.mode != 'RGB':
            img = img.convert('RGB')
        
        return img
    
    except Exception as e:
        # Last resort: try to open without any processing
        try:
            img = Image.open(BytesIO(image_bytes))
            if img.mode != 'RGB':
                img = img.convert('RGB')
            return img
        except Exception:
            raise Exception(f"Failed to load image: {str(e)}")


def resize_to_aspect_ratio(clip, ratio: str, fit_mode: str = "fit"):
    """Resize clip to match aspect ratio with letterboxing or cropping
    
    Args:
        clip: Video clip to resize
        ratio: Target aspect ratio ('9:16', '16:9', '1:1')
        fit_mode: 'fit' for letterbox (no crop) or 'fill' for crop to fill
    """
    current_width = clip.w
    current_height = clip.h
    
    # Determine target dimensions
    if ratio == "9:16":
        target_width, target_height = 1080, 1920
    elif ratio == "16:9":
        target_width, target_height = 1920, 1080
    elif ratio == "1:1":
        target_width, target_height = 1080, 1080
    else:
        target_width, target_height = 1080, 1920
    
    # Calculate aspect ratios
    target_aspect = target_width / target_height
    current_aspect = current_width / current_height
    
    if fit_mode == "fill":
        # FILL MODE: Scale and crop to fill entire frame
        if current_aspect > target_aspect:
            # Image is wider - scale by height and crop width
            new_height = target_height
            new_width = int(current_width * (target_height / current_height))
        else:
            # Image is taller - scale by width and crop height
            new_width = target_width
            new_height = int(current_height * (target_width / current_width))
        
        # Resize
        clip = clip.resized(width=new_width, height=new_height)
        
        # Crop to exact target size from center
        clip = clip.cropped(
            x_center=clip.w / 2,
            y_center=clip.h / 2,
            width=target_width,
            height=target_height
        )
        
        return clip
    
    else:
        # FIT MODE: Scale to fit with letterboxing (no cropping)
        if current_aspect > target_aspect:
            # Image is wider - fit to width, add bars top/bottom
            new_width = target_width
            new_height = int(current_height * (target_width / current_width))
        else:
            # Image is taller - fit to height, add bars left/right
            new_height = target_height
            new_width = int(current_width * (target_height / current_height))
        
        # Resize to fit
        clip = clip.resized(width=new_width, height=new_height)
        
        # Add black padding to center the image
        # Create black background
        background = ColorClip(size=(target_width, target_height), color=(0, 0, 0))
        background = background.with_duration(clip.duration)
        
        # Center the clip on the background
        clip = clip.with_position(('center', 'center'))
        
        # Composite
        final_clip = CompositeVideoClip([background, clip], size=(target_width, target_height))
        
        return final_clip


def apply_ken_burns_effect(clip, zoom_ratio=1.2):
    """Apply Ken Burns effect (slow zoom and pan)
    
    Args:
        clip: Video clip to apply effect to
        zoom_ratio: How much to zoom (1.2 = 20% zoom)
    
    Returns:
        Clip with Ken Burns effect applied
        
    NOTE: Temporarily disabled due to MoviePy 2.x API changes (.fl method removed)
    TODO: Reimplement using MoviePy 2.x transform or resize_animate methods
    """
    # Temporarily return clip unchanged - Ken Burns effect disabled
    # MoviePy 2.x removed .fl() method, needs new implementation
    return clip


def apply_fade_transition(clips, fade_duration=0.5):
    """Apply fade in/out transitions between clips"""
    faded_clips = []
    
    for i, clip in enumerate(clips):
        if i == 0:
            # First clip: fade in only
            faded_clips.append(clip.with_fadein(fade_duration))
        elif i == len(clips) - 1:
            # Last clip: fade out only
            faded_clips.append(clip.with_fadeout(fade_duration))
        else:
            # Middle clips: fade in and out
            faded_clips.append(clip.with_fadein(fade_duration).with_fadeout(fade_duration))
    
    return faded_clips


def process_audio(music_url: str, video_duration: float, volume: int, temp_dir: str):
    """Download and process audio to match video duration
    
    Args:
        music_url: URL to music file (uploaded or Spotify preview)
        video_duration: Target video duration in seconds
        volume: Volume level (0-100)
        temp_dir: Temporary directory for audio file
    
    Returns:
        AudioFileClip with adjusted duration and volume
    """
    try:
        print(f"Processing audio from URL: {music_url}")
        
        audio_path = Path(temp_dir) / "music.mp3"
        
        # Check if it's a local file (localhost URL or relative path)
        if "localhost:8000/api/reels/music/" in music_url or music_url.startswith("/api/reels/music/"):
            # Local file - extract path and read directly to avoid HTTP timeout
            # Parse URL to get user_id and filename
            if "localhost:8000" in music_url:
                # Extract from full URL: http://localhost:8000/api/reels/music/{user_id}/{filename}
                path_part = music_url.split("/api/reels/music/")[1]
            else:
                # Extract from relative path: /api/reels/music/{user_id}/{filename}
                path_part = music_url.split("/api/reels/music/")[1]
            
            parts = path_part.split("/")
            url_user_id = parts[0]
            filename = parts[1]
            local_music_path = Path("storage/reels/music") / url_user_id / filename
            
            if not local_music_path.exists():
                print(f"ERROR: Local music file not found: {local_music_path}")
                return None
            
            # Copy to temp directory
            shutil.copy(local_music_path, audio_path)
            print(f"✓ Loaded local music file: {local_music_path}")
        else:
            # Download audio file from external URL (Spotify preview, etc.)
            print(f"Downloading audio from external URL: {music_url}")
            audio_response = requests.get(music_url, timeout=30)
            if audio_response.status_code != 200:
                raise Exception(f"Failed to download audio: {audio_response.status_code}")
            
            # Save to temp file
            with open(audio_path, 'wb') as f:
                f.write(audio_response.content)
            print(f"✓ Downloaded audio, size: {len(audio_response.content)} bytes")
        
        # Load audio clip
        print(f"Loading audio clip from: {audio_path}")
        audio_clip = AudioFileClip(str(audio_path))
        print(f"Audio loaded successfully, duration: {audio_clip.duration:.2f}s")
        
        # Adjust duration
        if audio_clip.duration < video_duration:
            # Loop audio if shorter than video
            loops_needed = int(video_duration / audio_clip.duration) + 1
            print(f"Looping audio {loops_needed} times to match video duration")
            from moviepy.audio.AudioClip import concatenate_audioclips
            audio_clip = concatenate_audioclips([audio_clip] * loops_needed)
        
        # Trim to exact video duration
        audio_clip = audio_clip.subclipped(0, video_duration)
        print(f"Audio trimmed to {video_duration:.2f}s")
        
        # Adjust volume (0-100 to 0.0-1.0)
        volume_factor = volume / 100.0
        audio_clip = audio_clip.with_volume_scaled(volume_factor)
        print(f"Audio volume adjusted to {volume}% (factor: {volume_factor})")
        
        return audio_clip
    
    except Exception as e:
        print(f"ERROR processing audio: {e}")
        print(traceback.format_exc())
        return None


def create_intro_clip(text: str, width: int, height: int, duration: float = 2.5) -> ImageClip:
    """Create intro text clip using PIL with auto text wrapping and sizing"""
    # Create black background
    intro_img = Image.new('RGB', (width, height), color='black')
    draw = ImageDraw.Draw(intro_img)
    
    # Calculate max text width (80% of screen width for padding)
    max_text_width = int(width * 0.8)
    
    # Start with a base font size and adjust
    font_size = 120 if width > height else 80  # Larger for landscape
    font = None
    
    # Try to load font
    for font_path in ["arial.ttf", "C:/Windows/Fonts/arial.ttf", 
                      "C:/Windows/Fonts/arialbd.ttf", "/System/Library/Fonts/Helvetica.ttc"]:
        try:
            font = ImageFont.truetype(font_path, font_size)
            break
        except:
            continue
    
    if font is None:
        font = ImageFont.load_default()
    
    # Function to wrap text
    def wrap_text(text, font, max_width):
        words = text.split()
        lines = []
        current_line = []
        
        for word in words:
            test_line = ' '.join(current_line + [word])
            bbox = draw.textbbox((0, 0), test_line, font=font)
            test_width = bbox[2] - bbox[0]
            
            if test_width <= max_width:
                current_line.append(word)
            else:
                if current_line:
                    lines.append(' '.join(current_line))
                    current_line = [word]
                else:
                    # Word itself is too long, add it anyway
                    lines.append(word)
        
        if current_line:
            lines.append(' '.join(current_line))
        
        return lines
    
    # Wrap text and adjust font size if needed
    lines = wrap_text(text, font, max_text_width)
    
    # If text is too large (more than 3 lines), reduce font size
    while len(lines) > 3 and font_size > 40:
        font_size -= 10
        try:
            font = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", font_size)
        except:
            font = ImageFont.load_default()
        lines = wrap_text(text, font, max_text_width)
    
    # Calculate total text height
    line_height = font_size + 10
    total_text_height = len(lines) * line_height
    
    # Start y position (centered vertically)
    y = (height - total_text_height) // 2
    
    # Draw each line centered
    for line in lines:
        bbox = draw.textbbox((0, 0), line, font=font)
        line_width = bbox[2] - bbox[0]
        x = (width - line_width) // 2
        draw.text((x, y), line, fill='white', font=font)
        y += line_height
    
    # Convert PIL image to numpy array for MoviePy
    intro_array = np.array(intro_img)
    
    # Create clip from numpy array
    intro_clip = ImageClip(intro_array).with_duration(duration)
    
    return intro_clip


@router.post("/upload-music")
async def upload_music(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload a music file for reel generation"""
    try:
        user_id = current_user.get("id")
        
        # Validate file type
        allowed_types = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav']
        if not file.content_type or file.content_type not in allowed_types:
            raise HTTPException(status_code=400, detail="File must be MP3 or WAV audio")
        
        # Validate file extension
        file_ext = Path(file.filename).suffix.lower()
        if file_ext not in ['.mp3', '.wav']:
            raise HTTPException(status_code=400, detail="Only MP3 and WAV files are supported")
        
        # Create upload directory
        upload_dir = Path("storage/reels/music") / str(user_id)
        upload_dir.mkdir(parents=True, exist_ok=True)
        
        # Generate unique filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"music_{timestamp}{file_ext}"
        file_path = upload_dir / filename
        
        # Save file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Create URL
        music_url = f"http://localhost:8000/api/reels/music/{user_id}/{filename}"
        
        return {
            "url": music_url,
            "filename": filename,
            "message": "Music uploaded successfully"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error uploading music: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to upload music: {str(e)}")


@router.post("/upload-image")
async def upload_image(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload an image for reel generation"""
    try:
        user_id = current_user.get("id")
        
        # Validate file type
        if not file.content_type or not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Create upload directory
        upload_dir = Path("storage/reels/uploads") / str(user_id)
        upload_dir.mkdir(parents=True, exist_ok=True)
        
        # Generate unique filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
        file_extension = Path(file.filename).suffix
        filename = f"{timestamp}{file_extension}"
        file_path = upload_dir / filename
        
        # Save file
        contents = await file.read()
        with open(file_path, "wb") as f:
            f.write(contents)
        
        # Return URL for accessing the image
        image_url = f"/api/reels/images/{user_id}/{filename}"
        
        return {
            "url": image_url,
            "filename": filename,
            "size": len(contents)
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload image: {str(e)}")


@router.get("/images/{user_id}/{filename}")
async def serve_image(user_id: str, filename: str):
    """Serve uploaded image file"""
    try:
        image_path = Path("storage/reels/uploads") / user_id / filename
        
        if not image_path.exists():
            raise HTTPException(status_code=404, detail="Image not found")
        
        return FileResponse(path=str(image_path))
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to serve image: {str(e)}")


@router.post("/generate-auto", response_model=AutoReelResponse)
async def generate_auto_reel(
    files: List[UploadFile] = File(..., description="10-30 photos for reel"),
    ratio: str = "9:16",
    filter_type: str = "vibrant",
    current_user: dict = Depends(get_current_user)
):
    """
    🎬 **AUTOMATIC REEL GENERATOR** - Upload photos, get instant reel!
    
    **What it does:**
    1. User uploads 10-30 photos
    2. AI analyzes quality:
       - Sharpness (Laplacian variance)
       - Brightness (HSV V-channel)
       - Contrast (std deviation)
       - Face detection (Haar Cascade)
       - Color vibrancy (saturation)
    3. Selects best 10-12 photos automatically
    4. Applies trendy filters (vibrant, vintage, cinematic)
    5. Adds smooth transitions (fade, crossfade)
    6. Generates 30-second video
    
    **Parameters:**
    - files: 10-30 event photos (JPG/PNG)
    - ratio: Video aspect ratio ('9:16' for reels, '16:9' for YouTube, '1:1' for Instagram)
    - filter_type: Auto-filter ('vibrant', 'vintage', 'cinematic', 'warm', 'cool', 'bw')
    
    **Returns:**
    - video_url: Download link
    - quality_summary: AI analysis stats
    - selected_photos_info: Which photos were chosen and why
    """
    
    # Check MoviePy availability FIRST
    if not MOVIEPY_AVAILABLE:
        raise HTTPException(
            status_code=503, 
            detail="Video generation service unavailable. Please install moviepy: pip install moviepy"
        )
    
    # Validate photo count
    if len(files) < 10:
        raise HTTPException(
            status_code=400,
            detail=f"Need at least 10 photos for auto-generation. You uploaded {len(files)}."
        )
    if len(files) > 30:
        raise HTTPException(
            status_code=400,
            detail=f"Maximum 30 photos allowed. You uploaded {len(files)}."
        )
    
    temp_dir = tempfile.mkdtemp()
    
    try:
        user_id = current_user.get("id")
        
        print(f"\n🎬 AUTO-REEL: User {user_id} uploaded {len(files)} photos")
        
        # Step 1: Read all uploaded photos
        photos = []
        for file in files:
            contents = await file.read()
            photos.append((contents, file.filename))
        
        print(f"📸 Step 1: Read {len(photos)} photos")
        
        # Step 2: AI analyzes and selects best photos
        print("🤖 Step 2: AI analyzing photo quality...")
        selected_photos, quality_summary = analyze_and_select_photos(
            photos,
            min_photos=10,
            max_photos=10  # Exactly 10 photos for 30-second reel
        )
        
        print(f"✅ Selected {len(selected_photos)} best photos")
        print(f"   Average quality: {quality_summary['average_quality']:.1f}/100")
        print(f"   Photos with faces: {quality_summary['photos_with_faces']}")
        
        # Step 3: Event Detection (CLIP AI) - Sample 3 photos
        detected_event = "general"
        event_confidence = 0.0
        
        if CLIP_AVAILABLE and clip_analysis_service:
            try:
                print("\n🎭 Step 3: Detecting event type from photos...")
                event_detections = []
                
                # Sample up to 3 photos for event detection (faster, good accuracy)
                sample_size = min(3, len(selected_photos))
                for idx in range(sample_size):
                    image_bytes, filename, analysis = selected_photos[idx]
                    detection = clip_analysis_service.detect_event_and_mood(
                        image_file=image_bytes,
                        is_base64=False
                    )
                    
                    if detection.get('success', False):
                        event_detections.append({
                            'event': detection.get('detected_event', 'general'),
                            'confidence': detection.get('event_confidence', 0.0)
                        })
                        print(f"   Photo {idx+1}: {detection.get('detected_event')} ({detection.get('event_confidence', 0):.1f}%)")
                
                # Aggregate event type (weighted by confidence)
                if event_detections:
                    event_scores = {}
                    for det in event_detections:
                        event = det['event']
                        conf = det['confidence']
                        event_scores[event] = event_scores.get(event, 0) + conf
                    
                    # Get event with highest total confidence
                    detected_event = max(event_scores, key=event_scores.get)
                    event_confidence = event_scores[detected_event] / len(event_detections)
                    
                    print(f"\n✅ Event detected: {detected_event.upper()} ({event_confidence:.1f}% confidence)")
                else:
                    print("⚠️ Event detection failed, using 'general'")
            except Exception as e:
                print(f"⚠️ Event detection error: {e}")
                detected_event = "general"
                event_confidence = 0.0
        else:
            print("ℹ️ CLIP not available, skipping event detection")
        
        # Step 4: Fetch Music (Spotify)
        music_track = None
        music_path = None
        
        if SPOTIFY_AVAILABLE and spotify_service:
            try:
                print(f"\n🎵 Step 4: Fetching music for {detected_event} event...")
                music_suggestions = spotify_service.get_mood_aware_recommendations(
                    event_type=detected_event,
                    limit=10
                )
                
                if music_suggestions and len(music_suggestions) > 0:
                    # Find best track with preview URL
                    best_track = None
                    for track in sorted(music_suggestions, key=lambda x: x.get('vibeScore', 0), reverse=True):
                        if track.get('previewUrl'):
                            best_track = track
                            break
                    
                    if best_track:
                        music_track = {
                            'title': best_track['title'],
                            'artist': best_track['artist'],
                            'spotify_url': best_track.get('spotifyUrl', ''),
                            'preview_url': best_track.get('previewUrl', ''),
                            'vibe_score': best_track.get('vibeScore', 0)
                        }
                        
                        print(f"✅ Selected: '{best_track['title']}' by {best_track['artist']}")
                        print(f"   Vibe Score: {best_track.get('vibeScore', 0):.1f}/100")
                        
                        # Download music preview (30-second MP3)
                        try:
                            import requests
                            music_response = requests.get(best_track['previewUrl'], timeout=10)
                            if music_response.status_code == 200:
                                music_path = Path(temp_dir) / "background_music.mp3"
                                music_path.write_bytes(music_response.content)
                                print(f"✅ Music downloaded: {len(music_response.content)} bytes")
                            else:
                                print(f"⚠️ Music download failed: HTTP {music_response.status_code}")
                        except Exception as e:
                            print(f"⚠️ Music download error: {e}")
                            music_path = None
                    else:
                        print("⚠️ No tracks with preview URL found")
                else:
                    print("⚠️ No music suggestions found")
            except Exception as e:
                print(f"⚠️ Music fetch error: {e}")
                traceback.print_exc()
        else:
            print("ℹ️ Spotify not available, skipping music")
        
        # Step 5: Get target dimensions
        if ratio == "9:16":
            target_width, target_height = 1080, 1920
        elif ratio == "16:9":
            target_width, target_height = 1920, 1080
        elif ratio == "1:1":
            target_width, target_height = 1080, 1080
        else:
            target_width, target_height = 1080, 1920
        
        # Step 4: Create video clips from selected photos
        clips = []
        selected_photos_info = []
        
        for idx, (image_bytes, filename, analysis) in enumerate(selected_photos):
            try:
                print(f"  Processing photo {idx+1}/{len(selected_photos)}: {filename}")
                
                # Fix orientation
                img = fix_image_orientation(image_bytes)
                print(f"    ✓ Orientation fixed, size: {img.size}")
                
                # Apply trendy filter automatically (subtle enhancement)
                img = apply_filter(img, filter_type)
                print(f"    ✓ Filter applied: {filter_type}")
                
                # Save to temp file with HIGH QUALITY
                temp_img_path = Path(temp_dir) / f"selected_{idx}.jpg"
                img.save(temp_img_path, format='JPEG', quality=95, optimize=True)
                print(f"    ✓ Saved to temp: {temp_img_path}")
                
                # Create clip
                img_clip = ImageClip(str(temp_img_path))
                img_clip = resize_to_aspect_ratio(img_clip, ratio, fit_mode="fill")
                
                # Dynamic duration based on content:
                # Photos with faces = 3.0 sec (people want to see faces longer)
                # Photos without faces = 2.5 sec (landscapes/objects)
                duration = 3.0 if analysis['face_score'] > 50 else 2.5
                img_clip = img_clip.with_duration(duration)
                
                # Apply Ken Burns effect (zoom) for engagement
                img_clip = apply_ken_burns_effect(img_clip, zoom_ratio=1.08)
                
                clips.append(img_clip)
                print(f"    ✓ Clip created successfully")
                
                # Track selected photo info (convert numpy types to Python native types)
                selected_photos_info.append({
                    "filename": filename,
                    "quality_score": float(analysis['overall_score']),
                    "has_faces": bool(analysis['face_score'] > 50),
                    "sharpness": float(analysis['sharpness']),
                    "brightness": float(analysis['brightness']),
                    "duration": float(duration)
                })
                
            except Exception as e:
                print(f"    ✗ Error processing {filename}: {e}")
                traceback.print_exc()
                continue
        
        if not clips:
            raise HTTPException(status_code=400, detail="No valid images after quality analysis")
        
        print(f"🎞️  Step 3: Created {len(clips)} video clips")
        
        # Step 5: Apply smooth transitions (fade between clips)
        print("✨ Step 4: Adding smooth transitions...")
        # Note: Crossfade temporarily disabled due to MoviePy 2.x API changes
        # TODO: Reimplement using MoviePy 2.x crossfadein/crossfadeout methods
        fade_duration = 0.5
        final_clips = clips  # Use clips directly without crossfade for now
        
        # Step 6: Concat all clips
        print("\n📹 Step 6: Rendering final video...")
        final_video = concatenate_videoclips(final_clips, method="compose")
        
        # Step 6.5: Add music if available
        if music_path and music_path.exists():
            try:
                print("🎵 Adding background music...")
                audio_clip = AudioFileClip(str(music_path))
                
                # Match audio duration to video
                if audio_clip.duration < final_video.duration:
                    # Loop audio if shorter
                    num_loops = int(final_video.duration / audio_clip.duration) + 1
                    from moviepy import concatenate_audioclips
                    audio_clip = concatenate_audioclips([audio_clip] * num_loops)
                
                # Trim to exact video duration
                audio_clip = audio_clip.subclipped(0, final_video.duration)
                
                # Set audio
                final_video = final_video.with_audio(audio_clip)
                print(f"✅ Music added to video ({audio_clip.duration:.1f}s)")
            except Exception as e:
                print(f"⚠️ Could not add music: {e}")
                traceback.print_exc()
        
        # Step 7: Save video
        output_dir = Path("storage/reels/generated") / str(user_id)
        output_dir.mkdir(parents=True, exist_ok=True)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_filename = f"auto_reel_{timestamp}.mp4"
        output_path = output_dir / output_filename
        
        final_video.write_videofile(
            str(output_path),
            fps=30,
            codec='libx264',
            audio=True,  # Audio enabled (music integrated)
            preset='slow',  # Better quality
            bitrate='8000k',  # High bitrate for quality
            threads=4,
            audio_bitrate='192k'
        )
        
        # Get file size
        file_size = output_path.stat().st_size
        
        # Clean up
        final_video.close()
        for clip in clips:
            clip.close()
        
        print(f"✅ Video saved: {output_path}")
        print(f"   Duration: {final_video.duration:.1f}s")
        print(f"   Size: {file_size / 1024 / 1024:.2f} MB")
        
        # Return response
        video_url = f"/api/reels/videos/{user_id}/{output_filename}"
        
        return AutoReelResponse(
            video_url=video_url,
            duration=float(final_video.duration),
            num_images_uploaded=int(len(files)),
            num_images_selected=int(len(selected_photos)),
            aspect_ratio=ratio,
            file_size=int(file_size),
            quality_summary=quality_summary,
            selected_photos_info=selected_photos_info,
            detected_event=detected_event if detected_event != "general" else None,
            event_confidence=float(event_confidence) if event_confidence > 0 else None,
            music_track=music_track
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error generating auto-reel: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to generate reel: {str(e)}")
    finally:
        # Clean up temp directory
        shutil.rmtree(temp_dir, ignore_errors=True)


@router.post("/generate", response_model=ReelResponse)
async def generate_reel(
    payload: ReelRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Generate a video reel from uploaded images
    
    Process:
    1. Download images from provided URLs
    2. Fix orientation and resize to aspect ratio
    3. Add intro text if provided
    4. Apply transitions
    5. Export video
    6. Save to local storage
    7. Return local file path/URL
    """
    
    # Create temporary directory for processing
    temp_dir = tempfile.mkdtemp()
    
    try:
        user_id = current_user.get("id")
        
        # Get target dimensions
        if payload.ratio == "9:16":
            target_width, target_height = 1080, 1920
        elif payload.ratio == "16:9":
            target_width, target_height = 1920, 1080
        elif payload.ratio == "1:1":
            target_width, target_height = 1080, 1080
        else:
            target_width, target_height = 1080, 1920
        
        clips = []
        
        # Create intro clip if text provided
        if payload.intro_text:
            try:
                intro_clip = create_intro_clip(
                    payload.intro_text,
                    target_width,
                    target_height,
                    duration=2.5
                )
                clips.append(intro_clip)
            except Exception as e:
                print(f"Warning: Could not create intro text: {e}")
        
        # Process each image
        for idx, image_url in enumerate(payload.images):
            try:
                # Check if it's a local file path
                if image_url.startswith("/api/reels/images/"):
                    # Extract user_id and filename from URL
                    parts = image_url.split("/")
                    url_user_id = parts[-2]
                    filename = parts[-1]
                    image_path = Path("storage/reels/uploads") / url_user_id / filename
                    
                    if not image_path.exists():
                        print(f"Image not found: {image_path}")
                        continue
                    
                    # Read local file
                    with open(image_path, "rb") as f:
                        image_bytes = f.read()
                else:
                    # Download image from external URL
                    response = requests.get(image_url, timeout=30)
                    response.raise_for_status()
                    image_bytes = response.content
                
                # Fix orientation
                img = fix_image_orientation(image_bytes)
                
                # Apply filter
                img = apply_filter(img, payload.filter)
                
                # Save to temporary file
                temp_img_path = Path(temp_dir) / f"image_{idx}.png"
                img.save(temp_img_path, format='PNG')
                
                # Create clip
                img_clip = ImageClip(str(temp_img_path))
                
                # Resize to aspect ratio with selected fit mode
                img_clip = resize_to_aspect_ratio(img_clip, payload.ratio, payload.fit_mode)
                
                # Set duration
                img_clip = img_clip.with_duration(payload.duration_per_image)
                
                # Apply Ken Burns effect if enabled
                if payload.ken_burns:
                    img_clip = apply_ken_burns_effect(img_clip, zoom_ratio=1.10)
                
                clips.append(img_clip)
                
            except Exception as e:
                print(f"Error processing image {idx}: {e}")
                continue
        
        if not clips:
            raise HTTPException(status_code=400, detail="No valid images to process")
        
        # Apply transitions
        if payload.transition == "fade":
            clips = apply_fade_transition(clips, fade_duration=payload.fade_duration)
        
        # Concatenate clips
        final_video = concatenate_videoclips(clips, method="compose")
        
        # Add background music if provided
        audio_clip = None
        has_audio = False
        if payload.music_upload_url:
            music_url = payload.music_upload_url
            print(f"Attempting to add music: {music_url}")
            audio_clip = process_audio(music_url, final_video.duration, payload.music_volume, temp_dir)
            
            if audio_clip:
                print("Setting audio on video clip...")
                final_video = final_video.with_audio(audio_clip)
                has_audio = True
                print(f"Audio set successfully. Video duration: {final_video.duration:.2f}s, Audio duration: {audio_clip.duration:.2f}s")
            else:
                print("WARNING: Failed to process audio, video will have no sound")
        
        # Generate timestamp for unique filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_filename = f"reel_{payload.ratio.replace(':', 'x')}_{timestamp}.mp4"
        output_path = Path(temp_dir) / output_filename
        
        # Export video with proper audio settings
        print(f"Exporting video to: {output_path}")
        print(f"Audio enabled: {has_audio}")
        
        final_video.write_videofile(
            str(output_path),
            fps=30,
            codec='libx264',
            audio=has_audio,
            audio_codec='aac' if has_audio else None,
            preset='medium',
            threads=4,
            logger=None  # Suppress MoviePy logs
        )
        
        print(f"Video exported successfully: {output_path}")
        
        # Get video duration
        video_duration = final_video.duration
        
        # Clean up clips
        final_video.close()
        for clip in clips:
            clip.close()
        if audio_clip:
            audio_clip.close()
        
        # Create local storage directory if it doesn't exist
        local_storage_dir = Path("storage/reels") / str(user_id)
        local_storage_dir.mkdir(parents=True, exist_ok=True)
        
        # Move video to local storage
        final_output_path = local_storage_dir / output_filename
        shutil.move(str(output_path), str(final_output_path))
        
        # Get file size
        file_size = final_output_path.stat().st_size
        
        # Create absolute URL for accessing the video
        video_url = f"http://localhost:8000/api/reels/videos/{user_id}/{output_filename}"
        
        return ReelResponse(
            video_url=video_url,
            duration=video_duration,
            num_images=len(payload.images),
            aspect_ratio=payload.ratio,
            file_size=file_size
        )
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error generating reel: {e}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Failed to generate reel: {str(e)}")
    
    finally:
        # Clean up temporary directory
        try:
            shutil.rmtree(temp_dir)
        except:
            pass


@router.get("/user-reels")
async def get_user_reels(current_user: dict = Depends(get_current_user)):
    """Get all reels created by the current user from local storage"""
    try:
        user_id = current_user.get("id")
        
        # Check if user's reel folder exists
        local_storage_dir = Path("storage/reels") / str(user_id)
        
        if not local_storage_dir.exists():
            return {"reels": []}
        
        # List all video files in user's folder
        reels = []
        for video_file in local_storage_dir.glob("*.mp4"):
            file_stat = video_file.stat()
            
            reels.append({
                "name": video_file.name,
                "url": f"/api/reels/videos/{user_id}/{video_file.name}",
                "created_at": datetime.fromtimestamp(file_stat.st_ctime).isoformat(),
                "size": file_stat.st_size
            })
        
        # Sort by creation time (newest first)
        reels.sort(key=lambda x: x["created_at"], reverse=True)
        
        return {"reels": reels}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch user reels: {str(e)}")


@router.get("/music/{user_id}/{filename}")
async def serve_music(user_id: str, filename: str):
    """Serve music file from local storage"""
    try:
        music_path = Path("storage/reels/music") / user_id / filename
        
        if not music_path.exists():
            raise HTTPException(status_code=404, detail="Music file not found")
        
        # Determine media type based on file extension
        media_type = "audio/mpeg" if filename.endswith('.mp3') else "audio/wav"
        
        return FileResponse(
            path=str(music_path),
            media_type=media_type,
            filename=filename
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to serve music: {str(e)}")


@router.get("/videos/{user_id}/{filename}")
async def serve_video(user_id: str, filename: str, download: bool = False):
    """Serve video file from local storage"""
    try:
        video_path = Path("storage/reels/generated") / user_id / filename
        
        if not video_path.exists():
            raise HTTPException(status_code=404, detail="Video not found")
        
        headers = {}
        if download:
            headers["Content-Disposition"] = f'attachment; filename="{filename}"'
        else:
            headers["Content-Disposition"] = f'inline; filename="{filename}"'
        
        return FileResponse(
            path=str(video_path),
            media_type="video/mp4",
            headers=headers
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to serve video: {str(e)}")

@router.post("/save-metadata")
async def save_reel_metadata(
    video_url: str,
    title: str = "My Reel",
    duration: int = 0,
    thumbnail_url: Optional[str] = None,
    is_public: bool = True,
    current_user: dict = Depends(get_current_user)
):
    """Save reel metadata to database after generation"""
    try:
        user_id = current_user.get("id") or current_user.get("sub")
        
        reel_record = {
            "user_id": user_id,
            "title": title,
            "video_url": video_url,
            "thumbnail_url": thumbnail_url,
            "duration": duration,
            "is_public": is_public
        }
        
        resp = supabase.table('reels').insert(reel_record).execute()
        return {"success": True, "data": resp.data}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/database")
async def get_reels_from_database(current_user: dict = Depends(get_current_user)):
    """Get all reels for current user from database"""
    try:
        user_id = current_user.get("id") or current_user.get("sub")
        
        resp = supabase.table('reels').select('*').eq('user_id', user_id).order('created_at', desc=True).execute()
        return {"success": True, "data": resp.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))