"""
Thumbnail Service - Generate downscaled images for fast preview
Module 6: Smart Album Builder
"""
import os
from PIL import Image
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

THUMBNAIL_SIZE = (400, 400)  # Max dimensions for preview

def generate_thumbnail(image_path: str, thumbnail_path: str, size: tuple = THUMBNAIL_SIZE):
    """
    Generate a thumbnail for an image
    
    Args:
        image_path: Path to original image
        thumbnail_path: Path to save thumbnail
        size: Max dimensions (width, height)
    """
    try:
        with Image.open(image_path) as img:
            # Convert to RGB if necessary (handles RGBA, grayscale, etc.)
            if img.mode not in ('RGB', 'L'):
                img = img.convert('RGB')
            
            # Thumbnail maintains aspect ratio
            img.thumbnail(size, Image.Resampling.LANCZOS)
            
            # Save with reduced quality for smaller file size
            img.save(thumbnail_path, 'JPEG', quality=85, optimize=True)
            
        return True
    except Exception as e:
        logger.error(f"Failed to generate thumbnail for {image_path}: {e}")
        return False


def generate_album_thumbnails(organized_folder: str):
    """
    Generate thumbnails for all organized albums
    
    Creates thumbnails/ folder with same structure:
    - thumbnails/Highlights/
    - thumbnails/Person_1/
    - thumbnails/Groups/
    
    Args:
        organized_folder: Path to organized/ folder
    """
    thumbnails_root = os.path.join(os.path.dirname(organized_folder), "thumbnails")
    os.makedirs(thumbnails_root, exist_ok=True)
    
    logger.info(f"Generating thumbnails in {thumbnails_root}")
    
    total_generated = 0
    
    # Process each subfolder
    for folder_name in os.listdir(organized_folder):
        source_folder = os.path.join(organized_folder, folder_name)
        
        if not os.path.isdir(source_folder):
            continue
        
        # Create corresponding thumbnail folder
        thumb_folder = os.path.join(thumbnails_root, folder_name)
        os.makedirs(thumb_folder, exist_ok=True)
        
        # Generate thumbnails for each image
        for img_file in os.listdir(source_folder):
            if not img_file.lower().endswith(('.jpg', '.jpeg', '.png')):
                continue
            
            source_path = os.path.join(source_folder, img_file)
            thumb_path = os.path.join(thumb_folder, img_file)
            
            # Skip if thumbnail already exists
            if os.path.exists(thumb_path):
                continue
            
            if generate_thumbnail(source_path, thumb_path):
                total_generated += 1
    
    logger.info(f"Generated {total_generated} thumbnails")
    return total_generated
