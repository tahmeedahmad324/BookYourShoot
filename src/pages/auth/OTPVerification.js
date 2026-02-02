import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../supabaseClient';

const OTPVerification = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes for email OTP
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Get email and role from navigation state or sessionStorage
  const stateEmail = location.state?.email;
  const stateMessage = location.state?.message;
  const pendingReg = sessionStorage.getItem('pendingRegistration');
  const pendingData = pendingReg ? JSON.parse(pendingReg) : null;
  
  const email = stateEmail || pendingData?.email;
  const role = location.state?.role || pendingData?.role;

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
    setSuccess('');

    const otpValue = otp.join('');
    
    if (otpValue.length !== 6) {
      setError('Please enter all 6 digits');
      setLoading(false);
      return;
    }

    try {
      // Verify email with OTP token
      const { data, error } = await supabase.auth.verifyOtp({
        email: email,
        token: otpValue,
        type: 'signup'
      });

      if (error) throw error;

      if (data.session) {
        setSuccess('Email verified successfully! Redirecting...');
        
        // Clear pending registration
        sessionStorage.removeItem('pendingRegistration');
        
        // Redirect based on role
        setTimeout(() => {
          if (role === 'photographer') {
            navigate('/register/cnic');
          } else {
            navigate(`/${role}/dashboard`);
          }
        }, 1500);
      }
    } catch (error) {
      console.error('OTP verification error:', error);
      setError(error.message || 'Invalid verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!email) {
      setError('Email not found. Please register again.');
      return;
    }
    
    setIsResending(true);
    setError('');
    
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email
      });
      
      if (error) throw error;
      
      setSuccess('Verification code sent! Check your email.');
      setTimeLeft(300); // Reset timer
    } catch (error) {
      setError(error.message || 'Failed to resend code. Please try again.');
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
                    <span style={{ fontSize: '3rem' }}>�</span>
                  </div>
                  <h2 className="fw-bold">Verify Your Email</h2>
                  <p className="text-muted">
                    {stateMessage || "We've sent a 6-digit verification code to your email address"}
                  </p>
                  {email && (
                    <p className="text-primary fw-semibold">
                      {email}
                    </p>
                  )}
                  {role === 'photographer' && (
                    <div className="alert alert-info small">
                      <strong>Next Step:</strong> After email verification, you'll need to upload your CNIC for identity verification.
                    </div>
                  )}
                </div>

                {/* Success Message */}
                {success && (
                  <div className="alert alert-success" role="alert">
                    ✓ {success}
                  </div>
                )}

                {/* Error Message */}
                {error && (
                  <div className="alert alert-danger" role="alert">
                    ✗ {error}
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
