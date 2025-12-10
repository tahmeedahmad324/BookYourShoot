import React from 'react';
import { Link } from 'react-router-dom';

const Features = () => {
  const features = [
    {
      imageSrc: '/illustrations/bookPhotographer.jpg',
      title: 'Book Photographers',
      description: 'Find and hire professional photographers for any occasion. Compare prices, portfolios, and reviews all in one place.',
      link: '/search',
      color: 'primary'
    },
    {
      imageSrc: '/illustrations/AlbumBuilder.jpg',
      title: 'Album Builder',
      description: 'Create beautiful photo albums with our smart builder. Organize, edit, and share your memories effortlessly.',
      link: '/client/album-builder',
      color: 'success'
    },
    {
      imageSrc: '/illustrations/Generatereel.jpg',
      title: 'Reel Generator',
      description: 'Turn your photos into stunning video reels with professional effects and transitions. Perfect for social media sharing.',
      link: '/client/reel-generator',
      color: 'warning'
    },
    {
      imageSrc: '/illustrations/musicSuggestion.jpg',
      title: 'Music Suggestions',
      description: 'Get event-specific music recommendations from Spotify. Perfect playlists for Mehndi, Wedding, Birthday, and more.',
      link: '/client/music-suggestion',
      color: 'danger'
    },
    {
      imageSrc: '/illustrations/equipment.jpg',
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
        <div className="row g-4 justify-content-center">
          {features.map((feature, index) => (
            <div key={index} className="col-sm-6 col-md-4 col-lg-custom-5">
              <Link to={feature.link} className="feature-card-link" onClick={() => window.scrollTo(0, 0)}>
                <div className="card feature-card h-100">
                  {/* Header Image */}
                  <div className="feature-card-header">
                    <img 
                      src={feature.imageSrc} 
                      alt={feature.title}
                      className="feature-card-image"
                    />
                    <div className="feature-card-overlay"></div>
                  </div>
                  
                  {/* Card Content */}
                  <div className="feature-card-content">
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
      </div>
    </section>
  );
};

export default Features;
