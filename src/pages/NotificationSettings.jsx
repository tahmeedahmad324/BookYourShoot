import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import {
  ArrowLeft,
  Bell,
  Mail,
  Smartphone,
  CreditCard,
  Calendar,
  AlertTriangle,
  MessageSquare,
  Settings,
  Save,
  Check
} from "lucide-react"

const NotificationSettings = () => {
  const { user } = useAuth()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  
  // Notification preferences state
  const [preferences, setPreferences] = useState({
    // Channels
    emailEnabled: true,
    pushEnabled: true,
    smsEnabled: false,
    
    // Payment notifications
    paymentReceived: { email: true, push: true, sms: false },
    paymentReleased: { email: true, push: true, sms: false },
    paymentRefunded: { email: true, push: true, sms: false },
    
    // Booking notifications
    bookingConfirmed: { email: true, push: true, sms: true },
    bookingReminder24h: { email: true, push: true, sms: false },
    bookingReminder2h: { email: false, push: true, sms: false },
    bookingCancelled: { email: true, push: true, sms: true },
    
    // Disputes
    disputeOpened: { email: true, push: true, sms: false },
    disputeResolved: { email: true, push: true, sms: false },
    
    // Marketing
    promotions: { email: false, push: false, sms: false },
    newsletter: { email: true, push: false, sms: false }
  })

  // Load saved preferences (mock)
  useEffect(() => {
    const savedPrefs = localStorage.getItem(`notificationPrefs_${user?.id}`)
    if (savedPrefs) {
      setPreferences(JSON.parse(savedPrefs))
    }
  }, [user])

  const handleToggle = (category, channel = null) => {
    setPreferences(prev => {
      if (channel) {
        // Toggle specific channel for a category
        return {
          ...prev,
          [category]: {
            ...prev[category],
            [channel]: !prev[category][channel]
          }
        }
      } else {
        // Toggle master channel switch
        return {
          ...prev,
          [category]: !prev[category]
        }
      }
    })
    setSaved(false)
  }

  const handleSave = async () => {
    setSaving(true)
    // Mock API call
    await new Promise(resolve => setTimeout(resolve, 500))
    localStorage.setItem(`notificationPrefs_${user?.id}`, JSON.stringify(preferences))
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const NotificationRow = ({ icon: Icon, title, description, category, showSms = false }) => (
    <div className="d-flex align-items-center justify-content-between py-3 border-bottom">
      <div className="d-flex align-items-center gap-3">
        <div className="bg-light p-2 rounded">
          <Icon size={20} className="text-primary" />
        </div>
        <div>
          <h6 className="mb-0">{title}</h6>
          <small className="text-muted">{description}</small>
        </div>
      </div>
      <div className="d-flex gap-3">
        <div className="form-check form-switch d-flex flex-column align-items-center">
          <input
            className="form-check-input"
            type="checkbox"
            checked={preferences[category]?.email || false}
            onChange={() => handleToggle(category, 'email')}
            disabled={!preferences.emailEnabled}
          />
          <small className="text-muted mt-1">Email</small>
        </div>
        <div className="form-check form-switch d-flex flex-column align-items-center">
          <input
            className="form-check-input"
            type="checkbox"
            checked={preferences[category]?.push || false}
            onChange={() => handleToggle(category, 'push')}
            disabled={!preferences.pushEnabled}
          />
          <small className="text-muted mt-1">Push</small>
        </div>
        {showSms && (
          <div className="form-check form-switch d-flex flex-column align-items-center">
            <input
              className="form-check-input"
              type="checkbox"
              checked={preferences[category]?.sms || false}
              onChange={() => handleToggle(category, 'sms')}
              disabled={!preferences.smsEnabled}
            />
            <small className="text-muted mt-1">SMS</small>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="notification-settings py-4">
      <div className="container" style={{ maxWidth: "800px" }}>
        {/* Header */}
        <div className="d-flex align-items-center justify-content-between mb-4">
          <div className="d-flex align-items-center gap-3">
            <Link to={`/${user?.role}/profile`} className="btn btn-outline-secondary">
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h2 className="fw-bold mb-0">Notification Settings</h2>
              <p className="text-muted mb-0">Manage how you receive notifications</p>
            </div>
          </div>
          <button 
            className={`btn ${saved ? 'btn-success' : 'btn-primary'}`}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" />
                Saving...
              </>
            ) : saved ? (
              <>
                <Check size={18} className="me-1" /> Saved
              </>
            ) : (
              <>
                <Save size={18} className="me-1" /> Save Changes
              </>
            )}
          </button>
        </div>

        {/* Notification Channels */}
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-header bg-white py-3">
            <h5 className="mb-0 fw-bold d-flex align-items-center gap-2">
              <Settings size={20} /> Notification Channels
            </h5>
          </div>
          <div className="card-body">
            <p className="text-muted mb-4">
              Enable or disable notification channels. Disabling a channel will turn off all notifications for that channel.
            </p>
            
            <div className="row g-4">
              <div className="col-md-4">
                <div className={`card h-100 ${preferences.emailEnabled ? 'border-primary' : ''}`}>
                  <div className="card-body text-center">
                    <Mail size={32} className={preferences.emailEnabled ? 'text-primary' : 'text-muted'} />
                    <h6 className="mt-2 mb-1">Email</h6>
                    <small className="text-muted d-block mb-3">
                      {user?.email || "user@example.com"}
                    </small>
                    <div className="form-check form-switch d-flex justify-content-center">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        checked={preferences.emailEnabled}
                        onChange={() => handleToggle('emailEnabled')}
                        style={{ transform: "scale(1.3)" }}
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="col-md-4">
                <div className={`card h-100 ${preferences.pushEnabled ? 'border-primary' : ''}`}>
                  <div className="card-body text-center">
                    <Bell size={32} className={preferences.pushEnabled ? 'text-primary' : 'text-muted'} />
                    <h6 className="mt-2 mb-1">Push Notifications</h6>
                    <small className="text-muted d-block mb-3">
                      In-app & browser alerts
                    </small>
                    <div className="form-check form-switch d-flex justify-content-center">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        checked={preferences.pushEnabled}
                        onChange={() => handleToggle('pushEnabled')}
                        style={{ transform: "scale(1.3)" }}
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="col-md-4">
                <div className={`card h-100 ${preferences.smsEnabled ? 'border-primary' : ''}`}>
                  <div className="card-body text-center">
                    <Smartphone size={32} className={preferences.smsEnabled ? 'text-primary' : 'text-muted'} />
                    <h6 className="mt-2 mb-1">SMS</h6>
                    <small className="text-muted d-block mb-3">
                      Text messages (charges may apply)
                    </small>
                    <div className="form-check form-switch d-flex justify-content-center">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        checked={preferences.smsEnabled}
                        onChange={() => handleToggle('smsEnabled')}
                        style={{ transform: "scale(1.3)" }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Notifications */}
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-header bg-white py-3">
            <h5 className="mb-0 fw-bold d-flex align-items-center gap-2">
              <CreditCard size={20} /> Payment Notifications
            </h5>
          </div>
          <div className="card-body">
            <NotificationRow
              icon={CreditCard}
              title="Payment Received"
              description="When a payment is successfully processed"
              category="paymentReceived"
            />
            <NotificationRow
              icon={CreditCard}
              title="Payment Released"
              description="When payment is released from escrow"
              category="paymentReleased"
            />
            <NotificationRow
              icon={CreditCard}
              title="Refunds"
              description="When a refund is processed"
              category="paymentRefunded"
            />
          </div>
        </div>

        {/* Booking Notifications */}
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-header bg-white py-3">
            <h5 className="mb-0 fw-bold d-flex align-items-center gap-2">
              <Calendar size={20} /> Booking Notifications
            </h5>
          </div>
          <div className="card-body">
            <NotificationRow
              icon={Calendar}
              title="Booking Confirmed"
              description="When a booking is confirmed"
              category="bookingConfirmed"
              showSms
            />
            <NotificationRow
              icon={Bell}
              title="24-Hour Reminder"
              description="Reminder one day before your session"
              category="bookingReminder24h"
            />
            <NotificationRow
              icon={Bell}
              title="2-Hour Reminder"
              description="Final reminder before your session"
              category="bookingReminder2h"
            />
            <NotificationRow
              icon={Calendar}
              title="Booking Cancelled"
              description="When a booking is cancelled"
              category="bookingCancelled"
              showSms
            />
          </div>
        </div>

        {/* Dispute Notifications */}
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-header bg-white py-3">
            <h5 className="mb-0 fw-bold d-flex align-items-center gap-2">
              <AlertTriangle size={20} /> Dispute Notifications
            </h5>
          </div>
          <div className="card-body">
            <NotificationRow
              icon={AlertTriangle}
              title="Dispute Opened"
              description="When a dispute is filed"
              category="disputeOpened"
            />
            <NotificationRow
              icon={AlertTriangle}
              title="Dispute Resolved"
              description="When a dispute is resolved by admin"
              category="disputeResolved"
            />
          </div>
        </div>

        {/* Marketing */}
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-white py-3">
            <h5 className="mb-0 fw-bold d-flex align-items-center gap-2">
              <MessageSquare size={20} /> Marketing & Updates
            </h5>
          </div>
          <div className="card-body">
            <NotificationRow
              icon={MessageSquare}
              title="Promotions & Offers"
              description="Special deals and discounts"
              category="promotions"
            />
            <NotificationRow
              icon={Mail}
              title="Newsletter"
              description="Weekly photography tips and platform updates"
              category="newsletter"
            />
          </div>
        </div>

        {/* Save Button Mobile */}
        <div className="d-md-none mt-4">
          <button 
            className={`btn ${saved ? 'btn-success' : 'btn-primary'} w-100`}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving..." : saved ? "✓ Saved" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  )
}

export default NotificationSettings
