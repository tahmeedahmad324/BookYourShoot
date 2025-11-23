/*
BACKEND IMPLEMENTATION GUIDE - Spotify Music Service

Install dependencies:
npm install axios dotenv

Environment Variables (.env):
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret

Routes to implement:

1. GET /api/music/suggestions
   - Query: mood, genre, tempo, search
   - Search Spotify API using these parameters
   - Return matching tracks with metadata

2. GET /api/music/track/:id
   - Get detailed track information
   - Return track metadata, preview URL, etc.

3. GET /api/music/search
   - Search Spotify for tracks
   - Return top results

4. POST /api/music/playlist/add
   - Add track to user's Spotify playlist
   - Requires user authentication

Example implementation structure:
*/

// Sample Node.js Spotify implementation
const express = require("express")
const router = express.Router()
const axios = require("axios")
require("dotenv").config()

let spotifyAccessToken = null
let tokenExpiryTime = null

// Get Spotify access token
const getSpotifyToken = async () => {
  try {
    if (spotifyAccessToken && Date.now() < tokenExpiryTime) {
      return spotifyAccessToken
    }

    const response = await axios.post("https://accounts.spotify.com/api/token", null, {
      auth: {
        username: process.env.SPOTIFY_CLIENT_ID,
        password: process.env.SPOTIFY_CLIENT_SECRET,
      },
      params: {
        grant_type: "client_credentials",
      },
    })

    spotifyAccessToken = response.data.access_token
    tokenExpiryTime = Date.now() + response.data.expires_in * 1000
    return spotifyAccessToken
  } catch (error) {
    console.error("Error getting Spotify token:", error)
    throw error
  }
}

// Get music suggestions
router.get("/suggestions", async (req, res) => {
  try {
    const { mood, genre, tempo, search } = req.query
    const token = await getSpotifyToken()

    // Build search query based on filters
    let query = ""
    if (mood) query += `mood:${mood} `
    if (genre) query += `genre:${genre} `
    if (search) query += `track:${search}`

    const response = await axios.get("https://api.spotify.com/v1/search", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      params: {
        q: query || "track:happy",
        type: "track",
        limit: 20,
      },
    })

    const tracks = response.data.tracks.items.map((track) => ({
      id: track.id,
      title: track.name,
      artist: track.artists[0].name,
      genre: genre || "Mixed",
      previewUrl: track.preview_url,
      uri: track.uri,
    }))

    res.json({
      success: true,
      data: tracks,
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get track details
router.get("/track/:id", async (req, res) => {
  try {
    const token = await getSpotifyToken()

    const response = await axios.get(`https://api.spotify.com/v1/tracks/${req.params.id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    res.json({
      success: true,
      data: {
        id: response.data.id,
        title: response.data.name,
        artist: response.data.artists[0].name,
        previewUrl: response.data.preview_url,
        duration: response.data.duration_ms,
      },
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Search tracks
router.get("/search", async (req, res) => {
  try {
    const { q } = req.query
    const token = await getSpotifyToken()

    const response = await axios.get("https://api.spotify.com/v1/search", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      params: {
        q,
        type: "track",
        limit: 20,
      },
    })

    const tracks = response.data.tracks.items.map((track) => ({
      id: track.id,
      title: track.name,
      artist: track.artists[0].name,
      previewUrl: track.preview_url,
    }))

    res.json({
      success: true,
      data: tracks,
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

module.exports = router
