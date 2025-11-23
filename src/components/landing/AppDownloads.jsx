import React from 'react';

const AppDownloads = () => {
  return (
    <section className="app-downloads-section py-5 bg-primary text-white">
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
                  <span className="feature-icon">🌐</span>
                  <span>Works in any browser - no installation needed</span>
                </div>
                <div className="app-feature">
                  <span className="feature-icon">📱</span>
                  <span>Responsive design for mobile, tablet & desktop</span>
                </div>
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
                  <span className="feature-icon">⭐</span>
                  <span>Verified photographer reviews and ratings</span>
                </div>
              </div>

              {/* Web features call-to-action */}
              <div className="download-buttons mt-4">
                <a
                  href="/photographers"
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

          {/* Right column - Browser mockup */}
          <div className="col-lg-6">
            <div className="app-mockup">
              <div className="app-phone">
                <div className="app-screen">
                  {/* Browser interface mockup */}
                  <div className="app-header">
                    <h5>BookYourShoot</h5>
                    <div className="app-menu">⋮</div>
                  </div>
                  <div className="app-body">
                    <div className="search-bar">
                      <span>📍</span>
                      <span>City: Lahore</span>
                      <span>📸</span>
                      <span>Event: Wedding</span>
                    </div>
                    <div className="app-content">
                      <div className="photographer-item">
                        <div className="photographer-avatar">📷</div>
                        <div className="photographer-details">
                          <h6>Sarah Photography</h6>
                          <div className="rating">⭐ 4.9 (127 reviews)</div>
                          <div className="price">Rs. 15,000/day</div>
                        </div>
                        <button className="book-btn">View Profile</button>
                      </div>
                      <div className="photographer-item">
                        <div className="photographer-avatar">📷</div>
                        <div className="photographer-details">
                          <h6>Ahmed Studios</h6>
                          <div className="rating">⭐ 4.7 (89 reviews)</div>
                          <div className="price">Rs. 20,000/day</div>
                        </div>
                        <button className="book-btn">View Profile</button>
                      </div>
                      <div className="photographer-item">
                        <div className="photographer-avatar">📷</div>
                        <div className="photographer-details">
                          <h6>Elite Moments</h6>
                          <div className="rating">⭐ 4.8 (203 reviews)</div>
                          <div className="price">Rs. 25,000/day</div>
                        </div>
                        <button className="book-btn">View Profile</button>
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