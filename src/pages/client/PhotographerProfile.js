import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { photographerAPI } from '../../api/api';

const PhotographerProfile = () => {
  const { id } = useParams();
  const [photographer, setPhotographer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('about');
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPhotographer = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch photographer from API
        const response = await photographerAPI.getById(id);
        
        if (response.success && response.data) {
          const photographerData = response.data;
          
          // Transform API data to match component expectations
          setPhotographer({
            id: photographerData.id,
            name: photographerData.name,
            email: photographerData.email,
            phone: photographerData.phone,
            location: photographerData.location,
            specialty: photographerData.specialty || [],
            experience: photographerData.experience || 0,
            hourly_rate: photographerData.hourly_rate || 0,
            rating: photographerData.rating || 0,
            reviews_count: photographerData.reviews_count || 0,
            verified: photographerData.verified || false,
            completed_bookings: photographerData.completed_bookings || 0,
            response_time: photographerData.response_time || '1 hour',
            bio: photographerData.bio || "Professional photographer with over 5 years of experience in wedding and portrait photography. Passionate about capturing life's precious moments with artistic vision and technical excellence.",
            education: photographerData.education || "Diploma in Professional Photography - National College of Arts",
            languages: photographerData.languages || ["English", "Urdu", "Punjabi"],
            equipment: photographerData.equipment || ["Canon EOS R5", "Sony A7R IV", "Professional Lighting Kit", "Various Lenses"],
            awards: photographerData.awards || ["Best Wedding Photographer 2023", "Portrait Excellence Award 2022"],
            portfolio: photographerData.portfolio || [
              "/images/portfolio/wedding-1.jpg",
              "/images/portfolio/wedding-2.jpg", 
              "/images/portfolio/portrait-1.jpg",
              "/images/portfolio/portrait-2.jpg",
              "/images/portfolio/event-1.jpg",
              "/images/portfolio/event-2.jpg"
            ],
            availability: photographerData.availability || {
              monday: "Available",
              tuesday: "Available", 
              wednesday: "Busy",
              thursday: "Available",
              friday: "Available",
              saturday: "Available",
              sunday: "Busy"
            },
            services: photographerData.services || [
              {
                name: "Wedding Photography",
                description: "Complete wedding coverage from preparation to reception",
                duration: "6-12 hours",
                startingPrice: photographerData.hourly_rate * 8 || 30000
              },
              {
                name: "Portrait Photography", 
                description: "Professional portraits for individuals and families",
                duration: "1-3 hours",
                startingPrice: photographerData.hourly_rate * 2 || 8000
              },
              {
                name: "Event Photography",
                description: "Corporate events, birthdays, and special occasions",
                duration: "3-8 hours", 
                startingPrice: photographerData.hourly_rate * 4 || 15000
              }
            ],
            reviews: photographerData.reviews || [
              {
                id: 1,
                clientName: "Ayesha Khan",
                rating: 5,
                date: "2024-10-15",
                comment: "Absolutely amazing work! Made our wedding day perfect with beautiful photos.",
                service: "Wedding Photography"
              },
              {
                id: 2,
                clientName: "Bilal Ahmed", 
                rating: 5,
                date: "2024-09-20",
                comment: "Professional and creative. Captured our family portraits beautifully.",
                service: "Portrait Photography"
              },
              {
                id: 3,
                clientName: "Fatima Raza",
                rating: 4,
                date: "2024-08-10", 
                comment: "Great photographer, very cooperative and understanding.",
                service: "Event Photography"
              }
            ]
          });
        } else {
          setError('Photographer not found');
        }
      } catch (err) {
        console.error('Error fetching photographer:', err);
        setError(err.message || 'Failed to load photographer profile');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchPhotographer();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="photographer-profile py-4">
        <div className="container">
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-3">Loading photographer profile...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!photographer) {
    return (
      <div className="photographer-profile py-4">
        <div className="container">
          <div className="text-center py-5">
            <h4 className="fw-bold mb-3">
              {error ? 'Error Loading Profile' : 'Photographer Not Found'}
            </h4>
            <p className="text-muted mb-4">
              {error || "The photographer you're looking for doesn't exist."}
            </p>
            <Link to="/search" className="btn btn-primary" onClick={() => window.scrollTo(0, 0)}>
              Find Photographers
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const getStarRating = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    
    for (let i = 0; i < fullStars; i++) {
      stars.push('⭐');
    }
    for (let i = stars.length; i < 5; i++) {
      stars.push('☆');
    }
    return stars.join('');
  };

  return (
    <div className="photographer-profile py-4">
      <div className="container">
        {/* Profile Header */}
        <div className="gradient-header rounded-3 p-4 mb-4">
          <div className="row align-items-center">
            <div className="col-md-2 text-center">
              <div className="rounded-circle bg-white bg-opacity-20 d-flex align-items-center justify-content-center mx-auto" 
                   style={{ width: '120px', height: '120px', fontSize: '3rem' }}>
                📸
              </div>
            </div>
            <div className="col-md-7">
              <h1 className="fw-bold mb-2 text-white">{photographer.name}</h1>
              <div className="d-flex align-items-center gap-3 mb-3">
                <span className="text-warning">
                  {getStarRating(photographer.rating)}
                </span>
                <span className="text-white-50">
                  ({photographer.reviews_count} reviews)
                </span>
                {photographer.verified && (
                  <span className="badge bg-success">✓ Verified</span>
                )}
              </div>
              <div className="text-white-50 mb-2">
                <span className="me-3">📍 {photographer.location}</span>
                <span className="me-3">📧 {photographer.email}</span>
                <span className="me-3">📱 {photographer.phone}</span>
              </div>
              <div className="text-white-50">
                <span className="me-3">💼 {photographer.specialty.join(', ')}</span>
                <span className="me-3">⏱️ {photographer.response_time} response time</span>
                <span>📅 {photographer.completed_bookings} bookings completed</span>
              </div>
            </div>
            <div className="col-md-3 text-md-end">
              <div className="text-white mb-3">
                <div className="small opacity-75">Starting from</div>
                <div className="h2 fw-bold">PKR {photographer.hourly_rate}/hr</div>
              </div>
              <div className="d-grid gap-2">
                <Link to={`/booking/request/${photographer.id}`} className="btn btn-light" onClick={() => window.scrollTo(0, 0)}>
                  📅 Book Now
                </Link>
                <Link to={`/client/chat/${photographer.id}`} className="btn btn-outline-light" onClick={() => window.scrollTo(0, 0)}>
                  💬 Chat
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <ul className="nav nav-tabs mb-4" role="tablist">
          <li className="nav-item">
            <button 
              className={`nav-link ${activeTab === 'about' ? 'active' : ''}`}
              onClick={() => setActiveTab('about')}
            >
              About
            </button>
          </li>
          <li className="nav-item">
            <button 
              className={`nav-link ${activeTab === 'portfolio' ? 'active' : ''}`}
              onClick={() => setActiveTab('portfolio')}
            >
              Portfolio
            </button>
          </li>
          <li className="nav-item">
            <button 
              className={`nav-link ${activeTab === 'services' ? 'active' : ''}`}
              onClick={() => setActiveTab('services')}
            >
              Services & Pricing
            </button>
          </li>
          <li className="nav-item">
            <button 
              className={`nav-link ${activeTab === 'reviews' ? 'active' : ''}`}
              onClick={() => setActiveTab('reviews')}
            >
              Reviews ({photographer.reviews.length})
            </button>
          </li>
          <li className="nav-item">
            <button 
              className={`nav-link ${activeTab === 'availability' ? 'active' : ''}`}
              onClick={() => setActiveTab('availability')}
            >
              Availability
            </button>
          </li>
        </ul>

        {/* Tab Content */}
        <div className="tab-content">
          {/* About Tab */}
          {activeTab === 'about' && (
            <div className="row">
              <div className="col-lg-8">
                <div className="card border-0 shadow-sm mb-4">
                  <div className="card-body p-4">
                    <h4 className="fw-bold mb-3">About</h4>
                    <p className="text-muted">{photographer.bio}</p>
                  </div>
                </div>

                <div className="card border-0 shadow-sm mb-4">
                  <div className="card-body p-4">
                    <h5 className="fw-bold mb-3">Education & Qualifications</h5>
                    <p className="mb-2">🎓 {photographer.education}</p>
                    <div className="d-flex flex-wrap gap-2 mt-3">
                      {photographer.awards.map((award, index) => (
                        <span key={index} className="badge bg-warning text-dark">
                          🏆 {award}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="card border-0 shadow-sm">
                  <div className="card-body p-4">
                    <h5 className="fw-bold mb-3">Languages</h5>
                    <div className="d-flex gap-2">
                      {photographer.languages.map((lang, index) => (
                        <span key={index} className="badge bg-primary">
                          🌐 {lang}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-lg-4">
                <div className="card border-0 shadow-sm sticky-top" style={{ top: '20px' }}>
                  <div className="card-body p-4">
                    <h5 className="fw-bold mb-3">Experience</h5>
                    <div className="mb-3">
                      <div className="d-flex justify-content-between mb-2">
                        <span>Total Experience</span>
                        <span className="fw-bold">{photographer.experience} years</span>
                      </div>
                      <div className="d-flex justify-content-between mb-2">
                        <span>Bookings Completed</span>
                        <span className="fw-bold">{photographer.completed_bookings}</span>
                      </div>
                      <div className="d-flex justify-content-between mb-2">
                        <span>Response Time</span>
                        <span className="fw-bold">{photographer.response_time}</span>
                      </div>
                    </div>

                    <h5 className="fw-bold mb-3 mt-4">Equipment</h5>
                    <ul className="list-unstyled">
                      {photographer.equipment.map((item, index) => (
                        <li key={index} className="mb-2">🎥 {item}</li>
                      ))}
                    </ul>

                    <div className="mt-4">
                      <Link to={`/booking/request/${photographer.id}`} className="btn btn-primary w-100 mb-2" onClick={() => window.scrollTo(0, 0)}>
                        📅 Book Now
                      </Link>
                      <Link to={`/client/chat/${photographer.id}`} className="btn btn-outline-primary w-100" onClick={() => window.scrollTo(0, 0)}>
                        💬 Send Message
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Portfolio Tab */}
          {activeTab === 'portfolio' && (
            <div>
              <div className="card border-0 shadow-sm">
                <div className="card-body p-4">
                  <h4 className="fw-bold mb-4">Portfolio Gallery</h4>
                  
                  {/* Main Image */}
                  <div className="text-center mb-4">
                    <div className="rounded bg-light p-5" style={{ minHeight: '400px' }}>
                      <div style={{ fontSize: '4rem' }}>
                        📸
                      </div>
                      <p className="text-muted mt-3">Portfolio Image {selectedImageIndex + 1}</p>
                    </div>
                  </div>

                  {/* Thumbnail Gallery */}
                  <div className="row g-2">
                    {photographer.portfolio.map((image, index) => (
                      <div key={index} className="col-6 col-md-4 col-lg-2">
                    <div 
                      className={`rounded bg-light p-3 cursor-pointer ${
                        selectedImageIndex === index ? 'border-3 border-primary' : 'border-2 border-light'
                      }`}
                      onClick={() => setSelectedImageIndex(index)}
                      style={{ 
                        minHeight: '100px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        fontSize: '2rem'
                      }}
                    >
                      📸
                    </div>
                  </div>
                ))}
              </div>

                  <div className="mt-4">
                    <h6>Portfolio Categories:</h6>
                    <div className="d-flex flex-wrap gap-2">
                      {photographer.specialty.map((spec, index) => (
                        <span key={index} className="badge bg-primary">
                          {spec}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Services Tab */}
          {activeTab === 'services' && (
            <div className="row">
              {photographer.services.map((service, index) => (
                <div key={index} className="col-lg-4 mb-4">
                  <div className="card border-0 shadow-sm h-100">
                    <div className="card-body p-4">
                      <h5 className="fw-bold mb-3">{service.name}</h5>
                      <p className="text-muted mb-3">{service.description}</p>
                      <div className="mb-3">
                        <div className="d-flex justify-content-between mb-1">
                          <span className="text-muted">Duration:</span>
                          <span className="fw-semibold">{service.duration}</span>
                        </div>
                        <div className="d-flex justify-content-between mb-3">
                          <span className="text-muted">Starting Price:</span>
                          <span className="fw-bold text-primary">PKR {service.startingPrice.toLocaleString()}</span>
                        </div>
                      </div>
                      <Link to={`/booking/request/${photographer.id}?service=${service.name}`} className="btn btn-primary w-100">
                        Book {service.name}
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Reviews Tab */}
          {activeTab === 'reviews' && (
            <div>
              <div className="row mb-4">
                <div className="col-md-4">
                  <div className="card border-0 shadow-sm">
                    <div className="card-body text-center">
                      <div className="display-4 fw-bold text-primary mb-2">
                        {photographer.rating}
                      </div>
                      <div className="text-warning mb-2">
                        {getStarRating(photographer.rating)}
                      </div>
                      <div className="text-muted">
                        {photographer.reviews_count} Reviews
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-md-8">
                  <div className="card border-0 shadow-sm">
                    <div className="card-body">
                      <h5 className="fw-bold mb-3">Rating Breakdown</h5>
                      <div className="mb-2">
                        <div className="d-flex justify-content-between align-items-center">
                          <span>5 ⭐</span>
                          <div className="progress flex-grow-1 mx-3" style={{ height: '8px' }}>
                            <div className="progress-bar bg-success" style={{ width: '75%' }}></div>
                          </div>
                          <span>{Math.round(photographer.reviews_count * 0.75)}</span>
                        </div>
                      </div>
                      <div className="mb-2">
                        <div className="d-flex justify-content-between align-items-center">
                          <span>4 ⭐</span>
                          <div className="progress flex-grow-1 mx-3" style={{ height: '8px' }}>
                            <div className="progress-bar bg-success" style={{ width: '15%' }}></div>
                          </div>
                          <span>{Math.round(photographer.reviews_count * 0.15)}</span>
                        </div>
                      </div>
                      <div className="mb-2">
                        <div className="d-flex justify-content-between align-items-center">
                          <span>3 ⭐</span>
                          <div className="progress flex-grow-1 mx-3" style={{ height: '8px' }}>
                            <div className="progress-bar bg-success" style={{ width: '10%' }}></div>
                          </div>
                          <span>{Math.round(photographer.reviews_count * 0.1)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Reviews List */}
              <div className="row">
                <div className="col-12">
                  {photographer.reviews.map((review) => (
                    <div key={review.id} className="card border-0 shadow-sm mb-3">
                      <div className="card-body p-4">
                        <div className="row align-items-start mb-3">
                          <div className="col-auto">
                            <div className="rounded-circle bg-light d-flex align-items-center justify-content-center" 
                                 style={{ width: '50px', height: '50px', fontSize: '1.5rem' }}>
                              👤
                            </div>
                          </div>
                          <div className="col">
                            <h6 className="fw-bold mb-1">{review.clientName}</h6>
                            <div className="text-warning small mb-1">
                              {getStarRating(review.rating)}
                            </div>
                            <div className="text-muted small">
                              {review.service} • {new Date(review.date).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <p className="text-muted mb-0">{review.comment}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Availability Tab */}
          {activeTab === 'availability' && (
            <div className="row">
              <div className="col-lg-6">
                <div className="card border-0 shadow-sm">
                  <div className="card-body p-4">
                    <h5 className="fw-bold mb-4">Weekly Availability</h5>
                    <div className="list-group list-group-flush">
                      {Object.entries(photographer.availability).map(([day, status]) => (
                        <div key={day} className="list-group-item d-flex justify-content-between align-items-center px-0">
                          <span className="text-capitalize fw-semibold">{day}</span>
                          <span className={`status-badge ${
                            status === 'Available' ? 'status-available' : 'status-unavailable'
                          }`}>
                            {status}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4">
                      <Link to={`/booking/request/${photographer.id}`} className="btn btn-primary w-100">
                        📅 Check Availability & Book
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-lg-6">
                <div className="card border-0 shadow-sm">
                  <div className="card-body p-4">
                    <h5 className="fw-bold mb-4">Booking Guidelines</h5>
                    <ul className="list-unstyled">
                      <li className="mb-3">
                        <span className="text-primary me-2">⏰</span>
                        <span>Please book at least 24 hours in advance</span>
                      </li>
                      <li className="mb-3">
                        <span className="text-primary me-2">💰</span>
                        <span>50% advance payment required to confirm booking</span>
                      </li>
                      <li className="mb-3">
                        <span className="text-primary me-2">📍</span>
                        <span>Travel charges may apply for shoots outside {photographer.location}</span>
                      </li>
                      <li className="mb-3">
                        <span className="text-primary me-2">📸</span>
                        <span>Edited photos delivered within 7-10 business days</span>
                      </li>
                      <li className="mb-3">
                        <span className="text-primary me-2">🔄</span>
                        <span>Free revision for up to 20% of selected photos</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PhotographerProfile;
