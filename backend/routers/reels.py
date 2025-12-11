"""  
Reel Generator Router - Create video reels from images
Uses MoviePy for video processing and local file storage
"""

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from typing import Optional, List
import requests
from io import BytesIO
from pathlib import Path
import tempfile
import shutil
from datetime import datetime
import traceback
import numpy as np

# MoviePy imports
try:
    from moviepy.editor import ImageClip, TextClip, concatenate_videoclips, ColorClip, CompositeVideoClip, AudioFileClip
except ImportError:
    print("Warning: MoviePy not available. Reel generation will not work.")
    ImageClip = None
    TextClip = None
    concatenate_videoclips = None
    ColorClip = None
    CompositeVideoClip = None
    AudioFileClip = None

from PIL import Image, ImageDraw, ImageFont, ImageEnhance

# Supabase - fix import path
from backend.supabase_client import supabase
from backend.auth import get_current_user

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
        # Vibrant - increase saturation and brightness
        enhancer = ImageEnhance.Color(img)
        img = enhancer.enhance(1.4)  # Increase saturation
        
        enhancer = ImageEnhance.Brightness(img)
        img = enhancer.enhance(1.1)  # Slight brightness boost
        
        enhancer = ImageEnhance.Contrast(img)
        img = enhancer.enhance(1.1)  # Slight contrast boost
        
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
        
        # Get EXIF orientation tag
        for orientation in ExifTags.TAGS.keys():
            if ExifTags.TAGS[orientation] == 'Orientation':
                break
        
        exif = img._getexif()
        
        if exif is not None and orientation in exif:
            orientation_value = exif[orientation]
            
            # Rotate based on orientation value
            if orientation_value == 3:
                img = img.rotate(180, expand=True)
            elif orientation_value == 6:
                img = img.rotate(270, expand=True)
            elif orientation_value == 8:
                img = img.rotate(90, expand=True)
        
        return img
    
    except Exception as e:
        # If any error, return image without rotation
        return Image.open(BytesIO(image_bytes))


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
        clip = clip.resize(width=new_width, height=new_height)
        
        # Crop to exact target size from center
        clip = clip.crop(
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
        clip = clip.resize(width=new_width, height=new_height)
        
        # Add black padding to center the image
        # Create black background
        background = ColorClip(size=(target_width, target_height), color=(0, 0, 0))
        background = background.set_duration(clip.duration)
        
        # Center the clip on the background
        clip = clip.set_position(('center', 'center'))
        
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
    """
    def zoom_in_effect(get_frame, t):
        """Zoom in from 1.0x to zoom_ratio over duration"""
        frame = get_frame(t)
        h, w = frame.shape[:2]
        
        # Calculate progress (0 to 1)
        progress = t / clip.duration
        
        # Current zoom level
        current_zoom = 1.0 + (zoom_ratio - 1.0) * progress
        
        # New dimensions after zoom
        new_h = int(h / current_zoom)
        new_w = int(w / current_zoom)
        
        # Center crop
        y1 = (h - new_h) // 2
        x1 = (w - new_w) // 2
        y2 = y1 + new_h
        x2 = x1 + new_w
        
        # Crop and resize back to original size
        cropped = frame[y1:y2, x1:x2]
        
        # Resize back using PIL for better quality
        from PIL import Image
        img = Image.fromarray(cropped)
        img = img.resize((w, h), Image.LANCZOS)
        
        return np.array(img)
    
    # Apply the zoom effect
    return clip.fl(zoom_in_effect)


def apply_fade_transition(clips, fade_duration=0.5):
    """Apply fade in/out transitions between clips"""
    faded_clips = []
    
    for i, clip in enumerate(clips):
        if i == 0:
            # First clip: fade in only
            faded_clips.append(clip.fadein(fade_duration))
        elif i == len(clips) - 1:
            # Last clip: fade out only
            faded_clips.append(clip.fadeout(fade_duration))
        else:
            # Middle clips: fade in and out
            faded_clips.append(clip.fadein(fade_duration).fadeout(fade_duration))
    
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
        # Download audio file
        audio_response = requests.get(music_url, timeout=30)
        if audio_response.status_code != 200:
            raise Exception(f"Failed to download audio: {audio_response.status_code}")
        
        # Save to temp file
        audio_path = Path(temp_dir) / "music.mp3"
        with open(audio_path, 'wb') as f:
            f.write(audio_response.content)
        
        # Load audio clip
        audio_clip = AudioFileClip(str(audio_path))
        
        # Adjust duration
        if audio_clip.duration < video_duration:
            # Loop audio if shorter than video
            loops_needed = int(video_duration / audio_clip.duration) + 1
            from moviepy.audio.AudioClip import concatenate_audioclips
            audio_clip = concatenate_audioclips([audio_clip] * loops_needed)
        
        # Trim to exact video duration
        audio_clip = audio_clip.subclip(0, video_duration)
        
        # Adjust volume (0-100 to 0.0-1.0)
        volume_factor = volume / 100.0
        audio_clip = audio_clip.volumex(volume_factor)
        
        return audio_clip
    
    except Exception as e:
        print(f"Error processing audio: {e}")
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
    intro_clip = ImageClip(intro_array).set_duration(duration)
    
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
        music_url = f"http://localhost:5000/api/reels/music/{user_id}/{filename}"
        
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
                img_clip = img_clip.set_duration(payload.duration_per_image)
                
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
        if payload.music_upload_url or payload.spotify_preview_url:
            music_url = payload.music_upload_url or payload.spotify_preview_url
            audio_clip = process_audio(music_url, final_video.duration, payload.music_volume, temp_dir)
            
            if audio_clip:
                final_video = final_video.set_audio(audio_clip)
        
        # Generate timestamp for unique filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_filename = f"reel_{payload.ratio.replace(':', 'x')}_{timestamp}.mp4"
        output_path = Path(temp_dir) / output_filename
        
        # Export video
        final_video.write_videofile(
            str(output_path),
            fps=30,
            codec='libx264',
            audio=True if audio_clip else False,
            preset='medium',
            threads=4,
            logger=None  # Suppress MoviePy logs
        )
        
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
        video_url = f"http://localhost:5000/api/reels/videos/{user_id}/{output_filename}"
        
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
async def serve_video(user_id: str, filename: str):
    """Serve video file from local storage"""
    try:
        video_path = Path("storage/reels") / user_id / filename
        
        if not video_path.exists():
            raise HTTPException(status_code=404, detail="Video not found")
        
        return FileResponse(
            path=str(video_path),
            media_type="video/mp4",
            filename=filename
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to serve video: {str(e)}")
