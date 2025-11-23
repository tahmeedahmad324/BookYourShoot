"use client"

import { useState, useEffect } from "react"
import { Link } from "react-router-dom"

const AdminVerifications = () => {
  const [pendingPhotographers, setPendingPhotographers] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Fetch pending photographer verifications
    const mockData = [
      {
        id: 7,
        name: "Creative Lens",
        email: "creative@example.com",
        cnic: "12345-1234567-1",
        dateApplied: "2024-11-18",
        cnicStatus: "pending",
      },
      {
        id: 8,
        name: "New Vision Studio",
        email: "vision@example.com",
        cnic: "12346-1234568-2",
        dateApplied: "2024-11-19",
        cnicStatus: "pending",
      },
    ]
    setPendingPhotographers(mockData)
  }, [])

  const handleApprove = async (id) => {
    setLoading(true)
    try {
      // Call approve verification API
      setPendingPhotographers((pending) => pending.filter((p) => p.id !== id))
    } finally {
      setLoading(false)
    }
  }

  const handleReject = async (id) => {
    setLoading(true)
    try {
      // Call reject verification API
      setPendingPhotographers((pending) => pending.filter((p) => p.id !== id))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container py-4">
      <div className="row mb-4">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center">
            <h2 className="fw-bold">Photographer Verifications</h2>
            <Link to="/admin/dashboard" className="btn btn-outline-primary">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white border-0 pt-4 pb-3">
          <h5 className="fw-bold mb-0">Pending Verifications ({pendingPhotographers.length})</h5>
        </div>
        <div className="card-body">
          {pendingPhotographers.length > 0 ? (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>Photographer</th>
                    <th>Email</th>
                    <th>CNIC</th>
                    <th>Applied On</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingPhotographers.map((photographer) => (
                    <tr key={photographer.id}>
                      <td>
                        <div className="fw-semibold">{photographer.name}</div>
                      </td>
                      <td>{photographer.email}</td>
                      <td>
                        <code>{photographer.cnic}</code>
                      </td>
                      <td>{photographer.dateApplied}</td>
                      <td>
                        <div className="btn-group btn-group-sm">
                          <button
                            className="btn btn-outline-success"
                            onClick={() => handleApprove(photographer.id)}
                            disabled={loading}
                          >
                            Approve
                          </button>
                          <button
                            className="btn btn-outline-danger"
                            onClick={() => handleReject(photographer.id)}
                            disabled={loading}
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-5">
              <div style={{ fontSize: "2rem" }}>✅</div>
              <p className="text-muted">No pending verifications</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AdminVerifications
