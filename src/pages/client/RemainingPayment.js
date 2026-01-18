import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import StripeCheckout from '../../components/StripeCheckout';

const API_BASE = 'http://localhost:5000/api';

const RemainingPayment = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  useEffect(() => {
    fetchBookingDetails();
  }, [bookingId]);

  const fetchBookingDetails = async () => {
    setLoading(true);
    try {
      // Try to fetch from API first
      const res = await fetch(`${API_BASE}/bookings/${bookingId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      
      if (res.ok) {
        const data = await res.json();
        setBooking(data.booking || data);
      } else {
        // Fall back to mock data for demo
        setBooking(getMockBooking(bookingId));
      }
    } catch (error) {
      console.error('Error fetching booking:', error);
      // Use mock data for demo
      setBooking(getMockBooking(bookingId));
    } finally {
      setLoading(false);
    }
  };

  const getMockBooking = (id) => {
    // Mock booking data for demo purposes
    return {
      id: id,
      photographerName: "Ahmed Photography",
      photographerId: "photographer-1",
      serviceType: "Wedding Photography",
      date: "2024-12-15",
      time: "14:00",
      duration: "4 hours",
      location: "Lahore",
      totalAmount: 50000,
      advancePaid: 25000,
      remainingAmount: 25000,
      status: "work_completed",
      paymentStatus: {
        advancePaid: true,
        advancePaidAt: "2024-12-01",
        workCompleted: true,
        workCompletedAt: "2024-12-15",
        remainingPaid: false
      }
    };
  };

  const handlePaymentSuccess = async () => {
    setPaymentSuccess(true);
    setShowPayment(false);
    
    // Update booking status
    try {
      await fetch(`${API_BASE}/bookings/${bookingId}/payment-complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({
          paymentType: 'remaining',
          amount: booking.remainingAmount
        })
      });
    } catch (error) {
      console.error('Error updating booking:', error);
    }
    
    // Redirect after 3 seconds
    setTimeout(() => {
      navigate('/client/bookings');
    }, 3000);
  };

  const handlePaymentCancel = () => {
    setShowPayment(false);
  };

  if (loading) {
    return (
      <div className="remaining-payment py-5">
        <div className="container">
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-3">Loading booking details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="remaining-payment py-5">
        <div className="container">
          <div className="text-center py-5">
            <div className="mb-4" style={{ fontSize: '4rem' }}>❌</div>
            <h3 className="fw-bold mb-3">Booking Not Found</h3>
            <p className="text-muted mb-4">
              We couldn't find the booking you're looking for.
            </p>
            <Link to="/client/bookings" className="btn btn-primary">
              Back to My Bookings
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (paymentSuccess) {
    return (
      <div className="remaining-payment py-5">
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-md-6">
              <div className="card border-0 shadow-lg text-center">
                <div className="card-body py-5">
                  <div className="mb-4" style={{ fontSize: '5rem' }}>✅</div>
                  <h2 className="fw-bold text-success mb-3">Payment Successful!</h2>
                  <p className="text-muted mb-4">
                    Your remaining payment of <strong>Rs. {booking.remainingAmount?.toLocaleString()}</strong> has been processed.
                  </p>
                  <div className="alert alert-info">
                    <strong>What's Next?</strong>
                    <ul className="mb-0 mt-2 text-start">
                      <li>Payment is now in escrow for 7 days</li>
                      <li>Photographer will receive funds after escrow period</li>
                      <li>You can leave a review for the photographer</li>
                    </ul>
                  </div>
                  <p className="text-muted small">Redirecting to your bookings...</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="remaining-payment py-4">
      <div className="container">
        {/* Header */}
        <div className="mb-4">
          <Link to="/client/bookings" className="btn btn-outline-secondary btn-sm mb-3">
            ← Back to Bookings
          </Link>
          <h2 className="fw-bold">💰 Complete Your Payment</h2>
          <p className="text-muted">Pay the remaining 50% for your completed booking</p>
        </div>

        <div className="row">
          {/* Booking Summary */}
          <div className="col-lg-7 mb-4">
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-white py-3">
                <h5 className="mb-0 fw-bold">📋 Booking Summary</h5>
              </div>
              <div className="card-body">
                {/* Photographer Info */}
                <div className="d-flex align-items-center mb-4 pb-3 border-bottom">
                  <div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center me-3"
                       style={{ width: '60px', height: '60px', fontSize: '1.5rem' }}>
                    📸
                  </div>
                  <div>
                    <h5 className="fw-bold mb-1">{booking.photographerName}</h5>
                    <span className="badge bg-success">Work Completed ✓</span>
                  </div>
                </div>

                {/* Booking Details */}
                <div className="row mb-4">
                  <div className="col-6 mb-3">
                    <div className="text-muted small">Service Type</div>
                    <div className="fw-semibold">{booking.serviceType}</div>
                  </div>
                  <div className="col-6 mb-3">
                    <div className="text-muted small">Date & Time</div>
                    <div className="fw-semibold">
                      {new Date(booking.date).toLocaleDateString()} at {booking.time}
                    </div>
                  </div>
                  <div className="col-6 mb-3">
                    <div className="text-muted small">Duration</div>
                    <div className="fw-semibold">{booking.duration}</div>
                  </div>
                  <div className="col-6 mb-3">
                    <div className="text-muted small">Location</div>
                    <div className="fw-semibold">📍 {booking.location}</div>
                  </div>
                </div>

                {/* Payment Progress */}
                <div className="bg-light rounded-3 p-3 mb-4">
                  <h6 className="fw-bold mb-3">Payment Progress</h6>
                  <div className="d-flex align-items-center mb-2">
                    <div className="flex-grow-1">
                      <div className="progress" style={{ height: '10px' }}>
                        <div className="progress-bar bg-success" style={{ width: '50%' }}></div>
                        <div className="progress-bar bg-warning" style={{ width: '50%' }}></div>
                      </div>
                    </div>
                  </div>
                  <div className="d-flex justify-content-between small">
                    <span className="text-success">✓ 50% Advance Paid</span>
                    <span className="text-warning">⏳ 50% Remaining</span>
                  </div>
                </div>

                {/* Payment Timeline */}
                <div className="border rounded-3 p-3">
                  <h6 className="fw-bold mb-3">Payment Timeline</h6>
                  <div className="timeline">
                    <div className="d-flex mb-3">
                      <div className="me-3">
                        <div className="rounded-circle bg-success text-white d-flex align-items-center justify-content-center"
                             style={{ width: '30px', height: '30px' }}>
                          ✓
                        </div>
                      </div>
                      <div>
                        <div className="fw-semibold">Advance Payment (50%)</div>
                        <div className="text-muted small">
                          Rs. {booking.advancePaid?.toLocaleString()} - Paid on {booking.paymentStatus?.advancePaidAt || 'N/A'}
                        </div>
                      </div>
                    </div>
                    <div className="d-flex mb-3">
                      <div className="me-3">
                        <div className="rounded-circle bg-success text-white d-flex align-items-center justify-content-center"
                             style={{ width: '30px', height: '30px' }}>
                          ✓
                        </div>
                      </div>
                      <div>
                        <div className="fw-semibold">Work Completed</div>
                        <div className="text-muted small">
                          Completed on {booking.paymentStatus?.workCompletedAt || booking.date}
                        </div>
                      </div>
                    </div>
                    <div className="d-flex">
                      <div className="me-3">
                        <div className="rounded-circle bg-warning text-white d-flex align-items-center justify-content-center"
                             style={{ width: '30px', height: '30px' }}>
                          💰
                        </div>
                      </div>
                      <div>
                        <div className="fw-semibold text-warning">Remaining Payment (50%)</div>
                        <div className="text-muted small">
                          Rs. {booking.remainingAmount?.toLocaleString()} - Due Now
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Section */}
          <div className="col-lg-5">
            <div className="card border-0 shadow-sm sticky-top" style={{ top: '100px' }}>
              <div className="card-header bg-primary text-white py-3">
                <h5 className="mb-0 fw-bold">💳 Payment Details</h5>
              </div>
              <div className="card-body">
                {showPayment ? (
                  <StripeCheckout
                    amount={booking.remainingAmount}
                    bookingId={`${booking.id}_remaining`}
                    customerEmail={user?.email}
                    customerPhone={user?.phone}
                    onSuccess={handlePaymentSuccess}
                    onCancel={handlePaymentCancel}
                    metadata={{
                      payment_type: 'remaining_payment',
                      photographer_id: booking.photographerId,
                      photographer_name: booking.photographerName,
                      service_type: booking.serviceType
                    }}
                  />
                ) : (
                  <>
                    {/* Amount Breakdown */}
                    <div className="mb-4">
                      <div className="d-flex justify-content-between mb-2">
                        <span>Total Booking Amount</span>
                        <span className="fw-semibold">Rs. {booking.totalAmount?.toLocaleString()}</span>
                      </div>
                      <div className="d-flex justify-content-between mb-2 text-success">
                        <span>Advance Paid (50%)</span>
                        <span>- Rs. {booking.advancePaid?.toLocaleString()}</span>
                      </div>
                      <hr />
                      <div className="d-flex justify-content-between">
                        <span className="fw-bold">Amount Due Now</span>
                        <span className="fw-bold text-primary fs-4">
                          Rs. {booking.remainingAmount?.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Security Info */}
                    <div className="alert alert-info small mb-4">
                      <div className="fw-bold mb-1">🔒 Secure Payment</div>
                      <ul className="mb-0 ps-3">
                        <li>Payment held in escrow for 7 days</li>
                        <li>Released to photographer after escrow period</li>
                        <li>100% secure with Stripe</li>
                      </ul>
                    </div>

                    {/* Pay Button */}
                    <button
                      className="btn btn-primary btn-lg w-100 mb-3"
                      onClick={() => setShowPayment(true)}
                    >
                      💳 Pay Rs. {booking.remainingAmount?.toLocaleString()} Now
                    </button>

                    {/* Payment Methods */}
                    <div className="text-center">
                      <div className="text-muted small mb-2">Accepted Payment Methods</div>
                      <div className="d-flex justify-content-center gap-2">
                        <span className="badge bg-light text-dark">💳 Credit Card</span>
                        <span className="badge bg-light text-dark">💳 Debit Card</span>
                        <span className="badge bg-light text-dark">🏦 Bank Transfer</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Help Section */}
            <div className="card border-0 shadow-sm mt-3">
              <div className="card-body">
                <h6 className="fw-bold mb-3">❓ Need Help?</h6>
                <p className="text-muted small mb-2">
                  Having issues with payment? Contact our support team.
                </p>
                <Link to="/support" className="btn btn-outline-primary btn-sm">
                  Contact Support
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RemainingPayment;
