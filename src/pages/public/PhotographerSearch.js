"use client"

import { useState, useEffect, useRef } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { photographerAPI } from "../../api/api"
import citiesData from "../../data/cities.json"

const PhotographerSearch = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "")
  const [location, setLocation] = useState(searchParams.get("location") || "")
  const [service, setService] = useState(searchParams.get("service") || "")
  const [priceRange, setPriceRange] = useState([
    searchParams.get("minPrice") || 0,
    searchParams.get("maxPrice") || 10000,
  ])
  const [sortBy, setSortBy] = useState(searchParams.get("sort") || "rating")
  const [showFilters, setShowFilters] = useState(false)
  const [loading, setLoading] = useState(false)
  const [photographers, setPhotographers] = useState([])
  const [filteredPhotographers, setFilteredPhotographers] = useState([])
  const [error, setError] = useState(null)

  // Auto-complete state
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1)
  const searchInputRef = useRef(null)

  const cities = citiesData.cities
  const services = citiesData.services

  // Fetch photographers from API
  useEffect(() => {
    fetchPhotographers()
  }, [location, service])

  useEffect(() => {
    filterPhotographers()
  }, [searchTerm, photographers, priceRange, sortBy])

  const fetchPhotographers = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const params = {}
      if (location) params.city = location
      if (service) params.specialty = service
      
      const response = await photographerAPI.search(params)
      
      if (response.success) {
        setPhotographers(response.data || [])
      } else {
        setError(response.error || 'Failed to fetch photographers')
        setPhotographers([])
      }
    } catch (err) {
      console.error('Error fetching photographers:', err)
      setError(err.message || 'Failed to load photographers')
      setPhotographers([])
    } finally {
      setLoading(false)
    }
  }

  // Auto-complete functions
  const generateSuggestions = (input) => {
    if (!input || input.length < 2) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    const inputLower = input.toLowerCase()
    const newSuggestions = []

    // Add photographer name suggestions
    const photographerMatches = photographers
      .filter((p) => p.name.toLowerCase().includes(inputLower))
      .slice(0, 3)
      .map((p) => ({
        type: "photographer",
        value: p.name,
        display: p.name,
        subtitle: `${p.location} • ${Array.isArray(p.specialty) ? p.specialty.join(", ") : "Photographer"}`,
      }))

    // Add specialty/service suggestions
    const specialtyMatches = [...new Set(photographers.flatMap((p) => Array.isArray(p.specialty) ? p.specialty : []))]
      .filter((specialty) => specialty.toLowerCase().includes(inputLower))
      .slice(0, 3)
      .map((specialty) => ({
        type: "specialty",
        value: specialty,
        display: specialty,
        subtitle: "Service type",
      }))

    // Add city suggestions
    const cityMatches = cities
      .filter((city) => city.name.toLowerCase().includes(inputLower))
      .slice(0, 2)
      .map((city) => ({
        type: "city",
        value: city.name,
        display: city.name,
        subtitle: city.province ? `${city.province}` : "Location",
      }))

    newSuggestions.push(...photographerMatches, ...specialtyMatches, ...cityMatches)
    setSuggestions(newSuggestions.slice(0, 8)) // Limit to 8 suggestions
    setShowSuggestions(true)
    setSelectedSuggestionIndex(-1)
  }

  const handleSearchChange = (e) => {
    const value = e.target.value
    setSearchTerm(value)
    generateSuggestions(value)
  }

  const handleSuggestionClick = (suggestion) => {
    setSearchTerm(suggestion.display)
    setShowSuggestions(false)
    setSelectedSuggestionIndex(-1)
    searchInputRef.current?.focus()
  }

  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === "Enter") {
        handleSearch()
      }
      return
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault()
        setSelectedSuggestionIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0))
        break
      case "ArrowUp":
        e.preventDefault()
        setSelectedSuggestionIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1))
        break
      case "Enter":
        e.preventDefault()
        if (selectedSuggestionIndex >= 0) {
          handleSuggestionClick(suggestions[selectedSuggestionIndex])
        } else {
          handleSearch()
        }
        break
      case "Escape":
        setShowSuggestions(false)
        setSelectedSuggestionIndex(-1)
        break
    }
  }

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchInputRef.current && !searchInputRef.current.contains(event.target)) {
        setShowSuggestions(false)
        setSelectedSuggestionIndex(-1)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const filterPhotographers = () => {
    const filtered = photographers.filter((photographer) => {
      // Safety check: ensure specialty is an array
      const specialty = Array.isArray(photographer.specialty) ? photographer.specialty : [];
      
      const matchesSearch =
        !searchTerm ||
        photographer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (specialty.length > 0 && specialty.some((spec) => spec.toLowerCase().includes(searchTerm.toLowerCase())))

      const matchesPrice = photographer.hourly_rate >= priceRange[0] && photographer.hourly_rate <= priceRange[1]

      return matchesSearch && matchesPrice
    })

    // Sort photographers
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "rating":
          return b.rating - a.rating
        case "price_low":
          return a.hourly_rate - b.hourly_rate
        case "price_high":
          return b.hourly_rate - a.hourly_rate
        case "experience":
          return b.experience - a.experience
        case "reviews":
          return b.reviews_count - a.reviews_count
        default:
          return 0
      }
    })

    setFilteredPhotographers(filtered)
  }

  const handleSearch = () => {
    const params = new URLSearchParams()
    if (searchTerm) params.set("search", searchTerm)
    if (location) params.set("location", location)
    if (service) params.set("service", service)
    if (priceRange[0] > 0) params.set("minPrice", priceRange[0])
    if (priceRange[1] < 10000) params.set("maxPrice", priceRange[1])
    params.set("sort", sortBy)
    setSearchParams(params)
    fetchPhotographers()
  }

  const getActiveFilterCount = () => {
    let count = 0
    if (location) count++
    if (service) count++
    if (searchTerm) count++
    if (priceRange[0] > 0 || priceRange[1] < 10000) count++
    return count
  }

  const clearFilters = () => {
    setSearchTerm("")
    setLocation("")
    setService("")
    setPriceRange([0, 10000])
    setSortBy("rating")
    setSearchParams({})
    fetchPhotographers()
  }

  const getStarRating = (rating) => {
    const stars = []
    const fullStars = Math.floor(rating)
    const hasHalfStar = rating % 1 !== 0

    for (let i = 0; i < fullStars; i++) {
      stars.push("⭐")
    }
    if (hasHalfStar) {
      stars.push("⭐")
    }
    for (let i = stars.length; i < 5; i++) {
      stars.push("☆")
    }
    return stars.join("")
  }

  return (
    <div className="photographer-search py-4" style={{ background: 'radial-gradient(circle at top left, rgba(34, 94, 161, 0.08) 0%, transparent 50%), linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)', minHeight: '100vh' }}>
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
                  <div className="input-group position-relative">
                    <span className="input-group-text">🔍</span>
                    <input
                      ref={searchInputRef}
                      type="text"
                      className="form-control"
                      placeholder="Search photographers, services..."
                      value={searchTerm}
                      onChange={handleSearchChange}
                      onKeyDown={handleKeyDown}
                      onFocus={() => searchTerm.length >= 2 && setShowSuggestions(true)}
                    />
                    {showSuggestions && suggestions.length > 0 && (
                      <div
                        className="position-absolute w-100 bg-white border border-top-0 rounded-bottom shadow-sm"
                        style={{ top: "100%", zIndex: 1000, maxHeight: "320px", overflowY: "auto" }}
                      >
                        {suggestions.map((suggestion, index) => (
                          <div
                            key={index}
                            className={`px-3 py-2 cursor-pointer border-bottom ${index === selectedSuggestionIndex ? "bg-light" : ""}`}
                            style={{ fontSize: "0.875rem" }}
                            onClick={() => handleSuggestionClick(suggestion)}
                            onMouseEnter={() => setSelectedSuggestionIndex(index)}
                          >
                            <div className="d-flex justify-content-between align-items-center">
                              <div>
                                <div className="fw-medium">{suggestion.display}</div>
                                <div className="text-muted small">{suggestion.subtitle}</div>
                              </div>
                              <div className="text-muted small">
                                {suggestion.type === "photographer" && "📸"}
                                {suggestion.type === "specialty" && "🎯"}
                                {suggestion.type === "city" && "📍"}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="input-group">
                    <span className="input-group-text">📍</span>
                    <select className="form-select" value={location} onChange={(e) => setLocation(e.target.value)}>
                      <option value="">All Cities</option>
                      {cities.map((city) => (
                        <option key={city.id} value={city.name}>
                          {city.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="input-group">
                    <span className="input-group-text">📸</span>
                    <select className="form-select" value={service} onChange={(e) => setService(e.target.value)}>
                      <option value="">All Services</option>
                      {services.map((srv) => (
                        <option key={srv} value={srv}>
                          {srv}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="col-md-2">
                  <button className="btn btn-primary w-100" onClick={handleSearch}>
                    Search
                  </button>
                </div>
              </div>

              {/* Filter Toggle */}
              <div className="mt-3">
                <button className="btn btn-outline-light btn-sm" onClick={() => setShowFilters(!showFilters)}>
                  {showFilters ? "Hide Filters" : "Show Advanced Filters"}
                </button>
                {(searchTerm || location || service || priceRange[0] > 0 || priceRange[1] < 10000) && (
                  <button className="btn btn-outline-light btn-sm ms-2" onClick={clearFilters}>
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
              <div className="card border-0 shadow-sm sticky-top" style={{ top: "20px" }}>
                <div className="card-header bg-white border-0 pt-4 pb-3">
                  <div className="d-flex justify-content-between align-items-center">
                    <h5 className="fw-bold mb-0">🔍 Advanced Filters</h5>
                    {getActiveFilterCount() > 0 && (
                      <span className="badge bg-primary">{getActiveFilterCount()}</span>
                    )}
                  </div>
                </div>
                <div className="card-body">
                  {/* Price Range */}
                  <div className="mb-4">
                    <label className="form-label fw-semibold">Price Range (per hour)</label>
                    <div className="d-flex justify-content-between mb-2">
                      <span>PKR {priceRange[0]}</span>
                      <span>PKR {priceRange[1]}</span>
                    </div>
                    <input
                      type="range"
                      className="form-range"
                      min="0"
                      max="10000"
                      step="500"
                      value={priceRange[1]}
                      onChange={(e) => setPriceRange([priceRange[0], Number.parseInt(e.target.value)])}
                    />
                    <div className="mt-2">
                      <small className="text-muted">Max: PKR {priceRange[1]}</small>
                    </div>
                  </div>

                  {/* Sort By */}
                  <div className="mb-4">
                    <label className="form-label fw-semibold">Sort By</label>
                    <select className="form-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
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

                  <button className="btn btn-primary w-100 mb-2" onClick={handleSearch}>
                    Apply Filters
                  </button>
                  {getActiveFilterCount() > 0 && (
                    <button className="btn btn-outline-secondary w-100" onClick={clearFilters}>
                      Clear All Filters
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Results Section */}
          <div className={showFilters ? "col-lg-9" : "col-12"}>
            {/* Results Header */}
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h4 className="fw-bold mb-0">
                {loading ? "Searching..." : `${filteredPhotographers.length} Photographers Found`}
              </h4>
              <div className="d-flex gap-2">
                <span className="badge bg-light text-dark">{searchTerm && `"${searchTerm}"`}</span>
                {location && <span className="badge bg-light text-dark">📍 {location}</span>}
                {service && <span className="badge bg-light text-dark">📸 {service}</span>}
              </div>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="row g-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="col-lg-6">
                    <div className="card border-0 shadow-sm h-100">
                      <div className="card-body p-4">
                        <div className="row align-items-start">
                          <div className="col-auto">
                            <div className="bg-light rounded-circle" style={{ width: "80px", height: "80px" }}>
                              <div className="placeholder-glow h-100">
                                <span className="placeholder col-12 h-100 rounded-circle"></span>
                              </div>
                            </div>
                          </div>
                          <div className="col">
                            <div className="placeholder-glow">
                              <span className="placeholder col-6"></span>
                              <span className="placeholder col-4"></span>
                              <span className="placeholder col-8"></span>
                              <span className="placeholder col-5"></span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
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
                            <img
                              src={photographer.profile_image}
                              alt={photographer.name}
                              className="rounded-circle"
                              style={{ width: "80px", height: "80px", objectFit: "cover" }}
                              onError={(e) => {
                                e.target.onerror = null
                                e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(photographer.name)}&size=200&background=1A73E8&color=fff&bold=true`
                              }}
                            />
                          </div>
                          <div className="col">
                            <div className="d-flex justify-content-between align-items-start mb-2">
                              <div>
                                <h5 className="fw-bold mb-1">{photographer.name}</h5>
                                <div className="d-flex align-items-center gap-2 mb-2">
                                  <span className="text-warning small">{getStarRating(photographer.rating)}</span>
                                  <span className="text-muted small">({photographer.reviews_count} reviews)</span>
                                </div>
                              </div>
                              <div className="text-end">
                                <div className="text-primary fw-bold">PKR {photographer.hourly_rate}/hr</div>
                                {photographer.verified && <span className="badge bg-success small">✓ Verified</span>}
                              </div>
                            </div>

                            <div className="mb-3">
                              <p className="text-muted small mb-2">
                                📍 {photographer.location} • {photographer.experience} years experience
                              </p>
                              <div className="d-flex flex-wrap gap-1 mb-2">
                                {Array.isArray(photographer.specialty) && photographer.specialty.map((spec, index) => (
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
                                <Link to={`/booking/request/${photographer.id}`} className="btn btn-primary btn-sm" onClick={() => window.scrollTo(0, 0)}>
                                  Book Now
                                </Link>
                              </div>
                            </div>

                            {photographer.availability ? (
                              <div className="mt-2">
                                <span className="status-badge status-available">Available</span>
                                <span className="text-muted small ms-2">Responds in {photographer.response_time}</span>
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

            {/* Error State */}
            {!loading && error && (
              <div className="text-center py-5">
                <div className="mb-4" style={{ fontSize: "4rem" }}>
                  ⚠️
                </div>
                <h4 className="fw-bold mb-3 text-danger">Oops! Something went wrong</h4>
                <p className="text-muted mb-4">{error}</p>
                <button className="btn btn-primary" onClick={fetchPhotographers}>
                  🔄 Try Again
                </button>
              </div>
            )}

            {/* No Results */}
            {!loading && !error && filteredPhotographers.length === 0 && (
              <div className="text-center py-5">
                <div className="mb-4" style={{ fontSize: "4rem" }}>
                  🔍
                </div>
                <h4 className="fw-bold mb-3">No photographers found</h4>
                <p className="text-muted mb-4">
                  {getActiveFilterCount() > 0 
                    ? "Try adjusting your filters or search terms"
                    : "No photographers available at the moment"}
                </p>
                {getActiveFilterCount() > 0 && (
                  <button className="btn btn-outline-primary" onClick={clearFilters}>
                    Clear All Filters
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default PhotographerSearch
