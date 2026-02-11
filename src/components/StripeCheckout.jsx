import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import '../styles/payment.css';

// Load Stripe with your publishable key
// Replace with your actual test key from .env or config
const stripePromise = loadStripe(
  process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY ||
  'pk_test_51QivafP8o5TaCBpE8EpQKKqYG5o2iJ3lOMxMVDpJUWoSGSxUf6lOVEMEZbqD6aIqlH0UbxDCGOzrfuTvvATVP0iO00GBjmh0Bo'
);

export default function StripeCheckout({ bookingId, amount, photographerName, onSuccess, onCancel, isEquipmentRental = false, bookingData = null }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handlePayment = async () => {
    setLoading(true);
    setError(null);

    try {
      // Call your backend to create checkout session
      const response = await fetch('http://localhost:8000/api/payments/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          booking_id: bookingId,
          amount: amount,
          currency: 'PKR', // Pakistani Rupees
          payment_method: 'card',
          customer_phone: bookingData?.phone || '1234567890',
          customer_email: bookingData?.clientEmail || 'client@example.com',
          // Pass metadata for receipt and notifications
          client_name: bookingData?.clientName || 'Client',
          photographer_name: bookingData?.photographerName || photographerName || 'Photographer',
          photographer_id: bookingData?.photographerEmail || bookingData?.photographerId || '',
          service_type: isEquipmentRental ? `Equipment Rental - ${bookingData?.equipmentName || 'Equipment'}` : (bookingData?.service || 'Photography Service'),
          event_date: bookingData?.date || '',
          // Pass full price info for email
          total_price: bookingData?.price || amount,
          advance_payment: bookingData?.advancePayment || amount
        })
      });

      const data = await response.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      // Redirect to Stripe Checkout
      if (data.checkout_url) {
        // Save booking ID and data to localStorage to retrieve after redirect
        localStorage.setItem('pending_booking', bookingId);
        if (bookingData) {
          localStorage.setItem('pending_booking_data', JSON.stringify(bookingData));
        }
        // Redirect to Stripe Checkout
        window.location.href = data.checkout_url;
      } else {
        setError('Failed to create checkout session');
      }
    } catch (err) {
      console.error('Payment error:', err);
      setError('Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="stripe-checkout-container">
      <div className="payment-card">
        <div className="payment-header">
          <h2>{isEquipmentRental ? 'Complete Equipment Rental' : 'Complete Your Booking'}</h2>
          <p className="photographer-name">{photographerName}</p>
        </div>

        <div className="payment-details">
          <div className="detail-row">
            <span>Booking Reference:</span>
            <span className="detail-value">{bookingId}</span>
          </div>
          {bookingData?.price && bookingData.price !== amount && !isEquipmentRental && (
            <>
              <div className="detail-row">
                <span>Total Booking Price:</span>
                <span className="detail-value">Rs. {bookingData.price.toLocaleString()}</span>
              </div>
              <div className="detail-row">
                <span>Remaining Balance:</span>
                <span className="detail-value text-muted">Rs. {(bookingData.price - amount).toLocaleString()} (due on event day)</span>
              </div>
            </>
          )}
          {isEquipmentRental && bookingData?.rentalCost && bookingData?.deposit && (
            <>
              <div className="detail-row">
                <span>Rental Cost ({bookingData.rentalDays} days):</span>
                <span className="detail-value">Rs. {bookingData.rentalCost.toLocaleString()}</span>
              </div>
              <div className="detail-row">
                <span>Security Deposit:</span>
                <span className="detail-value">Rs. {bookingData.deposit.toLocaleString()}</span>
              </div>
            </>
          )}
          <div className="detail-row total">
            <span>{isEquipmentRental ? 'Total Amount:' : (bookingData?.price && bookingData.price !== amount ? 'Deposit to Pay Now:' : 'Total Amount:')}</span>
            <span className="detail-value">Rs. {amount.toLocaleString()}</span>
          </div>
          <div className="text-muted small text-center mt-2">
            {isEquipmentRental
              ? 'Deposit refundable after equipment return'
              : 'Your payment is secured until work is completed'
            }
          </div>
        </div>

        {error && (
          <div className="payment-error">
            ⚠️ {error}
          </div>
        )}

        <div className="payment-actions">
          <button
            onClick={handlePayment}
            disabled={loading}
            className="pay-button"
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                Processing...
              </>
            ) : (
              <>
                🔒 Pay with Stripe
              </>
            )}
          </button>

          {onCancel && (
            <button
              onClick={onCancel}
              disabled={loading}
              className="cancel-button"
            >
              Cancel
            </button>
          )}
        </div>

        <div className="test-mode-notice">
          <p>🎓 <strong>Demo Mode</strong></p>
          <p>Use test card: <code>4242 4242 4242 4242</code></p>
          <p>Expiry: Any future date | CVV: Any 3 digits</p>
        </div>

        <div className="secure-notice">
          <p>🔒 Secured by Stripe | Your payment information is encrypted</p>
        </div>
      </div>
    </div>
  );
}
