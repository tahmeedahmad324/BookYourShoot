const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000"

// Send OTP
export const sendOTP = async (email) => {
  try {
    const response = await fetch(`${API_BASE}/api/auth/send-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    })

    if (!response.ok) throw new Error("Failed to send OTP")
    return await response.json()
  } catch (error) {
    console.error("Send OTP error:", error)
    throw error
  }
}

// Verify OTP
export const verifyOTP = async (email, otp) => {
  try {
    const response = await fetch(`${API_BASE}/api/auth/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp }),
    })

    if (!response.ok) throw new Error("Failed to verify OTP")
    return await response.json()
  } catch (error) {
    console.error("Verify OTP error:", error)
    throw error
  }
}

// Register with OTP
export const registerWithOTP = async (userData, otp) => {
  try {
    const response = await fetch(`${API_BASE}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...userData, otp }),
    })

    if (!response.ok) throw new Error("Registration failed")
    return await response.json()
  } catch (error) {
    console.error("Register error:", error)
    throw error
  }
}

// Login with OTP
export const loginWithOTP = async (email, otp) => {
  try {
    const response = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp }),
    })

    if (!response.ok) throw new Error("Login failed")
    return await response.json()
  } catch (error) {
    console.error("Login error:", error)
    throw error
  }
}
