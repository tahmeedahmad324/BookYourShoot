import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"
import { 
  Calendar, 
  Clock, 
  CheckCircle2, 
  DollarSign,
  Search,
  ImageIcon,
  Video,
  Music,
  MessageSquare,
  Star,
  User,
  Camera,
  MapPin,
  BarChart3,
  Settings,
  Briefcase,
  Wallet,
  Shield,
  Receipt,
  CreditCard,
  Bell
} from "lucide-react"

const PhotographerDashboard = () => {
  const { user } = useAuth()
  const [stats, setStats] = useState({
    totalBookings: 0,
    upcomingBookings: 0,
    completedBookings: 0,
    totalSpent: 0,
    pendingPayouts: 0,
    activeEscrows: 0,
  })

  useEffect(() => {
    // Mock data for photographer bookings
    const mockBookings = [
      {
        id: 1,
        status: "upcoming",
        amount: 15000,
      },
      {
        id: 2,
        status: "completed",
        amount: 8000,
      },
      {
        id: 3,
        status: "upcoming",
        amount: 12000,
      },
    ]

    const upcoming = mockBookings.filter((b) => b.status === "upcoming").length
    const completed = mockBookings.filter((b) => b.status === "completed").length
    const totalSpent = mockBookings.reduce((sum, b) => sum + b.amount, 0)

    setStats({
      totalBookings: mockBookings.length,
      upcomingBookings: upcoming,
      completedBookings: completed,
      totalSpent: totalSpent,
      pendingPayouts: 2,
      activeEscrows: 3,
    })
  }, [])

  // Photographer menu options
  const menuOptions = [
    {
      id: "bookings",
      title: "My Bookings",
      description: "View and manage all your photography bookings",
      icon: Calendar,
      link: "/photographer/bookings",
      badge: stats.upcomingBookings,
      badgeColor: "success",
    },
    {
      id: "album",
      title: "My Portfolio",
      description: "Update your profile, portfolio, and showcase work",
      icon: Camera,
      link: "/photographer/profile?tab=portfolio",
      badge: null,
    },
    {
      id: "reel",
      title: "Equipment Rental",
      description: "List and manage your equipment for rent",
      icon: Briefcase,
      link: "/photographer/equipment",
      badge: null,
    },
    {
      id: "music",
      title: "Travel Estimator",
      description: "Calculate travel costs for client locations",
      icon: MapPin,
      link: "/photographer/travel",
      badge: null,
    },
    {
      id: "analytics",
      title: "Analytics & Stats",
      description: "View your performance metrics and insights",
      icon: BarChart3,
      link: "#",
      badge: "Coming Soon",
      badgeColor: "secondary",
    },
    {
      id: "reviews",
      title: "Reviews & Ratings",
      description: "Manage client reviews and your ratings",
      icon: Star,
      link: "/photographer/profile?tab=reviews",
      badge: null,
    },
    {
      id: "payments",
      title: "Earnings & Payouts",
      description: "View payments, pending payouts, and transaction history",
      icon: Receipt,
      link: "/photographer/payments",
      badge: stats.pendingPayouts > 0 ? stats.pendingPayouts : null,
      badgeColor: "success",
    },
    {
      id: "notifications",
      title: "Notification Settings",
      description: "Manage your email and push notification preferences",
      icon: Bell,
      link: "/settings/notifications",
      badge: null,
    },
    {
      id: "profile",
      title: "Profile Settings",
      description: "Configure your account and preferences",
      icon: Settings,
      link: "/photographer/profile",
      badge: null,
    },
  ]

  return (
    <div className="photographer-dashboard py-4">
      <div className="container">
        {/* Header */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="gradient-header rounded-3 p-4">
              <div className="row align-items-center">
                <div className="col-md-8">
                  <h2 className="fw-bold mb-2">Welcome back, {user?.name || "Photographer"}!</h2>
                  <p className="mb-0">Manage your bookings and grow your photography business</p>
                </div>
                <div className="col-md-4 text-md-end">
                  <Link to="/photographer/profile" className="btn btn-light btn-sm">
                    <User size={16} className="me-1" /> My Profile
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
                <div className="text-primary mb-1">
                  <Calendar size={28} />
                </div>
                <h4 className="fw-bold mb-0">{stats.totalBookings}</h4>
                <small className="text-muted">Total Bookings</small>
              </div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body text-center py-3">
                <div className="text-success mb-1">
                  <Clock size={28} />
                </div>
                <h4 className="fw-bold mb-0 text-success">{stats.upcomingBookings}</h4>
                <small className="text-muted">Upcoming</small>
              </div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body text-center py-3">
                <div className="text-info mb-1">
                  <CheckCircle2 size={28} />
                </div>
                <h4 className="fw-bold mb-0 text-info">{stats.completedBookings}</h4>
                <small className="text-muted">Completed</small>
              </div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body text-center py-3">
                <div className="text-warning mb-1">
                  <DollarSign size={28} />
                </div>
                <h4 className="fw-bold mb-0 text-success">PKR {(stats.totalSpent / 1000).toFixed(0)}k</h4>
                <small className="text-muted">Total Earnings</small>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Stats Row */}
        <div className="row g-3 mb-4">
          <div className="col-12">
            <div className="card border-0 shadow-sm border-start border-success border-4">
              <div className="card-body py-3">
                <div className="row align-items-center">
                  <div className="col-auto">
                    <div className="d-flex align-items-center gap-2">
                      <Wallet size={24} className="text-success" />
                      <div>
                        <h6 className="mb-0 fw-bold">Earnings Status</h6>
                        <small className="text-muted">Your secured payments</small>
                      </div>
                    </div>
                  </div>
                  <div className="col">
                    <div className="d-flex justify-content-end gap-4">
                      <div className="text-center">
                        <span className="badge bg-warning text-dark px-3 py-2 fs-6">
                          <Shield size={16} className="me-1" />
                          {stats.activeEscrows} Secured
                        </span>
                        <div className="small text-muted mt-1">In Escrow</div>
                      </div>
                      <div className="text-center">
                        <span className="badge bg-success text-white px-3 py-2 fs-6">
                          <CreditCard size={16} className="me-1" />
                          {stats.pendingPayouts} Ready
                        </span>
                        <div className="small text-muted mt-1">Pending Payout</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Menu Options */}
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-white border-0 pt-4 pb-2">
            <h5 className="fw-bold mb-0">Quick Actions</h5>
            <p className="text-muted small mb-0">Select an option to get started</p>
          </div>
          <div className="card-body">
            <div className="row g-3">
              {menuOptions.map((option) => {
                const IconComponent = option.icon
                return (
                  <div className="col-md-6 col-lg-4" key={option.id}>
                    <Link
                      to={option.link}
                      className="card h-100 border hover-lift text-decoration-none"
                      onClick={() => window.scrollTo(0, 0)}
                    >
                      <div className="card-body">
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <div className="text-primary">
                            <IconComponent size={32} />
                          </div>
                          {option.badge !== null && option.badge !== undefined && (
                            <span className={`badge bg-${option.badgeColor || 'secondary'}`}>
                              {option.badge}
                            </span>
                          )}
                        </div>
                        <h6 className="fw-bold mb-2">{option.title}</h6>
                        <p className="text-muted small mb-0">{option.description}</p>
                        {option.link === "#" && (
                          <span className="badge bg-light text-muted mt-2">Coming Soon</span>
                        )}
                      </div>
                    </Link>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PhotographerDashboard

// Add inline styles for hover effects if not already in global CSS
if (typeof document !== 'undefined') {
  const styleId = 'dashboard-hover-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .hover-lift {
        transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease !important;
        position: relative;
        border: 2px solid transparent !important;
        background-clip: padding-box;
      }
      
      .hover-lift:hover {
        transform: translateY(-5px) !important;
        border-color: #225ea1 !important;
        box-shadow: 
          0 8px 25px rgba(34, 94, 161, 0.25),
          0 0 0 2px #225ea1,
          0 0 15px rgba(34, 94, 161, 0.4),
          0 0 30px rgba(247, 147, 30, 0.2) !important;
        animation: glowPulse 1.5s ease-in-out infinite;
      }
      
      @keyframes glowPulse {
        0%, 100% {
          box-shadow: 
            0 8px 25px rgba(34, 94, 161, 0.25),
            0 0 0 2px #225ea1,
            0 0 15px rgba(34, 94, 161, 0.4),
            0 0 30px rgba(247, 147, 30, 0.2);
        }
        50% {
          box-shadow: 
            0 8px 25px rgba(34, 94, 161, 0.35),
            0 0 0 2px #2d75c7,
            0 0 20px rgba(34, 94, 161, 0.5),
            0 0 40px rgba(247, 147, 30, 0.3);
        }
      }
    `;
    document.head.appendChild(style);
  }
}
