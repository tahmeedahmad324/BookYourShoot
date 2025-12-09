"use client"

import { useState } from "react"
import { useAuth } from "../../context/AuthContext"

const AdminSettings = () => {
  const { user } = useAuth()

  // Profile state
  const [profile, setProfile] = useState({
    fullName: user?.name || "Admin User",
    email: user?.email || "admin@bookyourshoot.com",
    phone: "+92-300-0000000",
    role: "Super Admin",
    memberSince: "January 2024",
  })

  // Edit states
  const [isEditing, setIsEditing] = useState(false)
  const [editedProfile, setEditedProfile] = useState({ ...profile })
  const [showPasswordModal, setShowPasswordModal] = useState(false)

  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [passwordError, setPasswordError] = useState("")

  // Notification settings
  const [notifications, setNotifications] = useState({
    newRegistrations: true,
    pendingVerifications: true,
    complaints: true,
    systemAlerts: true,
  })

  // Handlers
  const handleSaveProfile = () => {
    setProfile({ ...editedProfile })
    setIsEditing(false)
  }

  const handleCancelEdit = () => {
    setEditedProfile({ ...profile })
    setIsEditing(false)
  }

  const handlePasswordChange = () => {
    setPasswordError("")
    if (passwordData.newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters")
      return
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError("Passwords do not match")
      return
    }
    setShowPasswordModal(false)
    setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" })
    alert("Password changed successfully!")
  }

  const handleNotificationToggle = (key) => {
    setNotifications({ ...notifications, [key]: !notifications[key] })
  }

  return (
    <div className="admin-settings py-4">
      <div className="container">
        {/* Header */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="gradient-header rounded-3 p-4">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h2 className="fw-bold mb-1">My Profile</h2>
                  <p className="mb-0 opacity-75">Manage your admin account</p>
                </div>
                <div>
                  <span className="badge bg-danger me-2">🔐 Super Admin</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="row g-4">
          {/* Sidebar */}
          <div className="col-lg-3">
            <div className="card border-0 shadow-sm">
              <div className="card-body p-4">
                {/* Admin Avatar */}
                <div className="text-center mb-3">
                  <div
                    className="rounded-circle bg-danger d-flex align-items-center justify-content-center mx-auto mb-3"
                    style={{ width: "80px", height: "80px", fontSize: "32px", color: "white" }}
                  >
                    {profile.fullName.charAt(0).toUpperCase()}
                  </div>
                  <h6 className="fw-bold mb-1">{profile.fullName}</h6>
                  <span className="badge bg-danger">{profile.role}</span>
                  <p className="text-muted small mt-2 mb-0">Member since {profile.memberSince}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="col-lg-9">
            <div className="card border-0 shadow-sm">
              <div className="card-body p-4">
                {/* Profile Info */}
                <div className="fade-in">
                  <div className="d-flex justify-content-between align-items-center mb-4">
                    <h5 className="fw-bold mb-0">Personal Information</h5>
                    {!isEditing ? (
                      <button className="btn btn-outline-primary btn-sm" onClick={() => setIsEditing(true)}>
                        ✏️ Edit
                      </button>
                    ) : (
                      <div className="btn-group btn-group-sm">
                        <button className="btn btn-primary" onClick={handleSaveProfile}>Save</button>
                        <button className="btn btn-outline-secondary" onClick={handleCancelEdit}>Cancel</button>
                      </div>
                    )}
                  </div>

                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Full Name</label>
                      {isEditing ? (
                        <input
                          type="text"
                          className="form-control"
                          value={editedProfile.fullName}
                          onChange={(e) => setEditedProfile({ ...editedProfile, fullName: e.target.value })}
                        />
                      ) : (
                        <p className="form-control-plaintext">{profile.fullName}</p>
                      )}
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Email</label>
                      {isEditing ? (
                        <input
                          type="email"
                          className="form-control"
                          value={editedProfile.email}
                          onChange={(e) => setEditedProfile({ ...editedProfile, email: e.target.value })}
                        />
                      ) : (
                        <p className="form-control-plaintext">{profile.email}</p>
                      )}
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Phone</label>
                      {isEditing ? (
                        <input
                          type="tel"
                          className="form-control"
                          value={editedProfile.phone}
                          onChange={(e) => setEditedProfile({ ...editedProfile, phone: e.target.value })}
                        />
                      ) : (
                        <p className="form-control-plaintext">{profile.phone}</p>
                      )}
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Role</label>
                      <p className="form-control-plaintext">
                        <span className="badge bg-danger">{profile.role}</span>
                      </p>
                    </div>
                  </div>

                  {/* Email Notifications */}
                  <div className="mt-4 pt-4 border-top">
                    <h6 className="fw-bold mb-3">🔔 Email Notifications</h6>
                    <div className="card bg-light border-0">
                      <div className="card-body">
                        <div className="row g-3">
                          <div className="col-md-6">
                            <div className="form-check form-switch">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                id="newRegistrations"
                                checked={notifications.newRegistrations}
                                onChange={() => handleNotificationToggle("newRegistrations")}
                              />
                              <label className="form-check-label" htmlFor="newRegistrations">
                                New photographer registrations
                              </label>
                            </div>
                          </div>
                          <div className="col-md-6">
                            <div className="form-check form-switch">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                id="pendingVerifications"
                                checked={notifications.pendingVerifications}
                                onChange={() => handleNotificationToggle("pendingVerifications")}
                              />
                              <label className="form-check-label" htmlFor="pendingVerifications">
                                Pending verifications
                              </label>
                            </div>
                          </div>
                          <div className="col-md-6">
                            <div className="form-check form-switch">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                id="complaints"
                                checked={notifications.complaints}
                                onChange={() => handleNotificationToggle("complaints")}
                              />
                              <label className="form-check-label" htmlFor="complaints">
                                New complaints
                              </label>
                            </div>
                          </div>
                          <div className="col-md-6">
                            <div className="form-check form-switch">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                id="systemAlerts"
                                checked={notifications.systemAlerts}
                                onChange={() => handleNotificationToggle("systemAlerts")}
                              />
                              <label className="form-check-label" htmlFor="systemAlerts">
                                System alerts
                              </label>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Security */}
                  <div className="mt-4 pt-4 border-top">
                    <h6 className="fw-bold mb-3">🔐 Security</h6>
                    <button
                      className="btn btn-outline-primary"
                      onClick={() => setShowPasswordModal(true)}
                    >
                      🔑 Change Password
                    </button>
                  </div>
                </div>
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
                <button type="button" className="btn-close" onClick={() => setShowPasswordModal(false)} />
              </div>
              <div className="modal-body">
                {passwordError && <div className="alert alert-danger">{passwordError}</div>}
                <div className="mb-3">
                  <label className="form-label">Current Password</label>
                  <input
                    type="password"
                    className="form-control"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">New Password</label>
                  <input
                    type="password"
                    className="form-control"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  />
                  <small className="text-muted">Minimum 8 characters</small>
                </div>
                <div className="mb-3">
                  <label className="form-label">Confirm New Password</label>
                  <input
                    type="password"
                    className="form-control"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowPasswordModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handlePasswordChange}>Change Password</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .fade-in {
          animation: fadeIn 0.3s ease-in-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

export default AdminSettings
