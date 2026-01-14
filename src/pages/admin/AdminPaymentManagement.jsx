import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const API_BASE = 'http://localhost:5000/api';

/**
 * Admin Payment Management Page
 * Manage disputes, view transactions, resolve issues
 */
const AdminPaymentManagement = () => {
  const [activeTab, setActiveTab] = useState('disputes');
  const [disputes, setDisputes] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [resolution, setResolution] = useState({
    type: 'partial_refund',
    clientRefundPercent: 50,
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'disputes') {
        const res = await fetch(`${API_BASE}/payments/disputes`);
        const data = await res.json();
        setDisputes(data.disputes || []);
      } else if (activeTab === 'notifications') {
        const res = await fetch(`${API_BASE}/payments/notifications/admin/all`);
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResolveDispute = async (disputeId) => {
    if (!window.confirm('Are you sure you want to resolve this dispute?')) return;
    
    try {
      const res = await fetch(`${API_BASE}/payments/disputes/${disputeId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resolution: resolution.type,
          client_refund_percent: resolution.clientRefundPercent,
          notes: resolution.notes
        })
      });
      
      const data = await res.json();
      if (data.status === 'success') {
        alert('✅ Dispute resolved successfully!');
        setSelectedDispute(null);
        loadData();
      } else {
        alert('❌ Failed: ' + (data.detail || 'Unknown error'));
      }
    } catch (err) {
      alert('❌ Error: ' + err.message);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      open: 'bg-warning text-dark',
      resolved: 'bg-success',
      held: 'bg-info',
      released: 'bg-success',
      refunded: 'bg-secondary'
    };
    return badges[status] || 'bg-secondary';
  };

  const formatDate = (isoString) => {
    return new Date(isoString).toLocaleString('en-PK', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  };

  return (
    <div className="admin-payment-management py-4" style={{ background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)', minHeight: '100vh' }}>
      <div className="container">
        {/* Header */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h2 className="fw-bold mb-1">💳 Payment Management</h2>
            <p className="text-muted mb-0">Manage disputes, transactions, and notifications</p>
          </div>
          <Link to="/admin/dashboard" className="btn btn-outline-primary">
            ← Back to Dashboard
          </Link>
        </div>

        {/* Tabs */}
        <ul className="nav nav-tabs mb-4">
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === 'disputes' ? 'active' : ''}`}
              onClick={() => setActiveTab('disputes')}
            >
              ⚠️ Disputes
              {disputes.filter(d => d.status === 'open').length > 0 && (
                <span className="badge bg-danger ms-2">
                  {disputes.filter(d => d.status === 'open').length}
                </span>
              )}
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === 'notifications' ? 'active' : ''}`}
              onClick={() => setActiveTab('notifications')}
            >
              🔔 Notifications
            </button>
          </li>
        </ul>

        {loading && (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status"></div>
            <p className="mt-2">Loading...</p>
          </div>
        )}

        {/* Disputes Tab */}
        {!loading && activeTab === 'disputes' && (
          <div className="row">
            <div className={selectedDispute ? 'col-lg-6' : 'col-12'}>
              <div className="card border-0 shadow-sm">
                <div className="card-header bg-white py-3">
                  <h5 className="mb-0">Open Disputes</h5>
                </div>
                <div className="card-body p-0">
                  {disputes.length === 0 ? (
                    <div className="text-center py-5">
                      <div style={{ fontSize: '3rem' }}>✅</div>
                      <h5 className="mt-3">No Disputes</h5>
                      <p className="text-muted">All payments are running smoothly</p>
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-hover mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>ID</th>
                            <th>Booking</th>
                            <th>Reason</th>
                            <th>Status</th>
                            <th>Date</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {disputes.map(dispute => (
                            <tr key={dispute.id} className={selectedDispute?.id === dispute.id ? 'table-active' : ''}>
                              <td><code>{dispute.id}</code></td>
                              <td>{dispute.booking_id}</td>
                              <td>{dispute.reason}</td>
                              <td>
                                <span className={`badge ${getStatusBadge(dispute.status)}`}>
                                  {dispute.status}
                                </span>
                              </td>
                              <td className="small">{formatDate(dispute.created_at)}</td>
                              <td>
                                {dispute.status === 'open' ? (
                                  <button
                                    className="btn btn-sm btn-primary"
                                    onClick={() => setSelectedDispute(dispute)}
                                  >
                                    Resolve
                                  </button>
                                ) : (
                                  <button
                                    className="btn btn-sm btn-outline-secondary"
                                    onClick={() => setSelectedDispute(dispute)}
                                  >
                                    View
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Dispute Resolution Panel */}
            {selectedDispute && (
              <div className="col-lg-6">
                <div className="card border-0 shadow-sm">
                  <div className="card-header bg-warning text-dark py-3">
                    <h5 className="mb-0">⚖️ Resolve Dispute</h5>
                  </div>
                  <div className="card-body">
                    <div className="mb-4">
                      <h6 className="text-muted">Dispute Details</h6>
                      <div className="bg-light p-3 rounded">
                        <div className="row">
                          <div className="col-6">
                            <strong>ID:</strong> {selectedDispute.id}
                          </div>
                          <div className="col-6">
                            <strong>Booking:</strong> {selectedDispute.booking_id}
                          </div>
                          <div className="col-12 mt-2">
                            <strong>Reason:</strong> {selectedDispute.reason}
                          </div>
                          <div className="col-12 mt-2">
                            <strong>Description:</strong> {selectedDispute.description}
                          </div>
                        </div>
                      </div>
                    </div>

                    {selectedDispute.status === 'open' ? (
                      <>
                        <div className="mb-3">
                          <label className="form-label fw-bold">Resolution Type</label>
                          <select
                            className="form-select"
                            value={resolution.type}
                            onChange={(e) => setResolution({...resolution, type: e.target.value})}
                          >
                            <option value="full_refund">Full Refund to Client</option>
                            <option value="partial_refund">Partial Refund</option>
                            <option value="no_refund">No Refund (Photographer Keeps All)</option>
                            <option value="split">Split 50/50</option>
                          </select>
                        </div>

                        {resolution.type === 'partial_refund' && (
                          <div className="mb-3">
                            <label className="form-label fw-bold">
                              Client Refund: {resolution.clientRefundPercent}%
                            </label>
                            <input
                              type="range"
                              className="form-range"
                              min="0"
                              max="100"
                              value={resolution.clientRefundPercent}
                              onChange={(e) => setResolution({...resolution, clientRefundPercent: parseInt(e.target.value)})}
                            />
                            <div className="d-flex justify-content-between small text-muted">
                              <span>Client: {resolution.clientRefundPercent}%</span>
                              <span>Photographer: {100 - resolution.clientRefundPercent}%</span>
                            </div>
                          </div>
                        )}

                        <div className="mb-3">
                          <label className="form-label fw-bold">Resolution Notes</label>
                          <textarea
                            className="form-control"
                            rows="3"
                            placeholder="Add notes about the resolution..."
                            value={resolution.notes}
                            onChange={(e) => setResolution({...resolution, notes: e.target.value})}
                          ></textarea>
                        </div>

                        <div className="d-flex gap-2">
                          <button
                            className="btn btn-success flex-grow-1"
                            onClick={() => handleResolveDispute(selectedDispute.id)}
                          >
                            ✓ Resolve Dispute
                          </button>
                          <button
                            className="btn btn-outline-secondary"
                            onClick={() => setSelectedDispute(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="alert alert-success">
                        <h6 className="fw-bold mb-2">✅ Resolved</h6>
                        <p className="mb-1"><strong>Resolution:</strong> {selectedDispute.resolution?.type}</p>
                        <p className="mb-1"><strong>Client Refund:</strong> Rs. {selectedDispute.resolution?.client_refund?.toLocaleString()}</p>
                        <p className="mb-1"><strong>Photographer Amount:</strong> Rs. {selectedDispute.resolution?.photographer_amount?.toLocaleString()}</p>
                        {selectedDispute.resolution?.notes && (
                          <p className="mb-0"><strong>Notes:</strong> {selectedDispute.resolution.notes}</p>
                        )}
                        <hr />
                        <small className="text-muted">Resolved on {formatDate(selectedDispute.resolved_at)}</small>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Notifications Tab */}
        {!loading && activeTab === 'notifications' && (
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
              <h5 className="mb-0">All System Notifications</h5>
              <span className="badge bg-primary">{notifications.length} total</span>
            </div>
            <div className="card-body p-0">
              {notifications.length === 0 ? (
                <div className="text-center py-5">
                  <div style={{ fontSize: '3rem' }}>🔔</div>
                  <h5 className="mt-3">No Notifications</h5>
                  <p className="text-muted">System notifications will appear here</p>
                </div>
              ) : (
                <div className="list-group list-group-flush">
                  {notifications.map(notif => (
                    <div key={notif.id} className={`list-group-item ${!notif.read ? 'bg-light' : ''}`}>
                      <div className="d-flex justify-content-between align-items-start">
                        <div>
                          <div className="d-flex align-items-center gap-2 mb-1">
                            <span className={`badge ${
                              notif.type.includes('refund') ? 'bg-warning text-dark' :
                              notif.type.includes('release') ? 'bg-success' :
                              notif.type.includes('dispute') ? 'bg-danger' : 'bg-info'
                            }`}>
                              {notif.type.replace(/_/g, ' ')}
                            </span>
                            <span className="badge bg-secondary">{notif.recipient_role}</span>
                          </div>
                          <h6 className="mb-1">{notif.title}</h6>
                          <p className="mb-1 text-muted small">{notif.message}</p>
                          {notif.amount && (
                            <strong className="text-primary">Rs. {notif.amount.toLocaleString()}</strong>
                          )}
                        </div>
                        <small className="text-muted">{formatDate(notif.created_at)}</small>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Quick Stats */}
        <div className="row mt-4">
          <div className="col-md-4">
            <div className="card border-0 shadow-sm text-center py-4">
              <div style={{ fontSize: '2rem' }}>⚠️</div>
              <h3 className="fw-bold mb-0">{disputes.filter(d => d.status === 'open').length}</h3>
              <p className="text-muted mb-0">Open Disputes</p>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card border-0 shadow-sm text-center py-4">
              <div style={{ fontSize: '2rem' }}>✅</div>
              <h3 className="fw-bold mb-0">{disputes.filter(d => d.status === 'resolved').length}</h3>
              <p className="text-muted mb-0">Resolved</p>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card border-0 shadow-sm text-center py-4">
              <div style={{ fontSize: '2rem' }}>🔔</div>
              <h3 className="fw-bold mb-0">{notifications.length}</h3>
              <p className="text-muted mb-0">Total Notifications</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPaymentManagement;
