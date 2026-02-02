import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
  Music, Play, Pause, Heart, Search, Sparkles, ExternalLink, 
  Upload, Image, Wand2, X, Camera, CheckCircle2,
  Loader2, AlertCircle, RefreshCw, Video, FileVideo, ImageIcon
} from 'lucide-react';

/**
 * =============================================================================
 * SMART MUSIC DISCOVERY FOR EVENTS
 * =============================================================================
 * 
 * Intelligent music suggestions using event detection from your photos.
 * Upload images from your event and get perfectly matched music recommendations.
 * 
 * MODES:
 * 1. Smart Detection - Upload single image/video for instant suggestions
 * 2. Batch Analysis - Upload multiple images for better accuracy
 * 3. Browse - Search by event type or keywords
 * 
 * Author: BookYourShoot Team
 * =============================================================================
 */

const MusicDiscoveryUI = () => {
  // Core state
  const [mode, setMode] = useState('smart'); // 'smart' (AI single), 'batch' (AI multi-image), or 'browse'
  const [tracks, setTracks] = useState([]);
  const [savedTracks, setSavedTracks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [playingTrack, setPlayingTrack] = useState(null);
  const [selectedTrackForPlayer, setSelectedTrackForPlayer] = useState(null);
  const audioRef = useRef(null);

  // AI/Smart mode state - now supports both image and video
  const [uploadedFile, setUploadedFile] = useState(null);  // Renamed from uploadedImage
  const [filePreview, setFilePreview] = useState(null);    // Renamed from imagePreview
  const [fileType, setFileType] = useState(null);          // 'image' or 'video'
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);

  // Batch/Multi-Image mode state (NEW!)
  const [uploadedImages, setUploadedImages] = useState([]);     // Array of {file, preview}
  const [batchAnalyzing, setBatchAnalyzing] = useState(false);
  const [batchAnalysis, setBatchAnalysis] = useState(null);     // Aggregate analysis results
  const batchInputRef = useRef(null);

  // Browse mode state
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

  // Event categories for browse mode
  const events = [
    { id: 'mehndi', name: 'Mehndi', image: '/illustrations/mehndi.jpg', emoji: '💛' },
    { id: 'barat', name: 'Barat', image: '/illustrations/baraat.jpg', emoji: '🎊' },
    { id: 'walima', name: 'Walima', image: '/illustrations/valima.jpg', emoji: '💕' },
    { id: 'birthday', name: 'Birthday', image: '/illustrations/birthday.jpg', emoji: '🎂' },
    { id: 'corporate', name: 'Corporate', image: '/illustrations/corporate.jpg', emoji: '💼' }
  ];

  // Load saved tracks on mount
  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('savedTracks') || '[]');
    setSavedTracks(saved);
  }, []);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  // ==================== File Upload Handlers ====================

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  /**
   * Handle file upload - supports both images and videos
   * For videos, creates a video element for preview
   * For images, creates a data URL for preview
   */
  const handleFile = async (file) => {
    // Check if file is image or video
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    
    if (!isImage && !isVideo) {
      alert('Please upload an image (JPG, PNG) or video (MP4, MOV) file');
      return;
    }

    // Create preview based on file type
    if (isImage) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setFilePreview(e.target.result);
      };
      reader.readAsDataURL(file);
      setFileType('image');
    } else if (isVideo) {
      // For video, create object URL for preview
      const videoUrl = URL.createObjectURL(file);
      setFilePreview(videoUrl);
      setFileType('video');
    }

    // Store file for upload
    setUploadedFile(file);
    setAnalysis(null);
    setTracks([]);
  };

  const clearFile = () => {
    // Clean up video URL if exists
    if (fileType === 'video' && filePreview) {
      URL.revokeObjectURL(filePreview);
    }
    setUploadedFile(null);
    setFilePreview(null);
    setFileType(null);
    setAnalysis(null);
    setTracks([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // ==================== Multi-Image Batch Handlers ====================

  const handleBatchImageInput = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleMultipleImages(Array.from(e.target.files));
    }
  };

  const handleMultipleImages = async (files) => {
    // Limit to 20 images
    const imageFiles = files.filter(f => f.type.startsWith('image/')).slice(0, 20);
    
    if (imageFiles.length === 0) {
      alert('Please select at least 1 image file (JPG, PNG)');
      return;
    }

    if (imageFiles.length > 20) {
      alert('Maximum 20 images allowed. First 20 will be used.');
    }

    // Create previews for all images
    const imagePreviews = await Promise.all(
      imageFiles.map(file => {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            resolve({
              file: file,
              preview: e.target.result,
              name: file.name
            });
          };
          reader.readAsDataURL(file);
        });
      })
    );

    setUploadedImages(imagePreviews);
    setBatchAnalysis(null);
    setTracks([]);
  };

  const removeBatchImage = (index) => {
    const updated = uploadedImages.filter((_, i) => i !== index);
    setUploadedImages(updated);
    if (updated.length === 0) {
      setBatchAnalysis(null);
      setTracks([]);
    }
  };

  const clearBatchImages = () => {
    setUploadedImages([]);
    setBatchAnalysis(null);
    setTracks([]);
    if (batchInputRef.current) {
      batchInputRef.current.value = '';
    }
  };

  /**
   * Analyze Multiple Images with Aggregate AI Detection
   * ====================================================
   * Sends all images to /api/music/suggest-from-images endpoint
   * which uses confidence-weighted voting to determine event type
   */
  const analyzeBatchAndGetSuggestions = async () => {
    if (uploadedImages.length === 0) return;

    setBatchAnalyzing(true);
    setTracks([]);

    try {
      // Create FormData with all images
      const formData = new FormData();
      uploadedImages.forEach(img => {
        formData.append('images', img.file);
      });

      // Call the multi-image aggregate endpoint
      const response = await fetch(`${API_BASE}/api/music/suggest-from-images`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        // Set aggregate analysis results
        setBatchAnalysis({
          total_images: data.analysis.total_images_uploaded,
          analyzed_count: data.analysis.successfully_analyzed,
          aggregate_event: data.analysis.aggregate_event_type,
          aggregate_confidence: data.analysis.aggregate_confidence,
          confidence_percentage: data.analysis.confidence_percentage,
          all_event_votes: data.analysis.all_event_votes,
          individual_predictions: data.analysis.individual_predictions
        });
        
        // Set music suggestions
        if (data.music_suggestions && data.music_suggestions.tracks) {
          setTracks(data.music_suggestions.tracks.map(track => ({
            id: track.id,
            title: track.title,
            artist: track.artist,
            imageUrl: track.imageUrl,
            previewUrl: track.previewUrl,
            spotifyUrl: track.spotifyUrl,
            duration: track.duration || '3:30'
          })));
        }
      } else {
        console.error('Batch analysis failed:', data.error);
        setBatchAnalysis({ error: data.detail || data.error || 'Analysis failed' });
      }
    } catch (error) {
      console.error('Error in batch analysis:', error);
      setBatchAnalysis({ error: 'Failed to connect to AI service. Make sure the backend is running.' });
    } finally {
      setBatchAnalyzing(false);
    }
  };

  // ==================== AI Analysis & Suggestions ====================

  /**
   * CLIP-Based Event & Mood Detection
   * =================================
   * Uses the new /api/ai/detect-event-mood endpoint which leverages
   * CLIP (Contrastive Language-Image Pre-training) for zero-shot classification.
   * 
   * For VIDEOS:
   * - Backend extracts frames using ffmpeg
   * - Analyzes multiple frames
   * - Aggregates predictions for final result
   * 
   * For IMAGES:
   * - Direct CLIP analysis with event and mood prompts
   * - Returns confidence scores for all categories
   */
  const analyzeAndGetSuggestions = async () => {
    if (!uploadedFile) return;

    setAnalyzing(true);
    setTracks([]);

    try {
      // Create FormData for file upload (works for both image and video)
      const formData = new FormData();
      formData.append('file', uploadedFile);

      // Call the new CLIP-based AI detection endpoint
      const response = await fetch(`${API_BASE}/api/ai/detect-event-mood`, {
        method: 'POST',
        body: formData  // No Content-Type header - browser sets it with boundary
      });

      const data = await response.json();

      // Check if image was rejected as not a valid event
      if (data.is_valid_event === false) {
        setAnalysis({
          error: data.rejection_reason || "This doesn't appear to be an event photo.",
          is_not_event: true,
          not_event_score: data.not_event_score,
          all_event_scores: data.all_event_scores
        });
        return;
      }

      if (data.success) {
        // Set analysis results with CLIP detection
        setAnalysis({
          detected_event: data.detected_event,
          event_confidence: Math.round(data.event_confidence * 100),
          event_label: data.event_label,
          detected_mood: data.detected_mood,
          mood_confidence: Math.round(data.mood_confidence * 100),
          mood_label: data.mood_label,
          all_event_scores: data.all_event_scores,
          all_mood_scores: data.all_mood_scores,
          not_event_score: data.not_event_score,
          file_type: fileType
        });
        
        // Set music suggestions if provided
        if (data.music_suggestions && data.music_suggestions.length > 0) {
          setTracks(data.music_suggestions.map(track => ({
            id: track.id,
            title: track.name,
            artist: track.artist,
            imageUrl: track.image,
            previewUrl: track.preview_url,
            spotifyUrl: track.spotify_url,
            duration: '3:30' // Default duration
          })));
        } else {
          // Fallback: Fetch tracks using detected event type
          await fetchTracksForEvent(data.detected_event);
        }
      } else {
        console.error('AI detection failed:', data.error);
        setAnalysis({ error: data.error || 'Analysis failed' });
      }
    } catch (error) {
      console.error('Error in AI detection:', error);
      setAnalysis({ error: 'Failed to connect to AI service. Make sure the backend is running.' });
    } finally {
      setAnalyzing(false);
    }
  };

  // ==================== Browse Mode Handlers ====================

  const fetchTracksForEvent = async (eventId) => {
    setLoading(true);
    setShowAll(false);
    try {
      const response = await fetch(
        `${API_BASE}/api/music/suggestions?eventType=${eventId}&limit=15`
      );
      const data = await response.json();
      
      if (data.success && data.tracks) {
        setTracks(data.tracks);
      } else {
        setTracks([]);
      }
    } catch (error) {
      console.error('Error fetching tracks:', error);
      setTracks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleEventClick = (eventId) => {
    setSelectedEvent(eventId);
    setSearchQuery('');
    fetchTracksForEvent(eventId);
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    setShowAll(false);
    try {
      const response = await fetch(
        `${API_BASE}/api/music/suggestions?search=${encodeURIComponent(searchQuery)}&limit=15`
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

  // ==================== Audio Player Handlers ====================

  const playTrack = (track) => {
    if (!track.previewUrl) {
      setSelectedTrackForPlayer(track);
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
      audio.onended = () => setPlayingTrack(null);
      audio.play();
      audioRef.current = audio;
      setPlayingTrack(track);
    }
  };

  // ==================== Save/Bookmark Handlers ====================

  const toggleSave = (track) => {
    const isSavedTrack = savedTracks.some(t => t.id === track.id);
    let updated;
    
    if (isSavedTrack) {
      updated = savedTracks.filter(t => t.id !== track.id);
    } else {
      updated = [...savedTracks, track];
    }
    
    setSavedTracks(updated);
    localStorage.setItem('savedTracks', JSON.stringify(updated));
  };

  const isSaved = (trackId) => savedTracks.some(t => t.id === trackId);

  // ==================== Track List Render Function ====================
  const renderTrackList = () => {
    const isLoadingState = mode === 'browse' ? loading : (mode === 'batch' ? batchAnalyzing : analyzing);
    const hasResults = tracks.length > 0;
    const selectedEventData = events.find(e => e.id === selectedEvent);
    
    let title = 'Recommended Music';
    if (mode === 'smart' && analysis) {
      title = `${analysis.event_label || 'Recommended'} Music`;
    } else if (mode === 'batch' && batchAnalysis && !batchAnalysis.error) {
      title = `${batchAnalysis.aggregate_event.charAt(0).toUpperCase() + batchAnalysis.aggregate_event.slice(1)} Music (${batchAnalysis.confidence_percentage})`;
    } else if (mode === 'browse') {
      title = searchQuery ? `Results for "${searchQuery}"` : `${selectedEventData?.name || 'Select Event'} Music`;
    }

    return (
      <div>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div className="d-flex align-items-center gap-2">
            <Sparkles size={20} style={{ color: '#667eea' }} />
            <h5 className="fw-bold mb-0" style={{ color: '#1a1a1a' }}>{title}</h5>
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
        {isLoadingState && (
          <div className="text-center py-5">
            <div className="spinner-border" style={{ color: mode === 'batch' ? '#f5576c' : '#667eea' }} role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-3 text-muted">
              {mode === 'smart' 
                ? (fileType === 'video' 
                    ? 'AI is extracting frames and analyzing your video...' 
                    : 'AI is analyzing your image with CLIP...') 
                : mode === 'batch'
                  ? `AI is analyzing ${uploadedImages.length} images with confidence-weighted voting...`
                  : 'Discovering music...'}
            </p>
          </div>
        )}

        {/* Empty State */}
        {!isLoadingState && !hasResults && (
          <div className="text-center py-5" style={{ 
            background: 'white',
            borderRadius: '16px',
            padding: '3rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
          }}>
            {mode === 'smart' ? (
              <>
                <div className="d-flex justify-content-center gap-3 mb-3">
                  <Image size={40} className="text-muted" />
                  <FileVideo size={40} className="text-muted" />
                </div>
                <p className="text-muted mb-0">
                  Upload a photo or video to get AI-powered music suggestions
                </p>
                <small className="text-muted d-block mt-2">
                  Supports: JPG, PNG, MP4, MOV
                </small>
              </>
            ) : mode === 'batch' ? (
              <>
                <div className="d-flex justify-content-center gap-3 mb-3">
                  <ImageIcon size={40} className="text-muted" />
                  <Sparkles size={40} className="text-muted" />
                </div>
                <p className="text-muted mb-0">
                  Upload 5-10 event photos for best accuracy
                </p>
                <small className="text-muted d-block mt-2">
                  More images provide better event detection!
                </small>
              </>
            ) : (
              <>
                <Music size={48} className="text-muted mb-3" />
                <p className="text-muted mb-0">
                  {searchQuery ? 'No results found. Try a different search.' : 'Select an event or search to discover music.'}
                </p>
              </>
            )}
          </div>
        )}

        {/* Track List */}
        {!isLoadingState && hasResults && (
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '1.5rem',
            boxShadow: '0 2px 12px rgba(0,0,0,0.08)'
          }}>
            {tracks.slice(0, showAll ? 15 : 5).map((track, index) => (
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
                  borderBottom: index < (showAll ? Math.min(tracks.length, 15) : Math.min(tracks.length, 5)) - 1 ? '1px solid #f0f0f0' : 'none'
                }}
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
                      width: '56px',
                      height: '56px',
                      borderRadius: '8px',
                      objectFit: 'cover'
                    }}
                  />
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
                <div style={{ fontSize: '0.85rem', color: '#6c757d', flexShrink: 0 }}>
                  {track.duration}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
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
                      justifyContent: 'center'
                    }}
                    title={track.previewUrl ? 'Play 30s preview' : 'Listen on Spotify'}
                  >
                    {playingTrack?.id === track.id ? <Pause size={18} /> : <Play size={18} style={{ marginLeft: '2px' }} />}
                  </button>

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
                      justifyContent: 'center'
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
                      justifyContent: 'center'
                    }}
                    title={isSaved(track.id) ? 'Remove from saved' : 'Save track'}
                  >
                    <Heart size={18} fill={isSaved(track.id) ? 'currentColor' : 'none'} />
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
                    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
                  }}
                >
                  {showAll ? '← Show Less' : `Show More (${Math.min(tracks.length, 15) - 5} more) →`}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Footer Badge */}
        {hasResults && (
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
              {mode === 'smart' ? '✨ AI-Powered • ' : ''}🎵 Powered by Spotify • Curated by BookYourShoot
            </span>
          </div>
        )}
      </div>
    );
  };

  // ==================== UI Components ====================
  const selectedEventData = events.find(e => e.id === selectedEvent);

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 50%, #e2e8f0 100%)',
      paddingBottom: '4rem'
    }}>
      <div className="container py-4" style={{ maxWidth: '1400px' }}>
        {/* Header */}
        <div className="mb-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h1 className="fw-bold mb-1" style={{ fontSize: '2rem', color: '#1a1a1a' }}>
                <Sparkles className="me-2" style={{ color: '#667eea' }} size={28} />
                Smart Music Discovery
              </h1>
              <p className="text-muted mb-0">AI-powered song recommendations for your moments</p>
            </div>
            <Link to="/client/dashboard" className="btn btn-outline-secondary">
              ← Back
            </Link>
          </div>

          {/* Mode Toggle */}
          <div className="d-flex gap-2 mb-4 flex-wrap">
            <button
              onClick={() => { setMode('smart'); setTracks([]); setSelectedEvent(null); clearBatchImages(); }}
              className={`btn ${mode === 'smart' ? 'btn-primary' : 'btn-outline-secondary'}`}
              style={{
                padding: '0.75rem 1.5rem',
                borderRadius: '12px',
                fontWeight: '600',
                transition: 'all 0.3s ease'
              }}
            >
              <Wand2 size={18} className="me-2" />
              Smart Detection
            </button>
            <button
              onClick={() => { setMode('batch'); setTracks([]); setSelectedEvent(null); clearFile(); }}
              className={`btn ${mode === 'batch' ? 'btn-primary' : 'btn-outline-secondary'}`}
              style={{
                padding: '0.75rem 1.5rem',
                borderRadius: '12px',
                fontWeight: '600',
                transition: 'all 0.3s ease'
              }}
            >
              <ImageIcon size={18} className="me-2" />
              Multiple Images <span className="badge bg-success ms-1" style={{fontSize: '0.7rem'}}>Better</span>
            </button>
            <button
              onClick={() => { setMode('browse'); setTracks([]); clearFile(); clearBatchImages(); setSelectedEvent(null); }}
              className={`btn ${mode === 'browse' ? 'btn-primary' : 'btn-outline-secondary'}`}
              style={{
                padding: '0.75rem 1.5rem',
                borderRadius: '12px',
                fontWeight: '600',
                transition: 'all 0.3s ease'
              }}
            >
              <Music size={18} className="me-2" />
              Browse Events
            </button>
          </div>
        </div>

        {/* ==================== SMART MODE (AI) ==================== */}
        {mode === 'smart' && (
          <div className="row g-4">
            {/* Left Column - Upload & Analysis */}
            <div className="col-lg-5">
              {/* Upload Card */}
              <div style={{
                background: '#fff',
                borderRadius: '20px',
                padding: '2rem',
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                marginBottom: '1.5rem'
              }}>
                <h5 className="fw-bold mb-3" style={{ color: '#1a1a1a' }}>
                  <Camera className="me-2" style={{ color: '#0d6efd' }} size={20} />
                  Upload Photo or Video
                </h5>
                <p className="text-muted mb-3" style={{ fontSize: '0.9rem' }}>
                  Upload a photo or video from your event and get instant music suggestions
                  perfectly matched to your event type (Mehndi, Barat, Walima, etc.).
                </p>

                {!filePreview ? (
                  <div
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      border: `2px dashed ${dragActive ? '#0d6efd' : '#dee2e6'}`,
                      borderRadius: '16px',
                      padding: '3rem 2rem',
                      textAlign: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      background: dragActive ? 'rgba(13, 110, 253, 0.05)' : '#f8f9fa'
                    }}
                  >
                    <div className="d-flex justify-content-center gap-3 mb-3">
                      <Upload 
                        size={40} 
                        style={{ color: dragActive ? '#0d6efd' : '#6c757d' }} 
                      />
                      <Video 
                        size={40} 
                        style={{ color: dragActive ? '#0d6efd' : '#6c757d' }} 
                      />
                    </div>
                    <p style={{ fontWeight: '600', color: '#1a1a1a', marginBottom: '0.5rem' }}>
                      Drop your image or video here
                    </p>
                    <p className="text-muted mb-3" style={{ fontSize: '0.85rem' }}>
                      Supports: JPG, PNG, MP4, MOV
                    </p>
                    <span style={{
                      display: 'inline-block',
                      padding: '0.5rem 1.5rem',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: '#fff',
                      borderRadius: '8px',
                      fontSize: '0.9rem',
                      fontWeight: '500'
                    }}>
                      Select File
                    </span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,video/*"
                      onChange={handleFileInput}
                      style={{ display: 'none' }}
                    />
                  </div>
                ) : (
                  <div>
                    {/* File Preview - Image or Video */}
                    <div style={{ 
                      position: 'relative', 
                      marginBottom: '1rem',
                      background: '#f0f0f0',
                      borderRadius: '12px',
                      overflow: 'hidden'
                    }}>
                      {fileType === 'image' ? (
                        <img
                          src={filePreview}
                          alt="Uploaded preview"
                          style={{
                            width: '100%',
                            borderRadius: '12px',
                            maxHeight: '400px',
                            objectFit: 'contain',
                            display: 'block'
                          }}
                        />
                      ) : (
                        <video
                          ref={videoRef}
                          src={filePreview}
                          controls
                          style={{
                            width: '100%',
                            borderRadius: '12px',
                            maxHeight: '400px',
                            objectFit: 'contain',
                            display: 'block',
                            background: '#000'
                          }}
                        />
                      )}}
                      <button
                        onClick={clearFile}
                        style={{
                          position: 'absolute',
                          top: '10px',
                          right: '10px',
                          background: 'rgba(0,0,0,0.6)',
                          border: 'none',
                          borderRadius: '50%',
                          width: '36px',
                          height: '36px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          zIndex: 10
                        }}
                      >
                        <X size={18} color="#fff" />
                      </button>
                      {/* File type badge */}
                      <span style={{
                        position: 'absolute',
                        bottom: '10px',
                        left: '10px',
                        background: 'rgba(0,0,0,0.6)',
                        color: '#fff',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '20px',
                        fontSize: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}>
                        {fileType === 'image' ? <Image size={12} /> : <Video size={12} />}
                        {fileType === 'image' ? 'Image' : 'Video'}
                      </span>
                    </div>

                    {/* Analyze Button */}
                    <button
                      onClick={analyzeAndGetSuggestions}
                      disabled={analyzing}
                      style={{
                        width: '100%',
                        padding: '1rem',
                        background: analyzing 
                          ? '#e2e8f0'
                          : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: analyzing ? '#64748b' : '#fff',
                        border: 'none',
                        borderRadius: '12px',
                        fontSize: '1rem',
                        fontWeight: '600',
                        cursor: analyzing ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        boxShadow: analyzing ? 'none' : '0 4px 15px rgba(102, 126, 234, 0.4)'
                      }}
                    >
                      {analyzing ? (
                        <>
                          <Loader2 size={20} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                          Analyzing with AI...
                        </>
                      ) : (
                        <>
                          <Wand2 size={20} />
                          Analyze & Get Music
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Analysis Results Card - Enhanced for CLIP Detection */}
              {analysis && !analysis.error && (
                <div style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  borderRadius: '20px',
                  padding: '1.5rem',
                  color: '#fff',
                  boxShadow: '0 8px 30px rgba(102, 126, 234, 0.3)'
                }}>
                  <div className="d-flex align-items-center gap-2 mb-3">
                    <CheckCircle2 size={24} />
                    <h5 className="fw-bold mb-0">CLIP AI Detection Results</h5>
                    {analysis.file_type === 'video' && (
                      <span style={{
                        background: 'rgba(255,255,255,0.2)',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.7rem'
                      }}>
                        <Video size={10} /> Video Analysis
                      </span>
                    )}
                  </div>

                  {/* Event Detection */}
                  <div style={{
                    background: 'rgba(255,255,255,0.15)',
                    borderRadius: '12px',
                    padding: '1rem',
                    marginBottom: '1rem'
                  }}>
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span style={{ opacity: 0.9, fontSize: '0.85rem' }}>Detected Event</span>
                      <span style={{ fontWeight: '700', fontSize: '1.1rem' }}>
                        {analysis.event_label || analysis.detected_event}
                      </span>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                      <div style={{
                        flex: 1,
                        height: '8px',
                        background: 'rgba(255,255,255,0.3)',
                        borderRadius: '4px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          width: `${analysis.event_confidence || 0}%`,
                          height: '100%',
                          background: '#fff',
                          borderRadius: '4px',
                          transition: 'width 0.5s ease'
                        }} />
                      </div>
                      <span style={{ fontWeight: '600', minWidth: '45px', textAlign: 'right' }}>
                        {analysis.event_confidence || 0}%
                      </span>
                    </div>
                  </div>

                  {/* Mood Detection */}
                  <div style={{
                    background: 'rgba(255,255,255,0.15)',
                    borderRadius: '12px',
                    padding: '1rem',
                    marginBottom: '1rem'
                  }}>
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span style={{ opacity: 0.9, fontSize: '0.85rem' }}>Detected Mood</span>
                      <span style={{ fontWeight: '700', fontSize: '1.1rem' }}>
                        {analysis.mood_label || analysis.detected_mood}
                      </span>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                      <div style={{
                        flex: 1,
                        height: '8px',
                        background: 'rgba(255,255,255,0.3)',
                        borderRadius: '4px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          width: `${analysis.mood_confidence || 0}%`,
                          height: '100%',
                          background: '#fff',
                          borderRadius: '4px',
                          transition: 'width 0.5s ease'
                        }} />
                      </div>
                      <span style={{ fontWeight: '600', minWidth: '45px', textAlign: 'right' }}>
                        {analysis.mood_confidence || 0}%
                      </span>
                    </div>
                  </div>

                  {/* All Scores (Expandable) */}
                  {analysis.all_event_scores && (
                    <details style={{ marginTop: '0.5rem' }}>
                      <summary style={{ 
                        cursor: 'pointer', 
                        opacity: 0.9, 
                        fontSize: '0.85rem',
                        marginBottom: '0.5rem'
                      }}>
                        View all detection scores
                      </summary>
                      <div style={{
                        background: 'rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        padding: '0.75rem',
                        fontSize: '0.8rem'
                      }}>
                        <div style={{ marginBottom: '0.5rem', fontWeight: '600' }}>Event Scores:</div>
                        {Object.entries(analysis.all_event_scores).map(([event, score]) => (
                          <div key={event} className="d-flex justify-content-between mb-1">
                            <span style={{ textTransform: 'capitalize' }}>{event}</span>
                            <span>{Math.round(score * 100)}%</span>
                          </div>
                        ))}
                        {analysis.all_mood_scores && (
                          <>
                            <div style={{ marginTop: '0.75rem', marginBottom: '0.5rem', fontWeight: '600' }}>Mood Scores:</div>
                            {Object.entries(analysis.all_mood_scores).map(([mood, score]) => (
                              <div key={mood} className="d-flex justify-content-between mb-1">
                                <span style={{ textTransform: 'capitalize' }}>{mood}</span>
                                <span>{Math.round(score * 100)}%</span>
                              </div>
                            ))}
                          </>
                        )}
                      </div>
                    </details>
                  )}

                  {/* AI Method Badge */}
                  <div style={{
                    marginTop: '1rem',
                    padding: '0.75rem',
                    background: 'rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <Sparkles size={14} />
                    <span>Powered by CLIP Zero-Shot Classification</span>
                  </div>
                </div>
              )}

              {/* Not an Event Warning - Special case for random images */}
              {analysis && analysis.is_not_event && (
                <div style={{
                  background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                  border: '2px solid #f59e0b',
                  borderRadius: '16px',
                  padding: '1.5rem',
                  color: '#92400e'
                }}>
                  <div className="d-flex align-items-center gap-2 mb-3">
                    <AlertCircle size={24} />
                    <h5 className="fw-bold mb-0">Not an Event Photo</h5>
                  </div>
                  
                  <p style={{ margin: '0.5rem 0 1rem', fontSize: '0.95rem', lineHeight: '1.5' }}>
                    {analysis.error}
                  </p>
                  
                  <div style={{
                    background: 'rgba(255,255,255,0.6)',
                    borderRadius: '8px',
                    padding: '1rem',
                    marginBottom: '1rem'
                  }}>
                    <p style={{ fontWeight: '600', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                      📸 What works best:
                    </p>
                    <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.85rem' }}>
                      <li>Wedding photos (Mehndi, Barat, Walima)</li>
                      <li>Birthday party celebrations</li>
                      <li>Corporate events and conferences</li>
                      <li>Family gatherings and reunions</li>
                    </ul>
                  </div>
                  
                  <div className="d-flex gap-2">
                    <button
                      onClick={clearFile}
                      style={{
                        padding: '0.75rem 1.25rem',
                        background: '#f59e0b',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}
                    >
                      <Upload size={16} />
                      Upload Different Photo
                    </button>
                    <button
                      onClick={() => { setMode('browse'); clearFile(); }}
                      style={{
                        padding: '0.75rem 1.25rem',
                        background: '#fff',
                        color: '#6c757d',
                        border: '1px solid #dee2e6',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '0.9rem'
                      }}
                    >
                      Browse by Event Instead
                    </button>
                  </div>
                </div>
              )}

              {/* Error State - General errors */}
              {analysis && analysis.error && !analysis.is_not_event && (
                <div style={{
                  background: analysis.error.includes('CLIP') ? '#fef3c7' : '#fef2f2',
                  border: `1px solid ${analysis.error.includes('CLIP') ? '#fcd34d' : '#fecaca'}`,
                  borderRadius: '12px',
                  padding: '1.25rem',
                  color: analysis.error.includes('CLIP') ? '#92400e' : '#dc2626'
                }}>
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <AlertCircle size={20} />
                    <strong>{analysis.error.includes('CLIP') ? 'Model Loading...' : 'Analysis Failed'}</strong>
                  </div>
                  <p style={{ margin: '0.5rem 0', fontSize: '0.9rem' }}>
                    {analysis.error.includes('CLIP') 
                      ? 'The CLIP model is loading for the first time. This may take 30-60 seconds. Please try again.'
                      : analysis.error}
                  </p>
                  <div className="d-flex gap-2 mt-3">
                    <button
                      onClick={analyzeAndGetSuggestions}
                      style={{
                        padding: '0.5rem 1rem',
                        background: analysis.error.includes('CLIP') ? '#f59e0b' : '#dc2626',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}
                    >
                      <RefreshCw size={16} />
                      Try Again
                    </button>
                    <button
                      onClick={() => { setMode('browse'); clearFile(); }}
                      style={{
                        padding: '0.5rem 1rem',
                        background: '#fff',
                        color: '#6c757d',
                        border: '1px solid #dee2e6',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '0.9rem'
                      }}
                    >
                      Use Browse Mode Instead
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Track Results */}
            <div className="col-lg-7">
              {renderTrackList()}
            </div>
          </div>
        )}

        {/* ==================== BATCH MODE (Multi-Image AI) ==================== */}
        {mode === 'batch' && (
          <div className="row g-4">
            {/* Left Column - Multi-Image Upload */}
            <div className="col-lg-5">
              <div style={{
                background: '#fff',
                borderRadius: '20px',
                padding: '2rem',
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                marginBottom: '1.5rem'
              }}>
                <h5 className="fw-bold mb-3" style={{ color: '#1a1a1a' }}>
                  <ImageIcon className="me-2" style={{ color: '#f5576c' }} size={20} />
                  Upload Multiple Event Photos
                </h5>
                <p className="text-muted mb-3" style={{ fontSize: '0.9rem' }}>
                  Upload 5-10 photos from your event for best results. Our system will analyze all images and use 
                  confidence-weighted voting to determine the event type.
                </p>

                {uploadedImages.length === 0 ? (
                  <div
                    onClick={() => batchInputRef.current?.click()}
                    style={{
                      border: '2px dashed #dee2e6',
                      borderRadius: '16px',
                      padding: '3rem 2rem',
                      textAlign: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      background: '#fafafa'
                    }}
                  >
                    <div className="d-flex justify-content-center gap-3 mb-3">
                      <Upload size={40} style={{ color: '#f5576c' }} />
                      <ImageIcon size={40} style={{ color: '#f5576c' }} />
                    </div>
                    <p style={{ fontWeight: '600', color: '#1a1a1a', marginBottom: '0.5rem' }}>
                      Select 2-20 images from your event
                    </p>
                    <p className="text-muted mb-3" style={{ fontSize: '0.85rem' }}>
                      More images = higher accuracy
                    </p>
                    <span style={{
                      display: 'inline-block',
                      padding: '0.5rem 1.5rem',
                      background: '#0d6efd',
                      color: '#fff',
                      borderRadius: '8px',
                      fontSize: '0.9rem',
                      fontWeight: '500'
                    }}>
                      Choose Files
                    </span>
                    <input
                      ref={batchInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleBatchImageInput}
                      style={{ display: 'none' }}
                    />
                  </div>
                ) : (
                  <div>
                    {/* Image Grid Preview */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
                      gap: '0.5rem',
                      marginBottom: '1rem',
                      maxHeight: '400px',
                      overflowY: 'auto',
                      padding: '0.5rem',
                      background: '#f8f9fa',
                      borderRadius: '12px'
                    }}>
                      {uploadedImages.map((img, idx) => (
                        <div key={idx} style={{ position: 'relative' }}>
                          <img
                            src={img.preview}
                            alt={`Preview ${idx + 1}`}
                            style={{
                              width: '100%',
                              height: '80px',
                              objectFit: 'cover',
                              borderRadius: '8px'
                            }}
                          />
                          <button
                            onClick={() => removeBatchImage(idx)}
                            style={{
                              position: 'absolute',
                              top: '4px',
                              right: '4px',
                              width: '20px',
                              height: '20px',
                              borderRadius: '50%',
                              border: 'none',
                              background: 'rgba(255,0,0,0.8)',
                              color: 'white',
                              cursor: 'pointer',
                              fontSize: '12px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: 0
                            }}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Image Count & Actions */}
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <span className="text-muted">
                        {uploadedImages.length} image{uploadedImages.length !== 1 ? 's' : ''} selected
                      </span>
                      <button
                        onClick={clearBatchImages}
                        style={{
                          padding: '0.5rem 1rem',
                          border: '1px solid #dee2e6',
                          background: 'white',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontSize: '0.85rem'
                        }}
                      >
                        Clear All
                      </button>
                    </div>

                    {/* Analyze Button */}
                    <button
                      onClick={analyzeBatchAndGetSuggestions}
                      disabled={batchAnalyzing}
                      style={{
                        width: '100%',
                        padding: '1rem',
                        background: batchAnalyzing 
                          ? '#ccc' 
                          : 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '12px',
                        fontWeight: '600',
                        fontSize: '1rem',
                        cursor: batchAnalyzing ? 'not-allowed' : 'pointer',
                        transition: 'all 0.3s ease',
                        boxShadow: batchAnalyzing ? 'none' : '0 4px 15px rgba(245, 87, 108, 0.3)'
                      }}
                    >
                      {batchAnalyzing ? (
                        <>
                          <Loader2 className="spinner-border spinner-border-sm me-2" size={18} />
                          Analyzing {uploadedImages.length} images...
                        </>
                      ) : (
                        <>
                          <Sparkles className="me-2" size={18} />
                          Analyze & Get Music Suggestions
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Batch Analysis Results */}
              {batchAnalysis && !batchAnalysis.error && (
                <div className="alert alert-success" style={{
                  borderRadius: '20px',
                  padding: '2rem',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
                }}>
                  <div className="d-flex align-items-center gap-2 mb-3">
                    <CheckCircle2 size={24} />
                    <h5 className="fw-bold mb-0">Aggregate Analysis Complete!</h5>
                  </div>

                  {/* Detected Event */}
                  <div style={{
                    background: 'rgba(13, 110, 253, 0.1)',
                    borderRadius: '12px',
                    padding: '1rem',
                    marginBottom: '1rem',
                    border: '1px solid rgba(13, 110, 253, 0.2)'
                  }}>
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="text-muted" style={{ fontSize: '0.85rem' }}>Detected Event</span>
                      <span className="text-primary" style={{ fontWeight: '700', fontSize: '1.2rem', textTransform: 'capitalize' }}>
                        {batchAnalysis.aggregate_event}
                      </span>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                      <div style={{
                        flex: 1,
                        height: '8px',
                        background: 'rgba(13, 110, 253, 0.2)',
                        borderRadius: '4px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          width: `${(batchAnalysis.aggregate_confidence * 100)}%`,
                          height: '100%',
                          background: '#0d6efd',
                          borderRadius: '4px',
                          transition: 'width 0.5s ease'
                        }} />
                      </div>
                      <span className="text-primary" style={{ fontWeight: '600', minWidth: '45px', textAlign: 'right' }}>
                        {batchAnalysis.confidence_percentage}
                      </span>
                    </div>
                  </div>

                  {/* Analysis Stats */}
                  <div className="row g-2 mb-3">
                    <div className="col-6">
                      <div className="card border-0" style={{
                        background: 'rgba(13, 110, 253, 0.1)',
                        borderRadius: '8px',
                        padding: '0.75rem'
                      }}>
                        <div className="text-center">
                          <div className="text-primary" style={{ fontSize: '1.5rem', fontWeight: '700' }}>{batchAnalysis.total_images}</div>
                          <div className="text-muted" style={{ fontSize: '0.75rem' }}>Total Images</div>
                        </div>
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="card border-0" style={{
                        background: 'rgba(25, 135, 84, 0.1)',
                        borderRadius: '8px',
                        padding: '0.75rem'
                      }}>
                        <div className="text-center">
                          <div className="text-success" style={{ fontSize: '1.5rem', fontWeight: '700' }}>{batchAnalysis.analyzed_count}</div>
                          <div className="text-muted" style={{ fontSize: '0.75rem' }}>Successfully Analyzed</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* All Event Votes */}
                  <details style={{ marginTop: '1rem' }}>
                    <summary className="text-primary" style={{ cursor: 'pointer', fontSize: '0.9rem', fontWeight: '500' }}>
                      View detailed breakdown
                    </summary>
                    <div className="mt-3">
                      {Object.entries(batchAnalysis.all_event_votes || {})
                        .sort((a, b) => b[1] - a[1])
                        .map(([event, score]) => (
                          <div key={event} className="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom">
                            <span className="text-capitalize">{event}</span>
                            <span className="badge bg-primary">{(score * 100).toFixed(1)}%</span>
                          </div>
                        ))}
                    </div>
                  </details>
                </div>
              )}

              {/* Error Display */}
              {batchAnalysis?.error && (
                <div style={{
                  background: '#fff3cd',
                  border: '1px solid #ffc107',
                  borderRadius: '12px',
                  padding: '1rem',
                  marginTop: '1rem'
                }}>
                  <div className="d-flex align-items-start gap-2">
                    <AlertCircle size={20} className="text-warning mt-1" />
                    <div>
                      <strong>Analysis Failed</strong>
                      <p className="mb-0 mt-1 text-muted" style={{ fontSize: '0.9rem' }}>
                        {batchAnalysis.error}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Track Results */}
            <div className="col-lg-7">
              {renderTrackList()}
            </div>
          </div>
        )}

        {/* ==================== BROWSE MODE ==================== */}
        {mode === 'browse' && (
          <>
            {/* Search Bar */}
            <form onSubmit={handleSearch} className="mb-4">
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
                  style={{ fontSize: '1rem', border: '1px solid #dee2e6' }}
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

            {/* Event Grid */}
            <div className="mb-4">
              <h5 className="fw-bold mb-3" style={{ color: '#1a1a1a' }}>Browse by Event</h5>
              <div className="row g-3">
                {events.map((event) => (
                  <div key={event.id} className="col">
                    <div
                      onClick={() => handleEventClick(event.id)}
                      style={{
                        background: '#fff',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        border: selectedEvent === event.id ? '2px solid #667eea' : '2px solid transparent',
                        transform: selectedEvent === event.id ? 'translateY(-5px)' : 'translateY(0)',
                        boxShadow: selectedEvent === event.id 
                          ? '0 8px 25px rgba(102, 126, 234, 0.3)'
                          : '0 4px 15px rgba(0, 0, 0, 0.1)'
                      }}
                    >
                      <div style={{ position: 'relative', height: '140px', overflow: 'hidden' }}>
                        <img 
                          src={event.image}
                          alt={event.name}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                          }}
                        />
                        <div style={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          padding: '1rem',
                          background: 'linear-gradient(transparent, rgba(0,0,0,0.7))'
                        }}>
                          <h6 style={{ color: '#fff', margin: 0, fontWeight: '600' }}>
                            {event.emoji} {event.name}
                          </h6>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Track Results */}
            {renderTrackList()}
          </>
        )}
      </div>

      {/* Spotify Embed Modal */}
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h5 style={{ margin: 0, color: '#1a1a1a' }}>Now Playing</h5>
              <button
                onClick={() => setSelectedTrackForPlayer(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: '#6c757d'
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
              title="Spotify Player"
            />
          </div>
        </div>
      )}

      {/* Hidden Audio Player */}
      <audio ref={audioRef} style={{ display: 'none' }} />

      {/* CSS Animation for spinner */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default MusicDiscoveryUI;
