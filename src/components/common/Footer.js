import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-dark text-white py-4 mt-5">
      <div className="container">
        <div className="row">
          <div className="col-md-4 mb-3">
            <h5 className="fw-bold">📸 BookYourShoot</h5>
            <p className="text-light">Connect with professional photographers for your special moments.</p>
          </div>
          <div className="col-md-4 mb-3">
            <h6>Quick Links</h6>
            <ul className="list-unstyled">
              <li><Link to="/search" className="text-light text-decoration-none">Find Photographers</Link></li>
              <li><Link to="/register" className="text-light text-decoration-none">Join as Photographer</Link></li>
              <li><Link to="/register" className="text-light text-decoration-none">Join as Client</Link></li>
            </ul>
          </div>
          <div className="col-md-4 mb-3">
            <h6>Contact</h6>
            <p className="text-light mb-1">📧 support@bookyourshoot.com</p>
            <p className="text-light mb-1">📞 +92-300-1234567</p>
            <p className="text-light">📍 Lahore, Pakistan</p>
          </div>
        </div>
        <hr className="border-secondary" />
        <div className="text-center">
          <p className="mb-0 text-light">© 2024 BookYourShoot. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
