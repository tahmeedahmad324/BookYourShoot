import React from 'react';
import { Link } from 'react-router-dom';

const Features = () => {
  const features = [
    {
      icon: '📸',
      title: 'Book Photographers',
      description: 'Find and hire professional photographers for any occasion. Compare prices, portfolios, and reviews all in one place.',
      link: '/search',
      color: 'primary'
    },
    {
      icon: '🎨',
      title: 'Album Builder',
      description: 'Create beautiful photo albums with our smart builder. Organize, edit, and share your memories effortlessly.',
      link: '/client/album-builder',
      color: 'success'
    },
    {
      icon: '🎵',
      title: 'Reels & Music',
      description: 'Turn your photos into stunning video reels with perfect music suggestions. Professional effects and transitions included.',
      link: '/client/reel-generator',
      color: 'warning'
    },
    {
      icon: '🔧',
      title: 'Equipment Rental',
      description: 'Rent professional photography equipment at affordable rates. From cameras to lighting, we have everything you need.',
      link: '/photographer/equipment',
      color: 'info'
    }
  ];

  return (
    <section id="services" className="features-section py-5">
      <div className="container landing-container">
        {/* Section header */}
        <div className="text-center mb-5">
          <h2 className="section-title">Everything you need for perfect photos</h2>
          <p className="section-subtitle">
            Professional photography services and tools at your fingertips
          </p>
        </div>

        {/* Features grid */}
        <div className="row g-4">
          {features.map((feature, index) => (
            <div key={index} className="col-md-6 col-lg-3">
              <Link to={feature.link} className="feature-card-link" onClick={() => window.scrollTo(0, 0)}>
                <div className="card feature-card h-100">
                  <div className="card-body text-center">
                    {/* Feature icon */}
                    <div className={`feature-icon bg-${feature.color}-light text-${feature.color}`}>
                      {feature.icon}
                    </div>
                    
                    {/* Feature content */}
                    <h3 className="feature-title">{feature.title}</h3>
                    <p className="feature-description">
                      {feature.description}
                    </p>
                    
                    {/* Learn more link */}
                    <div className="feature-link">
                      Learn more →
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>

        {/* For Photographers CTA section */}
        <div className="text-center mt-5 py-5" id="for-photographers" style={{ background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)', borderRadius: '16px', padding: '4rem 2rem' }}>
          <div className="mb-4">
            <span style={{ fontSize: '3rem' }}>📸</span>
          </div>
          <h2 className="fw-bold mb-3">Are you a Professional Photographer?</h2>
          <p className="lead text-muted mb-4 mx-auto" style={{ maxWidth: '700px' }}>
            Join our network of verified photographers. Showcase your portfolio, connect with clients, 
            and grow your photography business with BookYourShoot.
          </p>
          <div className="row justify-content-center mb-4">
            <div className="col-md-3 col-6 text-center mb-3">
              <div className="fw-bold" style={{ fontSize: '2rem', color: 'var(--primary-purple)' }}>6,000+</div>
              <div className="small text-muted">Active Photographers</div>
            </div>
            <div className="col-md-3 col-6 text-center mb-3">
              <div className="fw-bold" style={{ fontSize: '2rem', color: 'var(--primary-purple)' }}>100k+</div>
              <div className="small text-muted">Bookings</div>
            </div>
            <div className="col-md-3 col-6 text-center mb-3">
              <div className="fw-bold" style={{ fontSize: '2rem', color: 'var(--primary-purple)' }}>4.8★</div>
              <div className="small text-muted">Average Rating</div>
            </div>
            <div className="col-md-3 col-6 text-center mb-3">
              <div className="fw-bold" style={{ fontSize: '2rem', color: 'var(--primary-purple)' }}>50+</div>
              <div className="small text-muted">Cities</div>
            </div>
          </div>
          <div className="d-flex justify-content-center gap-3 flex-wrap">
            <Link to="/register" className="btn btn-primary btn-lg px-5 py-3" onClick={() => window.scrollTo(0, 0)}>
              Join as Photographer
            </Link>
            <Link to="/search" className="btn btn-outline-primary btn-lg px-5 py-3" onClick={() => window.scrollTo(0, 0)}>
              Browse Photographers
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Features;
