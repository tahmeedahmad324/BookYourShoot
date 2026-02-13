import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useAuth } from '../../context/AuthContext';
import { loginWithPassword } from '../../api/auth';
import api from '../../services/api';
import { supabase } from '../../supabaseClient';

// Validation schema - Password login
const loginSchema = yup.object().shape({
  email: yup.string()
    .email('Please enter a valid email address')
    .required('Email is required'),
  password: yup.string()
    .required('Password is required'),
  role: yup.string()
    .required('Please select your role')
});

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const { register, handleSubmit, formState: { errors }, setValue } = useForm({
    resolver: yupResolver(loginSchema)
  });

  // Check for success message from registration flow
  useEffect(() => {
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
    }
    if (location.state?.email) {
      setValue('email', location.state.email);
    }
  }, [location.state, setValue]);

  const onSubmit = async (data) => {
    console.log('[Login] onSubmit called with:', { email: data.email, role: data.role });
    setLoading(true);
    setServerError('');

    try {
      // Login with email and password (handles both mock and real accounts)
      console.log('[Login] Calling loginWithPassword...');
      const response = await loginWithPassword(data.email, data.password);
      console.log('[Login] loginWithPassword response:', response);

      // If mock account, manually call login to set user
      if (response.is_mock) {
        console.log('[Login] Mock account detected, calling login()');
        // Validate selected role matches the account's actual role
        if (response.user.role && response.user.role !== data.role) {
          setServerError(`This account is registered as a ${response.user.role}. Please select the correct role.`);
          setLoading(false);
          return;
        }
        await login({ ...response.user, is_mock: true });
        console.log('[Login] Navigating to:', `/${response.user.role}/dashboard`);
        navigate(`/${response.user.role}/dashboard`);
      } else {
        // Real accounts: Supabase session is now set
        // Fetch user profile from our API to get the actual role from DB
        console.log('[Login] Real account, fetching profile from /api/profile/me...');
        try {
          const profileRes = await api.get('/api/profile/me');
          console.log('[Login] Profile response:', profileRes.data);
          const userData = profileRes.data?.data?.user;

          if (userData) {
            console.log('[Login] User data found:', userData);
            // Validate selected role matches the account's actual role
            if (userData.role && userData.role !== data.role) {
              console.warn('[Login] Role mismatch! Selected:', data.role, 'Actual:', userData.role);
              setServerError(`This account is registered as a ${userData.role}. Please select the correct role.`);
              await supabase.auth.signOut();
              setLoading(false);
              return;
            }

            // Check if photographer needs CNIC verification
            if (userData.role === 'photographer' && !userData.cnic_verified) {
              console.warn('[Login] Photographer CNIC not verified, redirecting to CNIC upload');
              // DON'T sign out — CNIC upload API requires authentication
              // Redirect directly to CNIC upload page
              navigate('/register/cnic', {
                state: {
                  message: 'Please complete CNIC verification to access your photographer account.',
                  fromLogin: true
                }
              });
              setLoading(false);
              return;
            }

            // Set user in AuthContext BEFORE navigating
            // This ensures ProtectedRoute sees isAuthenticated = true
            await login(userData);
            console.log('[Login] login() called, now navigating to:', `/${userData.role || 'client'}/dashboard`);
            navigate(`/${userData.role || 'client'}/dashboard`);
            console.log('[Login] navigate() called');
          } else {
            console.log('[Login] No user data in response');
            setServerError('Unable to verify your account role. Please try again.');
            await supabase.auth.signOut();
          }
        } catch (profileErr) {
          console.error('[Login] Failed to fetch user profile after login:', profileErr);
          setServerError('Unable to verify your account. Please try again.');
          await supabase.auth.signOut();
        }
      }
    } catch (error) {
      console.error('[Login] Login error:', error);
      setServerError(error.message || 'Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
      console.log('[Login] onSubmit finished');
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

                {/* Success Message */}
                {successMessage && (
                  <div className="alert alert-success" role="alert">
                    ✓ {successMessage}
                  </div>
                )}

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

                  {/* Password Field */}
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
                          cursor: 'pointer'
                        }}
                      >
                        {showPassword ? '👁️' : '👁️‍🗨️'}
                      </button>
                    </div>
                    {errors.password && (
                      <div className="text-danger small mt-1">{errors.password.message}</div>
                    )}
                  </div>

                  {/* Remember Me & Forgot Password */}
                  <div className="d-flex justify-content-between align-items-center mb-4">
                    <div className="form-check">
                      <input className="form-check-input" type="checkbox" id="remember" />
                      <label className="form-check-label" htmlFor="remember">
                        Remember me
                      </label>
                    </div>
                    <Link to="/forgot-password" className="text-primary text-decoration-none">
                      Forgot password?
                    </Link>
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
                        Signing in...
                      </>
                    ) : (
                      'Sign In'
                    )}
                  </button>
                </form>

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
