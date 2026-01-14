import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import EscrowStatus from '../../components/EscrowStatus';

const API_BASE = 'http://localhost:5000/api';

const ClientBookings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [equipmentRentals, setEquipmentRentals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('all'); // 'all', 'bookings', 'rentals'
  
  // Tip Modal State
  const [showTipModal, setShowTipModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [tipAmount, setTipAmount] = useState(1000);
  const [tipMessage, setTipMessage] = useState('');
  const [tipSuggestions, setTipSuggestions] = useState(null);
  const [tippedBookings, setTippedBookings] = useState({});
  const [tipLoading, setTipLoading] = useState(false);

  // Mock bookings data
  const mockBookings = [
    {
      id: 1,
      photographerId: 1,
      photographerName: "Ahmed Photography",
      photographerImage: "📸",
      serviceType: "Wedding Photography",
      date: "2024-12-15",
      time: "14:00",
      duration: "4 hours",
      location: "Lahore",
      totalAmount: 20000,
      status: "confirmed",
      paidAmount: 10000,
      remainingAmount: 10000,
      specialRequests: "Golden hour portraits preferred",
      createdAt: "2024-11-01",
      imagesDelivered: 45,
      totalImages: 150
    },
    {
      id: 2,
      photographerId: 2,
      photographerName: "Sara Visuals",
      photographerImage: "📷",
      serviceType: "Portrait Photography",
      date: "2024-12-20",
      time: "10:00",
      duration: "2 hours",
      location: "Islamabad",
      totalAmount: 8000,
      status: "pending",
      paidAmount: 0,
      remainingAmount: 8000,
      specialRequests: "Studio portraits with professional lighting",
      createdAt: "2024-11-10",
      imagesDelivered: 0,
      totalImages: 50
    },
    {
      id: 3,
      photographerId: 3,
      photographerName: "Maverick Lens",
      photographerImage: "🎥",
      serviceType: "Event Photography",
      date: "2024-11-28",
      time: "18:00",
      duration: "6 hours",
      location: "Rawalpindi",
      totalAmount: 25000,
      status: "completed",
      paidAmount: 25000,
      remainingAmount: 0,
      specialRequests: "Corporate event coverage",
      createdAt: "2024-11-05",
      imagesDelivered: 200,
      totalImages: 300
    },
    {
      id: 4,
      photographerId: 4,
      photographerName: "Pixel Perfect",
      photographerImage: "📹",
      serviceType: "Product Photography",
      date: "2024-12-01",
      time: "11:00",
      duration: "3 hours",
      location: "Karachi",
      totalAmount: 12000,
      status: "cancelled",
      paidAmount: 0,
      remainingAmount: 0,
      specialRequests: "E-commerce product shots",
      createdAt: "2024-10-28",
      imagesDelivered: 0,
      totalImages: 80
    }
  ];

  useEffect(() => {
    // Simulate API call to fetch bookings
    setTimeout(() => {
      const userBookings = mockBookings.filter(booking => booking.clientId === user?.id || true); // Mock filter
      setBookings(userBookings);
      
      // Load equipment rentals from localStorage
      const savedRentals = JSON.parse(localStorage.getItem('equipmentRentals') || '[]');
      setEquipmentRentals(savedRentals);
      
      setLoading(false);
    }, 1000);
  }, [user]);

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { color: 'warning', icon: '⏳', text: 'Pending' },
      confirmed: { color: 'success', icon: '✅', text: 'Confirmed' },
      completed: { color: 'info', icon: '🎉', text: 'Completed' },
      cancelled: { color: 'danger', icon: '❌', text: 'Cancelled' }
    };
    
    const config = statusConfig[status] || statusConfig.pending;
    return (
      <span className={`badge bg-${config.color} d-inline-flex align-items-center`}>
        <span className="me-1">{config.icon}</span>
        {config.text}
      </span>
    );
  };

  const filteredBookings = bookings.filter(booking => {
    const matchesFilter = filter === 'all' || booking.status === filter;
    const matchesSearch = booking.photographerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         booking.serviceType.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         booking.location.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const filteredRentals = equipmentRentals.filter(rental => {
    const matchesFilter = filter === 'all' || rental.status === filter;
    const matchesSearch = searchTerm === '' ||
      rental.equipmentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rental.equipmentCategory?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rental.ownerName?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Determine what to display based on view mode
  const showBookings = viewMode === 'all' || viewMode === 'bookings';
  const showRentals = viewMode === 'all' || viewMode === 'rentals';

  const handlePayRemaining = (bookingId) => {
    navigate(`/payment/${bookingId}`);
  };

  const handleReschedule = (bookingId) => {
    navigate(`/booking/reschedule/${bookingId}`);
  };

  const handleViewGallery = (bookingId) => {
    navigate(`/booking/gallery/${bookingId}`);
  };

  const handleLeaveReview = (photographerId) => {
    navigate(`/client/review/${photographerId}`);
  };

  const handleCancel = (bookingId) => {
    if (window.confirm('Are you sure you want to cancel this booking?')) {
      // Simulate cancellation
      setBookings(prev => prev.map(booking => 
        booking.id === bookingId 
          ? { ...booking, status: 'cancelled' }
          : booking
      ));
      alert('Booking cancelled successfully');
    }
  };

  // Tip Functions
  const openTipModal = async (booking) => {
    setSelectedBooking(booking);
    setTipAmount(1000);
    setTipMessage('');
    setShowTipModal(true);
    
    // Fetch tip suggestions based on booking amount
    try {
      const res = await fetch(`${API_BASE}/payments/tips/suggestions/${booking.totalAmount}`);
      const data = await res.json();
      if (data.status === 'success') {
        setTipSuggestions(data);
      }
    } catch (err) {
      console.error('Failed to fetch tip suggestions:', err);
    }
  };

  const handleSendTip = async () => {
    if (!selectedBooking || tipAmount < 100) return;
    
    setTipLoading(true);
    try {
      const res = await fetch(`${API_BASE}/payments/tips/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: String(selectedBooking.id),
          client_id: user?.id || user?.email || 'client-1',
          client_name: user?.name || 'Client',
          photographer_id: String(selectedBooking.photographerId),
          photographer_name: selectedBooking.photographerName,
          amount: tipAmount,
          message: tipMessage || null,
          payment_method: 'card'
        })
      });
      
      const data = await res.json();
      
      if (data.status === 'success') {
        setTippedBookings(prev => ({ ...prev, [selectedBooking.id]: data.tip }));
        setShowTipModal(false);
        alert(`💝 Tip of PKR ${tipAmount.toLocaleString()} sent successfully to ${selectedBooking.photographerName}!`);
      } else {
        alert(data.message || 'Failed to send tip');
      }
    } catch (err) {
      console.error('Failed to send tip:', err);
      alert('Failed to send tip. Please try again.');
    } finally {
      setTipLoading(false);
    }
  };

  const getPaymentProgress = (paid, total) => {
    const percentage = (paid / total) * 100;
    return (
      <div className="progress" style={{ height: '6px' }}>
        <div 
          className="progress-bar bg-primary" 
          style={{ width: `${percentage}%` }}
        />
      </div>
    );
  };

  if (loading) {
    return (
      <div className="client-bookings py-4">
        <div className="container">
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-3">Loading your bookings...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="client-bookings py-4">
      <div className="container">
        {/* Header */}
        <div className="gradient-header rounded-3 p-4 mb-4">
          <div className="row align-items-center">
            <div className="col-md-8">
              <h1 className="fw-bold mb-2">📅 My Bookings & Rentals</h1>
              <p className="mb-0">Manage and track all your photography bookings and equipment rentals</p>
            </div>
            <div className="col-md-4 text-md-end">
              <div className="text-white">
                <div className="small opacity-75">Total Bookings</div>
                <div className="h4 fw-bold">{bookings.length + equipmentRentals.length}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="row mb-4">
          <div className="col-md-3">
            <div className="card border-0 shadow-sm">
              <div className="card-body text-center">
                <div className="text-primary mb-2" style={{ fontSize: '2rem' }}>⏳</div>
                <div className="h5 fw-bold">Pending</div>
                <div className="text-muted">{bookings.filter(b => b.status === 'pending').length}</div>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card border-0 shadow-sm">
              <div className="card-body text-center">
                <div className="text-success mb-2" style={{ fontSize: '2rem' }}>✅</div>
                <div className="h5 fw-bold">Confirmed</div>
                <div className="text-muted">{bookings.filter(b => b.status === 'confirmed').length}</div>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card border-0 shadow-sm">
              <div className="card-body text-center">
                <div className="text-info mb-2" style={{ fontSize: '2rem' }}>🎉</div>
                <div className="h5 fw-bold">Completed</div>
                <div className="text-muted">{bookings.filter(b => b.status === 'completed').length}</div>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card border-0 shadow-sm">
              <div className="card-body text-center">
                <div className="text-warning mb-2" style={{ fontSize: '2rem' }}>💰</div>
                <div className="h5 fw-bold">Total Spent</div>
                <div className="text-muted">Rs. {bookings.reduce((sum, b) => sum + b.paidAmount, 0).toLocaleString()}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body">
            {/* View Mode Toggle */}
            <div className="mb-3">
              <div className="btn-group w-100" role="group">
                <button
                  className={`btn ${viewMode === 'all' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setViewMode('all')}
                >
                  📋 All ({bookings.length + equipmentRentals.length})
                </button>
                <button
                  className={`btn ${viewMode === 'bookings' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setViewMode('bookings')}
                >
                  📸 Photographer Bookings ({bookings.length})
                </button>
                <button
                  className={`btn ${viewMode === 'rentals' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setViewMode('rentals')}
                >
                  🎥 Equipment Rentals ({equipmentRentals.length})
                </button>
              </div>
            </div>
            
            <div className="row align-items-center">
              <div className="col-md-4">
                <label className="form-label fw-semibold">Filter by Status</label>
                <select 
                  className="form-select"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                >
                  <option value="all">All Bookings</option>
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div className="col-md-8">
                <label className="form-label fw-semibold">Search Bookings</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search by photographer, service, equipment, or location..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Bookings List */}
        {(showBookings && filteredBookings.length === 0) && (showRentals && filteredRentals.length === 0) ? (
          <div className="card border-0 shadow-sm">
            <div className="card-body text-center py-5">
              <div className="text-muted mb-3" style={{ fontSize: '3rem' }}>📅</div>
              <h4 className="fw-bold mb-3">No Bookings Found</h4>
              <p className="text-muted mb-4">
                {searchTerm || filter !== 'all' 
                  ? 'Try adjusting your filters or search terms'
                  : 'You haven\'t made any bookings yet'
                }
              </p>
              <Link to="/search" className="btn btn-primary" onClick={() => window.scrollTo(0, 0)}>
                Find Photographers
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Photographer Bookings */}
            {showBookings && filteredBookings.length > 0 && (
              <>
                {viewMode === 'all' && (
                  <h4 className="fw-bold mb-3 mt-4">📸 Photographer Bookings</h4>
                )}
                {filteredBookings.map((booking) => (
              <div key={booking.id} className="card border-0 shadow-sm">
                <div className="card-body">
                  <div className="row align-items-start">
                    {/* Photographer Info */}
                    <div className="col-md-3">
                      <div className="d-flex align-items-center mb-3">
                        <div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center me-3" 
                             style={{ width: '50px', height: '50px', fontSize: '1.5rem' }}>
                          {booking.photographerImage}
                        </div>
                        <div>
                          <h6 className="fw-bold mb-1">{booking.photographerName}</h6>
                          <div className="text-muted small">{booking.serviceType}</div>
                        </div>
                      </div>
                    </div>

                    {/* Booking Details */}
                    <div className="col-md-4">
                      <div className="mb-2">
                        <span className="text-muted small">Date & Time:</span>
                        <div className="fw-semibold">
                          📅 {new Date(booking.date).toLocaleDateString()} at {booking.time}
                        </div>
                      </div>
                      <div className="mb-2">
                        <span className="text-muted small">Duration:</span>
                        <div className="fw-semibold">⏱️ {booking.duration}</div>
                      </div>
                      <div>
                        <span className="text-muted small">Location:</span>
                        <div className="fw-semibold">📍 {booking.location}</div>
                      </div>
                    </div>

                    {/* Payment Info */}
                    <div className="col-md-2">
                      <div className="mb-2">
                        <span className="text-muted small">Total Amount:</span>
                        <div className="fw-bold text-primary">Rs. {booking.totalAmount.toLocaleString()}</div>
                      </div>
                      <div className="mb-2">
                        <span className="text-muted small">Paid:</span>
                        <div className="fw-semibold">Rs. {booking.paidAmount.toLocaleString()}</div>
                      </div>
                      <div className="mb-2">
                        <span className="text-muted small">Remaining:</span>
                        <div className="fw-semibold text-warning">Rs. {booking.remainingAmount.toLocaleString()}</div>
                      </div>
                      {getPaymentProgress(booking.paidAmount, booking.totalAmount)}
                    </div>

                    {/* Actions */}
                    <div className="col-md-3 text-end">
                      <div className="mb-2">
                        {getStatusBadge(booking.status)}
                      </div>
                      <div className="d-flex flex-column gap-1">
                        {booking.status === 'confirmed' && booking.remainingAmount > 0 && (
                          <button 
                            className="btn btn-primary btn-sm"
                            onClick={() => handlePayRemaining(booking.id)}
                          >
                            💰 Pay Remaining
                          </button>
                        )}
                        {(booking.status === 'confirmed' || booking.status === 'pending') && (
                          <button 
                            className="btn btn-outline-primary btn-sm"
                            onClick={() => handleReschedule(booking.id)}
                          >
                            📅 Reschedule
                          </button>
                        )}
                        {booking.status === 'completed' && (
                          <>
                            <button 
                              className="btn btn-primary btn-sm"
                              onClick={() => handleViewGallery(booking.id)}
                            >
                              🎨 View Gallery ({booking.imagesDelivered}/{booking.totalImages})
                            </button>
                            <button 
                              className="btn btn-outline-primary btn-sm"
                              onClick={() => handleLeaveReview(booking.photographerId)}
                            >
                              ⭐ Leave Review
                            </button>
                            {tippedBookings[booking.id] ? (
                              <span className="btn btn-success btn-sm disabled">
                                💝 Tip Sent (Rs. {tippedBookings[booking.id].amount.toLocaleString()})
                              </span>
                            ) : (
                              <button 
                                className="btn btn-outline-success btn-sm"
                                onClick={() => openTipModal(booking)}
                              >
                                💝 Send Tip
                              </button>
                            )}
                          </>
                        )}
                        {(booking.status === 'pending' || booking.status === 'confirmed') && (
                          <button 
                            className="btn btn-outline-danger btn-sm"
                            onClick={() => handleCancel(booking.id)}
                          >
                            ❌ Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Special Requests */}
                  {booking.specialRequests && (
                    <div className="mt-3 pt-3 border-top">
                      <small className="text-muted">Special Requests:</small>
                      <div className="text-muted small mt-1">{booking.specialRequests}</div>
                    </div>
                  )}

                  {/* Escrow Status - Show payment escrow info */}
                  {booking.paidAmount > 0 && (
                    <div className="mt-3">
                      <EscrowStatus
                        booking={{
                          ...booking,
                          transactionId: booking.transactionId || `txn_${booking.id}`,
                          escrowStatus: booking.escrowStatus || 'held',
                          paymentDate: booking.createdAt
                        }}
                        userRole="client"
                        onRelease={(bookingId) => {
                          console.log('Payment released for booking:', bookingId);
                          // Refresh bookings list
                          window.location.reload();
                        }}
                        onRefund={(bookingId, result) => {
                          console.log('Refund processed for booking:', bookingId, result);
                          // Refresh bookings list
                          window.location.reload();
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
              </>
            )}

            {/* Equipment Rentals */}
            {showRentals && filteredRentals.length > 0 && (
              <>
                {viewMode === 'all' && (
                  <h4 className="fw-bold mb-3 mt-4">🎥 Equipment Rentals</h4>
                )}
                {filteredRentals.map((rental) => (
                  <div key={rental.id} className="card border-0 shadow-sm">
                    <div className="card-body">
                      <div className="row align-items-start">
                        {/* Equipment Info */}
                        <div className="col-md-3">
                          <div className="d-flex align-items-center mb-3">
                            <div className="rounded-circle bg-info text-white d-flex align-items-center justify-content-center me-3" 
                                 style={{ width: '50px', height: '50px', fontSize: '1.5rem' }}>
                              {rental.equipmentImage || '🎥'}
                            </div>
                            <div>
                              <h6 className="fw-bold mb-1">{rental.equipmentName}</h6>
                              <div className="text-muted small">{rental.equipmentCategory}</div>
                            </div>
                          </div>
                        </div>

                        {/* Rental Details */}
                        <div className="col-md-4">
                          <div className="mb-2">
                            <span className="text-muted small">Rental Period:</span>
                            <div className="fw-semibold">
                              📅 {new Date(rental.startDate).toLocaleDateString()} ({rental.rentalDays} days)
                            </div>
                          </div>
                          <div className="mb-2">
                            <span className="text-muted small">Rental Type:</span>
                            <div className="fw-semibold">⏱️ {rental.period.charAt(0).toUpperCase() + rental.period.slice(1)}</div>
                          </div>
                          <div>
                            <span className="text-muted small">Owner:</span>
                            <div className="fw-semibold">📍 {rental.ownerName}</div>
                          </div>
                        </div>

                        {/* Payment Info */}
                        <div className="col-md-2">
                          <div className="mb-2">
                            <span className="text-muted small">Rental Cost:</span>
                            <div className="fw-semibold text-primary">Rs. {rental.rentalCost.toLocaleString()}</div>
                          </div>
                          <div className="mb-2">
                            <span className="text-muted small">Deposit:</span>
                            <div className="fw-semibold text-warning">Rs. {rental.deposit.toLocaleString()}</div>
                          </div>
                          <div className="mb-2">
                            <span className="text-muted small">Total Paid:</span>
                            <div className="fw-bold text-success">Rs. {rental.totalAmount.toLocaleString()}</div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="col-md-3 text-end">
                          <div className="mb-2">
                            {getStatusBadge(rental.status)}
                          </div>
                          <div className="d-flex flex-column gap-1">
                            {rental.status === 'confirmed' && (
                              <>
                                <Link
                                  to={`/photographer/equipment/${rental.equipmentId}`}
                                  className="btn btn-outline-primary btn-sm"
                                >
                                  📋 View Equipment
                                </Link>
                                <button 
                                  className="btn btn-outline-primary btn-sm"
                                  onClick={() => alert(`Contact: ${rental.ownerPhone}`)}
                                >
                                  📞 Contact Owner
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Rental ID */}
                      <div className="mt-3 pt-3 border-top">
                        <small className="text-muted">Rental ID: {rental.id}</small>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* Tip Modal */}
        {showTipModal && selectedBooking && (
          <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header border-0 pb-0">
                  <h5 className="modal-title fw-bold">💝 Send a Tip</h5>
                  <button 
                    type="button" 
                    className="btn-close" 
                    onClick={() => setShowTipModal(false)}
                  />
                </div>
                <div className="modal-body">
                  <div className="text-center mb-4">
                    <div className="rounded-circle bg-primary text-white d-inline-flex align-items-center justify-content-center mb-3" 
                         style={{ width: '80px', height: '80px', fontSize: '2.5rem' }}>
                      {selectedBooking.photographerImage}
                    </div>
                    <h5 className="fw-bold mb-1">{selectedBooking.photographerName}</h5>
                    <p className="text-muted mb-0">{selectedBooking.serviceType}</p>
                  </div>

                  <div className="alert alert-success d-flex align-items-center">
                    <span className="me-2">✨</span>
                    <small>100% of your tip goes directly to the photographer!</small>
                  </div>

                  {/* Quick Tip Amounts */}
                  <div className="mb-4">
                    <label className="form-label fw-semibold">Quick Select</label>
                    <div className="d-flex gap-2 flex-wrap">
                      {(tipSuggestions?.preset_amounts || [500, 1000, 2000, 5000]).map(amount => (
                        <button
                          key={amount}
                          className={`btn ${tipAmount === amount ? 'btn-primary' : 'btn-outline-primary'}`}
                          onClick={() => setTipAmount(amount)}
                        >
                          Rs. {amount.toLocaleString()}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Percentage Tips */}
                  {tipSuggestions?.percentage_tips && (
                    <div className="mb-4">
                      <label className="form-label fw-semibold">Or choose by percentage</label>
                      <div className="d-flex gap-2 flex-wrap">
                        {tipSuggestions.percentage_tips.map(tip => (
                          <button
                            key={tip.percentage}
                            className={`btn btn-sm ${tipAmount === tip.amount ? 'btn-success' : 'btn-outline-success'}`}
                            onClick={() => setTipAmount(tip.amount)}
                          >
                            {tip.label} (Rs. {tip.amount.toLocaleString()})
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Custom Amount */}
                  <div className="mb-4">
                    <label className="form-label fw-semibold">Custom Amount</label>
                    <div className="input-group">
                      <span className="input-group-text">Rs.</span>
                      <input
                        type="number"
                        className="form-control"
                        value={tipAmount}
                        onChange={(e) => setTipAmount(Math.max(100, Math.min(50000, parseInt(e.target.value) || 0)))}
                        min="100"
                        max="50000"
                      />
                    </div>
                    <small className="text-muted">Min: Rs. 100 | Max: Rs. 50,000</small>
                  </div>

                  {/* Message */}
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Add a message (optional)</label>
                    <textarea
                      className="form-control"
                      rows="2"
                      placeholder="Thank you for the amazing photos!"
                      value={tipMessage}
                      onChange={(e) => setTipMessage(e.target.value)}
                      maxLength={200}
                    />
                    <small className="text-muted">{tipMessage.length}/200 characters</small>
                  </div>
                </div>
                <div className="modal-footer border-0 pt-0">
                  <button 
                    type="button" 
                    className="btn btn-outline-secondary" 
                    onClick={() => setShowTipModal(false)}
                  >
                    Cancel
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-success d-flex align-items-center gap-2"
                    onClick={handleSendTip}
                    disabled={tipLoading || tipAmount < 100}
                  >
                    {tipLoading ? (
                      <>
                        <span className="spinner-border spinner-border-sm" />
                        Sending...
                      </>
                    ) : (
                      <>
                        💝 Send Rs. {tipAmount.toLocaleString()} Tip
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientBookings;
