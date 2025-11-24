import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useAuth } from '../../context/AuthContext';
import photographersData from '../../data/photographers.json';

const ReviewSubmission = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [photographer, setPhotographer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [existingReview, setExistingReview] = useState(null);

  // Mock reviews data
  const mockReviews = [
    { photographerId: 1, clientId: 'user123', rating: 5, comment: "Amazing work! Highly recommended." },
    { photographerId: 2, clientId: 'user456', rating: 4, comment: "Great experience, very professional." },
    { photographerId: 3, clientId: 'user789', rating: 5, comment: "Exceeded my expectations!" },
    { photographerId: 4, clientId: 'user012', rating: 4, comment: "Good quality, on time delivery." }
  ];

  // Validation schema
  const reviewSchema = yup.object().shape({
    rating: yup.number()
      .min(1, 'Please select a rating')
      .max(5, 'Rating cannot be more than 5 stars')
      .required('Rating is required'),
    comment: yup.string()
      .min(10, 'Review must be at least 10 characters long')
      .max(500, 'Review cannot be more than 500 characters')
      .required('Review comment is required'),
    serviceType: yup.string().required('Please select the service type'),
    dateOfService: yup.string().required('Date of service is required'),
    wouldRecommend: yup.boolean().required('Please indicate if you would recommend')
  });

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm({
    resolver: yupResolver(reviewSchema),
    defaultValues: {
      rating: 0,
      wouldRecommend: true,
      serviceType: '',
      dateOfService: ''
    }
  });

  useEffect(() => {
    // Simulate API call to get photographer details
    setTimeout(() => {
      const foundPhotographer = photographersData.photographers.find(p => p.id === parseInt(id));
      if (foundPhotographer) {
        setPhotographer(foundPhotographer);
        
        // Check if user has already reviewed this photographer
        const userReview = mockReviews.find(
          r => r.photographerId === foundPhotographer.id && r.clientId === user?.id
        );
        if (userReview) {
          setExistingReview(userReview);
          // Pre-fill form with existing review
          setValue('rating', userReview.rating);
          setValue('comment', userReview.comment);
        }
      }
      setLoading(false);
    }, 500);
  }, [id, user, setValue]);

  const onSubmit = async (data) => {
    setSubmitting(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const reviewData = {
        id: Date.now(),
        photographerId: photographer.id,
        photographerName: photographer.name,
        clientId: user.id,
        clientName: user.name,
        clientEmail: user.email,
        rating: data.rating,
        comment: data.comment,
        serviceType: data.serviceType,
        dateOfService: data.dateOfService,
        wouldRecommend: data.wouldRecommend,
        createdAt: new Date().toISOString(),
        verified: false // Pending admin verification
      };
      
      // Store review data (in real app, this would be sent to API)
      const existingReviews = JSON.parse(localStorage.getItem('userReviews') || '[]');
      if (existingReview) {
        // Update existing review
        const index = existingReviews.findIndex(r => 
          r.photographerId === photographer.id && r.clientId === user.id
        );
        if (index !== -1) {
          existingReviews[index] = { ...existingReviews[index], ...reviewData };
        }
      } else {
        existingReviews.push(reviewData);
      }
      localStorage.setItem('userReviews', JSON.stringify(existingReviews));
      
      // Redirect to success
      navigate('/client/dashboard', {
        state: {
          reviewSuccess: true,
          message: existingReview 
            ? 'Your review has been updated successfully!' 
            : 'Thank you for your review! It will be visible once verified by our team.'
        }
      });
      
    } catch (error) {
      console.error('Review submission error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const StarRating = ({ rating, onChange, interactive = true }) => {
    return (
      <div className="d-flex gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className={`btn btn-link p-0 ${interactive ? 'btn-lg' : ''}`}
            onClick={() => interactive && onChange(star)}
            disabled={!interactive}
            style={{
              fontSize: interactive ? '1.5rem' : '1.2rem',
              cursor: interactive ? 'pointer' : 'default',
              color: star <= rating ? '#F7931E' : '#D9D9D9',
              background: 'none',
              border: 'none',
              padding: '0 2px'
            }}
          >
            {star <= rating ? '⭐' : '☆'}
          </button>
        ))}
      </div>
    );
  };

  const serviceTypes = [
    'Wedding Photography',
    'Portrait Photography', 
    'Event Photography',
    'Product Photography',
    'Fashion Photography',
    'Landscape Photography',
    'Real Estate Photography',
    'Graduation Photography',
    'Corporate Photography'
  ];

  if (loading) {
    return (
      <div className="review-submission py-4">
        <div className="container">
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-3">Loading review form...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!photographer) {
    return (
      <div className="review-submission py-4">
        <div className="container">
          <div className="text-center py-5">
            <h4 className="fw-bold mb-3">Photographer Not Found</h4>
            <p className="text-muted mb-4">The photographer you want to review doesn't exist.</p>
            <Link to="/search" className="btn btn-primary" onClick={() => window.scrollTo(0, 0)}>
              Find Photographers
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="review-submission py-4">
      <div className="container">
        {/* Header */}
        <div className="gradient-header rounded-3 p-4 mb-4">
          <div className="row align-items-center">
            <div className="col-md-8">
              <h1 className="fw-bold mb-2">
                {existingReview ? 'Update Your Review' : 'Share Your Experience'}
              </h1>
              <p className="mb-2">
                {existingReview 
                  ? 'You can update your review for' 
                  : 'Share your experience with'} {photographer.name}
              </p>
              <div className="text-white-50">
                <span className="me-3">⭐ {photographer.rating} rating</span>
                <span className="me-3">📍 {photographer.location}</span>
                <span>📅 {photographer.completed_bookings} bookings completed</span>
              </div>
            </div>
            <div className="col-md-4 text-md-end">
              <div className="text-white">
                <div className="small opacity-75">
                  {existingReview ? 'Update Review' : 'New Review'}
                </div>
                <div className="h4 fw-bold">
                  {existingReview ? '⭐ Update Your Feedback' : '⭐ Rate Your Experience'}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="row">
          {/* Review Form */}
          <div className="col-lg-8">
            <form onSubmit={handleSubmit(onSubmit)}>
              {/* Photographer Info Card */}
              <div className="card border-0 shadow-sm mb-4">
                <div className="card-body p-4">
                  <div className="d-flex align-items-center">
                    <div className="rounded-circle bg-light d-flex align-items-center justify-content-center me-3" 
                         style={{ width: '60px', height: '60px', fontSize: '1.5rem' }}>
                      📸
                    </div>
                    <div className="flex-grow-1">
                      <h5 className="fw-bold mb-1">{photographer.name}</h5>
                      <div className="text-muted small mb-1">
                        {photographer.specialty.join(', ')}
                      </div>
                      <div className="d-flex align-items-center gap-2">
                        <span className="text-warning">
                          {[...Array(photographer.rating)].map((_, i) => (
                            <span key={i}>⭐</span>
                          ))}
                        </span>
                        <span className="text-muted">({photographer.reviews_count} reviews)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Rating Section */}
              <div className="card border-0 shadow-sm mb-4">
                <div className="card-header bg-white border-0 pt-4 pb-3">
                  <h5 className="fw-bold mb-0">⭐ Your Rating</h5>
                </div>
                <div className="card-body">
                  <div className="mb-3 text-center">
                    <StarRating 
                      rating={watch('rating')}
                      onChange={(rating) => setValue('rating', rating)}
                    />
                    <div className="mt-2">
                      <small className="text-muted">Click on stars to rate</small>
                    </div>
                  </div>
                  {errors.rating && (
                    <div className="text-danger small mt-1">{errors.rating.message}</div>
                  )}
                </div>
              </div>

              {/* Review Content */}
              <div className="card border-0 shadow-sm mb-4">
                <div className="card-header bg-white border-0 pt-4 pb-3">
                  <h5 className="fw-bold mb-0">📝 Your Review</h5>
                </div>
                <div className="card-body">
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Service Type *</label>
                    <select 
                      className={`form-select ${errors.serviceType ? 'is-invalid' : ''}`}
                      {...register('serviceType')}
                    >
                      <option value="">Select the service you used</option>
                      {serviceTypes.map((service, index) => (
                        <option key={index} value={service}>
                          {service}
                        </option>
                      ))}
                    </select>
                    {errors.serviceType && (
                      <div className="text-danger small mt-1">{errors.serviceType.message}</div>
                    )}
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold">Date of Service *</label>
                    <input
                      type="date"
                      className={`form-control ${errors.dateOfService ? 'is-invalid' : ''}`}
                      {...register('dateOfService')}
                      max={new Date().toISOString().split('T')[0]}
                    />
                    {errors.dateOfService && (
                      <div className="text-danger small mt-1">{errors.dateOfService.message}</div>
                    )}
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold">
                      Your Review * ({watch('comment')?.length || 0}/500 characters)
                    </label>
                    <textarea
                      className={`form-control ${errors.comment ? 'is-invalid' : ''}`}
                      {...register('comment')}
                      rows="6"
                      placeholder="Share your experience with this photographer. What did you like? What could be improved?"
                    />
                    <div className="d-flex justify-content-between">
                      <small className="text-muted">
                        Be specific, helpful, and constructive
                      </small>
                      <div className={`small ${watch('comment')?.length > 450 ? 'text-warning' : 'text-muted'}`}>
                        {500 - (watch('comment')?.length || 0)} characters remaining
                      </div>
                    </div>
                    {errors.comment && (
                      <div className="text-danger small mt-1">{errors.comment.message}</div>
                    )}
                  </div>

                  <div className="form-check mb-4">
                    <input
                      className={`form-check-input ${errors.wouldRecommend ? 'is-invalid' : ''}`}
                      type="checkbox"
                      id="wouldRecommend"
                      {...register('wouldRecommend')}
                    />
                    <label className="form-check-label ms-2" htmlFor="wouldRecommend">
                      Would you recommend {photographer.name} to others?
                    </label>
                    {errors.wouldRecommend && (
                      <div className="text-danger small mt-1">{errors.wouldRecommend.message}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="card border-0 shadow-sm">
                <div className="card-body">
                  <div className="d-flex gap-3">
                    <button 
                      type="submit" 
                      className="btn btn-primary btn-lg px-5"
                      disabled={submitting}
                    >
                      {submitting ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                          {existingReview ? 'Updating...' : 'Submitting...'}
                        </>
                      ) : (
                        <>
                          {existingReview ? 'Update Review' : 'Submit Review'}
                        </>
                      )}
                    </button>
                    <Link to={`/photographer/${photographer.id}`} className="btn btn-outline-secondary btn-lg" onClick={() => window.scrollTo(0, 0)}>
                      Cancel
                    </Link>
                  </div>
                </div>
              </div>
            </form>
          </div>

          {/* Sidebar */}
          <div className="col-lg-4">
            {/* Review Guidelines */}
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-header bg-white border-0 pt-4 pb-3">
                <h5 className="fw-bold mb-0">📝 Review Guidelines</h5>
              </div>
              <div className="card-body">
                <ul className="list-unstyled small">
                  <li className="mb-2">⭐ Be honest and specific about your experience</li>
                  <li className="mb-2">📸 Mention the type of service provided</li>
                  <li className="mb-2">💰 Discuss value for money if relevant</li>
                  <li className="mb-2">👥 Consider punctuality and professionalism</li>
                  <li className="mb-2">🎯 Focus on the service quality and customer experience</li>
                  <li className="mb-2">📅 Include the date of service for context</li>
                  <li className="mb-2">🚫 No hate speech, profanity, or personal attacks</li>
                  <li className="mb-2">✅ Reviews help others make informed decisions</li>
                </ul>
              </div>
            </div>

            {/* Why Reviews Matter */}
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-header bg-white border-0 pt-4 pb-3">
                <h5 className="fw-bold mb-0">💡 Why Reviews Matter</h5>
              </div>
              <div className="card-body">
                <p className="small text-muted">
                  Your honest feedback helps other clients make informed decisions and assists photographers in improving their services. Verified reviews build trust in the BookYourShoot community.
                </p>
                <div className="alert alert-info small mt-3">
                  <strong>Pro Tip:</strong> Detailed reviews with specific examples are most helpful to other users.
                </div>
              </div>
            </div>

            {/* Recent Reviews Preview */}
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-white border-0 pt-4 pb-3">
                <h5 className="fw-bold mb-0">Recent Reviews</h5>
              </div>
              <div className="card-body">
                <div className="list-group list-group-flush">
                  {mockReviews
                    .filter(r => r.photographerId === photographer.id)
                    .slice(0, 3)
                    .map((review, index) => (
                      <div key={index} className="list-group-item px-0">
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <div className="flex-grow-1">
                            <div className="text-warning small mb-1">
                              {[...Array(review.rating)].map((_, i) => (
                                <span key={i}>⭐</span>
                              ))}
                            </div>
                            <p className="text-muted small mb-1">{review.comment}</p>
                            <div className="small text-muted">
                              {new Date().toLocaleDateString()} • {review.serviceType}
                            </div>
                          </div>
                          <div className="text-end">
                            <span className="badge bg-light text-dark">
                              Verified
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReviewSubmission;
