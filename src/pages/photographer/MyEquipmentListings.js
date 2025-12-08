import React, { useState } from 'react';
import '../../styles/global.css';

function MyEquipmentListings() {
  const [myListings, setMyListings] = useState([
    {
      id: 1,
      name: "Canon EOS R5",
      category: "Camera",
      dailyRate: 2500,
      weeklyRate: 15000,
      monthlyRate: 50000,
      deposit: 20000,
      available: true,
      condition: "Excellent",
      rentalCount: 12,
      earnings: 78000,
      images: ['https://via.placeholder.com/400x300?text=Canon+EOS+R5']
    }
  ]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showLightbox, setShowLightbox] = useState(false);
  const [lightboxImages, setLightboxImages] = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    category: 'Camera',
    brand: '',
    dailyRate: '',
    weeklyRate: '',
    monthlyRate: '',
    deposit: '',
    condition: 'Excellent',
    description: '',
    includes: '',
    images: []
  });

  const categories = ['Camera', 'Lighting', 'Video', 'Audio', 'Support', 'Drone', 'Accessories'];
  const conditions = ['Excellent', 'Good', 'Fair'];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    if (formData.images.length + files.length > 5) {
      alert('You can upload maximum 5 images');
      return;
    }

    const newImages = [];
    const newPreviews = [];

    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        newImages.push(file);
        const reader = new FileReader();
        reader.onloadend = () => {
          newPreviews.push(reader.result);
          if (newPreviews.length === files.length) {
            setImagePreviews(prev => [...prev, ...newPreviews]);
            setFormData(prev => ({ ...prev, images: [...prev.images, ...newImages] }));
          }
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const removeImage = (index) => {
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
    setFormData(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.images.length === 0) {
      alert('Please upload at least one image');
      return;
    }

    const newListing = {
      id: Date.now(),
      name: formData.name,
      category: formData.category,
      brand: formData.brand,
      dailyRate: parseInt(formData.dailyRate),
      weeklyRate: parseInt(formData.weeklyRate),
      monthlyRate: parseInt(formData.monthlyRate),
      deposit: parseInt(formData.deposit),
      condition: formData.condition,
      description: formData.description,
      includes: formData.includes.split(',').map(item => item.trim()),
      images: imagePreviews,
      available: true,
      rentalCount: 0,
      earnings: 0
    };
    
    setMyListings(prev => [...prev, newListing]);
    setShowAddModal(false);
    setImagePreviews([]);
    setFormData({
      name: '',
      category: 'Camera',
      brand: '',
      dailyRate: '',
      weeklyRate: '',
      monthlyRate: '',
      deposit: '',
      condition: 'Excellent',
      description: '',
      includes: '',
      images: []
    });
  };

  const toggleAvailability = (id) => {
    setMyListings(prev => prev.map(item => 
      item.id === id ? { ...item, available: !item.available } : item
    ));
  };

  const deleteListing = (id) => {
    if (window.confirm('Are you sure you want to delete this listing?')) {
      setMyListings(prev => prev.filter(item => item.id !== id));
    }
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setFormData({
      name: item.name,
      category: item.category,
      brand: item.brand || '',
      dailyRate: item.dailyRate,
      weeklyRate: item.weeklyRate,
      monthlyRate: item.monthlyRate,
      deposit: item.deposit,
      condition: item.condition,
      description: item.description || '',
      includes: Array.isArray(item.includes) ? item.includes.join(', ') : '',
      images: []
    });
    setImagePreviews(item.images || []);
    setShowEditModal(true);
  };

  const handleUpdate = (e) => {
    e.preventDefault();
    if (imagePreviews.length === 0) {
      alert('Please upload at least one image');
      return;
    }

    setMyListings(prev => prev.map(item => {
      if (item.id === editingId) {
        return {
          ...item,
          name: formData.name,
          category: formData.category,
          brand: formData.brand,
          dailyRate: parseInt(formData.dailyRate),
          weeklyRate: parseInt(formData.weeklyRate),
          monthlyRate: parseInt(formData.monthlyRate),
          deposit: parseInt(formData.deposit),
          condition: formData.condition,
          description: formData.description,
          includes: formData.includes.split(',').map(i => i.trim()),
          images: imagePreviews
        };
      }
      return item;
    }));

    setShowEditModal(false);
    setEditingId(null);
    setImagePreviews([]);
    setFormData({
      name: '',
      category: 'Camera',
      brand: '',
      dailyRate: '',
      weeklyRate: '',
      monthlyRate: '',
      deposit: '',
      condition: 'Excellent',
      description: '',
      includes: '',
      images: []
    });
  };

  const openLightbox = (images, index = 0) => {
    setLightboxImages(images);
    setCurrentImageIndex(index);
    setShowLightbox(true);
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % lightboxImages.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + lightboxImages.length) % lightboxImages.length);
  };

  const totalEarnings = myListings.reduce((sum, item) => sum + item.earnings, 0);

  return (
    <div className="my-equipment-listings py-4">
      <div className="container">
        {/* Header with Stats */}
        <div className="gradient-header rounded-3 p-4 mb-4">
          <div className="row align-items-center">
            <div className="col-md-6">
              <h1 className="fw-bold mb-2">📦 My Equipment Listings</h1>
              <p className="mb-0">List your equipment and earn rental income</p>
            </div>
            <div className="col-md-6">
              <div className="row g-3">
                <div className="col-6">
                  <div className="text-center bg-white rounded-3 p-3">
                    <h3 className="fw-bold text-primary mb-0">{myListings.length}</h3>
                    <small className="text-muted">Listed Items</small>
                  </div>
                </div>
                <div className="col-6">
                  <div className="text-center bg-white rounded-3 p-3">
                    <h3 className="fw-bold text-success mb-0">Rs. {totalEarnings.toLocaleString()}</h3>
                    <small className="text-muted">Total Earnings</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Add New Equipment Button */}
        <div className="mb-4">
          <button 
            className="btn btn-success btn-lg"
            onClick={() => setShowAddModal(true)}
          >
            ➕ List New Equipment
          </button>
        </div>

        {/* My Listings Grid */}
        <div className="row g-4">
          {myListings.length === 0 ? (
            <div className="col-12">
              <div className="card border-0 shadow-sm text-center py-5">
                <div className="card-body">
                  <h3 className="mb-3">📦 No Equipment Listed Yet</h3>
                  <p className="text-muted mb-4">Start earning by listing your equipment for rent</p>
                  <button 
                    className="btn btn-success"
                    onClick={() => setShowAddModal(true)}
                  >
                    ➕ List Your First Equipment
                  </button>
                </div>
              </div>
            </div>
          ) : (
            myListings.map(item => (
              <div key={item.id} className="col-md-6 col-lg-4">
                <div className="card h-100 border-0 shadow-sm">
                  {item.images && item.images.length > 0 && (
                    <div 
                      className="position-relative" 
                      style={{ cursor: 'pointer' }}
                      onClick={() => openLightbox(item.images, 0)}
                    >
                      <img 
                        src={item.images[0]} 
                        alt={item.name}
                        className="card-img-top"
                        style={{ height: '200px', objectFit: 'cover' }}
                      />
                      {item.images.length > 1 && (
                        <span className="badge bg-dark position-absolute bottom-0 end-0 m-2">
                          📷 {item.images.length}
                        </span>
                      )}
                      <div className="position-absolute top-0 end-0 m-2">
                        <span className="badge bg-light text-dark">
                          🔍 View
                        </span>
                      </div>
                    </div>
                  )}
                  <div className="card-body">
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <h5 className="fw-bold mb-0">{item.name}</h5>
                      <span className={`badge ${item.available ? 'bg-success' : 'bg-danger'}`}>
                        {item.available ? '✅ Available' : '❌ Rented'}
                      </span>
                    </div>

                    <div className="mb-3">
                      <span className="badge bg-secondary me-2">{item.category}</span>
                      <span className="badge bg-info">{item.condition}</span>
                    </div>

                    <div className="mb-3">
                      <small className="text-muted d-block mb-1">Rental Rates:</small>
                      <div className="d-flex justify-content-between text-sm">
                        <span>Daily: <strong>Rs. {item.dailyRate.toLocaleString()}</strong></span>
                        <span>Weekly: <strong>Rs. {item.weeklyRate.toLocaleString()}</strong></span>
                      </div>
                      <div className="text-sm mt-1">
                        <span>Monthly: <strong>Rs. {item.monthlyRate.toLocaleString()}</strong></span>
                      </div>
                    </div>

                    <div className="mb-3 pb-3 border-bottom">
                      <small className="text-muted">Deposit: Rs. {item.deposit.toLocaleString()}</small>
                    </div>

                    <div className="row g-2 mb-3">
                      <div className="col-6">
                        <div className="text-center bg-light rounded p-2">
                          <small className="text-muted d-block">Rentals</small>
                          <strong>{item.rentalCount}</strong>
                        </div>
                      </div>
                      <div className="col-6">
                        <div className="text-center bg-light rounded p-2">
                          <small className="text-muted d-block">Earned</small>
                          <strong>Rs. {item.earnings.toLocaleString()}</strong>
                        </div>
                      </div>
                    </div>

                    <div className="d-grid gap-2">
                      <button 
                        className="btn btn-sm btn-primary"
                        onClick={() => startEdit(item)}
                      >
                        ✏️ Edit Equipment
                      </button>
                      <button 
                        className={`btn btn-sm ${item.available ? 'btn-warning' : 'btn-success'}`}
                        onClick={() => toggleAvailability(item.id)}
                      >
                        {item.available ? '🔒 Mark as Unavailable' : '🔓 Mark as Available'}
                      </button>
                      <button 
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => deleteListing(item.id)}
                      >
                        🗑️ Delete Listing
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Add Equipment Modal */}
        {showAddModal && (
          <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-lg modal-dialog-centered">
              <div className="modal-content" style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
                <div className="modal-header">
                  <h5 className="modal-title fw-bold">📦 List New Equipment</h5>
                  <button 
                    type="button" 
                    className="btn-close"
                    onClick={() => setShowAddModal(false)}
                  ></button>
                </div>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                  <div className="modal-body" style={{ overflowY: 'auto' }}>
                    <div className="row g-3">
                      <div className="col-md-8">
                        <label className="form-label fw-bold">Equipment Name *</label>
                        <input 
                          type="text"
                          className="form-control"
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          placeholder="e.g., Canon EOS R5"
                          required
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label fw-bold">Category *</label>
                        <select 
                          className="form-select"
                          name="category"
                          value={formData.category}
                          onChange={handleInputChange}
                          required
                        >
                          {categories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>

                      <div className="col-md-6">
                        <label className="form-label fw-bold">Brand</label>
                        <input 
                          type="text"
                          className="form-control"
                          name="brand"
                          value={formData.brand}
                          onChange={handleInputChange}
                          placeholder="e.g., Canon"
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label fw-bold">Condition *</label>
                        <select 
                          className="form-select"
                          name="condition"
                          value={formData.condition}
                          onChange={handleInputChange}
                          required
                        >
                          {conditions.map(cond => (
                            <option key={cond} value={cond}>{cond}</option>
                          ))}
                        </select>
                      </div>

                      <div className="col-12">
                        <label className="form-label fw-bold">Description</label>
                        <textarea 
                          className="form-control"
                          name="description"
                          value={formData.description}
                          onChange={handleInputChange}
                          rows="3"
                          placeholder="Describe your equipment..."
                        ></textarea>
                      </div>

                      <div className="col-12">
                        <label className="form-label fw-bold">Includes (comma-separated)</label>
                        <input 
                          type="text"
                          className="form-control"
                          name="includes"
                          value={formData.includes}
                          onChange={handleInputChange}
                          placeholder="e.g., Camera body, Battery, Charger, Strap"
                        />
                      </div>

                      <div className="col-12">
                        <label className="form-label fw-bold">Equipment Images * (1-5 images)</label>
                        <input 
                          type="file"
                          className="form-control"
                          accept="image/*"
                          multiple
                          onChange={handleImageUpload}
                          disabled={formData.images.length >= 5}
                        />
                        <small className="text-muted">
                          Upload at least 1 image, maximum 5 images. ({formData.images.length}/5)
                        </small>
                        
                        {imagePreviews.length > 0 && (
                          <div className="row g-2 mt-2">
                            {imagePreviews.map((preview, index) => (
                              <div key={index} className="col-4 col-md-3">
                                <div className="position-relative">
                                  <img 
                                    src={preview} 
                                    alt={`Preview ${index + 1}`}
                                    className="img-thumbnail w-100"
                                    style={{ height: '100px', objectFit: 'cover' }}
                                  />
                                  <button
                                    type="button"
                                    className="btn btn-danger btn-sm position-absolute top-0 end-0 m-1"
                                    onClick={() => removeImage(index)}
                                    style={{ padding: '2px 6px' }}
                                  >
                                    ✕
                                  </button>
                                  {index === 0 && (
                                    <span className="badge bg-primary position-absolute bottom-0 start-0 m-1">
                                      Main
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="col-12">
                        <h6 className="fw-bold text-primary mt-3 mb-3">💰 Rental Rates</h6>
                      </div>

                      <div className="col-md-4">
                        <label className="form-label fw-bold">Daily Rate (Rs.) *</label>
                        <input 
                          type="number"
                          className="form-control"
                          name="dailyRate"
                          value={formData.dailyRate}
                          onChange={handleInputChange}
                          placeholder="2500"
                          required
                          min="0"
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label fw-bold">Weekly Rate (Rs.) *</label>
                        <input 
                          type="number"
                          className="form-control"
                          name="weeklyRate"
                          value={formData.weeklyRate}
                          onChange={handleInputChange}
                          placeholder="15000"
                          required
                          min="0"
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label fw-bold">Monthly Rate (Rs.) *</label>
                        <input 
                          type="number"
                          className="form-control"
                          name="monthlyRate"
                          value={formData.monthlyRate}
                          onChange={handleInputChange}
                          placeholder="50000"
                          required
                          min="0"
                        />
                      </div>

                      <div className="col-md-6">
                        <label className="form-label fw-bold">Security Deposit (Rs.) *</label>
                        <input 
                          type="number"
                          className="form-control"
                          name="deposit"
                          value={formData.deposit}
                          onChange={handleInputChange}
                          placeholder="20000"
                          required
                          min="0"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button 
                      type="button" 
                      className="btn btn-secondary"
                      onClick={() => setShowAddModal(false)}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-success">
                      📦 List Equipment
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Edit Equipment Modal */}
        {showEditModal && (
          <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-lg modal-dialog-centered">
              <div className="modal-content" style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
                <div className="modal-header">
                  <h5 className="modal-title fw-bold">✏️ Edit Equipment</h5>
                  <button 
                    type="button" 
                    className="btn-close"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingId(null);
                      setImagePreviews([]);
                    }}
                  ></button>
                </div>
                <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                  <div className="modal-body" style={{ overflowY: 'auto' }}>
                    <div className="row g-3">
                      <div className="col-md-8">
                        <label className="form-label fw-bold">Equipment Name *</label>
                        <input 
                          type="text"
                          className="form-control"
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          placeholder="e.g., Canon EOS R5"
                          required
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label fw-bold">Category *</label>
                        <select 
                          className="form-select"
                          name="category"
                          value={formData.category}
                          onChange={handleInputChange}
                          required
                        >
                          {categories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>

                      <div className="col-md-6">
                        <label className="form-label fw-bold">Brand</label>
                        <input 
                          type="text"
                          className="form-control"
                          name="brand"
                          value={formData.brand}
                          onChange={handleInputChange}
                          placeholder="e.g., Canon"
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label fw-bold">Condition *</label>
                        <select 
                          className="form-select"
                          name="condition"
                          value={formData.condition}
                          onChange={handleInputChange}
                          required
                        >
                          {conditions.map(cond => (
                            <option key={cond} value={cond}>{cond}</option>
                          ))}
                        </select>
                      </div>

                      <div className="col-12">
                        <label className="form-label fw-bold">Description</label>
                        <textarea 
                          className="form-control"
                          name="description"
                          value={formData.description}
                          onChange={handleInputChange}
                          rows="3"
                          placeholder="Describe your equipment..."
                        ></textarea>
                      </div>

                      <div className="col-12">
                        <label className="form-label fw-bold">Includes (comma-separated)</label>
                        <input 
                          type="text"
                          className="form-control"
                          name="includes"
                          value={formData.includes}
                          onChange={handleInputChange}
                          placeholder="e.g., Camera body, Battery, Charger, Strap"
                        />
                      </div>

                      <div className="col-12">
                        <label className="form-label fw-bold">Equipment Images * (1-5 images)</label>
                        <input 
                          type="file"
                          className="form-control"
                          accept="image/*"
                          multiple
                          onChange={handleImageUpload}
                          disabled={formData.images.length >= 5}
                        />
                        <small className="text-muted">
                          Current: {imagePreviews.length} image(s). You can add more or keep existing. (Max 5)
                        </small>
                        
                        {imagePreviews.length > 0 && (
                          <div className="row g-2 mt-2">
                            {imagePreviews.map((preview, index) => (
                              <div key={index} className="col-4 col-md-3">
                                <div className="position-relative">
                                  <img 
                                    src={preview} 
                                    alt={`Preview ${index + 1}`}
                                    className="img-thumbnail w-100"
                                    style={{ height: '100px', objectFit: 'cover' }}
                                  />
                                  <button
                                    type="button"
                                    className="btn btn-danger btn-sm position-absolute top-0 end-0 m-1"
                                    onClick={() => removeImage(index)}
                                    style={{ padding: '2px 6px' }}
                                  >
                                    ✕
                                  </button>
                                  {index === 0 && (
                                    <span className="badge bg-primary position-absolute bottom-0 start-0 m-1">
                                      Main
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="col-12">
                        <h6 className="fw-bold text-primary mt-3 mb-3">💰 Rental Rates</h6>
                      </div>

                      <div className="col-md-4">
                        <label className="form-label fw-bold">Daily Rate (Rs.) *</label>
                        <input 
                          type="number"
                          className="form-control"
                          name="dailyRate"
                          value={formData.dailyRate}
                          onChange={handleInputChange}
                          placeholder="2500"
                          required
                          min="0"
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label fw-bold">Weekly Rate (Rs.) *</label>
                        <input 
                          type="number"
                          className="form-control"
                          name="weeklyRate"
                          value={formData.weeklyRate}
                          onChange={handleInputChange}
                          placeholder="15000"
                          required
                          min="0"
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label fw-bold">Monthly Rate (Rs.) *</label>
                        <input 
                          type="number"
                          className="form-control"
                          name="monthlyRate"
                          value={formData.monthlyRate}
                          onChange={handleInputChange}
                          placeholder="50000"
                          required
                          min="0"
                        />
                      </div>

                      <div className="col-md-6">
                        <label className="form-label fw-bold">Security Deposit (Rs.) *</label>
                        <input 
                          type="number"
                          className="form-control"
                          name="deposit"
                          value={formData.deposit}
                          onChange={handleInputChange}
                          placeholder="20000"
                          required
                          min="0"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button 
                      type="button" 
                      className="btn btn-secondary"
                      onClick={() => {
                        setShowEditModal(false);
                        setEditingId(null);
                        setImagePreviews([]);
                      }}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary">
                      ✏️ Update Equipment
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Image Lightbox Modal */}
        {showLightbox && (
          <div 
            className="modal show d-block" 
            style={{ backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 1060 }}
            onClick={() => setShowLightbox(false)}
          >
            <div className="modal-dialog modal-fullscreen d-flex align-items-center justify-content-center">
              <div className="position-relative w-100 h-100 d-flex align-items-center justify-content-center" onClick={(e) => e.stopPropagation()}>
                <button 
                  className="btn btn-close btn-close-white position-absolute top-0 end-0 m-3"
                  style={{ zIndex: 10 }}
                  onClick={() => setShowLightbox(false)}
                ></button>
                
                <div className="container-fluid h-100 d-flex align-items-center">
                  <div className="row g-4 justify-content-center w-100 mx-auto" style={{ maxWidth: lightboxImages.length === 1 ? '1200px' : '100%' }}>
                    {lightboxImages.map((image, index) => (
                      <div 
                        key={index} 
                        className={`${
                          lightboxImages.length === 1 
                            ? 'col-12' 
                            : lightboxImages.length === 2 
                            ? 'col-12 col-md-6' 
                            : 'col-12 col-md-6 col-lg-4'
                        }`}
                      >
                        <div className="position-relative text-center">
                          <img 
                            src={image} 
                            alt={`Image ${index + 1}`}
                            className="img-fluid rounded shadow"
                            style={{ 
                              maxHeight: lightboxImages.length === 1 ? '85vh' : '400px',
                              width: lightboxImages.length === 1 ? 'auto' : '100%',
                              maxWidth: '100%',
                              objectFit: lightboxImages.length === 1 ? 'contain' : 'cover'
                            }}
                          />
                          {lightboxImages.length > 1 && (
                            <span className="badge bg-primary position-absolute top-0 start-0 m-2">
                              {index + 1}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default MyEquipmentListings;
