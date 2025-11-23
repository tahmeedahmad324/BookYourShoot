"use client"

import { useState, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const navigate = useNavigate()

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

  return (
    <nav className={`navbar navbar-expand-lg navbar-light fixed-top ${scrolled ? "navbar-scrolled" : ""}`}>
      <div className="container landing-container">
        <Link className="navbar-brand d-flex align-items-center gap-2" to="/">
          <img src="/logo.png" alt="BookYourShoot" height="32" className="d-inline-block align-text-top" />
          <div>
            <div style={{ fontSize: "14px", fontWeight: "bold" }}>BookYourShoot</div>
            <div style={{ fontSize: "9px", fontStyle: "italic", color: "#FF9900" }}>Shoot Smart</div>
          </div>
        </Link>

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
              <Link className="nav-link" to="#features">
                Services
              </Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" to="#how-it-works">
                How it Works
              </Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" to="#trust">
                Trust & Safety
              </Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" to="/photographer/register">
                For Photographers
              </Link>
            </li>
          </ul>

          <div className="navbar-buttons">
            <button className="btn btn-outline-primary me-2" onClick={handleLogin}>
              Login
            </button>
            <button className="btn btn-primary" onClick={handleRegister}>
              Sign Up
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
