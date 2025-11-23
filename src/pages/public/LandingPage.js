import React from 'react';
import { Link } from 'react-router-dom';

const LandingPage = () => {
  return (
    <div className="landing-page">
      {/* Hero Section */}
      <section className="gradient-header text-center">
        <div className="container">
          <div className="row align-items-center min-vh-100">
            <div className="col-lg-6">
              <div className="fade-in">
                <h1 className="display-4 fw-bold mb-4">
                  Capture Your Perfect Moments with Professional Photographers
                </h1>
                <p className="lead mb-5">
                  Book talented photographers for weddings, portraits, events, and more. 
                  Verified professionals, transparent pricing, and beautiful memories guaranteed.
                </p>
                <div className="d-flex gap-3 justify-content-center flex-wrap">
                  <Link to="/register" className="btn btn-light btn-lg px-4 py-3">
                    📸 Book a Photographer
                  </Link>
                  <Link to="/search" className="btn btn-outline-light btn-lg px-4 py-3">
                    🔍 Browse Photographers
                  </Link>
                </div>
              </div>
            </div>
            <div className="col-lg-6">
              <div className="hero-image fade-in">
                <div 
                  className="rounded-4 p-5 bg-white bg-opacity-10 backdrop-blur-sm"
                  style={{
                    minHeight: '400px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '6rem',
                    opacity: 0.9
                  }}
                >
                  📷
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Role Selection Section */}
      <section className="py-5 bg-light">
        <div className="container">
          <div className="text-center mb-5">
            <h2 className="fw-bold mb-3">Join Our Photography Community</h2>
            <p className="text-muted">Choose your role and get started today</p>
          </div>
          
          <div className="row g-4">
            <div className="col-md-6">
              <div className="card h-100 border-0 shadow-sm hover-lift">
                <div className="card-body text-center p-4">
                  <div className="text-primary mb-3" style={{ fontSize: '3rem' }}>
                    👤
                  </div>
                  <h3 className="card-title fw-bold mb-3">Looking for a Photographer?</h3>
                  <p className="card-text text-muted mb-4">
                    Find and book verified professional photographers for your special events. 
                    Browse portfolios, compare prices, and book with confidence.
                  </p>
                  <Link to="/register" className="btn btn-primary">
                    Join as Client
                  </Link>
                </div>
              </div>
            </div>
            
            <div className="col-md-6">
              <div className="card h-100 border-0 shadow-sm hover-lift">
                <div className="card-body text-center p-4">
                  <div className="text-primary mb-3" style={{ fontSize: '3rem' }}>
                    📸
                  </div>
                  <h3 className="card-title fw-bold mb-3">Are you a Photographer?</h3>
                  <p className="card-text text-muted mb-4">
                    Showcase your portfolio, connect with clients, and grow your photography business. 
                    Join our network of verified professionals.
                  </p>
                  <Link to="/register" className="btn btn-secondary">
                    Join as Photographer
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-5">
        <div className="container">
          <div className="text-center mb-5">
            <h2 className="fw-bold mb-3">Why Choose BookYourShoot?</h2>
            <p className="text-muted">The best platform for photography services</p>
          </div>
          
          <div className="row g-4">
            <div className="col-md-4">
              <div className="text-center">
                <div className="feature-icon mb-3">
                  <span className="badge bg-primary rounded-circle p-3" style={{ fontSize: '2rem' }}>
                    ✅
                  </span>
                </div>
                <h4 className="fw-bold mb-3">Verified Professionals</h4>
                <p className="text-muted">
                  All photographers are verified with ID checks and portfolio reviews to ensure quality service.
                </p>
              </div>
            </div>
            
            <div className="col-md-4">
              <div className="text-center">
                <div className="feature-icon mb-3">
                  <span className="badge bg-primary rounded-circle p-3" style={{ fontSize: '2rem' }}>
                    💰
                  </span>
                </div>
                <h4 className="fw-bold mb-3">Transparent Pricing</h4>
                <p className="text-muted">
                  Clear pricing with no hidden fees. Compare rates and choose the best photographer for your budget.
                </p>
              </div>
            </div>
            
            <div className="col-md-4">
              <div className="text-center">
                <div className="feature-icon mb-3">
                  <span className="badge bg-primary rounded-circle p-3" style={{ fontSize: '2rem' }}>
                    🎨
                  </span>
                </div>
                <h4 className="fw-bold mb-3">Creative Tools</h4>
                <p className="text-muted">
                  Smart album builder, reel generator, and music suggestions to make your memories perfect.
                </p>
              </div>
            </div>
            
            <div className="col-md-4">
              <div className="text-center">
                <div className="feature-icon mb-3">
                  <span className="badge bg-primary rounded-circle p-3" style={{ fontSize: '2rem' }}>
                    💬
                  </span>
                </div>
                <h4 className="fw-bold mb-3">Direct Communication</h4>
                <p className="text-muted">
                  Chat directly with photographers to discuss your requirements and vision.
                </p>
              </div>
            </div>
            
            <div className="col-md-4">
              <div className="text-center">
                <div className="feature-icon mb-3">
                  <span className="badge bg-primary rounded-circle p-3" style={{ fontSize: '2rem' }}>
                    ⭐
                  </span>
                </div>
                <h4 className="fw-bold mb-3">Reviews & Ratings</h4>
                <p className="text-muted">
                  Read genuine reviews from previous clients to make informed decisions.
                </p>
              </div>
            </div>
            
            <div className="col-md-4">
              <div className="text-center">
                <div className="feature-icon mb-3">
                  <span className="badge bg-primary rounded-circle p-3" style={{ fontSize: '2rem' }}>
                    🔧
                  </span>
                </div>
                <h4 className="fw-bold mb-3">Equipment Rental</h4>
                <p className="text-muted">
                  Rent professional photography equipment for your shoots at affordable prices.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Preview Section */}
      <section className="py-5 bg-light">
        <div className="container">
          <div className="text-center mb-5">
            <h2 className="fw-bold mb-3">Photography Services</h2>
            <p className="text-muted">Professional photography for every occasion</p>
          </div>
          
          <div className="row g-4">
            {[
              { icon: '💒', name: 'Wedding Photography', desc: 'Capture your special day with professional wedding photography' },
              { icon: '👨‍👩‍👧‍👦', name: 'Portrait Photography', desc: 'Beautiful portraits for individuals and families' },
              { icon: '🎉', name: 'Event Photography', desc: 'Corporate events, birthdays, and special occasions' },
              { icon: '🏢', name: 'Product Photography', desc: 'Professional product shots for businesses' },
              { icon: '🏗️', name: 'Real Estate Photography', desc: 'Stunning property photos for real estate listings' },
              { icon: '🎓', name: 'Graduation Photography', desc: 'Celebrate academic achievements with style' }
            ].map((service, index) => (
              <div className="col-md-6 col-lg-4" key={index}>
                <div className="card h-100 border-0 shadow-sm">
                  <div className="card-body text-center p-4">
                    <div className="text-primary mb-3" style={{ fontSize: '2.5rem' }}>
                      {service.icon}
                    </div>
                    <h5 className="card-title fw-bold">{service.name}</h5>
                    <p className="card-text text-muted small">{service.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-5">
        <div className="container">
          <div className="text-center">
            <div className="gradient-header rounded-4 p-5">
              <h2 className="fw-bold mb-3">Ready to Capture Your Moments?</h2>
              <p className="lead mb-4">
                Join thousands of satisfied clients who have found their perfect photographer through BookYourShoot.
              </p>
              <div className="d-flex gap-3 justify-content-center flex-wrap">
                <Link to="/register" className="btn btn-light btn-lg px-4 py-3">
                  Get Started Now
                </Link>
                <Link to="/search" className="btn btn-outline-light btn-lg px-4 py-3">
                  Browse Photographers
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
