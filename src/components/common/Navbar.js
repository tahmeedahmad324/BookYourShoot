import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [expanded, setExpanded] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
    setExpanded(false);
  };

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const publicLinks = [
    { path: '/', label: 'Home' },
    { path: '/search', label: 'Find Photographers' },
    { path: '#services', label: 'Services' },
    { path: '#pricing', label: 'Pricing' }
  ];

  const clientLinks = [
    { path: '/client/dashboard', label: 'Dashboard' },
    { path: '/client/bookings', label: 'My Bookings' },
    { path: '/client/album-builder', label: 'Album Builder' },
    { path: '/client/reel-generator', label: 'Reel Generator' }
  ];

  const photographerLinks = [
    { path: '/photographer/dashboard', label: 'Dashboard' },
    { path: '/photographer/bookings', label: 'Bookings' },
    { path: '/photographer/equipment', label: 'Equipment' },
    { path: '/photographer/travel', label: 'Travel Estimator' }
  ];

  const adminLinks = [
    { path: '/admin/dashboard', label: 'Dashboard' },
    { path: '/admin/verifications', label: 'Verifications' }
  ];

  const getNavLinks = () => {
    if (!isAuthenticated) return publicLinks;
    if (user?.role === 'client') return clientLinks;
    if (user?.role === 'photographer') return photographerLinks;
    if (user?.role === 'admin') return adminLinks;
    return publicLinks;
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-light bg-white shadow-sm sticky-top">
      <div className="container">
        <Link className="navbar-brand fw-bold text-primary" to="/" onClick={() => setExpanded(false)}>
          📸 BookYourShoot
        </Link>
        
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

        <div className={`collapse navbar-collapse ${expanded ? 'show' : ''}`} id="navbarNav">
          <ul className="navbar-nav mx-auto">
            {getNavLinks().map((link) => (
              <li className="nav-item" key={link.path}>
                <Link 
                  className={`nav-link ${isActive(link.path) ? 'active' : ''}`}
                  to={link.path}
                  onClick={() => setExpanded(false)}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="d-flex align-items-center">
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
                  <li><span className="dropdown-item-text text-muted">Role: {user?.role}</span></li>
                  <li><hr className="dropdown-divider" /></li>
                  <li>
                    <button className="dropdown-item" onClick={handleLogout}>
                      🚪 Logout
                    </button>
                  </li>
                </ul>
              </div>
            ) : (
              <div className="d-flex gap-2">
                <Link 
                  to="/login" 
                  className="btn btn-outline-primary"
                  onClick={() => setExpanded(false)}
                >
                  Login
                </Link>
                <Link 
                  to="/register" 
                  className="btn btn-primary"
                  onClick={() => setExpanded(false)}
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;