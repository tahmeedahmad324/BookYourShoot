import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useAuth } from '../../context/AuthContext';

// Validation schema
const registerSchema = yup.object().shape({
  role: yup.string()
    .required('Please select your role'),
  name: yup.string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be less than 50 characters')
    .required('Full name is required'),
  email: yup.string()
    .email('Please enter a valid email address')
    .required('Email is required'),
  phone: yup.string()
    .matches(/^(\+92|0)?[3-9]\d{9}$/, 'Please enter a valid Pakistani phone number')
    .required('Phone number is required'),
  password: yup.string()
    .min(6, 'Password must be at least 6 characters')
    .required('Password is required'),
  confirmPassword: yup.string()
    .oneOf([yup.ref('password'), null], 'Passwords must match')
    .required('Please confirm your password'),
  agreeToTerms: yup.bool()
    .oneOf([true], 'You must agree to the terms and conditions')
});

const Register = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
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

  const watchRole = watch('role');
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
      // Simulate API call for registration
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Mock successful registration - in real app, this would be an API call
      const userData = {
        id: Date.now(),
        name: data.name,
        email: data.email,
        phone: data.phone,
        role: data.role,
        verified: data.role === 'admin' // Admins are auto-verified
      };

      // Auto-login after registration but require OTP verification first
      login(userData, 'mock-jwt-token-new-user');

      // Redirect to OTP verification for all users
      navigate('/verify-otp');
    } catch (error) {
      setServerError('Registration failed. Please try again.');
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
    },
    admin: {
      title: 'Administrator Access',
      description: 'Manage the platform and verify photographers',
      icon: '🔐',
      color: 'dark'
    }
  };

  return (
    <div className="register-page py-5" style={{ background: 'radial-gradient(circle at top right, rgba(168, 85, 247, 0.1) 0%, transparent 50%), linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)', minHeight: '100vh' }}>
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-lg-11 col-xl-10">
            {/* Role Selection Section */}
            <div className="text-center mb-5">
              <h2 className="fw-bold mb-3" style={{ fontSize: '2.5rem' }}>Join BookYourShoot</h2>
              <p className="text-muted" style={{ fontSize: '1.1rem' }}>Choose your role and start your photography journey</p>
              
              <div className="row g-4 mt-3">
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
                        backgroundColor: isSelected ? 'rgba(139, 92, 246, 0.05)' : 'white'
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
                        <div className="input-group">
                          <span className="input-group-text">
                            👤
                          </span>
                          <input
                            type="text"
                            className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                            id="name"
                            placeholder="Enter your full name"
                            {...register('name')}
                          />
                        </div>
                        {errors.name && (
                          <div className="text-danger small mt-1">{errors.name.message}</div>
                        )}
                      </div>

                      {/* Email */}
                      <div className="col-md-6 mb-3">
                        <label htmlFor="email" className="form-label fw-semibold">
                          Email Address *
                        </label>
                        <div className="input-group">
                          <span className="input-group-text">
                            📧
                          </span>
                          <input
                            type="email"
                            className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                            id="email"
                            placeholder="Enter your email"
                            {...register('email')}
                          />
                        </div>
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
                        <div className="input-group">
                          <span className="input-group-text">
                            📱
                          </span>
                          <input
                            type="tel"
                            className={`form-control ${errors.phone ? 'is-invalid' : ''}`}
                            id="phone"
                            placeholder="+92 300 1234567"
                            {...register('phone')}
                          />
                        </div>
                        {errors.phone && (
                          <div className="text-danger small mt-1">{errors.phone.message}</div>
                        )}
                      </div>

                      {/* Password */}
                      <div className="col-md-6 mb-3">
                        <label htmlFor="password" className="form-label fw-semibold">
                          Password *
                        </label>
                        <div className="input-group">
                          <span className="input-group-text">
                            🔒
                          </span>
                          <input
                            type="password"
                            className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                            id="password"
                            placeholder="Create a password"
                            {...register('password')}
                          />
                        </div>
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
                      <div className="input-group">
                        <span className="input-group-text">
                          🔒
                        </span>
                        <input
                          type="password"
                          className={`form-control ${errors.confirmPassword ? 'is-invalid' : ''}`}
                          id="confirmPassword"
                          placeholder="Confirm your password"
                          {...register('confirmPassword')}
                        />
                      </div>
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
