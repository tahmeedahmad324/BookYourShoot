import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useAuth } from '../../context/AuthContext';
import { sendOTP } from '../../api/auth';

// Validation schema - supports both password and OTP login
const loginSchema = yup.object().shape({
  email: yup.string()
    .email('Please enter a valid email address')
    .required('Email is required'),
  password: yup.string()
    .min(6, 'Password must be at least 6 characters')
    .when('loginMethod', {
      is: 'password',
      then: (schema) => schema.required('Password is required'),
      otherwise: (schema) => schema.notRequired()
    }),
  role: yup.string()
    .required('Please select your role')
});

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const [loginMethod, setLoginMethod] = useState('password'); // 'password' or 'otp'
  const [showPassword, setShowPassword] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: yupResolver(loginSchema)
  });

  const onSubmit = async (data) => {
    setLoading(true);
    setServerError('');

    try {
      if (loginMethod === 'otp') {
        // OTP flow - send OTP to user's email
        await sendOTP(data.email);
        
        // Store login info for OTP verification
        sessionStorage.setItem('loginData', JSON.stringify({
          email: data.email,
          role: data.role
        }));
        
        // Navigate to OTP verification
        navigate('/verify-otp', { state: { email: data.email, flow: 'login' } });
      } else {
        // Password flow - simulate login (replace with real API call)
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Mock password login - replace with actual backend call
        const remember = document.getElementById('remember')?.checked;
        
        // Demo accounts for testing
        if (data.email === 'admin@bookyourshoot.com' && data.password === 'admin123') {
          const userData = { id: 1, name: 'Admin User', email: data.email, role: 'admin' };
          login(userData, 'mock-jwt-token-admin', remember);
          navigate('/admin/dashboard');
        } else if (data.email === 'client@test.com' && data.password === 'client123') {
          const userData = { id: 2, name: 'Test Client', email: data.email, role: 'client' };
          login(userData, 'mock-jwt-token-client', remember);
          navigate('/client/dashboard');
        } else if (data.email === 'photographer@test.com' && data.password === 'photo123') {
          const userData = { id: 3, name: 'Test Photographer', email: data.email, role: 'photographer' };
          login(userData, 'mock-jwt-token-photographer', remember);
          navigate('/photographer/dashboard');
        } else {
          // For any other valid credentials, allow login
          const userData = { 
            id: Date.now(), 
            name: data.email.split('@')[0], 
            email: data.email, 
            role: data.role 
          };
          login(userData, 'mock-jwt-token', remember);
          navigate(`/${data.role}/dashboard`);
        }
      }
    } catch (error) {
      setServerError(error.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page py-5" style={{ background: 'radial-gradient(circle at top right, rgba(34, 94, 161, 0.1) 0%, transparent 50%), linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)', minHeight: '100vh' }}>
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-md-8 col-lg-6">
            <div className="card border-0 shadow-lg" style={{ borderRadius: '16px' }}>
              <div className="card-body p-5">
                {/* Logo and Header */}
                <div className="text-center mb-4">
                  <div className="mb-3">
                    <span style={{ fontSize: '3rem' }}>📸</span>
                  </div>
                  <h2 className="fw-bold">Welcome Back</h2>
                  <p className="text-muted">Sign in to your BookYourShoot account</p>
                </div>

                {/* Server Error */}
                {serverError && (
                  <div className="alert alert-danger" role="alert">
                    {serverError}
                  </div>
                )}

                {/* Login Form */}
                <form onSubmit={handleSubmit(onSubmit)}>
                  {/* Role Selection */}
                  <div className="mb-4">
                    <label className="form-label fw-semibold">I am a:</label>
                    <div className="d-flex gap-3">
                      {['client', 'photographer', 'admin'].map((role) => (
                        <div className="form-check" key={role}>
                          <input
                            className="form-check-input"
                            type="radio"
                            name="role"
                            id={`role-${role}`}
                            value={role}
                            {...register('role')}
                          />
                          <label 
                            className="form-check-label text-capitalize" 
                            htmlFor={`role-${role}`}
                          >
                            {role}
                          </label>
                        </div>
                      ))}
                    </div>
                    {errors.role && (
                      <div className="text-danger small mt-1">{errors.role.message}</div>
                    )}
                  </div>

                  {/* Email Field */}
                  <div className="mb-3">
                    <label htmlFor="email" className="form-label fw-semibold">
                      Email Address
                    </label>
                    <input
                      type="email"
                      className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                      id="email"
                      placeholder="Enter your email"
                      {...register('email')}
                    />
                    {errors.email && (
                      <div className="text-danger small mt-1">{errors.email.message}</div>
                    )}
                  </div>

                  {/* Password Field - shown only in password mode */}
                  {loginMethod === 'password' && (
                    <div className="mb-3">
                      <label htmlFor="password" className="form-label fw-semibold">
                        Password
                      </label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type={showPassword ? "text" : "password"}
                          className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                          id="password"
                          placeholder="Enter your password"
                          {...register('password')}
                          style={{ paddingRight: '40px' }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          style={{
                            position: 'absolute',
                            right: '10px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            border: 'none',
                            background: 'transparent',
                            cursor: 'pointer',
                            padding: '0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            {showPassword ? (
                              // Eye icon (visible)
                              <>
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                              </>
                            ) : (
                              // Eye-off icon (hidden)
                              <>
                                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                <line x1="1" y1="1" x2="23" y2="23"></line>
                              </>
                            )}
                          </svg>
                        </button>
                      </div>
                      {errors.password && (
                        <div className="text-danger small mt-1">{errors.password.message}</div>
                      )}
                    </div>
                  )}

                  {/* Remember Me & Forgot Password - shown only in password mode */}
                  {loginMethod === 'password' && (
                    <div className="d-flex justify-content-between align-items-center mb-4">
                      <div className="form-check">
                        <input className="form-check-input" type="checkbox" id="remember" />
                        <label className="form-check-label" htmlFor="remember">
                          Remember me
                        </label>
                      </div>
                      <button 
                        type="button"
                        className="btn btn-link text-primary text-decoration-none p-0"
                        onClick={() => setLoginMethod('otp')}
                      >
                        Forgot password?
                      </button>
                    </div>
                  )}

                  {/* Info about OTP login - shown only in OTP mode */}
                  {loginMethod === 'otp' && (
                    <div className="alert alert-info small mb-3" role="alert">
                      <strong>📧 OTP Login:</strong> We'll send a 6-digit code to your email for secure login.
                    </div>
                  )}

                  {/* Toggle back to password login - shown only in OTP mode */}
                  {loginMethod === 'otp' && (
                    <div className="text-center mb-3">
                      <button 
                        type="button"
                        className="btn btn-link text-primary text-decoration-none p-0"
                        onClick={() => setLoginMethod('password')}
                      >
                        ← Back to password login
                      </button>
                    </div>
                  )}

                  {/* Submit Button */}
                  <button 
                    type="submit" 
                    className="btn btn-primary w-100 py-3 mb-3"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        {loginMethod === 'otp' ? 'Sending OTP...' : 'Signing in...'}
                      </>
                    ) : (
                      loginMethod === 'otp' ? 'Send OTP' : 'Sign In'
                    )}
                  </button>
                </form>

                {/* Demo Accounts Info - shown only in password mode */}
                {loginMethod === 'password' && (
                  <div className="alert alert-info small" role="alert">
                    <strong>Demo Accounts:</strong><br/>
                    Client: client@test.com / client123<br/>
                    Photographer: photographer@test.com / photo123<br/>
                    Admin: admin@bookyourshoot.com / admin123
                  </div>
                )}

                {/* Register Link */}
                <div className="text-center mt-4">
                  <p className="mb-0">
                    Don't have an account?{' '}
                    <Link 
                      to="/register" 
                      className="text-primary text-decoration-none fw-semibold"
                      onClick={() => window.scrollTo(0, 0)}
                    >
                      Sign up here
                    </Link>
                  </p>
                </div>
              </div>
            </div>

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

export default Login;
