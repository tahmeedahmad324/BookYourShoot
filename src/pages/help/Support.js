"use client"

import { useState } from "react"
import { Link } from "react-router-dom"

const Support = () => {
  const [openFAQ, setOpenFAQ] = useState(null)

  const faqs = [
    {
      id: 1,
      question: "How do I book a photographer?",
      answer:
        "Search for photographers using our search feature, view their profiles, and click 'Book Now'. Fill out the booking form with your requirements and submit.",
    },
    {
      id: 2,
      question: "Can I cancel my booking?",
      answer:
        "Yes, you can cancel bookings up to 48 hours before the scheduled shoot date. After that, cancellation fees may apply.",
    },
    {
      id: 3,
      question: "What payment methods are accepted?",
      answer: "We accept credit cards, debit cards, and digital payment methods. All payments are processed securely.",
    },
    {
      id: 4,
      question: "How do I verify my CNIC as a photographer?",
      answer: "Upload a clear image of your CNIC during registration. Our team will verify it within 24-48 hours.",
    },
    {
      id: 5,
      question: "What should I do if I have a complaint?",
      answer:
        "You can file a complaint through your dashboard or contact our support team. We'll investigate and resolve it within 5 business days.",
    },
    {
      id: 6,
      question: "How do I set my availability?",
      answer:
        "Go to your photographer dashboard and set your available dates and times. Clients will only see slots you've marked as available.",
    },
  ]

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-lg-8">
          <h1 className="fw-bold mb-2 text-center">Support & Help Center</h1>
          <p className="text-muted text-center mb-4">Find answers to common questions</p>

          <div className="row g-4 mb-5">
            <div className="col-md-3">
              <div className="card border-0 shadow-sm text-center">
                <div className="card-body">
                  <div style={{ fontSize: "2rem" }}>📖</div>
                  <h6 className="fw-bold mt-2">FAQ</h6>
                  <p className="text-muted small">Common questions answered</p>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card border-0 shadow-sm text-center">
                <div className="card-body">
                  <div style={{ fontSize: "2rem" }}>💬</div>
                  <h6 className="fw-bold mt-2">Chat Support</h6>
                  <p className="text-muted small">Real-time assistance</p>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card border-0 shadow-sm text-center">
                <div className="card-body">
                  <div style={{ fontSize: "2rem" }}>📧</div>
                  <h6 className="fw-bold mt-2">Email</h6>
                  <p className="text-muted small">support@bookyourshoot.com</p>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card border-0 shadow-sm text-center">
                <div className="card-body">
                  <div style={{ fontSize: "2rem" }}>📞</div>
                  <h6 className="fw-bold mt-2">Phone</h6>
                  <p className="text-muted small">+92-300-1234567</p>
                </div>
              </div>
            </div>
          </div>

          <h4 className="fw-bold mb-4">Frequently Asked Questions</h4>

          <div className="accordion mb-5" id="faqAccordion">
            {faqs.map((faq) => (
              <div className="accordion-item border-0 shadow-sm mb-2" key={faq.id}>
                <h2 className="accordion-header">
                  <button
                    className="accordion-button collapsed"
                    type="button"
                    onClick={() => setOpenFAQ(openFAQ === faq.id ? null : faq.id)}
                    aria-expanded={openFAQ === faq.id}
                  >
                    {faq.question}
                  </button>
                </h2>
                {openFAQ === faq.id && <div className="accordion-body">{faq.answer}</div>}
              </div>
            ))}
          </div>

          <div className="card border-0 shadow-sm bg-light">
            <div className="card-body text-center p-5">
              <h5 className="fw-bold mb-3">Didn't find what you're looking for?</h5>
              <p className="text-muted mb-3">Contact our support team for personalized assistance</p>
              <Link to="/contact" className="btn btn-primary">
                Contact Support
              </Link>
            </div>
          </div>

          <div className="text-center mt-4">
            <Link to="/" className="btn btn-outline-primary">
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Support
