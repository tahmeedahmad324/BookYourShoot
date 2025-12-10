import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { registerWithOTP, loginWithOTP, sendOTP } from '../../api/auth';

const OTPVerification = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(120); // 2 minutes
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState('');
  
  // Get email and flow from navigation state
  const email = location.state?.email;
  const flow = location.state?.flow; // 'register' or 'login'

  useEffect(() => {
    const timer = timeLeft > 0 && setInterval(() => setTimeLeft(timeLeft - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const handleOtpChange = (index, value) => {
    if (value.length <= 1 && /^\d*$/.test(value)) {
      const newOtp = [...otp];
      newOtp[index] = value;
      setOtp(newOtp);

      // Auto focus next input
      if (value && index < 5) {
        const nextInput = document.getElementById(`otp-input-${index + 1}`);
        if (nextInput) nextInput.focus();
      }
    }
  };

  const handleKeyDown = (index, e) => {
    // Move to previous input on backspace
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-input-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    if (/^\d+$/.test(pastedData)) {
      const newOtp = pastedData.padEnd(6, '').split('');
      setOtp(newOtp);
      
      // Focus last filled input
      const lastIndex = newOtp.findIndex(val => val === '');
      const focusIndex = lastIndex === -1 ? 5 : lastIndex - 1;
      setTimeout(() => {
        const input = document.getElementById(`otp-input-${focusIndex}`);
        if (input) input.focus();
      }, 0);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const otpValue = otp.join('');
    
    if (otpValue.length !== 6) {
      setError('Please enter all 6 digits');
      setLoading(false);
      return;
    }

    try {
      if (flow === 'register') {
        // Registration flow
        const regData = JSON.parse(sessionStorage.getItem('registrationData') || '{}');
        const response = await registerWithOTP(regData, otpValue);
        
        // Login user with returned token
        const userData = {
          id: response.user_id,
          email: regData.email,
          name: regData.full_name,
          role: regData.role
        };
        login(userData, response.access_token);
        
        // Clear session storage
        sessionStorage.removeItem('registrationData');
        
        // Redirect based on role
        if (regData.role === 'photographer') {
          navigate('/register/cnic');
        } else {
          navigate(`/${regData.role}/dashboard`);
        }
      } else if (flow === 'login') {
        // Login flow
        const loginData = JSON.parse(sessionStorage.getItem('loginData') || '{}');
        const response = await loginWithOTP(email, otpValue);
        
        // Login user with returned token
        const userData = {
          id: response.user_id,
          email: email,
          role: loginData.role
        };
        login(userData, response.access_token);
        
        // Clear session storage
        sessionStorage.removeItem('loginData');
        
        // Redirect to dashboard
        navigate(`/${loginData.role}/dashboard`);
      }
    } catch (error) {
      setError(error.message || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setIsResending(true);
    setError('');

    try {
      // Resend OTP using the email from state
      if (email) {
        await sendOTP(email);
      }
      
      // Reset timer and OTP inputs
      setTimeLeft(120);
      setOtp(['', '', '', '', '', '']);
      
      // Focus first input
      setTimeout(() => {
        const firstInput = document.getElementById('otp-input-0');
        if (firstInput) firstInput.focus();
      }, 0);
    } catch (error) {
      setError(error.message || 'Failed to resend OTP. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="otp-verification py-5">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-md-6 col-lg-5">
            <div className="card border-0 shadow-lg">
              <div className="card-body p-5">
                <div className="text-center mb-4">
                  <div className="mb-3">
                    <span style={{ fontSize: '3rem' }}>🔐</span>
                  </div>
                  <h2 className="fw-bold">Verify Your Email</h2>
                  <p className="text-muted">
                    We've sent a 6-digit verification code to your email address
                  </p>
                  {email && (
                    <p className="text-primary fw-semibold">
                      {email}
                    </p>
                  )}
                  {flow === 'register' && JSON.parse(sessionStorage.getItem('registrationData') || '{}').role === 'photographer' && (
                    <div className="alert alert-info small">
                      <strong>Next Step:</strong> After email verification, you'll need to upload your CNIC for identity verification.
                    </div>
                  )}
                </div>

                {/* Error Message */}
                {error && (
                  <div className="alert alert-danger" role="alert">
                    {error}
                  </div>
                )}

                {/* OTP Form */}
                <form onSubmit={handleSubmit}>
                  <div className="mb-4">
                    <label className="form-label fw-semibold text-center d-block mb-3">
                      Enter Verification Code
                    </label>
                    <div className="d-flex justify-content-center gap-2">
                      {otp.map((digit, index) => (
                        <input
                          key={index}
                          id={`otp-input-${index}`}
                          type="text"
                          className="form-control text-center fw-bold"
                          style={{ 
                            width: '45px', 
                            height: '50px', 
                            fontSize: '1.5rem',
                            border: `2px solid ${digit ? 'var(--primary-blue)' : 'var(--soft-gray)'}`,
                            borderRadius: '8px'
                          }}
                          value={digit}
                          onChange={(e) => handleOtpChange(index, e.target.value)}
                          onKeyDown={(e) => handleKeyDown(index, e)}
                          onPaste={handlePaste}
                          maxLength={1}
                          inputMode="numeric"
                          autoComplete="off"
                        />
                      ))}
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button 
                    type="submit" 
                    className="btn btn-primary w-100 py-3 mb-3"
                    disabled={loading || otp.join('').length !== 6}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Verifying...
                      </>
                    ) : (
                      '✓ Verify Email'
                    )}
                  </button>
                </form>

                {/* Resend OTP */}
                <div className="text-center">
                  {timeLeft > 0 ? (
                    <p className="text-muted mb-0">
                      Resend code in <span className="fw-semibold text-primary">{formatTime(timeLeft)}</span>
                    </p>
                  ) : (
                    <button 
                      className="btn btn-outline-primary"
                      onClick={handleResendOtp}
                      disabled={isResending}
                    >
                      {isResending ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                          Sending...
                        </>
                      ) : (
                        '🔄 Resend Code'
                      )}
                    </button>
                  )}
                </div>

                {/* Contact Support */}
                <div className="text-center mt-4">
                  <p className="text-muted small mb-2">
                    Didn't receive the code?
                  </p>
                  <Link to="/support" className="text-primary text-decoration-none small">
                    Contact Support
                  </Link>
                </div>
              </div>
            </div>

            {/* Back */}
            <div className="text-center mt-4">
              <Link to="/register" className="text-muted text-decoration-none">
                ← Back to Registration
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OTPVerification;
