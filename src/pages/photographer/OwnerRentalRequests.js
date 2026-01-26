"use client"

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/api';

const OwnerRentalRequests = () => {
  const { user } = useAuth();
  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedRental, setSelectedRental] = useState(null);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [processing, setProcessing] = useState(false);
  
  // Dispute modal state
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [rentalForDispute, setRentalForDispute] = useState(null);
  const [disputeForm, setDisputeForm] = useState({
    dispute_reason: '',
    description: ''
  });
  const [submittingDispute, setSubmittingDispute] = useState(false);
  
  const [returnForm, setReturnForm] = useState({
    damage_category: 'no_damage',
    deduction_amount: 0,
    deduction_notes: '',
    photos: [],
    photoPreview: []
  });

  // Damage assessment categories with suggested deduction ranges
  const damageCategories = {
    no_damage: { label: '✓ No Damage - Perfect Condition', range: [0, 0], description: 'Full deposit refund', photoRequired: false },
    minor: { label: '⚠️ Minor (Scratches/Scuffs)', range: [10, 20], description: '10-20% deduction', photoRequired: true },
    moderate: { label: '⚠️ Moderate (Repairable Damage)', range: [20, 50], description: '20-50% deduction', photoRequired: true },
    major: { label: '🔴 Major (Significant Damage)', range: [50, 100], description: '50-100% deduction', photoRequired: true },
    missing_parts: { label: '🔴 Missing Parts/Accessories', range: [30, 100], description: 'Based on replacement cost', photoRequired: true },
    late_return: { label: '⏰ Late Return', range: [5, 30], description: 'Per day late fee', photoRequired: false }
  };

  useEffect(() => {
    fetchRentals();
  }, []);

  const fetchRentals = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/equipment/rentals/owner');
      if (response.data.success) {
        setRentals(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching rentals:', error);
      // Mock data for development
      setRentals([
        {
          id: '1',
          equipment: { name: 'Canon EOS R5', category: 'camera', brand: 'Canon', model: '5D Mark IV' },
          users: { full_name: 'Ahmed Raza', email: 'ahmed@example.com', phone: '+92 300 1234567' },
          start_date: '2024-11-25',
          end_date: '2024-11-30',
          total_days: 6,
          rental_price: 15000,
          security_deposit: 7500,
          status: 'requested',
          payment_status: 'pending',
          created_at: '2024-11-20T10:30:00',
          notes: ''
        },
        {
          id: '2',
          equipment: { name: 'Sony A7R IV', category: 'camera', brand: 'Sony', model: 'A7R IV' },
          users: { full_name: 'Sara Khan', email: 'sara@example.com', phone: '+92 321 9876543' },
          start_date: '2024-11-22',
          end_date: '2024-11-28',
          total_days: 7,
          rental_price: 15400,
          security_deposit: 7700,
          status: 'approved',
          payment_status: 'paid',
          created_at: '2024-11-18T14:15:00',
          notes: ''
        },
        {
          id: '3',
          equipment: { name: 'DJI Ronin 4D', category: 'video', brand: 'DJI', model: 'Ronin 4D' },
          users: { full_name: 'Ali Hassan', email: 'ali@example.com', phone: '+92 333 5555555' },
          start_date: '2024-11-15',
          end_date: '2024-11-20',
          total_days: 6,
          rental_price: 48000,
          security_deposit: 24000,
          status: 'active',
          payment_status: 'paid',
          created_at: '2024-11-10T09:00:00',
          notes: ''
        },
        {
          id: '4',
          equipment: { name: 'Profoto B10', category: 'lighting', brand: 'Profoto', model: 'B10' },
          users: { full_name: 'Fatima Raza', email: 'fatima@example.com', phone: '+92 345 7777777' },
          start_date: '2024-11-01',
          end_date: '2024-11-07',
          total_days: 7,
          rental_price: 10500,
          security_deposit: 5250,
          status: 'returned',
          payment_status: 'paid',
          created_at: '2024-10-28T11:00:00',
          notes: 'Returned. Deposit: Rs.5250, Deduction: Rs.0, Refund: Rs.5250. Equipment returned in good condition'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredRentals = () => {
    if (filter === 'all') return rentals;
    return rentals.filter(r => r.status === filter);
  };

  const getStatusBadge = (status) => {
    const badges = {
      'requested': 'bg-warning text-dark',
      'approved': 'bg-info',
      'active': 'bg-primary',
      'returned': 'bg-success',
      'cancelled': 'bg-danger'
    };
    return badges[status] || 'bg-secondary';
  };

  const getCategoryEmoji = (category) => {
    const emojis = {
      'camera': '📷',
      'lens': '🔭',
      'lighting': '💡',
      'audio': '🎤',
      'accessory': '🎒',
      'video': '🎥',
      'drone': '🚁',
      'support': '🗼'
    };
    return emojis[category?.toLowerCase()] || '📦';
  };

  const handleApprove = async (rentalId) => {
    setProcessing(true);
    try {
      const response = await api.put(`/api/equipment/rentals/${rentalId}/approve`);
      if (response.data.success) {
        setRentals(prev => prev.map(r =>
          r.id === rentalId ? { ...r, status: 'approved' } : r
        ));
        alert('Rental request approved! Renter will be notified to make payment.');
      }
    } catch (error) {
      console.error('Error approving rental:', error);
      alert('Failed to approve rental. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (rentalId) => {
    const reason = prompt('Please provide a reason for rejection:');
    if (!reason) return;

    setProcessing(true);
    try {
      const response = await api.put(`/api/equipment/rentals/${rentalId}/reject`, {
        status: 'cancelled',
        notes: reason
      });
      if (response.data.success) {
        setRentals(prev => prev.map(r =>
          r.id === rentalId ? { ...r, status: 'cancelled', notes: reason } : r
        ));
        alert('Rental request rejected.');
      }
    } catch (error) {
      console.error('Error rejecting rental:', error);
      alert('Failed to reject rental. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  // Calculate suggested deduction based on damage category
  const calculateSuggestedDeduction = (category, depositAmount) => {
    const cat = damageCategories[category];
    if (!cat || category === 'no_damage') return 0;
    // Return midpoint of range as suggestion
    const percentage = (cat.range[0] + cat.range[1]) / 2;
    return Math.round((depositAmount * percentage) / 100);
  };

  // Handle damage category change
  const handleDamageCategoryChange = (category) => {
    const suggestedAmount = calculateSuggestedDeduction(category, selectedRental?.security_deposit || 0);
    setReturnForm({
      ...returnForm,
      damage_category: category,
      deduction_amount: suggestedAmount
    });
  };

  // Handle photo upload
  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + returnForm.photos.length > 5) {
      alert('Maximum 5 photos allowed');
      return;
    }
    
    const newPhotos = [...returnForm.photos, ...files];
    const newPreviews = files.map(file => URL.createObjectURL(file));
    
    setReturnForm({
      ...returnForm,
      photos: newPhotos,
      photoPreview: [...returnForm.photoPreview, ...newPreviews]
    });
  };

  // Remove photo
  const removePhoto = (index) => {
    const newPhotos = returnForm.photos.filter((_, i) => i !== index);
    const newPreviews = returnForm.photoPreview.filter((_, i) => i !== index);
    setReturnForm({ ...returnForm, photos: newPhotos, photoPreview: newPreviews });
  };

  const handleActivate = async (rentalId) => {
    setProcessing(true);
    try {
      const response = await api.put(`/api/equipment/rentals/${rentalId}/activate`);
      if (response.data.success) {
        setRentals(prev => prev.map(r =>
          r.id === rentalId ? { ...r, status: 'active' } : r
        ));
        alert('Rental activated! Equipment has been handed over.');
      }
    } catch (error) {
      console.error('Error activating rental:', error);
      alert(error.response?.data?.detail || 'Failed to activate rental. Ensure payment is completed.');
    } finally {
      setProcessing(false);
    }
  };

  const handleReturn = async () => {
    if (!selectedRental) return;

    // Validate photo requirement
    const category = damageCategories[returnForm.damage_category];
    if (category.photoRequired && returnForm.photos.length === 0) {
      alert('Photo evidence is required for damage claims. Please upload at least one photo.');
      return;
    }

    // Validate deduction amount within range
    const deposit = selectedRental.security_deposit;
    const deductionPercent = (parseFloat(returnForm.deduction_amount) / deposit) * 100;
    
    if (returnForm.damage_category !== 'no_damage') {
      if (deductionPercent < category.range[0] || deductionPercent > category.range[1]) {
        if (!window.confirm(`Deduction (${deductionPercent.toFixed(0)}%) is outside the suggested range (${category.range[0]}-${category.range[1]}%). Continue?`)) {
          return;
        }
      }
    }

    // Warn about admin review for large deductions
    if (deductionPercent > 50) {
      if (!window.confirm('⚠️ Deductions over 50% require admin review. The client will be notified and can dispute this deduction within 48 hours. Continue?')) {
        return;
      }
    }

    setProcessing(true);
    try {
      // Prepare form data with photos
      const formData = new FormData();
      formData.append('deduction_amount', parseFloat(returnForm.deduction_amount) || 0);
      formData.append('damage_category', returnForm.damage_category);
      formData.append('deduction_notes', returnForm.deduction_notes);
      formData.append('requires_admin_review', deductionPercent > 50 ? 'true' : 'false');
      
      // Add photos
      returnForm.photos.forEach((photo, index) => {
        formData.append(`photos`, photo);
      });

      const response = await api.put(`/api/equipment/rentals/${selectedRental.id}/return`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (response.data.success) {
        setRentals(prev => prev.map(r =>
          r.id === selectedRental.id ? { ...r, status: 'returned' } : r
        ));
        setShowReturnModal(false);
        setSelectedRental(null);
        setReturnForm({
          damage_category: 'no_damage',
          deduction_amount: 0,
          deduction_notes: '',
          photos: [],
          photoPreview: []
        });
        
        const refundAmount = response.data.deposit_refund?.toLocaleString();
        const reviewMsg = deductionPercent > 50 ? ' (Pending admin review)' : '';
        alert(`Equipment returned! Deposit refund: Rs.${refundAmount}${reviewMsg}`);
      }
    } catch (error) {
      console.error('Error processing return:', error);
      alert('Failed to process return. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleOpenDisputeModal = (rental) => {
    setRentalForDispute(rental);
    setShowDisputeModal(true);
  };

  const handleDispute = async () => {
    if (!rentalForDispute || !disputeForm.dispute_reason || !disputeForm.description) {
      alert('Please fill in all fields');
      return;
    }

    setSubmittingDispute(true);
    try {
      const response = await api.post(`/api/equipment/rentals/${rentalForDispute.id}/dispute`, disputeForm);
      if (response.data.success) {
        alert('Dispute submitted successfully. Our team will review and respond within 24-48 hours.');
        setShowDisputeModal(false);
        setRentalForDispute(null);
        setDisputeForm({ dispute_reason: '', description: '' });
      }
    } catch (error) {
      console.error('Error submitting dispute:', error);
      // Mock success for development
      alert('Dispute submitted. Our team will review and respond within 24-48 hours.');
      setShowDisputeModal(false);
      setRentalForDispute(null);
      setDisputeForm({ dispute_reason: '', description: '' });
    } finally {
      setSubmittingDispute(false);
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-PK', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="container py-4">
      {/* Header */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
            <div>
              <h2 className="fw-bold mb-1">📦 Equipment Rental Requests</h2>
              <p className="text-muted mb-0">Manage incoming rental requests for your equipment</p>
            </div>
            <Link to="/photographer/my-equipment-listings" className="btn btn-outline-primary">
              <i className="fas fa-list me-2"></i>My Equipment Listings
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="row mb-4">
        <div className="col-md-3 col-6 mb-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body text-center py-3">
              <h3 className="mb-1 text-warning">{rentals.filter(r => r.status === 'requested').length}</h3>
              <small className="text-muted">Pending Requests</small>
            </div>
          </div>
        </div>
        <div className="col-md-3 col-6 mb-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body text-center py-3">
              <h3 className="mb-1 text-info">{rentals.filter(r => r.status === 'approved').length}</h3>
              <small className="text-muted">Awaiting Pickup</small>
            </div>
          </div>
        </div>
        <div className="col-md-3 col-6 mb-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body text-center py-3">
              <h3 className="mb-1 text-primary">{rentals.filter(r => r.status === 'active').length}</h3>
              <small className="text-muted">Active Rentals</small>
            </div>
          </div>
        </div>
        <div className="col-md-3 col-6 mb-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body text-center py-3">
              <h3 className="mb-1 text-success">{rentals.filter(r => r.status === 'returned').length}</h3>
              <small className="text-muted">Completed</small>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="btn-group flex-wrap" role="group">
            {['all', 'requested', 'approved', 'active', 'returned', 'cancelled'].map(status => (
              <button
                key={status}
                type="button"
                className={`btn ${filter === status ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setFilter(status)}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
                {status !== 'all' && ` (${rentals.filter(r => r.status === status).length})`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Rentals List */}
      <div className="row">
        <div className="col-12">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : getFilteredRentals().length === 0 ? (
            <div className="card border-0 shadow-sm">
              <div className="card-body text-center py-5">
                <div className="text-muted mb-3" style={{ fontSize: '3rem' }}>📦</div>
                <h5>No rental requests found</h5>
                <p className="text-muted">When someone requests to rent your equipment, it will appear here.</p>
              </div>
            </div>
          ) : (
            <div className="row">
              {getFilteredRentals().map(rental => (
                <div key={rental.id} className="col-md-6 col-lg-4 mb-4">
                  <div className="card border-0 shadow-sm h-100">
                    <div className="card-header bg-white border-0 pt-3 pb-0">
                      <div className="d-flex justify-content-between align-items-start">
                        <div className="d-flex align-items-center gap-2">
                          <span style={{ fontSize: '2rem' }}>
                            {getCategoryEmoji(rental.equipment?.category)}
                          </span>
                          <div>
                            <h6 className="fw-bold mb-0">{rental.equipment?.name}</h6>
                            <small className="text-muted">{rental.equipment?.brand} {rental.equipment?.model}</small>
                          </div>
                        </div>
                        <span className={`badge ${getStatusBadge(rental.status)}`}>
                          {rental.status?.toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="card-body">
                      {/* Renter Info */}
                      <div className="mb-3 pb-3 border-bottom">
                        <div className="d-flex align-items-center gap-2 mb-2">
                          <span className="badge bg-light text-dark">👤 Renter</span>
                        </div>
                        <div className="small">
                          <strong>{rental.users?.full_name}</strong><br />
                          <span className="text-muted">{rental.users?.email}</span><br />
                          <span className="text-muted">{rental.users?.phone}</span>
                        </div>
                      </div>

                      {/* Rental Details */}
                      <div className="mb-3">
                        <div className="row small">
                          <div className="col-6 mb-2">
                            <span className="text-muted">Start Date:</span><br />
                            <strong>{formatDate(rental.start_date)}</strong>
                          </div>
                          <div className="col-6 mb-2">
                            <span className="text-muted">End Date:</span><br />
                            <strong>{formatDate(rental.end_date)}</strong>
                          </div>
                          <div className="col-6 mb-2">
                            <span className="text-muted">Duration:</span><br />
                            <strong>{rental.total_days} days</strong>
                          </div>
                          <div className="col-6 mb-2">
                            <span className="text-muted">Payment:</span><br />
                            <span className={`badge ${rental.payment_status === 'paid' ? 'bg-success' : 'bg-warning text-dark'}`}>
                              {rental.payment_status?.toUpperCase()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Pricing */}
                      <div className="bg-light rounded p-2 mb-3">
                        <div className="d-flex justify-content-between small mb-1">
                          <span>Rental Fee:</span>
                          <strong>Rs. {rental.rental_price?.toLocaleString()}</strong>
                        </div>
                        <div className="d-flex justify-content-between small mb-1">
                          <span>Security Deposit:</span>
                          <strong className="text-warning">Rs. {rental.security_deposit?.toLocaleString()}</strong>
                        </div>
                        <div className="d-flex justify-content-between small border-top pt-1 mt-1">
                          <span>Total:</span>
                          <strong className="text-primary">
                            Rs. {((rental.rental_price || 0) + (rental.security_deposit || 0)).toLocaleString()}
                          </strong>
                        </div>
                      </div>

                      {/* Notes */}
                      {rental.notes && (
                        <div className="small text-muted mb-3">
                          <i className="fas fa-info-circle me-1"></i>
                          {rental.notes.length > 100 ? rental.notes.substring(0, 100) + '...' : rental.notes}
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="d-flex gap-2 flex-wrap">
                        {rental.status === 'requested' && (
                          <>
                            <button
                              className="btn btn-success btn-sm flex-grow-1"
                              onClick={() => handleApprove(rental.id)}
                              disabled={processing}
                            >
                              ✓ Approve
                            </button>
                            <button
                              className="btn btn-danger btn-sm flex-grow-1"
                              onClick={() => handleReject(rental.id)}
                              disabled={processing}
                            >
                              ✕ Reject
                            </button>
                          </>
                        )}
                        {rental.status === 'approved' && rental.payment_status === 'paid' && (
                          <button
                            className="btn btn-primary btn-sm w-100"
                            onClick={() => handleActivate(rental.id)}
                            disabled={processing}
                          >
                            📦 Mark as Picked Up
                          </button>
                        )}
                        {rental.status === 'approved' && rental.payment_status !== 'paid' && (
                          <span className="btn btn-outline-warning btn-sm w-100" disabled>
                            ⏳ Awaiting Payment
                          </span>
                        )}
                        {rental.status === 'active' && (
                          <div className="d-flex gap-2">
                            <button
                              className="btn btn-success btn-sm flex-grow-1"
                              onClick={() => {
                                setSelectedRental(rental);
                                setShowReturnModal(true);
                              }}
                              disabled={processing}
                            >
                              ✓ Return
                            </button>
                            <button
                              className="btn btn-outline-danger btn-sm"
                              onClick={() => handleOpenDisputeModal(rental)}
                              title="Report an issue"
                            >
                              ⚠️
                            </button>
                          </div>
                        )}
                        {rental.status === 'returned' && (
                          <span className="btn btn-outline-success btn-sm w-100" disabled>
                            ✓ Completed
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="card-footer bg-white border-0 pt-0">
                      <small className="text-muted">
                        Requested: {formatDate(rental.created_at)}
                      </small>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Return Modal */}
      {showReturnModal && selectedRental && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Process Equipment Return</h5>
                <button type="button" className="btn-close" onClick={() => {
                  setShowReturnModal(false);
                  setSelectedRental(null);
                  setReturnForm({
                    damage_category: 'no_damage',
                    deduction_amount: 0,
                    deduction_notes: '',
                    photos: [],
                    photoPreview: []
                  });
                }}></button>
              </div>
              <div className="modal-body">
                <div className="alert alert-info">
                  <strong>Equipment:</strong> {selectedRental.equipment?.name}<br />
                  <strong>Renter:</strong> {selectedRental.users?.full_name}<br />
                  <strong>Security Deposit:</strong> Rs. {selectedRental.security_deposit?.toLocaleString()}
                </div>

                <div className="mb-3">
                  <label className="form-label fw-bold">Damage Assessment Category *</label>
                  <select
                    className="form-select"
                    value={returnForm.damage_category}
                    onChange={(e) => handleDamageCategoryChange(e.target.value)}
                    required
                  >
                    {Object.entries(damageCategories).map(([key, cat]) => (
                      <option key={key} value={key}>
                        {cat.label} - {cat.description}
                      </option>
                    ))}
                  </select>
                  <small className="text-muted">
                    {damageCategories[returnForm.damage_category].photoRequired && '📸 Photo evidence required for this category'}
                  </small>
                </div>

                {returnForm.damage_category !== 'no_damage' && (
                  <>
                    <div className="mb-3">
                      <label className="form-label fw-bold">
                        Deduction Amount (Rs.) *
                        <small className="text-muted ms-2">
                          Suggested: Rs. {calculateSuggestedDeduction(returnForm.damage_category, selectedRental.security_deposit).toLocaleString()}
                        </small>
                      </label>
                      <input
                        type="number"
                        className="form-control"
                        min="0"
                        max={selectedRental.security_deposit}
                        value={returnForm.deduction_amount}
                        onChange={(e) => setReturnForm({ ...returnForm, deduction_amount: e.target.value })}
                        required
                      />
                      <div className="d-flex justify-content-between mt-1">
                        <small className="text-muted">
                          Range: {damageCategories[returnForm.damage_category].range[0]}% - {damageCategories[returnForm.damage_category].range[1]}% of deposit
                        </small>
                        <small className={`fw-bold ${(parseFloat(returnForm.deduction_amount) / selectedRental.security_deposit * 100) > 50 ? 'text-danger' : 'text-success'}`}>
                          {((parseFloat(returnForm.deduction_amount) / selectedRental.security_deposit * 100) || 0).toFixed(0)}% deduction
                        </small>
                      </div>
                    </div>

                    <div className="mb-3">
                      <label className="form-label fw-bold">Detailed Explanation *</label>
                      <textarea
                        className="form-control"
                        rows={3}
                        value={returnForm.deduction_notes}
                        onChange={(e) => setReturnForm({ ...returnForm, deduction_notes: e.target.value })}
                        placeholder="Describe the damage, missing parts, or reason for deduction in detail..."
                        required
                      />
                    </div>

                    {damageCategories[returnForm.damage_category].photoRequired && (
                      <div className="mb-3">
                        <label className="form-label fw-bold">
                          Photo Evidence * <small className="text-muted">(Required - Upload 1-5 photos)</small>
                        </label>
                        <input
                          type="file"
                          className="form-control"
                          accept="image/*"
                          multiple
                          onChange={handlePhotoUpload}
                        />
                        {returnForm.photoPreview.length > 0 && (
                          <div className="d-flex flex-wrap gap-2 mt-2">
                            {returnForm.photoPreview.map((preview, index) => (
                              <div key={index} className="position-relative">
                                <img src={preview} alt="Damage" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '4px' }} />
                                <button
                                  type="button"
                                  className="btn btn-danger btn-sm position-absolute top-0 end-0"
                                  style={{ padding: '0 4px', fontSize: '10px' }}
                                  onClick={() => removePhoto(index)}
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}

                <div className="alert alert-light border">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <strong>Refund to Renter:</strong>
                    </div>
                    <div className="fs-5 fw-bold text-success">
                      Rs. {(selectedRental.security_deposit - (parseFloat(returnForm.deduction_amount) || 0)).toLocaleString()}
                    </div>
                  </div>
                </div>

                {parseFloat(returnForm.deduction_amount) > 0 && (
                  <div className={`alert ${(parseFloat(returnForm.deduction_amount) / selectedRental.security_deposit * 100) > 50 ? 'alert-danger' : 'alert-warning'}`}>
                    <strong>⚠️ Important:</strong>
                    <ul className="mb-0 mt-2 small">
                      <li>Client will be notified and has 48 hours to dispute</li>
                      {(parseFloat(returnForm.deduction_amount) / selectedRental.security_deposit * 100) > 50 && (
                        <li className="text-danger fw-bold">Deductions over 50% require admin review before processing</li>
                      )}
                      <li>Photo evidence and detailed notes strengthen your case</li>
                    </ul>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowReturnModal(false);
                    setSelectedRental(null);
                    setReturnForm({
                      damage_category: 'no_damage',
                      deduction_amount: 0,
                      deduction_notes: '',
                      photos: [],
                      photoPreview: []
                    });
                  }}
                  disabled={processing}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-success"
                  onClick={handleReturn}
                  disabled={processing}
                >
                  {processing ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Processing...
                    </>
                  ) : (
                    <>✓ Confirm Return & Release Deposit</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dispute Modal */}
      {showDisputeModal && rentalForDispute && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999 }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header bg-danger text-white">
                <h5 className="modal-title">⚠️ Report an Issue</h5>
                <button 
                  type="button" 
                  className="btn-close btn-close-white" 
                  onClick={() => {
                    setShowDisputeModal(false);
                    setRentalForDispute(null);
                    setDisputeForm({ dispute_reason: '', description: '' });
                  }}
                ></button>
              </div>
              <div className="modal-body">
                <div className="alert alert-info mb-3">
                  <small>
                    <strong>Rental:</strong> {rentalForDispute.equipment?.name || 'Equipment'}<br />
                    <strong>Renter:</strong> {rentalForDispute.renter?.name || 'Client'}
                  </small>
                </div>

                <div className="mb-3">
                  <label className="form-label">Issue Type *</label>
                  <select
                    className="form-select"
                    value={disputeForm.dispute_reason}
                    onChange={(e) => setDisputeForm({ ...disputeForm, dispute_reason: e.target.value })}
                    required
                  >
                    <option value="">Select issue type...</option>
                    <option value="equipment_damage">Equipment Damage</option>
                    <option value="late_return">Late Return</option>
                    <option value="missing_parts">Missing Parts/Accessories</option>
                    <option value="renter_misconduct">Renter Misconduct</option>
                    <option value="payment_issue">Payment Issue</option>
                    <option value="other">Other Issue</option>
                  </select>
                </div>

                <div className="mb-3">
                  <label className="form-label">Description *</label>
                  <textarea
                    className="form-control"
                    rows={4}
                    value={disputeForm.description}
                    onChange={(e) => setDisputeForm({ ...disputeForm, description: e.target.value })}
                    placeholder="Please describe the issue in detail..."
                    required
                  />
                </div>

                <div className="alert alert-warning">
                  <small>
                    <strong>Note:</strong> Our support team will review your dispute within 24-48 hours. 
                    You may be asked to provide evidence such as photos or documentation.
                  </small>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowDisputeModal(false);
                    setRentalForDispute(null);
                    setDisputeForm({ dispute_reason: '', description: '' });
                  }}
                  disabled={submittingDispute}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-danger"
                  onClick={handleDispute}
                  disabled={submittingDispute || !disputeForm.dispute_reason || !disputeForm.description}
                >
                  {submittingDispute ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Submitting...
                    </>
                  ) : (
                    'Submit Dispute'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OwnerRentalRequests;
