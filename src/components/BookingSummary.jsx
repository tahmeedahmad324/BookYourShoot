import React from 'react';
import './bookingSummary.css';

/**
 * BookingSummary Component
 * Shows detailed cost breakdown before payment
 * Used in booking flow to show transparent pricing
 */
const BookingSummary = ({ 
  photographerName, 
  serviceType = 'Photography Session',
  date, 
  duration = 4, // hours
  hourlyRate = 5000, 
  advancePercent = 50,
  deposit = 0,
  showPlatformFee = false, // Only shown to photographers
  onConfirm,
  onCancel
}) => {
  // Calculate costs
  const sessionCost = hourlyRate * duration;
  const advanceAmount = Math.floor(sessionCost * (advancePercent / 100));
  const platformFee = showPlatformFee ? Math.floor(sessionCost * 0.10) : 0;
  const photographerEarnings = showPlatformFee ? sessionCost - platformFee : 0;
  const totalNow = advanceAmount + deposit;
  const remainingAmount = sessionCost - advanceAmount;

  return (
    <div className="booking-summary card border-0 shadow-sm">
      <div className="card-header bg-primary text-white py-3">
        <h5 className="mb-0 fw-bold">📋 Booking Summary</h5>
      </div>
      <div className="card-body p-4">
        {/* Service Details */}
        <div className="mb-4">
          <h6 className="fw-bold text-muted mb-3">Service Details</h6>
          <div className="summary-row">
            <span>Photographer</span>
            <strong>{photographerName}</strong>
          </div>
          <div className="summary-row">
            <span>Service</span>
            <strong>{serviceType}</strong>
          </div>
          <div className="summary-row">
            <span>Date</span>
            <strong>{new Date(date).toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}</strong>
          </div>
          <div className="summary-row">
            <span>Duration</span>
            <strong>{duration} hours</strong>
          </div>
        </div>

        {/* Cost Breakdown */}
        <div className="mb-4">
          <h6 className="fw-bold text-muted mb-3">Cost Breakdown</h6>
          <div className="summary-row">
            <span>Hourly Rate</span>
            <span>Rs. {hourlyRate.toLocaleString()}/hr</span>
          </div>
          <div className="summary-row">
            <span>Session Cost ({duration} hrs)</span>
            <strong>Rs. {sessionCost.toLocaleString()}</strong>
          </div>
          {deposit > 0 && (
            <div className="summary-row text-info">
              <span>Equipment Deposit (Refundable)</span>
              <span>Rs. {deposit.toLocaleString()}</span>
            </div>
          )}
        </div>

        {/* Payment Schedule */}
        <div className="mb-4">
          <h6 className="fw-bold text-muted mb-3">Payment Schedule</h6>
          <div className="summary-row bg-light p-3 rounded">
            <span className="fw-semibold">Pay Now ({advancePercent}% Advance)</span>
            <span className="fw-bold text-primary fs-5">Rs. {totalNow.toLocaleString()}</span>
          </div>
          <div className="summary-row mt-2">
            <span className="text-muted">Remaining ({100 - advancePercent}%)</span>
            <span className="text-muted">Rs. {remainingAmount.toLocaleString()}</span>
          </div>
          <small className="text-muted d-block mt-2">
            💡 Remaining amount due on service completion
          </small>
        </div>

        {/* Platform Fee (Only for photographers) */}
        {showPlatformFee && (
          <div className="mb-4 border-top pt-3">
            <h6 className="fw-bold text-muted mb-3">Photographer Earnings</h6>
            <div className="summary-row">
              <span>Session Cost</span>
              <span>Rs. {sessionCost.toLocaleString()}</span>
            </div>
            <div className="summary-row text-danger">
              <span>Platform Fee (10%)</span>
              <span>- Rs. {platformFee.toLocaleString()}</span>
            </div>
            <div className="summary-row bg-success text-white p-3 rounded mt-2">
              <span className="fw-semibold">Your Earnings</span>
              <span className="fw-bold fs-5">Rs. {photographerEarnings.toLocaleString()}</span>
            </div>
          </div>
        )}

        {/* Security Notice */}
        <div className="alert alert-success border-0 mb-4">
          <div className="d-flex align-items-start gap-2">
            <span className="fs-4">🛡️</span>
            <div>
              <strong className="d-block mb-1">Payment Secured</strong>
              <small>
                Your payment is held securely by our platform until work is completed. 
                Full refund available if cancelled with proper notice.
              </small>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="d-flex gap-2">
          {onConfirm && (
            <button 
              className="btn btn-primary flex-grow-1 py-3 fw-bold" 
              onClick={onConfirm}
            >
              💳 Proceed to Payment
            </button>
          )}
          {onCancel && (
            <button 
              className="btn btn-outline-secondary py-3" 
              onClick={onCancel}
            >
              Cancel
            </button>
          )}
        </div>

        {/* Terms */}
        <div className="mt-3 text-center">
          <small className="text-muted">
            By proceeding, you agree to our{' '}
            <a href="/legal/terms" className="text-primary">Terms of Service</a>
            {' '}and{' '}
            <a href="/legal/refund" className="text-primary">Cancellation Policy</a>
          </small>
        </div>
      </div>
    </div>
  );
};

export default BookingSummary;
