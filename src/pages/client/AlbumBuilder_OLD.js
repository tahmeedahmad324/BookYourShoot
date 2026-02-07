import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';

const AlbumBuilder = () => {
  const [uploadedImages, setUploadedImages] = useState([]);
  const [selectedImages, setSelectedImages] = useState([]);
  const [albumTitle, setAlbumTitle] = useState('My Photography Album');
  const [albumDescription, setAlbumDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('wedding');
  const [isCreating, setIsCreating] = useState(false);
  const [draggedImage, setDraggedImage] = useState(null);
  const [createdAlbums, setCreatedAlbums] = useState([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [viewingAlbum, setViewingAlbum] = useState(null);
  const fileInputRef = useRef(null);

  // Load existing albums on mount
  React.useEffect(() => {
    const existingAlbums = JSON.parse(localStorage.getItem('userAlbums') || '[]');
    setCreatedAlbums(existingAlbums);
  }, []);

  const categories = [
    { id: 'wedding', name: 'Wedding', icon: '💒', color: 'var(--primary-orange)' },
    { id: 'portrait', name: 'Portrait', icon: '👤', color: 'var(--primary-blue)' },
    { id: 'event', name: 'Event', icon: '🎉', color: 'var(--deep-blue)' },
    { id: 'product', name: 'Product', icon: '📦', color: 'var(--dark-orange)' },
    { id: 'fashion', name: 'Fashion', icon: '👗', color: '#9C27B0' },
    { id: 'landscape', name: 'Landscape', icon: '🏞️', color: '#4CAF50' },
    { id: 'food', name: 'Food', icon: '🍔', color: '#FF9800' },
    { id: 'architectural', name: 'Architectural', icon: '🏛️', color: '#795548' }
  ];

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    const newImages = files.map((file, index) => ({
      id: Date.now() + index,
      file: file,
      name: file.name,
      size: file.size,
      type: file.type,
      url: URL.createObjectURL(file),
      uploadedAt: new Date().toISOString(),
      category: selectedCategory
    }));
    
    setUploadedImages(prev => [...prev, ...newImages]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    const newImages = files.map((file, index) => ({
      id: Date.now() + index,
      file: file,
      name: file.name,
      size: file.size,
      type: file.type,
      url: URL.createObjectURL(file),
      uploadedAt: new Date().toISOString(),
      category: selectedCategory
    }));
    
    setUploadedImages(prev => [...prev, ...newImages]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDragStart = (e, image) => {
    setDraggedImage(image);
  };

  const handleDragOverImage = (e) => {
    e.preventDefault();
  };

  const handleDropOnImage = (e, targetImage) => {
    e.preventDefault();
    if (draggedImage && draggedImage.id !== targetImage.id) {
      const draggedIndex = selectedImages.findIndex(img => img.id === draggedImage.id);
      const targetIndex = selectedImages.findIndex(img => img.id === targetImage.id);
      
      if (draggedIndex !== -1 && targetIndex !== -1) {
        const newSelected = [...selectedImages];
        const [removed] = newSelected.splice(draggedIndex, 1);
        newSelected.splice(targetIndex, 0, removed);
        setSelectedImages(newSelected);
      }
    }
    setDraggedImage(null);
  };

  const selectImage = (image) => {
    if (selectedImages.find(img => img.id === image.id)) {
      setSelectedImages(prev => prev.filter(img => img.id !== image.id));
    } else {
      setSelectedImages(prev => [...prev, image]);
    }
  };

  const removeImage = (imageId) => {
    setSelectedImages(prev => prev.filter(img => img.id !== imageId));
    setUploadedImages(prev => prev.filter(img => img.id !== imageId));
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const createAlbum = async () => {
    if (selectedImages.length === 0) {
      alert('Please select at least one image for your album.');
      return;
    }
    
    setIsCreating(true);
    
    try {
      // Get token from different auth methods
      let token = null;
      
      // Method 1: Check for mock_user (proper mock login)
      const mockUserStr = localStorage.getItem('mock_user');
      if (mockUserStr) {
        const userData = JSON.parse(mockUserStr);
        token = `mock-jwt-token-${userData.role}`;
        console.log('Using mock account token:', token);
      }
      
      // Method 2: Check for userRole (alternative login method)
      if (!token) {
        const userRole = localStorage.getItem('userRole');
        if (userRole) {
          token = `mock-jwt-token-${userRole}`;
          console.log('Using userRole token:', token);
        }
      }
      
      // Method 3: Check for real Supabase token
      if (!token) {
        token = localStorage.getItem('token');
        console.log('Using real token:', token);
      }
      
      if (!token) {
        console.error('No auth found! Keys:', Object.keys(localStorage));
        alert('Please login first to use AI album features');
        setIsCreating(false);
        return;
      }
      
      console.log('✅ Token ready for API call');
      
      // Step 0: Clear old albums from backend before uploading new ones
      try {
        await fetch('http://localhost:8000/api/albums/smart/albums', {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        console.log('Old albums cleared from backend');
      } catch (err) {
        console.log('No old albums to clear or delete failed (non-critical)');
      }
      
      // Step 1: Upload photos to backend
      const formData = new FormData();
      for (const image of selectedImages) {
        formData.append('files', image.file);
      }
      
      const uploadResponse = await fetch('http://localhost:8000/api/albums/smart/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      const uploadData = await uploadResponse.json();
      
      if (!uploadResponse.ok) {
        throw new Error(uploadData.detail || 'Failed to upload photos');
      }
      
      console.log('Upload successful:', uploadData);
      
      // Step 2: Start AI processing (ResNet-50 face clustering)
      const processResponse = await fetch('http://localhost:8000/api/albums/smart/process', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const processData = await processResponse.json();
      
      if (!processResponse.ok) {
        throw new Error(processData.detail || 'Failed to start AI processing');
      }
      
      console.log('Processing started:', processData);
      
      // Step 3: Poll for completion (increased timeout for ResNet-50)
      let isComplete = false;
      let attempts = 0;
      const maxAttempts = 180; // 3 minutes timeout (64 images can take time)
      
      while (!isComplete && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // Check every 2 seconds
        
        const statusResponse = await fetch('http://localhost:8000/api/albums/smart/status', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        const statusData = await statusResponse.json();
        
        console.log(`Processing status (${attempts}/${maxAttempts}):`, statusData.data?.status);
        
        if (statusData.data?.status === 'completed') {
          isComplete = true;
          console.log('✅ AI processing completed!');
        } else if (statusData.data?.status === 'error') {
          throw new Error('AI processing failed: ' + (statusData.data?.message || 'Unknown error'));
        }
        
        attempts++;
      }
      
      if (!isComplete) {
        throw new Error(`Processing is taking longer than expected (${maxAttempts * 2}s). The album might still be processing. Try refreshing the page in a few minutes to see if it completed.`);
      }
      
      // Step 4: Get organized albums (Highlights, Person_1, Person_2, etc.)
      const albumsResponse = await fetch('http://localhost:8000/api/albums/smart/albums', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const albumsData = await albumsResponse.json();
      
      if (albumsData.success) {
        // Store the AI-organized albums
        const organizedAlbums = {
          id: Date.now(),
          title: albumTitle,
          description: albumDescription,
          category: selectedCategory,
          createdAt: new Date().toISOString(),
          highlights: albumsData.data.highlights,
          persons: albumsData.data.persons,
          totalAlbums: albumsData.data.total_albums
        };
        
        const existingAlbums = JSON.parse(localStorage.getItem('userAlbums') || '[]');
        existingAlbums.push(organizedAlbums);
        localStorage.setItem('userAlbums', JSON.stringify(existingAlbums));
        
        setCreatedAlbums(existingAlbums);
        setShowSuccess(true);
        
        // Reset form
        setAlbumTitle('My Photography Album');
        setAlbumDescription('');
        setSelectedImages([]);
        setUploadedImages([]);
        
        setTimeout(() => setShowSuccess(false), 5000);
      }
      
    } catch (error) {
      console.error('Album creation error:', error);
      alert(`Failed to create album: ${error.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="album-builder py-4">
      <div className="container">
        {/* Album Viewer Modal */}
        {viewingAlbum && (
          <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }} onClick={() => setViewingAlbum(null)}>
            <div className="modal-dialog modal-xl modal-dialog-scrollable" onClick={(e) => e.stopPropagation()}>
              <div className="modal-content">
                <div className="modal-header">
                  <div>
                    <h4 className="modal-title fw-bold">{viewingAlbum.title}</h4>
                    <p className="text-muted small mb-0">{viewingAlbum.description}</p>
                  </div>
                  <button type="button" className="btn-close" onClick={() => setViewingAlbum(null)}></button>
                </div>
                <div className="modal-body">
                  {/* Highlights Album */}
                  {viewingAlbum.highlights && viewingAlbum.highlights.count > 0 && (
                    <div className="mb-5">
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <h5 className="fw-bold mb-0">✨ Highlights ({viewingAlbum.highlights.count} photos)</h5>
                        <button 
                          className="btn btn-sm btn-success"
                          onClick={() => {
                            const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
                            const token = localStorage.getItem('token') || 
                                        localStorage.getItem('mock_user') ? 'mock-jwt-token-client' : null;
                            if (token) {
                              window.open(`${API_URL}/api/albums/smart/download/highlights?token=${token}`, '_blank');
                            }
                          }}
                        >
                          📥 Download ZIP
                        </button>
                      </div>
                      <div className="row g-3">
                        {viewingAlbum.highlights.photos.map((photo, idx) => (
                          <div key={idx} className="col-md-3 col-sm-4 col-6">
                            <img 
                              src={`http://localhost:8000${photo}`} 
                              alt={`Highlight ${idx + 1}`}
                              className="img-fluid rounded w-100"
                              style={{ height: '200px', objectFit: 'cover', cursor: 'pointer' }}
                              onClick={() => {
                                // Open original quality in new tab
                                const originalPath = photo.replace('/thumbnails/', '/organized/');
                                window.open(`http://localhost:8000${originalPath}`, '_blank');
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Groups Album */}
                  {viewingAlbum.groups && viewingAlbum.groups.count > 0 && (
                    <div className="mb-5">
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <h5 className="fw-bold mb-0">👥 Groups ({viewingAlbum.groups.count} photos)</h5>
                        <button 
                          className="btn btn-sm btn-success"
                          onClick={() => {
                            const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
                            const token = localStorage.getItem('token') || 
                                        localStorage.getItem('mock_user') ? 'mock-jwt-token-client' : null;
                            if (token) {
                              window.open(`${API_URL}/api/albums/smart/download/groups?token=${token}`, '_blank');
                            }
                          }}
                        >
                          📥 Download ZIP
                        </button>
                      </div>
                      <div className="row g-3">
                        {viewingAlbum.groups.photos.map((photo, idx) => (
                          <div key={idx} className="col-md-3 col-sm-4 col-6">
                            <img 
                              src={`http://localhost:8000${photo}`} 
                              alt={`Group ${idx + 1}`}
                              className="img-fluid rounded w-100"
                              style={{ height: '200px', objectFit: 'cover', cursor: 'pointer' }}
                              onClick={() => {
                                const originalPath = photo.replace('/thumbnails/', '/organized/');
                                window.open(`http://localhost:8000${originalPath}`, '_blank');
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Person Albums (Solo - 1 face only) */}
                  {viewingAlbum.persons && Object.keys(viewingAlbum.persons).length > 0 && (
                    <div>
                      <h5 className="fw-bold mb-3">👤 Individual People - Solo Photos ({Object.keys(viewingAlbum.persons).length} persons detected)</h5>
                      {Object.entries(viewingAlbum.persons).map(([personName, personData]) => (
                        <div key={personName} className="mb-4">
                          <div className="d-flex justify-content-between align-items-center mb-3">
                            <h6 className="fw-semibold mb-0">{personName} ({personData.count} solo photos)</h6>
                            <button 
                              className="btn btn-sm btn-success"
                              onClick={() => {
                                const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
                                const token = localStorage.getItem('token') || 
                                            localStorage.getItem('mock_user') ? 'mock-jwt-token-client' : null;
                                if (token) {
                                  window.open(`${API_URL}/api/albums/smart/download/${personName}?token=${token}`, '_blank');
                                }
                              }}
                            >
                              📥 Download ZIP
                            </button>
                          </div>
                          <div className="row g-3">
                            {personData.photos.map((photo, idx) => (
                              <div key={idx} className="col-md-3 col-sm-4 col-6">
                                <img 
                                  src={`http://localhost:8000${photo}`} 
                                  alt={`${personName} ${idx + 1}`}
                                  className="img-fluid rounded w-100"
                                  style={{ height: '200px', objectFit: 'cover', cursor: 'pointer' }}
                                  onClick={() => {
                                    const originalPath = photo.replace('/thumbnails/', '/organized/');
                                    window.open(`http://localhost:8000${originalPath}`, '_blank');
                                  }}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Success Banner */}
        {showSuccess && (
          <div className="alert alert-success alert-dismissible fade show" role="alert">
            <h5 className="alert-heading">🎉 Album Created Successfully!</h5>
            <p className="mb-0">Your album has been created. Scroll down to view all your albums.</p>
            <button type="button" className="btn-close" onClick={() => setShowSuccess(false)}></button>
          </div>
        )}

        {/* Check Existing Albums Banner */}
        <div className="alert alert-info alert-dismissible fade show" role="alert">
          <strong>💡 Tip:</strong> If you previously created albums and they're not showing, click here to load them:
          <button 
            className="btn btn-sm btn-primary ms-2"
            onClick={async () => {
              try {
                const userRole = localStorage.getItem('userRole');
                const token = userRole ? `mock-jwt-token-${userRole}` : null;
                if (!token) { alert('Please login first'); return; }
                
                const response = await fetch('http://localhost:8000/api/albums/smart/albums', {
                  headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await response.json();
                
                if (data.success && data.data) {
                  const backendAlbum = {
                    id: Date.now(),
                    title: 'My Smart Album',
                    description: 'AI-organized photos',
                    category: selectedCategory,
                    createdAt: new Date().toISOString(),
                    highlights: data.data.highlights,
                    persons: data.data.persons,
                    totalAlbums: data.data.total_albums
                  };
                  
                  const existingAlbums = JSON.parse(localStorage.getItem('userAlbums') || '[]');
                  existingAlbums.push(backendAlbum);
                  localStorage.setItem('userAlbums', JSON.stringify(existingAlbums));
                  setCreatedAlbums(existingAlbums);
                  alert('✅ Albums loaded successfully!');
                } else {
                  alert('No albums found');
                }
              } catch (error) {
                alert('Error: ' + error.message);
              }
            }}
          >
            Load My Albums
          </button>
          <button type="button" className="btn-close" onClick={(e) => e.target.closest('.alert').remove()}></button>
        </div>

        {/* Header */}
        <div className="gradient-header rounded-3 p-4 mb-4">
          <div className="row align-items-center">
            <div className="col-md-8">
              <h1 className="fw-bold mb-2">🎨 Smart Album Builder</h1>
              <p className="mb-0">Upload, organize, and create beautiful photo albums for your special memories</p>
            </div>
            <div className="col-md-4 text-md-end">
              <div className="text-white mb-2">
                <div className="small opacity-75">Album Progress</div>
                <div className="h5 fw-bold">{selectedImages.length} Photos Selected</div>
              </div>
            </div>
          </div>
        </div>

        <div className="row">
          {/* Left Sidebar - Upload & Settings */}
          <div className="col-lg-3">
            {/* Album Settings */}
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-header bg-white border-0 pt-4 pb-3">
                <h5 className="fw-bold mb-0">Album Settings</h5>
              </div>
              <div className="card-body">
                <div className="mb-3">
                  <label className="form-label fw-semibold">Album Title *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={albumTitle}
                    onChange={(e) => setAlbumTitle(e.target.value)}
                    placeholder="My Amazing Album"
                  />
                </div>
                
                <div className="mb-3">
                  <label className="form-label fw-semibold">Category *</label>
                  <select 
                    className="form-select"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                  >
                    {categories.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.icon} {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="mb-3">
                  <label className="form-label fw-semibold">Description</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    value={albumDescription}
                    onChange={(e) => setAlbumDescription(e.target.value)}
                    placeholder="Describe your album..."
                  />
                </div>
              </div>
            </div>

            {/* Upload Area */}
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-header bg-white border-0 pt-4 pb-3">
                <h5 className="fw-bold mb-0">Upload Photos</h5>
              </div>
              <div className="card-body">
                <div 
                  className="upload-zone"
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="text-center">
                    <div className="mb-3" style={{ fontSize: '3rem' }}>📤</div>
                    <h6 className="fw-semibold mb-2">Drag & Drop Photos Here</h6>
                    <p className="text-muted small mb-3">or click to browse files</p>
                    <button className="btn btn-primary btn-sm">
                      Choose Files
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="d-none"
                    />
                  </div>
                </div>
                
                {uploadedImages.length > 0 && (
                  <div className="mt-3 text-center">
                    <div className="alert alert-success py-2 mb-0">
                      <strong>{uploadedImages.length}</strong> photos uploaded
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Create Album Button - Sticky */}
            <div className="position-sticky" style={{ bottom: '20px', zIndex: 1000 }}>
              <button 
                className="btn btn-primary w-100 btn-lg shadow-lg"
                onClick={createAlbum}
                disabled={isCreating || selectedImages.length === 0}
              >
                {isCreating ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    AI Processing (ResNet-50)...
                    <div className="small mt-1">This may take 2-3 minutes for {selectedImages.length} photos</div>
                  </>
                ) : (
                  <>
                    🤖 Create AI Albums ({selectedImages.length})
                  </>
                )}
              </button>
              {selectedImages.length > 0 && !isCreating && (
                <div className="alert alert-info mt-2 small mb-0">
                  <strong>🧠 ResNet-50 will:</strong><br/>
                  • Detect faces in photos<br/>
                  • Group by individual people<br/>
                  • Select best highlights
                </div>
              )}
            </div>
          </div>

          {/* Main Content - Album Preview */}
          <div className="col-lg-9">
            {/* Album Preview */}
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-white border-0 pt-4 pb-3">
                <div className="d-flex justify-content-between align-items-center">
                  <h5 className="fw-bold mb-0">Album Preview</h5>
                  <div className="d-flex gap-2">
                    <span className="badge bg-primary">
                      {categories.find(c => c.id === selectedCategory)?.icon} {categories.find(c => c.id === selectedCategory)?.name}
                    </span>
                    {selectedImages.length > 0 && (
                      <span className="badge bg-success">
                        {selectedImages.length} photos
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="card-body p-4">
                {uploadedImages.length === 0 ? (
                  <div className="text-center py-5">
                    <div className="mb-4" style={{ fontSize: '4rem' }}>🖼️</div>
                    <h4 className="fw-bold mb-3">No Photos Uploaded</h4>
                    <p className="text-muted mb-4">Upload photos to start building your album</p>
                    <button 
                      className="btn btn-primary"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Upload Photos
                    </button>
                  </div>
                ) : (
                  <div>
                    {/* Selection Controls */}
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <div>
                        <h5 className="fw-bold mb-0">Select photos for your album</h5>
                        <p className="text-muted small mb-0">Click images to select/deselect • {selectedImages.length} selected</p>
                      </div>
                      <button 
                        className="btn btn-outline-primary"
                        onClick={() => {
                          if (selectedImages.length === uploadedImages.length) {
                            setSelectedImages([]);
                          } else {
                            setSelectedImages([...uploadedImages]);
                          }
                        }}
                      >
                        {selectedImages.length === uploadedImages.length ? 'Deselect All' : 'Select All'}
                      </button>
                    </div>
                    
                    {/* Image Selection Grid */}
                    <div className="row g-3">
                      {uploadedImages.map((image, index) => (
                        <div 
                          key={image.id}
                          className="col-md-3 col-sm-4 col-6"
                          onClick={() => selectImage(image)}
                          style={{ cursor: 'pointer' }}
                        >
                          <div className="position-relative">
                            <img 
                              src={image.url}
                              alt={image.name}
                              className="img-fluid rounded w-100"
                              style={{ 
                                height: '200px', 
                                objectFit: 'cover',
                                border: selectedImages.find(img => img.id === image.id) 
                                  ? '4px solid var(--primary-blue)' 
                                  : '2px solid #e0e0e0',
                                transition: 'all 0.2s ease'
                              }}
                            />
                            {/* Selection Indicator */}
                            {selectedImages.find(img => img.id === image.id) && (
                              <div className="position-absolute top-0 end-0 m-2">
                                <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center" 
                                     style={{ width: '32px', height: '32px', fontWeight: 'bold' }}>
                                  ✓
                                </div>
                              </div>
                            )}
                            {/* Delete Button */}
                            <div className="position-absolute top-0 start-0 m-2">
                              <button 
                                className="btn btn-sm btn-danger"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeImage(image.id);
                                }}
                                style={{ borderRadius: '50%', width: '32px', height: '32px', padding: '0' }}
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Album Stats */}
                    <div className="mt-4 p-3 bg-light rounded">
                      <div className="row text-center">
                        <div className="col-4">
                          <div className="fw-bold text-primary">{selectedImages.length}</div>
                          <div className="small text-muted">Photos</div>
                        </div>
                        <div className="col-4">
                          <div className="fw-bold text-primary">
                            {selectedImages.reduce((sum, img) => sum + img.size, 0) > 0 ? 
                              formatFileSize(selectedImages.reduce((sum, img) => sum + img.size, 0)) : 
                              '0 KB'
                            }
                          </div>
                          <div className="small text-muted">Total Size</div>
                        </div>
                        <div className="col-4">
                          <div className="fw-bold text-primary">{categories.find(c => c.id === selectedCategory)?.name}</div>
                          <div className="small text-muted">Category</div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-3">
                      <small className="text-muted">
                        <strong>💡 Tip:</strong> Drag and drop photos to reorder them in your album.
                      </small>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Templates */}
            {selectedImages.length > 0 && (
              <div className="card border-0 shadow-sm mt-4">
                <div className="card-header bg-white border-0 pt-4 pb-3">
                  <h6 className="fw-bold mb-0">Quick Album Templates</h6>
                </div>
                <div className="card-body">
                  <div className="row g-2">
                    <div className="col-md-6">
                      <button className="btn btn-outline-primary w-100 btn-sm">
                        🎓 Graduation Album
                      </button>
                    </div>
                    <div className="col-md-6">
                      <button className="btn btn-outline-primary w-100 btn-sm">
                        💑 Wedding Album
                      </button>
                    </div>
                    <div className="col-md-6">
                      <button className="btn btn-outline-primary w-100 btn-sm">
                        👨‍👩‍👧‍👦 Family Album
                      </button>
                    </div>
                    <div className="col-md-6">
                      <button className="btn btn-outline-primary w-100 btn-sm">
                        🏃‍♀️ Sports Album
                      </button>
                    </div>
                    <div className="col-md-6">
                      <button className="btn btn-outline-primary w-100 btn-sm">
                        🎂 Birthday Album
                      </button>
                    </div>
                    <div className="col-md-6">
                      <button className="btn btn-outline-primary w-100 btn-sm">
                        🏕️ Travel Album
                      </button>
                    </div>
                  </div>
                  <div className="alert alert-info small mt-3">
                    <strong>💡 Pro Tip:</strong> Apply templates to automatically arrange and style your photos for different occasions.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* My Albums Section */}
        {createdAlbums.length > 0 && (
          <div className="row mt-5">
            <div className="col-12">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h3 className="fw-bold">📚 My Albums ({createdAlbums.length})</h3>
                <button 
                  className="btn btn-outline-danger btn-sm"
                  onClick={async () => {
                    if (window.confirm('Are you sure you want to delete all albums?')) {
                      // Clear from localStorage
                      localStorage.removeItem('userAlbums');
                      setCreatedAlbums([]);
                      
                      // Clear from backend
                      try {
                        const token = localStorage.getItem('token') || 
                                    (localStorage.getItem('userRole') ? `mock-jwt-token-${localStorage.getItem('userRole')}` : null) ||
                                    (localStorage.getItem('mock_user') ? `mock-jwt-token-client` : null);
                        
                        if (token) {
                          await fetch('http://localhost:8000/api/albums/smart/albums', {
                            method: 'DELETE',
                            headers: {
                              'Authorization': `Bearer ${token}`
                            }
                          });
                          console.log('Albums deleted from backend');
                        }
                      } catch (err) {
                        console.error('Failed to delete from backend:', err);
                      }
                    }
                  }}
                >
                  Clear All
                </button>
              </div>

              <div className="row g-4">
                {createdAlbums.map((album) => (
                  <div key={album.id} className="col-md-4 col-sm-6">
                    <div className="card border-0 shadow-sm h-100">
                      {/* Album Cover */}
                      <div className="position-relative" style={{ height: '200px', overflow: 'hidden', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                        <div className="w-100 h-100 d-flex flex-column align-items-center justify-content-center text-white p-3">
                          <div style={{ fontSize: '3rem' }}>🎨</div>
                          <h6 className="fw-bold mt-2">{album.totalAlbums} AI-Organized Albums</h6>
                          <p className="small mb-0">
                            {album.highlights?.count || 0} Highlights • {album.groups?.count || 0} Groups • {Object.keys(album.persons || {}).length} Solo
                          </p>
                        </div>
                        <div className="position-absolute top-0 end-0 m-2">
                          <span className="badge bg-dark bg-opacity-75">
                            {categories.find(c => c.id === album.category)?.icon} {categories.find(c => c.id === album.category)?.name}
                          </span>
                        </div>
                      </div>

                      {/* Album Info */}
                      <div className="card-body">
                        <h5 className="fw-bold mb-2">{album.title}</h5>
                        <p className="text-muted small mb-3">
                          {album.description || 'AI-organized by ResNet-50 face recognition'}
                        </p>
                        
                        <div className="alert alert-info py-2 small mb-3">
                          <strong>🤖 AI Processing Complete:</strong><br/>
                          ✨ {album.highlights?.count || 0} best photos (Highlights)<br/>
                          👥 {album.groups?.count || 0} group photos (2+ faces)<br/>
                          👤 {Object.keys(album.persons || {}).length} solo person albums (1 face each)
                        </div>

                        <div className="d-flex justify-content-between align-items-center mb-3">
                          <div className="small text-muted">
                            Created {new Date(album.createdAt).toLocaleDateString()}
                          </div>
                        </div>

                        <div className="mt-3">
                          <button 
                            className="btn btn-sm btn-primary w-100 mb-2"
                            onClick={() => setViewingAlbum(album)}
                          >
                            📂 View All Albums
                          </button>
                          <button 
                            className="btn btn-sm btn-outline-danger w-100"
                            onClick={async () => {
                              if (window.confirm(`Delete "${album.title}"?`)) {
                                // Clear from localStorage
                                const updatedAlbums = createdAlbums.filter(a => a.id !== album.id);
                                localStorage.setItem('userAlbums', JSON.stringify(updatedAlbums));
                                setCreatedAlbums(updatedAlbums);
                                
                                // Clear from backend
                                try {
                                  const token = localStorage.getItem('token') || 
                                              (localStorage.getItem('userRole') ? `mock-jwt-token-${localStorage.getItem('userRole')}` : null) ||
                                              (localStorage.getItem('mock_user') ? `mock-jwt-token-client` : null);
                                  
                                  if (token) {
                                    await fetch('http://localhost:8000/api/albums/smart/albums', {
                                      method: 'DELETE',
                                      headers: {
                                        'Authorization': `Bearer ${token}`
                                      }
                                    });
                                  }
                                } catch (err) {
                                  console.error('Failed to delete from backend:', err);
                                }
                              }
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AlbumBuilder;
