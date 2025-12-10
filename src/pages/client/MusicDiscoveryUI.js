import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Music, Play, Pause, Heart, Search, Sparkles, ExternalLink } from 'lucide-react';

const MusicDiscoveryUI = () => {
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [tracks, setTracks] = useState([]);
  const [savedTracks, setSavedTracks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [playingTrack, setPlayingTrack] = useState(null);
  const [selectedTrackForPlayer, setSelectedTrackForPlayer] = useState(null);
  const audioRef = useRef(null);

  // Event categories configuration with search queries
  const events = [
    {
      id: 'mehndi',
      name: 'Mehndi',
      image: '/illustrations/mehndi.jpg',
      searchQuery: 'mehndi dholki pakistani wedding dance'
    },
    {
      id: 'barat',
      name: 'Barat',
      image: '/illustrations/baraat.jpg',
      searchQuery: 'barat shaadi pakistani wedding baraat'
    },
    {
      id: 'valima',
      name: 'Valima',
      image: '/illustrations/valima.jpg',
      searchQuery: 'walima romantic pakistani love songs'
    },
    {
      id: 'birthday',
      name: 'Birthday',
      image: '/illustrations/birthday.jpg',
      searchQuery: 'happy birthday celebration party songs'
    },
    {
      id: 'corporate',
      name: 'Corporate',
      image: '/illustrations/corporate.jpg',
      searchQuery: 'corporate instrumental background music'
    }
  ];

  // Process API response - filter and sort tracks by popularity
  const processTopTracks = (apiResponse) => {
    if (!apiResponse || !apiResponse.tracks) return [];
    
    return apiResponse.tracks
      .sort((a, b) => {
        const popA = a.popularity || 0;
        const popB = b.popularity || 0;
        return popB - popA;
      })
      .slice(0, 12)
      .map(track => ({
        id: track.id,
        title: track.title,
        artist: track.artist,
        imageUrl: track.imageUrl,
        previewUrl: track.previewUrl,
        duration: track.duration,
        popularity: track.popularity || 0
      }));
  };

  // Fetch tracks for selected event using search
  const fetchTracksForEvent = async (eventId) => {
    setLoading(true);
    setShowAll(false);
    try {
      const event = events.find(e => e.id === eventId);
      if (!event) {
        console.error('Event not found:', eventId);
        setTracks([]);
        setLoading(false);
        return;
      }

      const response = await fetch(
        `http://localhost:8000/api/music/suggestions?eventType=${eventId}&limit=10`
      );
      
      if (!response.ok) {
        throw new Error(`Failed to fetch tracks: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.tracks) {
        setTracks(data.tracks);
        console.log('Tracks loaded:', data.tracks.length, 
                   '| Vibe Matched:', data.vibeMatched, 
                   '| Source:', data.source);
      } else {
        console.error('API returned error:', data.error);
        setTracks([]);
      }
    } catch (error) {
      console.error('Error fetching tracks:', error);
      setTracks([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle search form submission
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    setShowAll(false);
    try {
      const response = await fetch(
        `http://localhost:8000/api/music/suggestions?search=${encodeURIComponent(searchQuery)}&limit=10`
      );
      const data = await response.json();
      
      if (data.success && data.tracks) {
        setTracks(data.tracks);
      }
    } catch (error) {
      console.error('Search error:', error);
      setTracks([]);
    } finally {
      setLoading(false);
    }
  };

  // Load saved tracks from localStorage on mount
  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('savedTracks') || '[]');
    setSavedTracks(saved);
  }, []);

  // Handle event card click
  const handleEventClick = (eventId) => {
    setSelectedEvent(eventId);
    setSearchQuery('');
    fetchTracksForEvent(eventId);
  };

  // Toggle bookmark/save for a track
  const toggleSave = (track) => {
    const isSaved = savedTracks.some(t => t.id === track.id);
    let updated;
    
    if (isSaved) {
      updated = savedTracks.filter(t => t.id !== track.id);
    } else {
      updated = [...savedTracks, track];
    }
    
    setSavedTracks(updated);
    localStorage.setItem('savedTracks', JSON.stringify(updated));
  };

  const isSaved = (trackId) => savedTracks.some(t => t.id === trackId);

  // Open Spotify embed player in modal-like view
  const openSpotifyPlayer = (track) => {
    setSelectedTrackForPlayer(track);
  };

  // Play or pause audio preview (for tracks with preview URLs)
  const playTrack = (track) => {
    if (!track.previewUrl) {
      // If no preview, open Spotify embed instead
      openSpotifyPlayer(track);
      return;
    }

    if (playingTrack?.id === track.id) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setPlayingTrack(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audio = new Audio(track.previewUrl);
      audio.onended = handleAudioEnd;
      audio.play();
      audioRef.current = audio;
      setPlayingTrack(track);
    }
  };

  const handleAudioEnd = () => {
    setPlayingTrack(null);
  };

  const selectedEventData = events.find(e => e.id === selectedEvent);

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(to bottom, #f8f9fa 0%, #ffffff 100%)',
      paddingBottom: '4rem'
    }}>
      <div className="container py-4" style={{ maxWidth: '1400px' }}>
        {/* Header */}
        <div className="mb-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h1 className="fw-bold mb-1" style={{ fontSize: '2rem', color: '#1a1a1a' }}>
                Music Discovery
              </h1>
              <p className="text-muted mb-0">Find the perfect soundtrack for your event</p>
            </div>
            <Link to="/client/dashboard" className="btn btn-outline-secondary">
              ← Back
            </Link>
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearch}>
            <div className="input-group input-group-lg shadow-sm">
              <span className="input-group-text bg-white border-end-0" style={{ borderRadius: '12px 0 0 12px' }}>
                <Search size={20} className="text-muted" />
              </span>
              <input
                type="text"
                className="form-control border-start-0 border-end-0"
                placeholder="Search for any song, artist, or album..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ 
                  fontSize: '1rem',
                  border: '1px solid #dee2e6'
                }}
              />
              <button 
                className="btn btn-primary px-4" 
                type="submit"
                style={{ borderRadius: '0 12px 12px 0' }}
                disabled={loading}
              >
                {loading ? 'Searching...' : 'Search'}
              </button>
            </div>
          </form>
        </div>

        {/* Event Grid */}
        <div className="mb-4">
          <h5 className="fw-bold mb-3" style={{ color: '#1a1a1a' }}>Browse by Event</h5>
          <div className="row g-3">
            {events.map((event) => (
              <div key={event.id} className="col">
                <div
                  onClick={() => handleEventClick(event.id)}
                  className="music-event-card"
                  style={{
                    border: selectedEvent === event.id ? '2px solid #225ea1' : '2px solid transparent',
                    transform: selectedEvent === event.id ? 'translateY(-5px)' : 'translateY(0)',
                    boxShadow: selectedEvent === event.id 
                      ? '0 8px 25px rgba(34, 94, 161, 0.2), 0 0 0 2px #225ea1, 0 0 15px rgba(34, 94, 161, 0.3)'
                      : '0 4px 15px rgba(0, 0, 0, 0.1)'
                  }}
                >
                  {/* Image Header */}
                  <div style={{
                    position: 'relative',
                    height: '160px',
                    overflow: 'hidden',
                    borderTopLeftRadius: '12px',
                    borderTopRightRadius: '12px'
                  }}>
                    <img 
                      src={event.image}
                      alt={event.name}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        objectPosition: event.id === 'barat' ? 'center 65%' : 'center',
                        transition: 'transform 0.4s ease'
                      }}
                      className="event-card-img"
                    />
                    {/* Black overlay for text readability */}
                    <div className="music-card-overlay" style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: selectedEvent === event.id
                        ? 'linear-gradient(to bottom, rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.6))'
                        : 'linear-gradient(to bottom, rgba(0, 0, 0, 0.2), rgba(0, 0, 0, 0.5))',
                      transition: 'background 0.3s ease'
                    }} />
                    
                    {/* Event Name on Image */}
                    <div style={{
                      position: 'absolute',
                      bottom: '1rem',
                      left: '1rem',
                      right: '1rem',
                      zIndex: 2
                    }}>
                      <h3 style={{
                        color: 'white',
                        fontSize: '1.35rem',
                        fontWeight: '600',
                        margin: 0,
                        textShadow: '0 2px 8px rgba(0,0,0,0.5)'
                      }}>
                        {event.name}
                      </h3>
                    </div>
                    
                    {/* Selected Indicator */}
                    {selectedEvent === event.id && (
                      <div style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        zIndex: 3,
                        background: 'rgba(255,255,255,0.95)',
                        borderRadius: '50%',
                        width: '32px',
                        height: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                      }}>
                        <Music size={16} style={{ color: '#225ea1' }} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recommendations Section */}
        <div>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div className="d-flex align-items-center gap-2">
              <Sparkles size={20} style={{ color: '#667eea' }} />
              <h5 className="fw-bold mb-0" style={{ color: '#1a1a1a' }}>
                {searchQuery ? `Results for "${searchQuery}"` : `${selectedEventData?.name} Music`}
              </h5>
            </div>
            {savedTracks.length > 0 && (
              <span className="badge" style={{ 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                padding: '0.5rem 1rem',
                fontSize: '0.85rem'
              }}>
                <Heart size={14} fill="white" /> {savedTracks.length} Saved
              </span>
            )}
          </div>

          {/* Loading State */}
          {loading && (
            <div className="text-center py-5">
              <div className="spinner-border" style={{ color: '#667eea' }} role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="mt-3 text-muted">Discovering music...</p>
            </div>
          )}

          {/* Empty State */}
          {!loading && tracks.length === 0 && (
            <div className="text-center py-5" style={{ 
              background: 'white',
              borderRadius: '16px',
              padding: '3rem',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
            }}>
              <Music size={48} className="text-muted mb-3" />
              <p className="text-muted mb-0">
                {searchQuery 
                  ? 'No results found. Try a different search.' 
                  : 'Select an event to discover music.'}
              </p>
            </div>
          )}

          {/* Track List */}
          {!loading && tracks.length > 0 && (
            <div style={{
              background: 'white',
              borderRadius: '16px',
              padding: '1.5rem',
              boxShadow: '0 2px 12px rgba(0,0,0,0.08)'
            }}>
              {tracks.slice(0, showAll ? 10 : 5).map((track, index) => (
                <div
                  key={track.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    padding: '0.75rem',
                    borderRadius: '12px',
                    transition: 'all 0.2s ease',
                    background: playingTrack?.id === track.id ? '#f8f9ff' : 'transparent',
                    borderBottom: index < (showAll ? Math.min(tracks.length, 10) : Math.min(tracks.length, 5)) - 1 ? '1px solid #f0f0f0' : 'none'
                  }}
                  className="track-row"
                >
                  {/* Rank Badge */}
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: index < 3 ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#f0f0f0',
                    color: index < 3 ? 'white' : '#6c757d',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '700',
                    fontSize: '0.9rem',
                    flexShrink: 0
                  }}>
                    {index + 1}
                  </div>

                  {/* Album Art */}
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <img
                      src={track.imageUrl || '/illustrations/Generatereel.jpg'}
                      alt={track.title}
                      style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '8px',
                        objectFit: 'cover'
                      }}
                    />
                    {playingTrack?.id === track.id && (
                      <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(102, 126, 234, 0.7)',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Music size={20} className="text-white" />
                      </div>
                    )}
                  </div>

                  {/* Track Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ 
                      fontWeight: '600', 
                      fontSize: '0.95rem',
                      color: '#1a1a1a',
                      marginBottom: '0.25rem',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {track.title}
                    </div>
                    <div style={{ 
                      fontSize: '0.85rem',
                      color: '#6c757d',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {track.artist}
                    </div>
                  </div>

                  {/* Duration */}
                  <div style={{ 
                    fontSize: '0.85rem',
                    color: '#6c757d',
                    flexShrink: 0
                  }}>
                    {track.duration}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                    {/* Play Button - always visible */}
                    <button
                      onClick={() => playTrack(track)}
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        border: 'none',
                        background: playingTrack?.id === track.id 
                          ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                          : '#f0f0f0',
                        color: playingTrack?.id === track.id ? 'white' : '#1a1a1a',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s ease'
                      }}
                      title={track.previewUrl ? 'Play 30s preview' : 'Listen on Spotify'}
                    >
                      {playingTrack?.id === track.id ? (
                        <Pause size={18} />
                      ) : (
                        <Play size={18} style={{ marginLeft: '2px' }} />
                      )}
                    </button>

                    {/* Open in New Tab Button */}
                    <button
                      onClick={() => window.open(track.spotifyUrl, '_blank')}
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        border: 'none',
                        background: '#1DB954',
                        color: 'white',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s ease'
                      }}
                      title="Open in Spotify"
                    >
                      <ExternalLink size={18} />
                    </button>

                    <button
                      onClick={() => toggleSave(track)}
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        border: 'none',
                        background: isSaved(track.id) ? '#fef3c7' : '#f0f0f0',
                        color: isSaved(track.id) ? '#f59e0b' : '#6c757d',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s ease'
                      }}
                      title={isSaved(track.id) ? 'Remove from saved' : 'Save track'}
                    >
                      <Heart 
                        size={18} 
                        fill={isSaved(track.id) ? 'currentColor' : 'none'}
                      />
                    </button>
                  </div>
                </div>
              ))}
              
              {/* Show More/Less Button */}
              {tracks.length > 5 && (
                <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                  <button
                    onClick={() => setShowAll(!showAll)}
                    style={{
                      padding: '0.75rem 2rem',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      fontSize: '0.95rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.transform = 'translateY(-2px)';
                      e.target.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)';
                    }}
                  >
                    {showAll ? '← Show Less' : `Show More (${Math.min(tracks.length, 10) - 5} more) →`}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Badge */}
        {tracks.length > 0 && (
          <div className="text-center mt-4">
            <span style={{
              display: 'inline-block',
              padding: '0.5rem 1.5rem',
              background: 'white',
              borderRadius: '24px',
              fontSize: '0.85rem',
              color: '#6c757d',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
            }}>
              🎵 Powered by Spotify • Curated by BookYourShoot
            </span>
          </div>
        )}
      </div>

      {/* Spotify Embed Player Modal */}
      {selectedTrackForPlayer && (
        <div
          onClick={() => setSelectedTrackForPlayer(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '2rem'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white',
              borderRadius: '16px',
              padding: '1.5rem',
              maxWidth: '500px',
              width: '100%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
            }}
          >
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '1rem'
            }}>
              <h5 style={{ margin: 0, color: '#1a1a1a' }}>Now Playing</h5>
              <button
                onClick={() => setSelectedTrackForPlayer(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: '#6c757d',
                  padding: '0',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ×
              </button>
            </div>
            
            <iframe
              src={`https://open.spotify.com/embed/track/${selectedTrackForPlayer.id}?utm_source=generator&theme=0`}
              width="100%"
              height="152"
              frameBorder="0"
              allowFullScreen=""
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              style={{ borderRadius: '12px' }}
            />
            
            <p style={{ 
              marginTop: '1rem', 
              fontSize: '0.85rem', 
              color: '#6c757d',
              textAlign: 'center',
              marginBottom: 0
            }}>
              Click play to listen • No sign-in required
            </p>
          </div>
        </div>
      )}

      {/* Hidden Audio Player */}
      <audio 
        ref={audioRef} 
        onEnded={handleAudioEnd}
        style={{ display: 'none' }}
      />

      {/* CSS for Hover Effects */}
      <style>{`
        .music-event-card {
          background: white;
          border-radius: 12px;
          overflow: hidden;
          cursor: pointer;
          transition: all 0.3s ease;
          height: 100%;
          display: flex;
          flex-direction: column;
        }
        
        .music-event-card:hover {
          transform: translateY(-5px) !important;
          border-color: #225ea1 !important;
          box-shadow: 
            0 8px 25px rgba(34, 94, 161, 0.2),
            0 0 0 2px #225ea1,
            0 0 15px rgba(34, 94, 161, 0.3) !important;
        }
        
        .music-event-card:hover .event-card-img {
          transform: scale(1.05);
        }
        
        .music-event-card:hover .music-card-overlay {
          background: linear-gradient(to bottom, rgba(0, 0, 0, 0.25), rgba(0, 0, 0, 0.55));
        }
        
        .music-event-card:active {
          transform: translateY(-3px) !important;
        }
        
        .track-row {
          position: relative;
        }
        
        .track-row:hover {
          background: #f8f9ff !important;
        }
        
        .track-row button {
          transition: all 0.2s ease;
        }
        
        .track-row button:hover {
          transform: scale(1.1);
          filter: brightness(1.1);
        }
        
        .track-row button:active {
          transform: scale(0.95);
        }
        
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        
        .event-card[data-selected="true"] {
          animation: pulse 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default MusicDiscoveryUI;
