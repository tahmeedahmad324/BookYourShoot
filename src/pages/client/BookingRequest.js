import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useAuth } from '../../context/AuthContext';
import photographersData from '../../data/photographers.json';
import citiesData from '../../data/cities.json';

const BookingRequest = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  
  const [photographer, setPhotographer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedService, setSelectedService] = useState(searchParams.get('service') || '');
  const [calculatedPrice, setCalculatedPrice] = useState(0);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedDuration, setSelectedDuration] = useState(1);

  // Photographer services data
  const photographerServices = {
    "Wedding Photography": {
      description: "Complete wedding coverage from preparation to reception",
      duration: "6-12 hours",
      basePrice: 30000,
      hourlyRate: 5000
    },
    "Portrait Photography": {
      description: "Professional portraits for individuals and families", 
      duration: "1-3 hours",
      basePrice: 5000,
      hourlyRate: 4000
    },
    "Event Photography": {
      description: "Corporate events, birthdays, and special occasions",
      duration: "3-8 hours",
      basePrice: 8000,
      hourlyRate: 3500
    },
    "Product Photography": {
      description: "Professional product shots for businesses",
      duration: "2-6 hours",
      basePrice: 6000,
      hourlyRate: 4500
    }
  };

  // Validation schema
  const bookingSchema = yup.object().shape({
    clientName: yup.string().required('Full name is required'),
    clientEmail: yup.string().email('Invalid email format').required('Email is required'),
    clientPhone: yup.string().matches(/^(\+92|0)?[3-9]\d{9}$/, 'Please enter a valid Pakistani phone number').required('Phone number is required'),
    serviceType: yup.string().required('Please select a service'),
    eventDate: yup.string().required('Event date is required'),
    eventTime: yup.string().required('Event time is required'),
    duration: yup.number().min(1, 'Duration must be at least 1 hour').required('Duration is required'),
    location: yup.string().required('Location is required'),
    specialRequests: yup.string(),
    agreedToTerms: yup.bool().oneOf([true], 'You must agree to the terms and conditions')
  });

  const { register, handleSubmit, formState: { errors }, watch, setValue, trigger } = useForm({
    resolver: yupResolver(bookingSchema),
    defaultValues: {
      clientName: user?.name || '',
      clientEmail: user?.email || '',
      clientPhone: user?.phone || '',
      serviceType: selectedService,
      duration: 1
    }
  });

  const watchedFields = watch(['serviceType', 'duration']);

  useEffect(() => {
    // Simulate API call to get photographer details
    setTimeout(() => {
      const foundPhotographer = photographersData.photographers.find(p => p.id === parseInt(id));
      if (foundPhotographer) {
        setPhotographer(foundPhotographer);
      }
      setLoading(false);
    }, 500);
  }, [id]);

  useEffect(() => {
    // Calculate price based on service and duration
    if (watchedFields[0] && watchedFields[1]) {
      const service = photographerServices[watchedFields[0]];
      if (service) {
        const price = service.basePrice + (service.hourlyRate * (watchedFields[1] - 1));
        setCalculatedPrice(price);
      }
    }
  }, [watchedFields]);

  const onSubmit = async (data) => {
    setSubmitting(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock successful booking
      const bookingData = {
        id: Date.now(),
        photographerId: photographer.id,
        photographerName: photographer.name,
        clientId: user.id,
        clientName: data.clientName,
        service: data.serviceType,
        date: data.eventDate,
        time: data.eventTime,
        duration: data.duration,
        location: data.location,
        price: calculatedPrice,
        status: 'pending',
        specialRequests: data.specialRequests,
        createdAt: new Date().toISOString()
      };
      
      // Store booking data (in real app, this would be sent to API)
      const existingBookings = JSON.parse(localStorage.getItem('userBookings') || '[]');
      existingBookings.push(bookingData);
      localStorage.setItem('userBookings', JSON.stringify(existingBookings));
      
      // Redirect to success page or dashboard
      navigate('/client/dashboard', { 
        state: { 
          bookingSuccess: true, 
          message: 'Booking request submitted successfully! The photographer will review and respond within 24 hours.' 
        } 
      });
      
    } catch (error) {
      console.error('Booking error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const generateTimeSlots = () => {
    const times = [];
    for (let hour = 6; hour <= 22; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        times.push(time);
      }
    }
    return times;
  };

  const generateMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  if (loading) {
    return (
      <div className="booking-request py-4">
        <div className="container">
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-3">Loading booking form...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!photographer) {
    return (
      <div className="booking-request py-4">
        <div className="container">
          <div className="text-center py-5">
            <h4 className="fw-bold mb-3">Photographer Not Found</h4>
            <p className="text-muted mb-4">The photographer you're trying to book doesn't exist.</p>
            <Link to="/search" className="btn btn-primary">
              Find Photographers
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="booking-request py-4">
      <div className="container">
        {/* Header */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="gradient-header rounded-3 p-4">
              <div className="row align-items-center">
                <div className="col-md-8">
                  <h1 className="fw-bold mb-2">Book {photographer.name}</h1>
                  <p className="mb-2">Complete the form below to request a booking</p>
                  <div className="text-white-50">
                    <span className="me-3">📍 {photographer.location}</span>
                    <span className="me-3">⭐ {photographer.rating} rating</span>
                    <span className="me-3">⏱️ {photographer.response_time} response time</span>
                  </div>
                </div>
                <div className="col-md-4 text-md-end">
                  <div className="text-white">
                    <div className="small opacity-75">Photographer Rate</div>
                    <div className="h3 fw-bold">₹{photographer.hourly_rate}/hr</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="row">
          {/* Booking Form */}
          <div className="col-lg-8">
            <form onSubmit={handleSubmit(onSubmit)}>
              {/* Client Information */}
              <div className="card border-0 shadow-sm mb-4">
                <div className="card-header bg-white border-0 pt-4 pb-3">
                  <h5 className="fw-bold mb-0">👤 Your Information</h5>
                </div>
                <div className="card-body">
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label fw-semibold">Full Name *</label>
                      <input
                        type="text"
                        className={`form-control ${errors.clientName ? 'is-invalid' : ''}`}
                        {...register('clientName')}
                        placeholder="Enter your full name"
                      />
                      {errors.clientName && (
                        <div className="text-danger small mt-1">{errors.clientName.message}</div>
                      )}
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label fw-semibold">Email Address *</label>
                      <input
                        type="email"
                        className={`form-control ${errors.clientEmail ? 'is-invalid' : ''}`}
                        {...register('clientEmail')}
                        placeholder="your@email.com"
                      />
                      {errors.clientEmail && (
                        <div className="text-danger small mt-1">{errors.clientEmail.message}</div>
                      )}
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label fw-semibold">Phone Number *</label>
                      <input
                        type="tel"
                        className={`form-control ${errors.clientPhone ? 'is-invalid' : ''}`}
                        {...register('clientPhone')}
                        placeholder="+92 300 1234567"
                      />
                      {errors.clientPhone && (
                        <div className="text-danger small mt-1">{errors.clientPhone.message}</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Service Selection */}
              <div className="card border-0 shadow-sm mb-4">
                <div className="card-header bg-white border-0 pt-4 pb-3">
                  <h5 className="fw-bold mb-0">📸 Service Selection</h5>
                </div>
                <div className="card-body">
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Service Type *</label>
                    <select 
                      className={`form-select ${errors.serviceType ? 'is-invalid' : ''}`}
                      {...register('serviceType')}
                      onChange={(e) => {
                        setSelectedService(e.target.value);
                        setValue('serviceType', e.target.value);
                        trigger('serviceType');
                      }}
                    >
                      <option value="">Select a service</option>
                      {Object.entries(photographerServices).map(([name, details]) => (
                        <option key={name} value={name}>
                          {name} - Starting from ₹{details.basePrice.toLocaleString()}
                        </option>
                      ))}
                    </select>
                    {errors.serviceType && (
                      <div className="text-danger small mt-1">{errors.serviceType.message}</div>
                    )}
                  </div>
                  
                  {selectedService && photographerServices[selectedService] && (
                    <div className="alert alert-info">
                      <div className="fw-bold mb-1">{selectedService}</div>
                      <div className="small mb-2">{photographerServices[selectedService].description}</div>
                      <div className="small">
                        Duration: {photographerServices[selectedService].duration} | 
                        Base Price: ₹{photographerServices[selectedService].basePrice.toLocaleString()}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Event Details */}
              <div className="card border-0 shadow-sm mb-4">
                <div className="card-header bg-white border-0 pt-4 pb-3">
                  <h5 className="fw-bold mb-0">📅 Event Details</h5>
                </div>
                <div className="card-body">
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label fw-semibold">Event Date *</label>
                      <input
                        type="date"
                        className={`form-control ${errors.eventDate ? 'is-invalid' : ''}`}
                        {...register('eventDate')}
                        min={generateMinDate()}
                        onChange={(e) => {
                          setSelectedDate(e.target.value);
                          setValue('eventDate', e.target.value);
                          trigger('eventDate');
                        }}
                      />
                      {errors.eventDate && (
                        <div className="text-danger small mt-1">{errors.eventDate.message}</div>
                      )}
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label fw-semibold">Start Time *</label>
                      <select 
                        className={`form-select ${errors.eventTime ? 'is-invalid' : ''}`}
                        {...register('eventTime')}
                        onChange={(e) => {
                          setSelectedTime(e.target.value);
                          setValue('eventTime', e.target.value);
                          trigger('eventTime');
                        }}
                      >
                        <option value="">Select time</option>
                        {generateTimeSlots().map(time => (
                          <option key={time} value={time}>{time}</option>
                        ))}
                      </select>
                      {errors.eventTime && (
                        <div className="text-danger small mt-1">{errors.eventTime.message}</div>
                      )}
                    </div>
                  </div>
                  
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label fw-semibold">Duration (hours) *</label>
                      <input
                        type="number"
                        className={`form-control ${errors.duration ? 'is-invalid' : ''}`}
                        {...register('duration', { valueAsNumber: true })}
                        min="1"
                        max="12"
                        onChange={(e) => {
                          setSelectedDuration(parseInt(e.target.value));
                          setValue('duration', parseInt(e.target.value));
                          trigger('duration');
                        }}
                      />
                      {errors.duration && (
                        <div className="text-danger small mt-1">{errors.duration.message}</div>
                      )}
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label fw-semibold">Location *</label>
                      <input
                        type="text"
                        className={`form-control ${errors.location ? 'is-invalid' : ''}`}
                        {...register('location')}
                        placeholder="Event location address"
                      />
                      {errors.location && (
                        <div className="text-danger small mt-1">{errors.location.message}</div>
                      )}
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Special Requests</label>
                    <textarea
                      className="form-control"
                      {...register('specialRequests')}
                      rows="4"
                      placeholder="Any special requirements or preferences for the shoot..."
                    />
                  </div>
                </div>
              </div>

              {/* Terms and Submit */}
              <div className="card border-0 shadow-sm mb-4">
                <div className="card-body">
                  <div className="form-check mb-4">
                    <input
                      className={`form-check-input ${errors.agreedToTerms ? 'is-invalid' : ''}`}
                      type="checkbox"
                      id="terms"
                      {...register('agreedToTerms')}
                    />
                    <label className="form-check-label" htmlFor="terms">
                      I agree to the booking terms and conditions, including the 50% advance payment policy
                    </label>
                    {errors.agreedToTerms && (
                      <div className="text-danger small mt-1">{errors.agreedToTerms.message}</div>
                    )}
                  </div>
                  
                  <div className="d-flex gap-3">
                    <button 
                      type="submit" 
                      className="btn btn-primary btn-lg px-5"
                      disabled={submitting}
                    >
                      {submitting ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                          Submitting Request...
                        </>
                      ) : (
                        'Submit Booking Request'
                      )}
                    </button>
                    <Link to={`/photographer/${photographer.id}`} className="btn btn-outline-secondary btn-lg">
                      Back to Profile
                    </Link>
                  </div>
                </div>
              </div>
            </form>
          </div>

          {/* Pricing Summary */}
          <div className="col-lg-4">
            <div className="card border-0 shadow-sm sticky-top" style={{ top: '20px' }}>
              <div className="card-header bg-white border-0 pt-4 pb-3">
                <h5 className="fw-bold mb-0">💰 Pricing Summary</h5>
              </div>
              <div className="card-body">
                <div className="d-flex justify-content-between mb-2">
                  <span>Base Price</span>
                  <span>₹{selectedService ? photographerServices[selectedService]?.basePrice.toLocaleString() : '0'}</span>
                </div>
                
                <div className="d-flex justify-content-between mb-2">
                  <span>Duration ({selectedDuration} hours)</span>
                  <span>₹{selectedService ? (photographerServices[selectedService]?.hourlyRate * (selectedDuration - 1)).toLocaleString() : '0'}</span>
                </div>
                
                <div className="d-flex justify-content-between mb-3 pt-3 border-top">
                  <span className="fw-bold">Total Amount</span>
                  <span className="fw-bold text-primary h5">₹{calculatedPrice.toLocaleString()}</span>
                </div>
                
                <div className="alert alert-info small">
                  <strong>Payment Policy:</strong><br/>
                  • 50% advance required to confirm<br/>
                  • Remaining 50% on event day<br/>
                  • Free cancellation up to 48 hours before
                </div>
                
                <div className="alert alert-warning small">
                  <strong>Important:</strong><br/>
                  • Photographer will review and confirm within 24 hours<br/>
                  • Booking is only confirmed after advance payment<br/>
                  • Travel charges may apply for locations outside {photographer.location}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingRequest;