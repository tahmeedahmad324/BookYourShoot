const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:8000/api"

// Get music suggestions based on mood, genre, and tempo
export const getMusicSuggestions = async (filters) => {
  try {
    const queryParams = new URLSearchParams()
    if (filters.mood) queryParams.append("mood", filters.mood)
    if (filters.genre) queryParams.append("genre", filters.genre)
    if (filters.tempo) queryParams.append("tempo", filters.tempo)
    if (filters.searchQuery) queryParams.append("search", filters.searchQuery)

    const response = await fetch(`${API_BASE}/music/suggestions?${queryParams}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    })

    if (!response.ok) throw new Error("Failed to fetch music suggestions")
    return await response.json()
  } catch (error) {
    console.error("Music suggestions error:", error)
    throw error
  }
}

// Get track details
export const getTrackDetails = async (trackId) => {
  try {
    const response = await fetch(`${API_BASE}/music/track/${trackId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    })

    if (!response.ok) throw new Error("Failed to fetch track details")
    return await response.json()
  } catch (error) {
    console.error("Track details error:", error)
    throw error
  }
}

// Search tracks
export const searchTracks = async (query) => {
  try {
    const response = await fetch(`${API_BASE}/music/search?q=${encodeURIComponent(query)}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    })

    if (!response.ok) throw new Error("Search failed")
    return await response.json()
  } catch (error) {
    console.error("Search error:", error)
    throw error
  }
}

// Add track to user playlist
export const addTrackToPlaylist = async (trackId, playlistName) => {
  try {
    const response = await fetch(`${API_BASE}/music/playlist/add`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({
        trackId,
        playlistName,
      }),
    })

    if (!response.ok) throw new Error("Failed to add track to playlist")
    return await response.json()
  } catch (error) {
    console.error("Add to playlist error:", error)
    throw error
  }
}
