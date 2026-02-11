import { useState, useEffect } from "react"
import { Link, useParams, useSearchParams } from "react-router-dom"
import { QRCodeSVG } from "qrcode.react"
import {
  CheckCircle,
  Download,
  Mail,
  Calendar,
  User,
  CreditCard,
  Shield,
  ArrowRight,
  Clock,
  Printer,
  Share2,
  Home
} from "lucide-react"

const PaymentSuccess = () => {
  const { bookingId } = useParams()
  const [searchParams] = useSearchParams()
  const transactionId = searchParams.get("txn") || `TXN-${bookingId}`

  const [receipt, setReceipt] = useState(null)
  const [loading, setLoading] = useState(true)
  const [emailSent, setEmailSent] = useState(false)

  useEffect(() => {
    fetchReceipt()
  }, [transactionId])

  const fetchReceipt = async () => {
    try {
      const res = await fetch(`http://localhost:8000/api/payments/receipts/${transactionId}`)
      const data = await res.json()
      if (data.success) {
        setReceipt(data.receipt)
      }
    } catch (err) {
      console.error("Error fetching receipt:", err)
    } finally {
      setLoading(false)
    }
  }

  const downloadPDF = async () => {
    try {
      const response = await fetch(`http://localhost:8000/api/payments/receipts/${transactionId}/pdf`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `receipt_${transactionId}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        a.remove()
      } else {
        // Fallback to HTML
        window.open(`http://localhost:8000/api/payments/receipts/${transactionId}/html`, '_blank')
      }
    } catch (err) {
      alert('Error downloading receipt')
    }
  }

  const viewReceipt = () => {
    window.open(`http://localhost:8000/api/payments/receipts/${transactionId}/html`, '_blank')
  }

  const shareReceipt = async () => {
    const url = `http://localhost:8000/api/payments/receipts/${transactionId}/html`
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Payment Receipt',
          text: `Receipt for booking ${bookingId}`,
          url: url
        })
      } catch (err) {
        // User cancelled or error
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(url)
      alert('Receipt link copied to clipboard!')
    }
  }

  // Mock data for demo when receipt not found
  const mockData = {
    transaction_id: transactionId,
    photographer_name: "Ahmed Khan Photography",
    service_type: "Wedding Photography",
    session_date: "2026-02-15",
    total: 45000,
    platform_fee: 4500,
    subtotal: 40500,
    status: "held"
  }

  const data = receipt || mockData

  if (loading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="payment-success py-5" style={{ background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)', minHeight: '100vh' }}>
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-lg-8">
            {/* Success Card */}
            <div className="card border-0 shadow-lg overflow-hidden">
              {/* Success Header */}
              <div className="text-center py-5" style={{ background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)' }}>
                <div className="mb-3">
                  <div className="d-inline-flex align-items-center justify-content-center rounded-circle bg-white" style={{ width: '80px', height: '80px' }}>
                    <CheckCircle size={48} className="text-success" />
                  </div>
                </div>
                <h2 className="text-white fw-bold mb-2">Payment Successful!</h2>
                <p className="text-white-50 mb-0">Your booking has been confirmed</p>
              </div>

              <div className="card-body p-4 p-lg-5">
                {/* Transaction Info */}
                <div className="row g-4 mb-4">
                  <div className="col-md-6">
                    <div className="p-3 rounded" style={{ background: '#f8f9fa' }}>
                      <small className="text-muted d-block mb-1">Transaction ID</small>
                      <strong className="font-monospace">{data.transaction_id}</strong>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="p-3 rounded" style={{ background: '#f8f9fa' }}>
                      <small className="text-muted d-block mb-1">Amount Paid</small>
                      <strong className="text-success fs-4">PKR {(data.total || 0).toLocaleString()}</strong>
                    </div>
                  </div>
                </div>

                {/* Booking Details */}
                <div className="mb-4">
                  <h5 className="fw-bold mb-3">Booking Details</h5>
                  <div className="list-group list-group-flush">
                    <div className="list-group-item d-flex align-items-center px-0">
                      <User size={20} className="text-primary me-3" />
                      <div>
                        <small className="text-muted d-block">Photographer</small>
                        <strong>{data.photographer_name}</strong>
                      </div>
                    </div>
                    <div className="list-group-item d-flex align-items-center px-0">
                      <CreditCard size={20} className="text-primary me-3" />
                      <div>
                        <small className="text-muted d-block">Service</small>
                        <strong>{data.service_type}</strong>
                      </div>
                    </div>
                    <div className="list-group-item d-flex align-items-center px-0">
                      <Calendar size={20} className="text-primary me-3" />
                      <div>
                        <small className="text-muted d-block">Session Date</small>
                        <strong>{data.session_date}</strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Escrow Info */}
                <div className="alert alert-warning d-flex align-items-start mb-4">
                  <Shield size={24} className="me-3 flex-shrink-0 mt-1" />
                  <div>
                    <strong className="d-block mb-1">Payment Secured in Escrow</strong>
                    <small>
                      Your payment of PKR {(data.total || 0).toLocaleString()} is safely held.
                      It will be released to the photographer after you confirm the work is completed
                      or automatically after 48 hours.
                    </small>
                  </div>
                </div>

                {/* QR Code */}
                <div className="text-center mb-4 p-4 rounded" style={{ background: '#f8f9fa' }}>
                  <h6 className="fw-bold mb-3">Scan to View Receipt</h6>
                  <div className="d-inline-block p-3 bg-white rounded shadow-sm">
                    <QRCodeSVG
                      value={`http://localhost:8000/api/payments/receipts/${transactionId}/html`}
                      size={150}
                      level="M"
                      includeMargin={true}
                    />
                  </div>
                  <p className="text-muted small mt-2 mb-0">
                    Show this QR code to verify your payment
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="row g-3 mb-4">
                  <div className="col-md-4">
                    <button
                      className="btn btn-primary w-100 d-flex align-items-center justify-content-center gap-2"
                      onClick={downloadPDF}
                    >
                      <Download size={18} /> Download PDF
                    </button>
                  </div>
                  <div className="col-md-4">
                    <button
                      className="btn btn-outline-primary w-100 d-flex align-items-center justify-content-center gap-2"
                      onClick={viewReceipt}
                    >
                      <Printer size={18} /> View Receipt
                    </button>
                  </div>
                  <div className="col-md-4">
                    <button
                      className="btn btn-outline-secondary w-100 d-flex align-items-center justify-content-center gap-2"
                      onClick={shareReceipt}
                    >
                      <Share2 size={18} /> Share
                    </button>
                  </div>
                </div>

                {/* Email Confirmation */}
                <div className="d-flex align-items-center justify-content-center gap-2 text-muted mb-4">
                  <Mail size={16} />
                  <small>A confirmation email has been sent to your registered email address</small>
                </div>

                {/* Next Steps */}
                <div className="border-top pt-4">
                  <h6 className="fw-bold mb-3">What's Next?</h6>
                  <div className="row g-3">
                    <div className="col-md-4">
                      <div className="d-flex align-items-start">
                        <div className="badge bg-primary rounded-circle me-2" style={{ width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>1</div>
                        <div>
                          <small className="fw-bold d-block">Prepare for Shoot</small>
                          <small className="text-muted">Coordinate with photographer</small>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="d-flex align-items-start">
                        <div className="badge bg-primary rounded-circle me-2" style={{ width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>2</div>
                        <div>
                          <small className="fw-bold d-block">Complete Session</small>
                          <small className="text-muted">Enjoy your photo shoot</small>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="d-flex align-items-start">
                        <div className="badge bg-primary rounded-circle me-2" style={{ width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>3</div>
                        <div>
                          <small className="fw-bold d-block">Confirm & Review</small>
                          <small className="text-muted">Release payment, leave review</small>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Navigation */}
                <div className="d-flex flex-wrap gap-3 justify-content-center mt-4 pt-4 border-top">
                  <Link to="/client/bookings" className="btn btn-success d-flex align-items-center gap-2">
                    <Calendar size={18} /> View My Bookings
                  </Link>
                  <Link to="/client/payments" className="btn btn-outline-primary d-flex align-items-center gap-2">
                    <CreditCard size={18} /> Payment History
                  </Link>
                  <Link to="/" className="btn btn-outline-secondary d-flex align-items-center gap-2">
                    <Home size={18} /> Back to Home
                  </Link>
                </div>
              </div>
            </div>

            {/* Support Note */}
            <div className="text-center mt-4">
              <small className="text-muted">
                Need help? Contact us at <a href="mailto:support@bookyourshoot.com">support@bookyourshoot.com</a>
              </small>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PaymentSuccess
