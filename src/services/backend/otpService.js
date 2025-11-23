/*
BACKEND IMPLEMENTATION GUIDE - OTP Service

Install dependencies:
npm install twilio dotenv express-validator

Environment Variables (.env):
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890

Routes to implement:

1. POST /api/auth/send-otp
   - Validate email format
   - Generate 6-digit OTP
   - Store OTP with 2-minute expiry in database/cache
   - Send OTP via email (using nodemailer or SendGrid)
   - Return success message

2. POST /api/auth/verify-otp
   - Validate OTP against stored value
   - Check OTP expiry
   - Mark as verified if correct
   - Return verification token

3. POST /api/auth/register
   - Verify OTP first
   - Validate all user data
   - Create user in database
   - Return authentication token

4. POST /api/auth/login
   - Verify OTP first
   - Find user by email
   - Generate JWT token
   - Return token and user data

Example implementation structure:
*/

// Sample Node.js OTP implementation
const express = require("express")
const router = express.Router()
const crypto = require("crypto")

// OTP storage (use Redis in production)
const otpStore = {}

// Generate OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// Send OTP endpoint
router.post("/send-otp", async (req, res) => {
  try {
    const { email } = req.body

    if (!email) {
      return res.status(400).json({ error: "Email is required" })
    }

    const otp = generateOTP()
    const expiryTime = Date.now() + 2 * 60 * 1000 // 2 minutes

    // Store OTP
    otpStore[email] = {
      otp,
      expiryTime,
      attempts: 0,
    }

    // Send email (implement using nodemailer or SendGrid)
    // await sendEmailWithOTP(email, otp);

    // For demo, log the OTP
    console.log(`OTP for ${email}: ${otp}`)

    res.json({
      success: true,
      message: "OTP sent to your email",
      email: email,
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Verify OTP endpoint
router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body

    if (!email || !otp) {
      return res.status(400).json({ error: "Email and OTP are required" })
    }

    const storedOTP = otpStore[email]

    if (!storedOTP) {
      return res.status(400).json({ error: "OTP not found. Please request a new one" })
    }

    if (Date.now() > storedOTP.expiryTime) {
      delete otpStore[email]
      return res.status(400).json({ error: "OTP expired. Please request a new one" })
    }

    if (storedOTP.otp !== otp) {
      storedOTP.attempts++
      if (storedOTP.attempts >= 3) {
        delete otpStore[email]
        return res.status(400).json({ error: "Too many attempts. Please request a new OTP" })
      }
      return res.status(400).json({ error: "Invalid OTP" })
    }

    // OTP verified successfully
    delete otpStore[email]

    res.json({
      success: true,
      message: "OTP verified",
      verified: true,
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

module.exports = router
