import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { bookingAPI } from '../../api/api';
import { toast } from 'react-toastify';

const BookingRequests = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [processingAction, setProcessingAction] = useState(null);

  // Mock booking requests data (including equipment rentals)
  const mockBookings = [
    {
      id: 201,
      type: "equipment_rental",
      clientId: "client_eq1",
      clientName: "Ali Raza",
      clientEmail: "ali.raza@email.com",
      clientPhone: "+92-300-9876543",
      clientImage: "👤",
      equipmentName: "Canon EOS R5 Camera",
      equipmentCategory: "Camera Bodies",
      rentalStartDate: "2024-12-20",
      rentalEndDate: "2024-12-25",
      rentalDays: 5,
      dailyRate: 3500,
      totalAmount: 17500,
      securityDeposit: 25000,
      deliveryMethod: "pickup",
      specialRequests: "Need camera with extra battery pack and charger. Will pick up from your location.",
      urgency: "high",
      createdAt: "2024-11-16",
      status: "pending",
      message: "Hi! I need this camera for a wedding shoot in Murree. I have experience with Canon cameras.",
      clientProfile: {
        rentalsCompleted: 2,
        rating: 4.8,
        joinedDate: "2024-05-20"
      }
    },
    {
      id: 202,
      type: "equipment_rental",
      clientId: "client_eq2",
      clientName: "Zainab Ahmed",
      clientEmail: "zainab.a@email.com",
      clientPhone: "+92-333-5544332",
      clientImage: "👩",
      equipmentName: "Sony A7 III with 24-70mm Lens",
      equipmentCategory: "Complete Kit",
      rentalStartDate: "2024-12-22",
      rentalEndDate: "2024-12-27",
      rentalDays: 5,
      dailyRate: 4000,
      totalAmount: 20000,
      securityDeposit: 30000,
      depositPaid: 30000,
      deliveryMethod: "delivery",
      deliveryAddress: "DHA Phase 5, Lahore",
      specialRequests: "Please deliver to my address. I'll need a quick tutorial on using the camera settings.",
      urgency: "medium",
      createdAt: "2024-11-15",
      status: "approved",
      message: "This will be my first time using a professional camera. Can you help me with basic settings?",
      clientProfile: {
        rentalsCompleted: 0,
        rating: 0,
        joinedDate: "2024-11-01"
      }
    },
    {
      id: 203,
      type: "equipment_rental",
      clientId: "client_eq3",
      clientName: "Hassan Sheikh",
      clientEmail: "hassan.s@email.com",
      clientPhone: "+92-321-7788990",
      clientImage: "👨",
      equipmentName: "DJI Ronin-S Gimbal",
      equipmentCategory: "Stabilizers",
      rentalStartDate: "2024-12-18",
      rentalEndDate: "2024-12-20",
      rentalDays: 2,
      dailyRate: 2500,
      totalAmount: 5000,
      securityDeposit: 15000,
      depositPaid: 15000,
      rentalPaid: 5000,
      deliveryMethod: "pickup",
      specialRequests: "I've used this model before. Just need it for a corporate video shoot.",
      urgency: "low",
      createdAt: "2024-11-14",
      status: "active",
      activatedAt: "2024-12-18T10:30:00",
      message: "Quick rental for a 2-day corporate shoot. Very familiar with the equipment.",
      clientProfile: {
        rentalsCompleted: 5,
        rating: 4.9,
        joinedDate: "2024-02-10"
      }
    },
    {
      id: 101,
      type: "photography_booking",
      clientId: "client123",
      clientName: "Sarah Khan",
      clientEmail: "sarah.khan@email.com",
      clientPhone: "+92-300-1234567",
      clientImage: "👤",
      serviceType: "Wedding Photography",
      eventType: "Mehndi Ceremony",
      date: "2024-12-25",
      time: "16:00",
      duration: "6 hours",
      location: "Lahore",
      venue: "Pearl Continental Hotel",
      guestCount: 200,
      totalAmount: 35000,
      advanceRequired: 17500,
      specialRequests: "Capture candid moments, golden hour couple session, group photos with families",
      urgency: "high",
      createdAt: "2024-11-15",
      status: "pending",
      message: "Hi! I'm looking for an experienced wedding photographer for my mehndi ceremony. I loved your portfolio and would like to know your availability.",
      clientProfile: {
        bookingsCompleted: 3,
        rating: 4.7,
        joinedDate: "2024-01-15"
      }
    },
    {
      id: 102,
      type: "photography_booking",
      clientId: "client456",
      clientName: "Ahmed Hassan",
      clientEmail: "ahmed.h@email.com",
      clientPhone: "+92-321-9876543",
      clientImage: "👨",
      serviceType: "Portrait Photography",
      eventType: "Professional Headshots",
      date: "2024-12-18",
      time: "10:00",
      duration: "2 hours",
      location: "Islamabad",
      venue: "Client's Office",
      guestCount: 5,
      totalAmount: 8000,
      advanceRequired: 4000,
      specialRequests: "Corporate headshots for 5 team members, white background, professional lighting setup",
      urgency: "medium",
      createdAt: "2024-11-14",
      status: "pending",
      message: "We need professional headshots for our company website. What equipment and setup do you provide?",
      clientProfile: {
        bookingsCompleted: 1,
        rating: 5.0,
        joinedDate: "2024-09-10"
      }
    },
    {
      id: 103,
      type: "photography_booking",
      clientId: "client789",
      clientName: "Fatima Zahra",
      clientEmail: "fatima.z@email.com",
      clientPhone: "+92-333-4567890",
      clientImage: "👩",
      serviceType: "Event Photography",
      eventType: "Birthday Party",
      date: "2024-12-22",
      time: "18:00",
      duration: "4 hours",
      location: "Karachi",
      venue: "Sea View Restaurant",
      guestCount: 50,
      totalAmount: 15000,
      advanceRequired: 7500,
      advancePaid: 7500,
      remainingAmount: 7500,
      paymentStatus: "advance_paid",
      specialRequests: "Kids birthday party, cake cutting ceremony, family group photos, outdoor shots at sunset",
      urgency: "low",
      createdAt: "2024-11-13",
      status: "confirmed",
      message: "My daughter's 5th birthday celebration. Looking for someone who's good with children and can capture natural moments.",
      clientProfile: {
        bookingsCompleted: 2,
        rating: 4.5,
        joinedDate: "2024-03-20"
      }
    },
    {
      id: 104,
      type: "photography_booking",
      clientId: "client012",
      clientName: "Mohammad Ali",
      clientEmail: "m.ali@email.com",
      clientPhone: "+92-341-2345678",
      clientImage: "👨‍💼",
      serviceType: "Product Photography",
      eventType: "E-commerce Products",
      date: "2024-12-20",
      time: "11:00",
      duration: "3 hours",
      location: "Rawalpindi",
      venue: "Photography Studio",
      guestCount: 1,
      totalAmount: 12000,
      advanceRequired: 6000,
      specialRequests: "White background product shots, 15 different products, multiple angles, high resolution for online store",
      urgency: "medium",
      createdAt: "2024-11-12",
      status: "rejected",
      message: "Need professional product photos for our online store. Can you provide samples of previous product photography work?",
      clientProfile: {
        bookingsCompleted: 0,
        rating: 0,
        joinedDate: "2024-11-01"
      },
      rejectionReason: "Scheduling conflict with another wedding booking"
    }
  ];

  useEffect(() => {
    // Simulate API call to fetch booking requests
    setTimeout(() => {
      setBookings(mockBookings);
      setLoading(false);
    }, 1000);
  }, []);

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { color: 'warning', icon: '⏳', text: 'Pending Response' },
      approved: { color: 'success', icon: '✅', text: 'Approved' },
      confirmed: { color: 'success', icon: '✅', text: 'Confirmed' },
      active: { color: 'primary', icon: '🔄', text: 'Active Rental' },
      rejected: { color: 'danger', icon: '❌', text: 'Rejected' },
      completed: { color: 'info', icon: '🎉', text: 'Completed' },
      returned: { color: 'secondary', icon: '✓', text: 'Returned' }
    };
    
    const config = statusConfig[status] || statusConfig.pending;
    return (
      <span className={`badge bg-${config.color} d-inline-flex align-items-center`}>
        <span className="me-1">{config.icon}</span>
        {config.text}
      </span>
    );
  };

  const getUrgencyBadge = (urgency) => {
    const urgencyConfig = {
      high: { color: 'danger', icon: '🔥', text: 'High Priority' },
      medium: { color: 'warning', icon: '⚡', text: 'Medium Priority' },
      low: { color: 'info', icon: '📅', text: 'Low Priority' }
    };
    
    const config = urgencyConfig[urgency] || urgencyConfig.low;
    return (
      <span className={`badge bg-${config.color} d-inline-flex align-items-center`}>
        <span className="me-1">{config.icon}</span>
        {config.text}
      </span>
    );
  };

  // Payment status badge for confirmed bookings
  const getPaymentStatusBadge = (booking) => {
    if (booking.status === 'pending' || booking.status === 'rejected') {
      return null; // No payment for pending/rejected
    }
    
    const advancePaid = booking.advancePaid || 0;
    const remainingAmount = booking.remainingAmount || booking.advanceRequired || 0;
    
    if (advancePaid > 0 && remainingAmount > 0) {
      return (
        <span className="badge bg-info d-inline-flex align-items-center">
          <span className="me-1">💰</span>
          50% Advance Received
        </span>
      );
    }
    
    if (booking.paymentStatus === 'fully_paid' || remainingAmount === 0) {
      return (
        <span className="badge bg-success d-inline-flex align-items-center">
          <span className="me-1">✅</span>
          Fully Paid
        </span>
      );
    }
    
    return (
      <span className="badge bg-warning d-inline-flex align-items-center">
        <span className="me-1">⏳</span>
        Awaiting Payment
      </span>
    );
  };

  const filteredBookings = bookings.filter(booking => {
    return filter === 'all' || booking.status === filter;
  });

  const handleAcceptBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to accept this booking?')) return;
    
    setProcessingAction(bookingId);
    try {
      await bookingAPI.updateStatus(bookingId, 'accepted');
      setBookings(prev => prev.map(booking => 
        booking.id === bookingId 
          ? { ...booking, status: 'confirmed' }
          : booking
      ));
      toast.success('Booking accepted successfully! Client will be notified.');
    } catch (error) {
      console.error('Error accepting booking:', error);
      toast.error(error.message || 'Failed to accept booking');
      // Still update locally for demo
      setBookings(prev => prev.map(booking => 
        booking.id === bookingId 
          ? { ...booking, status: 'confirmed' }
          : booking
      ));
    } finally {
      setProcessingAction(null);
    }
  };

  const handleRejectBooking = async (bookingId) => {
    const reason = prompt('Please provide a reason for rejection (optional):');
    if (!window.confirm('Are you sure you want to reject this booking?')) return;
    
    setProcessingAction(bookingId);
    try {
      await bookingAPI.updateStatus(bookingId, 'rejected', reason);
      setBookings(prev => prev.map(booking => 
        booking.id === bookingId 
          ? { ...booking, status: 'rejected', rejectionReason: reason || 'Not available' }
          : booking
      ));
      toast.success('Booking rejected. Client will be notified.');
    } catch (error) {
      console.error('Error rejecting booking:', error);
      toast.error(error.message || 'Failed to reject booking');
      // Still update locally for demo
      setBookings(prev => prev.map(booking => 
        booking.id === bookingId 
          ? { ...booking, status: 'rejected', rejectionReason: reason || 'Not available' }
          : booking
      ));
    } finally {
      setProcessingAction(null);
    }
  };

  const handleSendMessage = (bookingId) => {
    const message = prompt('Enter your message to the client:');
    if (message) {
      toast.success(`Message sent to client: "${message}"`);
    }
  };

  const handleMarkCompleted = async (bookingId) => {
    if (!window.confirm('Mark this booking as work completed? The client will be notified to pay the remaining amount.')) return;
    
    setProcessingAction(bookingId);
    try {
      const result = await bookingAPI.markWorkCompleted(bookingId);
      
      setBookings(prev => prev.map(booking => 
        booking.id === bookingId 
          ? { ...booking, status: 'work_completed', workCompleted: true }
          : booking
      ));
      
      toast.success(result.message || 'Work marked as completed! Client will be notified to pay the remaining 50%.');
      
      // Show next steps
      if (result.next_steps) {
        console.log('Next steps:', result.next_steps);
      }
    } catch (error) {
      console.error('Error marking work completed:', error);
      toast.error(error.message || 'Failed to mark work as completed');
      // Still update locally for demo
      setBookings(prev => prev.map(booking => 
        booking.id === bookingId 
          ? { ...booking, status: 'work_completed', workCompleted: true }
          : booking
      ));
    } finally {
      setProcessingAction(null);
    }
  };

  const formatDateTime = (date, time) => {
    const dateObj = new Date(date);
    return dateObj.toLocaleDateString('en-US', { 
      weekday: 'short', 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    }) + ' at ' + time;
  };

  if (loading) {
    return (
      <div className="booking-requests py-4">
        <div className="container">
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-3">Loading booking requests...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="booking-requests py-4">
      <div className="container">
        {/* Header */}
        <div className="gradient-header rounded-3 p-4 mb-4">
          <div className="row align-items-center">
            <div className="col-md-8">
              <h1 className="fw-bold mb-2">📋 Booking Requests</h1>
              <p className="mb-0">Review and manage incoming booking requests from clients</p>
            </div>
            <div className="col-md-4 text-md-end">
              <div className="text-white">
                <div className="small opacity-75">Pending Response</div>
                <div className="h4 fw-bold">{bookings.filter(b => b.status === 'pending').length}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="row mb-4">
          <div className="col-md-3">
            <div className="card border-0 shadow-sm">
              <div className="card-body text-center">
                <div className="text-warning mb-2" style={{ fontSize: '2rem' }}>⏳</div>
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
                <div className="text-primary mb-2" style={{ fontSize: '2rem' }}>💰</div>
                <div className="h5 fw-bold">Potential Earnings</div>
                <div className="text-muted">Rs. {bookings.filter(b => b.status === 'pending').reduce((sum, b) => sum + b.totalAmount, 0).toLocaleString()}</div>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card border-0 shadow-sm">
              <div className="card-body text-center">
                <div className="text-danger mb-2" style={{ fontSize: '2rem' }}>🔥</div>
                <div className="h5 fw-bold">High Priority</div>
                <div className="text-muted">{bookings.filter(b => b.urgency === 'high' && b.status === 'pending').length}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body">
            <div className="btn-group w-100" role="group">
              <button 
                className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setFilter('all')}
              >
                All Requests ({bookings.length})
              </button>
              <button 
                className={`btn ${filter === 'pending' ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setFilter('pending')}
              >
                Pending ({bookings.filter(b => b.status === 'pending').length})
              </button>
              <button 
                className={`btn ${filter === 'confirmed' ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setFilter('confirmed')}
              >
                Confirmed ({bookings.filter(b => b.status === 'confirmed').length})
              </button>
              <button 
                className={`btn ${filter === 'rejected' ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setFilter('rejected')}
              >
                Rejected ({bookings.filter(b => b.status === 'rejected').length})
              </button>
            </div>
          </div>
        </div>

        {/* Booking Requests List */}
        {filteredBookings.length === 0 ? (
          <div className="card border-0 shadow-sm">
            <div className="card-body text-center py-5">
              <div className="text-muted mb-3" style={{ fontSize: '3rem' }}>📋</div>
              <h4 className="fw-bold mb-3">No {filter === 'all' ? '' : filter} Requests Found</h4>
              <p className="text-muted mb-4">
                {filter !== 'all' 
                  ? 'No booking requests in this category'
                  : 'No booking requests available'
                }
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredBookings.map((booking) => (
              <div key={booking.id} className="card border-0 shadow-sm">
                <div className="card-body">
                  {/* Equipment Rental Badge */}
                  {booking.type === 'equipment_rental' && (
                    <div className="mb-3">
                      <span className="badge bg-info">🎥 Equipment Rental</span>
                    </div>
                  )}
                  
                  <div className="row align-items-start">
                    {/* Client Info */}
                    <div className="col-md-3">
                      <div className="d-flex align-items-center mb-3">
                        <div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center me-3" 
                             style={{ width: '50px', height: '50px', fontSize: '1.5rem' }}>
                          {booking.clientImage}
                        </div>
                        <div>
                          <h6 className="fw-bold mb-1">{booking.clientName}</h6>
                          <div className="text-muted small">{booking.clientEmail}</div>
                          <div className="text-muted small">{booking.clientPhone}</div>
                        </div>
                      </div>
                      
                      {/* Client Profile Info */}
                      <div className="small text-muted">
                        <div className="d-flex justify-content-between mb-1">
                          <span>Previous {booking.type === 'equipment_rental' ? 'Rentals' : 'Bookings'}:</span>
                          <span className="fw-semibold">{booking.clientProfile.rentalsCompleted || booking.clientProfile.bookingsCompleted || 0}</span>
                        </div>
                        <div className="d-flex justify-content-between mb-1">
                          <span>Client Rating:</span>
                          <span className="fw-semibold">⭐ {booking.clientProfile.rating || 'New'}</span>
                        </div>
                        <div className="d-flex justify-content-between">
                          <span>Member Since:</span>
                          <span className="fw-semibold">{new Date(booking.clientProfile.joinedDate).getFullYear()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Booking/Rental Details */}
                    <div className="col-md-4">
                      {booking.type === 'equipment_rental' ? (
                        <>
                          <div className="mb-2">
                            <span className="text-muted small">Equipment:</span>
                            <div className="fw-semibold">📷 {booking.equipmentName}</div>
                          </div>
                          <div className="mb-2">
                            <span className="text-muted small">Category:</span>
                            <div className="fw-semibold">🏷️ {booking.equipmentCategory}</div>
                          </div>
                          <div className="mb-2">
                            <span className="text-muted small">Rental Period:</span>
                            <div className="fw-semibold">📅 {booking.rentalStartDate} to {booking.rentalEndDate}</div>
                          </div>
                          <div className="mb-2">
                            <span className="text-muted small">Duration:</span>
                            <div className="fw-semibold">⏱️ {booking.rentalDays} days</div>
                          </div>
                          <div className="mb-2">
                            <span className="text-muted small">Daily Rate:</span>
                            <div className="fw-semibold">💰 Rs. {booking.dailyRate.toLocaleString()}/day</div>
                          </div>
                          <div>
                            <span className="text-muted small">Delivery Method:</span>
                            <div className="fw-semibold">🚚 {booking.deliveryMethod === 'pickup' ? 'Self Pickup' : 'Delivery'}</div>
                            {booking.deliveryAddress && (
                              <div className="text-muted small">📍 {booking.deliveryAddress}</div>
                            )}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="mb-2">
                            <span className="text-muted small">Service Type:</span>
                            <div className="fw-semibold">📸 {booking.serviceType}</div>
                          </div>
                          <div className="mb-2">
                            <span className="text-muted small">Event Type:</span>
                            <div className="fw-semibold">🎉 {booking.eventType}</div>
                          </div>
                          <div className="mb-2">
                            <span className="text-muted small">Date & Time:</span>
                            <div className="fw-semibold">📅 {formatDateTime(booking.date, booking.time)}</div>
                          </div>
                          <div className="mb-2">
                            <span className="text-muted small">Duration:</span>
                            <div className="fw-semibold">⏱️ {booking.duration}</div>
                          </div>
                          <div className="mb-2">
                            <span className="text-muted small">Location:</span>
                            <div className="fw-semibold">📍 {booking.location}</div>
                          </div>
                          <div>
                            <span className="text-muted small">Venue:</span>
                            <div className="fw-semibold">🏢 {booking.venue}</div>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Pricing & Status */}
                    <div className="col-md-2">
                      <div className="mb-2">
                        <span className="text-muted small">{booking.type === 'equipment_rental' ? 'Rental Amount' : 'Total Amount'}:</span>
                        <div className="fw-bold text-primary">Rs. {booking.totalAmount.toLocaleString()}</div>
                      </div>
                      {booking.type === 'equipment_rental' ? (
                        <div className="mb-2">
                          <span className="text-muted small">Security Deposit:</span>
                          <div className="fw-semibold">Rs. {booking.securityDeposit.toLocaleString()}</div>
                          {booking.depositPaid && (
                            <div className="badge bg-success text-white mt-1">✓ Deposit Paid</div>
                          )}
                        </div>
                      ) : (
                        <div className="mb-2">
                          <span className="text-muted small">Advance (50%):</span>
                          <div className="fw-semibold">Rs. {booking.advanceRequired.toLocaleString()}</div>
                        </div>
                      )}
                      {booking.guestCount && (
                        <div className="mb-3">
                          <span className="text-muted small">Guests:</span>
                          <div className="fw-semibold">{booking.guestCount} people</div>
                        </div>
                      )}
                      <div className="mb-2">
                        {getStatusBadge(booking.status)}
                      </div>
                      <div className="mb-2">
                        {getUrgencyBadge(booking.urgency)}
                      </div>
                      {getPaymentStatusBadge(booking) && (
                        <div className="mt-2">
                          {getPaymentStatusBadge(booking)}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="col-md-3 text-end">
                      <div className="d-flex flex-column gap-2">
                        {booking.status === 'pending' && (
                          <>
                            <button 
                              className="btn btn-success"
                              onClick={() => handleAcceptBooking(booking.id)}
                              disabled={processingAction === booking.id}
                            >
                              {processingAction === booking.id ? '⏳ Processing...' : '✅ Accept Booking'}
                            </button>
                            <button 
                              className="btn btn-outline-danger"
                              onClick={() => handleRejectBooking(booking.id)}
                              disabled={processingAction === booking.id}
                            >
                              {processingAction === booking.id ? '⏳...' : '❌ Decline'}
                            </button>
                          </>
                        )}
                        {booking.status === 'confirmed' && (
                          <>
                            <button 
                              className="btn btn-primary"
                              onClick={() => setSelectedBooking(booking)}
                            >
                              📋 View Details
                            </button>
                            <button 
                              className="btn btn-success"
                              onClick={() => handleMarkCompleted(booking.id)}
                              disabled={processingAction === booking.id}
                            >
                              {processingAction === booking.id ? '⏳ Processing...' : '✅ Mark Work Completed'}
                            </button>
                          </>
                        )}
                        <button 
                          className="btn btn-outline-primary"
                          onClick={() => handleSendMessage(booking.id)}
                        >
                          💬 Message Client
                        </button>
                        <Link 
                          to={`/client/${booking.clientId}`}
                          className="btn btn-outline-secondary btn-sm"
                        >
                          👤 View Client Profile
                        </Link>
                      </div>
                      
                      <div className="mt-2">
                        <small className="text-muted">
                          Requested {new Date(booking.createdAt).toLocaleDateString()}
                        </small>
                      </div>
                    </div>
                  </div>

                  {/* Client Message */}
                  <div className="mt-3 pt-3 border-top">
                    <small className="text-muted fw-semibold">Client Message:</small>
                    <div className="text-muted small mt-1 bg-light p-2 rounded">
                      "{booking.message}"
                    </div>
                  </div>

                  {/* Special Requests */}
                  {booking.specialRequests && (
                    <div className="mt-2">
                      <small className="text-muted fw-semibold">Special Requests:</small>
                      <div className="text-muted small">{booking.specialRequests}</div>
                    </div>
                  )}

                  {/* Rejection Reason */}
                  {booking.status === 'rejected' && booking.rejectionReason && (
                    <div className="mt-2">
                      <small className="text-danger fw-semibold">Rejection Reason:</small>
                      <div className="text-danger small">{booking.rejectionReason}</div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Booking Details Modal */}
      {selectedBooking && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">📋 Booking Details</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setSelectedBooking(null)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="row mb-3">
                  <div className="col-md-6">
                    <h6 className="text-muted">Client Information</h6>
                    <div className="mb-2">
                      <strong>Name:</strong> {selectedBooking.clientName}
                    </div>
                    <div className="mb-2">
                      <strong>Email:</strong> {selectedBooking.clientEmail}
                    </div>
                    <div className="mb-2">
                      <strong>Phone:</strong> {selectedBooking.clientPhone}
                    </div>
                    <div className="mb-2">
                      <strong>Previous Bookings:</strong> {selectedBooking.clientProfile.bookingsCompleted}
                    </div>
                    <div className="mb-2">
                      <strong>Rating:</strong> ⭐ {selectedBooking.clientProfile.rating || 'New'}
                    </div>
                  </div>
                  <div className="col-md-6">
                    <h6 className="text-muted">Event Information</h6>
                    <div className="mb-2">
                      <strong>Service:</strong> {selectedBooking.serviceType}
                    </div>
                    <div className="mb-2">
                      <strong>Event Type:</strong> {selectedBooking.eventType}
                    </div>
                    <div className="mb-2">
                      <strong>Date:</strong> {formatDateTime(selectedBooking.date, selectedBooking.time)}
                    </div>
                    <div className="mb-2">
                      <strong>Duration:</strong> {selectedBooking.duration}
                    </div>
                    <div className="mb-2">
                      <strong>Location:</strong> {selectedBooking.location}
                    </div>
                    <div className="mb-2">
                      <strong>Venue:</strong> {selectedBooking.venue}
                    </div>
                    <div className="mb-2">
                      <strong>Guests:</strong> {selectedBooking.guestCount} people
                    </div>
                  </div>
                </div>

                <div className="row mb-3">
                  <div className="col-12">
                    <h6 className="text-muted">Payment Information</h6>
                    <div className="row">
                      <div className="col-md-4 mb-2">
                        <strong>Total Amount:</strong>
                        <div className="text-primary fs-5">Rs. {selectedBooking.totalAmount.toLocaleString()}</div>
                      </div>
                      <div className="col-md-4 mb-2">
                        <strong>Advance Paid (50%):</strong>
                        <div className="text-success fs-5">Rs. {selectedBooking.advanceRequired.toLocaleString()}</div>
                      </div>
                      <div className="col-md-4 mb-2">
                        <strong>Remaining (50%):</strong>
                        <div className="text-warning fs-5">Rs. {selectedBooking.remainingAmount?.toLocaleString() || selectedBooking.advanceRequired.toLocaleString()}</div>
                      </div>
                    </div>
                    <div className="mt-2">
                      {getPaymentStatusBadge(selectedBooking)}
                    </div>
                  </div>
                </div>

                {selectedBooking.message && (
                  <div className="mb-3">
                    <h6 className="text-muted">Client Message</h6>
                    <div className="bg-light p-3 rounded">
                      "{selectedBooking.message}"
                    </div>
                  </div>
                )}

                {selectedBooking.specialRequests && (
                  <div className="mb-3">
                    <h6 className="text-muted">Special Requests</h6>
                    <div className="bg-light p-3 rounded">
                      {selectedBooking.specialRequests}
                    </div>
                  </div>
                )}

                <div className="mb-3">
                  <h6 className="text-muted">Status</h6>
                  <div>{getStatusBadge(selectedBooking.status)}</div>
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setSelectedBooking(null)}
                >
                  Close
                </button>
                {selectedBooking.status === 'confirmed' && (
                  <button 
                    type="button" 
                    className="btn btn-success" 
                    onClick={() => {
                      handleMarkCompleted(selectedBooking.id);
                      setSelectedBooking(null);
                    }}
                    disabled={processingAction === selectedBooking.id}
                  >
                    {processingAction === selectedBooking.id ? '⏳ Processing...' : '✅ Mark Work Completed'}
                  </button>
                )}
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  onClick={() => handleSendMessage(selectedBooking.id)}
                >
                  💬 Message Client
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingRequests;
