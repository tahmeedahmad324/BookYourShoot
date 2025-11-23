"use client"

import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"
import photographersData from "../../data/photographers.json"

const ClientDashboard = () => {
  const { user } = useAuth()
  const [recentBookings, setRecentBookings] = useState([])
  const [recommendedPhotographers, setRecommendedPhotographers] = useState([])
  const [stats, setStats] = useState({
    totalBookings: 0,
    upcomingBookings: 0,
    completedBookings: 0,
    totalSpent: 0,
  })

  useEffect(() => {
    // Mock data for client bookings
    const mockBookings = [
      {
        id: 1,
        photographer: "Ahmed Photography",
        photographerId: 1,
        date: "2024-12-25",
        time: "2:00 PM",
        location: "Lahore, Garden Town",
        service: "Wedding Photography",
        status: "upcoming",
        amount: 15000,
        image: "/images/photographer1.jpg",
      },
      {
        id: 2,
        photographer: "Sarah Studios",
        photographerId: 2,
        date: "2024-11-15",
        time: "10:00 AM",
        location: "Karachi, Clifton",
        service: "Portrait Photography",
        status: "completed",
        amount: 8000,
        image: "/images/photographer2.jpg",
      },
      {
        id: 3,
        photographer: "Elite Photography",
        photographerId: 4,
        date: "2024-12-30",
        time: "4:00 PM",
        location: "Lahore, Model Town",
        service: "Product Photography",
        status: "upcoming",
        amount: 12000,
        image: "/images/photographer4.jpg",
      },
    ]

    setRecentBookings(mockBookings.slice(0, 3))
    setRecommendedPhotographers(photographersData.photographers.slice(0, 4))

    const upcoming = mockBookings.filter((b) => b.status === "upcoming").length
    const completed = mockBookings.filter((b) => b.status === "completed").length
    const totalSpent = mockBookings.reduce((sum, b) => sum + b.amount, 0)

    setStats({
      totalBookings: mockBookings.length,
      upcomingBookings: upcoming,
      completedBookings: completed,
      totalSpent: totalSpent,
    })
  }, [])

  const getStatusBadge = (status) => {
    const statusClasses = {
      upcoming: "status-available",
      completed: "status-premium",
      cancelled: "status-unavailable",
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

  return (
    <div className="client-dashboard py-4">
      <div className="container">
        {/* Header */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="gradient-header rounded-3 p-4">
              <h2 className="fw-bold mb-2">Welcome back, {user?.name || "Client"}! 👋</h2>
              <p className="mb-0">Manage your bookings and discover talented photographers</p>
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
                    <h6 className="text-muted mb-2">Upcoming</h6>
                    <h3 className="fw-bold mb-0 text-success">{stats.upcomingBookings}</h3>
                  </div>
                  <div className="text-primary" style={{ fontSize: "2rem" }}>
                    ⏰
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
                    <h3 className="fw-bold mb-0 text-info">{stats.completedBookings}</h3>
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
                    <h6 className="text-muted mb-2">Total Spent</h6>
                    <h3 className="fw-bold mb-0">PKR {stats.totalSpent.toLocaleString()}</h3>
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
                  <Link to="/client/bookings" className="btn btn-outline-primary btn-sm">
                    View All
                  </Link>
                </div>
              </div>
              <div className="card-body">
                {recentBookings.length > 0 ? (
                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead>
                        <tr>
                          <th>Photographer</th>
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
                                  <span>📸</span>
                                </div>
                                <div>
                                  <div className="fw-semibold">{booking.photographer}</div>
                                  <small className="text-muted">{booking.location}</small>
                                </div>
                              </div>
                            </td>
                            <td>
                              <div>{formatDate(booking.date)}</div>
                              <small className="text-muted">{booking.time}</small>
                            </td>
                            <td>{booking.service}</td>
                            <td className="fw-semibold">PKR {booking.amount.toLocaleString()}</td>
                            <td>
                              <span className={`status-badge ${getStatusBadge(booking.status)}`}>
                                {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                              </span>
                            </td>
                            <td>
                              {booking.status === "upcoming" ? (
                                <Link
                                  to={`/client/chat/${booking.photographerId}`}
                                  className="btn btn-sm btn-outline-primary"
                                >
                                  💬 Chat
                                </Link>
                              ) : (
                                <Link
                                  to={`/client/review/${booking.photographerId}`}
                                  className="btn btn-sm btn-outline-secondary"
                                >
                                  ⭐ Review
                                </Link>
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
                    <p className="text-muted mb-4">Book your first photographer to get started</p>
                    <Link to="/search" className="btn btn-primary">
                      Find Photographers
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions & Recommended */}
          <div className="col-lg-4">
            {/* Quick Actions */}
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-header bg-white border-0 pt-4 pb-3">
                <h5 className="fw-bold mb-0">Quick Actions</h5>
              </div>
              <div className="card-body">
                <div className="d-grid gap-2">
                  <Link to="/search" className="btn btn-primary text-start">
                    🔍 Find Photographers
                  </Link>
                  <Link to="/client/bookings" className="btn btn-outline-primary text-start">
                    📅 View All Bookings
                  </Link>
                  <Link to="/client/album-builder" className="btn btn-outline-primary text-start">
                    🎨 Album Builder
                  </Link>
                  <Link to="/client/reel-generator" className="btn btn-outline-primary text-start">
                    🎬 Reel Generator
                  </Link>
                  <Link to="/client/music-suggestion" className="btn btn-outline-primary text-start">
                    🎵 Music Suggestions
                  </Link>
                </div>
              </div>
            </div>

            {/* Recommended Photographers */}
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-white border-0 pt-4 pb-3">
                <h5 className="fw-bold mb-0">Recommended for You</h5>
              </div>
              <div className="card-body">
                <div className="space-y-3">
                  {recommendedPhotographers.slice(0, 3).map((photographer) => (
                    <div key={photographer.id} className="d-flex align-items-center pb-3 border-bottom">
                      <div
                        className="rounded-circle bg-light d-flex align-items-center justify-content-center me-3"
                        style={{ width: "45px", height: "45px" }}
                      >
                        <span>📸</span>
                      </div>
                      <div className="flex-grow-1">
                        <div className="fw-semibold">{photographer.name}</div>
                        <div className="small text-muted">
                          ⭐ {photographer.rating} • {photographer.specialty[0]}
                        </div>
                      </div>
                      <div className="text-end">
                        <div className="small text-primary fw-semibold">PKR {photographer.hourly_rate}/hr</div>
                        <Link to={`/photographer/${photographer.id}`} className="btn btn-sm btn-outline-primary mt-1">
                          View
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
                <Link to="/search" className="btn btn-outline-primary w-100 mt-3">
                  View All Photographers
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ClientDashboard
