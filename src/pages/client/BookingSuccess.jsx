import React, { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';

export default function BookingSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get('session_id');
  const [verifying, setVerifying] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [isEquipmentRental, setIsEquipmentRental] = useState(false);
  const [rentalDetails, setRentalDetails] = useState(null);

  useEffect(() => {
    if (sessionId) {
      // Check if this is an equipment rental
      const pendingRental = localStorage.getItem('pending_rental');
      if (pendingRental) {
        setIsEquipmentRental(true);
        setRentalDetails(JSON.parse(pendingRental));
      }

      // Verify payment with backend
      fetch(`http://localhost:5000/api/payments/status/${sessionId}`)
        .then(res => res.json())
        .then(data => {
          setPaymentStatus(data);
          setVerifying(false);
          
          if (data.status === 'success') {
            // Handle equipment rental
            if (pendingRental) {
              const rental = JSON.parse(pendingRental);
              rental.status = 'confirmed';
              rental.paymentStatus = 'paid';
              rental.transactionId = sessionId;
              
              // Save to bookings
              const existingBookings = JSON.parse(localStorage.getItem('equipmentRentals') || '[]');
              existingBookings.push(rental);
              localStorage.setItem('equipmentRentals', JSON.stringify(existingBookings));
              localStorage.removeItem('pending_rental');
              
              console.log('Equipment rental confirmed:', rental.id);
            } else {
              // Handle photographer booking
              const pendingBooking = localStorage.getItem('pending_booking');
              if (pendingBooking) {
                // Update booking status to confirmed
                const bookingId = pendingBooking;
                // In real app, update via API
                console.log('Booking confirmed:', bookingId);
                localStorage.removeItem('pending_booking');
              }
            }
          }
        })
        .catch(error => {
          console.error('Error verifying payment:', error);
          setVerifying(false);
        });
    } else {
      setVerifying(false);
    }
  }, [sessionId]);

  if (verifying) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center">
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" style={{ width: '3rem', height: '3rem' }}>
            <span className="visually-hidden">Verifying payment...</span>
          </div>
          <h4 className="fw-bold">Verifying Payment...</h4>
          <p className="text-muted">Please wait while we confirm your booking</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center py-5" 
         style={{ background: 'linear-gradient(135deg, #1A73E8 0%, #1557B0 100%)' }}>
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-lg-6">
            <div className="card border-0 shadow-lg" style={{ borderRadius: '20px' }}>
              <div className="card-body p-5 text-center">
                <div className="mb-4">
                  <div className="success-checkmark mx-auto mb-4" 
                       style={{ 
                         width: '80px', 
                         height: '80px', 
                         borderRadius: '50%',
                         background: '#4CAF50',
                         display: 'flex',
                         alignItems: 'center',
                         justifyContent: 'center',
                         margin: '0 auto'
                       }}>
                    <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </div>
                </div>

                <h2 className="fw-bold mb-3">Payment Successful!</h2>
                <p className="text-muted mb-4">
                  {isEquipmentRental 
                    ? `Your equipment rental is confirmed. The owner will contact you soon.`
                    : `Your booking is confirmed! The photographer has been notified.`
                  }
                </p>

                {/* Removed transaction ID - kept in backend for support */}

                <div className="bg-light rounded-3 p-4 mb-4">
                  <h6 className="fw-bold mb-3">What's Next?</h6>
                  <div className="text-start">
                    {isEquipmentRental ? (
                      <>
                        <div className="d-flex align-items-start mb-3">
                          <span className="badge bg-primary me-3 mt-1">1</span>
                          <div>
                            <strong>Confirmation Email</strong>
                            <p className="mb-0 small text-muted">You'll receive a rental confirmation via email</p>
                          </div>
                        </div>
                        <div className="d-flex align-items-start mb-3">
                          <span className="badge bg-primary me-3 mt-1">2</span>
                          <div>
                            <strong>Owner Will Contact You</strong>
                            <p className="mb-0 small text-muted">Equipment owner will reach out to arrange pickup details</p>
                          </div>
                        </div>
                        <div className="d-flex align-items-start">
                          <span className="badge bg-primary me-3 mt-1">3</span>
                          <div>
                            <strong>Pickup & Return</strong>
                            <p className="mb-0 small text-muted">Bring valid ID for pickup. Return on time to get full deposit back</p>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="d-flex align-items-start mb-3">
                          <span className="badge bg-primary me-3 mt-1">1</span>
                          <div>
                            <strong>Confirmation Email</strong>
                            <p className="mb-0 small text-muted">You'll receive a booking confirmation via email</p>
                          </div>
                        </div>
                        <div className="d-flex align-items-start mb-3">
                          <span className="badge bg-primary me-3 mt-1">2</span>
                          <div>
                            <strong>Photographer Contact</strong>
                            <p className="mb-0 small text-muted">The photographer will reach out within 24 hours</p>
                          </div>
                        </div>
                        <div className="d-flex align-items-start">
                          <span className="badge bg-primary me-3 mt-1">3</span>
                          <div>
                            <strong>Final Preparation</strong>
                            <p className="mb-0 small text-muted">Discuss final details before your event date</p>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="d-grid gap-3">
                  <Link 
                    to="/client/bookings" 
                    className="btn btn-primary btn-lg"
                    onClick={() => window.scrollTo(0, 0)}
                  >
                    View My Bookings
                  </Link>
                  <Link 
                    to="/client/dashboard" 
                    className="btn btn-outline-secondary"
                    onClick={() => window.scrollTo(0, 0)}
                  >
                    Back to Dashboard
                  </Link>
                </div>

                <div className="mt-4 pt-4 border-top">
                  <p className="small text-muted mb-2">
                    Need help? <Link to="/support" className="text-decoration-none">Contact Support</Link>
                  </p>
                  <p className="small text-muted mb-0">
                    🎓 <strong>Demo Mode:</strong> This is a test payment using Stripe test mode
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
