import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import TermsModal from '../legal/TermsModal';
import PrivacyModal from '../legal/PrivacyModal';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  return (
    <footer className="site-footer">
      <div className="footer-content">
        <div className="container">
          <div className="row g-4">
            {/* Brand Section */}
            <div className="col-lg-4 col-md-6 mb-4">
              <div className="footer-brand">
                <h4 className="footer-logo">
                  <span className="logo-icon">📸</span>
                  BookYourShoot
                </h4>
                <p className="footer-tagline">
                  Pakistan's premier photography booking platform. Connect with verified professional photographers for your special moments.
                </p>
                <div className="footer-social">
                  <a href="#" className="social-link" aria-label="Facebook">
                    <i className="fab fa-facebook-f"></i>
                  </a>
                  <a href="#" className="social-link" aria-label="Instagram">
                    <i className="fab fa-instagram"></i>
                  </a>
                  <a href="#" className="social-link" aria-label="Twitter">
                    <i className="fab fa-twitter"></i>
                  </a>
                  <a href="#" className="social-link" aria-label="LinkedIn">
                    <i className="fab fa-linkedin-in"></i>
                  </a>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div className="col-lg-2 col-md-6 col-6 mb-4">
              <h5 className="footer-heading">Platform</h5>
              <ul className="footer-links">
                <li><Link to="/search">Find Photographers</Link></li>
                <li><Link to="/register?role=photographer">Join as Photographer</Link></li>
                <li><Link to="/register">Sign Up</Link></li>
                <li><Link to="/login">Login</Link></li>
              </ul>
            </div>

            {/* Support */}
            <div className="col-lg-2 col-md-6 col-6 mb-4">
              <h5 className="footer-heading">Support</h5>
              <ul className="footer-links">
                <li><Link to="/help">Help Center</Link></li>
                <li><Link to="/help/contact">Contact Us</Link></li>
                <li><button type="button" className="btn btn-link p-0 text-start" onClick={() => setShowTermsModal(true)}>Terms of Service</button></li>
                <li><button type="button" className="btn btn-link p-0 text-start" onClick={() => setShowPrivacyModal(true)}>Privacy Policy</button></li>
              </ul>
            </div>

            {/* Contact Info */}
            <div className="col-lg-4 col-md-6 mb-4">
              <h5 className="footer-heading">Get in Touch</h5>
              <ul className="footer-contact">
                <li>
                  <span className="contact-icon">✉️</span>
                  <a href="mailto:support@bookyourshoot.com">support@bookyourshoot.com</a>
                </li>
                <li>
                  <span className="contact-icon">📞</span>
                  <a href="tel:+923001234567">+92 300 1234567</a>
                </li>
                <li>
                  <span className="contact-icon">📍</span>
                  <span>Lahore, Pakistan</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="footer-bottom">
        <div className="container">
          <div className="footer-bottom-content">
            <p className="copyright">
              © {currentYear} BookYourShoot. All rights reserved.
            </p>
            <div className="footer-bottom-links">
              <button type="button" className="btn btn-link p-0" onClick={() => setShowTermsModal(true)}>Terms</button>
              <span className="separator">•</span>
              <button type="button" className="btn btn-link p-0" onClick={() => setShowPrivacyModal(true)}>Privacy</button>
              <span className="separator">•</span>
              <Link to="/help">Support</Link>
            </div>
          </div>
        </div>
      </div>
      
      {/* Legal Modals */}
      <TermsModal show={showTermsModal} onHide={() => setShowTermsModal(false)} />
      <PrivacyModal show={showPrivacyModal} onHide={() => setShowPrivacyModal(false)} />
    </footer>
  );
};

export default Footer;
