"use client"

import { useState, useEffect } from "react"
import { Link } from "react-router-dom"

const AdminComplaints = () => {
  const [complaints, setComplaints] = useState([])
  const [filter, setFilter] = useState("all")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const mockComplaints = [
      {
        id: 1,
        clientName: "Ayesha Khan",
        photographerName: "Creative Lens",
        subject: "Poor Communication",
        description: "Photographer was not responding to messages",
        status: "open",
        date: "2024-11-18",
        severity: "medium",
      },
      {
        id: 2,
        clientName: "Bilal Ahmed",
        photographerName: "Mountain View Photography",
        subject: "Quality Issues",
        description: "Photos were not as expected, poor quality",
        status: "resolved",
        date: "2024-11-15",
        severity: "high",
      },
      {
        id: 3,
        clientName: "Fatima Raza",
        photographerName: "Sarah Studios",
        subject: "Late Delivery",
        description: "Photos delivered 2 weeks after promised date",
        status: "in-progress",
        date: "2024-11-20",
        severity: "low",
      },
    ]
    setComplaints(mockComplaints)
  }, [])

  const getFilteredComplaints = () => {
    if (filter === "all") return complaints
    return complaints.filter((c) => c.status === filter)
  }

  const handleStatusChange = async (id, newStatus) => {
    setLoading(true)
    try {
      // Call update complaint API
      setComplaints((prev) => prev.map((c) => (c.id === id ? { ...c, status: newStatus } : c)))
    } finally {
      setLoading(false)
    }
  }

  const getSeverityColor = (severity) => {
    switch (severity) {
      case "high":
        return "danger"
      case "medium":
        return "warning"
      case "low":
        return "info"
      default:
        return "secondary"
    }
  }

  return (
    <div className="container py-4">
      <div className="row mb-4">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center">
            <h2 className="fw-bold">Complaints Management</h2>
            <Link to="/admin/dashboard" className="btn btn-outline-primary">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>

      <div className="row mb-4">
        <div className="col-12">
          <div className="btn-group" role="group">
            <button
              type="button"
              className={`btn ${filter === "all" ? "btn-primary" : "btn-outline-primary"}`}
              onClick={() => setFilter("all")}
            >
              All ({complaints.length})
            </button>
            <button
              type="button"
              className={`btn ${filter === "open" ? "btn-primary" : "btn-outline-primary"}`}
              onClick={() => setFilter("open")}
            >
              Open ({complaints.filter((c) => c.status === "open").length})
            </button>
            <button
              type="button"
              className={`btn ${filter === "in-progress" ? "btn-primary" : "btn-outline-primary"}`}
              onClick={() => setFilter("in-progress")}
            >
              In Progress ({complaints.filter((c) => c.status === "in-progress").length})
            </button>
            <button
              type="button"
              className={`btn ${filter === "resolved" ? "btn-primary" : "btn-outline-primary"}`}
              onClick={() => setFilter("resolved")}
            >
              Resolved ({complaints.filter((c) => c.status === "resolved").length})
            </button>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body">
          {getFilteredComplaints().length > 0 ? (
            <div className="space-y-3">
              {getFilteredComplaints().map((complaint) => (
                <div key={complaint.id} className="border rounded p-3 mb-3">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div>
                      <h6 className="fw-bold mb-1">{complaint.subject}</h6>
                      <small className="text-muted">
                        {complaint.clientName} vs {complaint.photographerName}
                      </small>
                    </div>
                    <div className="d-flex gap-2">
                      <span className={`badge bg-${getSeverityColor(complaint.severity)}`}>{complaint.severity}</span>
                      <select
                        className="form-select form-select-sm"
                        value={complaint.status}
                        onChange={(e) => handleStatusChange(complaint.id, e.target.value)}
                        disabled={loading}
                      >
                        <option value="open">Open</option>
                        <option value="in-progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                      </select>
                    </div>
                  </div>
                  <p className="text-muted mb-2">{complaint.description}</p>
                  <small className="text-muted">Filed on: {complaint.date}</small>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-5">
              <div style={{ fontSize: "2rem" }}>📭</div>
              <p className="text-muted">No complaints found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AdminComplaints
