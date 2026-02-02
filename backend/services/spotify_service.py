import spotipy
from spotipy.oauth2 import SpotifyClientCredentials
import os
from dotenv import load_dotenv
from pathlib import Path

# Load .env from project root (parent of backend directory)
env_path = Path(__file__).resolve().parent.parent.parent / '.env'
load_dotenv(dotenv_path=env_path, encoding='utf-8')

class SpotifyService:
    def __init__(self):
        client_id = os.getenv('SPOTIFY_CLIENT_ID')
        client_secret = os.getenv('SPOTIFY_CLIENT_SECRET')
        
        if not client_id or not client_secret:
            print("WARNING: Spotify credentials not found in .env file")
            self.client = None
        else:
            try:
                self.client = spotipy.Spotify(
                    auth_manager=SpotifyClientCredentials(
                        client_id=client_id,
                        client_secret=client_secret
                    )
                )
                print("SUCCESS: Spotify service initialized successfully")
            except Exception as e:
                print(f"ERROR: Failed to initialize Spotify service: {e}")
                self.client = None
    
    # Event-specific search queries for Pakistani/South Asian music
    EVENT_QUERIES = {
        'mehndi': [
            'mehndi songs pakistani',
            'dholki songs',
            'punjabi mehndi dance'
        ],
        'barat': [
            'pakistani wedding songs',
            'barat songs',
            'shaadi songs'
        ],
        'valima': [
            'romantic pakistani songs',
            'walima songs',
            'sufi romantic'
        ],
        'engagement': [
            'pakistani love songs',
            'engagement songs',
            'romantic bollywood'
        ],
        'birthday': [
            'happy birthday songs',
            'party songs',
            'celebration music'
        ],
        'family': [
            'pakistani folk songs',
            'family gathering music',
            'desi family songs'
        ],
        'corporate': [
            'instrumental background music',
            'corporate event music',
            'ambient professional music'
        ]
    }
    
    def get_event_recommendations(self, event_type, genre=None, limit=10):
        """
        Get music recommendations for specific event type
        Returns 3-5+ tracks per event type as per SRS requirement
        """
        if not self.client:
            print("ERROR: Spotify client not initialized")
            return []
        
        queries = self.EVENT_QUERIES.get(event_type, ['party music'])
        tracks = []
        
        for query in queries:
            try:
                # Add genre to query if specified
                search_query = query
                if genre and genre != 'all':
                    search_query = f"{query} {genre}"
                
                # Spotify API max limit is 50
                search_limit = min(50, limit // len(queries) + 2)
                
                results = self.client.search(
                    q=search_query,
                    type='track',
                    limit=search_limit,
                    market='PK'  # Pakistani market for better local results
                )
                
                for track in results['tracks']['items']:
                    if len(tracks) >= limit:
                        break
                    
                    # Avoid duplicates
                    if any(t['id'] == track['id'] for t in tracks):
                        continue
                    
                    tracks.append({
                        'id': track['id'],
                        'title': track['name'],
                        'artist': ', '.join([a['name'] for a in track['artists']]),
                        'album': track['album']['name'],
                        'duration': self._format_duration(track['duration_ms']),
                        'previewUrl': track.get('preview_url'),
                        'spotifyUrl': track['external_urls']['spotify'],
                        'imageUrl': track['album']['images'][0]['url'] if track['album']['images'] else None,
                        'eventType': event_type,
                        'popular': track.get('popularity', 0) > 70
                    })
                
                if len(tracks) >= limit:
                    break
                    
            except Exception as e:
                print(f"Error searching '{query}': {e}")
                continue
        
        # Ensure minimum 3-5 tracks (SRS requirement)
        if len(tracks) < 3:
            print(f"WARNING: Only found {len(tracks)} tracks for {event_type}")
        
        return tracks[:limit]
    
    def search_tracks(self, query, limit=10):
        """Search Spotify for tracks"""
        if not self.client:
            return []
        
        try:
            results = self.client.search(q=query, type='track', limit=limit, market='PK')
            tracks = []
            for track in results['tracks']['items']:
                tracks.append({
                    'id': track['id'],
                    'title': track['name'],
                    'artist': ', '.join([a['name'] for a in track['artists']]),
                    'album': track['album']['name'],
                    'duration': self._format_duration(track['duration_ms']),
                    'previewUrl': track.get('preview_url'),
                    'spotifyUrl': track['external_urls']['spotify'],
                    'imageUrl': track['album']['images'][0]['url'] if track['album']['images'] else None,
                    'popular': track.get('popularity', 0) > 70
                })
            return tracks
        except Exception as e:
            print(f"Search error: {e}")
            return []
    
    def get_track_details(self, track_id):
        """Get detailed information for a specific track"""
        if not self.client:
            return None
        
        try:
            track = self.client.track(track_id)
            return {
                'id': track['id'],
                'title': track['name'],
                'artist': ', '.join([a['name'] for a in track['artists']]),
                'album': track['album']['name'],
                'duration': self._format_duration(track['duration_ms']),
                'previewUrl': track.get('preview_url'),
                'spotifyUrl': track['external_urls']['spotify'],
                'imageUrl': track['album']['images'][0]['url'] if track['album']['images'] else None,
                'releaseDate': track['album']['release_date'],
                'popularity': track['popularity']
            }
        except Exception as e:
            print(f"Track details error: {e}")
            return None
    
    def get_playlist_tracks(self, playlist_id, limit=50):
        """
        Get tracks from a Spotify playlist
        Returns tracks sorted by popularity (high to low)
        """
        if not self.client:
            print("ERROR: Spotify client not initialized")
            return []
        
        try:
            # Fetch playlist tracks
            results = self.client.playlist_tracks(
                playlist_id,
                limit=limit,
                market='PK'  # Pakistan market for regional content
            )
            
            tracks = []
            for item in results['items']:
                if not item or not item.get('track'):
                    continue
                
                track = item['track']
                
                # Skip tracks without preview (important for playback)
                if not track.get('preview_url'):
                    continue
                
                tracks.append({
                    'id': track['id'],
                    'title': track['name'],
                    'artist': ', '.join([a['name'] for a in track['artists']]),
                    'album': track['album']['name'],
                    'duration': self._format_duration(track['duration_ms']),
                    'previewUrl': track.get('preview_url'),
                    'spotifyUrl': track['external_urls']['spotify'],
                    'imageUrl': track['album']['images'][0]['url'] if track['album']['images'] else None,
                    'popularity': track.get('popularity', 0),
                    'addedAt': item.get('added_at')
                })
            
            # Sort by popularity (high to low)
            tracks.sort(key=lambda x: x['popularity'], reverse=True)
            
            print(f"✓ Fetched {len(tracks)} playable tracks from playlist {playlist_id}")
            return tracks
            
        except Exception as e:
            print(f"ERROR: Failed to fetch playlist {playlist_id}: {e}")
            return []
    
    def _format_duration(self, ms):
        """Convert milliseconds to MM:SS format"""
        seconds = ms // 1000
        minutes = seconds // 60
        seconds = seconds % 60
        return f"{minutes}:{seconds:02d}"
    
    def get_mood_aware_recommendations(self, event_type, mood="calm", limit=10):
        """
        Get music recommendations for event type.
        
        Note: Audio features filtering requires Spotify Web API extended quota.
        For basic API access, we skip mood filtering and return event-based results.
        """
        if not self.client:
            print("ERROR: Spotify client not initialized")
            return []
        
        # Get tracks using event keywords (cap at 50 to avoid API limits)
        fetch_limit = min(50, limit)
        base_tracks = self.get_event_recommendations(event_type, limit=fetch_limit)
        
        print(f"🎵 Fetched {len(base_tracks) if base_tracks else 0} tracks for '{event_type}' event")
        
        if not base_tracks:
            print(f"⚠️ No tracks found for event '{event_type}'.")
            return []
        
        return base_tracks[:limit]


# Singleton instance
spotify_service = SpotifyService()
