"use client"

import { useState } from "react"
import { Link } from "react-router-dom"

const Contact = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  })
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      // Submit contact form
      // const response = await submitContactForm(formData);
      setSubmitted(true)
      setFormData({ name: "", email: "", subject: "", message: "" })
      setTimeout(() => setSubmitted(false), 5000)
    } catch (error) {
      console.error("Failed to submit form:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-lg-8">
          <h1 className="fw-bold mb-2 text-center">Contact Us</h1>
          <p className="text-muted text-center mb-5">We'd love to hear from you. Send us your feedback or questions.</p>

          <div className="row g-4 mb-5">
            <div className="col-md-6">
              <div className="card border-0 shadow-sm">
                <div className="card-body text-center">
                  <div style={{ fontSize: "2.5rem" }}>📍</div>
                  <h6 className="fw-bold mt-3">Address</h6>
                  <p className="text-muted">
                    Lahore, Punjab
                    <br />
                    Pakistan
                  </p>
                </div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="card border-0 shadow-sm">
                <div className="card-body text-center">
                  <div style={{ fontSize: "2.5rem" }}>⏱️</div>
                  <h6 className="fw-bold mt-3">Response Time</h6>
                  <p className="text-muted">
                    Monday - Friday
                    <br />
                    9:00 AM - 6:00 PM
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="card border-0 shadow-sm mb-4">
            <div className="card-body p-4">
              <h5 className="fw-bold mb-4">Send us a message</h5>

              {submitted && (
                <div className="alert alert-success">Thank you for contacting us! We'll get back to you soon.</div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Full Name</label>
                  <input
                    type="text"
                    className="form-control"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Your name"
                    required
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold">Email Address</label>
                  <input
                    type="email"
                    className="form-control"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="your@email.com"
                    required
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold">Subject</label>
                  <input
                    type="text"
                    className="form-control"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    placeholder="What is this about?"
                    required
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold">Message</label>
                  <textarea
                    className="form-control"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    rows="5"
                    placeholder="Your message..."
                    required
                  ></textarea>
                </div>

                <button type="submit" className="btn btn-primary w-100" disabled={loading}>
                  {loading ? "Sending..." : "Send Message"}
                </button>
              </form>
            </div>
          </div>

          <div className="text-center">
            <p className="text-muted mb-3">You can also reach us directly:</p>
            <p className="mb-2">
              <strong>Email:</strong>{" "}
              <a href="mailto:support@bookyourshoot.com" className="text-primary">
                support@bookyourshoot.com
              </a>
            </p>
            <p className="mb-3">
              <strong>Phone:</strong>{" "}
              <a href="tel:+923001234567" className="text-primary">
                +92-300-1234567
              </a>
            </p>
            <Link to="/" className="btn btn-outline-primary mt-3">
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Contact
