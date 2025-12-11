from fastapi import APIRouter, HTTPException, Query
from typing import Optional
import os
import sys
from pathlib import Path
import requests
import random
from datetime import datetime, timedelta

# Add backend directory to path
backend_dir = str(Path(__file__).resolve().parent.parent)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# Import the Spotify service
try:
    from services.spotify_service import spotify_service
    SPOTIFY_AVAILABLE = True
except ImportError:
    print("WARNING: Could not import spotify_service")
    SPOTIFY_AVAILABLE = False
    spotify_service = None

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
    'birthday': ['1YhFtD5duKmrPq50fAf70a1'],
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
    'corporate': ['mehndi', 'barat', 'baraat', 'walima', 'birthday']
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
        
        all_tracks = []
        vibe_matched = False
        source = "search"  # Track where tracks came from
        
        # PHASE 1: Try Playlist-based approach if eventType provided
        if eventType and eventType.lower() in PLAYLIST_MAP:
            playlist_ids = PLAYLIST_MAP[eventType.lower()]
            
            # Try each playlist until we get enough tracks
            for playlist_id in playlist_ids:
                if len(all_tracks) >= limit:
                    break
                
                tracks = fetch_playlist_tracks(playlist_id, headers, limit=50)
                if tracks:
                    # Filter out tracks with excluded keywords
                    tracks = filter_by_excluded_keywords(tracks, eventType)
                    all_tracks.extend(tracks)
                    source = f"playlist:{playlist_id}"
                    print(f"Fetched {len(tracks)} tracks from playlist {playlist_id} (after keyword filter)")
            
            # Apply vibe filtering if we got tracks from playlist
            if all_tracks:
                track_ids = [t["id"] for t in all_tracks]
                audio_features = get_audio_features(track_ids, headers)
                
                if audio_features:
                    filtered_tracks = filter_tracks_by_vibe(all_tracks, audio_features, eventType)
                    
                    if len(filtered_tracks) >= 5:
                        # Vibe filtering successful!
                        all_tracks = filtered_tracks
                        vibe_matched = True
                        all_tracks.sort(key=lambda x: x.get("vibeScore", 0), reverse=True)
                        print(f"Vibe filtering: {len(filtered_tracks)}/{len(all_tracks)} tracks passed")
                    else:
                        # Too few tracks after filtering, keep original
                        print(f"Vibe filtering too strict ({len(filtered_tracks)} tracks), keeping all")
                        for track in all_tracks:
                            track["vibeScore"] = track["popularity"]
                        all_tracks.sort(key=lambda x: x["popularity"], reverse=True)
        
        # PHASE 2: Search Fallback if insufficient tracks
        if len(all_tracks) < 5:
            print(f"Falling back to search (only {len(all_tracks)} tracks from playlists)")
            
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
                "limit": limit * 2,
                "market": "IN"
            }
            
            response = requests.get(search_url, headers=headers, params=params)
            
            if response.status_code == 200:
                data = response.json()
                search_tracks = data.get("tracks", {}).get("items", [])
                
                search_formatted = []
                for track in search_tracks:
                    title = track["name"]
                    artist = ", ".join([artist["name"] for artist in track["artists"]])
                    album = track["album"]["name"]
                    popularity = track.get("popularity", 0)
                    
                    # Calculate smart relevance score based on search query match
                    relevance_score = calculate_search_relevance(
                        title, artist, album, search or "", popularity
                    )
                    
                    search_formatted.append({
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
                        "vibeScore": relevance_score
                    })
                
                # Filter out tracks with excluded keywords
                search_formatted = filter_by_excluded_keywords(search_formatted, eventType)
                all_tracks.extend(search_formatted)
            
            source = "search_fallback"
            # Sort by relevance score (prioritizes title matches over popularity)
            all_tracks.sort(key=lambda x: x["relevance"], reverse=True)
        
        # PHASE 3: Remove duplicates (keep first occurrence)
        seen_ids = set()
        unique_tracks = []
        for track in all_tracks:
            if track["id"] not in seen_ids:
                seen_ids.add(track["id"])
                unique_tracks.append(track)
        
        all_tracks = unique_tracks
        print(f"After deduplication: {len(all_tracks)} unique tracks")
        
        # PHASE 4: Shuffle for variety (keep top tracks but add randomness)
        import random
        if len(all_tracks) > limit:
            # Keep top 70% by score, shuffle the rest
            top_n = int(len(all_tracks) * 0.7)
            top_tracks = all_tracks[:top_n]
            remaining = all_tracks[top_n:]
            random.shuffle(remaining)
            all_tracks = top_tracks + remaining
        
        # Return requested limit
        final_tracks = all_tracks[:limit]
        
        return {
            "success": True,
            "tracks": final_tracks,
            "vibeMatched": vibe_matched,
            "source": source,
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

