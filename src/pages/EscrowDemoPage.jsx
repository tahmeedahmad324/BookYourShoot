import React, { useState } from 'react';
import EscrowStatus from '../components/EscrowStatus';
import '../styles/escrow.css';

/**
 * Escrow Demo Page - For testing and demonstrating the escrow system
 * This page shows different escrow states and allows you to interact with the system
 */
const EscrowDemoPage = () => {
  const [activeDemo, setActiveDemo] = useState('held');
  const [refreshKey, setRefreshKey] = useState(0);
  const [simulateAutoRelease, setSimulateAutoRelease] = useState(false);

  // Mock booking data for different scenarios
  const demoBookings = {
    held: {
      id: 'BOOK-12345',
      photographerName: 'Ahmed Photography',
      serviceType: 'Wedding Photography',
      date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 10 days from now
      totalAmount: 20000,
      paidAmount: 10000,
      remainingAmount: 10000,
      status: 'confirmed',
      escrowStatus: 'held',
      transactionId: 'cs_test_held123',
      paymentDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    },
    completed: {
      id: 'BOOK-67890',
      photographerName: 'Sara Visuals',
      serviceType: 'Portrait Session',
      date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Yesterday
      totalAmount: 8000,
      paidAmount: 8000,
      remainingAmount: 0,
      status: 'completed',
      escrowStatus: 'held',
      transactionId: 'cs_test_completed456',
      paymentDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
    },
    released: {
      id: 'BOOK-11111',
      photographerName: 'Maverick Lens',
      serviceType: 'Event Coverage',
      date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 10 days ago
      totalAmount: 25000,
      paidAmount: 25000,
      remainingAmount: 0,
      status: 'completed',
      escrowStatus: 'released',
      transactionId: 'cs_test_released789',
      paymentDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(), // 15 days ago
      createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
    },
    cancellable: {
      id: 'BOOK-22222',
      photographerName: 'Pixel Perfect',
      serviceType: 'Product Photography',
      date: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 20 days from now
      totalAmount: 15000,
      paidAmount: 7500,
      remainingAmount: 7500,
      status: 'confirmed',
      escrowStatus: 'held',
      transactionId: 'cs_test_cancel111',
      paymentDate: new Date().toISOString(),
      createdAt: new Date().toISOString()
    },
    lateCancellation: {
      id: 'BOOK-33333',
      photographerName: 'Studio Elite',
      serviceType: 'Fashion Shoot',
      date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 2 days from now
      totalAmount: 30000,
      paidAmount: 15000,
      remainingAmount: 15000,
      status: 'confirmed',
      escrowStatus: 'held',
      transactionId: 'cs_test_late222',
      paymentDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(), // 20 days ago
      createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString()
    }
  };

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    setSimulateAutoRelease(false);
  };

  const handleSimulateAutoRelease = () => {
    if (activeDemo === 'held' || activeDemo === 'completed') {
      setSimulateAutoRelease(true);
      alert('⏰ Simulating 7 days passed...\n\n✅ Payment automatically released to photographer!\n\nPhotographer receives: Rs. ' + Math.floor(currentBooking.paidAmount * 0.9).toLocaleString() + '\nPlatform fee: Rs. ' + Math.floor(currentBooking.paidAmount * 0.1).toLocaleString() + '\n\nThis happens automatically if client doesn\'t confirm completion within 7 days.');
      setTimeout(() => {
        setActiveDemo('released');
        setSimulateAutoRelease(false);
      }, 1000);
    }
  };

  const getDemoDescription = (type) => {
    const descriptions = {
      held: {
        title: '🔒 Payment Held in Escrow',
        description: 'Client has paid, but work is ongoing. Payment is secured by the platform.',
        actions: 'Wait for photographer to complete work. As client, you can cancel with refund based on notice period.'
      },
      completed: {
        title: '✅ Work Completed - Awaiting Release',
        description: 'Photographer has delivered work. Client can now confirm and release payment.',
        actions: 'Client should review deliverables and click "Confirm Work Completed" to release payment to photographer.'
      },
      released: {
        title: '💰 Payment Released',
        description: 'Client confirmed completion. Payment has been released to photographer (minus 10% platform fee).',
        actions: 'Transaction complete. Photographer received their earnings.'
      },
      cancellable: {
        title: '🔄 Early Cancellation (Full Refund)',
        description: 'Booking is 20 days away. Cancelling now results in 100% refund to client.',
        actions: 'Click "Cancel Booking" to see full refund (Rs. 7,500). Photographer gets nothing since ample notice given.'
      },
      lateCancellation: {
        title: '⚠️ Late Cancellation (No Refund)',
        description: 'Booking is only 2 days away. Cancelling now means no refund - photographer keeps payment.',
        actions: 'Click "Cancel Booking" to see Rs. 0 refund. Photographer gets Rs. 15,000 since they blocked their calendar.'
      }
    };
    return descriptions[type];
  };

  const currentBooking = demoBookings[activeDemo];
  const demoInfo = getDemoDescription(activeDemo);

  return (
    <div className="escrow-demo-page py-5">
      <div className="container">
        {/* Header */}
        <div className="text-center mb-5">
          <h1 className="fw-bold mb-3">🔒 Escrow Payment System Demo</h1>
          <p className="text-muted">
            Explore how our escrow system protects both clients and photographers
          </p>
        </div>

        {/* Demo Selector */}
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body">
            <h5 className="fw-bold mb-3">Select Demo Scenario:</h5>
            <div className="row g-3">
              <div className="col-md-4">
                <button
                  className={`btn w-100 ${activeDemo === 'held' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setActiveDemo('held')}
                >
                  🔒 Payment Held
                </button>
              </div>
              <div className="col-md-4">
                <button
                  className={`btn w-100 ${activeDemo === 'completed' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setActiveDemo('completed')}
                >
                  ✅ Ready to Release
                </button>
              </div>
              <div className="col-md-4">
                <button
                  className={`btn w-100 ${activeDemo === 'released' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setActiveDemo('released')}
                >
                  💰 Released
                </button>
              </div>
              <div className="col-md-6">
                <button
                  className={`btn w-100 ${activeDemo === 'cancellable' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setActiveDemo('cancellable')}
                >
                  🔄 Early Cancel (Full Refund)
                </button>
              </div>
              <div className="col-md-6">
                <button
                  className={`btn w-100 ${activeDemo === 'lateCancellation' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setActiveDemo('lateCancellation')}
                >
                  ⚠️ Late Cancel (No Refund)
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Scenario Info */}
        <div className="row mb-4">
          <div className="col-lg-8">
            <div className="alert alert-info">
              <h5 className="fw-bold mb-2">{demoInfo.title}</h5>
              <p className="mb-2">{demoInfo.description}</p>
              <p className="mb-0"><strong>What you can do:</strong> {demoInfo.actions}</p>
            </div>
          </div>
          <div className="col-lg-4">
            <div className="card border-0 bg-light">
              <div className="card-body">
                <h6 className="fw-bold mb-3">Booking Details</h6>
                <div className="small">
                  <div className="mb-2">
                    <strong>ID:</strong> {currentBooking.id}
                  </div>
                  <div className="mb-2">
                    <strong>Service:</strong> {currentBooking.serviceType}
                  </div>
                  <div className="mb-2">
                    <strong>Date:</strong> {new Date(currentBooking.date).toLocaleDateString()}
                  </div>
                  <div className="mb-2">
                    <strong>Amount:</strong> Rs. {currentBooking.paidAmount.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Escrow Component Demo */}
        <div className="row">
          <div className="col-lg-8">
            <div className="card border-0 shadow">
              <div className="card-body">
                <h5 className="fw-bold mb-4">Interactive Escrow Widget</h5>
                <EscrowStatus
                  key={refreshKey}
                  booking={currentBooking}
                  userRole="client"
                  onRelease={(bookingId) => {
                    alert(`✅ Success! Payment released to ${currentBooking.photographerName}\n\nPhotographer receives: Rs. ${Math.floor(currentBooking.paidAmount * 0.9).toLocaleString()}\nPlatform fee: Rs. ${Math.floor(currentBooking.paidAmount * 0.1).toLocaleString()}`);
                    handleRefresh();
                  }}
                  onRefund={(bookingId, result) => {
                    console.log('Refund result:', result);
                  }}
                />

                <div className="mt-4 pt-4 border-top">
                  <div className="d-flex gap-2 flex-wrap">
                    <button className="btn btn-outline-secondary btn-sm" onClick={handleRefresh}>
                      🔄 Reset Demo
                    </button>
                    {(activeDemo === 'held' || activeDemo === 'completed') && (
                      <button 
                        className="btn btn-warning btn-sm" 
                        onClick={handleSimulateAutoRelease}
                        disabled={simulateAutoRelease}
                      >
                        ⏰ Simulate 7 Days Passed (Auto-Release)
                      </button>
                    )}
                  </div>
                  <div className="mt-3 small text-muted">
                    <strong>Demo Mode:</strong> In production, auto-release happens after 7 days. Use the button above to simulate this instantly.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Info Panel */}
          <div className="col-lg-4">
            <div className="card border-0 bg-dark text-white mb-3">
              <div className="card-body">
                <h6 className="fw-bold mb-3">💡 How It Works</h6>
                <div className="small">
                  <div className="mb-3">
                    <strong>1. Payment Made</strong>
                    <div className="opacity-75">Client pays → Platform holds money</div>
                  </div>
                  <div className="mb-3">
                    <strong>2. Work Completed</strong>
                    <div className="opacity-75">Photographer delivers photos/videos</div>
                  </div>
                  <div className="mb-3">
                    <strong>3. Client Confirms</strong>
                    <div className="opacity-75">Client reviews & releases payment</div>
                  </div>
                  <div>
                    <strong>4. Money Transferred</strong>
                    <div className="opacity-75">90% to photographer, 10% platform fee</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="card border-0 bg-warning text-dark mb-3">
              <div className="card-body">
                <h6 className="fw-bold mb-2">⚡ Auto-Release</h6>
                <div className="small">
                  If client doesn't confirm within 7 days, payment is automatically released to photographer.
                </div>
              </div>
            </div>

            <div className="card border-0 bg-success text-white">
              <div className="card-body">
                <h6 className="fw-bold mb-2">🛡️ Protection</h6>
                <div className="small">
                  <strong>Clients:</strong> Money held until satisfied<br/>
                  <strong>Photographers:</strong> Guaranteed payment after delivery
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Cancellation Policy Table */}
        <div className="row mt-4">
          <div className="col-12">
            <div className="card border-0 shadow-sm">
              <div className="card-body">
                <h5 className="fw-bold mb-3">📋 Cancellation Policy Reference</h5>
                <div className="table-responsive">
                  <table className="table table-bordered">
                    <thead className="table-light">
                      <tr>
                        <th>Notice Period</th>
                        <th>Client Refund</th>
                        <th>Photographer Payment</th>
                        <th>Example (Rs. 10,000)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="table-success">
                        <td><strong>14+ days before</strong></td>
                        <td className="text-success"><strong>100%</strong></td>
                        <td>0%</td>
                        <td>Client: Rs. 10,000 | Photographer: Rs. 0</td>
                      </tr>
                      <tr className="table-warning">
                        <td><strong>7-13 days before</strong></td>
                        <td className="text-warning"><strong>50%</strong></td>
                        <td>50%</td>
                        <td>Client: Rs. 5,000 | Photographer: Rs. 5,000</td>
                      </tr>
                      <tr className="table-warning">
                        <td><strong>3-6 days before</strong></td>
                        <td className="text-warning"><strong>25%</strong></td>
                        <td>75%</td>
                        <td>Client: Rs. 2,500 | Photographer: Rs. 7,500</td>
                      </tr>
                      <tr className="table-danger">
                        <td><strong>Less than 3 days</strong></td>
                        <td className="text-danger"><strong>0%</strong></td>
                        <td>100%</td>
                        <td>Client: Rs. 0 | Photographer: Rs. 10,000</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Documentation Link */}
        <div className="text-center mt-5">
          <div className="alert alert-info d-inline-block">
            📚 <strong>Full Documentation:</strong> See <code>ESCROW_SYSTEM.md</code> for complete technical details
          </div>
        </div>
      </div>
    </div>
  );
};

export default EscrowDemoPage;
