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
    from moviepy.editor import ImageClip, TextClip, concatenate_videoclips
except ImportError:
    print("Warning: MoviePy not available. Reel generation will not work.")
    ImageClip = None
    TextClip = None
    concatenate_videoclips = None

from PIL import Image, ImageDraw, ImageFont

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


class ReelResponse(BaseModel):
    video_url: str
    duration: float
    num_images: int
    aspect_ratio: str
    file_size: Optional[int] = None


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


def resize_to_aspect_ratio(clip, ratio: str):
    """Resize clip to match aspect ratio with center crop"""
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
    
    # Scale and crop
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


def create_intro_clip(text: str, width: int, height: int, duration: float = 2.5) -> ImageClip:
    """Create intro text clip using PIL"""
    # Create black background
    intro_img = Image.new('RGB', (width, height), color='black')
    draw = ImageDraw.Draw(intro_img)
    
    # Try to use a nice font, fallback to default
    try:
        font_size = 100
        font = ImageFont.truetype("arial.ttf", font_size)
    except:
        try:
            font = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", font_size)
        except:
            try:
                font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", font_size)
            except:
                font = ImageFont.load_default()
    
    # Get text bounding box for centering
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    
    # Center the text
    x = (width - text_width) // 2
    y = (height - text_height) // 2
    
    # Draw text
    draw.text((x, y), text, fill='white', font=font)
    
    # Convert PIL image to numpy array for MoviePy
    intro_array = np.array(intro_img)
    
    # Create clip from numpy array
    intro_clip = ImageClip(intro_array).set_duration(duration)
    
    return intro_clip


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
                
                # Save to temporary file
                temp_img_path = Path(temp_dir) / f"image_{idx}.png"
                img.save(temp_img_path, format='PNG')
                
                # Create clip
                img_clip = ImageClip(str(temp_img_path))
                
                # Resize to aspect ratio
                img_clip = resize_to_aspect_ratio(img_clip, payload.ratio)
                
                # Set duration
                img_clip = img_clip.set_duration(payload.duration_per_image)
                
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
        
        # Generate output filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_filename = f"reel_{payload.ratio.replace(':', 'x')}_{timestamp}.mp4"
        output_path = Path(temp_dir) / output_filename
        
        # Export video
        final_video.write_videofile(
            str(output_path),
            fps=30,
            codec='libx264',
            audio=False,
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
