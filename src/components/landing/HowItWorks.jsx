import React from 'react';
import { Link } from 'react-router-dom';

const HowItWorks = () => {
  const steps = [
    {
      number: 1,
      icon: '🔍',
      title: 'Search',
      description: 'Enter your location and service type. Browse through our network of verified photographers with detailed portfolios and reviews.',
      link: '/search',
      linkText: 'Start Searching'
    },
    {
      number: 2,
      icon: '📝',
      title: 'Request',
      description: 'Send booking requests to your chosen photographers. Discuss your requirements, get quotes, and compare offers before deciding.',
      link: '/register',
      linkText: 'Create Request'
    },
    {
      number: 3,
      icon: '✅',
      title: 'Confirm',
      description: 'Book your photographer securely through our platform. Make payments safely and track your booking status until completion.',
      link: '/client/bookings',
      linkText: 'View Bookings'
    }
  ];

  return (
    <section id="how-it-works" className="how-it-works-section py-5 bg-light">
      <div className="container landing-container">
        {/* Section header */}
        <div className="text-center mb-5">
          <h2 className="section-title">How it works</h2>
          <p className="section-subtitle">
            Book your perfect photographer in 3 simple steps
          </p>
        </div>

        {/* Steps grid */}
        <div className="row g-4">
          {steps.map((step, index) => (
            <div key={index} className="col-md-4">
              <div className="step-card text-center">
                {/* Step number */}
                <div className="step-number">
                  {step.number}
                </div>

                {/* Step icon */}
                <div className="step-icon">
                  {step.icon}
                </div>

                {/* Step content */}
                <h3 className="step-title">{step.title}</h3>
                <p className="step-description">
                  {step.description}
                </p>

                {/* Step link */}
                <Link to={step.link} className="step-link">
                  {step.linkText} →
                </Link>

                {/* Connection line (for desktop) */}
                {index < steps.length - 1 && (
                  <div className="step-connector d-none d-md-block"></div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-5">
          <div className="cta-card bg-white p-4 rounded-3 shadow-sm">
            <h4 className="mb-3">Ready to get started?</h4>
            <p className="text-muted mb-4">
              Join thousands of happy customers who have found their perfect photographer through BookYourShoot
            </p>
            <div className="d-flex justify-content-center gap-3 flex-wrap">
              <Link to="/search" className="btn btn-primary">
                Find Photographers
              </Link>
              <Link to="/register" className="btn btn-outline-primary">
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;