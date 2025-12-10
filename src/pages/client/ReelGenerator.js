import React, { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../supabaseClient';

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
  
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatedVideo, setGeneratedVideo] = useState(null);
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);

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

  // Upload images to Supabase Storage
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
      const userId = user.id;
      const timestamp = Date.now();
      
      for (let i = 0; i < images.length; i++) {
        const file = images[i];
        const fileName = `${userId}/${timestamp}_${i}_${file.name}`;
        const filePath = `reels/inputs/${fileName}`;
        
        // Upload to Supabase
        const { data, error: uploadError } = await supabase.storage
          .from('reels')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });
        
        if (uploadError) {
          throw new Error(`Failed to upload ${file.name}: ${uploadError.message}`);
        }
        
        // Get public URL
        const { data: publicUrlData } = supabase.storage
          .from('reels')
          .getPublicUrl(filePath);
        
        urls.push(publicUrlData.publicUrl);
        
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
          fade_duration: fadeDuration
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to generate reel');
      }
      
      const data = await response.json();
      setGeneratedVideo(data);
      
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
          <h2 className="mb-4">🎬 Reel Generator</h2>
          
          {error && (
            <div className="alert alert-danger alert-dismissible fade show" role="alert">
              {error}
              <button type="button" className="btn-close" onClick={() => setError('')}></button>
            </div>
          )}

          {/* Upload Section */}
          <div className="card mb-4">
            <div className="card-body">
              <h5 className="card-title">1. Upload Images (1-15 photos)</h5>
              
              <div className="mb-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  className="form-control"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  multiple
                  onChange={handleFileSelect}
                  disabled={uploading || generating}
                />
                <small className="form-text text-muted">
                  Supported formats: JPG, PNG, WebP. Maximum 15 images.
                </small>
              </div>
              
              {images.length > 0 && (
                <div className="mb-3">
                  <p className="mb-2">Selected: <strong>{images.length}</strong> images</p>
                  
                  {/* Image previews */}
                  <div className="d-flex flex-wrap gap-2 mb-3">
                    {images.map((img, idx) => (
                      <div key={idx} className="position-relative">
                        <img
                          src={URL.createObjectURL(img)}
                          alt={`Preview ${idx + 1}`}
                          style={{
                            width: '80px',
                            height: '80px',
                            objectFit: 'cover',
                            borderRadius: '8px',
                            border: '2px solid #dee2e6'
                          }}
                        />
                        <span
                          className="position-absolute top-0 start-0 badge bg-primary"
                          style={{ fontSize: '10px' }}
                        >
                          {idx + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                  
                  {uploadedUrls.length === 0 && (
                    <button
                      className="btn btn-primary"
                      onClick={handleUploadImages}
                      disabled={uploading || generating}
                    >
                      {uploading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2"></span>
                          Uploading... {uploadProgress}%
                        </>
                      ) : (
                        'Upload Images to Cloud'
                      )}
                    </button>
                  )}
                  
                  {uploadedUrls.length > 0 && (
                    <div className="alert alert-success mb-0">
                      ✅ {uploadedUrls.length} images uploaded successfully!
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* Configuration Section */}
          {uploadedUrls.length > 0 && (
            <div className="card mb-4">
              <div className="card-body">
                <h5 className="card-title">2. Configure Your Reel</h5>
                
                <div className="row">
                  {/* Intro Text */}
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Intro Text (Optional)</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g., My Amazing Reel"
                      value={introText}
                      onChange={(e) => setIntroText(e.target.value)}
                      maxLength={50}
                      disabled={generating}
                    />
                    <small className="form-text text-muted">
                      Displayed for 2.5 seconds at the start
                    </small>
                  </div>
                  
                  {/* Aspect Ratio */}
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Aspect Ratio</label>
                    <select
                      className="form-select"
                      value={aspectRatio}
                      onChange={(e) => setAspectRatio(e.target.value)}
                      disabled={generating}
                    >
                      <option value="9:16">9:16 (Instagram Reels/Stories)</option>
                      <option value="16:9">16:9 (YouTube/Landscape)</option>
                      <option value="1:1">1:1 (Square)</option>
                    </select>
                  </div>
                  
                  {/* Transition */}
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Transition Effect</label>
                    <select
                      className="form-select"
                      value={transition}
                      onChange={(e) => setTransition(e.target.value)}
                      disabled={generating}
                    >
                      <option value="fade">Fade (Smooth)</option>
                      <option value="none">None (Cut)</option>
                    </select>
                  </div>
                  
                  {/* Duration per image */}
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Duration per Image: {durationPerImage}s</label>
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
                      Total duration: ~{(uploadedUrls.length * durationPerImage).toFixed(1)}s
                    </small>
                  </div>
                  
                  {/* Fade duration (only if fade transition) */}
                  {transition === 'fade' && (
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Fade Duration: {fadeDuration}s</label>
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
                    </div>
                  )}
                </div>
                
                <div className="d-flex gap-2">
                  <button
                    className="btn btn-success"
                    onClick={handleGenerateReel}
                    disabled={generating}
                  >
                    {generating ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Generating Reel... (This may take 30-60s)
                      </>
                    ) : (
                      '🎬 Generate Reel'
                    )}
                  </button>
                  
                  <button
                    className="btn btn-outline-secondary"
                    onClick={handleReset}
                    disabled={uploading || generating}
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* Preview Section */}
          {generatedVideo && (
            <div className="card mb-4">
              <div className="card-body">
                <h5 className="card-title">3. Preview & Download</h5>
                
                <div className="alert alert-success mb-3">
                  ✅ Reel generated successfully!
                  <ul className="mb-0 mt-2">
                    <li>Duration: {generatedVideo.duration?.toFixed(1)}s</li>
                    <li>Images: {generatedVideo.num_images}</li>
                    <li>Aspect Ratio: {generatedVideo.aspect_ratio}</li>
                    {generatedVideo.file_size && (
                      <li>Size: {(generatedVideo.file_size / (1024 * 1024)).toFixed(2)} MB</li>
                    )}
                  </ul>
                </div>
                
                {/* Video Preview */}
                <div className="mb-3">
                  <video
                    controls
                    style={{
                      width: '100%',
                      maxWidth: aspectRatio === '9:16' ? '400px' : '100%',
                      borderRadius: '8px',
                      border: '2px solid #dee2e6'
                    }}
                    src={generatedVideo.video_url}
                  >
                    Your browser does not support the video tag.
                  </video>
                </div>
                
                {/* Download Button */}
                <button
                  className="btn btn-primary"
                  onClick={handleDownload}
                >
                  📥 Download Video
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReelGenerator;
