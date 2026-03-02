from fastapi import APIRouter, HTTPException, Query, UploadFile, File
from typing import Optional, List
import os
import sys
from pathlib import Path
import requests
import random
from datetime import datetime, timedelta
from collections import Counter
import base64

# Add backend directory to path
backend_dir = str(Path(__file__).resolve().parent.parent)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# Import the Spotify service
try:
    from backend.services.spotify_service import spotify_service
    SPOTIFY_AVAILABLE = True
except ImportError:
    print("WARNING: Could not import spotify_service")
    SPOTIFY_AVAILABLE = False
    spotify_service = None

# Import CLIP analysis service for multi-image detection
try:
    from backend.services.clip_analysis_service import clip_analysis_service
    CLIP_AVAILABLE = True
except ImportError:
    print("WARNING: Could not import clip_analysis_service")
    CLIP_AVAILABLE = False
    clip_analysis_service = None

router = APIRouter(prefix="/music", tags=["Music"])

# Spotify credentials (kept for backwards compatibility)
SPOTIFY_CLIENT_ID = os.getenv("SPOTIFY_CLIENT_ID", "")
SPOTIFY_CLIENT_SECRET = os.getenv("SPOTIFY_CLIENT_SECRET", "")

# Cache for Spotify token
spotify_token_cache = {
    "token": None,
    "expires_at": None
}

# Playlist mapping for event types (Custom playlists)
PLAYLIST_MAP = {
    'mehndi': ['4848ZkWeM8Ut3JM3kfcepy'],
    'barat': ['0Mg9QB6YJyjnmJkTreKWOE'],
    'walima': ['5uh1m66xZNODbbXunsURCu'],
    'birthday': ['1YhFtD5duKmrPq50fAf70a'],
    'corporate': ['3cgRMNpZOJzmJPLdibErF1']
}

# Vibe filtering rules for each event type (relaxed thresholds)
VIBE_RULES = {
    'mehndi': {'energy_min': 0.4, 'danceability_min': 0.4},
    'barat': {'energy_min': 0.5, 'danceability_min': 0.5},
    'walima': {'energy_max': 0.8, 'valence_min': 0.3},
    'birthday': {'energy_min': 0.3, 'valence_min': 0.4},
    'corporate': {'energy_min': 0.1, 'energy_max': 0.9}
}

# Search query fallbacks for each event (improved with OR operators)
SEARCH_FALLBACKS = {
    'mehndi': 'mehndi OR dholki OR sangeet pakistani punjabi bollywood dance',
    'barat': 'barat OR baraat OR dulha entry pakistani wedding high energy',
    'walima': 'walima OR nikah romantic pakistani bollywood love songs',
    'birthday': 'happy birthday celebration party cocomelon kids',
    'corporate': 'instrumental background lofi jazz corporate ambient focus'
}

# Keywords to exclude for each event (prevent cross-contamination)
EXCLUDE_KEYWORDS = {
    'mehndi': ['barat', 'baraat', 'walima'],
    'barat': ['mehndi', 'dholki', 'sangeet', 'walima'],
    'walima': ['mehndi', 'dholki', 'barat', 'baraat', 'birthday'],
    'birthday': ['mehndi', 'barat', 'baraat', 'walima'],
    'corporate': ['mehndi', 'barat', 'baraat', 'walima', 'birthday'],
    'general': ['birthday', 'happy birthday', 'bday', 'mehndi', 'barat', 'baraat', 'walima']
}


def get_spotify_token():
    """Get Spotify access token using client credentials flow"""
    # Check if cached token is still valid
    if spotify_token_cache["token"] and spotify_token_cache["expires_at"]:
        if datetime.now() < spotify_token_cache["expires_at"]:
            return spotify_token_cache["token"]
    
    # Get new token
    auth_url = "https://accounts.spotify.com/api/token"
    auth_response = requests.post(auth_url, {
        'grant_type': 'client_credentials',
        'client_id': SPOTIFY_CLIENT_ID,
        'client_secret': SPOTIFY_CLIENT_SECRET,
    })
    
    if auth_response.status_code != 200:
        raise HTTPException(status_code=500, detail="Failed to authenticate with Spotify")
    
    auth_data = auth_response.json()
    token = auth_data['access_token']
    expires_in = auth_data['expires_in']
    
    # Cache the token
    spotify_token_cache["token"] = token
    spotify_token_cache["expires_at"] = datetime.now() + timedelta(seconds=expires_in - 60)
    
    return token


def get_audio_features(track_ids: list, headers: dict):
    """Fetch audio features for multiple tracks"""
    if not track_ids:
        return {}
    
    # Spotify allows max 100 IDs per request
    track_ids = track_ids[:100]
    ids_param = ",".join(track_ids)
    
    features_url = f"https://api.spotify.com/v1/audio-features"
    params = {"ids": ids_param}
    
    response = requests.get(features_url, headers=headers, params=params)
    
    if response.status_code != 200:
        return {}
    
    data = response.json()
    features_list = data.get("audio_features", [])
    
    # Create a dictionary mapping track_id to features
    features_map = {}
    for features in features_list:
        if features:  # Some tracks might not have features
            features_map[features["id"]] = features
    
    return features_map


def filter_by_excluded_keywords(tracks: list, event_type: str):
    """Remove tracks that contain keywords from other events"""
    if not event_type or event_type.lower() not in EXCLUDE_KEYWORDS:
        return tracks
    
    excluded = EXCLUDE_KEYWORDS[event_type.lower()]
    filtered_tracks = []
    
    for track in tracks:
        title_lower = track.get('title', '').lower()
        artist_lower = track.get('artist', '').lower()
        album_lower = track.get('album', '').lower()
        
        # Check if any excluded keyword appears in title, artist, or album
        has_excluded = False
        for keyword in excluded:
            if keyword in title_lower or keyword in artist_lower or keyword in album_lower:
                has_excluded = True
                break
        
        if not has_excluded:
            filtered_tracks.append(track)
    
    return filtered_tracks


def calculate_search_relevance(track_title: str, track_artist: str, track_album: str, search_query: str, popularity: int):
    """
    Calculate relevance score prioritizing exact matches in title
    
    Scoring:
    - Exact match in title: +100
    - Title starts with search: +80
    - Search word in title: +60
    - Search word in artist: +30
    - Search word in album: +20
    - Popularity: 0-100
    """
    if not search_query:
        return popularity
    
    search_lower = search_query.lower().strip()
    title_lower = track_title.lower()
    artist_lower = track_artist.lower()
    album_lower = track_album.lower()
    
    score = popularity  # Base score from Spotify popularity
    
    # Exact match in title (highest priority)
    if title_lower == search_lower:
        score += 100
    # Title starts with search query
    elif title_lower.startswith(search_lower):
        score += 80
    # Search query appears in title
    elif search_lower in title_lower:
        score += 60
    
    # Search in artist name
    if search_lower in artist_lower:
        score += 30
    
    # Search in album name
    if search_lower in album_lower:
        score += 20
    
    # Bonus for each word match in title
    search_words = search_lower.split()
    title_words = title_lower.split()
    for word in search_words:
        if len(word) > 2 and word in title_words:
            score += 15
    
    return score


def fetch_playlist_tracks(playlist_id: str, headers: dict, limit: int = 50):
    """Fetch tracks from a Spotify playlist"""
    try:
        playlist_url = f"https://api.spotify.com/v1/playlists/{playlist_id}/tracks"
        params = {
            "limit": min(limit, 50),
            "market": "IN",
            "fields": "items(track(id,name,artists,album,preview_url,duration_ms,external_urls,popularity))"
        }
        
        response = requests.get(playlist_url, headers=headers, params=params)
        
        if response.status_code != 200:
            return []
        
        data = response.json()
        items = data.get("items", [])
        
        tracks = []
        for item in items:
            track = item.get("track")
            if not track or not track.get("id"):
                continue
            
            tracks.append({
                "id": track["id"],
                "title": track["name"],
                "artist": ", ".join([artist["name"] for artist in track.get("artists", [])]),
                "album": track.get("album", {}).get("name", ""),
                "previewUrl": track.get("preview_url"),
                "imageUrl": track.get("album", {}).get("images", [{}])[0].get("url") if track.get("album", {}).get("images") else None,
                "duration": f"{track['duration_ms'] // 60000}:{(track['duration_ms'] % 60000) // 1000:02d}",
                "spotifyUrl": track.get("external_urls", {}).get("spotify", ""),
                "popularity": track.get("popularity", 0),
                "relevance": track.get("popularity", 0)
            })
        
        return tracks
    except Exception as e:
        print(f"Error fetching playlist {playlist_id}: {str(e)}")
        return []


def filter_tracks_by_vibe(tracks: list, audio_features: dict, event_type: str):
    """
    Filter tracks based on audio features matching the event vibe
    Uses relaxed thresholds defined in VIBE_RULES
    """
    if not audio_features or not event_type:
        return tracks
    
    event_type_lower = event_type.lower()
    rules = VIBE_RULES.get(event_type_lower, {})
    
    if not rules:
        return tracks
    
    filtered = []
    
    for track in tracks:
        track_id = track["id"]
        features = audio_features.get(track_id)
        
        if not features:
            # If no features available, keep the track
            filtered.append(track)
            continue
        
        energy = features.get("energy", 0.5)
        danceability = features.get("danceability", 0.5)
        valence = features.get("valence", 0.5)
        instrumentalness = features.get("instrumentalness", 0)
        tempo = features.get("tempo", 120)
        
        # Store audio features in track for frontend display
        track["audioFeatures"] = {
            "energy": round(energy, 2),
            "danceability": round(danceability, 2),
            "valence": round(valence, 2),
            "tempo": round(tempo, 1)
        }
        
        # Apply event-specific filters based on VIBE_RULES
        passes_filter = True
        
        if 'energy_min' in rules and energy < rules['energy_min']:
            passes_filter = False
        if 'energy_max' in rules and energy > rules['energy_max']:
            passes_filter = False
        if 'danceability_min' in rules and danceability < rules['danceability_min']:
            passes_filter = False
        if 'valence_min' in rules and valence < rules['valence_min']:
            passes_filter = False
        
        if passes_filter:
            # Calculate vibe score based on event type
            if event_type_lower in ["mehndi", "barat"]:
                track["vibeScore"] = (energy * 0.4 + danceability * 0.4 + valence * 0.2) * 100
            elif event_type_lower == "walima":
                track["vibeScore"] = (valence * 0.5 + (1 - energy) * 0.3 + danceability * 0.2) * 100
            elif event_type_lower == "birthday":
                track["vibeScore"] = (valence * 0.5 + energy * 0.3 + danceability * 0.2) * 100
            elif event_type_lower == "corporate":
                track["vibeScore"] = (instrumentalness * 0.4 + (0.5 - abs(energy - 0.5)) * 0.6) * 100
            else:
                track["vibeScore"] = (energy * 0.3 + danceability * 0.3 + valence * 0.4) * 100
            
            filtered.append(track)
    
    return filtered


@router.get("/suggestions")
def get_music_suggestions(
    eventType: Optional[str] = Query(None, description="Event type: mehndi, barat, walima, birthday, corporate"),
    mood: Optional[str] = None,
    genre: Optional[str] = None,
    tempo: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(20, le=50)
):
    """
    HYBRID MUSIC DISCOVERY: Playlist-First with Search Fallback
    
    Flow:
    1. Try curated playlists (primary + backup)
    2. Apply vibe filtering using audio features
    3. If insufficient results, fall back to search
    4. Shuffle for variety
    """
    try:
        if not SPOTIFY_CLIENT_ID or not SPOTIFY_CLIENT_SECRET:
            return {
                "success": False,
                "error": "Spotify API credentials not configured",
                "tracks": []
            }
        
        token = get_spotify_token()
        headers = {"Authorization": f"Bearer {token}"}
        
        playlist_tracks = []
        search_tracks = []
        vibe_matched = False
        source = "search"  # Track where tracks came from
        
        # PHASE 1: Try Playlist-based approach if eventType provided
        if eventType and eventType.lower() in PLAYLIST_MAP:
            playlist_ids = PLAYLIST_MAP[eventType.lower()]
            
            # Try each playlist to get tracks
            for playlist_id in playlist_ids:
                tracks = fetch_playlist_tracks(playlist_id, headers, limit=50)
                if tracks:
                    # Filter out tracks with excluded keywords
                    tracks = filter_by_excluded_keywords(tracks, eventType)
                    playlist_tracks.extend(tracks)
                    source = f"playlist:{playlist_id}"
                    print(f"Fetched {len(tracks)} tracks from playlist {playlist_id} (after keyword filter)")
            
            # Apply vibe filtering if we got tracks from playlist
            if playlist_tracks:
                track_ids = [t["id"] for t in playlist_tracks]
                audio_features = get_audio_features(track_ids, headers)
                
                if audio_features:
                    filtered_tracks = filter_tracks_by_vibe(playlist_tracks, audio_features, eventType)
                    
                    if len(filtered_tracks) >= 5:
                        # Vibe filtering successful!
                        playlist_tracks = filtered_tracks
                        vibe_matched = True
                        playlist_tracks.sort(key=lambda x: x.get("vibeScore", 0), reverse=True)
                        print(f"Vibe filtering: {len(filtered_tracks)} playlist tracks passed vibe filter")
                    else:
                        # Too few tracks after filtering, keep original
                        print(f"Vibe filtering too strict ({len(filtered_tracks)} tracks), keeping all playlist tracks")
                        for track in playlist_tracks:
                            track["vibeScore"] = track["popularity"]
                        playlist_tracks.sort(key=lambda x: x["popularity"], reverse=True)
                
                # Mark playlist tracks as prioritized
                for track in playlist_tracks:
                    track["source"] = "playlist"
        
        # PHASE 2: Always add keyword search results to provide more variety
        if eventType or search:
            # Calculate how many search tracks to add
            search_limit = max(15, limit - len(playlist_tracks))
            print(f"Adding keyword search results (playlist: {len(playlist_tracks)}, requesting {search_limit} search tracks)")
            
            # Build search query
            query_parts = []
            if search:
                query_parts.append(search)
            elif eventType and eventType.lower() in SEARCH_FALLBACKS:
                query_parts.append(SEARCH_FALLBACKS[eventType.lower()])
            else:
                query_parts.append(search or "top tracks")
            
            if genre:
                query_parts.append(f"genre:{genre}")
            if mood:
                mood_map = {
                    "happy": "valence:0.7-1.0",
                    "sad": "valence:0.0-0.3",
                    "energetic": "energy:0.7-1.0",
                    "calm": "energy:0.0-0.3"
                }
                if mood.lower() in mood_map:
                    query_parts.append(mood_map[mood.lower()])
            
            query = " ".join(query_parts)
            
            # Search Spotify
            search_url = "https://api.spotify.com/v1/search"
            params = {
                "q": query,
                "type": "track",
                "limit": search_limit,
                "market": "IN"
            }
            
            response = requests.get(search_url, headers=headers, params=params)
            
            if response.status_code == 200:
                data = response.json()
                search_results = data.get("tracks", {}).get("items", [])
                
                for track in search_results:
                    title = track["name"]
                    artist = ", ".join([artist["name"] for artist in track["artists"]])
                    album = track["album"]["name"]
                    popularity = track.get("popularity", 0)
                    
                    # Calculate smart relevance score based on search query match
                    relevance_score = calculate_search_relevance(
                        title, artist, album, search or "", popularity
                    )
                    
                    search_tracks.append({
                        "id": track["id"],
                        "title": title,
                        "artist": artist,
                        "album": album,
                        "previewUrl": track.get("preview_url"),
                        "imageUrl": track["album"]["images"][0]["url"] if track["album"]["images"] else None,
                        "duration": f"{track['duration_ms'] // 60000}:{(track['duration_ms'] % 60000) // 1000:02d}",
                        "spotifyUrl": track["external_urls"]["spotify"],
                        "popularity": popularity,
                        "relevance": relevance_score,
                        "vibeScore": relevance_score,
                        "source": "search"
                    })
                
                # Filter out tracks with excluded keywords
                search_tracks = filter_by_excluded_keywords(search_tracks, eventType)
                print(f"Added {len(search_tracks)} tracks from keyword search")
        
        # PHASE 3: Merge playlist tracks first, then search tracks (prioritized order)
        all_tracks = playlist_tracks + search_tracks
        
        # PHASE 4: Remove duplicates (keep first occurrence = playlist tracks prioritized)
        seen_ids = set()
        unique_tracks = []
        for track in all_tracks:
            if track["id"] not in seen_ids:
                seen_ids.add(track["id"])
                unique_tracks.append(track)
        
        all_tracks = unique_tracks
        print(f"After deduplication: {len(all_tracks)} unique tracks ({len(playlist_tracks)} from playlist, {len(search_tracks)} from search)")
        
        # PHASE 5: Light shuffle for variety while maintaining playlist priority
        # Keep playlist tracks at the top, only shuffle search results
        import random
        playlist_count = len([t for t in all_tracks if t.get("source") == "playlist"])
        playlist_section = all_tracks[:playlist_count]
        search_section = all_tracks[playlist_count:]
        
        # Optionally shuffle search results for variety
        if len(search_section) > 5:
            random.shuffle(search_section)
        
        all_tracks = playlist_section + search_section
        
        # Return requested limit
        final_tracks = all_tracks[:limit]
        
        # Determine final source for response
        final_source = "playlist" if playlist_count > 0 else "search"
        if playlist_count > 0 and len(search_section) > 0:
            final_source = "hybrid"
        
        return {
            "success": True,
            "tracks": final_tracks,
            "vibeMatched": vibe_matched,
            "source": final_source,
            "playlistTracks": playlist_count,
            "searchTracks": len(search_section),
            "total": len(final_tracks),
            "previewAvailable": len(final_tracks)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in get_music_suggestions: {str(e)}")
        return {"success": False, "error": str(e), "tracks": []}


@router.get("/track/{track_id}")
def get_track_details(track_id: str):
    """Get detailed information about a specific track"""
    try:
        if not SPOTIFY_CLIENT_ID or not SPOTIFY_CLIENT_SECRET:
            raise HTTPException(status_code=500, detail="Spotify API credentials not configured")
        
        token = get_spotify_token()
        headers = {"Authorization": f"Bearer {token}"}
        
        # Get track details
        track_url = f"https://api.spotify.com/v1/tracks/{track_id}"
        response = requests.get(track_url, headers=headers)
        
        if response.status_code != 200:
            raise HTTPException(status_code=404, detail="Track not found")
        
        track = response.json()
        
        # Format response
        formatted_track = {
            "id": track["id"],
            "name": track["name"],
            "artist": ", ".join([artist["name"] for artist in track["artists"]]),
            "album": track["album"]["name"],
            "preview_url": track.get("preview_url"),
            "image": track["album"]["images"][0]["url"] if track["album"]["images"] else None,
            "duration_ms": track["duration_ms"],
            "spotify_url": track["external_urls"]["spotify"],
            "popularity": track.get("popularity"),
            "explicit": track.get("explicit")
        }
        
        return {"success": True, "data": formatted_track}
    except HTTPException:
        raise
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.get("/search")
def search_music(q: str, limit: int = Query(20, le=50)):
    """Search for tracks on Spotify"""
    try:
        if not SPOTIFY_CLIENT_ID or not SPOTIFY_CLIENT_SECRET:
            return {"success": False, "error": "Spotify API credentials not configured", "data": []}
        
        token = get_spotify_token()
        headers = {"Authorization": f"Bearer {token}"}
        
        # Search Spotify
        search_url = "https://api.spotify.com/v1/search"
        params = {
            "q": q,
            "type": "track",
            "limit": limit,
            "market": "IN"  # Indian market for regional relevance
        }
        
        response = requests.get(search_url, headers=headers, params=params)
        
        if response.status_code != 200:
            raise HTTPException(status_code=500, detail="Failed to search Spotify")
        
        data = response.json()
        tracks = data.get("tracks", {}).get("items", [])
        
        # Format response
        formatted_tracks = []
        for track in tracks:
            # Calculate relevance score
            relevance_score = track.get("popularity", 0)
            if track.get("preview_url"):
                relevance_score += 10  # Bonus for tracks with preview
            
            formatted_tracks.append({
                "id": track["id"],
                "title": track["name"],
                "artist": ", ".join([artist["name"] for artist in track["artists"]]),
                "album": track["album"]["name"],
                "previewUrl": track.get("preview_url"),
                "imageUrl": track["album"]["images"][0]["url"] if track["album"]["images"] else None,
                "duration": f"{track['duration_ms'] // 60000}:{(track['duration_ms'] % 60000) // 1000:02d}",
                "spotifyUrl": track["external_urls"]["spotify"],
                "popularity": track.get("popularity", 0),
                "relevance": relevance_score
            })
        
        # Sort by relevance score (popularity + preview bonus)
        formatted_tracks.sort(key=lambda x: x["relevance"], reverse=True)
        
        return {"success": True, "tracks": formatted_tracks}
    except HTTPException:
        raise
    except Exception as e:
        return {"success": False, "error": str(e), "tracks": []}


@router.get('/health')
def health_check():
    '''Check if Spotify service is working'''
    status = {
        'credentials_configured': bool(SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET),
        'spotify_service_available': SPOTIFY_AVAILABLE,
        'spotify_client_initialized': False
    }
    
    if SPOTIFY_AVAILABLE and spotify_service and spotify_service.client:
        status['spotify_client_initialized'] = True
        try:
            results = spotify_service.search_tracks('test', limit=1)
            status['status'] = 'ok'
            status['message'] = 'Spotify service working!'
            status['connected'] = True
        except Exception as e:
            status['status'] = 'error'
            status['message'] = f'Error: {str(e)}'
            status['connected'] = False
    else:
        status['status'] = 'warning'
        status['message'] = 'Spotify service not initialized'
        status['connected'] = False
    
    return status


@router.get('/playlist/{playlist_id}')
def get_playlist_tracks(
    playlist_id: str,
    limit: int = Query(50, le=100, description="Maximum number of tracks to return")
):
    """
    Get tracks from a Spotify playlist
    Automatically filters for playable tracks and sorts by popularity
    """
    try:
        # Check if Spotify service is available
        if not SPOTIFY_AVAILABLE or not spotify_service or not spotify_service.client:
            raise HTTPException(
                status_code=503,
                detail="Spotify service is not available. Please check backend configuration."
            )
        
        # Fetch tracks from playlist
        tracks = spotify_service.get_playlist_tracks(playlist_id, limit=limit)
        
        if not tracks:
            return {
                "success": False,
                "error": "No playable tracks found in this playlist",
                "tracks": []
            }
        
        return {
            "success": True,
            "tracks": tracks,
            "total": len(tracks)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"ERROR in get_playlist_tracks: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch playlist: {str(e)}"
        )


@router.post('/suggest-from-images')
async def suggest_music_from_multiple_images(
    images: List[UploadFile] = File(..., description="Multiple event images (2-20 recommended)")
):
    """
    🎵 AI-Powered Music Suggestion from Multiple Images (Aggregate Analysis)
    
    Upload 2-20 event images and get music suggestions based on:
    1. Aggregate event type detection across all images
    2. Confidence-weighted voting system
    3. Mood and vibe analysis
    
    **How it works:**
    - Each image is analyzed by CLIP AI to detect event type
    - Confidence scores are aggregated (weighted voting)
    - Most likely event type is selected
    - Music suggestions are tailored to that event
    
    **Example Use Case:**
    - Upload 10 photos from your mehndi ceremony
    - AI detects "mehndi" with 85% confidence
    - Suggests upbeat Pakistani/Bollywood dance tracks
    
    **Returns:**
    - Detected event type (mehndi, barat, walima, birthday, corporate)
    - Aggregate confidence score
    - Individual image predictions (for transparency)
    - 20-50 curated music tracks from Spotify
    """
    
    # Validation
    if not CLIP_AVAILABLE or not clip_analysis_service:
        raise HTTPException(
            status_code=503,
            detail="AI Analysis service not available. Please ensure CLIP model is installed."
        )
    
    if not SPOTIFY_AVAILABLE or not spotify_service:
        raise HTTPException(
            status_code=503,
            detail="Music service not available. Please check Spotify configuration."
        )
    
    if not images or len(images) == 0:
        raise HTTPException(
            status_code=400,
            detail="Please upload at least 1 image"
        )
    
    if len(images) > 20:
        raise HTTPException(
            status_code=400,
            detail="Maximum 20 images allowed per request"
        )
    
    try:
        # Step 1: Analyze all images
        print(f"📸 Analyzing {len(images)} images with AI...")
        
        image_predictions = []
        event_votes = {}  # {event_type: total_confidence}
        mood_votes = {}   # {mood: total_confidence}
        
        for idx, image_file in enumerate(images):
            # Read image bytes
            image_bytes = await image_file.read()
            
            # Convert to base64
            image_base64 = base64.b64encode(image_bytes).decode('utf-8')
            
            # Analyze with CLIP
            result = clip_analysis_service.detect_event_and_mood(image_data=image_base64, is_base64=True)
            
            if result.get("success") and result.get("is_valid_event", True):
                event_type = result.get("detected_event", "unknown")
                confidence = result.get("event_confidence", 0)
                
                # Store individual prediction
                image_predictions.append({
                    "image_index": idx + 1,
                    "filename": image_file.filename,
                    "detected_event": event_type,
                    "confidence": round(confidence, 2),
                    "confidence_percentage": f"{confidence * 100:.1f}%",
                    # "detected_mood": result.get("detected_mood", "calm"),  # DISABLED - Mood deprecated
                    # "mood_confidence": round(result.get("mood_confidence", 0), 2),
                    "all_scores": result.get("all_event_scores", {}),
                    "is_valid": True
                })
                
                # Aggregate votes (confidence-weighted)
                if event_type not in event_votes:
                    event_votes[event_type] = 0
                event_votes[event_type] += confidence
                
                # MOOD TRACKING DISABLED (Feb 2026) - Spotify audio features deprecated
                # # Track mood votes
                # mood = result.get("detected_mood", "calm")
                # mood_conf = result.get("mood_confidence", 0)
                # if mood not in mood_votes:
                #     mood_votes[mood] = 0
                # mood_votes[mood] += mood_conf
            else:
                # Image rejected (not an event, scenery, casual photo, etc.)
                rejection_reason = result.get("rejection_reason", "Analysis failed")
                image_predictions.append({
                    "image_index": idx + 1,
                    "filename": image_file.filename,
                    "detected_event": result.get("detected_event", "rejected"),
                    "confidence": 0,
                    "is_valid": False,
                    "rejection_reason": rejection_reason,
                    "not_event_score": result.get("not_event_score", None)
                })
        
        # Step 2: Check how many valid event images we got
        valid_images = [p for p in image_predictions if p.get("is_valid", False)]
        rejected_images = [p for p in image_predictions if not p.get("is_valid", True)]
        
        # If too many images were rejected, return helpful error
        # INCREASED from 0.7 to 0.85 to be more lenient with legitimate event photos
        if len(rejected_images) >= len(image_predictions) * 0.85:  # 85%+ rejected
            rejection_reasons = [r.get("rejection_reason", "Unknown") for r in rejected_images]
            most_common_reason = max(set(rejection_reasons), key=rejection_reasons.count)
            
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "Most uploaded images were rejected",
                    "message": f"{len(rejected_images)}/{len(image_predictions)} images were not from events. {most_common_reason}",
                    "valid_images": len(valid_images),
                    "rejected_images": len(rejected_images),
                    "details": image_predictions
                }
            )
        
        # Step 3: Determine aggregate event type (confidence-weighted majority vote with outlier rejection)
        if not event_votes:
            raise HTTPException(
                status_code=400,
                detail="Could not detect event type from any image. Please upload clearer event photos."
            )
        
        # Reject predictions with very low confidence (< 10%) as noise
        MIN_IMAGE_CONFIDENCE = 0.10
        strong_predictions = [p for p in image_predictions if p.get("is_valid", False) and p.get("confidence", 0) >= MIN_IMAGE_CONFIDENCE]
        
        if not strong_predictions:
            # Fall back to all valid predictions if none pass threshold
            strong_predictions = [p for p in image_predictions if p.get("is_valid", False) and p.get("confidence", 0) > 0]
        
        if not strong_predictions:
            raise HTTPException(
                status_code=400,
                detail="No valid event images with sufficient confidence. Please upload photos from actual events."
            )
        
        # Re-aggregate using only strong predictions (confidence-weighted)
        filtered_event_votes = {}
        filtered_mood_votes = {}
        for pred in strong_predictions:
            event = pred.get("detected_event", "unknown")
            conf = pred.get("confidence", 0)
            filtered_event_votes[event] = filtered_event_votes.get(event, 0) + conf
            
            mood = pred.get("detected_mood", "calm")
            mood_conf = pred.get("mood_confidence", 0)
            filtered_mood_votes[mood] = filtered_mood_votes.get(mood, 0) + mood_conf
        
        # Find event with highest total confidence
        aggregate_event = max(filtered_event_votes, key=filtered_event_votes.get)
        total_confidence = filtered_event_votes[aggregate_event]
        num_valid_images = len(strong_predictions)
        aggregate_confidence = total_confidence / num_valid_images if num_valid_images > 0 else 0
        
        # Secondary ranking: also count how many images voted for the winner
        winner_count = sum(1 for p in strong_predictions if p.get("detected_event") == aggregate_event)
        vote_ratio = winner_count / num_valid_images if num_valid_images > 0 else 0
        
        # If vote ratio is low (< 40%), the images are ambiguous — warn in response
        consensus_warning = None
        if vote_ratio < 0.4 and num_valid_images >= 3:
            runner_up = sorted(filtered_event_votes.items(), key=lambda x: -x[1])
            if len(runner_up) >= 2:
                consensus_warning = (
                    f"Low consensus: only {winner_count}/{num_valid_images} images voted for "
                    f"'{aggregate_event}'. Runner-up: '{runner_up[1][0]}'. "
                    f"Upload more similar event photos for better accuracy."
                )
        
        # MOOD DETECTION DISABLED (Feb 2026)
        # Spotify audio features API deprecated for new developers
        # 
        # # Find aggregate mood
        # aggregate_mood = max(filtered_mood_votes, key=filtered_mood_votes.get) if filtered_mood_votes else "calm"
        # aggregate_mood_confidence = filtered_mood_votes.get(aggregate_mood, 0) / num_valid_images if num_valid_images > 0 else 0
        
        # Step 3: Get music suggestions for detected event (without mood)
        print(f"🎵 Fetching music for event: {aggregate_event} (conf: {aggregate_confidence:.2%})")
        
        # Get event-based music recommendations (mood parameter ignored by service)
        music_suggestions = spotify_service.get_mood_aware_recommendations(
            event_type=aggregate_event,
            mood=None,  # Deprecated - not used
            limit=50
        )
        
        # Handle case where Spotify returns None or empty list
        if not music_suggestions:
            music_suggestions = []
        
        # Step 4: Return comprehensive response
        return {
            "success": True,
            "analysis": {
                "total_images_uploaded": len(images),
                "successfully_analyzed": num_valid_images,
                "aggregate_event_type": aggregate_event,
                "aggregate_confidence": round(aggregate_confidence, 2),
                "confidence_percentage": f"{aggregate_confidence * 100:.1f}%",
                "vote_ratio": round(vote_ratio, 2),
                "consensus_warning": consensus_warning,
                # "aggregate_mood": aggregate_mood,  # DISABLED - Mood detection deprecated
                # "aggregate_mood_confidence": round(aggregate_mood_confidence, 2),
                # "mood_percentage": f"{aggregate_mood_confidence * 100:.1f}%",
                "all_event_votes": {
                    event: round(score / num_valid_images, 2) 
                    for event, score in filtered_event_votes.items()
                },
                # "all_mood_votes": {  # DISABLED - Mood detection deprecated
                #     mood: round(score / num_valid_images, 2)
                #     for mood, score in filtered_mood_votes.items()
                # },
                "individual_predictions": image_predictions
            },
            "music_suggestions": {
                "event_type": aggregate_event,
                "total_tracks": len(music_suggestions),
                "tracks": music_suggestions[:30] if music_suggestions else []  # Return top 30 tracks
            },
            "message": f"Detected '{aggregate_event}' event with {aggregate_confidence * 100:.1f}% confidence. Found {len(music_suggestions)} matching tracks."
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error in suggest_music_from_multiple_images: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process images: {str(e)}"
        )
