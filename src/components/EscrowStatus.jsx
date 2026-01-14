import React, { useState } from 'react';
import '../styles/escrow.css';

/**
 * EscrowStatus Component
 * Shows payment escrow status and allows actions like releasing payment or requesting refund
 */
const EscrowStatus = ({ booking, onRelease, onRefund, userRole }) => {
  const [loading, setLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [action, setAction] = useState(null); // 'release' or 'refund'

  // Calculate days until auto-release
  const getDaysUntilAutoRelease = () => {
    if (!booking.paymentDate) return 7;
    const paymentDate = new Date(booking.paymentDate);
    const now = new Date();
    const daysPassed = Math.floor((now - paymentDate) / (1000 * 60 * 60 * 24));
    return Math.max(0, 7 - daysPassed);
  };

  // Calculate cancellation refund amount
  const getCancellationRefund = () => {
    if (!booking.date) return { refund: 0, policy: 'Unknown' };
    
    const bookingDate = new Date(booking.date);
    const now = new Date();
    const daysUntilBooking = Math.floor((bookingDate - now) / (1000 * 60 * 60 * 24));
    
    if (daysUntilBooking >= 14) {
      return { refund: 100, policy: 'Full refund - 14+ days notice' };
    } else if (daysUntilBooking >= 7) {
      return { refund: 50, policy: '50% refund - 7-13 days notice' };
    } else if (daysUntilBooking >= 3) {
      return { refund: 25, policy: '25% refund - 3-6 days notice' };
    } else {
      return { refund: 0, policy: 'No refund - Less than 3 days notice' };
    }
  };

  const handleReleasePayment = async () => {
    setLoading(true);
    try {
      await fetch(`http://localhost:5000/api/payments/escrow/release/${booking.transactionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Work completed - confirmed by client' })
      });
      
      if (onRelease) onRelease(booking.id);
      alert('✅ Payment released to photographer!');
      setShowConfirmDialog(false);
    } catch (error) {
      console.error('Error releasing payment:', error);
      alert('❌ Failed to release payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestRefund = async () => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/api/payments/escrow/refund/${booking.transactionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_date: booking.date,
          reason: 'Booking cancelled by client'
        })
      });
      
      const result = await response.json();
      
      if (onRefund) onRefund(booking.id, result);
      
      alert(`✅ Refund processed!\\n\\nYour refund: Rs. ${result.refund_amount.toLocaleString()}\\nPhotographer payment: Rs. ${result.photographer_payment.toLocaleString()}\\n\\nPolicy: ${result.policy}`);
      setShowConfirmDialog(false);
    } catch (error) {
      console.error('Error processing refund:', error);
      alert('❌ Failed to process refund. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const openConfirmDialog = (actionType) => {
    setAction(actionType);
    setShowConfirmDialog(true);
  };

  const getEscrowStatusBadge = () => {
    if (!booking.escrowStatus) return null;
    
    const statusConfig = {
      held: { color: 'success', icon: '✅', text: 'Payment Secured' },
      released: { color: 'success', icon: '✅', text: 'Completed' },
      refunded: { color: 'info', icon: '↩️', text: 'Refunded' },
      partially_refunded: { color: 'info', icon: '↩️', text: 'Refunded' }
    };
    
    const config = statusConfig[booking.escrowStatus] || statusConfig.held;
    return (
      <span className={`badge bg-${config.color} d-inline-flex align-items-center fs-6`}>
        <span className="me-1">{config.icon}</span>
        {config.text}
      </span>
    );
  };

  const refundInfo = getCancellationRefund();
  const daysUntilRelease = getDaysUntilAutoRelease();

  return (
    <div className="escrow-status-container">
      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h6 className="fw-bold mb-0">💰 Payment Status</h6>
            {getEscrowStatusBadge()}
          </div>

          {booking.escrowStatus === 'held' && (
            <>
              {/* Payment Info */}
              <div className="alert alert-success mb-3">
                <div className="d-flex align-items-start">
                  <span className="me-2">✅</span>
                  <div className="flex-grow-1">
                    <strong>Payment Secured</strong>
                    <p className="mb-0 small mt-1">
                      {userRole === 'client' && `Your payment of Rs. ${booking.paidAmount?.toLocaleString()} is protected. Confirm when work is complete to finalize the booking.`}
                      {userRole === 'photographer' && `Payment of Rs. ${Math.floor(booking.paidAmount * 0.9).toLocaleString()} secured for you. Will be released after client confirmation.`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Auto-release Notice - Only for photographers */}
              {userRole === 'photographer' && daysUntilRelease > 0 && (
                <div className="alert alert-info mb-3">
                  <small>
                    ℹ️ Payment auto-releases in <strong>{daysUntilRelease} days</strong> if client doesn't respond.
                  </small>
                </div>
              )}
              
              {/* Client reminder */}
              {userRole === 'client' && booking.status === 'completed' && (
                <div className="alert alert-info mb-3">
                  <small>
                    💡 You have 7 days to review the work and confirm completion.
                  </small>
                </div>
              )}

              {/* Breakdown - Only for photographers */}
              {userRole === 'photographer' && (
                <div className="bg-light rounded p-3 mb-3">
                  <div className="d-flex justify-content-between mb-2">
                    <span className="text-muted small">Payment Amount:</span>
                    <span className="fw-semibold">Rs. {booking.paidAmount?.toLocaleString()}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-2">
                    <span className="text-muted small">Your Earnings:</span>
                    <span className="fw-semibold text-success">Rs. {Math.floor(booking.paidAmount * 0.9).toLocaleString()}</span>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span className="text-muted small">Service Fee:</span>
                    <span className="fw-semibold text-muted">Rs. {Math.floor(booking.paidAmount * 0.1).toLocaleString()}</span>
                  </div>
                </div>
              )}

              {/* Client Actions */}
              {userRole === 'client' && booking.status === 'completed' && (
                <div className="d-grid gap-2">
                  <button 
                    className="btn btn-success"
                    onClick={() => openConfirmDialog('release')}
                    disabled={loading}
                  >
                    ✅ Confirm Work Completed & Release Payment
                  </button>
                  <small className="text-muted text-center">
                    Only release payment after you've received and approved all deliverables
                  </small>
                </div>
              )}

              {/* Client Cancellation */}
              {userRole === 'client' && (booking.status === 'confirmed' || booking.status === 'pending') && (
                <div className="mt-3">
                  <button 
                    className="btn btn-outline-secondary btn-sm w-100"
                    onClick={() => openConfirmDialog('refund')}
                    disabled={loading}
                  >
                    Need to Cancel?
                  </button>
                </div>
              )}

              {/* Photographer Info */}
              {userRole === 'photographer' && (
                <div className="alert alert-success mb-0">
                  <small>
                    💡 <strong>Payment secured!</strong> Rs. {Math.floor(booking.paidAmount * 0.9).toLocaleString()} will be transferred after client confirms or in 7 days.
                  </small>
                </div>
              )}
            </>
          )}

          {booking.escrowStatus === 'released' && (
            <div className="alert alert-success mb-0">
              <div className="d-flex align-items-start">
                <span className="me-2">✅</span>
                <div>
                  <strong>Booking Complete</strong>
                  <p className="mb-0 small mt-1">
                    {userRole === 'photographer' 
                      ? `Payment of Rs. ${Math.floor(booking.paidAmount * 0.9).toLocaleString()} has been transferred to your account.`
                      : `Thank you! Your booking is complete.`
                    }
                  </p>
                </div>
              </div>
            </div>
          )}

          {(booking.escrowStatus === 'refunded' || booking.escrowStatus === 'partially_refunded') && (
            <div className="alert alert-info mb-0">
              <div className="d-flex align-items-start">
                <span className="me-2">↩️</span>
                <div>
                  <strong>Refund Processed</strong>
                  <p className="mb-0 small mt-1">
                    Refund has been processed according to the cancellation policy.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {action === 'release' ? '✅ Confirm Payment Release' : '❌ Confirm Cancellation'}
                </h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowConfirmDialog(false)}
                  disabled={loading}
                ></button>
              </div>
              <div className="modal-body">
                {action === 'release' ? (
                  <div>
                    <p>Are you sure you want to release the payment to the photographer?</p>
                    <div className="alert alert-warning">
                      <strong>⚠️ This action cannot be undone!</strong>
                      <div className="mt-2">
                        By confirming, you acknowledge that:
                        <ul className="mb-0 mt-2">
                          <li>You have received all deliverables</li>
                          <li>The work meets your expectations</li>
                          <li>Rs. {Math.floor(booking.paidAmount * 0.9).toLocaleString()} will be transferred to the photographer</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p>Are you sure you want to cancel this booking?</p>
                    <div className="alert alert-warning">
                      <strong>📋 Refund Amount</strong>
                      <div className="mt-2">
                        <div className="text-muted small">{refundInfo.policy}</div>
                      </div>
                      <div className="mt-3">
                        <div className="h5 mb-0">You'll receive: Rs. {Math.floor(booking.paidAmount * refundInfo.refund / 100).toLocaleString()}</div>
                        {refundInfo.refund < 100 && (
                          <small className="text-muted">Rs. {Math.floor(booking.paidAmount * (100 - refundInfo.refund) / 100).toLocaleString()} goes to photographer for blocked time</small>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowConfirmDialog(false)}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className={`btn ${action === 'release' ? 'btn-success' : 'btn-danger'}`}
                  onClick={action === 'release' ? handleReleasePayment : handleRequestRefund}
                  disabled={loading}
                >
                  {loading ? 'Processing...' : (action === 'release' ? 'Confirm Release' : 'Confirm Cancellation')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EscrowStatus;
