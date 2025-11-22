import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    company: [
      { name: 'About Us', href: '/about' },
      { name: 'Careers', href: '/careers' },
      { name: 'Press', href: '/press' },
      { name: 'Contact', href: '/contact' }
    ],
    forPhotographers: [
      { name: 'Join as Photographer', href: '/register?role=photographer' },
      { name: 'Photographer Dashboard', href: '/photographer/dashboard' },
      { name: 'Equipment Rental', href: '/photographer/equipment' },
      { name: 'Travel Calculator', href: '/photographer/travel' }
    ],
    support: [
      { name: 'Help Center', href: '/help' },
      { name: 'Safety Guidelines', href: '/safety' },
      { name: 'Cancellation Policy', href: '/cancellation' },
      { name: 'Terms of Service', href: '/terms' },
      { name: 'Privacy Policy', href: '/privacy' }
    ],
    social: [
      { name: 'Facebook', icon: '📘', href: '#' },
      { name: 'Instagram', icon: '📷', href: '#' },
      { name: 'Twitter', icon: '🐦', href: '#' },
      { name: 'LinkedIn', icon: '💼', href: '#' }
    ]
  };

  return (
    <footer className="footer">
      <div className="container landing-container">
        {/* Main footer content */}
        <div className="footer-main py-5">
          <div className="row">
            {/* Brand column */}
            <div className="col-lg-3 mb-4 mb-lg-0">
              <div className="footer-brand">
                <img 
                  src="/assets/BookyourShoot.png" 
                  alt="BookYourShoot" 
                  height="40"
                  className="mb-3"
                />
                <p className="footer-description">
                  Book trusted photographers for any occasion. Professional services, transparent pricing, and secure bookings.
                </p>
                
                {/* App download mini CTA */}
                <div className="app-download-cta mt-3">
                  <p className="small mb-2">Get our mobile app</p>
                  <div className="d-flex gap-2">
                    <button className="btn btn-sm btn-outline-light">
                      📱 iOS
                    </button>
                    <button className="btn btn-sm btn-outline-light">
                      🤖 Android
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Company links */}
            <div className="col-lg-2 col-md-6 mb-4 mb-md-0">
              <h5 className="footer-title">Company</h5>
              <ul className="footer-links list-unstyled">
                {footerLinks.company.map((link, index) => (
                  <li key={index}>
                    <Link to={link.href} className="footer-link">
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* For Photographers links */}
            <div className="col-lg-2 col-md-6 mb-4 mb-md-0">
              <h5 className="footer-title">For Photographers</h5>
              <ul className="footer-links list-unstyled">
                {footerLinks.forPhotographers.map((link, index) => (
                  <li key={index}>
                    <Link to={link.href} className="footer-link">
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Support links */}
            <div className="col-lg-2 col-md-6 mb-4 mb-md-0">
              <h5 className="footer-title">Support</h5>
              <ul className="footer-links list-unstyled">
                {footerLinks.support.map((link, index) => (
                  <li key={index}>
                    <Link to={link.href} className="footer-link">
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Connect with us */}
            <div className="col-lg-3 col-md-6">
              <h5 className="footer-title">Connect with us</h5>
              <p className="footer-description mb-3">
                Follow us on social media for photography tips, featured photographers, and exclusive offers.
              </p>
              <div className="social-links">
                {footerLinks.social.map((social, index) => (
                  <a 
                    key={index}
                    href={social.href}
                    className="social-link"
                    aria-label={social.name}
                  >
                    <span className="social-icon">{social.icon}</span>
                  </a>
                ))}
              </div>
              
              {/* Newsletter signup */}
              <div className="newsletter-signup mt-4">
                <h6 className="mb-2">Stay updated</h6>
                <div className="input-group">
                  <input 
                    type="email" 
                    className="form-control" 
                    placeholder="Enter email"
                    aria-label="Email for newsletter"
                  />
                  <button className="btn btn-primary" type="button">
                    Subscribe
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer bottom */}
        <div className="footer-bottom border-top pt-4">
          <div className="row align-items-center">
            <div className="col-md-6">
              <div className="copyright">
                <p className="mb-0">
                  © {currentYear} BookYourShoot. All rights reserved.
                </p>
              </div>
            </div>
            <div className="col-md-6">
              <div className="footer-bottom-links text-md-end">
                <a href="/terms" className="footer-bottom-link">Terms</a>
                <span className="separator">•</span>
                <a href="/privacy" className="footer-bottom-link">Privacy</a>
                <span className="separator">•</span>
                <a href="/cookies" className="footer-bottom-link">Cookies</a>
                <span className="separator">•</span>
                <a href="/sitemap" className="footer-bottom-link">Sitemap</a>
              </div>
            </div>
          </div>
        </div>

        {/* Trust indicators */}
        <div className="footer-trust mt-4 pt-4 border-top">
          <div className="row text-center">
            <div className="col-6 col-md-3 mb-3">
              <div className="trust-indicator">
                <span className="trust-icon">🔒</span>
                <span className="trust-text">Secure Payments</span>
              </div>
            </div>
            <div className="col-6 col-md-3 mb-3">
              <div className="trust-indicator">
                <span className="trust-icon">✓</span>
                <span className="trust-text">Verified Photographers</span>
              </div>
            </div>
            <div className="col-6 col-md-3 mb-3">
              <div className="trust-indicator">
                <span className="trust-icon">💬</span>
                <span className="trust-text">24/7 Support</span>
              </div>
            </div>
            <div className="col-6 col-md-3 mb-3">
              <div className="trust-indicator">
                <span className="trust-icon">🔄</span>
                <span className="trust-text">Money Back Guarantee</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;