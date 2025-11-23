/*
BACKEND IMPLEMENTATION GUIDE - CNIC OCR Service

Install dependencies:
npm install tesseract.js multer sharp dotenv

Environment Variables (.env):
CNIC_VERIFICATION_API_KEY=your_api_key

Routes to implement:

1. POST /api/cnic/extract
   - Accept image upload
   - Use Tesseract to extract text from image
   - Parse CNIC number, name, DOB, etc.
   - Return extracted data

2. POST /api/cnic/verify
   - Validate CNIC format (XXX-XXXXXXX-X)
   - Check if name matches
   - Verify with CNIC validation database (if available)
   - Return verification status

3. POST /api/cnic/upload
   - Authenticate user
   - Store verified CNIC data
   - Update user verification status
   - Store image in secure storage

Example implementation structure:
*/

// Sample Node.js CNIC OCR implementation using Tesseract
const express = require("express")
const router = express.Router()
const Tesseract = require("tesseract.js")
const multer = require("multer")
const sharp = require("sharp")
const path = require("path")

// Configure multer for image uploads
const storage = multer.memoryStorage()
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true)
    } else {
      cb(new Error("Only image files are allowed"))
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
})

// Extract CNIC data from image
router.post("/extract", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Image file is required" })
    }

    // Optimize image before OCR
    const optimizedImage = await sharp(req.file.buffer).resize(1200, 800).grayscale().normalize().toBuffer()

    // Run Tesseract OCR
    const result = await Tesseract.recognize(optimizedImage, "eng+urd", { logger: (m) => console.log(m) })

    const text = result.data.text

    // Parse CNIC data from OCR result
    const extractedData = parseCNICData(text)

    res.json({
      success: true,
      data: extractedData,
      rawText: text,
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Helper function to parse CNIC data
const parseCNICData = (text) => {
  // Extract using regex patterns
  const cnicPattern = /(\d{5}-\d{7}-\d{1})/
  const namePattern = /([A-Z\s]{2,})/
  const dobPattern = /(\d{1,2}[/-]\d{1,2}[/-]\d{4})/

  return {
    cnicNumber: text.match(cnicPattern)?.[1] || "",
    name: text.match(namePattern)?.[1] || "",
    dateOfBirth: text.match(dobPattern)?.[1] || "",
    rawText: text,
  }
}

// Verify CNIC details
router.post("/verify", async (req, res) => {
  try {
    const { cnicNumber, name, fatherName, dateOfBirth } = req.body

    // Validate CNIC format
    const cnicRegex = /^\d{5}-\d{7}-\d{1}$/
    if (!cnicRegex.test(cnicNumber)) {
      return res.status(400).json({ error: "Invalid CNIC format" })
    }

    // In production, verify against NADRA database
    // For demo, accept all valid format CNICs

    res.json({
      success: true,
      verified: true,
      message: "CNIC verified successfully",
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Upload verified CNIC
router.post("/upload", async (req, res) => {
  try {
    const { cnicNumber, name, fatherName, dateOfBirth, userId } = req.body
    const token = req.headers.authorization?.split(" ")[1]

    if (!token) {
      return res.status(401).json({ error: "Unauthorized" })
    }

    // Verify user from token
    // Update user's CNIC verification status in database

    res.json({
      success: true,
      message: "CNIC uploaded successfully",
      status: "pending_review",
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

module.exports = router
