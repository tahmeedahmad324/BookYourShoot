"use client"

import { useState, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const navigate = useNavigate()
  const { user, isAuthenticated, logout } = useAuth()

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const handleLogin = () => {
    navigate("/login")
  }

  const handleRegister = () => {
    navigate("/register")
  }

  const handleHomeClick = (e) => {
    e.preventDefault()
    // If already on home page, scroll to top
    if (window.location.pathname === '/' || window.location.pathname === '') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      // Navigate to home page
      navigate('/')
      // Scroll to top after navigation
      setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100)
    }
    setMobileMenuOpen(false)
  }

  const animateScroll = (targetY, duration = 600) => {
    const startY = window.pageYOffset
    const diff = targetY - startY
    let start
    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3)
    function step(timestamp) {
      if (!start) start = timestamp
      const elapsed = timestamp - start
      const progress = Math.min(elapsed / duration, 1)
      window.scrollTo(0, startY + diff * easeOutCubic(progress))
      if (elapsed < duration) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }

  const scrollTo = (id) => {
    const el = document.getElementById(id)
    if (!el) return
    // Sum heights of all fixed/sticky navbars to offset
    const navbars = Array.from(document.querySelectorAll('.navbar'))
    const totalHeight = navbars.reduce((sum, n) => sum + n.offsetHeight, 0)
    const y = el.getBoundingClientRect().top + window.pageYOffset - totalHeight + 8 // slight padding
    animateScroll(y)
    setMobileMenuOpen(false)
  }

  // Active section tracking
  const [activeSection, setActiveSection] = useState('')
  useEffect(() => {
    const sectionIds = ['how-it-works', 'services', 'for-photographers']
    const sections = sectionIds.map(id => document.getElementById(id)).filter(Boolean)
    if (!sections.length) return
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id)
          }
        })
      },
      {
        root: null,
        rootMargin: '0px 0px -50% 0px',
        threshold: [0.25, 0.5, 0.75]
      }
    )
    sections.forEach(sec => observer.observe(sec))
    return () => observer.disconnect()
  }, [])

  return (
    <nav className={`navbar navbar-expand-lg navbar-light fixed-top ${scrolled ? "navbar-scrolled" : ""}`}>
      <div className="container landing-container">
        <a className="navbar-brand d-flex align-items-center gap-2" href="/" onClick={handleHomeClick} style={{ cursor: 'pointer' }}>
          <img src="/logo.png" alt="BookYourShoot" height="32" className="d-inline-block align-text-top" />
          <div>
            <div style={{ fontSize: "14px", fontWeight: "bold" }}>BookYourShoot</div>
            <div style={{ fontSize: "9px", fontStyle: "italic", color: "#FF9900" }}>Shoot Smart</div>
          </div>
        </a>

        {/* Mobile menu button */}
        <button
          className="navbar-toggler"
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        {/* Desktop navigation */}
        <div className={`collapse navbar-collapse ${mobileMenuOpen ? "show" : ""}`}>
          <ul className="navbar-nav mx-auto">
            <li className="nav-item">
              <a className="nav-link" href="/" onClick={handleHomeClick}>Home</a>
            </li>
            <li className="nav-item">
              <a className={`nav-link ${activeSection === 'how-it-works' ? 'active' : ''}`} href="#how-it-works" onClick={(e) => { e.preventDefault(); scrollTo('how-it-works') }}>How it Works</a>
            </li>
            <li className="nav-item">
              <a className={`nav-link ${activeSection === 'services' ? 'active' : ''}`} href="#services" onClick={(e) => { e.preventDefault(); scrollTo('services') }}>Services</a>
            </li>
            <li className="nav-item">
              <a className={`nav-link ${activeSection === 'for-photographers' ? 'active' : ''}`} href="#for-photographers" onClick={(e) => { e.preventDefault(); scrollTo('for-photographers') }}>For Photographers</a>
            </li>
          </ul>

          <div className="navbar-buttons d-flex align-items-center">
            {isAuthenticated ? (
              <div className="dropdown">
                <button
                  className="btn btn-outline-primary dropdown-toggle d-flex align-items-center"
                  type="button"
                  id="landingUserDropdown"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                >
                  <span className="me-2">👤</span>
                  <span className="d-none d-md-inline">{user?.name || user?.email}</span>
                </button>
                <ul className="dropdown-menu dropdown-menu-end" aria-labelledby="landingUserDropdown">
                  <li>
                    <Link className="dropdown-item" to="/profile" onClick={() => setMobileMenuOpen(false)}>Profile</Link>
                  </li>
                  <li><hr className="dropdown-divider" /></li>
                  <li>
                    <button className="dropdown-item" onClick={() => { logout(); setMobileMenuOpen(false); navigate('/') }}>Logout</button>
                  </li>
                </ul>
              </div>
            ) : (
              <>
                <button className="btn btn-outline-primary me-2" onClick={handleLogin}>Login</button>
                <button className="btn btn-primary" onClick={handleRegister}>Sign Up</button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
