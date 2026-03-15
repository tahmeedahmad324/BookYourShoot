import React, { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Container, Card, Button, Alert, ProgressBar, Badge } from 'react-bootstrap';

/**
 * REEL MAKER
 * 
 * Simple workflow:
 * 1. Upload 10-30 photos
 * 2. Click "Generate Reel"
 * 3. AI selects best 10 photos (brightness, sharpness, faces, contrast, vibrancy)
 * 4. Auto-generates 30-sec reel with professional editing
 * 5. Download/preview
 */

const ReelGenerator = () => {
  const { user } = useAuth();
  const fileInputRef = useRef(null);

  // State
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('');
  const [generatedReel, setGeneratedReel] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Styles
  const styles = {
    pageContainer: {
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      minHeight: '100vh',
      paddingTop: '2rem',
      paddingBottom: '4rem'
    },
    card: {
      border: 'none',
      borderRadius: '20px',
      boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
      overflow: 'hidden'
    },
    header: {
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      padding: '2rem',
      textAlign: 'center'
    },
    uploadZone: {
      border: '3px dashed #667eea',
      borderRadius: '16px',
      padding: '3rem',
      textAlign: 'center',
      background: '#f8f9ff',
      cursor: 'pointer',
      transition: 'all 0.3s',
      '&:hover': {
        borderColor: '#764ba2',
        background: '#f0f2ff'
      }
    },
    previewGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
      gap: '1rem',
      marginTop: '1.5rem'
    },
    previewCard: {
      position: 'relative',
      borderRadius: '12px',
      overflow: 'hidden',
      aspectRatio: '1',
      border: '2px solid #e0e0e0'
    },
    previewImg: {
      width: '100%',
      height: '100%',
      objectFit: 'cover'
    },
    removeBtn: {
      position: 'absolute',
      top: '6px',
      right: '6px',
      background: '#ef4444',
      color: 'white',
      border: 'none',
      borderRadius: '50%',
      width: '28px',
      height: '28px',
      fontSize: '16px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    },
    generateBtn: {
      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      border: 'none',
      borderRadius: '12px',
      padding: '1rem 3rem',
      fontSize: '1.2rem',
      fontWeight: '600',
      boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)',
      transition: 'all 0.3s'
    },
    resultCard: {
      background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
      border: '2px solid #10b981',
      borderRadius: '16px',
      padding: '2rem'
    }
  };

  // Handle file selection
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);

    if (files.length < 10) {
      setError('⚠️ Please select at least 10 photos (AI will pick the best 10)');
      return;
    }

    if (files.length > 30) {
      setError('⚠️ Maximum 30 photos allowed');
      return;
    }

    // Validate file types
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    const invalidFiles = files.filter(f => !validTypes.includes(f.type));

    if (invalidFiles.length > 0) {
      setError('⚠️ Only JPG and PNG images are allowed');
      return;
    }

    setError('');
    setSuccess('');
    setGeneratedReel(null);
    setSelectedFiles(files);

    // Generate previews
    const previewPromises = files.map((file) => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          resolve({ url: e.target.result, name: file.name });
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(previewPromises).then((loadedPreviews) => {
      setPreviews(loadedPreviews);
    });
  };

  // Remove photo
  const handleRemovePhoto = (index) => {
    const newFiles = selectedFiles.filter((_, idx) => idx !== index);
    const newPreviews = previews.filter((_, idx) => idx !== index);
    setSelectedFiles(newFiles);
    setPreviews(newPreviews);

    if (newFiles.length < 10) {
      setError('⚠️ Please select at least 10 photos');
    }
  };

  // Generate reel (AUTO)
  const handleGenerateReel = async () => {
    if (selectedFiles.length < 10) {
      setError('⚠️ Please select at least 10 photos');
      return;
    }

    setGenerating(true);
    setError('');
    setSuccess('');
    setProgress(0);
    setProgressText('🔄 Starting reel generation...');

    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) {
        throw new Error('Please login to generate reels');
      }

      // Realistic progress simulation for video generation
      const updateProgress = async (percent, text, delay = 2000) => {
        setProgress(percent);
        setProgressText(text);
        await new Promise(resolve => setTimeout(resolve, delay));
      };

      await updateProgress(5, '📤 Uploading photos...', 1000);

      // Create FormData
      const formData = new FormData();
      selectedFiles.forEach((file, index) => {
        formData.append('files', file);
        console.log(`Adding file ${index + 1}: ${file.name}`);
      });
      formData.append('ratio', '9:16'); // Instagram Reels format
      formData.append('filter_type', 'vibrant'); // Auto-apply vibrant filter

      await updateProgress(15, '🤖 AI analyzing photo quality...', 2000);

      // Call AUTO-GENERATE endpoint
      const response = await fetch('http://localhost:8000/api/reels/generate-auto', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        let errorMsg = `Server error: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMsg = errorData.detail || errorMsg;
        } catch {
          // If can't parse JSON, use status text
          errorMsg = response.statusText || errorMsg;
        }
        throw new Error(errorMsg);
      }

      await updateProgress(35, '✨ Selecting best highlights...', 3000);
      await updateProgress(55, '🎨 Applying filters and effects...', 4000);
      await updateProgress(75, '🎭 Creating smooth transitions...', 5000);
      await updateProgress(90, '🎬 Rendering final video...', 6000);

      const data = await response.json();
      console.log('Reel generation response:', data);

      setProgress(100);
      setProgressText('✅ Reel ready!');
      setGeneratedReel(data);
      setSuccess(`🎉 Your 30-second reel is ready! AI selected the ${data.num_images_selected} best photos from ${data.num_images_uploaded} uploads.`);

    } catch (err) {
      console.error('Generation error:', err);
      let errorMessage = err.message;
      
      // Friendly error messages
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
        errorMessage = 'Cannot connect to server. Please check if the backend is running.';
      } else if (errorMessage.includes('404')) {
        errorMessage = 'Reel generation service not found. Please check server configuration.';
      } else if (errorMessage.includes('503')) {
        errorMessage = 'Video generation service unavailable. Please install required dependencies.';
      }
      
      setError(`❌ Error: ${errorMessage}`);
      setProgress(0);
      setProgressText('');
    } finally {
      setGenerating(false);
    }
  };

  // Download video
  // Download video
  const handleDownload = () => {
    if (generatedReel?.video_url) {
      // Add download=true query parameter
      window.location.href = `http://localhost:8000${generatedReel.video_url}?download=true`;
    }
  };

  // View/Preview video  
  const handleView = () => {
    if (generatedReel?.video_url) {
      // Open without download parameter for inline preview
      window.open(`http://localhost:8000${generatedReel.video_url}`, '_blank');
    }
  };

  // Reset
  const handleReset = () => {
    setSelectedFiles([]);
    setPreviews([]);
    setGeneratedReel(null);
    setError('');
    setSuccess('');
    setProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div style={styles.pageContainer}>
      <Container>
        {/* Header */}
        <Card style={styles.card} className="mb-4">
          <div style={styles.header}>
            <h1 className="mb-2">🎬 Reel Maker</h1>
            <p className="mb-0">Upload photos → AI creates professional reel → Download</p>
          </div>
        </Card>

        {/* Main Content */}
        <Card style={styles.card}>
          <Card.Body className="p-4">
            {/* Alerts */}
            {error && (
              <Alert variant="danger" onClose={() => setError('')} dismissible>
                {error}
              </Alert>
            )}
            {success && (
              <Alert variant="success" onClose={() => setSuccess('')} dismissible>
                {success}
              </Alert>
            )}

            {/* Upload Section */}
            {!generatedReel && (
              <>
                <div className="mb-4">
                  <h4 className="fw-bold mb-3">📸 Step 1: Upload Your Photos</h4>
                  <p className="text-muted mb-3">
                    Upload 10-30 event photos. AI will analyze quality and select exactly 10 best highlights for your 30-second reel.
                  </p>

                  {/* Upload Zone */}
                  <div
                    style={styles.uploadZone}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📁</div>
                    <h5 className="fw-semibold mb-2">Click to Upload Photos</h5>
                    <p className="text-muted mb-0">10-30 photos • JPG or PNG</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/jpeg,image/jpg,image/png"
                      onChange={handleFileSelect}
                      style={{ display: 'none' }}
                    />
                  </div>

                  {/* Photo Count */}
                  {selectedFiles.length > 0 && (
                    <div className="mt-3 text-center">
                      <Badge bg={selectedFiles.length >= 10 ? 'success' : 'warning'} style={{ fontSize: '1rem', padding: '0.5rem 1rem' }}>
                        {selectedFiles.length} photos selected
                        {selectedFiles.length < 10 && ' (need at least 10)'}
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Preview Grid */}
                {previews.length > 0 && (
                  <div className="mb-4">
                    <h5 className="fw-semibold mb-3">Your Photos</h5>
                    <div style={styles.previewGrid}>
                      {previews.map((preview, index) => (
                        <div key={index} style={styles.previewCard}>
                          <img src={preview.url} alt={`Preview ${index + 1}`} style={styles.previewImg} />
                          <button
                            style={styles.removeBtn}
                            onClick={() => handleRemovePhoto(index)}
                            title="Remove photo"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Generate Button */}
                {selectedFiles.length >= 10 && (
                  <div className="text-center mt-4">
                    <Button
                      style={styles.generateBtn}
                      size="lg"
                      onClick={handleGenerateReel}
                      disabled={generating}
                    >
                      {generating ? (
                        <>🔄 Creating Reel...</>
                      ) : (
                        <>✨ Generate Reel (30 sec)</>
                      )}
                    </Button>
                    <p className="text-muted mt-2 small">
                      AI will select exactly 10 best photos for your 30-second reel based on quality, brightness, sharpness, faces & composition
                    </p>
                  </div>
                )}

                {/* Progress - Realistic Reel Generation */}
                {generating && (
                  <div className="mt-4 p-4" style={{ 
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
                    borderRadius: '16px', 
                    color: 'white' 
                  }}>
                    <div className="text-center mb-3">
                      <h5 className="fw-bold mb-1">🎬 Creating Your Reel</h5>
                      <p className="mb-0 opacity-75">This takes 30-60 seconds for professional quality</p>
                    </div>
                    <div className="mb-3">
                      <span className="fw-semibold d-block mb-2">{progressText}</span>
                      <ProgressBar 
                        now={progress} 
                        variant="light" 
                        style={{ 
                          height: '16px', 
                          borderRadius: '10px',
                          background: 'rgba(255,255,255,0.2)'
                        }}
                      />
                      <div className="d-flex justify-content-between mt-2 small opacity-75">
                        <span>0%</span>
                        <span>{Math.round(progress)}%</span>
                        <span>100%</span>
                      </div>
                    </div>
                    <div className="text-center small opacity-75">
                      ⏱️ AI is analyzing quality, applying effects, and rendering video...
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Result Section */}
            {generatedReel && (
              <div style={styles.resultCard}>
                <div className="text-center mb-4">
                  <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎉</div>
                  <h3 className="fw-bold mb-2">Your Reel is Ready!</h3>
                  <p className="text-muted">AI-generated 30-second highlight reel</p>
                </div>

                {/* Stats */}
                <div className="row g-3 mb-4">
                  <div className="col-md-4">
                    <div className="text-center p-3" style={{ background: 'white', borderRadius: '12px' }}>
                      <h4 className="fw-bold mb-1" style={{ color: '#667eea' }}>
                        {generatedReel.num_images_uploaded}
                      </h4>
                      <p className="mb-0 text-muted small">Photos Uploaded</p>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="text-center p-3" style={{ background: 'white', borderRadius: '12px' }}>
                      <h4 className="fw-bold mb-1" style={{ color: '#10b981' }}>
                        {generatedReel.num_images_selected}
                      </h4>
                      <p className="mb-0 text-muted small">Best Selected</p>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="text-center p-3" style={{ background: 'white', borderRadius: '12px' }}>
                      <h4 className="fw-bold mb-1" style={{ color: '#f59e0b' }}>
                        {generatedReel.duration?.toFixed(1)}s
                      </h4>
                      <p className="mb-0 text-muted small">Duration</p>
                    </div>
                  </div>
                </div>

                {/* Quality Summary */}
                {generatedReel.quality_summary && (
                  <div className="mb-4 p-3" style={{ background: 'white', borderRadius: '12px' }}>
                    <h5 className="fw-semibold mb-3">📊 Quality Analysis</h5>
                    <div className="row g-2">
                      <div className="col-6">
                        <small className="text-muted">Average Quality:</small>
                        <div className="fw-bold text-success">
                          {generatedReel.quality_summary.average_quality?.toFixed(1)}/100
                        </div>
                      </div>
                      <div className="col-6">
                        <small className="text-muted">Photos with Faces:</small>
                        <div className="fw-bold text-primary">
                          {generatedReel.quality_summary.photos_with_faces}
                        </div>
                      </div>
                      <div className="col-6">
                        <small className="text-muted">Avg Sharpness:</small>
                        <div className="fw-bold">
                          {generatedReel.quality_summary.avg_sharpness?.toFixed(1)}/100
                        </div>
                      </div>
                      <div className="col-6">
                        <small className="text-muted">Avg Brightness:</small>
                        <div className="fw-bold">
                          {generatedReel.quality_summary.avg_brightness?.toFixed(1)}/100
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="d-flex gap-3 justify-content-center">
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={handleView}
                    style={{ borderRadius: '12px', padding: '0.75rem 2rem' }}
                  >
                    👁️ View Reel
                  </Button>
                  <Button
                    variant="success"
                    size="lg"
                    onClick={handleDownload}
                    style={{ borderRadius: '12px', padding: '0.75rem 2rem' }}
                  >
                    📥 Download Reel
                  </Button>
                  <Button
                    variant="outline-secondary"
                    size="lg"
                    onClick={handleReset}
                    style={{ borderRadius: '12px', padding: '0.75rem 2rem' }}
                  >
                    🔄 Create Another
                  </Button>
                </div>
              </div>
            )}
          </Card.Body>
        </Card>

        {/* Info Card */}
        <Card style={styles.card} className="mt-4">
          <Card.Body className="p-4">
            <h5 className="fw-bold mb-3">🤖 How AI Selects Photos</h5>
            <div className="row g-3">
              <div className="col-md-4">
                <div className="d-flex align-items-start">
                  <div style={{ fontSize: '2rem', marginRight: '1rem' }}>✨</div>
                  <div>
                    <h6 className="fw-semibold mb-1">Sharpness</h6>
                    <small className="text-muted">Detects blur using Laplacian variance</small>
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="d-flex align-items-start">
                  <div style={{ fontSize: '2rem', marginRight: '1rem' }}>💡</div>
                  <div>
                    <h6 className="fw-semibold mb-1">Lighting</h6>
                    <small className="text-muted">Optimal brightness & contrast analysis</small>
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="d-flex align-items-start">
                  <div style={{ fontSize: '2rem', marginRight: '1rem' }}>👤</div>
                  <div>
                    <h6 className="fw-semibold mb-1">Faces</h6>
                    <small className="text-muted">Photos with people score higher</small>
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="d-flex align-items-start">
                  <div style={{ fontSize: '2rem', marginRight: '1rem' }}>🎨</div>
                  <div>
                    <h6 className="fw-semibold mb-1">Vibrancy</h6>
                    <small className="text-muted">Color saturation & richness</small>
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="d-flex align-items-start">
                  <div style={{ fontSize: '2rem', marginRight: '1rem' }}>📐</div>
                  <div>
                    <h6 className="fw-semibold mb-1">Composition</h6>
                    <small className="text-muted">Rule of thirds & framing</small>
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="d-flex align-items-start">
                  <div style={{ fontSize: '2rem', marginRight: '1rem' }}>🎬</div>
                  <div>
                    <h6 className="fw-semibold mb-1">Auto-Editing</h6>
                    <small className="text-muted">Smooth fades and smart pacing</small>
                  </div>
                </div>
              </div>
            </div>
          </Card.Body>
        </Card>
      </Container>
    </div>
  );
};

export default ReelGenerator;
