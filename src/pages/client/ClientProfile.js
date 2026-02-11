"use client"

import { useState, useEffect, useRef } from "react"
import { Link } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"

const ClientProfile = () => {
  const { user } = useAuth()
  const fileInputRef = useRef(null)

  // Profile state - initialize from AuthContext user data
  const [profile, setProfile] = useState({
    fullName: user?.full_name || user?.name || "Not set",
    email: user?.email || "Not set",
    phone: user?.phone || "Not set",
    city: user?.city || "Not set",
    bio: user?.bio || "No bio added yet.",
    profileImage: user?.profile_picture_url || null,
    memberSince: user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : "Recently joined",
  })

  // Update profile when user data changes
  useEffect(() => {
    if (user) {
      setProfile({
        fullName: user.full_name || user.name || "Not set",
        email: user.email || "Not set",
        phone: user.phone || "Not set",
        city: user.city || "Not set",
        bio: user.bio || "No bio added yet.",
        profileImage: user.profile_picture_url || null,
        memberSince: user.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : "Recently joined",
      })
    }
  }, [user])

  // Edit mode states
  const [isEditing, setIsEditing] = useState(false)
  const [editedProfile, setEditedProfile] = useState({ ...profile })
  const [activeTab, setActiveTab] = useState("personal")
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [passwordError, setPasswordError] = useState("")

  // Notification preferences
  const [notifications, setNotifications] = useState({
    emailBookingUpdates: true,
    emailPromotions: false,
    emailNewPhotographers: true,
    pushBookingReminders: true,
    pushMessages: true,
    smsBookingConfirmation: true,
  })

  // Favorites
  const [favorites, setFavorites] = useState([
    {
      id: 1,
      name: "Ahmed Photography",
      specialty: "Wedding",
      rating: 4.8,
      location: "Lahore",
      hourlyRate: 5000,
      image: "/images/photographer1.jpg",
    },
    {
      id: 2,
      name: "Sarah Studios",
      specialty: "Portrait",
      rating: 4.9,
      location: "Karachi",
      hourlyRate: 4000,
      image: "/images/photographer2.jpg",
    },
    {
      id: 3,
      name: "Elite Photography",
      specialty: "Event",
      rating: 4.9,
      location: "Lahore",
      hourlyRate: 8000,
      image: "/images/photographer4.jpg",
    },
  ])

  // Booking history
  const [bookingHistory, setBookingHistory] = useState([
    {
      id: 1,
      photographer: "Ahmed Photography",
      date: "2024-12-25",
      service: "Wedding Photography",
      amount: 15000,
      status: "upcoming",
      rating: null,
    },
    {
      id: 2,
      photographer: "Sarah Studios",
      date: "2024-11-15",
      service: "Portrait Photography",
      amount: 8000,
      status: "completed",
      rating: 5,
    },
    {
      id: 3,
      photographer: "Mountain View Photography",
      date: "2024-10-20",
      service: "Event Photography",
      amount: 12000,
      status: "completed",
      rating: 4,
    },
    {
      id: 4,
      photographer: "Creative Lens",
      date: "2024-09-10",
      service: "Product Photography",
      amount: 6000,
      status: "completed",
      rating: 5,
    },
  ])

  // Stats
  const [stats, setStats] = useState({
    totalBookings: 4,
    totalSpent: 41000,
    reviewsGiven: 3,
    favoritePhotographers: 3,
  })

  // Profile completeness calculation
  const calculateCompleteness = () => {
    let completed = 0
    const fields = [
      profile.fullName && profile.fullName !== "Not set",
      profile.email && profile.email !== "Not set",
      profile.phone && profile.phone !== "Not set",
      profile.city && profile.city !== "Not set",
      profile.bio && profile.bio !== "No bio added yet.",
      profile.profileImage,
    ]
    fields.forEach((field) => {
      if (field) completed++
    })
    return Math.round((completed / fields.length) * 100)
  }

  const [completeness, setCompleteness] = useState(calculateCompleteness())

  useEffect(() => {
    setCompleteness(calculateCompleteness())
  }, [profile])

  // Handle profile image upload
  const handleImageUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setEditedProfile({ ...editedProfile, profileImage: reader.result })
      }
      reader.readAsDataURL(file)
    }
  }

  // Save profile changes
  const handleSaveProfile = () => {
    setProfile({ ...editedProfile })
    setIsEditing(false)
    // TODO: API call to save profile
  }

  // Cancel editing
  const handleCancelEdit = () => {
    setEditedProfile({ ...profile })
    setIsEditing(false)
  }

  // Handle password change
  const handlePasswordChange = () => {
    setPasswordError("")

    if (passwordData.newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters long")
      return
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError("Passwords do not match")
      return
    }

    // TODO: API call to change password
    setShowPasswordModal(false)
    setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" })
    alert("Password changed successfully!")
  }

  // Handle notification toggle
  const handleNotificationToggle = (key) => {
    setNotifications({ ...notifications, [key]: !notifications[key] })
    // TODO: API call to update notification preferences
  }

  // Remove from favorites
  const handleRemoveFavorite = (id) => {
    setFavorites(favorites.filter((f) => f.id !== id))
    setStats({ ...stats, favoritePhotographers: stats.favoritePhotographers - 1 })
    // TODO: API call to remove favorite
  }

  // Format date
  const formatDate = (dateStr) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  // Get status badge class
  const getStatusBadge = (status) => {
    const statusClasses = {
      upcoming: "status-available",
      completed: "status-premium",
      cancelled: "status-unavailable",
    }
    return statusClasses[status] || "status-unavailable"
  }

  // Render stars
  const renderStars = (rating) => {
    return [...Array(5)].map((_, i) => (
      <span key={i} style={{ color: i < rating ? "#f59e0b" : "#d1d5db" }}>
        ★
      </span>
    ))
  }

  return (
    <div className="client-profile py-4">
      <div className="container">
        {/* Header */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="gradient-header rounded-3 p-4">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h2 className="fw-bold mb-2">My Profile</h2>
                  <p className="mb-0">Manage your account settings and preferences</p>
                </div>
                <Link to="/client/dashboard" className="btn btn-light">
                  ← Back to Dashboard
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="row g-4">
          {/* Left Sidebar - Profile Card */}
          <div className="col-lg-4">
            {/* Profile Card */}
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-body text-center p-4">
                {/* Profile Image */}
                <div className="position-relative d-inline-block mb-3">
                  <div
                    className="rounded-circle bg-primary d-flex align-items-center justify-content-center mx-auto"
                    style={{
                      width: "120px",
                      height: "120px",
                      fontSize: "48px",
                      color: "white",
                      overflow: "hidden",
                    }}
                  >
                    {profile.profileImage ? (
                      <img
                        src={profile.profileImage}
                        alt="Profile"
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      profile.fullName.charAt(0).toUpperCase()
                    )}
                  </div>
                  {isEditing && (
                    <button
                      className="btn btn-sm btn-primary position-absolute"
                      style={{ bottom: "0", right: "0", borderRadius: "50%" }}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      📷
                    </button>
                  )}
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="d-none"
                    accept="image/*"
                    onChange={handleImageUpload}
                  />
                </div>

                <h4 className="fw-bold mb-1">{profile.fullName}</h4>
                <p className="text-muted mb-2">📍 {profile.city}</p>
                <p className="text-muted small mb-3">Member since {profile.memberSince}</p>

                {/* Profile Completeness */}
                <div className="mb-3">
                  <div className="d-flex justify-content-between mb-1">
                    <small className="text-muted">Profile Completeness</small>
                    <small className="fw-bold">{completeness}%</small>
                  </div>
                  <div className="progress" style={{ height: "8px" }}>
                    <div
                      className="progress-bar"
                      role="progressbar"
                      style={{
                        width: `${completeness}%`,
                        backgroundColor: completeness === 100 ? "#10b981" : "#225ea1",
                      }}
                    />
                  </div>
                  {completeness < 100 && (
                    <small className="text-muted d-block mt-1">
                      Complete your profile to get better recommendations
                    </small>
                  )}
                </div>

                {!isEditing ? (
                  <button className="btn btn-primary w-100" onClick={() => setIsEditing(true)}>
                    ✏️ Edit Profile
                  </button>
                ) : (
                  <div className="d-flex gap-2">
                    <button className="btn btn-success flex-fill" onClick={handleSaveProfile}>
                      ✓ Save
                    </button>
                    <button className="btn btn-outline-secondary flex-fill" onClick={handleCancelEdit}>
                      ✕ Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-white border-0 pt-3 pb-2">
                <h6 className="fw-bold mb-0">📊 Quick Stats</h6>
              </div>
              <div className="card-body">
                <div className="row g-3">
                  <div className="col-6">
                    <div className="text-center p-2 bg-light rounded">
                      <h4 className="fw-bold mb-0 text-primary">{stats.totalBookings}</h4>
                      <small className="text-muted">Bookings</small>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="text-center p-2 bg-light rounded">
                      <h4 className="fw-bold mb-0 text-success">PKR {(stats.totalSpent / 1000).toFixed(0)}K</h4>
                      <small className="text-muted">Total Spent</small>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="text-center p-2 bg-light rounded">
                      <h4 className="fw-bold mb-0 text-warning">{stats.reviewsGiven}</h4>
                      <small className="text-muted">Reviews</small>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="text-center p-2 bg-light rounded">
                      <h4 className="fw-bold mb-0 text-danger">{stats.favoritePhotographers}</h4>
                      <small className="text-muted">Favorites</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Content - Tabs */}
          <div className="col-lg-8">
            {/* Tab Navigation */}
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-body p-0">
                <ul className="nav nav-tabs nav-fill border-0">
                  <li className="nav-item">
                    <button
                      className={`nav-link py-3 ${activeTab === "personal" ? "active fw-bold" : ""}`}
                      onClick={() => setActiveTab("personal")}
                    >
                      👤 Personal Info
                    </button>
                  </li>
                  <li className="nav-item">
                    <button
                      className={`nav-link py-3 ${activeTab === "bookings" ? "active fw-bold" : ""}`}
                      onClick={() => setActiveTab("bookings")}
                    >
                      📅 Bookings
                    </button>
                  </li>
                  <li className="nav-item">
                    <button
                      className={`nav-link py-3 ${activeTab === "favorites" ? "active fw-bold" : ""}`}
                      onClick={() => setActiveTab("favorites")}
                    >
                      ❤️ Favorites
                    </button>
                  </li>
                  <li className="nav-item">
                    <button
                      className={`nav-link py-3 ${activeTab === "settings" ? "active fw-bold" : ""}`}
                      onClick={() => setActiveTab("settings")}
                    >
                      ⚙️ Account Settings
                    </button>
                  </li>
                </ul>
              </div>
            </div>

            {/* Tab Content */}
            <div className="card border-0 shadow-sm">
              <div className="card-body p-4">
                {/* Personal Info Tab */}
                {activeTab === "personal" && (
                  <div className="fade-in">
                    <h5 className="fw-bold mb-4">Personal Information</h5>

                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label fw-semibold">Full Name</label>
                        {isEditing ? (
                          <input
                            type="text"
                            className="form-control"
                            value={editedProfile.fullName}
                            onChange={(e) =>
                              setEditedProfile({ ...editedProfile, fullName: e.target.value })
                            }
                          />
                        ) : (
                          <p className="form-control-plaintext">{profile.fullName}</p>
                        )}
                      </div>

                      <div className="col-md-6">
                        <label className="form-label fw-semibold">Email Address</label>
                        <p className="form-control-plaintext">
                          {profile.email}
                          <span className="badge bg-success ms-2">Verified</span>
                        </p>
                      </div>

                      <div className="col-md-6">
                        <label className="form-label fw-semibold">Phone Number</label>
                        {isEditing ? (
                          <input
                            type="tel"
                            className="form-control"
                            value={editedProfile.phone}
                            onChange={(e) =>
                              setEditedProfile({ ...editedProfile, phone: e.target.value })
                            }
                          />
                        ) : (
                          <p className="form-control-plaintext">{profile.phone}</p>
                        )}
                      </div>

                      <div className="col-md-6">
                        <label className="form-label fw-semibold">City</label>
                        {isEditing ? (
                          <select
                            className="form-select"
                            value={editedProfile.city}
                            onChange={(e) =>
                              setEditedProfile({ ...editedProfile, city: e.target.value })
                            }
                          >
                            <option value="Lahore">Lahore</option>
                            <option value="Karachi">Karachi</option>
                            <option value="Islamabad">Islamabad</option>
                            <option value="Rawalpindi">Rawalpindi</option>
                            <option value="Faisalabad">Faisalabad</option>
                            <option value="Multan">Multan</option>
                            <option value="Peshawar">Peshawar</option>
                            <option value="Quetta">Quetta</option>
                          </select>
                        ) : (
                          <p className="form-control-plaintext">{profile.city}</p>
                        )}
                      </div>

                      <div className="col-12">
                        <label className="form-label fw-semibold">Bio</label>
                        {isEditing ? (
                          <textarea
                            className="form-control"
                            rows="3"
                            value={editedProfile.bio}
                            onChange={(e) =>
                              setEditedProfile({ ...editedProfile, bio: e.target.value })
                            }
                            placeholder="Tell photographers about yourself and what you're looking for..."
                          />
                        ) : (
                          <p className="form-control-plaintext text-muted">
                            {profile.bio || "No bio added yet"}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Security Section */}
                    <div className="mt-4 pt-4 border-top">
                      <h6 className="fw-bold mb-3">🔐 Security</h6>
                      <button
                        className="btn btn-outline-primary"
                        onClick={() => setShowPasswordModal(true)}
                      >
                        Change Password
                      </button>
                    </div>
                  </div>
                )}

                {/* Bookings Tab */}
                {activeTab === "bookings" && (
                  <div className="fade-in">
                    <div className="d-flex justify-content-between align-items-center mb-4">
                      <h5 className="fw-bold mb-0">Booking History</h5>
                      <Link to="/client/bookings" className="btn btn-outline-primary btn-sm">
                        View All Bookings
                      </Link>
                    </div>

                    {bookingHistory.length > 0 ? (
                      <div className="table-responsive">
                        <table className="table table-hover">
                          <thead className="table-light">
                            <tr>
                              <th>Photographer</th>
                              <th>Date</th>
                              <th>Service</th>
                              <th>Amount</th>
                              <th>Status</th>
                              <th>Rating</th>
                            </tr>
                          </thead>
                          <tbody>
                            {bookingHistory.map((booking) => (
                              <tr key={booking.id}>
                                <td className="fw-semibold">{booking.photographer}</td>
                                <td>{formatDate(booking.date)}</td>
                                <td>{booking.service}</td>
                                <td>PKR {booking.amount.toLocaleString()}</td>
                                <td>
                                  <span className={`status-badge ${getStatusBadge(booking.status)}`}>
                                    {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                                  </span>
                                </td>
                                <td>
                                  {booking.rating ? (
                                    renderStars(booking.rating)
                                  ) : booking.status === "completed" ? (
                                    <Link
                                      to={`/client/review/${booking.id}`}
                                      className="btn btn-sm btn-outline-warning"
                                    >
                                      Rate Now
                                    </Link>
                                  ) : (
                                    <span className="text-muted">-</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-5">
                        <div style={{ fontSize: "48px", marginBottom: "16px" }}>📅</div>
                        <h6 className="text-muted">No bookings yet</h6>
                        <p className="text-muted small">Start by finding a photographer</p>
                        <Link to="/search" className="btn btn-primary">
                          Find Photographers
                        </Link>
                      </div>
                    )}

                    {/* Notification Preferences */}
                    <div className="mt-5 pt-4 border-top">
                      <h5 className="fw-bold mb-3">🔔 Notification Preferences</h5>
                      <div className="row g-3">
                        <div className="col-12">
                          <div className="card bg-light border-0">
                            <div className="card-body">
                              <h6 className="fw-semibold mb-3">Email Notifications</h6>

                              <div className="form-check form-switch mb-2">
                                <input
                                  className="form-check-input"
                                  type="checkbox"
                                  id="emailBookingUpdates"
                                  checked={notifications.emailBookingUpdates}
                                  onChange={() => handleNotificationToggle("emailBookingUpdates")}
                                />
                                <label className="form-check-label" htmlFor="emailBookingUpdates">
                                  Booking updates and confirmations
                                </label>
                              </div>

                              <div className="form-check form-switch mb-2">
                                <input
                                  className="form-check-input"
                                  type="checkbox"
                                  id="emailPromotions"
                                  checked={notifications.emailPromotions}
                                  onChange={() => handleNotificationToggle("emailPromotions")}
                                />
                                <label className="form-check-label" htmlFor="emailPromotions">
                                  Promotions and offers
                                </label>
                              </div>

                              <div className="form-check form-switch">
                                <input
                                  className="form-check-input"
                                  type="checkbox"
                                  id="emailNewPhotographers"
                                  checked={notifications.emailNewPhotographers}
                                  onChange={() => handleNotificationToggle("emailNewPhotographers")}
                                />
                                <label className="form-check-label" htmlFor="emailNewPhotographers">
                                  New photographers in your area
                                </label>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Favorites Tab */}
                {activeTab === "favorites" && (
                  <div className="fade-in">
                    <h5 className="fw-bold mb-4">Favorite Photographers</h5>

                    {favorites.length > 0 ? (
                      <div className="row g-3">
                        {favorites.map((photographer) => (
                          <div className="col-md-6" key={photographer.id}>
                            <div className="card h-100 hover-lift">
                              <div className="card-body">
                                <div className="d-flex align-items-start">
                                  <div
                                    className="rounded-circle bg-primary d-flex align-items-center justify-content-center me-3"
                                    style={{ width: "50px", height: "50px", fontSize: "20px", color: "white" }}
                                  >
                                    {photographer.name.charAt(0)}
                                  </div>
                                  <div className="flex-grow-1">
                                    <h6 className="fw-bold mb-1">{photographer.name}</h6>
                                    <p className="text-muted small mb-1">
                                      📍 {photographer.location} • {photographer.specialty}
                                    </p>
                                    <div className="d-flex align-items-center gap-2">
                                      <span className="text-warning">★ {photographer.rating}</span>
                                      <span className="text-muted">|</span>
                                      <span className="text-success fw-semibold">
                                        PKR {photographer.hourlyRate.toLocaleString()}/hr
                                      </span>
                                    </div>
                                  </div>
                                  <button
                                    className="btn btn-sm btn-outline-danger"
                                    onClick={() => handleRemoveFavorite(photographer.id)}
                                    title="Remove from favorites"
                                  >
                                    🗑️
                                  </button>
                                </div>
                                <div className="mt-3 d-flex gap-2">
                                  <Link
                                    to={`/photographer/${photographer.id}`}
                                    className="btn btn-sm btn-outline-primary flex-fill"
                                  >
                                    View Profile
                                  </Link>
                                  <Link
                                    to={`/booking/request/${photographer.id}`}
                                    className="btn btn-sm btn-primary flex-fill"
                                  >
                                    Book Now
                                  </Link>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-5">
                        <div style={{ fontSize: "48px", marginBottom: "16px" }}>❤️</div>
                        <h6 className="text-muted">No favorites yet</h6>
                        <p className="text-muted small">
                          Save photographers you like for easy access later
                        </p>
                        <Link to="/search" className="btn btn-primary">
                          Browse Photographers
                        </Link>
                      </div>
                    )}
                  </div>
                )}

                {/* Account Settings Tab */}
                {activeTab === "settings" && (
                  <div className="fade-in">
                    <h5 className="fw-bold mb-4">Account Settings</h5>

                    {/* Change Password Section */}
                    <div className="card mb-4">
                      <div className="card-body">
                        <h6 className="fw-bold mb-3">🔒 Change Password</h6>
                        <p className="text-muted small mb-3">
                          Update your password to keep your account secure
                        </p>
                        <button
                          className="btn btn-primary"
                          onClick={() => setShowPasswordModal(true)}
                        >
                          Change Password
                        </button>
                      </div>
                    </div>

                    {/* Forgot Password Section */}
                    <div className="card mb-4">
                      <div className="card-body">
                        <h6 className="fw-bold mb-3">🔑 Forgot Password?</h6>
                        <p className="text-muted small mb-3">
                          If you've forgotten your password, we'll send you a reset link via email
                        </p>
                        <button
                          className="btn btn-outline-primary"
                          onClick={() => {
                            alert("Password reset link sent to " + profile.email);
                          }}
                        >
                          Send Password Reset Link
                        </button>
                      </div>
                    </div>

                    {/* Delete Account Section */}
                    <div className="card border-danger">
                      <div className="card-body">
                        <h6 className="fw-bold text-danger mb-3">⚠️ Delete Account</h6>
                        <p className="text-muted small mb-3">
                          Once you delete your account, there is no going back. Please be certain.
                        </p>
                        <button
                          className="btn btn-danger"
                          onClick={() => setShowDeleteModal(true)}
                        >
                          Delete My Account
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">Change Password</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowPasswordModal(false)}
                />
              </div>
              <div className="modal-body">
                {passwordError && (
                  <div className="alert alert-danger">{passwordError}</div>
                )}
                <div className="mb-3">
                  <label className="form-label">Current Password</label>
                  <input
                    type="password"
                    className="form-control"
                    value={passwordData.currentPassword}
                    onChange={(e) =>
                      setPasswordData({ ...passwordData, currentPassword: e.target.value })
                    }
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">New Password</label>
                  <input
                    type="password"
                    className="form-control"
                    value={passwordData.newPassword}
                    onChange={(e) =>
                      setPasswordData({ ...passwordData, newPassword: e.target.value })
                    }
                  />
                  <small className="text-muted">Minimum 8 characters</small>
                </div>
                <div className="mb-3">
                  <label className="form-label">Confirm New Password</label>
                  <input
                    type="password"
                    className="form-control"
                    value={passwordData.confirmPassword}
                    onChange={(e) =>
                      setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowPasswordModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handlePasswordChange}
                >
                  Update Password
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header border-danger">
                <h5 className="modal-title fw-bold text-danger">⚠️ Delete Account</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowDeleteModal(false)}
                />
              </div>
              <div className="modal-body">
                <p>Are you sure you want to delete your account? This action cannot be undone.</p>
                <ul className="text-muted small">
                  <li>All your booking history will be deleted</li>
                  <li>Your favorites and reviews will be removed</li>
                  <li>Payment methods will be deleted</li>
                  <li>You won't be able to recover this account</li>
                </ul>
                <div className="form-check mt-3">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="confirmDelete"
                  />
                  <label className="form-check-label" htmlFor="confirmDelete">
                    I understand and want to delete my account
                  </label>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowDeleteModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => {
                    const checkbox = document.getElementById('confirmDelete');
                    if (!checkbox.checked) {
                      alert('Please confirm that you understand this action');
                      return;
                    }

                    // API call to delete account
                    fetch('http://localhost:8000/api/profile/me/delete-account', {
                      method: 'DELETE',
                      headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'application/json'
                      }
                    })
                      .then(response => response.json())
                      .then(data => {
                        if (data.success) {
                          alert('Account deleted successfully');
                          localStorage.removeItem('token');
                          window.location.href = '/';
                        } else {
                          alert(data.detail || 'Failed to delete account');
                        }
                      })
                      .catch(error => {
                        console.error('Error:', error);
                        alert('Error deleting account. Please try again.');
                      });

                    setShowDeleteModal(false);
                  }}
                >
                  Delete My Account
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ClientProfile
