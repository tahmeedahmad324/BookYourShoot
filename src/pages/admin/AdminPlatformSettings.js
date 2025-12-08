"use client"

import { useState } from "react"
import { Link } from "react-router-dom"

const AdminPlatformSettings = () => {
  // Platform settings
  const [platformSettings, setPlatformSettings] = useState({
    platformFee: 10,
    minBookingHours: 2,
    maxBookingDays: 30,
    autoApprovePhotographers: false,
    maintenanceMode: false,
    allowNewRegistrations: true,
    requireCNIC: true,
    enableChat: true,
    enableReviews: true,
  })

  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const handleSettingChange = (key, value) => {
    setPlatformSettings({ ...platformSettings, [key]: value })
    setSaveSuccess(false)
  }

  const handleSaveSettings = () => {
    setIsSaving(true)
    // Simulate API call
    setTimeout(() => {
      setIsSaving(false)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    }, 1000)
  }

  return (
    <div className="admin-platform-settings py-4">
      <div className="container">
        {/* Header */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="d-flex align-items-center mb-3">
              <Link to="/admin/dashboard" className="btn btn-outline-secondary btn-sm me-3">
                ← Back to Dashboard
              </Link>
            </div>
            <div className="gradient-header rounded-3 p-4">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h2 className="fw-bold mb-1">⚙️ Platform Settings</h2>
                  <p className="mb-0 opacity-75">Configure platform fees, limits, and operations</p>
                </div>
                <button 
                  className="btn btn-light"
                  onClick={handleSaveSettings}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" />
                      Saving...
                    </>
                  ) : (
                    <>💾 Save All Settings</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Success Alert */}
        {saveSuccess && (
          <div className="alert alert-success alert-dismissible fade show" role="alert">
            ✅ Settings saved successfully!
            <button type="button" className="btn-close" onClick={() => setSaveSuccess(false)} />
          </div>
        )}

        <div className="row g-4">
          {/* Fees & Limits */}
          <div className="col-md-6">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-header bg-white border-0 py-3">
                <h5 className="fw-bold mb-0">💰 Fees & Limits</h5>
              </div>
              <div className="card-body">
                <div className="mb-4">
                  <label className="form-label fw-semibold">Platform Fee (%)</label>
                  <div className="input-group">
                    <input
                      type="number"
                      className="form-control"
                      value={platformSettings.platformFee}
                      onChange={(e) => handleSettingChange("platformFee", parseInt(e.target.value))}
                      min="0"
                      max="50"
                    />
                    <span className="input-group-text">%</span>
                  </div>
                  <small className="text-muted">Commission charged on each booking</small>
                </div>

                <div className="mb-4">
                  <label className="form-label fw-semibold">Minimum Booking Hours</label>
                  <div className="input-group">
                    <input
                      type="number"
                      className="form-control"
                      value={platformSettings.minBookingHours}
                      onChange={(e) => handleSettingChange("minBookingHours", parseInt(e.target.value))}
                      min="1"
                      max="24"
                    />
                    <span className="input-group-text">hours</span>
                  </div>
                  <small className="text-muted">Minimum duration for a booking</small>
                </div>

                <div className="mb-0">
                  <label className="form-label fw-semibold">Max Advance Booking</label>
                  <div className="input-group">
                    <input
                      type="number"
                      className="form-control"
                      value={platformSettings.maxBookingDays}
                      onChange={(e) => handleSettingChange("maxBookingDays", parseInt(e.target.value))}
                      min="1"
                      max="365"
                    />
                    <span className="input-group-text">days</span>
                  </div>
                  <small className="text-muted">How far in advance can users book</small>
                </div>
              </div>
            </div>
          </div>

          {/* Registration Settings */}
          <div className="col-md-6">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-header bg-white border-0 py-3">
                <h5 className="fw-bold mb-0">📝 Registration Settings</h5>
              </div>
              <div className="card-body">
                <div className="mb-4">
                  <div className="form-check form-switch">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="allowRegistrations"
                      checked={platformSettings.allowNewRegistrations}
                      onChange={(e) => handleSettingChange("allowNewRegistrations", e.target.checked)}
                    />
                    <label className="form-check-label" htmlFor="allowRegistrations">
                      <strong>Allow New Registrations</strong>
                    </label>
                  </div>
                  <small className="text-muted d-block mt-1">Enable/disable new user sign-ups</small>
                </div>

                <div className="mb-4">
                  <div className="form-check form-switch">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="autoApprove"
                      checked={platformSettings.autoApprovePhotographers}
                      onChange={(e) => handleSettingChange("autoApprovePhotographers", e.target.checked)}
                    />
                    <label className="form-check-label" htmlFor="autoApprove">
                      <strong>Auto-approve Photographers</strong>
                    </label>
                  </div>
                  <small className="text-muted d-block mt-1">Skip manual verification for new photographers</small>
                </div>

                <div className="mb-0">
                  <div className="form-check form-switch">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="requireCNIC"
                      checked={platformSettings.requireCNIC}
                      onChange={(e) => handleSettingChange("requireCNIC", e.target.checked)}
                    />
                    <label className="form-check-label" htmlFor="requireCNIC">
                      <strong>Require CNIC Verification</strong>
                    </label>
                  </div>
                  <small className="text-muted d-block mt-1">Photographers must verify identity with CNIC</small>
                </div>
              </div>
            </div>
          </div>

          {/* Feature Toggles */}
          <div className="col-md-6">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-header bg-white border-0 py-3">
                <h5 className="fw-bold mb-0">🎛️ Feature Toggles</h5>
              </div>
              <div className="card-body">
                <div className="mb-4">
                  <div className="form-check form-switch">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="enableChat"
                      checked={platformSettings.enableChat}
                      onChange={(e) => handleSettingChange("enableChat", e.target.checked)}
                    />
                    <label className="form-check-label" htmlFor="enableChat">
                      <strong>Enable Chat</strong>
                    </label>
                  </div>
                  <small className="text-muted d-block mt-1">Allow messaging between clients and photographers</small>
                </div>

                <div className="mb-0">
                  <div className="form-check form-switch">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="enableReviews"
                      checked={platformSettings.enableReviews}
                      onChange={(e) => handleSettingChange("enableReviews", e.target.checked)}
                    />
                    <label className="form-check-label" htmlFor="enableReviews">
                      <strong>Enable Reviews</strong>
                    </label>
                  </div>
                  <small className="text-muted d-block mt-1">Allow clients to leave reviews for photographers</small>
                </div>
              </div>
            </div>
          </div>

          {/* System Operations */}
          <div className="col-md-6">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-header bg-white border-0 py-3">
                <h5 className="fw-bold mb-0">🔧 System Operations</h5>
              </div>
              <div className="card-body">
                <div className="mb-4">
                  <div className="form-check form-switch">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="maintenance"
                      checked={platformSettings.maintenanceMode}
                      onChange={(e) => handleSettingChange("maintenanceMode", e.target.checked)}
                    />
                    <label className="form-check-label" htmlFor="maintenance">
                      <strong className={platformSettings.maintenanceMode ? "text-danger" : ""}>
                        Maintenance Mode
                      </strong>
                    </label>
                  </div>
                  <small className="text-muted d-block mt-1">Temporarily disable public access to the platform</small>
                  {platformSettings.maintenanceMode && (
                    <div className="alert alert-warning mt-2 mb-0 py-2">
                      ⚠️ Platform is currently in maintenance mode!
                    </div>
                  )}
                </div>

                <div className="border-top pt-3">
                  <h6 className="fw-bold mb-2">Danger Zone</h6>
                  <button className="btn btn-outline-danger btn-sm me-2">
                    🔄 Clear Cache
                  </button>
                  <button className="btn btn-outline-danger btn-sm">
                    📧 Test Email System
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Save Button */}
        <div className="row mt-4">
          <div className="col-12 text-center">
            <button 
              className="btn btn-primary btn-lg px-5"
              onClick={handleSaveSettings}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" />
                  Saving...
                </>
              ) : (
                <>💾 Save All Settings</>
              )}
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .gradient-header {
          background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
          color: white;
        }
        .form-switch .form-check-input {
          width: 3em;
          height: 1.5em;
        }
        .form-switch .form-check-input:checked {
          background-color: #dc3545;
          border-color: #dc3545;
        }
      `}</style>
    </div>
  )
}

export default AdminPlatformSettings
