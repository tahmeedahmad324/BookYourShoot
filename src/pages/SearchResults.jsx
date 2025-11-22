import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { searchPhotographers } from '../services/mockAPI';

const SearchResults = () => {
  const [searchParams] = useSearchParams();
  const [photographers, setPhotographers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const city = searchParams.get('city') || '';
  const service = searchParams.get('service') || 'all';

  useEffect(() => {
    const fetchResults = async () => {
      try {
        setLoading(true);
        setError(null);
        const results = await searchPhotographers(city, service);
        setPhotographers(results);
      } catch (err) {
        setError('Failed to load search results. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (city) {
      fetchResults();
    } else {
      setLoading(false);
    }
  }, [city, service]);

  if (loading) {
    return (
      <div className="search-results py-5">
        <div className="container landing-container">
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-3">Searching photographers...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="search-results py-5">
        <div className="container landing-container">
          <div className="text-center py-5">
            <h3 className="text-danger mb-3">Error</h3>
            <p>{error}</p>
            <button 
              className="btn btn-primary"
              onClick={() => window.location.reload()}
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!city) {
    return (
      <div className="search-results py-5">
        <div className="container landing-container">
          <div className="text-center py-5">
            <h3>No Search Parameters</h3>
            <p>Please specify a city to search for photographers.</p>
            <Link to="/" className="btn btn-primary">
              Back to Search
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="search-results py-5">
      <div className="container landing-container">
        {/* Header */}
        <div className="text-center mb-5">
          <h2 className="section-title">
            Photographers in {city}
            {service !== 'all' && ` for ${service}`}
          </h2>
          <p className="section-subtitle">
            {photographers.length} photographer{photographers.length !== 1 ? 's' : ''} found
          </p>
        </div>

        {/* Results */}
        {photographers.length === 0 ? (
          <div className="text-center py-5">
            <div className="mb-4" style={{ fontSize: '4rem' }}>📸</div>
            <h4 className="mb-3">No photographers found</h4>
            <p className="text-muted mb-4">
              Try adjusting your search criteria or search in a different city.
            </p>
            <Link to="/" className="btn btn-primary">
              Back to Search
            </Link>
          </div>
        ) : (
          <div className="row g-4">
            {photographers.map((photographer) => (
              <div key={photographer.id} className="col-md-6 col-lg-4">
                <div className="card photographer-card h-100">
                  <div className="card-body">
                    <div className="text-center mb-3">
                      <div className="photographer-avatar-large">
                        👤
                      </div>
                      <h5 className="card-title">{photographer.name}</h5>
                      <p className="text-muted">{photographer.location}</p>
                    </div>

                    <div className="photographer-info">
                      <div className="info-row">
                        <span className="info-label">Rating:</span>
                        <span className="info-value">
                          ⭐ {photographer.rating} ({photographer.reviews_count} reviews)
                        </span>
                      </div>
                      
                      <div className="info-row">
                        <span className="info-label">Experience:</span>
                        <span className="info-value">{photographer.experience} years</span>
                      </div>
                      
                      <div className="info-row">
                        <span className="info-label">Specialty:</span>
                        <span className="info-value">{photographer.specialty.join(', ')}</span>
                      </div>
                      
                      <div className="info-row">
                        <span className="info-label">Rate:</span>
                        <span className="info-value">Rs. {photographer.hourly_rate}/hour</span>
                      </div>
                      
                      <div className="info-row">
                        <span className="info-label">Response Time:</span>
                        <span className="info-value">{photographer.response_time}</span>
                      </div>
                    </div>

                    <div className="photographer-badges mt-3">
                      {photographer.verified && (
                        <span className="badge bg-success">✓ Verified</span>
                      )}
                      {photographer.availability && (
                        <span className="badge bg-primary">Available</span>
                      )}
                      {!photographer.availability && (
                        <span className="badge bg-secondary">Busy</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="card-footer bg-white border-0">
                    <div className="d-grid gap-2">
                      <Link 
                        to={`/photographer/${photographer.id}`}
                        className="btn btn-outline-primary"
                      >
                        View Profile
                      </Link>
                      {photographer.availability && (
                        <button className="btn btn-primary">
                          Book Now
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer CTA */}
        <div className="text-center mt-5 pt-4 border-top">
          <h4 className="mb-3">Can't find what you're looking for?</h4>
          <p className="text-muted mb-4">
            Try expanding your search or contact us for personalized recommendations.
          </p>
          <div className="d-flex justify-content-center gap-3">
            <Link to="/" className="btn btn-outline-primary">
              New Search
            </Link>
            <Link to="/contact" className="btn btn-primary">
              Contact Support
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchResults;