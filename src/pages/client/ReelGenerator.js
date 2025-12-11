import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

const ReelGenerator = () => {
  const { user } = useAuth();
  const fileInputRef = useRef(null);
  
  // State management
  const [images, setImages] = useState([]);
  const [uploadedUrls, setUploadedUrls] = useState([]);
  const [transition, setTransition] = useState('fade');
  const [aspectRatio, setAspectRatio] = useState('9:16');
  const [introText, setIntroText] = useState('');
  const [durationPerImage, setDurationPerImage] = useState(3.0);
  const [fadeDuration, setFadeDuration] = useState(0.5);
  const [fitMode, setFitMode] = useState('fit');
  const [kenBurns, setKenBurns] = useState(false);
  
  // Music state
  const [musicOption, setMusicOption] = useState('none'); // 'none', 'upload'
  const [uploadedMusicUrl, setUploadedMusicUrl] = useState(null);
  const [musicVolume, setMusicVolume] = useState(70);
  const [uploadingMusic, setUploadingMusic] = useState(false);
  const musicInputRef = useRef(null);
  
  // Filter state
  const [filter, setFilter] = useState('none');
  
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatedVideo, setGeneratedVideo] = useState(null);
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);

  // Additional state for reel creation
  const [reelTitle, setReelTitle] = useState('My Photo Reel');
  const [selectedClips, setSelectedClips] = useState([]);
  const [uploadedClips, setUploadedClips] = useState([]);
  const [selectedMusic, setSelectedMusic] = useState(null);
  const [selectedTheme, setSelectedTheme] = useState('modern');
  const [isCreating, setIsCreating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Get recommended character limit based on aspect ratio
  const getCharLimit = () => {
    switch(aspectRatio) {
      case '9:16': return 25;  // Reduced for portrait
      case '16:9': return 50;
      case '1:1': return 35;
      default: return 40;
    }
  };

  // Check if intro text is too long for selected aspect ratio
  const isTextTooLong = introText.length > getCharLimit();

  // Music options
  const musicOptions = [
    { id: 1, name: 'Upbeat Pop', genre: 'Pop', duration: 180 },
    { id: 2, name: 'Cinematic Epic', genre: 'Epic', duration: 200 },
    { id: 3, name: 'Chill Vibes', genre: 'Chill', duration: 150 }
  ];

  // Theme options
  const themes = [
    { id: 'modern', name: 'Modern', description: 'Clean and minimalist' },
    { id: 'vintage', name: 'Vintage', description: 'Classic film look' },
    { id: 'vibrant', name: 'Vibrant', description: 'Bold and colorful' }
  ];

  // Handle file selection
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    
    if (files.length < 1) {
      setError('Please select at least 1 image');
      return;
    }
    
    if (files.length > 15) {
      setError('Maximum 15 images allowed');
      return;
    }
    
    // Validate file types
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const invalidFiles = files.filter(f => !validTypes.includes(f.type));
    
    if (invalidFiles.length > 0) {
      setError('Only JPG, PNG, and WebP images are allowed');
      return;
    }
    
    setError('');
    setImages(files);
    setUploadedUrls([]); // Clear previous uploads
    setGeneratedVideo(null); // Clear previous video
  };

  // Remove a specific image
  const handleRemoveImage = (index) => {
    const newImages = images.filter((_, idx) => idx !== index);
    setImages(newImages);
    
    // Also remove from uploaded URLs if already uploaded
    if (uploadedUrls.length > 0) {
      const newUploadedUrls = uploadedUrls.filter((_, idx) => idx !== index);
      setUploadedUrls(newUploadedUrls);
    }
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
    // Show error if no images left
    if (newImages.length === 0) {
      setError('Please select at least 1 image');
      setGeneratedVideo(null);
    }
  };

  // Handle music file upload
  const handleMusicUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav'];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(mp3|wav)$/i)) {
      setError('Only MP3 and WAV files are supported');
      return;
    }

    setUploadingMusic(true);
    setError('');

    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('http://localhost:5000/api/reels/upload-music', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to upload music');
      }

      const data = await response.json();
      setUploadedMusicUrl(data.url);
      setMusicOption('upload');
    } catch (err) {
      setError(err.message || 'Failed to upload music');
      console.error('Music upload error:', err);
    } finally {
      setUploadingMusic(false);
    }
  };

  // Request notification permission
  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  };

  // Show browser notification and change page title
  const showNotification = () => {
    // Change page title to alert user
    const originalTitle = document.title;
    document.title = 'Reel Ready! - BookYourShoot';
    
    // Play a success sound (optional, can be commented out)
    // const audio = new Audio('/notification-sound.mp3');
    // audio.play().catch(() => {});
    
    // Show browser notification if permitted
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification('Reel Ready!', {
        body: 'Your reel has been generated and is ready to download.',
        icon: '/logo.png',
        badge: '/logo.png',
        tag: 'reel-complete',
        requireInteraction: false
      });
      
      notification.onclick = () => {
        window.focus();
        document.title = originalTitle;
        notification.close();
      };
      
      // Auto-close after 10 seconds and restore title
      setTimeout(() => {
        notification.close();
        document.title = originalTitle;
      }, 10000);
    } else {
      // Restore title after 10 seconds if no notification shown
      setTimeout(() => {
        document.title = originalTitle;
      }, 10000);
    }
  };

  // Upload images to backend
  const handleUploadImages = async () => {
    if (images.length === 0) {
      setError('Please select images first');
      return;
    }
    
    setUploading(true);
    setError('');
    setUploadProgress(0);
    
    try {
      const urls = [];
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      for (let i = 0; i < images.length; i++) {
        const file = images[i];
        const formData = new FormData();
        formData.append('file', file);
        
        // Upload to backend
        const response = await fetch('http://localhost:5000/api/reels/upload-image', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`Failed to upload ${file.name}: ${errorData.detail || 'Upload failed'}`);
        }
        
        const data = await response.json();
        urls.push(data.url);
        
        // Update progress
        setUploadProgress(Math.round(((i + 1) / images.length) * 100));
      }
      
      setUploadedUrls(urls);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to upload images');
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  // Generate reel
  const handleGenerateReel = async () => {
    if (uploadedUrls.length === 0) {
      setError('Please upload images first');
      return;
    }
    
    // Request notification permission before starting
    await requestNotificationPermission();
    
    setGenerating(true);
    setError('');
    setGeneratedVideo(null);
    
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      const response = await fetch('http://localhost:5000/api/reels/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          images: uploadedUrls,
          transition: transition,
          ratio: aspectRatio,
          intro_text: introText || null,
          duration_per_image: durationPerImage,
          fade_duration: fadeDuration,
          fit_mode: fitMode,
          ken_burns: kenBurns,
          music_upload_url: musicOption === 'upload' ? uploadedMusicUrl : null,
          music_volume: musicVolume,
          filter: filter
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to generate reel');
      }
      
      const data = await response.json();
      setGeneratedVideo(data);
      
      // Show notification when reel is ready
      showNotification();
      
    } catch (err) {
      setError(err.message || 'Failed to generate reel');
      console.error('Generation error:', err);
    } finally {
      setGenerating(false);
    }
  };

  // Download video
  const handleDownload = () => {
    if (generatedVideo?.video_url) {
      const link = document.createElement('a');
      link.href = generatedVideo.video_url;
      link.download = `reel_${Date.now()}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Reset form
  const handleReset = () => {
    setImages([]);
    setUploadedUrls([]);
    setGeneratedVideo(null);
    setError('');
    setUploadProgress(0);
    setIntroText('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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
    <div className="container py-4">
      <div className="row">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2 className="mb-0">Reel Generator</h2>
            {images.length > 0 && (
              <button
                className="btn btn-outline-secondary btn-sm"
                onClick={handleReset}
                disabled={uploading || generating}
              >
                Start Over
              </button>
            )}
          </div>
          
          {error && (
            <div className="alert alert-danger alert-dismissible fade show" role="alert">
              <strong>Error:</strong> {error}
              <button type="button" className="btn-close" onClick={() => setError('')}></button>
            </div>
          )}

          {/* Upload Section */}
          <div className="card mb-4 shadow-sm border-0">
            <div className="card-body p-4">
              <h5 className="card-title mb-3">Step 1: Select Your Photos</h5>
              
              <div className="mb-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  className="form-control d-none"
                  id="imageUploadInput"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  multiple
                  onChange={handleFileSelect}
                  disabled={uploading || generating}
                />
                <label 
                  htmlFor="imageUploadInput" 
                  className="btn btn-lg btn-primary w-100 mb-2"
                  style={{ 
                    cursor: uploading || generating ? 'not-allowed' : 'pointer',
                    padding: '20px'
                  }}
                >
                  <div className="d-flex flex-column align-items-center">
                    <svg 
                      width="48" 
                      height="48" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                      className="mb-2"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="17 8 12 3 7 8"></polyline>
                      <line x1="12" y1="3" x2="12" y2="15"></line>
                    </svg>
                    <span className="fw-bold fs-5">Choose Photos</span>
                    <small className="mt-2 opacity-75">
                      JPG, PNG, WebP • 1-15 images
                    </small>
                  </div>
                </label>
              </div>
              
              {images.length > 0 && (
                <div className="mb-3">
                  <div className="bg-light p-3 rounded mb-3">
                    <p className="mb-2 fw-semibold text-primary">
                      <svg 
                        width="20" 
                        height="20" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                        className="me-2"
                        style={{ verticalAlign: 'middle' }}
                      >
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <circle cx="8.5" cy="8.5" r="1.5"></circle>
                        <polyline points="21 15 16 10 5 21"></polyline>
                      </svg>
                      {images.length} {images.length === 1 ? 'photo' : 'photos'} selected
                    </p>
                  
                    {/* Image previews */}
                    <div className="d-flex flex-wrap gap-2 mb-3">
                      {images.map((img, idx) => (
                        <div key={idx} className="position-relative" style={{ width: '90px', height: '90px' }}>
                          <img
                            src={URL.createObjectURL(img)}
                            alt={`Preview ${idx + 1}`}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              borderRadius: '12px',
                              border: '3px solid #225ea1',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                            }}
                          />
                          <span
                            className="position-absolute top-0 start-0 badge bg-primary"
                            style={{ 
                              fontSize: '11px',
                              borderRadius: '8px 0 8px 0'
                            }}
                          >
                            {idx + 1}
                          </span>
                          <button
                            type="button"
                            className="btn btn-danger btn-sm position-absolute top-0 end-0"
                            onClick={() => handleRemoveImage(idx)}
                            disabled={uploading || generating}
                            style={{
                              padding: '2px 6px',
                              fontSize: '12px',
                              lineHeight: '1',
                              borderRadius: '0 8px 0 8px',
                              border: 'none'
                            }}
                            title="Remove photo"
                          >
                            <svg 
                              width="14" 
                              height="14" 
                              viewBox="0 0 24 24" 
                              fill="none" 
                              stroke="currentColor" 
                              strokeWidth="3" 
                              strokeLinecap="round" 
                              strokeLinejoin="round"
                            >
                              <line x1="18" y1="6" x2="6" y2="18"></line>
                              <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {uploadedUrls.length === 0 && (
                    <button
                      className="btn btn-primary btn-lg w-100"
                      onClick={handleUploadImages}
                      disabled={uploading || generating}
                      style={{ padding: '15px' }}
                    >
                      {uploading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2"></span>
                          Uploading... {uploadProgress}%
                        </>
                      ) : (
                        <>
                          <svg 
                            width="20" 
                            height="20" 
                            viewBox="0 0 24 24" 
                            fill="none" 
                            stroke="currentColor" 
                            strokeWidth="2" 
                            strokeLinecap="round" 
                            strokeLinejoin="round"
                            className="me-2"
                          >
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                          </svg>
                          Upload
                        </>
                      )}
                    </button>
                  )}
                  
                  {uploadedUrls.length > 0 && (
                    <div className="alert alert-success mb-0 d-flex align-items-center">
                      <svg 
                        width="24" 
                        height="24" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                        className="me-2"
                      >
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                      </svg>
                      <span>Photos uploaded! Ready to create your reel.</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* Configuration Section */}
          {uploadedUrls.length > 0 && (
            <div className="card mb-4 shadow-sm border-0">
              <div className="card-body p-4">
                <h5 className="card-title mb-4">Step 2: Customize Your Reel</h5>
                
                <div className="row">
                  {/* Intro Text */}
                  <div className="col-md-6 mb-4">
                    <label className="form-label fw-semibold">Opening Title (Optional)</label>
                    <input
                      type="text"
                      className={`form-control form-control-lg ${isTextTooLong ? 'border-warning' : ''}`}
                      placeholder="e.g., Summer Memories"
                      value={introText}
                      onChange={(e) => setIntroText(e.target.value)}
                      maxLength={50}
                      disabled={generating}
                      style={{ borderRadius: '10px' }}
                    />
                    <div className="d-flex justify-content-between align-items-start mt-1">
                      <small className={`form-text ${isTextTooLong ? 'text-warning' : 'text-muted'}`}>
                        {isTextTooLong ? (
                          <>
                            <svg 
                              width="14" 
                              height="14" 
                              viewBox="0 0 24 24" 
                              fill="none" 
                              stroke="currentColor" 
                              strokeWidth="2" 
                              strokeLinecap="round" 
                              strokeLinejoin="round"
                              className="me-1"
                              style={{ verticalAlign: 'middle' }}
                            >
                              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                              <line x1="12" y1="9" x2="12" y2="13"></line>
                              <line x1="12" y1="17" x2="12.01" y2="17"></line>
                            </svg>
                            Text may wrap or shrink in {aspectRatio === '9:16' ? 'portrait' : aspectRatio === '16:9' ? 'landscape' : 'square'} format
                          </>
                        ) : (
                          'Shows for 2.5 seconds at the beginning'
                        )}
                      </small>
                      <small className={`form-text ms-2 ${isTextTooLong ? 'text-warning fw-semibold' : 'text-muted'}`}>
                        {introText.length}/{getCharLimit()}
                      </small>
                    </div>
                  </div>
                  
                  {/* Aspect Ratio */}
                  <div className="col-md-6 mb-4">
                    <label className="form-label fw-semibold">Video Format</label>
                    <select
                      className="form-select form-select-lg"
                      value={aspectRatio}
                      onChange={(e) => setAspectRatio(e.target.value)}
                      disabled={generating}
                      style={{ borderRadius: '10px' }}
                    >
                      <option value="9:16">Portrait (9:16) - Instagram Reels & Stories</option>
                      <option value="16:9">Landscape (16:9) - YouTube & TV</option>
                      <option value="1:1">Square (1:1) - Instagram Feed</option>
                    </select>
                  </div>
                  
                  {/* Transition */}
                  <div className="col-md-6 mb-4">
                    <label className="form-label fw-semibold">Transition Style</label>
                    <select
                      className="form-select form-select-lg"
                      value={transition}
                      onChange={(e) => setTransition(e.target.value)}
                      disabled={generating}
                      style={{ borderRadius: '10px' }}
                    >
                      <option value="fade">Smooth Fade</option>
                      <option value="none">Quick Cut</option>
                    </select>
                  </div>
                  
                  {/* Duration per image */}
                  <div className="col-md-6 mb-4">
                    <label className="form-label fw-semibold">
                      Photo Duration: <span className="text-primary">{durationPerImage}s</span> each
                    </label>
                    <input
                      type="range"
                      className="form-range"
                      min="1"
                      max="5"
                      step="0.5"
                      value={durationPerImage}
                      onChange={(e) => setDurationPerImage(parseFloat(e.target.value))}
                      disabled={generating}
                    />
                    <small className="form-text text-muted">
                      Total video length: approximately {(uploadedUrls.length * durationPerImage).toFixed(1)} seconds
                    </small>
                  </div>
                  
                  {/* Fade duration (only if fade transition) */}
                  {transition === 'fade' && (
                    <div className="col-md-6 mb-4">
                      <label className="form-label fw-semibold">
                        Fade Speed: <span className="text-primary">{fadeDuration}s</span>
                      </label>
                      <input
                        type="range"
                        className="form-range"
                        min="0.1"
                        max="2"
                        step="0.1"
                        value={fadeDuration}
                        onChange={(e) => setFadeDuration(parseFloat(e.target.value))}
                        disabled={generating}
                      />
                      <small className="form-text text-muted">
                        {fadeDuration < 0.5 ? 'Fast' : fadeDuration < 1 ? 'Medium' : 'Slow'} fade effect
                      </small>
                    </div>
                  )}

                  {/* Image Fit Mode */}
                  <div className="col-md-6 mb-4">
                    <label className="form-label fw-semibold">Image Display Mode</label>
                    <select
                      className="form-select form-select-lg"
                      value={fitMode}
                      onChange={(e) => setFitMode(e.target.value)}
                      disabled={generating}
                      style={{ borderRadius: '10px' }}
                    >
                      <option value="fit">Smart Fit - Show Full Image (Black bars if needed)</option>
                      <option value="fill">Fill Screen - Cinematic Look (May crop edges)</option>
                    </select>
                    <small className="form-text text-muted">
                      {fitMode === 'fit' 
                        ? 'Nothing gets cut off, entire image visible' 
                        : 'No black bars, fills entire screen'}
                    </small>
                  </div>

                  {/* Ken Burns Effect */}
                  <div className="col-md-6 mb-4">
                    <label className="form-label fw-semibold">Motion Effect</label>
                    <div className="form-check form-switch" style={{ paddingTop: '8px' }}>
                      <input
                        className="form-check-input"
                        type="checkbox"
                        role="switch"
                        id="kenBurnsSwitch"
                        checked={kenBurns}
                        onChange={(e) => setKenBurns(e.target.checked)}
                        disabled={generating}
                        style={{ width: '48px', height: '24px', cursor: 'pointer' }}
                      />
                      <label 
                        className="form-check-label ms-2" 
                        htmlFor="kenBurnsSwitch"
                        style={{ cursor: 'pointer', fontSize: '16px' }}
                      >
                        <strong>{kenBurns ? 'ON' : 'OFF'}</strong> - Cinematic Zoom Effect
                      </label>
                    </div>
                    <small className="form-text text-muted d-block mt-2">
                      {kenBurns 
                        ? 'Adds smooth zoom and motion to photos for a professional look' 
                        : 'Photos will remain static without zoom'}
                    </small>
                  </div>
                </div>

                {/* Color Filter */}
                <div className="mb-4">
                  <h6 className="fw-semibold mb-3">Visual Style</h6>
                  <div className="row g-2">
                    <div className="col-12">
                      <label className="form-label fw-semibold">Color Filter</label>
                      <select
                        className="form-select form-select-lg"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        disabled={generating}
                        style={{ borderRadius: '10px' }}
                      >
                        <option value="none">None - Original Colors</option>
                        <option value="vibrant">Vibrant - Bold & Colorful</option>
                        <option value="vintage">Vintage - Classic Sepia</option>
                        <option value="bw">Black & White - Timeless</option>
                        <option value="warm">Warm - Sunset Tones</option>
                        <option value="cool">Cool - Blue Tones</option>
                      </select>
                      <small className="form-text text-muted d-block mt-1">
                        {filter === 'none' && 'Keep original photo colors'}
                        {filter === 'vibrant' && 'Boosts colors and contrast for eye-catching visuals'}
                        {filter === 'vintage' && 'Classic sepia tone with reduced saturation'}
                        {filter === 'bw' && 'Elegant black and white look'}
                        {filter === 'warm' && 'Adds orange/red tones for a cozy feel'}
                        {filter === 'cool' && 'Adds blue tones for a calm, professional look'}
                      </small>
                    </div>
                  </div>
                </div>

                {/* Music Section */}
                <div className="mb-4">
                  <h6 className="fw-semibold mb-3">Background Music (Optional)</h6>
                  
                  <div className="row g-3">
                    {/* Music Option Selector */}
                    <div className="col-12">
                      <div className="btn-group w-100" role="group">
                        <input 
                          type="radio" 
                          className="btn-check" 
                          name="musicOption" 
                          id="noMusic" 
                          checked={musicOption === 'none'}
                          onChange={() => setMusicOption('none')}
                          disabled={generating}
                        />
                        <label className="btn btn-outline-primary" htmlFor="noMusic">No Music</label>
                        
                        <input 
                          type="radio" 
                          className="btn-check" 
                          name="musicOption" 
                          id="uploadMusic" 
                          checked={musicOption === 'upload'}
                          onChange={() => setMusicOption('upload')}
                          disabled={generating}
                        />
                        <label className="btn btn-outline-primary" htmlFor="uploadMusic">Upload Music File</label>
                      </div>
                    </div>

                    {/* Upload Music File */}
                    {musicOption === 'upload' && (
                      <div className="col-12">
                        <input
                          ref={musicInputRef}
                          type="file"
                          className="form-control d-none"
                          id="musicUploadInput"
                          accept="audio/mpeg,audio/mp3,audio/wav"
                          onChange={handleMusicUpload}
                          disabled={uploadingMusic || generating}
                        />
                        <label 
                          htmlFor="musicUploadInput" 
                          className="btn btn-outline-secondary w-100"
                          style={{ cursor: uploadingMusic || generating ? 'not-allowed' : 'pointer' }}
                        >
                          {uploadingMusic ? (
                            <>
                              <span className="spinner-border spinner-border-sm me-2"></span>
                              Uploading...
                            </>
                          ) : uploadedMusicUrl ? (
                            <>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-2">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                <polyline points="22 4 12 14.01 9 11.01"></polyline>
                              </svg>
                              Music Uploaded - Click to Change
                            </>
                          ) : (
                            <>Choose Music File (MP3, WAV)</>
                          )}
                        </label>
                        <small className="form-text text-muted d-block mt-1">
                          Ensure you have rights to use this music
                        </small>
                      </div>
                    )}

                    {/* Volume Control */}
                    {musicOption !== 'none' && (
                      <div className="col-12">
                        <label className="form-label fw-semibold">
                          Volume: <span className="text-primary">{musicVolume}%</span>
                        </label>
                        <input
                          type="range"
                          className="form-range"
                          min="0"
                          max="100"
                          step="5"
                          value={musicVolume}
                          onChange={(e) => setMusicVolume(parseInt(e.target.value))}
                          disabled={generating}
                        />
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="d-grid gap-2">
                  <button
                    className="btn btn-primary btn-lg"
                    onClick={handleGenerateReel}
                    disabled={generating}
                    style={{ padding: '15px', fontSize: '18px' }}
                  >
                    {generating ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Creating your reel... This usually takes 30-60 seconds
                      </>
                    ) : (
                      <>
                        <svg 
                          width="24" 
                          height="24" 
                          viewBox="0 0 24 24" 
                          fill="none" 
                          stroke="currentColor" 
                          strokeWidth="2" 
                          strokeLinecap="round" 
                          strokeLinejoin="round"
                          className="me-2"
                        >
                          <polygon points="5 3 19 12 5 21 5 3"></polygon>
                        </svg>
                        Create My Reel
                      </>
                    )}
                  </button>
                  
                  {generating && (
                    <div className="text-center mt-3">
                      <div className="alert alert-info py-2 mb-0 d-inline-flex align-items-center">
                        <svg 
                          width="18" 
                          height="18" 
                          viewBox="0 0 24 24" 
                          fill="none" 
                          stroke="currentColor" 
                          strokeWidth="2" 
                          strokeLinecap="round" 
                          strokeLinejoin="round"
                          className="me-2"
                        >
                          <circle cx="12" cy="12" r="10"></circle>
                          <line x1="12" y1="16" x2="12" y2="12"></line>
                          <line x1="12" y1="8" x2="12.01" y2="8"></line>
                        </svg>
                        <small>
                          Feel free to switch tabs - the page title will change when ready
                        </small>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* Preview Section */}
          {generatedVideo && (
            <div className="card mb-4 shadow-sm border-0">
              <div className="card-body p-4">
                <h5 className="card-title mb-4">Step 3: Your Reel is Ready</h5>
                
                <div className="alert alert-success mb-4 d-flex align-items-start">
                  <svg 
                    width="24" 
                    height="24" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                    className="me-2 flex-shrink-0"
                    style={{ marginTop: '2px' }}
                  >
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                  <div>
                    <strong>Success!</strong> Your reel has been created.
                    <ul className="mb-0 mt-2 small">
                      <li>Length: {generatedVideo.duration?.toFixed(1)} seconds</li>
                      <li>Photos: {generatedVideo.num_images}</li>
                      <li>Format: {generatedVideo.aspect_ratio}</li>
                      {generatedVideo.file_size && (
                        <li>File size: {(generatedVideo.file_size / (1024 * 1024)).toFixed(2)} MB</li>
                      )}
                    </ul>
                  </div>
                </div>
                
                {/* Video Preview */}
                <div className="mb-4 text-center">
                  <video
                    controls
                    style={{
                      width: '100%',
                      maxWidth: aspectRatio === '9:16' ? '450px' : '100%',
                      borderRadius: '16px',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                      border: '3px solid #225ea1'
                    }}
                    src={generatedVideo.video_url}
                  >
                    Your browser does not support the video tag.
                  </video>
                </div>
                
                {/* Download Button */}
                <div className="d-grid gap-2">
                  <button
                    className="btn btn-primary btn-lg"
                    onClick={handleDownload}
                    style={{ padding: '15px', fontSize: '18px' }}
                  >
                    <svg 
                      width="24" 
                      height="24" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                      className="me-2"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="7 10 12 15 17 10"></polyline>
                      <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    Download Reel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReelGenerator;
