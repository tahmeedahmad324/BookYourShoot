import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import StripeCheckout from '../components/StripeCheckout';
import '../styles/payment-test.css';

export default function PaymentTestPage() {
  const [searchParams] = useSearchParams();
  const [showPayment, setShowPayment] = useState(false);
  
  // Demo booking data
  const [bookingData, setBookingData] = useState({
    bookingId: `BOOK-${Date.now()}`,
    amount: 150.00,
    photographerName: 'John Doe Photography',
  });

  // Check if we're coming back from successful payment
  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    if (sessionId) {
      // Payment was successful
      console.log('Payment successful! Session ID:', sessionId);
    }
  }, [searchParams]);

  const handleAmountChange = (e) => {
    setBookingData({
      ...bookingData,
      amount: parseFloat(e.target.value) || 0
    });
  };

  const handlePhotographerChange = (e) => {
    setBookingData({
      ...bookingData,
      photographerName: e.target.value
    });
  };

  const generateNewBookingId = () => {
    setBookingData({
      ...bookingData,
      bookingId: `BOOK-${Date.now()}`
    });
  };

  if (showPayment) {
    return (
      <StripeCheckout
        bookingId={bookingData.bookingId}
        amount={bookingData.amount}
        photographerName={bookingData.photographerName}
        onSuccess={() => {
          alert('Payment successful!');
          setShowPayment(false);
        }}
        onCancel={() => setShowPayment(false)}
      />
    );
  }

  return (
    <div className="payment-test-page">
      <div className="test-container">
        <header className="test-header">
          <h1>🎓 Stripe Payment Demo</h1>
          <p>Test the payment integration for your FYP</p>
        </header>

        <div className="demo-card">
          <h2>Configure Test Booking</h2>
          
          <div className="form-group">
            <label>Booking ID:</label>
            <div className="input-with-button">
              <input 
                type="text" 
                value={bookingData.bookingId}
                readOnly
                className="readonly-input"
              />
              <button onClick={generateNewBookingId} className="generate-btn">
                🔄 New
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>Photographer Name:</label>
            <input 
              type="text" 
              value={bookingData.photographerName}
              onChange={handlePhotographerChange}
              placeholder="Enter photographer name"
            />
          </div>

          <div className="form-group">
            <label>Amount (PKR):</label>
            <input 
              type="number" 
              value={bookingData.amount}
              onChange={handleAmountChange}
              placeholder="Enter amount"
              min="1"
              step="0.01"
            />
          </div>

          <div className="booking-summary">
            <h3>Booking Summary</h3>
            <div className="summary-row">
              <span>Booking ID:</span>
              <strong>{bookingData.bookingId}</strong>
            </div>
            <div className="summary-row">
              <span>Photographer:</span>
              <strong>{bookingData.photographerName}</strong>
            </div>
            <div className="summary-row total-row">
              <span>Total Amount:</span>
              <strong>Rs. {bookingData.amount.toLocaleString()}</strong>
            </div>
          </div>

          <button 
            onClick={() => setShowPayment(true)}
            className="proceed-button"
          >
            Proceed to Payment 💳
          </button>
        </div>

        <div className="test-instructions">
          <h3>📝 Testing Instructions</h3>
          <ol>
            <li>Click "Proceed to Payment" button</li>
            <li>You'll be redirected to Stripe Checkout</li>
            <li>Use test card: <code>4242 4242 4242 4242</code></li>
            <li>Enter any future expiry date (e.g., 12/34)</li>
            <li>Enter any 3-digit CVV (e.g., 123)</li>
            <li>Enter any ZIP code (e.g., 12345)</li>
            <li>Click "Pay" to complete the test payment</li>
          </ol>

          <div className="test-cards">
            <h4>More Test Cards:</h4>
            <table>
              <thead>
                <tr>
                  <th>Card Number</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><code>4242 4242 4242 4242</code></td>
                  <td>✅ Success</td>
                </tr>
                <tr>
                  <td><code>4000 0000 0000 9995</code></td>
                  <td>❌ Declined</td>
                </tr>
                <tr>
                  <td><code>4000 0000 0000 0077</code></td>
                  <td>🔐 Requires Auth</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="api-info">
          <h3>🔧 API Endpoints</h3>
          <div className="endpoint">
            <strong>Backend:</strong> <code>http://localhost:5000</code>
          </div>
          <div className="endpoint">
            <strong>Create Payment:</strong> <code>POST /api/payments/create-checkout</code>
          </div>
          <div className="endpoint">
            <strong>Check Status:</strong> <code>GET /api/payments/status/:payment_id</code>
          </div>
        </div>
      </div>
    </div>
  );
}
