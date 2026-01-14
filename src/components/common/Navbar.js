"use client"

import { useState, useEffect } from "react"
import { Link, useNavigate, useLocation } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"
import NotificationDropdown from "../NotificationDropdown"

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [expanded, setExpanded] = useState(false)

  const handleLogout = () => {
    logout()
    navigate("/")
    setExpanded(false)
  }

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + "/")
  }

  const publicLinks = [
    { path: "/", label: "Home" },
    { path: "#how-it-works", label: "How it Works", sectionId: 'how-it-works' },
    { path: "#services", label: "Services", sectionId: 'services' },
    { path: "#for-photographers", label: "For Photographers", sectionId: 'for-photographers' }
  ]

  const clientLinks = [
    { path: "/client/dashboard", label: "Dashboard" }
  ]

  const photographerLinks = [
    { path: "/photographer/dashboard", label: "Dashboard" },
  ]

  const adminLinks = [
    { path: "/admin/dashboard", label: "Dashboard" },
  ]

  const getNavLinks = () => {
    if (!isAuthenticated) return publicLinks
    if (user?.role === "client") return clientLinks
    if (user?.role === "photographer") return photographerLinks
    if (user?.role === "admin") return adminLinks
    return publicLinks
  }

  const animateScroll = (targetY, duration = 600) => {
    const startY = window.pageYOffset
    const diff = targetY - startY
    let start
    const easeOutCubic = t => 1 - Math.pow(1 - t, 3)
    function step(ts){ if(!start) start = ts; const elapsed = ts - start; const progress = Math.min(elapsed/duration,1); window.scrollTo(0,startY + diff*easeOutCubic(progress)); if(elapsed<duration) requestAnimationFrame(step) }
    requestAnimationFrame(step)
  }

  const handleHomeClick = (e) => {
    e.preventDefault()
    // If already on home page, animate scroll to top
    if (location.pathname === '/' || location.pathname === '') {
      animateScroll(0, 600)
    } else {
      // Navigate to home page
      navigate('/')
      // Scroll to top after navigation
      setTimeout(() => animateScroll(0, 600), 100)
    }
    setExpanded(false)
  }

  const handleSectionLink = (e, id) => {
    if(!id) return
    e.preventDefault()
    // If not on landing page, navigate to home first
    if (location.pathname !== '/') {
      navigate('/')
      // Wait for navigation then scroll
      setTimeout(() => {
        const el = document.getElementById(id)
        if (el) {
          const navbars = Array.from(document.querySelectorAll('.navbar'))
          const totalHeight = navbars.reduce((sum,n)=> sum + n.offsetHeight,0)
          const extraOffset = id === 'for-photographers' ? 50 : 20
          const y = el.getBoundingClientRect().top + window.pageYOffset - totalHeight - extraOffset
          animateScroll(y)
        }
      }, 100)
      setExpanded(false)
      return
    }
    // Already on landing page, just scroll
    const el = document.getElementById(id)
    if(!el) return
    const navbars = Array.from(document.querySelectorAll('.navbar'))
    const totalHeight = navbars.reduce((sum,n)=> sum + n.offsetHeight,0)
    const extraOffset = id === 'for-photographers' ? 50 : 20
    const y = el.getBoundingClientRect().top + window.pageYOffset - totalHeight - extraOffset
    animateScroll(y)
    setExpanded(false)
  }

  return (
    <nav className="navbar navbar-expand-lg navbar-light bg-white shadow-sm sticky-top">
      <div className="container">
        <a
          className="navbar-brand fw-bold text-primary d-flex align-items-center gap-2"
          href="/"
          onClick={handleHomeClick}
          style={{ cursor: 'pointer' }}
        >
          <img src="/logo.png" alt="BookYourShoot" style={{ height: "40px" }} />
          <div>
            <div style={{ fontSize: "16px", fontWeight: "bold" }}>BookYourShoot</div>
            <div style={{ fontSize: "10px", fontStyle: "italic", color: "#FF9900", marginTop: "-2px" }}>
              Shoot Smart
            </div>
          </div>
        </a>

        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNav"
          aria-controls="navbarNav"
          aria-expanded="false"
          aria-label="Toggle navigation"
          onClick={() => setExpanded(!expanded)}
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className={`collapse navbar-collapse ${expanded ? "show" : ""}`} id="navbarNav">
          <ul className="navbar-nav mx-auto">
            {getNavLinks().map((link) => (
              <li className="nav-item" key={link.path}>
                {link.sectionId ? (
                  <a
                    href={link.path}
                    className="nav-link"
                    onClick={(e) => handleSectionLink(e, link.sectionId)}
                  >
                    {link.label}
                  </a>
                ) : link.path === "/" ? (
                  <a
                    href="/"
                    className={`nav-link ${isActive(link.path) ? "active" : ""}`}
                    onClick={handleHomeClick}
                  >
                    {link.label}
                  </a>
                ) : (
                  <Link
                    className={`nav-link ${isActive(link.path) ? "active" : ""}`}
                    to={link.path}
                    onClick={() => setExpanded(false)}
                  >
                    {link.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>

          <div className="d-flex align-items-center gap-3">
            {isAuthenticated && (
              <NotificationDropdown userId={user?.email} />
            )}
            {isAuthenticated ? (
              <div className="dropdown">
                <button
                  className="btn btn-outline-primary dropdown-toggle d-flex align-items-center"
                  type="button"
                  id="userDropdown"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                >
                  <span className="me-2">👤</span>
                  <span className="d-none d-md-inline">{user?.name || user?.email}</span>
                </button>
                <ul className="dropdown-menu dropdown-menu-end" aria-labelledby="userDropdown">
                  <li>
                    <Link 
                      className="dropdown-item" 
                      to={user?.role === "client" ? "/client/profile" : user?.role === "photographer" ? "/photographer/profile" : user?.role === "admin" ? "/admin/settings" : "/profile"} 
                      onClick={() => setExpanded(false)}
                    >
                      Profile
                    </Link>
                  </li>
                  <li>
                    <Link 
                      className="dropdown-item" 
                      to="/settings/notifications"
                      onClick={() => setExpanded(false)}
                    >
                      🔔 Notification Settings
                    </Link>
                  </li>
                  <li><hr className="dropdown-divider" /></li>
                  <li>
                    <button className="dropdown-item" onClick={handleLogout}>Logout</button>
                  </li>
                </ul>
              </div>
            ) : (
              <div className="d-flex gap-2">
                <Link to="/login" className="btn btn-outline-primary" onClick={() => setExpanded(false)}>
                  Login
                </Link>
                <Link to="/register" className="btn btn-primary" onClick={() => setExpanded(false)}>
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
