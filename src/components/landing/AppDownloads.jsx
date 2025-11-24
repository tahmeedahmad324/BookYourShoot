import React from 'react';

const AppDownloads = () => {
  return (
    <section className="app-downloads-section" style={{ paddingTop: '3rem', paddingBottom: '3rem', marginBottom: 0 }}>
      <div className="container landing-container">
        <div className="row align-items-center">
          {/* Left column - Content */}
          <div className="col-lg-6">
            <div className="app-content">
              <h2 className="app-title">
                BookYourShoot Web Platform
              </h2>
              <p className="app-subtitle">
                Access our complete photography booking service directly in your web browser. No download required - works on any device, anywhere.
              </p>

              {/* Web platform features */}
              <div className="app-features">
                <div className="app-feature">
                  <span className="feature-icon">💬</span>
                  <span>Real-time photographer chat and messaging</span>
                </div>
                <div className="app-feature">
                  <span className="feature-icon">📍</span>
                  <span>Location-based photographer discovery</span>
                </div>
                <div className="app-feature">
                  <span className="feature-icon">💰</span>
                  <span>Secure online payment processing</span>
                </div>
                <div className="app-feature">
                  <span className="feature-icon">📷</span>
                  <span>Professional equipment rental marketplace</span>
                </div>
              </div>

              {/* Web features call-to-action */}
              <div className="download-buttons mt-4">
                <a
                  href="/search"
                  className="download-button"
                  aria-label="Browse photographers"
                >
                  <div className="download-text">
                    <div className="download-large">Browse Photographers</div>
                    <div className="download-small">Start exploring now</div>
                  </div>
                </a>

                <a
                  href="/register"
                  className="download-button"
                  aria-label="Sign up for free"
                >
                  <div className="download-text">
                    <div className="download-large">Join Free</div>
                    <div className="download-small">Create your account</div>
                  </div>
                </a>
              </div>
            </div>
          </div>

          {/* Right column - Device mockups */}
          <div className="col-lg-6">
            <div className="app-mockup-container">
              {/* Laptop mockup */}
              <div className="app-laptop">
                <div className="laptop-screen">
                  <div className="browser-bar">
                    <div className="browser-dots">
                      <span className="dot red"></span>
                      <span className="dot yellow"></span>
                      <span className="dot green"></span>
                    </div>
                    <div className="browser-url">bookyourshoot.com</div>
                  </div>
                  <div className="laptop-content">
                    <div className="dashboard-header">
                      <h6>My Dashboard</h6>
                      <span className="badge-notifications">3 New</span>
                    </div>
                    <div className="dashboard-stats">
                      <div className="stat-card">
                        <div className="stat-number">12</div>
                        <div className="stat-label">Bookings</div>
                      </div>
                      <div className="stat-card">
                        <div className="stat-number">8</div>
                        <div className="stat-label">Reviews</div>
                      </div>
                    </div>
                    <div className="recent-activity">
                      <div className="activity-item">
                        <span>📸</span>
                        <span>New booking request</span>
                      </div>
                      <div className="activity-item">
                        <span>⭐</span>
                        <span>Client left a review</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mobile mockup */}
              <div className="app-phone">
                <div className="phone-notch"></div>
                <div className="app-screen">
                  <div className="app-header">
                    <h5>BookYourShoot</h5>
                    <div className="app-menu">⋮</div>
                  </div>
                  <div className="app-body">
                    <div className="search-bar">
                      <span>📍</span>
                      <span style={{ color: 'black' }}>Lahore</span>
                      <span>📸</span>
                      <span style={{ color: 'black' }}>Wedding</span>
                    </div>
                    <div className="app-content">
                      <div className="photographer-item">
                        <div className="photographer-avatar">📷</div>
                        <div className="photographer-details">
                          <h6>Sarah Photography</h6>
                          <div className="rating">⭐ 4.9</div>
                          <div className="price">Rs. 15,000</div>
                        </div>
                      </div>
                      <div className="photographer-item">
                        <div className="photographer-avatar">📷</div>
                        <div className="photographer-details">
                          <h6>Ahmed Studios</h6>
                          <div className="rating">⭐ 4.7</div>
                          <div className="price">Rs. 20,000</div>
                        </div>
                      </div>
                    </div>
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

export default AppDownloads;
