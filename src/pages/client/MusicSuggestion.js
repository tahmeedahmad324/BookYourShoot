import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const MusicSuggestion = () => {
  const [selectedMood, setSelectedMood] = useState('upbeat');
  const [selectedGenre, setSelectedGenre] = useState('all');
  const [selectedTempo, setSelectedTempo] = useState('medium');
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestedTracks, setSuggestedTracks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [playingTrack, setPlayingTrack] = useState(null);

  const moods = [
    { id: 'upbeat', name: 'Upbeat', icon: '🎉', color: '#FF6B6B' },
    { id: 'romantic', name: 'Romantic', icon: '💕', color: '#E91E63' },
    { id: 'energetic', name: 'Energetic', icon: '⚡', color: '#FF9800' },
    { id: 'chill', name: 'Chill', icon: '😌', color: '#4CAF50' },
    { id: 'dramatic', name: 'Dramatic', icon: '🎭', color: '#9C27B0' },
    { id: 'peaceful', name: 'Peaceful', icon: '🕊️', color: '#03A9F4' },
    { id: 'adventurous', name: 'Adventurous', icon: '🏔️', color: '#8BC34A' },
    { id: 'celebratory', name: 'Celebratory', icon: '🎊', color: '#FF5722' }
  ];

  const genres = [
    { id: 'all', name: 'All Genres', icon: '🎵' },
    { id: 'pop', name: 'Pop', icon: '🎤' },
    { id: 'rock', name: 'Rock', icon: '🎸' },
    { id: 'electronic', name: 'Electronic', icon: '🎹' },
    'classical', 'Pop', 'Pop',
    { id: 'classical', name: 'Classical', icon: '🎼' },
    { id: 'jazz', name: 'Jazz', icon: '🎷' },
    { id: 'country', name: 'Country', icon: '🤠' },
    { id: 'folk', name: 'Folk', icon: '🎻' },
    { id: 'blues', name: 'Blues', icon: '🎷' },
    { id: 'indie', name: 'Indie', icon: '🎹' }
  ];

  const tempos = [
    { id: 'slow', name: 'Slow (60-90 BPM)', icon: '🐢' },
    { id: 'medium', name: 'Medium (90-120 BPM)', icon: '🚶' },
    { id: 'fast', name: 'Fast (120-140 BPM)', icon: '🏎' },
    { id: 'very-fast', name: 'Very Fast (140+ BPM)', icon: '🏃' }
  ];

  const allTracks = [
    // Upbeat
    { id: 1, title: "Sunshine Dreams", artist: "Dance Collective", genre: "Pop", mood: "upbeat", tempo: "medium", duration: "3:15", bpm: 120, popular: true },
    { id: 2, title: "Happy Days", artist: "Feel Good Band", genre: "Pop", mood: "upbeat", tempo: "medium", duration: "2:45", bpm: 115, popular: true },
    
    // Romantic
    { id: 3, title: "Forever Yours", artist: "Love Songs Co", genre: "Ballad", mood: "romantic", tempo: "slow", duration: "4:20", bpm: 75, popular: true },
    { id: 4, title: "Moonlight Serenade", artist: "Romantic Vibes", genre: "Classical", mood: "romantic", tempo: "slow", duration: "3:30", bpm: 68, popular: false },
    
    // Energetic
    { id: 5, title: "Power Surge", artist: "Electric Beats", genre: "Electronic", mood: "energetic", tempo: "fast", duration: "2:30", bpm: 135, popular: true },
    { id: 6, title: "High Energy", artist: "Sound Wave", genre: "Rock", mood: "energetic", tempo: "fast", duration: "3:00", bpm: 140, popular: false },
    
    // Chill
    { id: 7, title: "Peaceful Mind", artist: "Zen Masters", genre: "Ambient", mood: "chill", tempo: "slow", duration: "5:00", bpm: 70, popular: true },
    { id: 8, title: "Relaxing Waters", artist: "Calm Sounds", genre: "New Age", mood: "chill", tempo: "medium", duration: "4:15", bpm: 85, popular: false },
    
    // Dramatic
    { id: 9, title: "Epic Journey", artist: "Cinema Score", genre: "Orchestral", mood: "dramatic", tempo: "medium", duration: "6:00", bpm: 95, popular: true },
    { id: 10, title: "Hero's Theme", artist: "Movie Soundtrack", genre: "Soundtrack", mood: "dramatic", tempo: "medium", duration: "3:45", bpm: 110, popular: false },
    
    // Peaceful
    { id: 11, title: "Nature's Symphony", artist: "Earth Sounds", genre: "Ambient", mood: "peaceful", tempo: "slow", duration: "7:00", bpm: 65, popular: true },
    { id: 12, title: "Tranquil Waters", artist: "Peaceful Moments", genre: "Classical", mood: "peaceful", tempo: "slow", duration: "4:30", bpm: 60, popular: false },
    
    // Adventurous
    { id: 13, title: "Mountain Explorer", artist: "Adventure Beats", genre: "Folk", mood: "adventurous", tempo: "medium", duration: "3:30", bpm: 100, popular: true },
    { id: 14, title: "Journey Beyond", artist: "Travel Sounds", genre: "Indie", mood: "adventurous", tempo: "fast", duration: "4:00", bpm: 125, popular: false },
    
    // Celebratory
    { id: 15, title: "Party Anthem", artist: "Celebrate Band", genre: "Pop", mood: "celebratory", tempo: "fast", duration: "2:20", bpm: 130, popular: true },
    { id: 16, title: "Festival Joy", artist: "Happy Moments", genre: "Electronic", mood: "celebratory", tempo: "very-fast", duration: "3:00", bpm: 145, popular: false }
  ];

  useEffect(() => {
    suggestTracks();
  }, [selectedMood, selectedGenre, selectedTempo]);

  const suggestTracks = () => {
    setLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      let filtered = [...allTracks];
      
      if (selectedMood !== 'all') {
        filtered = filtered.filter(track => track.mood === selectedMood);
      }
      
      if (selectedGenre !== 'all') {
        filtered = filtered.filter(track => track.genre === selectedGenre);
      }
      
      if (selectedTempo !== 'all') {
        if (selectedTempo === 'slow') {
          filtered = filtered.filter(track => track.bpm < 90);
        } else if (selectedTempo === 'medium') {
          filtered = filtered.filter(track => track.bpm >= 90 && track.bpm < 120);
        } else if (selectedTempo === 'fast') {
          filtered = filtered.filter(track => track.bpm >= 120 && track.bpm < 140);
        } else if (selectedTempo === 'very-fast') {
          filtered = filtered.filter(track => track.bpm >= 140);
        }
      }
      
      if (searchQuery) {
        filtered = filtered.filter(track => 
          track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          track.artist.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }
      
      // Sort by popularity first, then by title
      filtered.sort((a, b) => {
        if (a.popular !== b.popular) {
          return b.popular ? 1 : -1;
        }
        return a.title.localeCompare(b.title);
      });
      
      setSuggestedTracks(filtered);
      setLoading(false);
    }, 500);
  };

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
  };

  const playTrack = (track) => {
    setPlayingTrack(track.id === playingTrack.id ? null : track);
  };

  const addToPlaylist = (track) => {
    // In a real app, this would add to user's playlist
    const playlist = JSON.parse(localStorage.getItem('userPlaylist') || '[]');
    if (!playlist.find(t => t.id === track.id)) {
      playlist.push(track);
      localStorage.setItem('userPlaylist', JSON.stringify(playlist));
      alert(`"${track.title}" added to your playlist! 🎵`);
    } else {
      alert('This track is already in your playlist!');
    }
  };

  const downloadTrack = (track) => {
    // In a real app, this would initiate download
    alert(`Downloading "${track.title}"... In a real implementation, this would start the download process.`);
  };

  const shareTrack = (track) => {
    // In a real app, this would open sharing options
    alert(`Share options for "${track.title}" would appear here! 🔗`);
  };

  const getMoodColor = (moodId) => {
    const mood = moods.find(m => m.id === moodId);
    return mood ? mood.color : '#1A73E8';
  };

  const getTempoIcon = (tempoId) => {
    const tempo = tempos.find(t => t.id === tempoId);
    return tempo ? tempo.icon : '🎵';
  };

  return (
    <div className="music-suggestion py-4">
      <div className="container">
        {/* Header */}
        <div className="gradient-header rounded-3 p-4 mb-4">
          <div className="row align-items-center">
            <div className="col-md-8">
              <h1 className="fw-bold mb-2">🎵 Music Suggestion</h1>
              <p className="mb-0">Discover the perfect background music for your photo reels and slideshows</p>
            </div>
            <div className="col-md-4 text-md-end">
              <div className="text-white mb-2">
                <div className="small opacity-75">Music Library</div>
                <div className="h5 fw-bold">{allTracks.length} Tracks Available</div>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body p-4">
            <div className="row g-3">
              {/* Search */}
              <div className="col-md-6">
                <div className="input-group">
                  <span className="input-group-text">🔍</span>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search tracks or artists..."
                    value={searchQuery}
                    onChange={handleSearch}
                  />
                </div>
              </div>

              {/* Mood Selection */}
              <div className="col-md-6">
                <label className="form-label fw-semibold small">Mood</label>
                <div className="d-flex flex-wrap gap-2">
                  {moods.map((mood) => (
                    <button
                      key={mood.id}
                      className={`btn btn-sm ${
                        selectedMood === mood.id 
                          ? 'btn-primary' 
                          : 'btn-outline-secondary'
                      }`}
                      onClick={() => setSelectedMood(mood.id)}
                      style={{
                        borderColor: selectedMood === mood.id ? mood.color : undefined
                      }}
                    >
                      {mood.icon} {mood.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Genre Selection */}
              <div className="col-md-6">
                <label className="form-label fw-semibold small">Genre</label>
                <select 
                  className="form-select"
                  value={selectedGenre}
                  onChange={(e) => setSelectedGenre(e.target.value)}
                >
                  {genres.map((genre) => (
                    <option key={genre.id} value={genre.id}>
                      {genre.icon} {genre.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tempo Selection */}
              <div className="col-md-6">
                <label className="form-label fw-semibold small">Tempo</label>
                <select 
                  className="form-select"
                  value={selectedTempo}
                  onChange={(e) => setSelectedTempo(e.target.value)}
                >
                  {tempos.map((tempo) => (
                    <option key={tempo.id} value={tempo.id}>
                      {tempo.icon} {tempo.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Results Summary */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <span className="text-muted">
              {loading ? 'Searching...' : `${suggestedTracks.length} tracks found`}
            </span>
            {searchQuery && (
              <span className="badge bg-primary ms-2">for "{searchQuery}"</span>
            )}
          </div>
          <div>
            {(selectedMood !== 'upbeat' || selectedGenre !== 'all' || selectedTempo !== 'medium' || searchQuery) && (
              <button 
                className="btn btn-outline-secondary btn-sm"
                onClick={() => {
                  setSelectedMood('upbeat');
                  setSelectedGenre('all');
                  setSelectedTempo('medium');
                  setSearchQuery('');
                }}
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>

        {/* Tracks Grid */}
        <div className="card border-0 shadow-sm">
          <div className="card-body p-0">
            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <p className="mt-3">Finding perfect music for you...</p>
              </div>
            ) : suggestedTracks.length === 0 ? (
              <div className="text-center py-5">
                <div className="mb-4" style={{ fontSize: '4rem' }}>🎵</div>
                <h4 className="fw-bold mb-3">No tracks found</h4>
                <p className="text-muted mb-4">Try adjusting your filters or search terms</p>
                <button 
                  className="btn btn-primary"
                  onClick={() => {
                    setSelectedMood('upbeat');
                    setSelectedGenre('all');
                    setSelectedTempo('medium');
                    setSearchQuery('');
                  }}
                >
                  Show All Tracks
                </button>
              </div>
            ) : (
              <div className="row g-3">
                {suggestedTracks.map((track) => (
                  <div key={track.id} className="col-lg-6">
                    <div className={`track-card border-0 shadow-sm h-100 ${playingTrack?.id === track.id ? 'playing' : ''}`}
                         style={{
                           borderLeft: `4px solid ${getMoodColor(track.mood)}`
                         }}>
                      <div className="card-body p-3">
                        {/* Track Header */}
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <div className="flex-grow-1">
                            <h6 className="fw-bold mb-1 text-truncate">
                              {track.title}
                              {track.popular && (
                                <span className="badge bg-warning text-dark ms-2">Popular</span>
                              )}
                            </h6>
                            <p className="text-muted small mb-2">{track.artist}</p>
                          </div>
                          <div className="text-end">
                            <button
                              className="btn btn-link p-0 text-primary"
                              onClick={() => playTrack(track)}
                              title={playingTrack?.id === track.id ? 'Pause' : 'Play'}
                            >
                              {playingTrack?.id === track.id ? '⏸️' : '▶️'}
                            </button>
                          </div>
                        </div>

                        {/* Track Details */}
                        <div className="row g-2 mb-3">
                          <div className="col-4">
                            <div className="text-center">
                              <small className="text-muted">Genre</small>
                              <div>{track.genre}</div>
                            </div>
                          </div>
                          <div className="col-4">
                            <div className="text-center">
                              <small className="text-muted">Tempo</small>
                              <div>{getTempoIcon(track.tempo)} {track.bpm} BPM</div>
                            </div>
                          </div>
                          <div className="col-4">
                            <div className="text-center">
                              <small className="text-muted">Duration</small>
                              <div>{track.duration}</div>
                            </div>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        {playingTrack?.id === track.id && (
                          <div className="progress mb-3" style={{ height: '4px' }}>
                            <div 
                              className="progress-bar bg-success" 
                              style={{ 
                                width: '50%',
                                animation: 'progress-bar-stripes 1s linear infinite'
                              }} 
                            />
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="d-flex gap-2">
                          <button 
                            className="btn btn-outline-primary btn-sm flex-grow-1"
                            onClick={() => addToPlaylist(track)}
                          >
                            📚 Add to Playlist
                          </button>
                          <button 
                            className="btn btn-outline-secondary btn-sm"
                            onClick={() => downloadTrack(track)}
                          >
                            ⬇️ Download
                          </button>
                          <button 
                            className="btn btn-outline-secondary btn-sm"
                            onClick={() => shareTrack(track)}
                          >
                            🔗 Share
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Music Player Bar */}
        {playingTrack && (
          <div className="music-player sticky-bottom mb-4">
            <div className="card border-0 shadow-lg">
              <div className="card-body p-3">
                <div className="row align-items-center">
                  <div className="col-auto">
                    <button
                      className="btn btn-link text-primary p-2"
                      onClick={() => setPlayingTrack(null)}
                    >
                      ⏹️
                    </button>
                  </div>
                  <div className="col">
                    <div className="fw-bold text-truncate">{playingTrack.title}</div>
                    <small className="text-muted">{playingTrack.artist}</small>
                  </div>
                  <div className="col-auto">
                    <div className="d-flex align-items-center gap-3">
                      <div className="text-muted small">
                        {playingTrack.duration}
                      </div>
                      <button className="btn btn-link text-primary p-2">
                        🔁
                      </button>
                      <button className="btn btn-link text-primary p-2">
                        🔀
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sidebar */}
        <div className="row mt-4">
          <div className="col-md-4">
            {/* Recent Playlist */}
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-white border-0 pt-4 pb-3">
                <h6 className="fw-bold mb-0">🎵 Your Playlist</h6>
              </div>
              <div className="card-body">
                <div className="playlist-tracks">
                  {(() => {
                    const playlist = JSON.parse(localStorage.getItem('userPlaylist') || '[]');
                    if (playlist.length === 0) {
                      return (
                        <div className="text-center py-4">
                          <div className="mb-3" style={{ fontSize: '2rem' }}>🎵</div>
                          <p className="text-muted small">Your playlist is empty</p>
                          <p className="text-muted small">Add tracks to create your music collection</p>
                        </div>
                      );
                    }
                    return (
                      playlist.slice(0, 5).map((track) => (
                        <div key={track.id} className="d-flex align-items-center mb-2">
                          <div className="me-3">
                            <div className="rounded bg-light d-flex align-items-center justify-content-center" 
                                 style={{ width: '40px', height: '40px' }}>
                              🎵
                            </div>
                          </div>
                          <div className="flex-grow-1">
                            <div className="fw-semibold small text-truncate">{track.title}</div>
                            <small className="text-muted">{track.artist}</small>
                          </div>
                          <button 
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => {
                              const updatedPlaylist = playlist.filter(t => t.id !== track.id);
                              localStorage.setItem('userPlaylist', JSON.stringify(updatedPlaylist));
                              // Reload suggestions to update state
                              suggestTracks();
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      ))
                    );
                  })()}
                </div>
                {JSON.parse(localStorage.getItem('userPlaylist') || []).length > 5 && (
                  <button className="btn btn-outline-primary btn-sm w-100">
                    View All ({JSON.parse(localStorage.getItem('userPlaylist') || []).length} tracks)
                  </button>
                )}
              </div>
            </div>

            {/* Popular Tracks */}
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-white border-0 pt-4 pb-3">
                <h6 className="fw-bold mb-0">🔥 Popular This Week</h6>
              </div>
              <div className="card-body">
                <div className="popular-tracks">
                  {allTracks
                    .filter(track => track.popular)
                    .slice(0, 5)
                    .map((track) => (
                      <div key={track.id} className="d-flex align-items-center mb-2">
                        <div className="me-2">
                          <div className="rounded bg-light d-flex align-items-center justify-content-center" 
                               style={{ width: '30px', height: '30px' }}>
                            🎵
                          </div>
                        </div>
                        <div className="flex-grow-1">
                          <div className="small fw-semibold text-truncate">{track.title}</div>
                          <small className="text-muted">{track.artist}</small>
                        </div>
                        <button 
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => addToPlaylist(track)}
                        >
                          Add
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>

          <div className="col-md-8">
            {/* Music Tips */}
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-white border-0 pt-4 pb-3">
                <h6 className="fw-bold mb-0">💡 Music Tips for Photo Reels</h6>
              </div>
              <div className="card-body">
                <div className="row">
                  <div className="col-md-6">
                    <h6 className="fw-semibold text-primary mb-2">🎵 Matching Music to Photos</h6>
                    <ul className="list-unstyled small text-muted">
                      <li className="mb-1">• Upbeat tracks for happy moments and celebrations</li>
                      <li className="mb-1">• Romantic music for wedding and couple photos</li>
                      <li className="mb-1">• Energetic beats for action and adventure shots</li>
                      <li className="mb-1">• Chill music for nature and landscape photography</li>
                      <li className="mb-1">• Dramatic music for emotional storytelling</li>
                    </ul>
                  </div>
                  <div className="col-md-6">
                    <h6 className="text-primary fw-semibold mb-2">⏱️ Tempo & Timing</h6>
                    <ul className="list-unstyled small text-muted">
                      <li className="mb-1">• Slow tempo (60-90 BPM) for dramatic slides</li>
                      <li className="mb-1">• Medium tempo (90-120 BPM) for general reels</li>
                      <li className="mb-1">• Fast tempo (120-140 BPM) for dynamic content</li>
                      <li className="mb-1">• Match beats to photo transitions</li>
                      <li className="mb-1">• Consider video length when choosing music</li>
                    </ul>
                  </div>
                </div>
                <div className="row">
                  <div className="col-md-12">
                    <div className="alert alert-info">
                      <strong>🎯 Professional Tip:</strong> The best music enhances your photos without overpowering them. Choose tracks that complement your visual story and match the emotional tone of your images.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MusicSuggestion;
