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
  const fileInputRef = useRef(null);

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
    
    if (!albumTitle.trim()) {
      alert('Please enter an album title.');
      return;
    }
    
    setIsCreating(true);
    
    // Simulate album creation process
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const albumData = {
      id: Date.now(),
      title: albumTitle,
      description: albumDescription,
      category: selectedCategory,
      images: selectedImages,
      imageCount: selectedImages.length,
      createdAt: new Date().toISOString(),
      coverImage: selectedImages[0]?.url || null
    };
    
    // Store album data (in real app, this would be sent to API)
    const existingAlbums = JSON.parse(localStorage.getItem('userAlbums') || '[]');
    existingAlbums.push(albumData);
    localStorage.setItem('userAlbums', JSON.stringify(existingAlbums));
    
    alert('Album created successfully! 🎉');
    
    // Reset form
    setAlbumTitle('My Photography Album');
    setAlbumDescription('');
    setSelectedImages([]);
    setUploadedImages([]);
    setIsCreating(false);
  };

  return (
    <div className="album-builder py-4">
      <div className="container">
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
                  <div className="mt-3">
                    <h6 className="small text-muted mb-2">Uploaded Images ({uploadedImages.length})</h6>
                    <div className="max-height-200 overflow-y-auto">
                      {uploadedImages.map((image) => (
                        <div key={image.id} className="d-flex align-items-center mb-2 p-2 bg-light rounded">
                          <div className="me-2">
                            <img 
                              src={image.url} 
                              alt={image.name}
                              style={{ width: '40px', height: '40px', objectFit: 'cover' }}
                            />
                          </div>
                          <div className="flex-grow-1">
                            <div className="small fw-semibold text-truncate">{image.name}</div>
                            <div className="small text-muted">{formatFileSize(image.size)}</div>
                          </div>
                          <div className="ms-2">
                            <button 
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => removeImage(image.id)}
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Create Album Button */}
            <button 
              className="btn btn-primary w-100 btn-lg"
              onClick={createAlbum}
              disabled={isCreating || selectedImages.length === 0}
            >
              {isCreating ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Creating Album...
                </>
              ) : (
                '🎨 Create Album'
              )}
            </button>
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
                {selectedImages.length === 0 ? (
                  <div className="text-center py-5">
                    <div className="mb-4" style={{ fontSize: '4rem' }}>🖼️</div>
                    <h4 className="fw-bold mb-3">No Photos Selected</h4>
                    <p className="text-muted mb-4">Upload and select photos to start building your album</p>
                    <button 
                      className="btn btn-primary"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Upload Photos
                    </button>
                  </div>
                ) : (
                  <div>
                    {/* Album Cover */}
                    <div className="text-center mb-4">
                      <h3 className="fw-bold mb-2">{albumTitle || 'Untitled Album'}</h3>
                      <p className="text-muted">{albumDescription || 'No description'}</p>
                    </div>
                    
                    {/* Album Grid */}
                    <div className="row g-2">
                      {selectedImages.map((image, index) => (
                        <div 
                          key={image.id}
                          className="col-md-3 col-sm-4 col-6"
                          draggable
                          onDragStart={(e) => handleDragStart(e, image)}
                          onDragOver={handleDragOverImage}
                          onDrop={(e) => handleDropOnImage(e, image)}
                        >
                          <div className="album-image-container position-relative">
                            <img 
                              src={image.url}
                              alt={image.name}
                              className="img-fluid rounded w-100"
                              style={{ 
                                height: '200px', 
                                objectFit: 'cover',
                                cursor: 'move',
                                border: '2px solid var(--soft-gray)'
                              }}
                            />
                            <div className="position-absolute top-2 right-2">
                              <button 
                                className="btn btn-sm btn-danger btn-circle"
                                onClick={() => removeImage(image.id)}
                                style={{ borderRadius: '50%', width: '30px', height: '30px', padding: '0' }}
                              >
                                ✕
                              </button>
                            </div>
                            <div className="position-absolute bottom-2 left-2">
                              <span className="badge bg-dark bg-opacity-75 text-white">
                                #{index + 1}
                              </span>
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
      </div>
    </div>
  );
};

export default AlbumBuilder;
