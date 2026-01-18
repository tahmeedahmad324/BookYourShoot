import React, { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';

const API_BASE = 'http://localhost:5000/api';

export default function BookingSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get('session_id');
  const [verifying, setVerifying] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [isEquipmentRental, setIsEquipmentRental] = useState(false);
  const [rentalDetails, setRentalDetails] = useState(null);
  const [downloadingReceipt, setDownloadingReceipt] = useState(false);
  const [bookingId, setBookingId] = useState(null);

  useEffect(() => {
    if (sessionId) {
      console.log('BookingSuccess: sessionId =', sessionId);
      
      // Check if this is an equipment rental
      const pendingRental = localStorage.getItem('pending_rental');
      if (pendingRental) {
        setIsEquipmentRental(true);
        setRentalDetails(JSON.parse(pendingRental));
      }

      // Verify payment with backend
      console.log('BookingSuccess: Calling /status API...');
      fetch(`http://localhost:5000/api/payments/status/${sessionId}`)
        .then(res => res.json())
        .then(async (data) => {
          console.log('BookingSuccess: Payment status =', data);
          setPaymentStatus(data);
          setVerifying(false);
          
          if (data.status === 'success') {
            // Handle equipment rental
            if (pendingRental) {
              const rental = JSON.parse(pendingRental);
              rental.status = 'confirmed';
              rental.paymentStatus = 'paid';
              rental.transactionId = sessionId;
              setBookingId(rental.id);
              
              // Save to bookings
              const existingBookings = JSON.parse(localStorage.getItem('equipmentRentals') || '[]');
              existingBookings.push(rental);
              localStorage.setItem('equipmentRentals', JSON.stringify(existingBookings));
              localStorage.removeItem('pending_rental');
              
              console.log('Equipment rental confirmed:', rental.id);
              
              // Send equipment rental confirmation email and notifications
              try {
                // Get auth user email from localStorage OR sessionStorage
                const authUser = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
                const emailAddress = rental.clientEmail || authUser.email;
                const notificationUserId = authUser.email || rental.clientEmail;
                
                console.log('BookingSuccess: Sending equipment rental email...');
                console.log('BookingSuccess: Rental details:', rental);
                
                const emailResponse = await fetch(`${API_BASE}/payments/send-equipment-rental-email`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    client_email: emailAddress,
                    client_name: rental.clientName || authUser.name || 'Client',
                    rental_id: rental.id,
                    equipment_name: rental.equipmentName || rental.equipmentSummary || 'Equipment',
                    equipment_category: rental.equipmentCategory || 'Photography Equipment',
                    rental_period: rental.period ? `${rental.rentalDays} days (${rental.period})` : `${rental.rentalDays || 'N/A'} days`,
                    start_date: rental.startDate || new Date().toISOString().split('T')[0],
                    owner_name: rental.ownerName || 'Equipment Owner',
                    owner_phone: rental.ownerPhone || 'N/A',
                    rental_cost: rental.rentalCost || rental.totalAmount || 0,
                    deposit: rental.deposit || rental.depositAmount || 0,
                    total_amount: rental.totalAmount || 0,
                    notification_user_id: notificationUserId
                  })
                });
                const emailResult = await emailResponse.json();
                console.log('BookingSuccess: Equipment rental email API response:', emailResult);
              } catch (emailErr) {
                console.error('Failed to send equipment rental confirmation email:', emailErr);
              }
            } else {
              // Handle photographer booking
              const pendingBookingId = localStorage.getItem('pending_booking');
              const pendingBookingData = localStorage.getItem('pending_booking_data');
              
              console.log('BookingSuccess: pendingBookingId =', pendingBookingId);
              console.log('BookingSuccess: pendingBookingData =', pendingBookingData ? 'exists' : 'null');
              console.log('BookingSuccess: Payment status data =', data);
              
              // Get booking ID from localStorage OR from Stripe metadata
              const bookingIdToUse = pendingBookingId || data.metadata?.booking_id;
              
              if (bookingIdToUse) {
                setBookingId(bookingIdToUse);
                console.log('Booking confirmed:', bookingIdToUse);
                
                // Clear localStorage to prevent duplicate calls
                localStorage.removeItem('pending_booking');
                localStorage.removeItem('pending_booking_data');
                
                // Get booking info from localStorage OR from Stripe metadata
                let bookingInfo = null;
                if (pendingBookingData) {
                  bookingInfo = JSON.parse(pendingBookingData);
                } else if (data.metadata) {
                  // Fallback to Stripe metadata
                  console.log('BookingSuccess: Using Stripe metadata as fallback');
                  const totalPrice = parseFloat(data.metadata.total_price) || (data.amount_total || data.amount || 0) / 100;
                  const advancePayment = parseFloat(data.metadata.advance_payment) || (data.amount_total || data.amount || 0) / 100;
                  bookingInfo = {
                    id: data.metadata.booking_id || bookingIdToUse,
                    clientName: data.metadata.client_name || 'Client',
                    clientEmail: data.metadata.client_email || data.customer_email,
                    photographerName: data.metadata.photographer_name || 'Photographer',
                    photographerId: data.metadata.photographer_id || '',
                    service: data.metadata.service_type || 'Photography Service',
                    date: data.metadata.event_date || '',
                    time: '',
                    location: '',
                    price: totalPrice,
                    advancePayment: advancePayment
                  };
                }
                
                // Send confirmation email if we have booking data
                if (bookingInfo) {
                  try {
                    // Get auth user email from localStorage OR sessionStorage (matches AuthContext)
                    const authUser = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
                    // Use form email for actual email delivery
                    const emailAddress = bookingInfo.clientEmail || authUser.email;
                    // Use auth email for notifications (to match NotificationDropdown query)
                    const notificationUserId = authUser.email || bookingInfo.clientEmail;
                    
                    console.log('BookingSuccess: Auth user from storage:', authUser);
                    console.log('BookingSuccess: Sending email with:', bookingInfo);
                    console.log('BookingSuccess: Email address:', emailAddress);
                    console.log('BookingSuccess: Notification user ID:', notificationUserId);
                    
                    const emailResponse = await fetch(`${API_BASE}/payments/send-booking-email`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        client_email: emailAddress, // Real email for email delivery
                        notification_user_id: notificationUserId, // Auth email for notifications
                        client_name: bookingInfo.clientName,
                        photographer_name: bookingInfo.photographerName,
                        photographer_id: String(bookingInfo.photographerId || bookingInfo.photographerEmail || bookingInfo.photographerName),
                        booking_id: bookingInfo.id,
                        service_type: bookingInfo.service,
                        event_date: bookingInfo.date,
                        event_time: bookingInfo.time,
                        location: bookingInfo.location,
                        amount: bookingInfo.price,
                        advance_paid: bookingInfo.advancePayment
                      })
                    });
                    const emailResult = await emailResponse.json();
                    console.log('BookingSuccess: Email API response:', emailResult);
                  } catch (emailErr) {
                    console.error('Failed to send confirmation email:', emailErr);
                  }
                } else {
                  console.log('BookingSuccess: No booking data available (localStorage or Stripe metadata)');
                }
              } else {
                console.log('BookingSuccess: No booking ID found (localStorage or Stripe metadata)');
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

  const handleDownloadReceipt = async () => {
    if (!bookingId && !sessionId) return;
    
    setDownloadingReceipt(true);
    try {
      const id = bookingId || sessionId;
      const response = await fetch(`${API_BASE}/payments/receipts/${id}/pdf`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Receipt_${id}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
      } else {
        alert('Receipt not available yet. Please try again later.');
      }
    } catch (error) {
      console.error('Error downloading receipt:', error);
      alert('Failed to download receipt. Please try again.');
    } finally {
      setDownloadingReceipt(false);
    }
  };

  const handleViewReceipt = async () => {
    if (!bookingId && !sessionId) return;
    
    const id = bookingId || sessionId;
    // Open receipt in new tab (HTML version)
    window.open(`${API_BASE}/payments/receipts/${id}/html`, '_blank');
  };

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

                {/* 50% Advance Payment Notice */}
                {!isEquipmentRental && (
                  <div className="alert alert-info mb-4">
                    <strong>✅ 50% Advance Paid</strong>
                    <p className="mb-0 small">The remaining 50% will be due after your photography session is complete.</p>
                  </div>
                )}

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
                        <div className="d-flex align-items-start mb-3">
                          <span className="badge bg-primary me-3 mt-1">3</span>
                          <div>
                            <strong>Photography Session</strong>
                            <p className="mb-0 small text-muted">Enjoy your photography session on the scheduled date</p>
                          </div>
                        </div>
                        <div className="d-flex align-items-start">
                          <span className="badge bg-success me-3 mt-1">4</span>
                          <div>
                            <strong>Pay Remaining 50%</strong>
                            <p className="mb-0 small text-muted">Complete payment after work is done, then receive your photos</p>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="d-grid gap-3">
                  {/* Receipt Options */}
                  <div className="d-flex gap-2">
                    <button
                      onClick={handleViewReceipt}
                      className="btn btn-success flex-grow-1"
                    >
                      🧾 View Receipt
                    </button>
                    <button
                      onClick={handleDownloadReceipt}
                      className="btn btn-outline-success flex-grow-1"
                      disabled={downloadingReceipt}
                    >
                      {downloadingReceipt ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" />
                          Downloading...
                        </>
                      ) : (
                        <>📥 Download PDF</>
                      )}
                    </button>
                  </div>
                  
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
