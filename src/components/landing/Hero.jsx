import React from 'react';
import { useNavigate } from 'react-router-dom';

// Search form removed per request
const Hero = () => {
  const navigate = useNavigate();

  const handleBookNow = () => {
    navigate('/search');
  };

  const handleJoinPhotographer = () => {
    navigate('/register?role=photographer');
  };

  const heroStyle = {
    backgroundImage: `
      linear-gradient(135deg, rgba(227, 242, 253, 0.55) 0%, rgba(200, 230, 255, 0.5) 40%, rgba(227, 242, 253, 0.85) 100%),
      url('/illustrations/landingPageBG1.jpg')
    `,
    backgroundSize: 'cover, 60% auto',
    backgroundPosition: 'center, left 5% bottom',
    backgroundRepeat: 'no-repeat, no-repeat'
  };

  return (
    <section className="hero-section" style={heroStyle}>
      {/* Floating circles */}
      <div className="hero-circle hero-circle-1"></div>
      <div className="hero-circle hero-circle-2"></div>
      <div className="hero-circle hero-circle-3"></div>
      <div className="hero-circle hero-circle-4"></div>
      
      <div className="container landing-container">
        <div className="row align-items-center">
          {/* Left column - Content */}
          <div className="col-lg-6 hero-content">
            <div className="hero-text">
              <h1 className="hero-title">
                Book a photographer, on your terms
              </h1>
              <p className="hero-subtitle">
                Search, compare and hire trusted photographers for weddings, portraits, events and more. Get professional photos at transparent prices.
              </p>
              
              {/* CTA Buttons */}
              <div className="hero-buttons">
                <button 
                  className="btn btn-primary btn-lg hero-cta-primary"
                  onClick={handleBookNow}
                >
                  Find Photographers
                </button>
                <button 
                  className="btn btn-outline-warning btn-lg hero-cta-secondary"
                  onClick={handleJoinPhotographer}
                >
                  Become a Photographer
                </button>
              </div>

              {/* Search form removed */}
            </div>
          </div>

          {/* Right column - Phone mockup */}
          <div className="col-lg-6 hero-image">
            <div className="phone-mockup-container">
              {/* Phone mockup */}
              <div className="phone-mockup">
                <div className="phone-frame">
                  <img 
                    src="/assets/phone-mockup.png" 
                    alt="BookYourShoot App"
                    className="phone-screen"
                  />
                  <div className="phone-content">
                    <div className="app-header">
                      <h5>BookYourShoot</h5>
                      <div className="rating">⭐ 4.8</div>
                    </div>
                    <div className="app-content">
                      <div className="photographer-card">
                        <div className="photographer-avatar">📸</div>
                        <div className="photographer-info">
                          <h6>Sarah Photography</h6>
                          <div className="rating">⭐ 4.9</div>
                          <div className="price">Rs. 15,000/day</div>
                        </div>
                      </div>
                      <div className="photographer-card">
                        <div className="photographer-avatar">🎥</div>
                        <div className="photographer-info">
                          <h6>Ahmed Studios</h6>
                          <div className="rating">⭐ 4.7</div>
                          <div className="price">Rs. 20,000/day</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating badges */}
              <div className="floating-badges">
                <div className="badge-item badge-photographers">
                  <span className="badge-icon">📸</span>
                  <div className="badge-content">
                    <div className="badge-number">6,000+</div>
                    <div className="badge-label">Photographers</div>
                  </div>
                </div>

                <div className="badge-item badge-rating">
                  <span className="badge-icon">⭐</span>
                  <div className="badge-content">
                    <div className="badge-number">4.8</div>
                    <div className="badge-label">Average Rating</div>
                  </div>
                </div>

                <div className="badge-item badge-bookings">
                  <span className="badge-icon">📅</span>
                  <div className="badge-content">
                    <div className="badge-number">100k+</div>
                    <div className="badge-label">Bookings</div>
                  </div>
                </div>

                <div className="badge-item badge-cities">
                  <span className="badge-icon">🏙️</span>
                  <div className="badge-content">
                    <div className="badge-number">50+</div>
                    <div className="badge-label">Cities</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
