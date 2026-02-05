import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import EscrowStatus from '../../components/EscrowStatus';
import StripeCheckout from '../../components/StripeCheckout';

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
  
  // Payment Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedRentalForPayment, setSelectedRentalForPayment] = useState(null);
  
  // Dispute Modal State
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [selectedRentalForDispute, setSelectedRentalForDispute] = useState(null);
  const [disputeForm, setDisputeForm] = useState({
    dispute_reason: '',
    description: ''
  });
  const [submittingDispute, setSubmittingDispute] = useState(false);

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
    },
    {
      id: 5,
      photographerId: 5,
      photographerName: "Golden Frame Studio",
      photographerImage: "🌟",
      serviceType: "Bridal Photography",
      date: "2024-12-10",
      time: "09:00",
      duration: "5 hours",
      location: "Faisalabad",
      totalAmount: 30000,
      status: "work_completed",
      paidAmount: 15000,
      remainingAmount: 15000,
      specialRequests: "Full bridal coverage with candid moments",
      createdAt: "2024-11-20",
      imagesDelivered: 250,
      totalImages: 250
    }
  ];

  useEffect(() => {
    fetchBookingsAndRentals();
  }, [user]);

  const fetchBookingsAndRentals = async () => {
    setLoading(true);
    try {
      // Fetch photography bookings
      const userBookings = mockBookings.filter(booking => booking.clientId === user?.id || true);
      setBookings(userBookings);
      
      // Fetch equipment rentals from API
      try {
        const response = await fetch(`${API_BASE}/equipment/rentals/my`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            // Transform API data to match our UI format
            const transformedRentals = data.data.map(rental => ({
              id: rental.id,
              equipmentId: rental.equipment_id,
              equipmentName: rental.equipment?.name || 'Equipment',
              equipmentCategory: rental.equipment?.category || 'Other',
              equipmentImage: getCategoryEmoji(rental.equipment?.category),
              startDate: rental.start_date,
              endDate: rental.end_date,
              rentalDays: rental.total_days,
              period: rental.total_days <= 3 ? 'daily' : rental.total_days <= 14 ? 'weekly' : 'monthly',
              rentalCost: rental.rental_price,
              deposit: rental.security_deposit,
              totalAmount: rental.rental_price + rental.security_deposit,
              status: rental.status, // requested, approved, active, returned, cancelled
              paymentStatus: rental.payment_status,
              ownerName: rental.equipment?.photographer_profile?.business_name || 'Equipment Owner',
              ownerPhone: rental.equipment?.photographer_profile?.phone || 'Contact via platform',
              createdAt: rental.created_at,
              notes: rental.notes
            }));
            setEquipmentRentals(transformedRentals);
          }
        } else {
          // Fallback to localStorage if API fails
          let savedRentals = JSON.parse(localStorage.getItem('equipmentRentals') || '[]');
          
          // Deduplicate rentals by ID (keep the first occurrence)
          const seenIds = new Set();
          savedRentals = savedRentals.filter(r => {
            if (seenIds.has(r.id)) return false;
            seenIds.add(r.id);
            return true;
          });
          
          // Save deduplicated list back to localStorage
          localStorage.setItem('equipmentRentals', JSON.stringify(savedRentals));
          
          // Add mock approved rental for testing payment flow
          const mockApprovedRental = {
            id: 'MOCK-APPROVED-001',
            equipmentId: '1',
            equipmentName: 'Canon EOS R5 Camera Body',
            equipmentCategory: 'Camera Bodies',
            equipmentImage: '📷',
            startDate: '2024-12-28',
            endDate: '2025-01-03',
            rentalDays: 7,
            period: 'weekly',
            rentalCost: 17500,
            deposit: 25000,
            totalAmount: 42500,
            status: 'approved', // Ready for payment!
            paymentStatus: 'pending',
            ownerName: 'Professional Gear Rentals',
            ownerPhone: '+92 300 1234567',
            createdAt: '2024-11-22T10:30:00',
            notes: 'Approved by owner. Please proceed with payment to confirm your rental.'
          };
          
          // Check if mock rental already exists
          const hasMockRental = savedRentals.some(r => r.id === mockApprovedRental.id);
          if (!hasMockRental) {
            savedRentals.unshift(mockApprovedRental); // Add to beginning
          }
          
          setEquipmentRentals(savedRentals);
        }
      } catch (apiError) {
        console.error('Error fetching rentals from API:', apiError);
        // Fallback to localStorage
        let savedRentals = JSON.parse(localStorage.getItem('equipmentRentals') || '[]');
        
        // Deduplicate rentals by ID (keep the first occurrence)
        const seenIds = new Set();
        savedRentals = savedRentals.filter(r => {
          if (seenIds.has(r.id)) return false;
          seenIds.add(r.id);
          return true;
        });
        
        // Save deduplicated list back to localStorage
        localStorage.setItem('equipmentRentals', JSON.stringify(savedRentals));
        
        // Add mock approved rental for testing payment flow
        const mockApprovedRental = {
          id: 'MOCK-APPROVED-001',
          equipmentId: '1',
          equipmentName: 'Canon EOS R5 Camera Body',
          equipmentCategory: 'Camera Bodies',
          equipmentImage: '📷',
          startDate: '2024-12-28',
          endDate: '2025-01-03',
          rentalDays: 7,
          period: 'weekly',
          rentalCost: 17500,
          deposit: 25000,
          totalAmount: 42500,
          status: 'approved', // Ready for payment!
          paymentStatus: 'pending',
          ownerName: 'Professional Gear Rentals',
          ownerPhone: '+92 300 1234567',
          createdAt: '2024-11-22T10:30:00',
          notes: 'Approved by owner. Please proceed with payment to confirm your rental.'
        };
        
        // Check if mock rental already exists
        const hasMockRental = savedRentals.some(r => r.id === mockApprovedRental.id);
        if (!hasMockRental) {
          savedRentals.unshift(mockApprovedRental); // Add to beginning
        }
        
        setEquipmentRentals(savedRentals);
      }
    } finally {
      setLoading(false);
    }
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
    return emojis[category?.toLowerCase()] || '🎥';
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { color: 'warning', icon: '⏳', text: 'Pending' },
      confirmed: { color: 'success', icon: '✅', text: 'Confirmed' },
      completed: { color: 'info', icon: '🎉', text: 'Completed' },
      cancelled: { color: 'danger', icon: '❌', text: 'Cancelled' },
      work_completed: { color: 'primary', icon: '📸', text: 'Work Done' },
      requested: { color: 'warning', icon: '⏳', text: 'Pending Approval' },
      approved: { color: 'info', icon: '✓', text: 'Approved - Pay Now' },
      active: { color: 'primary', icon: '📦', text: 'Active Rental' },
      returned: { color: 'success', icon: '✅', text: 'Returned' }
    };
    
    const config = statusConfig[status] || statusConfig.pending;
    return (
      <span className={`badge bg-${config.color} d-inline-flex align-items-center`}>
        <span className="me-1">{config.icon}</span>
        {config.text}
      </span>
    );
  };

  const getPaymentStatusBadge = (booking) => {
    const { paidAmount, totalAmount, remainingAmount, status } = booking;
    
    if (status === 'cancelled') {
      return <span className="badge bg-secondary">Payment Cancelled</span>;
    }
    
    if (paidAmount === 0) {
      return <span className="badge bg-danger">💰 Payment Due</span>;
    }
    
    if (remainingAmount > 0 && paidAmount > 0) {
      if (status === 'completed' || status === 'work_completed') {
        return <span className="badge bg-warning text-dark">⏳ Final Payment Due</span>;
      }
      return <span className="badge bg-info">✓ 50% Advance Paid</span>;
    }
    
    if (remainingAmount === 0) {
      return <span className="badge bg-success">✓ Fully Paid</span>;
    }
    
    return null;
  };

  const handlePayForRental = (rental) => {
    setSelectedRentalForPayment(rental);
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = () => {
    // Update rental status to active after successful payment
    setEquipmentRentals(prev => prev.map(r =>
      r.id === selectedRentalForPayment.id
        ? { ...r, status: 'active', paymentStatus: 'paid' }
        : r
    ));
    
    // Also update localStorage
    const savedRentals = JSON.parse(localStorage.getItem('equipmentRentals') || '[]');
    const updatedRentals = savedRentals.map(r =>
      r.id === selectedRentalForPayment.id
        ? { ...r, status: 'active', paymentStatus: 'paid' }
        : r
    );
    localStorage.setItem('equipmentRentals', JSON.stringify(updatedRentals));
    
    setShowPaymentModal(false);
    setSelectedRentalForPayment(null);
    alert('Payment successful! The equipment owner will contact you for pickup/delivery.');
  };

  const handlePaymentCancel = () => {
    setShowPaymentModal(false);
    setSelectedRentalForPayment(null);
  };

  const handleOpenDisputeModal = (rental) => {
    setSelectedRentalForDispute(rental);
    setShowDisputeModal(true);
  };

  const handleDispute = async () => {
    if (!selectedRentalForDispute || !disputeForm.dispute_reason || !disputeForm.description) {
      alert('Please fill in all fields');
      return;
    }

    setSubmittingDispute(true);
    try {
      const response = await fetch(`${API_BASE}/equipment/rentals/${selectedRentalForDispute.id}/dispute`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(disputeForm)
      });
      
      if (response.ok) {
        alert('Dispute submitted successfully. Our team will review and respond within 24-48 hours.');
        setShowDisputeModal(false);
        setSelectedRentalForDispute(null);
        setDisputeForm({ dispute_reason: '', description: '' });
      } else {
        const error = await response.json();
        alert(error.detail || 'Failed to submit dispute. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting dispute:', error);
      alert('Dispute submitted (mock). Our team will review and respond within 24-48 hours.');
      setShowDisputeModal(false);
      setSelectedRentalForDispute(null);
      setDisputeForm({ dispute_reason: '', description: '' });
    } finally {
      setSubmittingDispute(false);
    }
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
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return;
    
    // Calculate days until booking
    const eventDate = new Date(booking.date);
    const today = new Date();
    const daysUntil = Math.ceil((eventDate - today) / (1000 * 60 * 60 * 24));
    
    // Determine refund policy
    let refundMessage = '';
    if (daysUntil >= 15) {
      refundMessage = 'You will receive a 100% refund (15+ days notice).';
    } else if (daysUntil >= 7) {
      refundMessage = 'You will receive a 50% refund (7-14 days notice).';
    } else {
      refundMessage = 'No refund will be issued (less than 7 days notice).';
    }
    
    if (window.confirm(`Are you sure you want to cancel this booking?\n\nRefund Policy: ${refundMessage}\n\nDays until event: ${daysUntil}`)) {
      // Call API to cancel booking
      fetch(`http://localhost:8000/api/bookings/${bookingId}/cancel`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          alert(`Booking cancelled successfully.\n\n${data.refund_info.policy}\nRefund Amount: Rs. ${data.refund_info.client_refund.toLocaleString()}`);
          setBookings(prev => prev.map(booking => 
            booking.id === bookingId 
              ? { ...booking, status: 'cancelled' }
              : booking
          ));
        } else {
          alert(data.detail || 'Failed to cancel booking');
        }
      })
      .catch(error => {
        console.error('Error:', error);
        // Fallback to local update
        setBookings(prev => prev.map(booking => 
          booking.id === bookingId 
            ? { ...booking, status: 'cancelled' }
            : booking
        ));
        alert('Booking cancelled (local only - API unavailable)');
      });
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
                      {booking.remainingAmount > 0 && (
                        <div className="mb-2">
                          <span className="text-muted small">Remaining:</span>
                          <div className="fw-semibold text-warning">Rs. {booking.remainingAmount.toLocaleString()}</div>
                        </div>
                      )}
                      {getPaymentProgress(booking.paidAmount, booking.totalAmount)}
                    </div>

                    {/* Actions */}
                    <div className="col-md-3 text-end">
                      <div className="mb-2">
                        {getStatusBadge(booking.status)}
                      </div>
                      <div className="d-flex flex-column gap-1">
                        {/* Pay button - show for pending bookings that haven't been paid */}
                        {booking.status === 'pending' && booking.paidAmount === 0 && (
                          <button 
                            className="btn btn-primary btn-sm"
                            onClick={() => handlePayRemaining(booking.id)}
                          >
                            💰 Pay Now (Rs. {booking.totalAmount.toLocaleString()})
                          </button>
                        )}
                        {(booking.status === 'completed' || booking.status === 'work_completed') && (
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
                          </>
                        )}
                        {/* Cancel button for pending bookings only */}
                        {booking.status === 'pending' && (
                          <button 
                            className="btn btn-outline-danger btn-sm"
                            onClick={() => handleCancel(booking.id)}
                          >
                            ❌ Cancel Booking
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
                            {rental.status === 'requested' && (
                              <>
                                <span className="badge bg-warning text-dark">⏳ Waiting for Owner Approval</span>
                                <Link
                                  to={`/photographer/equipment/${rental.equipmentId}`}
                                  className="btn btn-outline-primary btn-sm mt-2"
                                >
                                  📋 View Equipment
                                </Link>
                              </>
                            )}
                            {rental.status === 'approved' && rental.paymentStatus !== 'paid' && (
                              <>
                                <button 
                                  className="btn btn-success btn-sm fw-bold"
                                  onClick={() => handlePayForRental(rental)}
                                >
                                  💳 Pay Now (Rs. {rental.totalAmount.toLocaleString()})
                                </button>
                                <small className="text-muted mt-1">
                                  Rental: Rs. {rental.rentalCost.toLocaleString()}<br/>
                                  Deposit: Rs. {rental.deposit.toLocaleString()}
                                </small>
                              </>
                            )}
                            {(rental.status === 'active' || rental.status === 'returned') && (
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
                                {rental.status === 'active' && (
                                  <button 
                                    className="btn btn-outline-danger btn-sm"
                                    onClick={() => handleOpenDisputeModal(rental)}
                                  >
                                    ⚠️ Report Issue
                                  </button>
                                )}
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

        {/* Payment Modal for Equipment Rental */}
        {showPaymentModal && selectedRentalForPayment && (
          <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 9999 }}>
            <div className="modal-dialog modal-dialog-centered modal-lg">
              <div className="modal-content">
                <div className="modal-body p-0">
                  <StripeCheckout
                    bookingId={selectedRentalForPayment.id}
                    amount={selectedRentalForPayment.totalAmount}
                    photographerName={`${selectedRentalForPayment.equipmentName} - ${selectedRentalForPayment.rentalDays} days`}
                    onSuccess={handlePaymentSuccess}
                    onCancel={handlePaymentCancel}
                    isEquipmentRental={true}
                    bookingData={{
                      clientName: user?.name || 'Client',
                      clientEmail: user?.email || 'client@example.com',
                      phone: user?.phone || '',
                      price: selectedRentalForPayment.totalAmount,
                      rentalCost: selectedRentalForPayment.rentalCost,
                      deposit: selectedRentalForPayment.deposit,
                      equipmentName: selectedRentalForPayment.equipmentName,
                      rentalDays: selectedRentalForPayment.rentalDays
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Dispute Modal */}
        {showDisputeModal && selectedRentalForDispute && (
          <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Report an Issue</h5>
                  <button type="button" className="btn-close" onClick={() => setShowDisputeModal(false)}></button>
                </div>
                <div className="modal-body">
                  <div className="alert alert-info">
                    <strong>Equipment:</strong> {selectedRentalForDispute.equipmentName}
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
                      <>Submit Dispute</>
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
