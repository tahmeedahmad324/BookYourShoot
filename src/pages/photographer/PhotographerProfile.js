"use client"

import { useState, useRef, useEffect } from "react"
import { useAuth } from "../../context/AuthContext"
import { useLocation } from "react-router-dom"
import api from "../../services/api"
import { supabase } from "../../supabaseClient"
import { travelAPI } from "../../api/api"

const PhotographerProfile = () => {
  const { user } = useAuth()
  const location = useLocation()
  const fileInputRef = useRef(null)
  const portfolioFileRef = useRef(null)

  // Portfolio upload state
  const [showAddPortfolio, setShowAddPortfolio] = useState(false)
  const [newPortfolioItem, setNewPortfolioItem] = useState({
    title: "",
    category: "Wedding",
    image: null,
  })

  // Profile state - initialize from AuthContext user data
  const [profile, setProfile] = useState({
    fullName: user?.full_name || user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    city: user?.city || "",
    bio: "",
    profileImage: user?.profile_picture_url || null,
    memberSince: user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : "",
    experience: "",
    languages: "",
  })

  // Edit states
  const [isEditing, setIsEditing] = useState(false)
  const [editedProfile, setEditedProfile] = useState({ ...profile })
  const [activeTab, setActiveTab] = useState("profile")

  // Read tab from URL query parameter
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const tab = params.get('tab')
    if (tab && ['profile', 'services', 'portfolio', 'reviews', 'availability', 'travel', 'settings'].includes(tab)) {
      setActiveTab(tab)
    }
  }, [location.search])

  // Fetch and sync real profile data from API
  useEffect(() => {
    const fetchProfile = async () => {
      // Check if user is logged in (works for both mock and real accounts)
      if (!user) {
        console.log('[PhotographerProfile] No user found, skipping API fetch')
        return
      }

      try {
        const response = await api.get('/api/profile/me')
        const userData = response.data?.data?.user
        const photographerData = response.data?.data?.photographer_profile

        if (userData) {
          const updatedProfile = {
            fullName: userData.full_name || "",
            email: userData.email || "",
            phone: userData.phone || "",
            city: userData.city || "",
            bio: photographerData?.bio || "",
            profileImage: userData.profile_picture_url || photographerData?.profile_image_path || null,
            memberSince: userData.created_at ? new Date(userData.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : "",
            experience: photographerData?.experience_years ? `${photographerData.experience_years}+ years` : "",
            languages: "",
          }
          setProfile(updatedProfile)
          setEditedProfile(updatedProfile)
        }
      } catch (error) {
        console.error('[PhotographerProfile] Failed to fetch profile:', error)
        // Silently fail - profile will use AuthContext data as fallback
      }
    }

    if (user) {
      fetchProfile()
    }
  }, [user])

  // Fetch travel cities (no auth required)
  useEffect(() => {
    const fetchCities = async () => {
      try {
        const citiesResponse = await travelAPI.getCities()
        console.log('[PhotographerProfile] Cities loaded:', citiesResponse.data?.length || 0)
        setTravelCities(citiesResponse.data || [])
      } catch (error) {
        console.error('[PhotographerProfile] Failed to fetch cities:', error)
      }
    }
    fetchCities()
  }, [])

  // Fetch travel settings (requires auth)
  useEffect(() => {
    const fetchTravelSettings = async () => {
      // Check if user is logged in (works for both mock and real accounts)
      if (!user) {
        console.log('[PhotographerProfile] No user found, skipping travel settings fetch')
        return
      }

      setTravelLoading(true)
      setTravelError("")
      try {
        // Fetch current travel settings
        const settingsResponse = await travelAPI.getMySettings()
        if (settingsResponse.data) {
          setTravelSettings(settingsResponse.data)
        }
      } catch (error) {
        console.error('[PhotographerProfile] Failed to fetch travel settings:', error)
        setTravelError(error.message || "Failed to load travel settings")
      } finally {
        setTravelLoading(false)
      }
    }

    if (user) {
      fetchTravelSettings()
    }
  }, [user])

  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [passwordError, setPasswordError] = useState("")

  // Services state
  const [services, setServices] = useState([
    { id: 1, name: "Wedding Photography", price: 50000, duration: "Full Day", description: "Complete wedding coverage including ceremony and reception" },
    { id: 2, name: "Portrait Photography", price: 8000, duration: "2 hours", description: "Professional portrait session with edited photos" },
    { id: 3, name: "Event Photography", price: 25000, duration: "4 hours", description: "Corporate events, parties, and gatherings" },
  ])
  const [editingService, setEditingService] = useState(null)
  const [newService, setNewService] = useState({ name: "", price: "", duration: "", description: "" })
  const [showAddService, setShowAddService] = useState(false)

  // Portfolio state
  const [portfolio, setPortfolio] = useState([
    { id: 1, title: "Summer Wedding", category: "Wedding", image: "/images/portfolio1.jpg" },
    { id: 2, title: "Corporate Event", category: "Event", image: "/images/portfolio2.jpg" },
    { id: 3, title: "Family Portrait", category: "Portrait", image: "/images/portfolio3.jpg" },
    { id: 4, title: "Engagement Shoot", category: "Wedding", image: "/images/portfolio4.jpg" },
  ])

  // Notification preferences
  const [notifications, setNotifications] = useState({
    emailBookingRequests: true,
    emailBookingUpdates: true,
    emailPromotions: false,
  })

  // Social media links
  const [socialLinks, setSocialLinks] = useState({
    instagram: "",
    facebook: "",
    website: "",
  })

  // Reviews data (read-only from clients)
  const [reviews] = useState([
    {
      id: 1,
      clientName: "Fatima Khan",
      rating: 5,
      date: "2024-11-20",
      comment: "Amazing photographer! Captured our wedding beautifully. Very professional and friendly.",
      service: "Wedding Photography",
    },
    {
      id: 2,
      clientName: "Ahmed Raza",
      rating: 5,
      date: "2024-11-15",
      comment: "Great portrait session. The edited photos exceeded our expectations!",
      service: "Portrait Photography",
    },
    {
      id: 3,
      clientName: "Sarah Ahmed",
      rating: 4,
      date: "2024-10-28",
      comment: "Professional work at our corporate event. Would recommend.",
      service: "Event Photography",
    },
  ])

  // Availability state
  const [availability, setAvailability] = useState({
    monday: { available: true, start: "09:00", end: "18:00" },
    tuesday: { available: true, start: "09:00", end: "18:00" },
    wednesday: { available: true, start: "09:00", end: "18:00" },
    thursday: { available: true, start: "09:00", end: "18:00" },
    friday: { available: true, start: "09:00", end: "18:00" },
    saturday: { available: true, start: "10:00", end: "20:00" },
    sunday: { available: false, start: "10:00", end: "16:00" },
  })

  // Blocked dates (dates photographer is not available)
  const [blockedDates, setBlockedDates] = useState([
    "2024-12-25",
    "2024-12-31",
    "2025-01-01",
  ])
  const [newBlockedDate, setNewBlockedDate] = useState("")

  // Report review state
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportingReview, setReportingReview] = useState(null)
  const [reportReason, setReportReason] = useState("")
  const [reportDescription, setReportDescription] = useState("")

  // Travel preferences state
  const [travelCities, setTravelCities] = useState([])
  const [travelSettings, setTravelSettings] = useState({
    is_willing_to_travel: true,
    base_city: user?.city || "",
    per_km_rate: 0,
    accommodation_fee: 0,
    min_charge: 0,
    avoided_cities: [],
    notes: "",
  })
  const [travelLoading, setTravelLoading] = useState(false)
  const [travelSaving, setTravelSaving] = useState(false)
  const [travelError, setTravelError] = useState("")
  const [travelSaved, setTravelSaved] = useState(false)

  // Stats
  const stats = {
    totalBookings: 47,
    completedBookings: 42,
    responseTime: "1 hour",
    repeatClients: 12,
  }

  // Handlers
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
    // API call would go here
    setShowPasswordModal(false)
    setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" })
    alert("Password changed successfully!")
  }

  const handleDeleteAccount = () => {
    // API call would go here
    alert("Account deletion request submitted")
    setShowDeleteModal(false)
  }

  const handleNotificationToggle = (key) => {
    setNotifications({ ...notifications, [key]: !notifications[key] })
  }

  // Availability handlers
  const handleAvailabilityToggle = (day) => {
    setAvailability({
      ...availability,
      [day]: { ...availability[day], available: !availability[day].available }
    })
  }

  const handleAvailabilityTimeChange = (day, field, value) => {
    setAvailability({
      ...availability,
      [day]: { ...availability[day], [field]: value }
    })
  }

  const handleAddBlockedDate = () => {
    if (newBlockedDate && !blockedDates.includes(newBlockedDate)) {
      setBlockedDates([...blockedDates, newBlockedDate].sort())
      setNewBlockedDate("")
    }
  }

  const handleRemoveBlockedDate = (date) => {
    setBlockedDates(blockedDates.filter(d => d !== date))
  }

  // Report review handlers
  const handleOpenReportModal = (review) => {
    setReportingReview(review)
    setShowReportModal(true)
  }

  const handleSubmitReport = () => {
    if (reportReason && reportingReview) {
      // API call would go here to submit report to admin
      console.log("Report submitted:", {
        reviewId: reportingReview.id,
        reason: reportReason,
        description: reportDescription,
      })
      alert("Report submitted successfully. Our team will review it within 24-48 hours.")
      setShowReportModal(false)
      setReportingReview(null)
      setReportReason("")
      setReportDescription("")
    }
  }

  // Social links handler
  const handleSocialLinkChange = (platform, value) => {
    setSocialLinks({ ...socialLinks, [platform]: value })
  }

  // Service handlers
  const handleAddService = () => {
    if (newService.name && newService.price) {
      setServices([...services, { ...newService, id: Date.now(), price: parseInt(newService.price) }])
      setNewService({ name: "", price: "", duration: "", description: "" })
      setShowAddService(false)
    }
  }

  const handleDeleteService = (id) => {
    setServices(services.filter(s => s.id !== id))
  }

  const handleUpdateService = (id, updatedService) => {
    setServices(services.map(s => s.id === id ? { ...updatedService, price: parseInt(updatedService.price) } : s))
    setEditingService(null)
  }

  // Portfolio handlers
  const handleDeletePortfolioItem = (id) => {
    setPortfolio(portfolio.filter(p => p.id !== id))
  }

  const handlePortfolioImageSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setNewPortfolioItem({ ...newPortfolioItem, image: reader.result })
      }
      reader.readAsDataURL(file)
    }
  }

  const handleAddPortfolioItem = () => {
    if (newPortfolioItem.title && newPortfolioItem.image) {
      setPortfolio([
        ...portfolio,
        {
          id: Date.now(),
          title: newPortfolioItem.title,
          category: newPortfolioItem.category,
          image: newPortfolioItem.image,
        },
      ])
      setNewPortfolioItem({ title: "", category: "Wedding", image: null })
      setShowAddPortfolio(false)
    }
  }

  // Travel handlers
  const handleTravelChange = (field, value) => {
    setTravelSettings({ ...travelSettings, [field]: value })
    setTravelSaved(false)
  }

  const handleAvoidedCityToggle = (cityName) => {
    const avoided = travelSettings.avoided_cities || []
    const updated = avoided.includes(cityName)
      ? avoided.filter(c => c !== cityName)
      : [...avoided, cityName]
    setTravelSettings({ ...travelSettings, avoided_cities: updated })
    setTravelSaved(false)
  }

  const handleSaveTravelSettings = async () => {
    // Check if user is logged in (works for both mock and real accounts)
    if (!user) {
      setTravelError("Please log in to save travel settings")
      return
    }

    setTravelSaving(true)
    setTravelError("")
    setTravelSaved(false)
    try {
      await travelAPI.saveMySettings(travelSettings)
      setTravelSaved(true)
      setTimeout(() => setTravelSaved(false), 3000)
    } catch (error) {
      console.error('[PhotographerProfile] Failed to save travel settings:', error)
      const errorMsg = error.message || "Failed to save travel settings"
      setTravelError(errorMsg.includes('Authorization') ? 'Please log in to save settings' : errorMsg)
    } finally {
      setTravelSaving(false)
    }
  }

  return (
    <div className="photographer-profile py-4">
      <div className="container">
        {/* Header */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="gradient-header rounded-3 p-4">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h2 className="fw-bold mb-1">My Profile</h2>
                  <p className="mb-0 opacity-75">Manage your profile, portfolio, and services</p>
                </div>
                <div>
                  <span className="badge bg-success me-2">✓ Verified</span>
                  <span className="badge bg-light text-dark">📸 Photographer</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="row g-4">
          {/* Sidebar with Profile Card */}
          <div className="col-lg-4">
            <div className="card border-0 shadow-sm">
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
                </div>

                <h5 className="fw-bold mb-1">{profile.fullName}</h5>
                <p className="text-muted small mb-2">📍 {profile.city}</p>
                <p className="text-muted small mb-3">Member since {profile.memberSince}</p>

                {/* Quick Stats */}
                <div className="row g-2 mb-3">
                  <div className="col-4">
                    <div className="bg-light rounded p-2">
                      <div className="fw-bold text-primary">{portfolio.length}</div>
                      <small className="text-muted">Portfolio</small>
                    </div>
                  </div>
                  <div className="col-4">
                    <div className="bg-light rounded p-2">
                      <div className="fw-bold text-primary">{services.length}</div>
                      <small className="text-muted">Services</small>
                    </div>
                  </div>
                  <div className="col-4">
                    <div className="bg-light rounded p-2">
                      <div className="fw-bold text-primary">⭐ 4.8</div>
                      <small className="text-muted">Rating</small>
                    </div>
                  </div>
                </div>

                {/* Tab Navigation */}
                <ul className="nav nav-pills flex-column gap-1">
                  <li className="nav-item">
                    <button
                      className={`nav-link text-start w-100 ${activeTab === "profile" ? "active" : ""}`}
                      onClick={() => setActiveTab("profile")}
                    >
                      👤 Profile Info
                    </button>
                  </li>
                  <li className="nav-item">
                    <button
                      className={`nav-link text-start w-100 ${activeTab === "portfolio" ? "active" : ""}`}
                      onClick={() => setActiveTab("portfolio")}
                    >
                      🖼️ Portfolio
                    </button>
                  </li>
                  <li className="nav-item">
                    <button
                      className={`nav-link text-start w-100 ${activeTab === "services" ? "active" : ""}`}
                      onClick={() => setActiveTab("services")}
                    >
                      📋 Services & Pricing
                    </button>
                  </li>
                  <li className="nav-item">
                    <button
                      className={`nav-link text-start w-100 ${activeTab === "availability" ? "active" : ""}`}
                      onClick={() => setActiveTab("availability")}
                    >
                      📅 Availability
                    </button>
                  </li>
                  <li className="nav-item">
                    <button
                      className={`nav-link text-start w-100 ${activeTab === "travel" ? "active" : ""}`}
                      onClick={() => setActiveTab("travel")}
                    >
                      ✈️ Travel Preferences
                    </button>
                  </li>
                  <li className="nav-item">
                    <button
                      className={`nav-link text-start w-100 ${activeTab === "reviews" ? "active" : ""}`}
                      onClick={() => setActiveTab("reviews")}
                    >
                      ⭐ Reviews
                    </button>
                  </li>
                  <li className="nav-item">
                    <button
                      className={`nav-link text-start w-100 ${activeTab === "settings" ? "active" : ""}`}
                      onClick={() => setActiveTab("settings")}
                    >
                      ⚙️ Account Settings
                    </button>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="col-lg-8">
            <div className="card border-0 shadow-sm">
              <div className="card-body p-4">

                {/* Profile Info Tab */}
                {activeTab === "profile" && (
                  <div className="fade-in">
                    <div className="d-flex justify-content-between align-items-center mb-4">
                      <h5 className="fw-bold mb-0">Profile Information</h5>
                      {!isEditing ? (
                        <button className="btn btn-outline-primary btn-sm" onClick={() => setIsEditing(true)}>
                          ✏️ Edit Profile
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
                        <label className="form-label fw-semibold">Business/Full Name</label>
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
                        <label className="form-label fw-semibold">City</label>
                        {isEditing ? (
                          <select
                            className="form-select"
                            value={editedProfile.city}
                            onChange={(e) => setEditedProfile({ ...editedProfile, city: e.target.value })}
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

                      <div className="col-md-6">
                        <label className="form-label fw-semibold">Experience</label>
                        {isEditing ? (
                          <select
                            className="form-select"
                            value={editedProfile.experience}
                            onChange={(e) => setEditedProfile({ ...editedProfile, experience: e.target.value })}
                          >
                            <option value="Less than 1 year">Less than 1 year</option>
                            <option value="1-2 years">1-2 years</option>
                            <option value="3-5 years">3-5 years</option>
                            <option value="5+ years">5+ years</option>
                            <option value="10+ years">10+ years</option>
                          </select>
                        ) : (
                          <p className="form-control-plaintext">{profile.experience}</p>
                        )}
                      </div>

                      <div className="col-md-6">
                        <label className="form-label fw-semibold">Languages</label>
                        {isEditing ? (
                          <input
                            type="text"
                            className="form-control"
                            value={editedProfile.languages}
                            onChange={(e) => setEditedProfile({ ...editedProfile, languages: e.target.value })}
                            placeholder="e.g., English, Urdu"
                          />
                        ) : (
                          <p className="form-control-plaintext">{profile.languages}</p>
                        )}
                      </div>

                      <div className="col-12">
                        <label className="form-label fw-semibold">Bio / About</label>
                        {isEditing ? (
                          <textarea
                            className="form-control"
                            rows="3"
                            value={editedProfile.bio}
                            onChange={(e) => setEditedProfile({ ...editedProfile, bio: e.target.value })}
                            placeholder="Tell clients about yourself and your photography style..."
                          />
                        ) : (
                          <p className="form-control-plaintext">{profile.bio}</p>
                        )}
                      </div>

                      {isEditing && (
                        <div className="col-12">
                          <label className="form-label fw-semibold">Profile Photo</label>
                          <input
                            type="file"
                            className="form-control"
                            accept="image/*"
                            ref={fileInputRef}
                            onChange={handleImageUpload}
                          />
                          <small className="text-muted">Recommended: Square image, at least 200x200px</small>
                        </div>
                      )}
                    </div>

                    {/* Email Preferences */}
                    <div className="mt-4 pt-4 border-top">
                      <h6 className="fw-bold mb-3">🔔 Email Preferences</h6>
                      <div className="card bg-light border-0">
                        <div className="card-body">
                          <div className="form-check form-switch mb-2">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              id="emailBookingRequests"
                              checked={notifications.emailBookingRequests}
                              onChange={() => handleNotificationToggle("emailBookingRequests")}
                            />
                            <label className="form-check-label" htmlFor="emailBookingRequests">
                              New booking requests
                            </label>
                          </div>
                          <div className="form-check form-switch mb-2">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              id="emailBookingUpdates"
                              checked={notifications.emailBookingUpdates}
                              onChange={() => handleNotificationToggle("emailBookingUpdates")}
                            />
                            <label className="form-check-label" htmlFor="emailBookingUpdates">
                              Booking updates and reminders
                            </label>
                          </div>
                          <div className="form-check form-switch">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              id="emailPromotions"
                              checked={notifications.emailPromotions}
                              onChange={() => handleNotificationToggle("emailPromotions")}
                            />
                            <label className="form-check-label" htmlFor="emailPromotions">
                              Platform updates and tips
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Social Media Links */}
                    <div className="mt-4 pt-4 border-top">
                      <h6 className="fw-bold mb-3">🔗 Social Media Links</h6>
                      <div className="card bg-light border-0">
                        <div className="card-body">
                          <div className="row g-3">
                            <div className="col-md-6">
                              <label className="form-label small fw-semibold">
                                <span className="me-1">📸</span> Instagram
                              </label>
                              <input
                                type="text"
                                className="form-control"
                                placeholder="instagram.com/username"
                                value={socialLinks.instagram}
                                onChange={(e) => handleSocialLinkChange("instagram", e.target.value)}
                              />
                            </div>
                            <div className="col-md-6">
                              <label className="form-label small fw-semibold">
                                <span className="me-1">📘</span> Facebook
                              </label>
                              <input
                                type="text"
                                className="form-control"
                                placeholder="facebook.com/page"
                                value={socialLinks.facebook}
                                onChange={(e) => handleSocialLinkChange("facebook", e.target.value)}
                              />
                            </div>
                            <div className="col-12">
                              <label className="form-label small fw-semibold">
                                <span className="me-1">🌐</span> Website
                              </label>
                              <input
                                type="text"
                                className="form-control"
                                placeholder="www.yourwebsite.com"
                                value={socialLinks.website}
                                onChange={(e) => handleSocialLinkChange("website", e.target.value)}
                              />
                            </div>
                          </div>
                          <small className="text-muted d-block mt-2">
                            💡 Adding social links helps build trust with potential clients
                          </small>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Portfolio Tab */}
                {activeTab === "portfolio" && (
                  <div className="fade-in">
                    <div className="d-flex justify-content-between align-items-center mb-4">
                      <h5 className="fw-bold mb-0">My Portfolio</h5>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => setShowAddPortfolio(true)}
                      >
                        ➕ Add Photo
                      </button>
                    </div>

                    {portfolio.length > 0 ? (
                      <div className="row g-3">
                        {portfolio.map((item) => (
                          <div className="col-md-6" key={item.id}>
                            <div className="card h-100 hover-lift">
                              <div
                                className="card-img-top bg-light d-flex align-items-center justify-content-center"
                                style={{ height: "180px", overflow: "hidden" }}
                              >
                                {item.image && item.image.startsWith("data:") ? (
                                  <img
                                    src={item.image}
                                    alt={item.title}
                                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                  />
                                ) : (
                                  <span style={{ fontSize: "48px" }}>📷</span>
                                )}
                              </div>
                              <div className="card-body">
                                <div className="d-flex justify-content-between align-items-start">
                                  <div>
                                    <h6 className="fw-bold mb-1">{item.title}</h6>
                                    <span className="badge bg-light text-dark">{item.category}</span>
                                  </div>
                                  <button
                                    className="btn btn-sm btn-outline-danger"
                                    onClick={() => handleDeletePortfolioItem(item.id)}
                                  >
                                    🗑️
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-5">
                        <div style={{ fontSize: "48px", marginBottom: "16px" }}>🖼️</div>
                        <h6 className="text-muted">No portfolio items yet</h6>
                        <p className="text-muted small">Add photos to showcase your work to clients</p>
                        <button
                          className="btn btn-primary mt-2"
                          onClick={() => setShowAddPortfolio(true)}
                        >
                          ➕ Add Your First Photo
                        </button>
                      </div>
                    )}

                    <div className="alert alert-info mt-4">
                      <small>
                        💡 <strong>Tip:</strong> High-quality portfolio photos help attract more clients.
                        Add your best work from different categories to showcase your versatility.
                      </small>
                    </div>
                  </div>
                )}

                {/* Services Tab */}
                {activeTab === "services" && (
                  <div className="fade-in">
                    <div className="d-flex justify-content-between align-items-center mb-4">
                      <h5 className="fw-bold mb-0">Services & Pricing</h5>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => setShowAddService(true)}
                      >
                        ➕ Add Service
                      </button>
                    </div>

                    {/* Add Service Form */}
                    {showAddService && (
                      <div className="card bg-light border-0 mb-4">
                        <div className="card-body">
                          <h6 className="fw-bold mb-3">Add New Service</h6>
                          <div className="row g-3">
                            <div className="col-md-6">
                              <input
                                type="text"
                                className="form-control"
                                placeholder="Service Name"
                                value={newService.name}
                                onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                              />
                            </div>
                            <div className="col-md-6">
                              <input
                                type="number"
                                className="form-control"
                                placeholder="Price (PKR)"
                                value={newService.price}
                                onChange={(e) => setNewService({ ...newService, price: e.target.value })}
                              />
                            </div>
                            <div className="col-md-6">
                              <input
                                type="text"
                                className="form-control"
                                placeholder="Duration (e.g., 2 hours)"
                                value={newService.duration}
                                onChange={(e) => setNewService({ ...newService, duration: e.target.value })}
                              />
                            </div>
                            <div className="col-md-6">
                              <input
                                type="text"
                                className="form-control"
                                placeholder="Short description"
                                value={newService.description}
                                onChange={(e) => setNewService({ ...newService, description: e.target.value })}
                              />
                            </div>
                            <div className="col-12">
                              <button className="btn btn-primary btn-sm me-2" onClick={handleAddService}>
                                Add Service
                              </button>
                              <button
                                className="btn btn-outline-secondary btn-sm"
                                onClick={() => {
                                  setShowAddService(false)
                                  setNewService({ name: "", price: "", duration: "", description: "" })
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Services List */}
                    {services.length > 0 ? (
                      <div className="row g-3">
                        {services.map((service) => (
                          <div className="col-12" key={service.id}>
                            {editingService === service.id ? (
                              <div className="card border-primary">
                                <div className="card-body">
                                  <div className="row g-3">
                                    <div className="col-md-6">
                                      <input
                                        type="text"
                                        className="form-control"
                                        value={service.name}
                                        onChange={(e) => {
                                          setServices(services.map(s =>
                                            s.id === service.id ? { ...s, name: e.target.value } : s
                                          ))
                                        }}
                                      />
                                    </div>
                                    <div className="col-md-6">
                                      <input
                                        type="number"
                                        className="form-control"
                                        value={service.price}
                                        onChange={(e) => {
                                          setServices(services.map(s =>
                                            s.id === service.id ? { ...s, price: e.target.value } : s
                                          ))
                                        }}
                                      />
                                    </div>
                                    <div className="col-md-6">
                                      <input
                                        type="text"
                                        className="form-control"
                                        value={service.duration}
                                        onChange={(e) => {
                                          setServices(services.map(s =>
                                            s.id === service.id ? { ...s, duration: e.target.value } : s
                                          ))
                                        }}
                                      />
                                    </div>
                                    <div className="col-md-6">
                                      <input
                                        type="text"
                                        className="form-control"
                                        value={service.description}
                                        onChange={(e) => {
                                          setServices(services.map(s =>
                                            s.id === service.id ? { ...s, description: e.target.value } : s
                                          ))
                                        }}
                                      />
                                    </div>
                                    <div className="col-12">
                                      <button
                                        className="btn btn-primary btn-sm me-2"
                                        onClick={() => handleUpdateService(service.id, service)}
                                      >
                                        Save
                                      </button>
                                      <button
                                        className="btn btn-outline-secondary btn-sm"
                                        onClick={() => setEditingService(null)}
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="card hover-lift">
                                <div className="card-body">
                                  <div className="d-flex justify-content-between align-items-start">
                                    <div className="flex-grow-1">
                                      <div className="d-flex align-items-center gap-2 mb-2">
                                        <h6 className="fw-bold mb-0">{service.name}</h6>
                                        {service.duration && (
                                          <span className="badge bg-light text-dark">⏱️ {service.duration}</span>
                                        )}
                                      </div>
                                      <p className="text-muted small mb-2">{service.description}</p>
                                      <div className="fw-bold text-success">
                                        PKR {service.price.toLocaleString()}
                                      </div>
                                    </div>
                                    <div className="btn-group btn-group-sm">
                                      <button
                                        className="btn btn-outline-primary"
                                        onClick={() => setEditingService(service.id)}
                                      >
                                        ✏️
                                      </button>
                                      <button
                                        className="btn btn-outline-danger"
                                        onClick={() => handleDeleteService(service.id)}
                                      >
                                        🗑️
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-5">
                        <div style={{ fontSize: "48px", marginBottom: "16px" }}>📋</div>
                        <h6 className="text-muted">No services added yet</h6>
                        <p className="text-muted small">Add your photography services and pricing</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Availability Tab */}
                {activeTab === "availability" && (
                  <div className="fade-in">
                    <h5 className="fw-bold mb-4">Availability Schedule</h5>

                    {/* Quick Stats */}
                    <div className="row g-3 mb-4">
                      <div className="col-md-3">
                        <div className="card bg-primary text-white border-0">
                          <div className="card-body text-center py-3">
                            <div className="fw-bold h4 mb-0">{stats.totalBookings}</div>
                            <small>Total Bookings</small>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-3">
                        <div className="card bg-success text-white border-0">
                          <div className="card-body text-center py-3">
                            <div className="fw-bold h4 mb-0">{stats.completedBookings}</div>
                            <small>Completed</small>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-3">
                        <div className="card bg-info text-white border-0">
                          <div className="card-body text-center py-3">
                            <div className="fw-bold h4 mb-0">{stats.responseTime}</div>
                            <small>Avg Response</small>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-3">
                        <div className="card bg-warning text-dark border-0">
                          <div className="card-body text-center py-3">
                            <div className="fw-bold h4 mb-0">{stats.repeatClients}</div>
                            <small>Repeat Clients</small>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Weekly Schedule */}
                    <div className="card bg-light border-0 mb-4">
                      <div className="card-body">
                        <h6 className="fw-bold mb-3">📅 Weekly Schedule</h6>
                        <div className="table-responsive">
                          <table className="table table-borderless mb-0">
                            <thead>
                              <tr>
                                <th>Day</th>
                                <th>Available</th>
                                <th>Start Time</th>
                                <th>End Time</th>
                              </tr>
                            </thead>
                            <tbody>
                              {Object.entries(availability).map(([day, schedule]) => (
                                <tr key={day}>
                                  <td className="fw-semibold text-capitalize">{day}</td>
                                  <td>
                                    <div className="form-check form-switch">
                                      <input
                                        className="form-check-input"
                                        type="checkbox"
                                        checked={schedule.available}
                                        onChange={() => handleAvailabilityToggle(day)}
                                      />
                                    </div>
                                  </td>
                                  <td>
                                    <input
                                      type="time"
                                      className="form-control form-control-sm"
                                      value={schedule.start}
                                      onChange={(e) => handleAvailabilityTimeChange(day, "start", e.target.value)}
                                      disabled={!schedule.available}
                                      style={{ width: "120px" }}
                                    />
                                  </td>
                                  <td>
                                    <input
                                      type="time"
                                      className="form-control form-control-sm"
                                      value={schedule.end}
                                      onChange={(e) => handleAvailabilityTimeChange(day, "end", e.target.value)}
                                      disabled={!schedule.available}
                                      style={{ width: "120px" }}
                                    />
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>

                    {/* Blocked Dates */}
                    <div className="card bg-light border-0">
                      <div className="card-body">
                        <h6 className="fw-bold mb-3">🚫 Blocked Dates</h6>
                        <p className="text-muted small mb-3">Mark specific dates when you're not available</p>

                        <div className="d-flex gap-2 mb-3">
                          <input
                            type="date"
                            className="form-control"
                            value={newBlockedDate}
                            onChange={(e) => setNewBlockedDate(e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                            style={{ maxWidth: "200px" }}
                          />
                          <button
                            className="btn btn-primary"
                            onClick={handleAddBlockedDate}
                            disabled={!newBlockedDate}
                          >
                            Block Date
                          </button>
                        </div>

                        {blockedDates.length > 0 ? (
                          <div className="d-flex flex-wrap gap-2">
                            {blockedDates.map((date) => (
                              <span key={date} className="badge bg-danger d-flex align-items-center gap-1 py-2 px-3">
                                {new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                <button
                                  className="btn-close btn-close-white ms-1"
                                  style={{ fontSize: "0.6rem" }}
                                  onClick={() => handleRemoveBlockedDate(date)}
                                />
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-muted small mb-0">No blocked dates</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Travel Preferences Tab */}
                {activeTab === "travel" && (
                  <div className="fade-in">
                    <h5 className="fw-bold mb-4">✈️ Travel Preferences</h5>

                    {travelError && (
                      <div className="alert alert-danger alert-dismissible fade show" role="alert">
                        {travelError}
                        <button type="button" className="btn-close" onClick={() => setTravelError("")}></button>
                      </div>
                    )}

                    {travelSaved && (
                      <div className="alert alert-success alert-dismissible fade show" role="alert">
                        Travel settings saved successfully!
                        <button type="button" className="btn-close" onClick={() => setTravelSaved(false)}></button>
                      </div>
                    )}

                    {travelLoading ? (
                      <div className="text-center py-5">
                        <div className="spinner-border text-primary" role="status">
                          <span className="visually-hidden">Loading...</span>
                        </div>
                      </div>
                    ) : (
                      <div className="card bg-light border-0">
                        <div className="card-body">
                          {/* Willing to Travel */}
                          <div className="mb-4">
                            <div className="form-check form-switch">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                id="willingToTravel"
                                checked={travelSettings.is_willing_to_travel || false}
                                onChange={(e) => handleTravelChange("is_willing_to_travel", e.target.checked)}
                              />
                              <label className="form-check-label fw-bold" htmlFor="willingToTravel">
                                I'm willing to travel for bookings
                              </label>
                            </div>
                            <p className="text-muted small mt-2 ms-4">
                              If enabled, clients can book you for events outside your base city with travel cost adjustments
                            </p>
                          </div>

                          {travelSettings.is_willing_to_travel && (
                            <>
                              {/* Info Alert */}
                              <div className="alert alert-info mb-4">
                                <strong>ℹ️ How Travel Costs Work:</strong>
                                <p className="mb-0 mt-2">
                                  When clients book you from a different city, the system automatically calculates travel costs based on real bus fares and distance. You don't need to set rates manually - just specify your base city!
                                </p>
                              </div>

                              {/* Base City */}
                              <div className="mb-4">
                                <label className="form-label fw-bold">Base City *</label>
                                <select
                                  className="form-select"
                                  value={travelSettings.base_city || ""}
                                  onChange={(e) => handleTravelChange("base_city", e.target.value)}
                                >
                                  <option value="">Select your base city</option>
                                  {travelCities.map((city) => (
                                    <option key={city.name} value={city.name}>
                                      {city.name}
                                    </option>
                                  ))}
                                </select>
                                <small className="text-muted">
                                  This is where you're normally based. Travel costs are calculated from here.
                                </small>
                                {travelCities.length === 0 && (
                                  <div className="text-warning mt-2">
                                    <small>⚠️ Loading cities...</small>
                                  </div>
                                )}
                              </div>

                              {/* Cities I Don't Travel To */}
                              <div className="mb-4">
                                <label className="form-label fw-bold">Cities I Don't Travel To (Optional)</label>
                                <div className="p-3 bg-white rounded border">
                                  {travelCities && travelCities.length > 0 ? (
                                    <div className="d-flex flex-wrap gap-2">
                                      {travelCities.map((city) => (
                                        <button
                                          type="button"
                                          key={city.name}
                                          className={`btn btn-sm ${
                                            (travelSettings.avoided_cities || []).includes(city.name)
                                              ? "btn-danger"
                                              : "btn-outline-secondary"
                                          }`}
                                          onClick={() => handleAvoidedCityToggle(city.name)}
                                        >
                                          {(travelSettings.avoided_cities || []).includes(city.name) ? "✕ " : ""}
                                          {city.name}
                                        </button>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-muted mb-0">Loading cities...</p>
                                  )}
                                </div>
                                <small className="text-muted">
                                  Click cities where you don't want to accept bookings. Red = Blocked.
                                </small>
                              </div>

                              {/* Notes */}
                              <div className="mb-4">
                                <label className="form-label fw-bold">Travel Preferences (Optional)</label>
                                <textarea
                                  className="form-control"
                                  rows="3"
                                  value={travelSettings.notes || ""}
                                  onChange={(e) => handleTravelChange("notes", e.target.value)}
                                  placeholder="Example: I prefer bookings within 100km of my base city. For distant locations, I need 3 days advance notice. I can arrange my own transport if needed."
                                />
                                <small className="text-muted">
                                  Share any preferences about travel distance, notice period, or special arrangements.
                                </small>
                              </div>

                              {/* Save Button */}
                              <div>
                                <div className="d-flex gap-2 mb-2">
                                  <button
                                    className="btn btn-primary"
                                    onClick={handleSaveTravelSettings}
                                    disabled={travelSaving || !travelSettings.base_city}
                                  >
                                    {travelSaving ? (
                                      <>
                                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                        Saving...
                                      </>
                                    ) : (
                                      "💾 Save Travel Settings"
                                    )}
                                  </button>
                                  {travelSaved && (
                                    <div className="alert alert-success mb-0 py-2 px-3">
                                      ✓ Saved successfully!
                                    </div>
                                  )}
                                </div>
                                {travelError && (
                                  <div className="alert alert-danger mb-0">
                                    <strong>Error:</strong> {travelError}
                                  </div>
                                )}
                              </div>
                            </>
                          )}

                          {!travelSettings.is_willing_to_travel && (
                            <div className="alert alert-info">
                              Enable travel willingness above to set your travel preferences and rates.
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Reviews Tab */}
                {activeTab === "reviews" && (
                  <div className="fade-in">
                    <div className="d-flex justify-content-between align-items-center mb-4">
                      <h5 className="fw-bold mb-0">Client Reviews</h5>
                      <div className="d-flex align-items-center gap-2">
                        <span className="badge bg-warning text-dark fs-6">
                          ⭐ {(reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)}
                        </span>
                        <span className="text-muted">({reviews.length} reviews)</span>
                      </div>
                    </div>

                    {/* Rating Summary */}
                    <div className="card bg-light border-0 mb-4">
                      <div className="card-body">
                        <div className="row align-items-center">
                          <div className="col-md-4 text-center border-end">
                            <div className="display-4 fw-bold text-primary">
                              {(reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)}
                            </div>
                            <div className="text-warning mb-1">
                              {"★".repeat(Math.round(reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length))}
                              {"☆".repeat(5 - Math.round(reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length))}
                            </div>
                            <small className="text-muted">Based on {reviews.length} reviews</small>
                          </div>
                          <div className="col-md-8">
                            {[5, 4, 3, 2, 1].map((star) => {
                              const count = reviews.filter(r => r.rating === star).length
                              const percentage = (count / reviews.length) * 100
                              return (
                                <div key={star} className="d-flex align-items-center gap-2 mb-1">
                                  <span className="text-muted small" style={{ width: "20px" }}>{star}★</span>
                                  <div className="progress flex-grow-1" style={{ height: "8px" }}>
                                    <div
                                      className="progress-bar bg-warning"
                                      style={{ width: `${percentage}%` }}
                                    />
                                  </div>
                                  <span className="text-muted small" style={{ width: "30px" }}>{count}</span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Reviews List */}
                    {reviews.length > 0 ? (
                      <div className="d-flex flex-column gap-3">
                        {reviews.map((review) => (
                          <div key={review.id} className="card hover-lift">
                            <div className="card-body">
                              <div className="d-flex justify-content-between align-items-start mb-2">
                                <div className="d-flex align-items-center gap-2">
                                  <div
                                    className="rounded-circle bg-primary d-flex align-items-center justify-content-center"
                                    style={{ width: "40px", height: "40px", color: "white" }}
                                  >
                                    {review.clientName.charAt(0)}
                                  </div>
                                  <div>
                                    <h6 className="fw-bold mb-0">{review.clientName}</h6>
                                    <small className="text-muted">{review.service}</small>
                                  </div>
                                </div>
                                <div className="d-flex align-items-start gap-2">
                                  <div className="text-end">
                                    <div className="text-warning">
                                      {"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}
                                    </div>
                                    <small className="text-muted">
                                      {new Date(review.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                    </small>
                                  </div>
                                  <button
                                    className="btn btn-sm btn-outline-secondary"
                                    onClick={() => handleOpenReportModal(review)}
                                    title="Report this review"
                                  >
                                    🚩
                                  </button>
                                </div>
                              </div>
                              <p className="mb-0 text-muted">{review.comment}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-5">
                        <div style={{ fontSize: "48px", marginBottom: "16px" }}>⭐</div>
                        <h6 className="text-muted">No reviews yet</h6>
                        <p className="text-muted small">Reviews from clients will appear here</p>
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
                        <h6 className="fw-bold mb-2">📧 Forgot Password?</h6>
                        <p className="text-muted mb-3">Send a password reset link to your email address</p>
                        <button
                          className="btn btn-outline-primary"
                          onClick={() => {
                            alert(`Password reset link sent to ${profile.email}`);
                          }}
                        >
                          Send Password Reset Link
                        </button>
                      </div>
                    </div>

                    {/* Delete Account Section */}
                    <div className="card border-danger">
                      <div className="card-body">
                        <h6 className="fw-bold text-danger mb-2">⚠️ Delete Account</h6>
                        <p className="text-muted mb-3">
                          Permanently delete your account and all associated data. This action cannot be undone.
                        </p>
                        <ul className="text-muted small mb-3">
                          <li>All your portfolio items will be deleted</li>
                          <li>Your booking history will be removed</li>
                          <li>Any pending bookings will be cancelled</li>
                          <li>Your earnings data will be permanently lost</li>
                        </ul>
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

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header border-0">
                <h5 className="modal-title fw-bold text-danger">⚠️ Delete Account</h5>
                <button type="button" className="btn-close" onClick={() => setShowDeleteModal(false)} />
              </div>
              <div className="modal-body">
                <p>Are you sure you want to delete your account? This action cannot be undone.</p>
                <ul className="text-muted small">
                  <li>All your portfolio items will be deleted</li>
                  <li>Your booking history will be removed</li>
                  <li>Any pending bookings will be cancelled</li>
                  <li>Your earnings data will be permanently lost</li>
                </ul>
              </div>
              <div className="modal-footer border-0">
                <button className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>Cancel</button>
                <button className="btn btn-danger" onClick={handleDeleteAccount}>Yes, Delete My Account</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Portfolio Item Modal */}
      {showAddPortfolio && (
        <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">Add Portfolio Photo</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => {
                    setShowAddPortfolio(false)
                    setNewPortfolioItem({ title: "", category: "Wedding", image: null })
                  }}
                />
              </div>
              <div className="modal-body">
                {/* Image Preview */}
                <div className="mb-3">
                  <div
                    className="border rounded d-flex align-items-center justify-content-center bg-light"
                    style={{ height: "200px", overflow: "hidden", cursor: "pointer" }}
                    onClick={() => portfolioFileRef.current?.click()}
                  >
                    {newPortfolioItem.image ? (
                      <img
                        src={newPortfolioItem.image}
                        alt="Preview"
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      <div className="text-center text-muted">
                        <div style={{ fontSize: "48px" }}>📷</div>
                        <p className="mb-0">Click to select a photo</p>
                      </div>
                    )}
                  </div>
                  <input
                    type="file"
                    ref={portfolioFileRef}
                    className="d-none"
                    accept="image/*"
                    onChange={handlePortfolioImageSelect}
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold">Title</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g., Summer Wedding Shoot"
                    value={newPortfolioItem.title}
                    onChange={(e) => setNewPortfolioItem({ ...newPortfolioItem, title: e.target.value })}
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold">Category</label>
                  <select
                    className="form-select"
                    value={newPortfolioItem.category}
                    onChange={(e) => setNewPortfolioItem({ ...newPortfolioItem, category: e.target.value })}
                  >
                    <option value="Wedding">Wedding</option>
                    <option value="Portrait">Portrait</option>
                    <option value="Event">Event</option>
                    <option value="Product">Product</option>
                    <option value="Fashion">Fashion</option>
                    <option value="Nature">Nature</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowAddPortfolio(false)
                    setNewPortfolioItem({ title: "", category: "Wedding", image: null })
                  }}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleAddPortfolioItem}
                  disabled={!newPortfolioItem.title || !newPortfolioItem.image}
                >
                  Add to Portfolio
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Report Review Modal */}
      {showReportModal && reportingReview && (
        <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">🚩 Report Review</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => {
                    setShowReportModal(false)
                    setReportingReview(null)
                    setReportReason("")
                    setReportDescription("")
                  }}
                />
              </div>
              <div className="modal-body">
                {/* Review being reported */}
                <div className="card bg-light border-0 mb-3">
                  <div className="card-body py-2">
                    <div className="d-flex align-items-center gap-2 mb-1">
                      <strong>{reportingReview.clientName}</strong>
                      <span className="text-warning small">
                        {"★".repeat(reportingReview.rating)}
                      </span>
                    </div>
                    <p className="text-muted small mb-0">"{reportingReview.comment}"</p>
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold">Reason for reporting *</label>
                  <select
                    className="form-select"
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                  >
                    <option value="">Select a reason...</option>
                    <option value="fake">Fake or fraudulent review</option>
                    <option value="inappropriate">Inappropriate or offensive content</option>
                    <option value="spam">Spam or promotional content</option>
                    <option value="wrong_person">Review is for wrong photographer</option>
                    <option value="never_booked">This person never booked with me</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold">Additional details (optional)</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    placeholder="Provide any additional context that might help our team review this report..."
                    value={reportDescription}
                    onChange={(e) => setReportDescription(e.target.value)}
                  />
                </div>

                <div className="alert alert-info py-2">
                  <small>
                    📋 Our team will review your report within 24-48 hours.
                    If the review violates our guidelines, it will be removed.
                  </small>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowReportModal(false)
                    setReportingReview(null)
                    setReportReason("")
                    setReportDescription("")
                  }}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-danger"
                  onClick={handleSubmitReport}
                  disabled={!reportReason}
                >
                  Submit Report
                </button>
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
        .hover-lift {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .hover-lift:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1) !important;
        }
        .nav-pills .nav-link {
          color: #495057;
          border-radius: 8px;
        }
        .nav-pills .nav-link.active {
          background-color: var(--bs-primary);
          color: white;
        }
      `}</style>
    </div>
  )
}

export default PhotographerProfile
