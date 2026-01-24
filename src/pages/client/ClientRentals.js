"use client"

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/api';

const ClientRentals = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedRental, setSelectedRental] = useState(null);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [disputeForm, setDisputeForm] = useState({
    dispute_reason: '',
    description: ''
  });

  useEffect(() => {
    fetchRentals();
  }, []);

  const fetchRentals = async () => {
    setLoading(true);
    try {
      const response = await api.get('/equipment/rentals/my');
      if (response.data.success) {
        setRentals(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching rentals:', error);
      // Mock data for development
      setRentals([
        {
          id: '1',
          equipment: {
            name: 'Canon EOS R5',
            category: 'camera',
            brand: 'Canon',
            model: '5D Mark IV',
            photographer_profile: { business_name: 'Pro Gear Rentals', city: 'Lahore' }
          },
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
          equipment: {
            name: 'Sony A7R IV',
            category: 'camera',
            brand: 'Sony',
            model: 'A7R IV',
            photographer_profile: { business_name: 'Camera World', city: 'Karachi' }
          },
          start_date: '2024-11-22',
          end_date: '2024-11-28',
          total_days: 7,
          rental_price: 15400,
          security_deposit: 7700,
          status: 'approved',
          payment_status: 'pending',
          created_at: '2024-11-18T14:15:00',
          notes: ''
        },
        {
          id: '3',
          equipment: {
            name: 'DJI Ronin 4D',
            category: 'video',
            brand: 'DJI',
            model: 'Ronin 4D',
            photographer_profile: { business_name: 'Video Pro Hub', city: 'Islamabad' }
          },
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
          equipment: {
            name: 'Profoto B10',
            category: 'lighting',
            brand: 'Profoto',
            model: 'B10',
            photographer_profile: { business_name: 'Lighting Solutions', city: 'Lahore' }
          },
          start_date: '2024-11-01',
          end_date: '2024-11-07',
          total_days: 7,
          rental_price: 10500,
          security_deposit: 5250,
          status: 'returned',
          payment_status: 'paid',
          created_at: '2024-10-28T11:00:00',
          notes: 'Deposit refunded: Rs.5250'
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
      'requested': { class: 'bg-warning text-dark', label: '⏳ Pending Approval' },
      'approved': { class: 'bg-info', label: '✓ Approved - Awaiting Payment' },
      'active': { class: 'bg-primary', label: '📦 Active Rental' },
      'returned': { class: 'bg-success', label: '✓ Completed' },
      'cancelled': { class: 'bg-danger', label: '✕ Cancelled' }
    };
    return badges[status] || { class: 'bg-secondary', label: status };
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

  const handlePayNow = async (rental) => {
    try {
      const response = await api.post(`/equipment/rentals/${rental.id}/pay`);
      if (response.data.success) {
        // Store payment info and redirect to payment
        const paymentData = {
          rentalId: rental.id,
          amount: response.data.amount,
          rental_price: response.data.rental_price,
          security_deposit: response.data.security_deposit,
          payment_intent_id: response.data.payment_intent_id
        };
        localStorage.setItem('pending_rental_payment', JSON.stringify(paymentData));
        
        // For now, simulate payment success
        await handleConfirmPayment(rental.id);
      }
    } catch (error) {
      console.error('Error initiating payment:', error);
      alert(error.response?.data?.detail || 'Failed to initiate payment');
    }
  };

  const handleConfirmPayment = async (rentalId) => {
    try {
      const response = await api.post(`/equipment/rentals/${rentalId}/confirm-payment`);
      if (response.data.success) {
        setRentals(prev => prev.map(r =>
          r.id === rentalId ? { ...r, payment_status: 'paid' } : r
        ));
        alert('Payment successful! You can now pick up the equipment from the owner.');
        fetchRentals();
      }
    } catch (error) {
      console.error('Error confirming payment:', error);
      alert('Failed to confirm payment');
    }
  };

  const handleDispute = async () => {
    if (!selectedRental || !disputeForm.dispute_reason || !disputeForm.description) {
      alert('Please fill in all fields');
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.post(`/equipment/rentals/${selectedRental.id}/dispute`, disputeForm);
      if (response.data.success) {
        alert('Dispute submitted successfully. Our team will review and respond within 24-48 hours.');
        setShowDisputeModal(false);
        setSelectedRental(null);
        setDisputeForm({ dispute_reason: '', description: '' });
      }
    } catch (error) {
      console.error('Error submitting dispute:', error);
      alert('Failed to submit dispute. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-PK', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getDaysRemaining = (endDate) => {
    const end = new Date(endDate);
    const now = new Date();
    const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <div className="container py-4">
      {/* Header */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
            <div>
              <h2 className="fw-bold mb-1">📦 My Equipment Rentals</h2>
              <p className="text-muted mb-0">Track and manage your equipment rentals</p>
            </div>
            <Link to="/photographer/equipment" className="btn btn-primary">
              <i className="fas fa-plus me-2"></i>Rent More Equipment
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
              <small className="text-muted">Pending Approval</small>
            </div>
          </div>
        </div>
        <div className="col-md-3 col-6 mb-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body text-center py-3">
              <h3 className="mb-1 text-info">{rentals.filter(r => r.status === 'approved').length}</h3>
              <small className="text-muted">Ready for Pickup</small>
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
            {['all', 'requested', 'approved', 'active', 'returned'].map(status => (
              <button
                key={status}
                type="button"
                className={`btn ${filter === status ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setFilter(status)}
              >
                {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
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
                <h5>No rentals found</h5>
                <p className="text-muted mb-3">You haven't rented any equipment yet.</p>
                <Link to="/photographer/equipment" className="btn btn-primary">
                  Browse Equipment
                </Link>
              </div>
            </div>
          ) : (
            <div className="row">
              {getFilteredRentals().map(rental => (
                <div key={rental.id} className="col-md-6 mb-4">
                  <div className="card border-0 shadow-sm h-100">
                    <div className="card-body">
                      {/* Header */}
                      <div className="d-flex justify-content-between align-items-start mb-3">
                        <div className="d-flex align-items-center gap-3">
                          <span style={{ fontSize: '2.5rem' }}>
                            {getCategoryEmoji(rental.equipment?.category)}
                          </span>
                          <div>
                            <h5 className="fw-bold mb-1">{rental.equipment?.name}</h5>
                            <small className="text-muted">
                              {rental.equipment?.brand} {rental.equipment?.model}
                            </small>
                          </div>
                        </div>
                        <span className={`badge ${getStatusBadge(rental.status).class}`}>
                          {getStatusBadge(rental.status).label}
                        </span>
                      </div>

                      {/* Owner Info */}
                      <div className="mb-3 pb-3 border-bottom">
                        <small className="text-muted">Equipment Owner:</small>
                        <div className="fw-semibold">
                          {rental.equipment?.photographer_profile?.business_name || 'N/A'}
                          <span className="text-muted ms-2">
                            ({rental.equipment?.photographer_profile?.city || 'N/A'})
                          </span>
                        </div>
                      </div>

                      {/* Rental Details */}
                      <div className="row mb-3">
                        <div className="col-6">
                          <small className="text-muted d-block">Rental Period</small>
                          <strong>{formatDate(rental.start_date)}</strong>
                          <span className="text-muted mx-1">to</span>
                          <strong>{formatDate(rental.end_date)}</strong>
                          <br />
                          <small className="text-muted">({rental.total_days} days)</small>
                        </div>
                        <div className="col-6 text-end">
                          {rental.status === 'active' && (
                            <div className={`badge ${getDaysRemaining(rental.end_date) <= 2 ? 'bg-danger' : 'bg-info'} p-2`}>
                              {getDaysRemaining(rental.end_date) > 0 
                                ? `${getDaysRemaining(rental.end_date)} days left`
                                : 'Return due!'
                              }
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Pricing */}
                      <div className="bg-light rounded p-3 mb-3">
                        <div className="row small">
                          <div className="col-6">
                            <span className="text-muted">Rental Fee:</span>
                            <span className="fw-bold ms-2">Rs. {rental.rental_price?.toLocaleString()}</span>
                          </div>
                          <div className="col-6 text-end">
                            <span className="text-muted">Deposit:</span>
                            <span className="fw-bold text-warning ms-2">Rs. {rental.security_deposit?.toLocaleString()}</span>
                          </div>
                        </div>
                        <div className="d-flex justify-content-between mt-2 pt-2 border-top">
                          <span>Total Amount:</span>
                          <strong className="text-primary">
                            Rs. {((rental.rental_price || 0) + (rental.security_deposit || 0)).toLocaleString()}
                          </strong>
                        </div>
                      </div>

                      {/* Notes */}
                      {rental.notes && (
                        <div className="small text-muted mb-3 p-2 bg-light rounded">
                          <i className="fas fa-info-circle me-1"></i> {rental.notes}
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="d-flex gap-2 flex-wrap">
                        {rental.status === 'requested' && (
                          <span className="btn btn-outline-warning btn-sm flex-grow-1" disabled>
                            ⏳ Awaiting Owner Approval
                          </span>
                        )}
                        
                        {rental.status === 'approved' && rental.payment_status !== 'paid' && (
                          <button
                            className="btn btn-success btn-sm flex-grow-1"
                            onClick={() => handlePayNow(rental)}
                          >
                            💳 Pay Now (Rs. {((rental.rental_price || 0) + (rental.security_deposit || 0)).toLocaleString()})
                          </button>
                        )}
                        
                        {rental.status === 'approved' && rental.payment_status === 'paid' && (
                          <span className="btn btn-outline-info btn-sm flex-grow-1" disabled>
                            📍 Ready for Pickup
                          </span>
                        )}
                        
                        {rental.status === 'active' && (
                          <>
                            <span className="btn btn-outline-primary btn-sm flex-grow-1" disabled>
                              📦 Equipment with You
                            </span>
                            <button
                              className="btn btn-outline-danger btn-sm"
                              onClick={() => {
                                setSelectedRental(rental);
                                setShowDisputeModal(true);
                              }}
                              title="Report Issue"
                            >
                              ⚠️ Issue
                            </button>
                          </>
                        )}
                        
                        {rental.status === 'returned' && (
                          <span className="btn btn-outline-success btn-sm flex-grow-1" disabled>
                            ✓ Rental Completed
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="card-footer bg-white border-0 pt-0">
                      <small className="text-muted">
                        Booked on: {formatDate(rental.created_at)}
                      </small>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Dispute Modal */}
      {showDisputeModal && selectedRental && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Report an Issue</h5>
                <button type="button" className="btn-close" onClick={() => setShowDisputeModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="alert alert-info">
                  <strong>Equipment:</strong> {selectedRental.equipment?.name}
                </div>

                <div className="mb-3">
                  <label className="form-label">Issue Type <span className="text-danger">*</span></label>
                  <select
                    className="form-select"
                    value={disputeForm.dispute_reason}
                    onChange={(e) => setDisputeForm({ ...disputeForm, dispute_reason: e.target.value })}
                  >
                    <option value="">Select issue type...</option>
                    <option value="Equipment Damage">Equipment was damaged when received</option>
                    <option value="Wrong Equipment">Received different equipment than listed</option>
                    <option value="Missing Accessories">Missing accessories or parts</option>
                    <option value="Equipment Malfunction">Equipment not working properly</option>
                    <option value="Owner Dispute">Dispute with equipment owner</option>
                    <option value="Deposit Issue">Issue with security deposit</option>
                    <option value="Other">Other issue</option>
                  </select>
                </div>

                <div className="mb-3">
                  <label className="form-label">Description <span className="text-danger">*</span></label>
                  <textarea
                    className="form-control"
                    rows={4}
                    placeholder="Please describe the issue in detail..."
                    value={disputeForm.description}
                    onChange={(e) => setDisputeForm({ ...disputeForm, description: e.target.value })}
                  />
                </div>

                <div className="alert alert-warning">
                  <small>
                    <strong>Note:</strong> Our support team will review your dispute and respond within 24-48 hours.
                    Please provide as much detail as possible.
                  </small>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowDisputeModal(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-danger"
                  onClick={handleDispute}
                  disabled={submitting || !disputeForm.dispute_reason || !disputeForm.description}
                >
                  {submitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Submitting...
                    </>
                  ) : (
                    <>Submit Dispute</>
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

export default ClientRentals;
