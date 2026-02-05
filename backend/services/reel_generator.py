"""
Reel Generator - Video creation from highlights
Module 6: Smart Album Builder
"""

import os
from typing import Optional
import logging

logger = logging.getLogger(__name__)

# Optional moviepy import with graceful degradation
try:
    from moviepy.editor import ImageClip, concatenate_videoclips, AudioFileClip, vfx
    MOVIEPY_AVAILABLE = True
except ImportError:
    logger.warning("MoviePy not available. Reel generation will not work.")
    MOVIEPY_AVAILABLE = False
    # Define dummy classes to prevent errors
    ImageClip = None
    concatenate_videoclips = None
    AudioFileClip = None
    vfx = None


class ReelGenerator:
    """Generates video reels from highlight photos"""
    
    def __init__(self, user_result_folder: str):
        self.user_result_folder = user_result_folder
        self.highlights_path = os.path.join(user_result_folder, "Highlights")
        
    def generate_reel(
        self, 
        output_filename: str = "final_reel.mp4",
        music_file: Optional[str] = None,
        duration_per_image: float = 2.0,
        target_height: int = 1080,
        fps: int = 24
    ) -> dict:
        """
        Generate a video reel from highlights folder
        
        Args:
            output_filename: Name of output video file
            music_file: Optional path to background music
            duration_per_image: Seconds to show each photo
            target_height: Video height in pixels (1080 for HD)
            fps: Frames per second
            
        Returns:
            dict with status and output path
        """
        if not MOVIEPY_AVAILABLE:
            return {
                "success": False,
                "error": "MoviePy is not installed. Video generation is not available."
            }
            
        try:
            # Check if highlights exist
            if not os.path.exists(self.highlights_path):
                return {
                    "success": False,
                    "error": "Highlights folder not ready yet. Please wait for processing to complete."
                }
            
            # Get all images
            images = sorted([
                img for img in os.listdir(self.highlights_path) 
                if img.lower().endswith(('.jpg', '.jpeg', '.png'))
            ])
            
            if not images:
                return {
                    "success": False,
                    "error": "No images found in Highlights folder."
                }
            
            logger.info(f"Creating reel with {len(images)} images")
            
            clips = []
            
            for img in images:
                path = os.path.join(self.highlights_path, img)
                
                # Create clip: with fade in effect
                clip = (ImageClip(path)
                       .set_duration(duration_per_image)
                       .fadein(0.5)
                       .resize(height=target_height))  # Ensure HD format
                clips.append(clip)
            
            # Combine all clips
            final = concatenate_videoclips(clips, method="compose")
            
            # Add music if provided
            if music_file and os.path.exists(music_file):
                try:
                    audio = AudioFileClip(music_file).subclip(0, min(final.duration, AudioFileClip(music_file).duration))
                    final = final.set_audio(audio)
                    logger.info("Background music added")
                except Exception as e:
                    logger.warning(f"Could not add music: {e}")
            
            # Generate output path
            output_path = os.path.join(self.user_result_folder, output_filename)
            
            # Export video
            logger.info(f"Exporting video to {output_path}")
            final.write_videofile(
                output_path, 
                fps=fps,
                codec='libx264',
                audio_codec='aac',
                temp_audiofile='temp-audio.m4a',
                remove_temp=True,
                logger=None  # Suppress moviepy logging
            )
            
            return {
                "success": True,
                "output_path": output_path,
                "duration": final.duration,
                "image_count": len(images)
            }
            
        except Exception as e:
            logger.error(f"Reel generation error: {e}", exc_info=True)
            return {
                "success": False,
                "error": str(e)
            }
    
    def check_highlights_ready(self) -> dict:
        """Check if highlights are ready for reel generation"""
        if not os.path.exists(self.highlights_path):
            return {
                "ready": False,
                "message": "Highlights folder does not exist. Upload and process photos first."
            }
        
        images = [img for img in os.listdir(self.highlights_path) 
                 if img.lower().endswith(('.jpg', '.jpeg', '.png'))]
        
        if not images:
            return {
                "ready": False,
                "message": "No images found in Highlights folder."
            }
        
        return {
            "ready": True,
            "image_count": len(images),
            "message": f"Ready to generate reel with {len(images)} photos."
        }


def create_reel_with_transitions(
    highlights_folder: str,
    output_path: str,
    transition_type: str = "crossfade",
    music_path: Optional[str] = None
) -> dict:
    """
    Advanced reel creation with custom transitions
    
    Transition types:
    - crossfade: Smooth fade between images
    - slide: Slide in from side
    - zoom: Zoom in effect
    """
    try:
        images = sorted([
            os.path.join(highlights_folder, img)
            for img in os.listdir(highlights_folder)
            if img.lower().endswith(('.jpg', '.jpeg', '.png'))
        ])
        
        if not images:
            return {"success": False, "error": "No images found"}
        
        clips = []
        
        for img_path in images:
            clip = ImageClip(img_path).set_duration(2.5)
            
            # Apply transition effect
            if transition_type == "crossfade":
                clip = clip.crossfadein(0.5).crossfadeout(0.5)
            elif transition_type == "zoom":
                clip = clip.resize(lambda t: 1 + 0.02 * t)  # Zoom in gradually
            elif transition_type == "slide":
                clip = clip.fx(vfx.slide_in, 0.5, 'left')
            
            clips.append(clip)
        
        # Combine
        final = concatenate_videoclips(clips, method="compose")
        
        # Add music
        if music_path and os.path.exists(music_path):
            audio = AudioFileClip(music_path).subclip(0, final.duration)
            final = final.set_audio(audio)
        
        # Export
        final.write_videofile(output_path, fps=24, codec='libx264')
        
        return {
            "success": True,
            "output_path": output_path,
            "duration": final.duration
        }
        
    except Exception as e:
        logger.error(f"Advanced reel generation error: {e}")
        return {"success": False, "error": str(e)}
