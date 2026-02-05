"""
Album Organizer - Creates personalized photo albums
Organizes photos into albums by person
"""

import os
import shutil
import zipfile
from typing import List, Dict
from pathlib import Path
import logging
import json
from datetime import datetime

logger = logging.getLogger(__name__)


class AlbumOrganizer:
    """
    Organizes photos into albums by person
    - Creates folders for each person
    - Copies matching photos
    - Generates album summary
    - Creates downloadable ZIP
    """
    
    def __init__(self, output_base_dir: str):
        """
        Initialize album organizer
        
        Args:
            output_base_dir: Base directory for creating albums
        """
        self.output_base_dir = output_base_dir
        os.makedirs(output_base_dir, exist_ok=True)
        logger.info(f"Album Organizer initialized: {output_base_dir}")
    
    def create_albums(
        self,
        search_results: Dict[str, List[Dict]],
        session_id: str,
        copy_photos: bool = True
    ) -> Dict:
        """
        Create albums from search results
        
        Args:
            search_results: Dict of {person_name: [matching photos]}
            session_id: Unique session identifier
            copy_photos: Whether to copy photos (vs just create manifest)
            
        Returns:
            Album creation result with paths and stats
        """
        session_dir = os.path.join(self.output_base_dir, session_id)
        os.makedirs(session_dir, exist_ok=True)
        
        album_paths = {}
        album_stats = {}
        
        for person_name, matches in search_results.items():
            if not matches:
                logger.info(f"No photos found for {person_name}, skipping album")
                continue
            
            # Ensure matches is a list of dicts
            if not isinstance(matches, list):
                logger.error(f"Invalid matches format for {person_name}: {type(matches)}")
                continue
            
            # Filter out non-dict items
            matches = [m for m in matches if isinstance(m, dict)]
            if not matches:
                logger.warning(f"No valid matches for {person_name} after filtering")
                continue
            
            # Create person's album directory
            person_dir = os.path.join(session_dir, self._sanitize_name(person_name))
            os.makedirs(person_dir, exist_ok=True)
            
            copied_count = 0
            total_size = 0
            
            if copy_photos:
                # Copy photos to album
                for i, match in enumerate(matches, 1):
                    src_path = None
                    try:
                        src_path = match.get('photo_path')
                        if not src_path:
                            logger.warning(f"No photo_path in match {i} for {person_name}")
                            continue
                        
                        file_ext = os.path.splitext(src_path)[1]
                        dest_filename = f"{person_name}_{i:04d}{file_ext}"
                        dest_path = os.path.join(person_dir, dest_filename)
                        
                        shutil.copy2(src_path, dest_path)
                        copied_count += 1
                        total_size += os.path.getsize(dest_path)
                        
                        # Update match with new path
                        match['album_path'] = dest_path
                    
                    except Exception as e:
                        logger.error(f"Error copying {src_path or 'unknown file'}: {str(e)}")
                        continue
            
            # Create album manifest
            manifest = self._create_manifest(person_name, matches)
            manifest_path = os.path.join(person_dir, "album_manifest.json")
            with open(manifest_path, 'w') as f:
                json.dump(manifest, indent=2, fp=f)
            
            album_paths[person_name] = person_dir
            album_stats[person_name] = {
                'total_photos': len(matches),
                'copied_photos': copied_count,
                'album_size_mb': round(total_size / (1024 * 1024), 2),
                'average_similarity': round(
                    sum(m['similarity'] for m in matches) / len(matches), 3
                ) if matches else 0
            }
            
            logger.info(f"✅ Created album for {person_name}: {copied_count} photos "
                       f"({album_stats[person_name]['album_size_mb']} MB)")
        
        # Create session summary
        summary = {
            'session_id': session_id,
            'created_at': datetime.now().isoformat(),
            'albums': album_stats,
            'total_albums': len(album_paths),
            'total_photos': sum(s['total_photos'] for s in album_stats.values()),
            'total_size_mb': round(sum(s['album_size_mb'] for s in album_stats.values()), 2)
        }
        
        summary_path = os.path.join(session_dir, "session_summary.json")
        with open(summary_path, 'w') as f:
            json.dump(summary, indent=2, fp=f)
        
        return {
            'session_dir': session_dir,
            'album_paths': album_paths,
            'summary': summary,
            'summary_path': summary_path
        }
    
    def create_zip_archive(self, session_dir: str) -> str:
        """
        Create ZIP archive of albums
        
        Args:
            session_dir: Path to session directory
            
        Returns:
            Path to ZIP file
        """
        zip_path = f"{session_dir}.zip"
        
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for root, dirs, files in os.walk(session_dir):
                for file in files:
                    file_path = os.path.join(root, file)
                    arcname = os.path.relpath(file_path, session_dir)
                    zipf.write(file_path, arcname)
        
        zip_size_mb = round(os.path.getsize(zip_path) / (1024 * 1024), 2)
        logger.info(f"✅ Created ZIP archive: {zip_size_mb} MB")
        
        return zip_path
    
    def _create_manifest(self, person_name: str, matches: List[Dict]) -> Dict:
        """Create album manifest with photo details"""
        # Filter out invalid matches (ensure all are dicts)
        valid_matches = [m for m in matches if isinstance(m, dict)]
        
        if len(valid_matches) != len(matches):
            logger.warning(f"Filtered out {len(matches) - len(valid_matches)} invalid matches for {person_name}")
        
        return {
            'person_name': person_name,
            'total_photos': len(valid_matches),
            'created_at': datetime.now().isoformat(),
            'photos': [
                {
                    'photo_name': match.get('photo_name', 'unknown'),
                    'original_path': match.get('photo_path', ''),
                    'similarity_score': match.get('similarity', 0.0),
                    'face_details': match.get('face_details', {})
                }
                for match in valid_matches
            ],
            'statistics': {
                'average_similarity': round(
                    sum(m.get('similarity', 0) for m in valid_matches) / len(valid_matches), 3
                ) if valid_matches else 0,
                'min_similarity': round(min((m.get('similarity', 0) for m in valid_matches), default=0), 3),
                'max_similarity': round(max((m.get('similarity', 0) for m in valid_matches), default=0), 3)
            }
        }
    
    @staticmethod
    def _sanitize_name(name: str) -> str:
        """Sanitize name for use as directory name"""
        # Remove invalid characters
        invalid_chars = '<>:"/\\|?*'
        for char in invalid_chars:
            name = name.replace(char, '_')
        return name.strip()
    
    def get_album_summary(self, session_dir: str) -> Dict:
        """
        Get summary of existing album session
        
        Args:
            session_dir: Path to session directory
            
        Returns:
            Session summary
        """
        summary_path = os.path.join(session_dir, "session_summary.json")
        
        if os.path.exists(summary_path):
            with open(summary_path, 'r') as f:
                return json.load(f)
        
        return {}
    
    def cleanup_session(self, session_dir: str, keep_zip: bool = True):
        """
        Clean up session directory
        
        Args:
            session_dir: Path to session directory
            keep_zip: Whether to keep ZIP archive
        """
        try:
            # Remove directory
            if os.path.exists(session_dir):
                shutil.rmtree(session_dir)
                logger.info(f"Cleaned up session: {session_dir}")
            
            # Remove ZIP if requested
            zip_path = f"{session_dir}.zip"
            if not keep_zip and os.path.exists(zip_path):
                os.remove(zip_path)
                logger.info(f"Removed ZIP: {zip_path}")
        
        except Exception as e:
            logger.error(f"Error cleaning up session: {str(e)}")
