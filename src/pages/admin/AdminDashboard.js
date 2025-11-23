"use client"

import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"
import photographersData from "../../data/photographers.json"

const AdminDashboard = () => {
  const { user } = useAuth()
  const [stats, setStats] = useState({
    totalPhotographers: 0,
    totalClients: 0,
    totalBookings: 0,
    totalRevenue: 0,
    pendingVerifications: 0,
  })
  const [pendingPhotographers, setPendingPhotographers] = useState([])
  const [recentComplaints, setRecentComplaints] = useState([])

  useEffect(() => {
    // Mock admin data
    const mockPendingPhotographers = [
      {
        id: 7,
        name: "Creative Lens",
        email: "creative@example.com",
        phone: "+92-334-5678901",
        specialty: ["Portrait", "Fashion"],
        experience: 4,
        location: "Rawalpindi",
        hourly_rate: 4500,
        registrationDate: "2024-11-18",
        cnicUploaded: true,
        cnicStatus: "pending",
      },
      {
        id: 8,
        name: "New Vision Studio",
        email: "vision@example.com",
        phone: "+92-345-6789012",
        specialty: ["Event", "Product"],
        experience: 2,
        location: "Islamabad",
        hourly_rate: 3500,
        registrationDate: "2024-11-19",
        cnicUploaded: true,
        cnicStatus: "pending",
      },
    ]

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

    setPendingPhotographers(mockPendingPhotographers)
    setRecentComplaints(mockComplaints)

    // Calculate stats
    const verifiedPhotographers = photographersData.photographers.filter((p) => p.verified)
    const pendingVerifications = mockPendingPhotographers.length

    setStats({
      totalPhotographers: photographersData.photographers.length + mockPendingPhotographers.length,
      totalClients: 1247, // Mock number
      totalBookings: 892, // Mock number
      totalRevenue: 2456000, // Mock number in PKR
      pendingVerifications: pendingVerifications,
    })
  }, [])

  const formatDate = (dateStr) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const getSeverityBadge = (severity) => {
    const severityClasses = {
      high: "bg-danger text-white",
      medium: "bg-warning text-dark",
      low: "bg-info text-white",
    }
    return severityClasses[severity] || "bg-secondary text-white"
  }

  const getStatusBadge = (status) => {
    const statusClasses = {
      open: "status-premium",
      in_progress: "status-available",
      resolved: "status-unavailable",
    }
    return statusClasses[status] || "status-unavailable"
  }

  return (
    <div className="admin-dashboard py-4">
      <div className="container">
        {/* Header */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="gradient-header rounded-3 p-4">
              <div className="row align-items-center">
                <div className="col-md-8">
                  <h2 className="fw-bold mb-2">Admin Dashboard</h2>
                  <p className="mb-0">Manage photographers, verifications, and platform operations</p>
                </div>
                <div className="col-md-4 text-md-end">
                  <div className="mb-2">
                    <span className="badge bg-success me-2">✓ Admin</span>
                    <span className="badge bg-light text-dark">🔐 Full Access</span>
                  </div>
                  <div className="text-white-50 small">Last login: Today, {new Date().toLocaleTimeString()}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="row g-4 mb-5">
          <div className="col-md-3">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h6 className="text-muted mb-2">Total Photographers</h6>
                    <h3 className="fw-bold mb-0">{stats.totalPhotographers}</h3>
                  </div>
                  <div className="text-primary" style={{ fontSize: "2rem" }}>
                    📸
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h6 className="text-muted mb-2">Total Clients</h6>
                    <h3 className="fw-bold mb-0">{stats.totalClients.toLocaleString()}</h3>
                  </div>
                  <div className="text-primary" style={{ fontSize: "2rem" }}>
                    👥
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h6 className="text-muted mb-2">Total Bookings</h6>
                    <h3 className="fw-bold mb-0">{stats.totalBookings.toLocaleString()}</h3>
                  </div>
                  <div className="text-primary" style={{ fontSize: "2rem" }}>
                    📅
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h6 className="text-muted mb-2">Total Revenue</h6>
                    <h3 className="fw-bold mb-0 text-success">PKR {(stats.totalRevenue / 1000000).toFixed(1)}M</h3>
                  </div>
                  <div className="text-primary" style={{ fontSize: "2rem" }}>
                    💰
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="row g-4">
          {/* Pending Photographer Verifications */}
          <div className="col-lg-8">
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-white border-0 pt-4 pb-3">
                <div className="d-flex justify-content-between align-items-center">
                  <h5 className="fw-bold mb-0">
                    Pending Photographer Verifications
                    {stats.pendingVerifications > 0 && (
                      <span className="badge bg-warning ms-2">{stats.pendingVerifications}</span>
                    )}
                  </h5>
                  <Link to="/admin/verifications" className="btn btn-outline-primary btn-sm">
                    View All
                  </Link>
                </div>
              </div>
              <div className="card-body">
                {pendingPhotographers.length > 0 ? (
                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead>
                        <tr>
                          <th>Photographer</th>
                          <th>Contact</th>
                          <th>Specialty</th>
                          <th>Joined</th>
                          <th>CNIC Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendingPhotographers.map((photographer) => (
                          <tr key={photographer.id}>
                            <td>
                              <div className="d-flex align-items-center">
                                <div
                                  className="rounded-circle bg-light d-flex align-items-center justify-content-center me-3"
                                  style={{ width: "40px", height: "40px" }}
                                >
                                  <span>📸</span>
                                </div>
                                <div>
                                  <div className="fw-semibold">{photographer.name}</div>
                                  <small className="text-muted">{photographer.location}</small>
                                </div>
                              </div>
                            </td>
                            <td>
                              <div>{photographer.email}</div>
                              <small className="text-muted">{photographer.phone}</small>
                            </td>
                            <td>
                              {photographer.specialty.map((spec, index) => (
                                <span key={index} className="badge bg-light text-dark me-1">
                                  {spec}
                                </span>
                              ))}
                            </td>
                            <td>
                              <div>{formatDate(photographer.registrationDate)}</div>
                              <small className="text-muted">{photographer.experience} years exp</small>
                            </td>
                            <td>
                              <span className="status-badge status-premium">
                                {photographer.cnicUploaded ? "✓ Uploaded" : "Not Uploaded"}
                              </span>
                            </td>
                            <td>
                              <div className="btn-group btn-group-sm">
                                <Link to={`/admin/verify/${photographer.id}`} className="btn btn-outline-primary">
                                  👁️ Review
                                </Link>
                                <button className="btn btn-outline-success">✓ Approve</button>
                                <button className="btn btn-outline-danger">✗ Reject</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-5">
                    <div className="mb-3" style={{ fontSize: "3rem" }}>
                      ✅
                    </div>
                    <h6 className="text-muted">All photographers verified</h6>
                    <p className="text-muted mb-4">No pending verification requests</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions & Recent Complaints */}
          <div className="col-lg-4">
            {/* Quick Actions */}
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-header bg-white border-0 pt-4 pb-3">
                <h5 className="fw-bold mb-0">Quick Actions</h5>
              </div>
              <div className="card-body">
                <div className="d-grid gap-2">
                  <Link to="/admin/verifications" className="btn btn-primary text-start">
                    🔍 Photographer Verifications
                  </Link>
                  <button className="btn btn-outline-primary text-start">👥 User Management</button>
                  <button className="btn btn-outline-primary text-start">📊 Analytics & Reports</button>
                  <button className="btn btn-outline-primary text-start">💰 Financial Overview</button>
                  <button className="btn btn-outline-primary text-start">⚙️ Platform Settings</button>
                </div>
              </div>
            </div>

            {/* Recent Complaints */}
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-white border-0 pt-4 pb-3">
                <h5 className="fw-bold mb-0">
                  Recent Complaints
                  {recentComplaints.filter((c) => c.status === "open").length > 0 && (
                    <span className="badge bg-danger ms-2">
                      {recentComplaints.filter((c) => c.status === "open").length}
                    </span>
                  )}
                </h5>
              </div>
              <div className="card-body">
                <div className="space-y-3">
                  {recentComplaints.slice(0, 3).map((complaint) => (
                    <div key={complaint.id} className="border-bottom pb-3">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <div className="fw-semibold">{complaint.subject}</div>
                        <span className={`badge ${getSeverityBadge(complaint.severity)}`}>{complaint.severity}</span>
                      </div>
                      <div className="small text-muted mb-1">
                        {complaint.clientName} vs {complaint.photographerName}
                      </div>
                      <div className="small text-muted mb-2">📅 {formatDate(complaint.date)}</div>
                      <div className="d-flex justify-content-between align-items-center">
                        <span className={`status-badge ${getStatusBadge(complaint.status)}`}>
                          {complaint.status.replace("-", " ").toUpperCase()}
                        </span>
                        <Link to={`/admin/complaints/${complaint.id}`} className="btn btn-sm btn-outline-primary">
                          Review
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
                <Link to="/admin/complaints" className="btn btn-outline-primary w-100 mt-3">
                  View All Complaints
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard
