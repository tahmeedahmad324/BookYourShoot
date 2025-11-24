"use client"

import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"

const PhotographerDashboard = () => {
  const { user } = useAuth()
  const [stats, setStats] = useState({
    totalBookings: 0,
    pendingBookings: 0,
    confirmedBookings: 0,
    completedBookings: 0,
    totalEarnings: 0,
    averageRating: 4.8,
  })
  const [recentBookings, setRecentBookings] = useState([])
  const [upcomingBookings, setUpcomingBookings] = useState([])

  useEffect(() => {
    // Mock data for photographer bookings
    const mockBookings = [
      {
        id: 1,
        clientName: "Fatima Khan",
        clientEmail: "fatima@example.com",
        date: "2024-12-25",
        time: "2:00 PM",
        location: "Lahore, Garden Town",
        service: "Wedding Photography",
        status: "pending",
        amount: 15000,
        duration: "6 hours",
        specialRequests: "Outdoor shooting preferred",
      },
      {
        id: 2,
        clientName: "Ahmed Raza",
        clientEmail: "ahmed@example.com",
        date: "2024-12-28",
        time: "10:00 AM",
        location: "Lahore, Gulberg",
        service: "Portrait Photography",
        status: "confirmed",
        amount: 8000,
        duration: "3 hours",
        specialRequests: "Studio lighting required",
      },
      {
        id: 3,
        clientName: "Sarah Ahmed",
        clientEmail: "sarah@example.com",
        date: "2024-12-30",
        time: "4:00 PM",
        location: "Lahore, DHA",
        service: "Event Photography",
        status: "confirmed",
        amount: 12000,
        duration: "4 hours",
        specialRequests: "Candid photography preferred",
      },
      {
        id: 4,
        clientName: "Bilal Hassan",
        clientEmail: "bilal@example.com",
        date: "2024-11-15",
        time: "11:00 AM",
        location: "Karachi, Clifton",
        service: "Product Photography",
        status: "completed",
        amount: 10000,
        duration: "5 hours",
        specialRequests: "White background setup",
      },
    ]

    const pending = mockBookings.filter((b) => b.status === "pending").length
    const confirmed = mockBookings.filter((b) => b.status === "confirmed").length
    const completed = mockBookings.filter((b) => b.status === "completed").length
    const totalEarnings = mockBookings.filter((b) => b.status === "completed").reduce((sum, b) => sum + b.amount, 0)

    setStats({
      totalBookings: mockBookings.length,
      pendingBookings: pending,
      confirmedBookings: confirmed,
      completedBookings: completed,
      totalEarnings: totalEarnings,
      averageRating: 4.8,
    })

    setRecentBookings(mockBookings.slice(0, 3))
    setUpcomingBookings(mockBookings.filter((b) => b.status === "pending" || b.status === "confirmed"))
  }, [])

  const getStatusBadge = (status) => {
    const statusClasses = {
      pending: "status-premium",
      confirmed: "status-available",
      completed: "status-unavailable",
      cancelled: "bg-danger text-white",
    }
    return statusClasses[status] || "status-unavailable"
  }

  const formatDate = (dateStr) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const getDaysUntilBooking = (dateStr) => {
    const today = new Date()
    const bookingDate = new Date(dateStr)
    const diffTime = bookingDate - today
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  return (
    <div className="photographer-dashboard py-4">
      <div className="container">
        {/* Header */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="gradient-header rounded-3 p-4">
              <div className="row align-items-center">
                <div className="col-md-8">
                  <h2 className="fw-bold mb-2">Welcome back, {user?.name || "Photographer"}! 📸</h2>
                  <p className="mb-0">Manage your bookings and grow your photography business</p>
                </div>
                <div className="col-md-4 text-md-end">
                  <div className="mb-2">
                    <span className="badge bg-success me-2">✓ Verified</span>
                    <span className="badge bg-light text-dark">⭐ {stats.averageRating} Rating</span>
                  </div>
                  <div className="text-white-50 small">Response time: 1 hour</div>
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
                    <h6 className="text-muted mb-2">Total Bookings</h6>
                    <h3 className="fw-bold mb-0">{stats.totalBookings}</h3>
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
                    <h6 className="text-muted mb-2">Pending</h6>
                    <h3 className="fw-bold mb-0 text-warning">{stats.pendingBookings}</h3>
                  </div>
                  <div className="text-primary" style={{ fontSize: "2rem" }}>
                    ⏳
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
                    <h6 className="text-muted mb-2">Completed</h6>
                    <h3 className="fw-bold mb-0 text-success">{stats.completedBookings}</h3>
                  </div>
                  <div className="text-primary" style={{ fontSize: "2rem" }}>
                    ✅
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
                    <h6 className="text-muted mb-2">Total Earnings</h6>
                    <h3 className="fw-bold mb-0 text-success">PKR {stats.totalEarnings.toLocaleString()}</h3>
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
          {/* Recent Bookings */}
          <div className="col-lg-8">
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-white border-0 pt-4 pb-3">
                <div className="d-flex justify-content-between align-items-center">
                  <h5 className="fw-bold mb-0">Recent Bookings</h5>
                  <Link to="/photographer/bookings" className="btn btn-outline-primary btn-sm" onClick={() => window.scrollTo(0, 0)}>
                    View All Bookings
                  </Link>
                </div>
              </div>
              <div className="card-body">
                {recentBookings.length > 0 ? (
                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead>
                        <tr>
                          <th>Client</th>
                          <th>Date & Time</th>
                          <th>Service</th>
                          <th>Amount</th>
                          <th>Status</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentBookings.map((booking) => (
                          <tr key={booking.id}>
                            <td>
                              <div className="d-flex align-items-center">
                                <div
                                  className="rounded-circle bg-light d-flex align-items-center justify-content-center me-3"
                                  style={{ width: "40px", height: "40px" }}
                                >
                                  <span>👤</span>
                                </div>
                                <div>
                                  <div className="fw-semibold">{booking.clientName}</div>
                                  <small className="text-muted">{booking.clientEmail}</small>
                                </div>
                              </div>
                            </td>
                            <td>
                              <div>{formatDate(booking.date)}</div>
                              <small className="text-muted">
                                {booking.time} • {booking.duration}
                              </small>
                            </td>
                            <td>{booking.service}</td>
                            <td className="fw-semibold">PKR {booking.amount.toLocaleString()}</td>
                            <td>
                              <span className={`status-badge ${getStatusBadge(booking.status)}`}>
                                {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                              </span>
                            </td>
                            <td>
                              {booking.status === "pending" ? (
                                <div className="btn-group btn-group-sm">
                                  <Link to={`/photographer/bookings/${booking.id}`} className="btn btn-outline-success">
                                    ✓ Accept
                                  </Link>
                                  <button className="btn btn-outline-danger">✗ Decline</button>
                                </div>
                              ) : booking.status === "confirmed" ? (
                                <Link to={`/client/chat/${booking.id}`} className="btn btn-sm btn-outline-primary">
                                  💬 Chat
                                </Link>
                              ) : (
                                <button className="btn btn-sm btn-outline-secondary">⭐ Review</button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-5">
                    <div className="mb-3" style={{ fontSize: "3rem" }}>
                      📸
                    </div>
                    <h6 className="text-muted">No bookings yet</h6>
                    <p className="text-muted mb-4">Your upcoming bookings will appear here</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions & Upcoming */}
          <div className="col-lg-4">
            {/* Quick Actions */}
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-header bg-white border-0 pt-4 pb-3">
                <h5 className="fw-bold mb-0">Quick Actions</h5>
              </div>
              <div className="card-body">
                <div className="d-grid gap-2">
                  <Link to="/photographer/bookings" className="btn btn-primary text-start">
                    📅 View All Bookings
                  </Link>
                  <Link to="/photographer/equipment" className="btn btn-outline-primary text-start">
                    🎥 Manage Equipment
                  </Link>
                  <Link to="/photographer/travel" className="btn btn-outline-primary text-start">
                    🚗 Travel Estimator
                  </Link>
                  <button className="btn btn-outline-primary text-start">📈 View Analytics</button>
                  <button className="btn btn-outline-primary text-start">⚙️ Profile Settings</button>
                </div>
              </div>
            </div>

            {/* Upcoming Bookings */}
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-white border-0 pt-4 pb-3">
                <h5 className="fw-bold mb-0">Upcoming Bookings</h5>
              </div>
              <div className="card-body">
                {upcomingBookings.length > 0 ? (
                  <div className="space-y-3">
                    {upcomingBookings.slice(0, 3).map((booking) => (
                      <div key={booking.id} className="border-bottom pb-3">
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <div>
                            <div className="fw-semibold">{booking.clientName}</div>
                            <small className="text-muted">{booking.service}</small>
                          </div>
                          <span className={`status-badge ${getStatusBadge(booking.status)} text-capitalize`}>
                            {booking.status}
                          </span>
                        </div>
                        <div className="small text-muted mb-1">
                          📅 {formatDate(booking.date)} at {booking.time}
                        </div>
                        <div className="small text-muted mb-2">📍 {booking.location}</div>
                        <div className="d-flex gap-1">
                          <Link to={`/client/chat/${booking.id}`} className="btn btn-sm btn-outline-primary">
                            💬 Message
                          </Link>
                          <Link to={`/booking/request/${booking.id}`} className="btn btn-sm btn-outline-secondary">
                            📋 Details
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <div className="mb-2" style={{ fontSize: "2rem" }}>
                      📅
                    </div>
                    <h6 className="text-muted">No upcoming bookings</h6>
                    <p className="text-muted small">Your confirmed bookings will appear here</p>
                  </div>
                )}
                <Link to="/photographer/bookings" className="btn btn-outline-primary w-100 mt-3" onClick={() => window.scrollTo(0, 0)}>
                  View All Bookings
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PhotographerDashboard
