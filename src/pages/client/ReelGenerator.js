import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';

const ReelGenerator = () => {
  const [uploadedClips, setUploadedClips] = useState([]);
  const [selectedClips, setSelectedClips] = useState([]);
  const [reelTitle, setReelTitle] = useState('My Photo Reel');
  const [selectedMusic, setSelectedMusic] = useState('');
  const [selectedTheme, setSelectedTheme] = useState('modern');
  const [isCreating, setIsCreating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(60);
  const fileInputRef = useRef(null);
  const playerRef = useRef(null);

  const themes = [
    { id: 'modern', name: 'Modern', colors: '#1A73E8,#F7931E' },
    { id: 'vintage', name: 'Vintage', colors: '#8B4513,#DAA520' },
    { id: 'nature', name: 'Nature', colors: '#228B22,#90EE90' },
    { id: 'urban', name: 'Urban', colors: '#333333,#999999' },
    { id: 'dreamy', name: 'Dreamy', colors: '#FF69B4,#87CEEB' },
    { id: 'minimal', name: 'Minimal', colors: '#FFFFFF,#000000' }
  ];

  const musicOptions = [
    { id: 'upbeat', name: 'Upbeat Adventure', duration: '2:30', genre: 'Pop' },
    { id: 'romantic', name: 'Romantic Memories', duration: '3:15', genre: 'Ballad' },
    { id: 'energetic', name: 'Energetic Vibes', duration: '1:45', genre: 'Electronic' },
    { id: 'cinematic', name: 'Cinematic Journey', duration: '4:00', genre: 'Orchestral' },
    { id: 'chill', name: 'Chill Sunset', duration: '2:10', genre: 'Acoustic' },
    { id: 'party', name: 'Party Time', duration: '2:45', genre: 'Dance' }
  ];

  const effects = [
    { id: 'fade', name: 'Fade In/Out', icon: '🌅' },
    { id: 'slide', name: 'Slide Transition', icon: '🎞️' },
    { id: 'zoom', name: 'Zoom In/Out', icon: '🔍' },
    { id: 'spin', name: 'Spin Effect', icon: '🌀' },
    { id: 'blur', name: 'Motion Blur', icon: '💫' },
    { id: 'glitch', name: 'Glitch Effect', icon: '📺' }
  ];

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    const newClips = files.map((file, index) => ({
      id: Date.now() + index,
      file: file,
      name: file.name,
      size: file.size,
      type: file.type,
      url: URL.createObjectURL(file),
      uploadedAt: new Date().toISOString(),
      duration: 5 + Math.random() * 10, // Mock duration 5-15 seconds
    }));
    
    setUploadedClips(prev => [...prev, ...newClips]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    const newClips = files.map((file, index) => ({
      id: Date.now() + index,
      file: file,
      name: file.name,
      size: file.size,
      type: file.type,
      url: URL.createObjectURL(file),
      uploadedAt: new Date().toISOString(),
      duration: 5 + Math.random() * 10
    }));
    
    setUploadedClips(prev => [...prev, ...newClips]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const addClipToTimeline = (clip) => {
    if (selectedClips.find(c => c.id === clip.id)) {
      setSelectedClips(prev => prev.filter(c => c.id !== clip.id));
    } else {
      setSelectedClips(prev => [...prev, clip]);
    }
  };

  const removeClip = (clipId) => {
    setSelectedClips(prev => prev.filter(c => c.id !== clipId));
    setUploadedClips(prev => prev.filter(c => c.id !== clipId));
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const simulateReelCreation = async () => {
    if (selectedClips.length === 0) {
      alert('Please add clips to your reel first!');
      return;
    }
    
    if (!reelTitle.trim()) {
      alert('Please enter a reel title!');
      return;
    }
    
    setIsCreating(true);
    setIsPlaying(true);
    
    // Simulate reel creation process
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const reelData = {
      id: Date.now(),
      title: reelTitle,
      clips: selectedClips,
      music: musicOptions.find(m => m.id === selectedMusic),
      theme: themes.find(t => t.id === selectedTheme),
      duration: selectedClips.reduce((sum, clip) => sum + clip.duration, 0),
      createdAt: new Date().toISOString(),
      thumbnail: selectedClips[0]?.url || null
    };
    
    // Store reel data (in real app, this would be sent to API)
    const existingReels = JSON.parse(localStorage.getItem('userReels') || '[]');
    existingReels.push(reelData);
    localStorage.setItem('userReels', JSON.stringify(existingReels));
    
    setIsCreating(false);
    setIsPlaying(false);
    alert('Reel created successfully! 🎬');
    
    // Reset form
    setReelTitle('My Photo Reel');
    setSelectedClips([]);
    setUploadedClips([]);
    setCurrentTime(0);
  };

  const togglePlayback = () => {
    setIsPlaying(!isPlaying);
  };

  const handleTimelineClick = (e) => {
    const timelineRect = e.currentTarget.getBoundingClientRect();
    const clickPosition = (e.clientX - timelineRect.left) / timelineRect.width;
    const newTime = clickPosition * duration;
    setCurrentTime(newTime);
  };

  useEffect(() => {
    let interval;
    if (isPlaying && currentTime < duration) {
      interval = setInterval(() => {
        setCurrentTime(prev => {
          if (prev >= duration - 0.1) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 0.1;
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying, currentTime, duration]);

  return (
    <div className="reel-generator py-4">
      <div className="container">
        {/* Header */}
        <div className="gradient-header rounded-3 p-4 mb-4">
          <div className="row align-items-center">
            <div className="col-md-8">
              <h1 className="fw-bold mb-2">🎬 Reel Generator</h1>
              <p className="mb-0">Create stunning video reels from your photos with music and effects</p>
            </div>
            <div className="col-md-4 text-md-end">
              <div className="text-white mb-2">
                <div className="small opacity-75">Reel Progress</div>
                <div className="h5 fw-bold">{selectedClips.length} Clips Added</div>
              </div>
            </div>
          </div>
        </div>

        <div className="row">
          {/* Left Sidebar - Upload & Settings */}
          <div className="col-lg-3">
            {/* Reel Settings */}
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-header bg-white border-0 pt-4 pb-3">
                <h5 className="fw-bold mb-0">Reel Settings</h5>
              </div>
              <div className="card-body">
                <div className="mb-3">
                  <label className="form-label fw-semibold">Reel Title *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={reelTitle}
                    onChange={(e) => setReelTitle(e.target.value)}
                    placeholder="My Amazing Reel"
                  />
                </div>
                
                <div className="mb-3">
                  <label className="form-label fw-semibold">Music Track *</label>
                  <select 
                    className="form-select"
                    value={selectedMusic}
                    onChange={(e) => setSelectedMusic(e.target.value)}
                  >
                    <option value="">Select background music</option>
                    {musicOptions.map(music => (
                      <option key={music.id} value={music.id}>
                        {music.name} ({music.duration})
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="mb-3">
                  <label className="form-label fw-semibold">Visual Theme *</label>
                  <select 
                    className="form-select"
                    value={selectedTheme}
                    onChange={(e) => setSelectedTheme(e.target.value)}
                  >
                    {themes.map(theme => (
                      <option key={theme.id} value={theme.id}>
                        {theme.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Upload Area */}
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-header bg-white border-0 pt-4 pb-3">
                <h5 className="fw-bold mb-0">Upload Clips</h5>
              </div>
              <div className="card-body">
                <div 
                  className="upload-zone"
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="text-center">
                    <div className="mb-3" style={{ fontSize: '3rem' }}>📹</div>
                    <h6 className="fw-semibold mb-2">Drag & Drop Videos/Photos Here</h6>
                    <p className="text-muted small mb-3">or click to browse files</p>
                    <button className="btn btn-primary btn-sm">
                      Choose Files
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*,video/*"
                      onChange={handleFileUpload}
                      className="d-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Create Reel Button */}
            <button 
              className="btn btn-primary w-100 btn-lg"
              onClick={simulateReelCreation}
              disabled={isCreating || selectedClips.length === 0}
            >
              {isCreating ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Creating Reel...
                </>
              ) : (
                '🎬 Create Reel'
              )}
            </button>
          </div>

          {/* Main Content - Timeline and Preview */}
          <div className="col-lg-9">
            {/* Preview Player */}
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-header bg-white border-0 pt-4 pb-3">
                <div className="d-flex justify-content-between align-items-center">
                  <h5 className="fw-bold mb-0">Reel Preview</h5>
                  <div className="d-flex gap-2">
                    <button 
                      className="btn btn-outline-primary btn-sm"
                      onClick={togglePlayback}
                      disabled={selectedClips.length === 0}
                    >
                      {isPlaying ? '⏸️ Pause' : '▶️ Play'}
                    </button>
                    <button className="btn btn-outline-secondary btn-sm">
                      ⚙️ Settings
                    </button>
                  </div>
                </div>
              </div>
              <div className="card-body p-4">
                {selectedClips.length === 0 ? (
                  <div className="text-center py-5">
                    <div className="mb-4" style={{ fontSize: '4rem' }}>🎬</div>
                    <h4 className="fw-bold mb-3">No Clips Added</h4>
                    <p className="text-muted mb-4">Upload and add clips to start creating your reel</p>
                    <button 
                      className="btn btn-primary"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Upload Clips
                    </button>
                  </div>
                ) : (
                  <div>
                    {/* Video Preview Area */}
                    <div className="video-preview-area mb-3 text-center" 
                         style={{ 
                           minHeight: '300px', 
                           backgroundColor: '#000', 
                           borderRadius: '8px',
                           position: 'relative',
                           overflow: 'hidden'
                         }}>
                      {selectedClips.length > 0 && (
                        <div style={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)',
                          color: 'white',
                          textAlign: 'center'
                        }}>
                          <div style={{ fontSize: '4rem' }}>🎬</div>
                          <div>{reelTitle || 'My Photo Reel'}</div>
                          {isPlaying && (
                            <div className="mt-3">
                              <div className="spinner-border text-light" role="status">
                                <span className="visually-hidden">Playing...</span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Timeline Progress */}
                      <div className="progress position-absolute bottom-0 w-0" 
                           style={{ height: '4px', backgroundColor: '#F7931E' }}
                      />
                    </div>
                    
                    {/* Timeline */}
                    <div className="timeline-container">
                      <div className="d-flex align-items-center mb-2">
                        <span className="small text-muted me-2">{formatDuration(currentTime)}</span>
                        <div className="flex-grow-1 bg-light rounded position-relative" 
                             style={{ height: '8px', cursor: 'pointer' }}
                             onClick={handleTimelineClick}>
                          <div className="progress-bar bg-primary" 
                               style={{ 
                                 width: `${(currentTime / duration) * 100}%`,
                                 height: '8px'
                               }} />
                        </div>
                        <span className="small text-muted ms-2">{formatDuration(duration)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Clips Timeline */}
            {selectedClips.length > 0 && (
              <div className="card border-0 shadow-sm mb-4">
                <div className="card-header bg-white border-0 pt-4 pb-3">
                  <h6 className="fw-bold mb-0">🎞️ Timeline Clips ({selectedClips.length})</h6>
                </div>
                <div className="card-body">
                  <div className="timeline-clips">
                    {selectedClips.map((clip, index) => (
                      <div key={clip.id} className="d-flex align-items-center mb-3">
                        <div className="me-3 text-primary">
                          <div className="rounded bg-light d-flex align-items-center justify-content-center" 
                               style={{ width: '40px', height: '40px' }}>
                            📸
                          </div>
                        </div>
                        <div className="flex-grow-1">
                          <div className="d-flex justify-content-between align-items-center">
                            <div>
                              <div className="fw-semibold">{clip.name}</div>
                              <small className="text-muted">
                                {formatFileSize(clip.size)} • {formatDuration(clip.duration)}
                              </small>
                            </div>
                            <button 
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => removeClip(clip.id)}
                            >
                              Remove
                            </button>
                          </div>
                          <div className="progress mt-2" style={{ height: '4px' }}>
                            <div className="progress-bar bg-primary" style={{ width: '100%' }} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Effects Panel */}
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-header bg-white border-0 pt-4 pb-3">
                <h6 className="fw-bold mb-0">✨ Visual Effects</h6>
              </div>
              <div className="card-body">
                <div className="row g-2">
                  {effects.map((effect) => (
                    <div key={effect.id} className="col-md-4">
                      <button className="btn btn-outline-primary w-100 btn-sm">
                        {effect.icon} {effect.name}
                      </button>
                    </div>
                  ))}
                </div>
                <div className="alert alert-info small mt-3">
                  <strong>💡 Tip:</strong> Add transitions between clips for smoother flow and professional appearance.
                </div>
              </div>
            </div>

            {/* Quick Templates */}
            {selectedClips.length > 0 && (
              <div className="card border-0 shadow-sm">
                <div className="card-header bg-white border-0 pt-4 pb-3">
                  <h6 className="fw-bold mb-0">🎨 Quick Reel Templates</h6>
                </div>
                <div className="card-body">
                  <div className="row g-2">
                    <div className="col-md-4">
                      <button className="btn btn-outline-primary w-100 btn-sm">
                        🎓 Graduation Reel
                      </button>
                    </div>
                    <div className="col-md-4">
                      <button className="btn btn-outline-primary w-100 btn-sm">
                        💑 Wedding Reel
                      </button>
                    </div>
                    <div className="col-md-4">
                      <button className="btn btn-outline-primary w-100 btn-sm">
                        👨‍👩‍👧‍👦 Family Reel
                      </button>
                    </div>
                    <div className="col-md-4">
                      <button className="btn btn-outline-primary w-100 btn-sm">
                        🏃‍♀️ Sports Reel
                      </button>
                    </div>
                    <div className="col-md-4">
                      <button className="btn btn-outline-primary w-100 btn-sm">
                        🎂 Birthday Reel
                      </button>
                    </div>
                    <div className="col-md-4">
                      <button className="btn btn-outline-primary w-100 btn-sm">
                        🏕️ Travel Reel
                      </button>
                    </div>
                  </div>
                  <div className="alert alert-success small mt-3">
                    <strong>🎯 Pro Tip:</strong> Templates automatically arrange clips, add transitions, and optimize music timing for your selected theme.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReelGenerator;