import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { registerWithPassword } from '../../api/auth';

// Validation schema
const registerSchema = yup.object().shape({
  role: yup.string()
    .required('Please select your role'),
  name: yup.string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be less than 50 characters')
    .matches(/^[A-Za-z\s]+$/, 'Name can only contain alphabets and spaces')
    .test('valid-name-structure', 'Please enter a valid full name (e.g., John Doe)', function(value) {
      if (!value) return false;
      const trimmed = value.trim();
      // Must contain at least one space (first and last name)
      if (!trimmed.includes(' ')) {
        return this.createError({ message: 'Please enter your full name (first and last name)' });
      }
      // Split into words
      const words = trimmed.split(/\s+/);
      // Must have at least 2 words
      if (words.length < 2) {
        return this.createError({ message: 'Please enter your full name (first and last name)' });
      }
      // Each word must be at least 2 characters and contain vowels (to avoid nonsense like 'dsf dsfds')
      const vowelRegex = /[aeiouAEIOU]/;
      for (const word of words) {
        if (word.length < 2) {
          return this.createError({ message: 'Each name part must be at least 2 characters' });
        }
        if (!vowelRegex.test(word)) {
          return this.createError({ message: 'Please enter a valid name (names should contain vowels)' });
        }
      }
      return true;
    })
    .required('Full name is required')
    .transform((value) => {
      if (!value) return value;
      // Capitalize first letter of each word
      return value.trim().split(/\s+/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    }),
  email: yup.string()
    .email('Please enter a valid email address')
    .matches(
      /^[a-zA-Z0-9][a-zA-Z0-9._%-]*[a-zA-Z0-9]@[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/,
      'Invalid email format. Please use a valid email address'
    )
    .test('no-consecutive-dots', 'Email cannot contain consecutive dots', function(value) {
      if (!value) return true;
      return !value.includes('..');
    })
    .test('valid-domain', 'Email domain must be valid (e.g., gmail.com, not xyz.xyz.com)', function(value) {
      if (!value) return true;
      const domain = value.split('@')[1];
      if (!domain) return false;
      // Reject domains like xyz.xyz.com where subdomain equals domain
      const parts = domain.split('.');
      if (parts.length >= 3) {
        // Check if any two consecutive parts are identical (case-insensitive)
        for (let i = 0; i < parts.length - 1; i++) {
          if (parts[i].toLowerCase() === parts[i + 1].toLowerCase()) {
            return false;
          }
        }
      }
      return true;
    })
    .required('Email is required'),
  phone: yup.string()
    .required('Phone number is required')
    .test('phone-format', 'Please enter a valid Pakistani phone number', function(value) {
      if (!value) return false;
      // Remove all spaces, hyphens, and parentheses
      const cleaned = value.replace(/[\s\-()]/g, '');
      // Check valid formats: +923001234567, 923001234567, 03001234567
      const phoneRegex = /^(\+92|92|0)?3[0-9]{9}$/;
      return phoneRegex.test(cleaned);
    }),
  password: yup.string()
    .min(8, 'Password must be at least 8 characters')
    .matches(/[a-z]/, 'Password must contain at least one lowercase letter')
    .matches(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .matches(/[0-9]/, 'Password must contain at least one number')
    .matches(/[@$!%*?&#]/, 'Password must contain at least one special character (@$!%*?&#)')
    .required('Password is required'),
  confirmPassword: yup.string()
    .oneOf([yup.ref('password'), null], 'Passwords must match')
    .required('Please confirm your password'),
  agreeToTerms: yup.bool()
    .oneOf([true], 'You must agree to the terms and conditions')
});

// Normalize phone number to +92-300-1234567 format
const normalizePhone = (phone) => {
  if (!phone) return '';
  const cleaned = phone.replace(/[\s\-()]/g, '');
  let normalized = cleaned;
  
  // Add +92 if not present
  if (normalized.startsWith('0')) {
    normalized = '92' + normalized.slice(1);
  }
  if (!normalized.startsWith('+')) {
    normalized = '+' + normalized;
  }
  
  // Format as +92-300-1234567
  if (normalized.startsWith('+92')) {
    const rest = normalized.slice(3);
    normalized = `+92-${rest.slice(0, 3)}-${rest.slice(3)}`;
  }
  
  return normalized;
};

const Register = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const [selectedRole, setSelectedRole] = useState('');

  const { 
    register, 
    handleSubmit, 
    formState: { errors },
    watch,
    setValue,
    trigger
  } = useForm({
    resolver: yupResolver(registerSchema)
  });

  const watchPassword = watch('password');

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    setValue('role', role);
    trigger('role');
  };

  const onSubmit = async (data) => {
    setLoading(true);
    setServerError('');

    try {
      // Normalize phone number
      const normalizedPhone = normalizePhone(data.phone);
      
      // Check if email is already registered
      const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:8000";
      const checkResponse = await fetch(`${API_BASE}/api/auth/check-email?email=${encodeURIComponent(data.email)}`);
      const checkData = await checkResponse.json();
      
      if (checkData.exists) {
        setServerError('This email is already registered. Please login instead.');
        setLoading(false);
        return;
      }
      
      // Register with email and password
      const result = await registerWithPassword({
        email: data.email.toLowerCase(),
        password: data.password,
        full_name: data.name,
        phone: normalizedPhone,
        city: 'Lahore', // Default, can add city field to form
        role: data.role
      });
      
      // Check if email confirmation is required
      if (result.requires_email_confirmation) {
        // Store registration data temporarily for OTP verification
        sessionStorage.setItem('pendingRegistration', JSON.stringify({
          email: data.email,
          role: data.role,
          full_name: data.name
        }));
        
        // Navigate to OTP verification page
        navigate('/verify-otp', { 
          state: { 
            email: data.email,
            role: data.role,
            message: 'Please check your email for the verification code'
          } 
        });
      } else {
        // Email auto-confirmed (development mode) - navigate to appropriate page
        if (data.role === 'photographer') {
          navigate('/register/cnic');
        } else {
          navigate(`/${data.role}/dashboard`);
        }
      }
    } catch (error) {
      setServerError(error.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const roleDescriptions = {
    client: {
      title: 'Looking for a Photographer?',
      description: 'Find and book professional photographers for your special events',
      icon: '👤',
      color: 'primary'
    },
    photographer: {
      title: 'Are you a Photographer?',
      description: 'Showcase your portfolio and connect with clients',
      icon: '📸',
      color: 'secondary'
    }
  };

  return (
    <div className="register-page py-5" style={{ background: 'radial-gradient(circle at top right, rgba(34, 94, 161, 0.1) 0%, transparent 50%), linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)', minHeight: '100vh' }}>
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-lg-11 col-xl-10">
            {/* Role Selection Section */}
            <div className="text-center mb-5">
              <h2 className="fw-bold mb-3" style={{ fontSize: '2.5rem' }}>Join BookYourShoot</h2>
              <p className="text-muted" style={{ fontSize: '1.1rem' }}>Choose your role and start your photography journey</p>
              
              <div className="row g-4 mt-3 justify-content-center">
                {Object.entries(roleDescriptions).map(([role, desc]) => {
                  const isSelected = selectedRole === role;
                  const borderCol = isSelected ? 'var(--primary-purple)' : 'var(--soft-gray)';

                  return (
                  <div className="col-md-4" key={role}>
                    <div 
                      className={`card h-100 ${isSelected ? 'border-primary shadow-sm' : ''}`}
                      style={{ 
                        cursor: 'pointer',
                        borderWidth: isSelected ? '3px' : '1px',
                        borderColor: borderCol,
                        borderRadius: '12px',
                        transition: 'all 0.3s ease',
                        transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                        backgroundColor: isSelected ? 'rgba(34, 94, 161, 0.05)' : 'white'
                      }}
                      onClick={() => handleRoleSelect(role)}
                    >
                      <div className="card-body text-center p-4">
                        <div className="mb-3" style={{ fontSize: '3rem' }}>
                          {desc.icon}
                        </div>
                        <h5 className="fw-bold mb-2">{desc.title}</h5>
                        <p className="text-muted mb-0" style={{ fontSize: '0.95rem' }}>{desc.description}</p>
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
              {errors.role && (
                <div className="text-danger small mt-2">{errors.role.message}</div>
              )}
            </div>

            {/* Registration Form */}
            {selectedRole && (
              <div className="card border-0 shadow-lg fade-in" style={{ borderRadius: '16px' }}>
                <div className="card-body p-5" style={{ padding: '3rem !important' }}>
                  <div className="text-center mb-5">
                    <div className="mb-3">
                      <span style={{ fontSize: '3.5rem' }}>
                        {roleDescriptions[selectedRole].icon}
                      </span>
                    </div>
                    <h3 className="fw-bold" style={{ fontSize: '2rem' }}>
                      Register as {selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)}
                    </h3>
                    <p className="text-muted" style={{ fontSize: '1.05rem' }}>Fill in your details to get started</p>
                  </div>

                  {/* Server Error */}
                  {serverError && (
                    <div className="alert alert-danger" role="alert">
                      {serverError}
                    </div>
                  )}

                  <form onSubmit={handleSubmit(onSubmit)}>
                    {/* Hidden role field */}
                    <input type="hidden" {...register('role')} />

                    <div className="row">
                      {/* Full Name */}
                      <div className="col-md-6 mb-3">
                        <label htmlFor="name" className="form-label fw-semibold">
                          Full Name *
                        </label>
                        <input
                          type="text"
                          className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                          id="name"
                          placeholder="Enter your full name"
                          {...register('name')}
                        />
                        {errors.name && (
                          <div className="text-danger small mt-1">{errors.name.message}</div>
                        )}
                      </div>

                      {/* Email */}
                      <div className="col-md-6 mb-3">
                        <label htmlFor="email" className="form-label fw-semibold">
                          Email Address *
                        </label>
                        <input
                          type="email"
                          className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                          id="email"
                          placeholder="example@email.com"
                          {...register('email')}
                        />
                        {errors.email && (
                          <div className="text-danger small mt-1">{errors.email.message}</div>
                        )}
                      </div>
                    </div>

                    <div className="row">
                      {/* Phone Number */}
                      <div className="col-md-6 mb-3">
                        <label htmlFor="phone" className="form-label fw-semibold">
                          Phone Number *
                        </label>
                        <input
                          type="tel"
                          className={`form-control ${errors.phone ? 'is-invalid' : ''}`}
                          id="phone"
                          placeholder="+92 300 1234567 or 0300 1234567"
                          {...register('phone')}
                        />
                        {errors.phone && (
                          <div className="text-danger small mt-1">{errors.phone.message}</div>
                        )}
                      </div>

                      {/* Password */}
                      <div className="col-md-6 mb-3">
                        <label htmlFor="password" className="form-label fw-semibold">
                          Password *
                        </label>
                        <input
                          type="password"
                          className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                          id="password"
                          placeholder="Enter your password"
                          {...register('password')}
                        />
                        <small className="text-muted d-block mt-1">
                          Must be at least 8 characters with uppercase, lowercase, number and special character (@$!%*?&#)
                        </small>
                        {errors.password && (
                          <div className="text-danger small mt-1">{errors.password.message}</div>
                        )}
                      </div>
                    </div>

                    {/* Confirm Password */}
                    <div className="mb-4">
                      <label htmlFor="confirmPassword" className="form-label fw-semibold">
                        Confirm Password *
                      </label>
                      <input
                        type="password"
                        className={`form-control ${errors.confirmPassword ? 'is-invalid' : ''}`}
                        id="confirmPassword"
                        placeholder="Re-enter your password"
                        {...register('confirmPassword')}
                      />
                      {errors.confirmPassword && (
                        <div className="text-danger small mt-1">{errors.confirmPassword.message}</div>
                      )}
                    </div>

                    {/* Password Strength Indicator */}
                    {watchPassword && (
                      <div className="mb-3">
                        <small className="text-muted">Password strength:</small>
                        <div className="progress" style={{ height: '4px' }}>
                          <div 
                            className={`progress-bar ${
                              watchPassword.length < 6 ? 'bg-danger' : 
                              watchPassword.length < 10 ? 'bg-warning' : 'bg-success'
                            }`}
                            style={{ 
                              width: `${Math.min(watchPassword.length * 10, 100)}%` 
                            }}
                          ></div>
                        </div>
                      </div>
                    )}

                    {/* Terms and Conditions */}
                    <div className="mb-4">
                      <div className="form-check">
                        <input
                          className={`form-check-input ${errors.agreeToTerms ? 'is-invalid' : ''}`}
                          type="checkbox"
                          id="agreeToTerms"
                          {...register('agreeToTerms')}
                        />
                        <label className="form-check-label" htmlFor="agreeToTerms">
                          I agree to the <Link to="/terms" className="text-primary">Terms and Conditions</Link> and <Link to="/privacy" className="text-primary">Privacy Policy</Link>
                        </label>
                      </div>
                      {errors.agreeToTerms && (
                        <div className="text-danger small mt-1">{errors.agreeToTerms.message}</div>
                      )}
                    </div>

                    {/* Submit Button */}
                    <button 
                      type="submit" 
                      className="btn btn-primary w-100 py-3 mb-3"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                          Creating Account...
                        </>
                      ) : (
                        <>
                          Create {selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)} Account
                        </>
                      )}
                    </button>
                  </form>

                  {/* Role-specific messages */}
                  {selectedRole === 'photographer' && (
                    <div className="alert alert-info" role="alert">
                      <strong>Photographer Registration:</strong> After email verification, you'll need to upload your CNIC for identity verification before accepting bookings.
                    </div>
                  )}
                  {selectedRole !== 'photographer' && (
                    <div className="alert alert-success" role="alert">
                      <strong>Quick Registration:</strong> After email verification, you'll have immediate access to your dashboard.
                    </div>
                  )}

                  {/* Login Link */}
                  <div className="text-center mt-4">
                    <p className="mb-0">
                      Already have an account?{' '}
                      <Link to="/login" className="text-primary text-decoration-none fw-semibold">
                        Sign in here
                      </Link>
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Back to Home */}
            <div className="text-center mt-4">
              <Link to="/" className="text-muted text-decoration-none">
                ← Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
