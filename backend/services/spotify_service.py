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
            self.client_id = None
            self.client_secret = None
        else:
            self.client_id = client_id
            self.client_secret = client_secret
            self._initialize_client()
    
    def _initialize_client(self):
        """Initialize or reinitialize the Spotify client"""
        try:
            self.client = spotipy.Spotify(
                auth_manager=SpotifyClientCredentials(
                    client_id=self.client_id,
                    client_secret=self.client_secret
                )
            )
            print("SUCCESS: Spotify service initialized successfully")
        except Exception as e:
            print(f"ERROR: Failed to initialize Spotify service: {e}")
            self.client = None
    
    def _ensure_client(self):
        """Ensure client is initialized, reinitialize if needed"""
        if not self.client and self.client_id and self.client_secret:
            print("🔄 Reinitializing Spotify client...")
            self._initialize_client()
        return self.client is not None
    
    # 🎵 Custom curated playlists (USER-CREATED) - HIGHEST PRIORITY
    CUSTOM_PLAYLISTS = {
        'mehndi': '4848ZkWeM8Ut3JM3kfcepy',
        'barat': '0Mg9QB6YJyjnmJkTreKWOE',
        'walima': '5uh1m66xZNODbbXunsURCu',
        'birthday': '1YhFtD5duKmrPq50fAf70a',
        'corporate': '3cgRMNpZOJzmJPLdibErF1'
    }
    
    # Event-specific search queries for Pakistani/South Asian music (FALLBACK after playlists)
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
        'walima': [
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
        Note: Includes tracks without preview URLs (still playable in app)
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
                
                # Skip only if track is completely null/invalid
                if not track.get('id') or not track.get('name'):
                    continue
                
                tracks.append({
                    'id': track['id'],
                    'title': track['name'],
                    'artist': ', '.join([a['name'] for a in track['artists']]) if track.get('artists') else 'Unknown Artist',
                    'album': track['album']['name'] if track.get('album') else 'Unknown Album',
                    'duration': self._format_duration(track['duration_ms']) if track.get('duration_ms') else '0:00',
                    'previewUrl': track.get('preview_url'),  # May be None, that's OK
                    'spotifyUrl': track['external_urls']['spotify'] if track.get('external_urls') else '',
                    'imageUrl': track['album']['images'][0]['url'] if track.get('album') and track['album'].get('images') else None,
                    'popularity': track.get('popularity', 0),
                    'addedAt': item.get('added_at'),
                    'source': 'playlist'  # Track source for debugging
                })
            
            # Sort by popularity (high to low)
            tracks.sort(key=lambda x: x['popularity'], reverse=True)
            
            print(f"✓ Fetched {len(tracks)} tracks from custom playlist {playlist_id}")
            return tracks
            
        except Exception as e:
            print(f"⚠️  Could not fetch playlist {playlist_id}: {e}")
            return []
    
    def _format_duration(self, ms):
        """Convert milliseconds to MM:SS format"""
        seconds = ms // 1000
        minutes = seconds // 60
        seconds = seconds % 60
        return f"{minutes}:{seconds:02d}"
    
    def get_mood_aware_recommendations(self, event_type, mood="calm", limit=10):
        """
        Get music recommendations using keyword search first, then playlists.
        
        NOTE: Mood filtering is DISABLED as of Feb 2026.
        Spotify no longer provides audio features API access to new developers.
        
        Strategy (Priority Order):
        1️⃣  TRY KEYWORD SEARCH (Spotify API) - fresh variety & broad selection
        2️⃣  FALLBACK TO PLAYLISTS (user-curated) - if keywords insufficient
        ❌ 3️⃣  FILTER BY MOOD (DEPRECATED - Spotify removed audio features API)
        
        Args:
            event_type: Event type (mehndi, barat, walima, etc.)
            mood: DEPRECATED - kept for backwards compatibility but not used
            limit: Number of tracks to return
        """
        # Ensure Spotify client is initialized
        if not self._ensure_client():
            print("ERROR: Spotify client not available")
            return []
        
        # ❌ MOOD FILTERING DISABLED (Feb 2026)
        # Spotify deprecated audio features API for new developers
        # 
        # # Define target audio features based on detected mood
        # MOOD_FILTERS = {
        #     "energetic": {"energy_min": 0.6, "danceability_min": 0.5, "valence_min": 0.35},
        #     "romantic": {"energy_max": 0.75, "energy_min": 0.1, "valence_min": 0.3},
        #     "calm": {"energy_max": 0.55},
        #     "dance": {"danceability_min": 0.6, "energy_min": 0.5},
        # }
        # 
        # target_mood = mood.lower() if mood in MOOD_FILTERS else "calm"
        # mood_params = MOOD_FILTERS[target_mood]
        
        try:
            # Step 1️⃣: Try Keyword Search FIRST (Spotify API - fresh variety)
            base_tracks = []
            fetch_limit = min(75, limit * 3)  # Fetch 3x to have enough after filtering
            
            print(f"🔍 Keyword-First Strategy: Searching Spotify for '{event_type}'")
            base_tracks = self.get_event_recommendations(event_type, limit=fetch_limit)
            
            # Step 2️⃣: Fallback to Custom Playlists if keyword search insufficient
            if len(base_tracks) < limit:
                playlist_id = self.CUSTOM_PLAYLISTS.get(event_type)
                if playlist_id:
                    print(f"📋 Playlist Fallback: Keyword search returned {len(base_tracks)} tracks, fetching from playlist")
                    playlist_tracks = self.get_playlist_tracks(playlist_id, limit=fetch_limit)
                    
                    # Combine: keywords first (variety), then playlists (curated backup)
                    for track in playlist_tracks:
                        if len(base_tracks) >= fetch_limit:
                            break
                        # Avoid duplicates
                        if any(t['id'] == track['id'] for t in base_tracks):
                            continue
                        base_tracks.append(track)
                    
                    print(f"✓ Combined: {len(base_tracks)} total tracks (keywords + playlist)")
            
            if not base_tracks:
                print(f"❌ No tracks found for event '{event_type}' from keywords or playlists")
                return []
            
            # ❌ MOOD FILTERING DISABLED (Feb 2026) - Audio features API deprecated
            # Returning event-based tracks without mood filtering
            print(f"✅ Music: Returning {min(len(base_tracks), limit)} {event_type} tracks (mood filtering unavailable)")
            return base_tracks[:limit]
            
            # # Step 3️⃣: Batch fetch audio features (use smaller batch to avoid Spotify rate limits)
            # track_ids = [t["id"] for t in base_tracks]
            # audio_features_map = {}
            # 
            # # Try with smaller batches and retry logic
            # batch_size = 50  # Start with 50
            # max_retries = 2
            # 
            # for i in range(0, len(track_ids), batch_size):
            #     batch_ids = track_ids[i:i+batch_size]
            #     retry_count = 0
            #     success = False
            #     
            #     while retry_count < max_retries and not success:
            #         try:
            #             features_list = self.client.audio_features(batch_ids)
            #             
            #             if features_list:
            #                 for features in features_list:
            #                     if features:
            #                         audio_features_map[features["id"]] = features
            #                 success = True
            #                 
            #         except Exception as e:
            #             retry_count += 1
            #             error_msg = str(e)
            #             
            #             # Check if it's a 403 error (permission issue)
            #             if "403" in error_msg:
            #                 print(f"⚠️  403 Forbidden: Spotify credentials may lack permissions for audio features")
            #                 print(f"   Error details: {error_msg[:150]}")
            #                 break  # Don't retry on 403 - it won't help
            #             
            #             # Check if it's rate limiting
            #             elif "429" in error_msg or "rate" in error_msg.lower():
            #                 print(f"⚠️  Rate limited by Spotify API. Waiting before retry...")
            #                 import time
            #                 time.sleep(1)  # Wait 1 second before retry
            #             
            #             else:
            #                 print(f"⚠️  Warning: Failed to fetch audio features for batch {i//batch_size + 1}: {error_msg[:100]}")
            #             
            #             if retry_count >= max_retries:
            #                 print(f"   Giving up on batch after {max_retries} attempts")
            #                 break
            # 
            # # If we couldn't get any audio features, return base tracks without mood filtering
            # if not audio_features_map:
            #     print(f"⚠️  Audio features unavailable (Spotify API issue). Returning base {event_type} tracks without mood filtering.")
            #     print(f"   💡 Tip: Check if your Spotify app has 'user-read-playback-state' scope enabled")
            #     return base_tracks[:limit]
            # 
            # print(f"✅ Successfully fetched audio features for {len(audio_features_map)}/{len(track_ids)} tracks")
            # 
            # # Step 4️⃣: Filter and score tracks based on mood
            # scored_tracks = []
            # for track in base_tracks:
            #     track_id = track["id"]
            #     features = audio_features_map.get(track_id)
            #     
            #     if not features:
            #         # Skip tracks without features (rare)
            #         continue
            #     
            #     # Check if track matches mood criteria
            #     matches_mood = True
            #     if "energy_min" in mood_params and features.get("energy", 0) < mood_params["energy_min"]:
            #         matches_mood = False
            #     if "energy_max" in mood_params and features.get("energy", 1) > mood_params["energy_max"]:
            #         matches_mood = False
            #     if "danceability_min" in mood_params and features.get("danceability", 0) < mood_params["danceability_min"]:
            #         matches_mood = False
            #     if "valence_min" in mood_params and features.get("valence", 0) < mood_params["valence_min"]:
            #         matches_mood = False
            #     if "acousticness_min" in mood_params and features.get("acousticness", 0) < mood_params["acousticness_min"]:
            #         matches_mood = False
            #     
            #     if not matches_mood:
            #         continue
            #     
            #     # Calculate mood relevance score (higher = better match)
            #     mood_score = 0
            #     if target_mood == \"energetic\":
            #         mood_score = (features.get(\"energy\", 0) * 0.4 + 
            #                      features.get(\"danceability\", 0) * 0.4 + 
            #                      features.get(\"valence\", 0) * 0.2)
            #     elif target_mood == \"romantic\":
            #         mood_score = (features.get(\"valence\", 0) * 0.4 + 
            #                      features.get(\"acousticness\", 0) * 0.3 + 
            #                      (1 - features.get(\"energy\", 0)) * 0.3)
            #     elif target_mood == \"calm\":
            #         mood_score = ((1 - features.get(\"energy\", 0)) * 0.5 +
            #                      features.get(\"acousticness\", 0) * 0.5)
            #     elif target_mood == \"dance\":
            #         mood_score = (features.get(\"danceability\", 0) * 0.5 + 
            #                      features.get(\"energy\", 0) * 0.5)
            #     
            #     # Add base popularity bonus
            #     popularity_bonus = track.get(\"popular\", False) * 0.1
            #     total_score = mood_score + popularity_bonus
            #     
            #     tracked_track = track.copy()
            #     tracked_track[\"mood_score\"] = total_score
            #     tracked_track[\"audio_features\"] = {
            #         \"energy\": round(features.get(\"energy\", 0), 2),
            #         \"danceability\": round(features.get(\"danceability\", 0), 2),
            #         \"valence\": round(features.get(\"valence\", 0), 2),
            #         \"acousticness\": round(features.get(\"acousticness\", 0), 2),
            #         \"tempo\": round(features.get(\"tempo\", 0), 0)
            #     }
            #     scored_tracks.append(tracked_track)
            # 
            # # Step 5️⃣: Sort by mood relevance and return top results
            # if not scored_tracks:
            #     print(f\"⚠️  No tracks matched mood criteria ({target_mood}). Returning all base {event_type} tracks.\")
            #     return base_tracks[:limit]
            # 
            # scored_tracks.sort(key=lambda x: x[\"mood_score\"], reverse=True)
            # 
            # result = scored_tracks[:limit]
            # matched_pct = (len(scored_tracks) / len(base_tracks) * 100) if base_tracks else 0
            # print(f\"✅ Music: {len(result)}/{len(scored_tracks)} mood-matched for '{event_type}' ({target_mood}) [{matched_pct:.0f}% pass rate]\")

        except Exception as e:
            print(f"ERROR in recommendations: {0}".format(e))
            print("Fallback: Returning basic event recommendations")
            fallback = self.get_event_recommendations(event_type, limit=limit)
            return fallback if fallback else []


# Singleton instance
spotify_service = SpotifyService()
