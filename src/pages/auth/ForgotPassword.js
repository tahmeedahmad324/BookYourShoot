"use client"

import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"

const ForgotPassword = () => {
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [step, setStep] = useState(1) // 1: email, 2: otp, 3: reset
  const [otp, setOtp] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const handleSendOTP = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      // Call send OTP API
      // const response = await sendOTP(email);
      setSuccess("OTP sent to your email")
      setStep(2)
    } catch (err) {
      setError("Failed to send OTP")
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOTP = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      // Call verify OTP API
      // const response = await verifyOTP(email, otp);
      setSuccess("OTP verified successfully")
      setStep(3)
    } catch (err) {
      setError("Invalid OTP")
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match")
      return
    }
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters")
      return
    }

    setLoading(true)
    setError("")
    try {
      // Call reset password API
      // const response = await resetPassword(email, newPassword);
      setSuccess("Password reset successfully")
      setTimeout(() => navigate("/login"), 2000)
    } catch (err) {
      setError("Failed to reset password")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-md-6">
          <div className="card border-0 shadow-sm">
            <div className="card-body p-5">
              <h2 className="fw-bold mb-2 text-center">Forgot Password</h2>
              <p className="text-muted text-center mb-4">Reset your password in a few steps</p>

              {error && <div className="alert alert-danger">{error}</div>}
              {success && <div className="alert alert-success">{success}</div>}

              {step === 1 && (
                <form onSubmit={handleSendOTP}>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Email Address</label>
                    <input
                      type="email"
                      className="form-control"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <button type="submit" className="btn btn-primary w-100" disabled={loading}>
                    {loading ? "Sending..." : "Send OTP"}
                  </button>
                  <div className="text-center mt-3">
                    <p className="text-muted">
                      Back to{" "}
                      <Link to="/login" className="text-primary">
                        Login
                      </Link>
                    </p>
                  </div>
                </form>
              )}

              {step === 2 && (
                <form onSubmit={handleVerifyOTP}>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Enter OTP</label>
                    <input
                      type="text"
                      className="form-control text-center"
                      placeholder="000000"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      maxLength="6"
                      required
                    />
                    <small className="text-muted">Check your email for the 6-digit OTP</small>
                  </div>
                  <button type="submit" className="btn btn-primary w-100" disabled={loading}>
                    {loading ? "Verifying..." : "Verify OTP"}
                  </button>
                </form>
              )}

              {step === 3 && (
                <form onSubmit={handleResetPassword}>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">New Password</label>
                    <input
                      type="password"
                      className="form-control"
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Confirm Password</label>
                    <input
                      type="password"
                      className="form-control"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                  <button type="submit" className="btn btn-primary w-100" disabled={loading}>
                    {loading ? "Resetting..." : "Reset Password"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ForgotPassword
