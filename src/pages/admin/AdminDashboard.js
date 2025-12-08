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
    openComplaints: 0,
    reportedReviews: 0,
  })

  useEffect(() => {
    // Calculate stats from mock data
    setStats({
      totalPhotographers: photographersData.photographers.length + 2,
      totalClients: 1247,
      totalBookings: 892,
      totalRevenue: 2456000,
      pendingVerifications: 2,
      openComplaints: 3,
      reportedReviews: 2,
    })
  }, [])

  // Admin menu options
  const menuOptions = [
    {
      id: "verifications",
      title: "Photographer Verifications",
      description: "Review and approve pending photographer registrations",
      icon: "✅",
      link: "/admin/verifications",
      badge: stats.pendingVerifications,
      badgeColor: "warning",
    },
    {
      id: "complaints",
      title: "Complaints & Disputes",
      description: "Handle customer complaints and resolve disputes",
      icon: "📢",
      link: "/admin/complaints",
      badge: stats.openComplaints,
      badgeColor: "danger",
    },
    {
      id: "reviews",
      title: "Reported Reviews",
      description: "Moderate reviews flagged by photographers",
      icon: "🚩",
      link: "/admin/reported-reviews",
      badge: stats.reportedReviews,
      badgeColor: "warning",
    },
    {
      id: "users",
      title: "User Management",
      description: "View and manage all users on the platform",
      icon: "👥",
      link: "#",
      badge: null,
    },
    {
      id: "photographers",
      title: "All Photographers",
      description: "View verified photographers and their profiles",
      icon: "📸",
      link: "#",
      badge: stats.totalPhotographers,
      badgeColor: "primary",
    },
    {
      id: "bookings",
      title: "All Bookings",
      description: "View and monitor all platform bookings",
      icon: "📅",
      link: "#",
      badge: stats.totalBookings,
      badgeColor: "info",
    },
    {
      id: "analytics",
      title: "Analytics & Reports",
      description: "View platform statistics and generate reports",
      icon: "📊",
      link: "#",
      badge: null,
    },
    {
      id: "finances",
      title: "Financial Overview",
      description: "Revenue, payouts, and transaction history",
      icon: "💰",
      link: "#",
      badge: null,
    },
    {
      id: "settings",
      title: "Platform Settings",
      description: "Configure platform fees, limits, and operations",
      icon: "⚙️",
      link: "/admin/platform-settings",
      badge: null,
    },
  ]

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
                  <p className="mb-0">Welcome back, {user?.name || "Admin"}! Manage your platform from here.</p>
                </div>
                <div className="col-md-4 text-md-end">
                  <div className="mb-2">
                    <span className="badge bg-danger me-2">🔐 Super Admin</span>
                  </div>
                  <Link to="/admin/settings" className="btn btn-light btn-sm">
                    👤 My Profile
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="row g-3 mb-4">
          <div className="col-6 col-md-3">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body text-center py-3">
                <div className="text-primary mb-1" style={{ fontSize: "1.5rem" }}>📸</div>
                <h4 className="fw-bold mb-0">{stats.totalPhotographers}</h4>
                <small className="text-muted">Photographers</small>
              </div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body text-center py-3">
                <div className="text-primary mb-1" style={{ fontSize: "1.5rem" }}>👥</div>
                <h4 className="fw-bold mb-0">{stats.totalClients.toLocaleString()}</h4>
                <small className="text-muted">Clients</small>
              </div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body text-center py-3">
                <div className="text-primary mb-1" style={{ fontSize: "1.5rem" }}>📅</div>
                <h4 className="fw-bold mb-0">{stats.totalBookings.toLocaleString()}</h4>
                <small className="text-muted">Bookings</small>
              </div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body text-center py-3">
                <div className="text-success mb-1" style={{ fontSize: "1.5rem" }}>💰</div>
                <h4 className="fw-bold mb-0 text-success">PKR {(stats.totalRevenue / 1000000).toFixed(1)}M</h4>
                <small className="text-muted">Revenue</small>
              </div>
            </div>
          </div>
        </div>

        {/* Menu Options */}
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-white border-0 pt-4 pb-2">
            <h5 className="fw-bold mb-0">Management Options</h5>
            <p className="text-muted small mb-0">Select an option to view and manage</p>
          </div>
          <div className="card-body">
            <div className="row g-3">
              {menuOptions.map((option) => (
                <div className="col-md-6 col-lg-4" key={option.id}>
                  <Link
                    to={option.link}
                    className="card h-100 border hover-lift text-decoration-none"
                    onClick={() => window.scrollTo(0, 0)}
                    style={{ cursor: option.link === "#" ? "not-allowed" : "pointer" }}
                  >
                    <div className="card-body">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <span style={{ fontSize: "2rem" }}>{option.icon}</span>
                        {option.badge !== null && option.badge > 0 && (
                          <span className={`badge bg-${option.badgeColor}`}>
                            {option.badge}
                          </span>
                        )}
                      </div>
                      <h6 className="fw-bold text-dark mb-1">{option.title}</h6>
                      <p className="text-muted small mb-0">{option.description}</p>
                      {option.link === "#" && (
                        <span className="badge bg-light text-muted mt-2">Coming Soon</span>
                      )}
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions Alert */}
        {(stats.pendingVerifications > 0 || stats.openComplaints > 0 || stats.reportedReviews > 0) && (
          <div className="alert alert-warning mt-4 d-flex align-items-center">
            <span className="me-2">⚠️</span>
            <div>
              <strong>Action Required:</strong>
              {stats.pendingVerifications > 0 && (
                <span className="ms-2">
                  <Link to="/admin/verifications" className="alert-link">
                    {stats.pendingVerifications} pending verification{stats.pendingVerifications > 1 ? "s" : ""}
                  </Link>
                </span>
              )}
              {stats.openComplaints > 0 && (
                <span className="ms-2">
                  • <Link to="/admin/complaints" className="alert-link">
                    {stats.openComplaints} open complaint{stats.openComplaints > 1 ? "s" : ""}
                  </Link>
                </span>
              )}
              {stats.reportedReviews > 0 && (
                <span className="ms-2">
                  • <Link to="/admin/settings" className="alert-link">
                    {stats.reportedReviews} reported review{stats.reportedReviews > 1 ? "s" : ""}
                  </Link>
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .hover-lift {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .hover-lift:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 25px rgba(0,0,0,0.1) !important;
        }
      `}</style>
    </div>
  )
}

export default AdminDashboard
