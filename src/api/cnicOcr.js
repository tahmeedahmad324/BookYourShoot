const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:8000/api"

// Extract CNIC data using OCR
export const extractCNICData = async (imageFile) => {
  try {
    const formData = new FormData()
    formData.append("image", imageFile)

    const response = await fetch(`${API_BASE}/cnic/extract`, {
      method: "POST",
      body: formData,
    })

    if (!response.ok) throw new Error("CNIC extraction failed")
    return await response.json()
  } catch (error) {
    console.error("CNIC extraction error:", error)
    throw error
  }
}

// Verify CNIC details
export const verifyCNIC = async (cnicNumber, userData) => {
  try {
    const response = await fetch(`${API_BASE}/cnic/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cnicNumber,
        name: userData.name,
        fatherName: userData.fatherName,
        dateOfBirth: userData.dateOfBirth,
      }),
    })

    if (!response.ok) throw new Error("CNIC verification failed")
    return await response.json()
  } catch (error) {
    console.error("CNIC verification error:", error)
    throw error
  }
}

// Upload verified CNIC
export const uploadVerifiedCNIC = async (cnicData, userId) => {
  try {
    const response = await fetch(`${API_BASE}/cnic/upload`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({
        ...cnicData,
        userId,
      }),
    })

    if (!response.ok) throw new Error("CNIC upload failed")
    return await response.json()
  } catch (error) {
    console.error("CNIC upload error:", error)
    throw error
  }
}
