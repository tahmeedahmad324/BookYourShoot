import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import citiesData from '../../data/cities.json';
import { searchPhotographers } from '../../services/mockAPI';

const SearchForm = ({ searchData, setSearchData }) => {
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);
  const [suggestedCities, setSuggestedCities] = useState([]);
  const [suggestedPrice, setSuggestedPrice] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const navigate = useNavigate();
  const cityInputRef = useRef(null);

  const services = [
    { value: 'all', label: 'All Services' },
    { value: 'wedding', label: 'Wedding Photography' },
    { value: 'portrait', label: 'Portrait Photography' },
    { value: 'event', label: 'Event Photography' },
    { value: 'product', label: 'Product Photography' }
  ];

  const basePrices = {
    wedding: { min: 15000, max: 50000 },
    portrait: { min: 3000, max: 15000 },
    event: { min: 8000, max: 30000 },
    product: { min: 5000, max: 20000 }
  };

  useEffect(() => {
    // Calculate suggested price when city or service changes
    if (searchData.city && searchData.service !== 'all') {
      const priceRange = basePrices[searchData.service];
      const avgPrice = Math.floor((priceRange.min + priceRange.max) / 2);
      setSuggestedPrice(avgPrice);
    } else {
      setSuggestedPrice(null);
    }
  }, [searchData.city, searchData.service]);

  const handleCityChange = (e) => {
    const value = e.target.value;
    setSearchData(prev => ({ ...prev, city: value }));

    if (value.length > 1) {
      const filtered = citiesData.cities.filter(city =>
        city.name.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 5);
      setSuggestedCities(filtered);
      setShowCitySuggestions(true);
    } else {
      setShowCitySuggestions(false);
    }
  };

  const handleCitySelect = (city) => {
    setSearchData(prev => ({ ...prev, city: city.name }));
    setShowCitySuggestions(false);
    cityInputRef.current?.blur();
  };

  const handleServiceChange = (e) => {
    setSearchData(prev => ({ ...prev, service: e.target.value }));
  };

  const handleSearch = async () => {
    if (!searchData.city) {
      alert('Please enter a city to search');
      return;
    }

    setIsSearching(true);
    
    try {
      // Navigate to search results with query parameters
      const queryParams = new URLSearchParams({
        city: searchData.city,
        service: searchData.service
      });
      
      navigate(`/search?${queryParams.toString()}`);
    } catch (error) {
      console.error('Search error:', error);
      alert('Search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="search-form-container">
      <div className="search-form-wrapper">
        {/* City input */}
        <div className="search-input-group">
          <div className="input-wrapper position-relative">
            <span className="input-icon">📍</span>
            <input
              ref={cityInputRef}
              type="text"
              className="form-control search-input"
              placeholder="Enter city"
              value={searchData.city}
              onChange={handleCityChange}
              onKeyPress={handleKeyPress}
              onFocus={() => searchData.city && setShowCitySuggestions(true)}
              onBlur={() => setTimeout(() => setShowCitySuggestions(false), 200)}
            />
            {showCitySuggestions && suggestedCities.length > 0 && (
              <div className="city-suggestions">
                {suggestedCities.map((city, index) => (
                  <div
                    key={index}
                    className="suggestion-item"
                    onClick={() => handleCitySelect(city)}
                  >
                    <span className="city-name">{city.name}</span>
                    {city.province && (
                      <span className="city-province">{city.province}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Service dropdown */}
        <div className="search-input-group">
          <div className="input-wrapper">
            <span className="input-icon">📸</span>
            <select
              className="form-select search-input"
              value={searchData.service}
              onChange={handleServiceChange}
            >
              {services.map(service => (
                <option key={service.value} value={service.value}>
                  {service.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Search button */}
        <button 
          className="btn btn-primary search-button"
          onClick={handleSearch}
          disabled={isSearching || !searchData.city}
        >
          {isSearching ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              Searching...
            </>
          ) : (
            'Find Photographers'
          )}
        </button>
      </div>

      {/* Suggested price badge */}
      {suggestedPrice && (
        <div className="suggested-price">
          <span className="price-label">Starting from</span>
          <span className="price-amount">Rs. {suggestedPrice.toLocaleString()}</span>
        </div>
      )}
    </div>
  );
};

export default SearchForm;