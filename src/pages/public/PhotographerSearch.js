import React, { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import photographersData from '../../data/photographers.json';
import citiesData from '../../data/cities.json';

const PhotographerSearch = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [location, setLocation] = useState(searchParams.get('location') || '');
  const [service, setService] = useState(searchParams.get('service') || '');
  const [priceRange, setPriceRange] = useState([searchParams.get('minPrice') || 0, searchParams.get('maxPrice') || 10000]);
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'rating');
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(false);
  const [filteredPhotographers, setFilteredPhotographers] = useState(photographersData.photographers);

  // Auto-complete state
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const searchInputRef = useRef(null);

  const photographers = photographersData.photographers;
  const cities = citiesData.cities;
  const services = citiesData.services;

  useEffect(() => {
    filterPhotographers();
  }, [searchTerm, location, service, priceRange, sortBy]);

  const filterPhotographers = () => {
    setLoading(true);
    
    // Simulate API delay
    setTimeout(() => {
      let filtered = photographers.filter(photographer => {
        const matchesSearch = !searchTerm || 
          photographer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          photographer.specialty.some(spec => spec.toLowerCase().includes(searchTerm.toLowerCase()));
        
        const matchesLocation = !location || photographer.location.toLowerCase().includes(location.toLowerCase());
        
        const matchesService = !service || 
          photographer.specialty.some(spec => spec.toLowerCase().includes(service.toLowerCase()));
        
        const matchesPrice = photographer.hourly_rate >= priceRange[0] && photographer.hourly_rate <= priceRange[1];
        
        return matchesSearch && matchesLocation && matchesService && matchesPrice;
      });

      // Sort photographers
      filtered.sort((a, b) => {
        switch (sortBy) {
          case 'rating':
            return b.rating - a.rating;
          case 'price_low':
            return a.hourly_rate - b.hourly_rate;
          case 'price_high':
            return b.hourly_rate - a.hourly_rate;
          case 'experience':
            return b.experience - a.experience;
          case 'reviews':
            return b.reviews_count - a.reviews_count;
          default:
            return 0;
        }
      });

      setFilteredPhotographers(filtered);
      setLoading(false);
    }, 300);
  };

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchTerm) params.set('search', searchTerm);
    if (location) params.set('location', location);
    if (service) params.set('service', service);
    if (priceRange[0] > 0) params.set('minPrice', priceRange[0]);
    if (priceRange[1] < 10000) params.set('maxPrice', priceRange[1]);
    params.set('sort', sortBy);
    setSearchParams(params);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setLocation('');
    setService('');
    setPriceRange([0, 10000]);
    setSortBy('rating');
    setSearchParams({});
  };

  const getStarRating = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    
    for (let i = 0; i < fullStars; i++) {
      stars.push('⭐');
    }
    if (hasHalfStar) {
      stars.push('⭐');
    }
    for (let i = stars.length; i < 5; i++) {
      stars.push('☆');
    }
    return stars.join('');
  };

  return (
    <div className="photographer-search py-4">
      <div className="container">
        {/* Search Header */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="gradient-header rounded-3 p-4">
              <h1 className="fw-bold mb-3">Find Professional Photographers</h1>
              <p className="lead mb-4">Discover talented photographers for your special moments</p>
              
              {/* Main Search Bar */}
              <div className="row g-2">
                <div className="col-md-4">
                  <div className="input-group">
                    <span className="input-group-text">🔍</span>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Search photographers, services..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="input-group">
                    <span className="input-group-text">📍</span>
                    <select 
                      className="form-select"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                    >
                      <option value="">All Cities</option>
                      {cities.map(city => (
                        <option key={city.id} value={city.name}>{city.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="input-group">
                    <span className="input-group-text">📸</span>
                    <select 
                      className="form-select"
                      value={service}
                      onChange={(e) => setService(e.target.value)}
                    >
                      <option value="">All Services</option>
                      {services.map(srv => (
                        <option key={srv} value={srv}>{srv}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="col-md-2">
                  <button 
                    className="btn btn-primary w-100"
                    onClick={handleSearch}
                  >
                    Search
                  </button>
                </div>
              </div>
              
              {/* Filter Toggle */}
              <div className="mt-3">
                <button 
                  className="btn btn-outline-light btn-sm"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  {showFilters ? 'Hide Filters' : 'Show Advanced Filters'}
                </button>
                {(searchTerm || location || service || priceRange[0] > 0 || priceRange[1] < 10000) && (
                  <button 
                    className="btn btn-outline-light btn-sm ms-2"
                    onClick={clearFilters}
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="row">
          {/* Filters Sidebar */}
          {showFilters && (
            <div className="col-lg-3 mb-4">
              <div className="card border-0 shadow-sm sticky-top" style={{ top: '20px' }}>
                <div className="card-header bg-white border-0 pt-4 pb-3">
                  <h5 className="fw-bold mb-0">🔍 Advanced Filters</h5>
                </div>
                <div className="card-body">
                  {/* Price Range */}
                  <div className="mb-4">
                    <label className="form-label fw-semibold">Price Range (per hour)</label>
                    <div className="d-flex justify-content-between mb-2">
                      <span>₹{priceRange[0]}</span>
                      <span>₹{priceRange[1]}</span>
                    </div>
                    <input
                      type="range"
                      className="form-range"
                      min="0"
                      max="10000"
                      step="500"
                      value={priceRange[1]}
                      onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                    />
                    <div className="mt-2">
                      <small className="text-muted">Max: ₹{priceRange[1]}</small>
                    </div>
                  </div>

                  {/* Sort By */}
                  <div className="mb-4">
                    <label className="form-label fw-semibold">Sort By</label>
                    <select 
                      className="form-select"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                    >
                      <option value="rating">Highest Rated</option>
                      <option value="price_low">Lowest Price</option>
                      <option value="price_high">Highest Price</option>
                      <option value="experience">Most Experienced</option>
                      <option value="reviews">Most Reviews</option>
                    </select>
                  </div>

                  {/* Availability */}
                  <div className="mb-4">
                    <label className="form-label fw-semibold">Availability</label>
                    <div className="form-check">
                      <input className="form-check-input" type="checkbox" id="available" defaultChecked />
                      <label className="form-check-label" htmlFor="available">
                        Available Now
                      </label>
                    </div>
                    <div className="form-check">
                      <input className="form-check-input" type="checkbox" id="verified" defaultChecked />
                      <label className="form-check-label" htmlFor="verified">
                        Verified Photographers
                      </label>
                    </div>
                  </div>

                  {/* Experience Level */}
                  <div className="mb-4">
                    <label className="form-label fw-semibold">Experience</label>
                    <div className="form-check">
                      <input className="form-check-input" type="checkbox" id="exp1" />
                      <label className="form-check-label" htmlFor="exp1">
                        1-3 years
                      </label>
                    </div>
                    <div className="form-check">
                      <input className="form-check-input" type="checkbox" id="exp2" />
                      <label className="form-check-label" htmlFor="exp2">
                        3-5 years
                      </label>
                    </div>
                    <div className="form-check">
                      <input className="form-check-input" type="checkbox" id="exp3" />
                      <label className="form-check-label" htmlFor="exp3">
                        5+ years
                      </label>
                    </div>
                  </div>

                  <button className="btn btn-primary w-100" onClick={handleSearch}>
                    Apply Filters
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Results Section */}
          <div className={showFilters ? 'col-lg-9' : 'col-12'}>
            {/* Results Header */}
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h4 className="fw-bold mb-0">
                {loading ? 'Searching...' : `${filteredPhotographers.length} Photographers Found`}
              </h4>
              <div className="d-flex gap-2">
                <span className="badge bg-light text-dark">
                  {searchTerm && `"${searchTerm}"`}
                </span>
                {location && <span className="badge bg-light text-dark">📍 {location}</span>}
                {service && <span className="badge bg-light text-dark">📸 {service}</span>}
              </div>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <p className="mt-3">Finding the perfect photographers for you...</p>
              </div>
            )}

            {/* Photographer Results */}
            {!loading && filteredPhotographers.length > 0 && (
              <div className="row g-4">
                {filteredPhotographers.map((photographer) => (
                  <div key={photographer.id} className="col-lg-6">
                    <div className="card border-0 shadow-sm h-100 hover-lift">
                      <div className="card-body p-4">
                        <div className="row align-items-start">
                          <div className="col-auto">
                            <div className="rounded-circle bg-light d-flex align-items-center justify-content-center" 
                                 style={{ width: '80px', height: '80px', fontSize: '2rem' }}>
                              📸
                            </div>
                          </div>
                          <div className="col">
                            <div className="d-flex justify-content-between align-items-start mb-2">
                              <div>
                                <h5 className="fw-bold mb-1">{photographer.name}</h5>
                                <div className="d-flex align-items-center gap-2 mb-2">
                                  <span className="text-warning small">
                                    {getStarRating(photographer.rating)}
                                  </span>
                                  <span className="text-muted small">
                                    ({photographer.reviews_count} reviews)
                                  </span>
                                </div>
                              </div>
                              <div className="text-end">
                                <div className="text-primary fw-bold">₹{photographer.hourly_rate}/hr</div>
                                {photographer.verified && (
                                  <span className="badge bg-success small">✓ Verified</span>
                                )}
                              </div>
                            </div>
                            
                            <div className="mb-3">
                              <p className="text-muted small mb-2">
                                📍 {photographer.location} • {photographer.experience} years experience
                              </p>
                              <div className="d-flex flex-wrap gap-1 mb-2">
                                {photographer.specialty.map((spec, index) => (
                                  <span key={index} className="badge bg-light text-dark small">
                                    {spec}
                                  </span>
                                ))}
                              </div>
                            </div>
                            
                            <div className="d-flex justify-content-between align-items-center">
                              <div className="small text-muted">
                                {photographer.completed_bookings} bookings completed
                              </div>
                              <div className="d-flex gap-2">
                                <Link 
                                  to={`/photographer/${photographer.id}`} 
                                  className="btn btn-outline-primary btn-sm"
                                >
                                  View Profile
                                </Link>
                                <Link 
                                  to={`/booking/request/${photographer.id}`} 
                                  className="btn btn-primary btn-sm"
                                >
                                  Book Now
                                </Link>
                              </div>
                            </div>
                            
                            {photographer.availability ? (
                              <div className="mt-2">
                                <span className="status-badge status-available">Available</span>
                                <span className="text-muted small ms-2">
                                  Responds in {photographer.response_time}
                                </span>
                              </div>
                            ) : (
                              <div className="mt-2">
                                <span className="status-badge status-unavailable">Unavailable</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* No Results */}
            {!loading && filteredPhotographers.length === 0 && (
              <div className="text-center py-5">
                <div className="mb-4" style={{ fontSize: '4rem' }}>🔍</div>
                <h4 className="fw-bold mb-3">No photographers found</h4>
                <p className="text-muted mb-4">
                  Try adjusting your filters or search terms
                </p>
                <button className="btn btn-outline-primary" onClick={clearFilters}>
                  Clear All Filters
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PhotographerSearch;