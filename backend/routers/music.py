from fastapi import APIRouter, HTTPException, Query
from typing import Optional
import os
import requests
from datetime import datetime, timedelta

router = APIRouter(prefix="/music", tags=["Music"])

# Spotify credentials
SPOTIFY_CLIENT_ID = os.getenv("SPOTIFY_CLIENT_ID", "")
SPOTIFY_CLIENT_SECRET = os.getenv("SPOTIFY_CLIENT_SECRET", "")

# Cache for Spotify token
spotify_token_cache = {
    "token": None,
    "expires_at": None
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


@router.get("/suggestions")
def get_music_suggestions(
    mood: Optional[str] = None,
    genre: Optional[str] = None,
    tempo: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(20, le=50)
):
    """Get music suggestions from Spotify based on mood, genre, and tempo"""
    try:
        if not SPOTIFY_CLIENT_ID or not SPOTIFY_CLIENT_SECRET:
            return {
                "success": False,
                "error": "Spotify API credentials not configured",
                "data": []
            }
        
        token = get_spotify_token()
        headers = {"Authorization": f"Bearer {token}"}
        
        # Build search query
        query_parts = []
        if search:
            query_parts.append(search)
        if genre:
            query_parts.append(f"genre:{genre}")
        if mood:
            # Map mood to Spotify attributes
            mood_map = {
                "happy": "valence:0.7-1.0",
                "sad": "valence:0.0-0.3",
                "energetic": "energy:0.7-1.0",
                "calm": "energy:0.0-0.3"
            }
            if mood.lower() in mood_map:
                query_parts.append(mood_map[mood.lower()])
        
        if tempo:
            # Map tempo to BPM range
            tempo_map = {
                "slow": "tempo:60-90",
                "medium": "tempo:90-120",
                "fast": "tempo:120-180"
            }
            if tempo.lower() in tempo_map:
                query_parts.append(tempo_map[tempo.lower()])
        
        query = " ".join(query_parts) if query_parts else "top tracks"
        
        # Search Spotify
        search_url = "https://api.spotify.com/v1/search"
        params = {
            "q": query,
            "type": "track",
            "limit": limit
        }
        
        response = requests.get(search_url, headers=headers, params=params)
        
        if response.status_code != 200:
            raise HTTPException(status_code=500, detail="Failed to fetch music from Spotify")
        
        data = response.json()
        tracks = data.get("tracks", {}).get("items", [])
        
        # Format response
        formatted_tracks = []
        for track in tracks:
            formatted_tracks.append({
                "id": track["id"],
                "name": track["name"],
                "artist": ", ".join([artist["name"] for artist in track["artists"]]),
                "album": track["album"]["name"],
                "preview_url": track.get("preview_url"),
                "image": track["album"]["images"][0]["url"] if track["album"]["images"] else None,
                "duration_ms": track["duration_ms"],
                "spotify_url": track["external_urls"]["spotify"]
            })
        
        return {"success": True, "data": formatted_tracks}
    except HTTPException:
        raise
    except Exception as e:
        return {"success": False, "error": str(e), "data": []}


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
            "limit": limit
        }
        
        response = requests.get(search_url, headers=headers, params=params)
        
        if response.status_code != 200:
            raise HTTPException(status_code=500, detail="Failed to search Spotify")
        
        data = response.json()
        tracks = data.get("tracks", {}).get("items", [])
        
        # Format response
        formatted_tracks = []
        for track in tracks:
            formatted_tracks.append({
                "id": track["id"],
                "name": track["name"],
                "artist": ", ".join([artist["name"] for artist in track["artists"]]),
                "album": track["album"]["name"],
                "preview_url": track.get("preview_url"),
                "image": track["album"]["images"][0]["url"] if track["album"]["images"] else None,
                "duration_ms": track["duration_ms"],
                "spotify_url": track["external_urls"]["spotify"]
            })
        
        return {"success": True, "data": formatted_tracks}
    except HTTPException:
        raise
    except Exception as e:
        return {"success": False, "error": str(e), "data": []}
