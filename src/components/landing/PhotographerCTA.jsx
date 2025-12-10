import React from 'react';
import { Link } from 'react-router-dom';

const PhotographerCTA = () => {
  return (
    <section className="features-section py-5">
      <div className="container landing-container">
        {/* For Photographers CTA section - Split Layout */}
        <div className="photographer-cta-card" id="for-photographers">
          {/* Left Column - Image */}
          <div className="photographer-cta-image">
            <img 
              src="/illustrations/proPhotographer.jpg" 
              alt="Professional Photographer"
              className="photographer-image"
            />
            <div className="photographer-image-overlay"></div>
          </div>
          
          {/* Right Column - Content */}
          <div className="photographer-cta-content">
            <h2 className="photographer-cta-title">Are you a Professional Photographer?</h2>
            <p className="photographer-cta-description">
              Join our network of verified photographers. Showcase your portfolio, connect with clients, 
              and grow your photography business with BookYourShoot.
            </p>
            
            {/* Stats Grid - 2x2 */}
            <div className="photographer-stats-grid">
              <div className="stat-item">
                <div className="stat-number">6,000+</div>
                <div className="stat-label">Active Photographers</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">100k+</div>
                <div className="stat-label">Bookings</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">4.8★</div>
                <div className="stat-label">Average Rating</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">50+</div>
                <div className="stat-label">Cities</div>
              </div>
            </div>
            
            {/* CTA Buttons */}
            <div className="photographer-cta-buttons">
              <Link to="/register" className="btn btn-primary btn-lg px-5 py-3" onClick={() => window.scrollTo(0, 0)}>
                Join as Photographer
              </Link>
              <Link to="/search" className="btn btn-outline-primary btn-lg px-5 py-3" onClick={() => window.scrollTo(0, 0)}>
                Browse Photographers
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PhotographerCTA;
