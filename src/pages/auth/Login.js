import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useAuth } from '../../context/AuthContext';

// Validation schema
const loginSchema = yup.object().shape({
  email: yup.string()
    .email('Please enter a valid email address')
    .required('Email is required'),
  password: yup.string()
    .min(6, 'Password must be at least 6 characters')
    .required('Password is required'),
  role: yup.string()
    .required('Please select your role')
});

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: yupResolver(loginSchema)
  });

  const onSubmit = async (data) => {
    setLoading(true);
    setServerError('');

    try {
      // Simulate API call for login
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Mock login logic - in real app, this would be an API call
      if (data.email === 'admin@bookyourshoot.com' && data.password === 'admin123') {
        const userData = { id: 1, name: 'Admin User', email: data.email, role: 'admin' };
        login(userData, 'mock-jwt-token-admin');
        navigate('/admin/dashboard');
      } else if (data.email === 'client@test.com' && data.password === 'client123') {
        const userData = { id: 2, name: 'Test Client', email: data.email, role: 'client' };
        login(userData, 'mock-jwt-token-client');
        navigate('/client/dashboard');
      } else if (data.email === 'photographer@test.com' && data.password === 'photo123') {
        const userData = { id: 3, name: 'Test Photographer', email: data.email, role: 'photographer' };
        login(userData, 'mock-jwt-token-photographer');
        navigate('/photographer/dashboard');
      } else {
        // For demo purposes, allow any login with valid format
        const userData = { 
          id: Date.now(), 
          name: data.email.split('@')[0], 
          email: data.email, 
          role: data.role 
        };
        login(userData, 'mock-jwt-token');
        navigate(`/${data.role}/dashboard`);
      }
    } catch (error) {
      setServerError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page py-5">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-md-6 col-lg-5">
            <div className="card border-0 shadow-lg">
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

                  {/* Password Field */}
                  <div className="mb-4">
                    <label htmlFor="password" className="form-label fw-semibold">
                      Password
                    </label>
                    <div className="input-group">
                      <span className="input-group-text">
                        🔒
                      </span>
                      <input
                        type="password"
                        className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                        id="password"
                        placeholder="Enter your password"
                        {...register('password')}
                      />
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

                {/* Demo Accounts Info */}
                <div className="alert alert-info small" role="alert">
                  <strong>Demo Accounts:</strong><br/>
                  Client: client@test.com / client123<br/>
                  Photographer: photographer@test.com / photo123<br/>
                  Admin: admin@bookyourshoot.com / admin123
                </div>

                {/* Register Link */}
                <div className="text-center mt-4">
                  <p className="mb-0">
                    Don't have an account?{' '}
                    <Link to="/register" className="text-primary text-decoration-none fw-semibold">
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