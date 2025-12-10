import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import * as yup from 'yup';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';

// Validation schema
const profileSchema = yup.object().shape({
  bio: yup.string()
    .min(50, 'Bio must be at least 50 characters')
    .max(1000, 'Bio must be less than 1000 characters')
    .required('Professional bio is required'),
  specialties: yup.array()
    .min(1, 'Please select at least one specialty')
    .required('Specialties are required'),
  experienceYears: yup.number()
    .min(0, 'Experience cannot be negative')
    .max(50, 'Please enter valid experience')
    .required('Years of experience is required'),
  hourlyRate: yup.number()
    .min(500, 'Hourly rate must be at least PKR 500')
    .max(100000, 'Hourly rate seems too high')
    .required('Hourly rate is required'),
  portfolio: yup.string()
    .url('Please enter a valid URL')
    .nullable(),
  languages: yup.array()
    .min(1, 'Please select at least one language'),
  availability: yup.string()
    .required('Please select your availability'),
  servicesOffered: yup.array()
    .min(1, 'Please select at least one service'),
  workLocation: yup.string()
    .required('Please specify your work location preference'),
});

const PhotographerProfileSetup = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

  const { 
    register, 
    handleSubmit, 
    formState: { errors },
    watch,
    setValue,
    trigger
  } = useForm({
    resolver: yupResolver(profileSchema),
    defaultValues: {
      specialties: [],
      languages: [],
      servicesOffered: [],
      availability: '',
      workLocation: ''
    }
  });

  const watchSpecialties = watch('specialties');
  const watchServices = watch('servicesOffered');
  const watchLanguages = watch('languages');

  const specialtiesOptions = [
    'Wedding Photography', 'Portrait Photography', 'Event Photography',
    'Commercial Photography', 'Fashion Photography', 'Product Photography',
    'Real Estate Photography', 'Food Photography', 'Sports Photography',
    'Wildlife Photography', 'Landscape Photography', 'Aerial Photography'
  ];

  const servicesOptions = [
    'Photo Shoot', 'Video Recording', 'Photo Editing', 'Video Editing',
    'Drone Photography', 'Studio Session', 'On-Location Shoot', 
    'Same-Day Delivery', 'Album Design', 'Photo Prints'
  ];

  const languagesOptions = ['English', 'Urdu', 'Punjabi', 'Sindhi', 'Pashto', 'Balochi'];

  const toggleArrayValue = (field, value) => {
    const currentValues = watch(field) || [];
    const newValues = currentValues.includes(value)
      ? currentValues.filter(v => v !== value)
      : [...currentValues, value];
    setValue(field, newValues);
    trigger(field);
  };

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      // API call to save photographer profile
      // await photographerAPI.updateProfile(data);
      console.log('Profile data:', data);
      
      // Navigate to dashboard after profile setup
      navigate('/photographer/dashboard');
    } catch (error) {
      console.error('Profile setup error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    if (window.confirm('Are you sure you want to skip profile setup? You can complete it later from your dashboard.')) {
      navigate('/photographer/dashboard');
    }
  };

  const handleNext = async () => {
    const fieldsToValidate = {
      1: ['bio', 'experienceYears'],
      2: ['specialties', 'servicesOffered'],
      3: ['hourlyRate', 'availability', 'workLocation'],
      4: ['languages']
    };

    const isValid = await trigger(fieldsToValidate[currentStep]);
    if (isValid && currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="profile-setup py-5" style={{ background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', minHeight: '100vh' }}>
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-lg-10 col-xl-9">
            {/* Header */}
            <div className="text-center mb-4">
              <h2 className="fw-bold mb-3">Complete Your Photographer Profile</h2>
              <p className="text-muted">Stand out from the competition by showcasing your expertise</p>
            </div>

            {/* Progress Bar */}
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-body p-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="fw-semibold">Step {currentStep} of {totalSteps}</span>
                  <span className="text-muted">{Math.round((currentStep / totalSteps) * 100)}% Complete</span>
                </div>
                <div className="progress" style={{ height: '8px' }}>
                  <div 
                    className="progress-bar bg-primary"
                    style={{ width: `${(currentStep / totalSteps) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Form Card */}
            <div className="card border-0 shadow-lg">
              <div className="card-body p-5">
                <form onSubmit={handleSubmit(onSubmit)}>
                  
                  {/* Step 1: Basic Information */}
                  {currentStep === 1 && (
                    <div className="fade-in">
                      <h4 className="fw-bold mb-4">📝 Basic Information</h4>
                      
                      {/* Bio */}
                      <div className="mb-4">
                        <label htmlFor="bio" className="form-label fw-semibold">
                          Professional Bio *
                        </label>
                        <textarea
                          className={`form-control ${errors.bio ? 'is-invalid' : ''}`}
                          id="bio"
                          rows="6"
                          placeholder="Tell clients about yourself, your experience, and what makes you unique..."
                          {...register('bio')}
                        />
                        <small className="text-muted">
                          {watch('bio')?.length || 0} / 1000 characters (minimum 50)
                        </small>
                        {errors.bio && (
                          <div className="text-danger small mt-1">{errors.bio.message}</div>
                        )}
                      </div>

                      {/* Experience Years */}
                      <div className="mb-4">
                        <label htmlFor="experienceYears" className="form-label fw-semibold">
                          Years of Experience *
                        </label>
                        <input
                          type="number"
                          className={`form-control ${errors.experienceYears ? 'is-invalid' : ''}`}
                          id="experienceYears"
                          placeholder="e.g., 5"
                          {...register('experienceYears')}
                        />
                        {errors.experienceYears && (
                          <div className="text-danger small mt-1">{errors.experienceYears.message}</div>
                        )}
                      </div>

                      {/* Portfolio URL */}
                      <div className="mb-4">
                        <label htmlFor="portfolio" className="form-label fw-semibold">
                          Portfolio Website (Optional)
                        </label>
                        <input
                          type="url"
                          className={`form-control ${errors.portfolio ? 'is-invalid' : ''}`}
                          id="portfolio"
                          placeholder="https://your-portfolio.com"
                          {...register('portfolio')}
                        />
                        <small className="text-muted">Add your online portfolio, Instagram, or Behance link</small>
                        {errors.portfolio && (
                          <div className="text-danger small mt-1">{errors.portfolio.message}</div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Step 2: Specialties & Services */}
                  {currentStep === 2 && (
                    <div className="fade-in">
                      <h4 className="fw-bold mb-4">🎯 Specialties & Services</h4>
                      
                      {/* Specialties */}
                      <div className="mb-4">
                        <label className="form-label fw-semibold">
                          Photography Specialties * <span className="text-muted fw-normal">(Select all that apply)</span>
                        </label>
                        <div className="row g-2">
                          {specialtiesOptions.map((specialty) => (
                            <div className="col-md-4 col-6" key={specialty}>
                              <div
                                className={`card h-100 ${watchSpecialties?.includes(specialty) ? 'border-primary bg-primary bg-opacity-10' : 'border'}`}
                                style={{ cursor: 'pointer' }}
                                onClick={() => toggleArrayValue('specialties', specialty)}
                              >
                                <div className="card-body p-2 text-center">
                                  <small>{specialty}</small>
                                  {watchSpecialties?.includes(specialty) && (
                                    <span className="ms-1">✓</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        {errors.specialties && (
                          <div className="text-danger small mt-1">{errors.specialties.message}</div>
                        )}
                      </div>

                      {/* Services Offered */}
                      <div className="mb-4">
                        <label className="form-label fw-semibold">
                          Services Offered * <span className="text-muted fw-normal">(Select all that apply)</span>
                        </label>
                        <div className="row g-2">
                          {servicesOptions.map((service) => (
                            <div className="col-md-4 col-6" key={service}>
                              <div
                                className={`card h-100 ${watchServices?.includes(service) ? 'border-success bg-success bg-opacity-10' : 'border'}`}
                                style={{ cursor: 'pointer' }}
                                onClick={() => toggleArrayValue('servicesOffered', service)}
                              >
                                <div className="card-body p-2 text-center">
                                  <small>{service}</small>
                                  {watchServices?.includes(service) && (
                                    <span className="ms-1">✓</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        {errors.servicesOffered && (
                          <div className="text-danger small mt-1">{errors.servicesOffered.message}</div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Step 3: Rates & Availability */}
                  {currentStep === 3 && (
                    <div className="fade-in">
                      <h4 className="fw-bold mb-4">💰 Rates & Availability</h4>
                      
                      {/* Hourly Rate */}
                      <div className="mb-4">
                        <label htmlFor="hourlyRate" className="form-label fw-semibold">
                          Hourly Rate (PKR) *
                        </label>
                        <input
                          type="number"
                          className={`form-control ${errors.hourlyRate ? 'is-invalid' : ''}`}
                          id="hourlyRate"
                          placeholder="e.g., 5000"
                          {...register('hourlyRate')}
                        />
                        <small className="text-muted">This is your base rate for standard photography services</small>
                        {errors.hourlyRate && (
                          <div className="text-danger small mt-1">{errors.hourlyRate.message}</div>
                        )}
                      </div>

                      {/* Availability */}
                      <div className="mb-4">
                        <label className="form-label fw-semibold">
                          Availability *
                        </label>
                        <div className="row g-3">
                          {['Full-time (Available 7 days)', 'Weekends Only', 'Weekdays Only', 'By Appointment'].map((option) => (
                            <div className="col-md-6" key={option}>
                              <div
                                className={`card ${watch('availability') === option ? 'border-primary bg-primary bg-opacity-10' : 'border'}`}
                                style={{ cursor: 'pointer' }}
                                onClick={() => {
                                  setValue('availability', option);
                                  trigger('availability');
                                }}
                              >
                                <div className="card-body p-3 text-center">
                                  {option}
                                  {watch('availability') === option && (
                                    <span className="ms-2">✓</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        {errors.availability && (
                          <div className="text-danger small mt-1">{errors.availability.message}</div>
                        )}
                      </div>

                      {/* Work Location */}
                      <div className="mb-4">
                        <label className="form-label fw-semibold">
                          Work Location Preference *
                        </label>
                        <div className="row g-3">
                          {['Client Location Only', 'Studio Only', 'Both Client Location & Studio'].map((option) => (
                            <div className="col-md-4" key={option}>
                              <div
                                className={`card ${watch('workLocation') === option ? 'border-success bg-success bg-opacity-10' : 'border'}`}
                                style={{ cursor: 'pointer' }}
                                onClick={() => {
                                  setValue('workLocation', option);
                                  trigger('workLocation');
                                }}
                              >
                                <div className="card-body p-3 text-center">
                                  <small>{option}</small>
                                  {watch('workLocation') === option && (
                                    <span className="ms-2">✓</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        {errors.workLocation && (
                          <div className="text-danger small mt-1">{errors.workLocation.message}</div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Step 4: Languages */}
                  {currentStep === 4 && (
                    <div className="fade-in">
                      <h4 className="fw-bold mb-4">🗣️ Languages & Final Details</h4>
                      
                      {/* Languages */}
                      <div className="mb-4">
                        <label className="form-label fw-semibold">
                          Languages You Speak * <span className="text-muted fw-normal">(Select all that apply)</span>
                        </label>
                        <div className="row g-3">
                          {languagesOptions.map((language) => (
                            <div className="col-md-4 col-6" key={language}>
                              <div
                                className={`card ${watchLanguages?.includes(language) ? 'border-primary bg-primary bg-opacity-10' : 'border'}`}
                                style={{ cursor: 'pointer' }}
                                onClick={() => toggleArrayValue('languages', language)}
                              >
                                <div className="card-body p-3 text-center">
                                  {language}
                                  {watchLanguages?.includes(language) && (
                                    <span className="ms-2">✓</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        {errors.languages && (
                          <div className="text-danger small mt-1">{errors.languages.message}</div>
                        )}
                      </div>

                      {/* Summary */}
                      <div className="alert alert-info">
                        <h6 className="fw-bold mb-2">📋 Profile Summary</h6>
                        <ul className="mb-0 small">
                          <li>Bio: {watch('bio')?.length || 0} characters</li>
                          <li>Experience: {watch('experienceYears') || 0} years</li>
                          <li>Specialties: {watchSpecialties?.length || 0} selected</li>
                          <li>Services: {watchServices?.length || 0} selected</li>
                          <li>Hourly Rate: PKR {watch('hourlyRate') || 0}</li>
                          <li>Languages: {watchLanguages?.length || 0} selected</li>
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* Navigation Buttons */}
                  <div className="d-flex justify-content-between mt-4 pt-3 border-top">
                    <div>
                      {currentStep > 1 && (
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={handleBack}
                        >
                          ← Back
                        </button>
                      )}
                    </div>
                    
                    <div className="d-flex gap-2">
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={handleSkip}
                      >
                        Skip for Now
                      </button>
                      
                      {currentStep < totalSteps ? (
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={handleNext}
                        >
                          Next →
                        </button>
                      ) : (
                        <button
                          type="submit"
                          className="btn btn-success"
                          disabled={loading}
                        >
                          {loading ? (
                            <>
                              <span className="spinner-border spinner-border-sm me-2" />
                              Saving...
                            </>
                          ) : (
                            '✓ Complete Profile'
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </form>
              </div>
            </div>

            {/* Help Text */}
            <div className="text-center mt-4">
              <small className="text-muted">
                You can always update your profile later from your dashboard settings
              </small>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PhotographerProfileSetup;
