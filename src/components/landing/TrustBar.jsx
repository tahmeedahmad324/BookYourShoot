import React from 'react';

const TrustBar = () => {
  const stats = [
    { number: '50+', label: 'Cities' },
    { number: '100k+', label: 'Bookings' },
    { number: '6,000+', label: 'Photographers' },
    { number: '4.8★', label: 'Rating' },
    { number: '24/7', label: 'Support' }
  ];

  const partners = [
    { name: 'Chrome Web Store', icon: '🌐' },
    { name: 'Web Platform', icon: '💻' },
    { name: 'PayPal', icon: '💳' },
    { name: 'SSL Secure', icon: '🔒' }
  ];

  return (
    <section id="trust" className="trust-bar-section py-4 bg-white border-top">
      <div className="container landing-container">
        {/* Stats bar */}
        <div className="trust-stats mb-4">
          <div className="row text-center">
            {stats.map((stat, index) => (
              <div key={index} className="col-6 col-md">
                <div className="trust-stat">
                  <div className="stat-number">{stat.number}</div>
                  <div className="stat-label">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Partner badges */}
        <div className="trust-partners">
          <div className="row align-items-center justify-content-center">
            <div className="col-12 text-center mb-3">
              <div className="trust-title">Trusted by leading platforms</div>
            </div>
            {partners.map((partner, index) => (
              <div key={index} className="col-6 col-md-3 text-center mb-3">
                <div className="partner-badge">
                  <span className="partner-icon">{partner.icon}</span>
                  <span className="partner-name">{partner.name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Trust badges row */}
        <div className="trust-badges mt-4">
          <div className="row justify-content-center">
            <div className="col-12 text-center">
              <div className="badges-container">
                <span className="trust-badge">
                  <span className="badge-icon">✓</span>
                  Verified Photographers
                </span>
                <span className="trust-badge">
                  <span className="badge-icon">✓</span>
                  Secure Payments
                </span>
                <span className="trust-badge">
                  <span className="badge-icon">✓</span>
                  Money Back Guarantee
                </span>
                <span className="trust-badge">
                  <span className="badge-icon">✓</span>
                  24/7 Customer Support
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TrustBar;
