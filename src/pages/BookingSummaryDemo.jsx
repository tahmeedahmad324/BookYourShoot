import React, { useState } from 'react';
import BookingSummary from '../components/BookingSummary';

/**
 * Booking Summary Demo Page
 * Demonstrates the booking summary component with different scenarios
 */
const BookingSummaryDemo = () => {
  const [scenario, setScenario] = useState('standard');

  const scenarios = {
    standard: {
      photographerName: 'Ahmed Photography',
      serviceType: 'Wedding Photography',
      date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      duration: 8,
      hourlyRate: 5000,
      advancePercent: 50,
      deposit: 0,
      showPlatformFee: false
    },
    withEquipment: {
      photographerName: 'Elite Photography',
      serviceType: 'Event + Equipment Rental',
      date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
      duration: 4,
      hourlyRate: 6000,
      advancePercent: 50,
      deposit: 5000,
      showPlatformFee: false
    },
    photographerView: {
      photographerName: 'Sarah Studios',
      serviceType: 'Portrait Session',
      date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      duration: 2,
      hourlyRate: 4000,
      advancePercent: 50,
      deposit: 0,
      showPlatformFee: true
    },
    longSession: {
      photographerName: 'Mountain View Photography',
      serviceType: 'Full Day Commercial Shoot',
      date: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
      duration: 10,
      hourlyRate: 7000,
      advancePercent: 50,
      deposit: 0,
      showPlatformFee: false
    }
  };

  const currentScenario = scenarios[scenario];

  const handleConfirm = () => {
    alert('✅ In a real booking, this would redirect to Stripe payment!\n\nAmount: Rs. ' + 
      (Math.floor(currentScenario.hourlyRate * currentScenario.duration * (currentScenario.advancePercent / 100)) + currentScenario.deposit).toLocaleString());
  };

  return (
    <div className="booking-summary-demo py-5" style={{ background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)', minHeight: '100vh' }}>
      <div className="container">
        {/* Header */}
        <div className="text-center mb-5">
          <h1 className="fw-bold mb-3">📋 Booking Summary Demo</h1>
          <p className="text-muted">
            Preview the booking summary that clients see before payment
          </p>
        </div>

        {/* Scenario Selector */}
        <div className="row justify-content-center mb-4">
          <div className="col-lg-8">
            <div className="card border-0 shadow-sm">
              <div className="card-body">
                <h5 className="fw-bold mb-3">Select Scenario:</h5>
                <div className="row g-2">
                  <div className="col-md-3 col-sm-6">
                    <button
                      className={`btn w-100 ${scenario === 'standard' ? 'btn-primary' : 'btn-outline-primary'}`}
                      onClick={() => setScenario('standard')}
                    >
                      💒 Wedding
                    </button>
                  </div>
                  <div className="col-md-3 col-sm-6">
                    <button
                      className={`btn w-100 ${scenario === 'withEquipment' ? 'btn-primary' : 'btn-outline-primary'}`}
                      onClick={() => setScenario('withEquipment')}
                    >
                      📹 With Equipment
                    </button>
                  </div>
                  <div className="col-md-3 col-sm-6">
                    <button
                      className={`btn w-100 ${scenario === 'photographerView' ? 'btn-primary' : 'btn-outline-primary'}`}
                      onClick={() => setScenario('photographerView')}
                    >
                      👤 Photographer View
                    </button>
                  </div>
                  <div className="col-md-3 col-sm-6">
                    <button
                      className={`btn w-100 ${scenario === 'longSession' ? 'btn-primary' : 'btn-outline-primary'}`}
                      onClick={() => setScenario('longSession')}
                    >
                      🏢 Commercial
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Booking Summary */}
        <div className="row justify-content-center">
          <div className="col-lg-6">
            <BookingSummary
              {...currentScenario}
              onConfirm={handleConfirm}
              onCancel={() => alert('❌ Booking cancelled')}
            />
          </div>

          {/* Info Panel */}
          <div className="col-lg-3">
            <div className="card border-0 shadow-sm mb-3">
              <div className="card-body">
                <h6 className="fw-bold mb-3">💡 Features</h6>
                <ul className="small mb-0">
                  <li className="mb-2">Clear cost breakdown</li>
                  <li className="mb-2">50% advance payment</li>
                  <li className="mb-2">Remaining due on completion</li>
                  <li className="mb-2">Equipment deposit shown separately</li>
                  <li className="mb-2">Platform fee visible to photographers</li>
                  <li className="mb-2">Payment security notice</li>
                </ul>
              </div>
            </div>

            <div className="card border-0 bg-success text-white">
              <div className="card-body">
                <h6 className="fw-bold mb-2">✅ Benefits</h6>
                <div className="small">
                  <strong>Transparency:</strong> Clients see exactly what they pay for<br/><br/>
                  <strong>Trust:</strong> Security badge builds confidence<br/><br/>
                  <strong>Clear Terms:</strong> Payment schedule prevents confusion
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Implementation Note */}
        <div className="row justify-content-center mt-4">
          <div className="col-lg-9">
            <div className="alert alert-info border-0">
              <strong>📝 Usage:</strong> Import this component in your booking request page:
              <pre className="bg-white p-2 rounded mt-2 mb-0">
                {`<BookingSummary
  photographerName="Ahmed Photography"
  serviceType="Wedding Photography"
  date="2026-02-14"
  duration={8}
  hourlyRate={5000}
  advancePercent={50}
  onConfirm={handlePayment}
  onCancel={handleCancel}
/>`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingSummaryDemo;
