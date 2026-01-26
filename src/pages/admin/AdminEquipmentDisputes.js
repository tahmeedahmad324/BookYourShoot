"use client"

import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import api from "../../api/api"

const AdminEquipmentDisputes = () => {
  const [disputes, setDisputes] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("all")
  const [selectedDispute, setSelectedDispute] = useState(null)
  const [showResolveModal, setShowResolveModal] = useState(false)
  const [resolving, setResolving] = useState(false)
  
  const [resolveForm, setResolveForm] = useState({
    resolution: "",
    deposit_action: "full_refund",
    refund_amount: "",
    notes: ""
  })

  useEffect(() => {
    fetchDisputes()
  }, [])

  const fetchDisputes = async () => {
    setLoading(true)
    try {
      const response = await api.get("/equipment/admin/disputes")
      if (response.data.success) {
        setDisputes(response.data.data || [])
      }
    } catch (error) {
      console.error("Error fetching disputes:", error)
      // Mock data for development
      setDisputes([
        {
          id: "1",
          subject: "Equipment Rental Dispute: Canon 5D Mark IV",
          description: "Rental ID: rental-123\nReason: Equipment Damage\n\nThe camera was returned with scratches on the body and a broken lens cap.",
          status: "open",
          priority: "high",
          category: "equipment_rental",
          created_at: "2024-11-20T10:30:00",
          users: { full_name: "Ali Hassan", email: "ali@example.com" },
          photographer_profile: { business_name: "Pro Shots Studio" }
        },
        {
          id: "2",
          subject: "Equipment Rental Dispute: Sony A7III",
          description: "Rental ID: rental-456\nReason: Late Return\n\nRenter returned the equipment 3 days late without prior notice.",
          status: "investigating",
          priority: "medium",
          category: "equipment_rental",
          created_at: "2024-11-18T14:15:00",
          users: { full_name: "Sara Khan", email: "sara@example.com" },
          photographer_profile: { business_name: "Creative Lens" }
        },
        {
          id: "3",
          subject: "Equipment Rental Dispute: DJI Ronin S",
          description: "Rental ID: rental-789\nReason: Wrong Equipment\n\nReceived a different model than what was advertised.",
          status: "resolved",
          priority: "low",
          category: "equipment_rental",
          created_at: "2024-11-15T09:00:00",
          resolution: "Full refund issued. Owner warned about listing accuracy.",
          users: { full_name: "Ahmed Raza", email: "ahmed@example.com" },
          photographer_profile: { business_name: "Mountain View Photography" }
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  const getFilteredDisputes = () => {
    if (filter === "all") return disputes
    return disputes.filter(d => d.status === filter)
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "urgent": return "danger"
      case "high": return "warning"
      case "medium": return "info"
      case "low": return "secondary"
      default: return "secondary"
    }
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case "open": return "bg-danger"
      case "investigating": return "bg-warning"
      case "resolved": return "bg-success"
      case "closed": return "bg-secondary"
      default: return "bg-secondary"
    }
  }

  const extractRentalId = (description) => {
    if (!description) return null
    const match = description.match(/Rental ID:\s*([^\n]+)/)
    return match ? match[1].trim() : null
  }

  const extractReason = (description) => {
    if (!description) return "Not specified"
    const match = description.match(/Reason:\s*([^\n]+)/)
    return match ? match[1].trim() : "Not specified"
  }

  const handleResolve = async () => {
    if (!selectedDispute || !resolveForm.resolution) return
    
    setResolving(true)
    try {
      const response = await api.put(`/equipment/admin/disputes/${selectedDispute.id}/resolve`, {
        resolution: resolveForm.resolution,
        deposit_action: resolveForm.deposit_action,
        refund_amount: resolveForm.refund_amount ? parseFloat(resolveForm.refund_amount) : null,
        notes: resolveForm.notes
      })
      
      if (response.data.success) {
        // Update local state
        setDisputes(prev => prev.map(d => 
          d.id === selectedDispute.id 
            ? { ...d, status: "resolved", resolution: resolveForm.resolution }
            : d
        ))
        setShowResolveModal(false)
        setSelectedDispute(null)
        setResolveForm({ resolution: "", deposit_action: "full_refund", refund_amount: "", notes: "" })
        alert("Dispute resolved successfully!")
      }
    } catch (error) {
      console.error("Error resolving dispute:", error)
      alert("Failed to resolve dispute. Please try again.")
    } finally {
      setResolving(false)
    }
  }

  const handleStatusChange = async (disputeId, newStatus) => {
    try {
      // For now, just update local state
      // In production, call API to update status
      setDisputes(prev => prev.map(d =>
        d.id === disputeId ? { ...d, status: newStatus } : d
      ))
    } catch (error) {
      console.error("Error updating status:", error)
    }
  }

  return (
    <div className="container py-4">
      {/* Header */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
            <div>
              <h2 className="fw-bold mb-1">Equipment Rental Disputes</h2>
              <p className="text-muted mb-0">Manage and resolve equipment rental conflicts</p>
            </div>
            <Link to="/admin/dashboard" className="btn btn-outline-primary">
              <i className="fas fa-arrow-left me-2"></i>Back to Dashboard
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="row mb-4">
        <div className="col-md-3 col-sm-6 mb-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body text-center">
              <h3 className="mb-1 text-danger">{disputes.filter(d => d.status === 'open').length}</h3>
              <small className="text-muted">Open Disputes</small>
            </div>
          </div>
        </div>
        <div className="col-md-3 col-sm-6 mb-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body text-center">
              <h3 className="mb-1 text-warning">{disputes.filter(d => d.status === 'investigating').length}</h3>
              <small className="text-muted">Investigating</small>
            </div>
          </div>
        </div>
        <div className="col-md-3 col-sm-6 mb-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body text-center">
              <h3 className="mb-1 text-success">{disputes.filter(d => d.status === 'resolved').length}</h3>
              <small className="text-muted">Resolved</small>
            </div>
          </div>
        </div>
        <div className="col-md-3 col-sm-6 mb-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body text-center">
              <h3 className="mb-1 text-primary">{disputes.length}</h3>
              <small className="text-muted">Total Disputes</small>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="btn-group flex-wrap" role="group">
            <button
              type="button"
              className={`btn ${filter === "all" ? "btn-primary" : "btn-outline-primary"}`}
              onClick={() => setFilter("all")}
            >
              All ({disputes.length})
            </button>
            <button
              type="button"
              className={`btn ${filter === "open" ? "btn-primary" : "btn-outline-primary"}`}
              onClick={() => setFilter("open")}
            >
              Open ({disputes.filter(d => d.status === 'open').length})
            </button>
            <button
              type="button"
              className={`btn ${filter === "investigating" ? "btn-primary" : "btn-outline-primary"}`}
              onClick={() => setFilter("investigating")}
            >
              Investigating ({disputes.filter(d => d.status === 'investigating').length})
            </button>
            <button
              type="button"
              className={`btn ${filter === "resolved" ? "btn-primary" : "btn-outline-primary"}`}
              onClick={() => setFilter("resolved")}
            >
              Resolved ({disputes.filter(d => d.status === 'resolved').length})
            </button>
          </div>
        </div>
      </div>

      {/* Disputes List */}
      <div className="row">
        <div className="col-12">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : getFilteredDisputes().length === 0 ? (
            <div className="card border-0 shadow-sm">
              <div className="card-body text-center py-5">
                <i className="fas fa-check-circle text-success fa-3x mb-3"></i>
                <h5>No disputes found</h5>
                <p className="text-muted">All equipment rental disputes have been resolved.</p>
              </div>
            </div>
          ) : (
            <div className="card border-0 shadow-sm">
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-hover mb-0">
                    <thead className="bg-light">
                      <tr>
                        <th>Subject</th>
                        <th>Filed By</th>
                        <th>Equipment Owner</th>
                        <th>Reason</th>
                        <th>Priority</th>
                        <th>Status</th>
                        <th>Date</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getFilteredDisputes().map((dispute) => (
                        <tr key={dispute.id}>
                          <td>
                            <strong>{dispute.subject?.replace('Equipment Rental Dispute: ', '') || 'N/A'}</strong>
                            <br />
                            <small className="text-muted">ID: {extractRentalId(dispute.description) || 'N/A'}</small>
                          </td>
                          <td>
                            {dispute.users?.full_name || 'Unknown'}
                            <br />
                            <small className="text-muted">{dispute.users?.email}</small>
                          </td>
                          <td>{dispute.photographer_profile?.business_name || 'Unknown'}</td>
                          <td>
                            <span className="badge bg-light text-dark">
                              {extractReason(dispute.description)}
                            </span>
                          </td>
                          <td>
                            <span className={`badge bg-${getPriorityColor(dispute.priority)}`}>
                              {dispute.priority?.toUpperCase()}
                            </span>
                          </td>
                          <td>
                            <span className={`badge ${getStatusBadge(dispute.status)}`}>
                              {dispute.status?.replace('-', ' ').toUpperCase()}
                            </span>
                          </td>
                          <td>
                            {new Date(dispute.created_at).toLocaleDateString('en-PK', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </td>
                          <td>
                            <div className="btn-group btn-group-sm">
                              <button
                                className="btn btn-outline-primary"
                                onClick={() => setSelectedDispute(dispute)}
                                title="View Details"
                              >
                                <i className="fas fa-eye"></i>
                              </button>
                              {dispute.status !== 'resolved' && (
                                <>
                                  {dispute.status === 'open' && (
                                    <button
                                      className="btn btn-outline-warning"
                                      onClick={() => handleStatusChange(dispute.id, 'investigating')}
                                      title="Start Investigation"
                                    >
                                      <i className="fas fa-search"></i>
                                    </button>
                                  )}
                                  <button
                                    className="btn btn-outline-success"
                                    onClick={() => {
                                      setSelectedDispute(dispute)
                                      setShowResolveModal(true)
                                    }}
                                    title="Resolve"
                                  >
                                    <i className="fas fa-check"></i>
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Dispute Detail Modal */}
      {selectedDispute && !showResolveModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Dispute Details</h5>
                <button type="button" className="btn-close" onClick={() => setSelectedDispute(null)}></button>
              </div>
              <div className="modal-body">
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="text-muted small">Subject</label>
                    <p className="fw-bold mb-0">{selectedDispute.subject}</p>
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="text-muted small">Status</label>
                    <p className="mb-0">
                      <span className={`badge ${getStatusBadge(selectedDispute.status)}`}>
                        {selectedDispute.status?.toUpperCase()}
                      </span>
                    </p>
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="text-muted small">Filed By</label>
                    <p className="mb-0">
                      {selectedDispute.users?.full_name}<br />
                      <small className="text-muted">{selectedDispute.users?.email}</small>
                    </p>
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="text-muted small">Equipment Owner</label>
                    <p className="mb-0">{selectedDispute.photographer_profile?.business_name}</p>
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="text-muted small">Priority</label>
                    <p className="mb-0">
                      <span className={`badge bg-${getPriorityColor(selectedDispute.priority)}`}>
                        {selectedDispute.priority?.toUpperCase()}
                      </span>
                    </p>
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="text-muted small">Date Filed</label>
                    <p className="mb-0">
                      {new Date(selectedDispute.created_at).toLocaleString('en-PK')}
                    </p>
                  </div>
                  <div className="col-12 mb-3">
                    <label className="text-muted small">Description</label>
                    <div className="bg-light p-3 rounded">
                      <pre className="mb-0" style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
                        {selectedDispute.description}
                      </pre>
                    </div>
                  </div>
                  {selectedDispute.resolution && (
                    <div className="col-12">
                      <label className="text-muted small">Resolution</label>
                      <div className="bg-success bg-opacity-10 p-3 rounded border border-success">
                        <pre className="mb-0 text-success" style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
                          {selectedDispute.resolution}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                {selectedDispute.status !== 'resolved' && (
                  <button
                    className="btn btn-success"
                    onClick={() => setShowResolveModal(true)}
                  >
                    <i className="fas fa-check me-2"></i>Resolve Dispute
                  </button>
                )}
                <button className="btn btn-secondary" onClick={() => setSelectedDispute(null)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Resolve Modal */}
      {showResolveModal && selectedDispute && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Resolve Dispute</h5>
                <button type="button" className="btn-close" onClick={() => setShowResolveModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Deposit Action <span className="text-danger">*</span></label>
                  <select
                    className="form-select"
                    value={resolveForm.deposit_action}
                    onChange={(e) => setResolveForm({ ...resolveForm, deposit_action: e.target.value })}
                  >
                    <option value="full_refund">Full Deposit Refund to Renter</option>
                    <option value="partial_refund">Partial Deposit Refund</option>
                    <option value="forfeit">Forfeit Deposit to Owner</option>
                    <option value="split">Split Deposit 50/50</option>
                  </select>
                </div>
                
                {resolveForm.deposit_action === 'partial_refund' && (
                  <div className="mb-3">
                    <label className="form-label">Refund Amount (Rs.)</label>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="Enter refund amount"
                      value={resolveForm.refund_amount}
                      onChange={(e) => setResolveForm({ ...resolveForm, refund_amount: e.target.value })}
                    />
                  </div>
                )}
                
                <div className="mb-3">
                  <label className="form-label">Resolution Details <span className="text-danger">*</span></label>
                  <textarea
                    className="form-control"
                    rows={4}
                    placeholder="Describe the resolution and reasoning..."
                    value={resolveForm.resolution}
                    onChange={(e) => setResolveForm({ ...resolveForm, resolution: e.target.value })}
                  />
                </div>
                
                <div className="mb-3">
                  <label className="form-label">Admin Notes (Internal)</label>
                  <textarea
                    className="form-control"
                    rows={2}
                    placeholder="Internal notes for admin reference..."
                    value={resolveForm.notes}
                    onChange={(e) => setResolveForm({ ...resolveForm, notes: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowResolveModal(false)}
                  disabled={resolving}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-success"
                  onClick={handleResolve}
                  disabled={resolving || !resolveForm.resolution}
                >
                  {resolving ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Resolving...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-check me-2"></i>Resolve Dispute
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminEquipmentDisputes
