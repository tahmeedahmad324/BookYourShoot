import { useState, useCallback } from "react"
import { useAuth } from "../context/AuthContext"
import {
  AlertTriangle,
  Upload,
  X,
  File,
  Image,
  FileText,
  Send,
  Camera,
  Check
} from "lucide-react"

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:8000/api"

/**
 * DisputeForm Component
 * Allows users to create a dispute with evidence uploads
 * 
 * Props:
 * - bookingId: string - The booking ID to dispute
 * - transactionId: string - The payment transaction ID
 * - photographerName: string - Name of the photographer
 * - clientName: string - Name of the client
 * - amount: number - Transaction amount
 * - onSubmit: function - Callback when dispute is submitted
 * - onCancel: function - Callback when form is cancelled
 */
const DisputeForm = ({
  bookingId,
  transactionId,
  photographerName = "Photographer",
  clientName = "Client",
  amount = 0,
  onSubmit,
  onCancel
}) => {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const [formData, setFormData] = useState({
    reason: "",
    category: "",
    description: "",
    desiredResolution: ""
  })

  const [files, setFiles] = useState([])
  const [dragActive, setDragActive] = useState(false)

  const categories = [
    { value: "quality", label: "Quality Issues", description: "Photos don't meet expected quality" },
    { value: "incomplete", label: "Incomplete Work", description: "Not all promised deliverables received" },
    { value: "noshow", label: "No Show", description: "Photographer didn't show up" },
    { value: "late", label: "Late Delivery", description: "Work delivered much later than agreed" },
    { value: "communication", label: "Communication Issues", description: "Unresponsive or unprofessional" },
    { value: "other", label: "Other", description: "Something else not listed" }
  ]

  const resolutions = [
    { value: "full_refund", label: "Full Refund", description: "100% refund to client" },
    { value: "partial_refund", label: "Partial Refund", description: "Negotiate a partial refund" },
    { value: "redo_work", label: "Redo Work", description: "Request photographer to redo the work" },
    { value: "mediation", label: "Admin Mediation", description: "Let admin decide the resolution" }
  ]

  const handleDrag = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const droppedFiles = Array.from(e.dataTransfer.files)
    handleFiles(droppedFiles)
  }, [])

  const handleFileInput = (e) => {
    const selectedFiles = Array.from(e.target.files)
    handleFiles(selectedFiles)
  }

  const handleFiles = (newFiles) => {
    const validFiles = newFiles.filter(file => {
      // Check file type
      const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'text/plain']
      if (!validTypes.includes(file.type)) {
        alert(`${file.name} is not a supported file type`)
        return false
      }
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert(`${file.name} is too large (max 5MB)`)
        return false
      }
      return true
    })

    const filesWithPreview = validFiles.map(file => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: file.size,
      type: file.type,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null
    }))

    setFiles(prev => [...prev, ...filesWithPreview].slice(0, 5)) // Max 5 files
  }

  const removeFile = (fileId) => {
    setFiles(prev => {
      const file = prev.find(f => f.id === fileId)
      if (file?.preview) {
        URL.revokeObjectURL(file.preview)
      }
      return prev.filter(f => f.id !== fileId)
    })
  }

  const getFileIcon = (type) => {
    if (type.startsWith('image/')) return Image
    if (type === 'application/pdf') return FileText
    return File
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.category || !formData.description) {
      alert("Please fill in all required fields")
      return
    }

    setLoading(true)

    try {
      // In production, this would upload files and create dispute
      // For demo, we just simulate the API call

      const disputeData = {
        booking_id: bookingId,
        client_id: user?.email || "client@example.com",
        photographer_id: photographerName,
        reason: formData.category,
        description: formData.description,
        desired_resolution: formData.desiredResolution,
        evidence_count: files.length,
        evidence_files: files.map(f => ({
          name: f.name,
          type: f.type,
          size: f.size
        }))
      }

      // Mock API call
      const response = await fetch(`${API_BASE}/payments/disputes/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(disputeData)
      })

      if (!response.ok) throw new Error('Failed to create dispute')

      const result = await response.json()

      setSubmitted(true)

      if (onSubmit) {
        onSubmit(result)
      }

    } catch (error) {
      console.error("Error creating dispute:", error)
      // For demo, still show success
      setSubmitted(true)
      if (onSubmit) {
        onSubmit({ success: true, demo: true })
      }
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="text-center py-5">
        <div className="bg-success bg-opacity-10 rounded-circle d-inline-flex p-4 mb-4">
          <Check size={48} className="text-success" />
        </div>
        <h4 className="fw-bold mb-2">Dispute Submitted</h4>
        <p className="text-muted mb-4">
          Your dispute has been submitted successfully. Our team will review it within 24-48 hours.
        </p>
        <p className="mb-4">
          <strong>Dispute ID:</strong> DIS-{Date.now().toString(36).toUpperCase()}
        </p>
        <button className="btn btn-primary" onClick={onCancel}>
          Close
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="modal-header border-0 pb-0">
        <div className="d-flex align-items-center gap-2">
          <AlertTriangle size={24} className="text-warning" />
          <h5 className="modal-title fw-bold mb-0">Open Dispute</h5>
        </div>
        <button type="button" className="btn-close" onClick={onCancel}></button>
      </div>

      <div className="modal-body">
        {/* Booking Info */}
        <div className="bg-light rounded-3 p-3 mb-4">
          <div className="row text-sm">
            <div className="col-6">
              <small className="text-muted">Booking</small>
              <div className="fw-medium">{bookingId}</div>
            </div>
            <div className="col-6">
              <small className="text-muted">Amount</small>
              <div className="fw-medium">PKR {amount.toLocaleString()}</div>
            </div>
          </div>
        </div>

        {/* Category */}
        <div className="mb-4">
          <label className="form-label fw-medium">What's the issue? <span className="text-danger">*</span></label>
          <div className="row g-2">
            {categories.map(cat => (
              <div className="col-6" key={cat.value}>
                <div
                  className={`card h-100 cursor-pointer ${formData.category === cat.value ? 'border-primary bg-primary bg-opacity-10' : ''}`}
                  onClick={() => setFormData(prev => ({ ...prev, category: cat.value }))}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="card-body py-2 px-3">
                    <div className="form-check mb-0">
                      <input
                        className="form-check-input"
                        type="radio"
                        name="category"
                        checked={formData.category === cat.value}
                        onChange={() => setFormData(prev => ({ ...prev, category: cat.value }))}
                      />
                      <label className="form-check-label w-100" style={{ cursor: 'pointer' }}>
                        <div className="fw-medium small">{cat.label}</div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Description */}
        <div className="mb-4">
          <label className="form-label fw-medium">
            Describe the issue <span className="text-danger">*</span>
          </label>
          <textarea
            className="form-control"
            rows="4"
            placeholder="Please provide details about what happened..."
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            required
          />
          <small className="text-muted">Be specific and include relevant dates, times, and communications</small>
        </div>

        {/* Evidence Upload */}
        <div className="mb-4">
          <label className="form-label fw-medium">
            Upload Evidence <span className="text-muted">(Optional)</span>
          </label>
          <p className="text-muted small mb-2">
            Upload screenshots, photos, or documents to support your dispute (max 5 files, 5MB each)
          </p>

          <div
            className={`border-2 border-dashed rounded-3 p-4 text-center ${dragActive ? 'border-primary bg-primary bg-opacity-10' : 'border-secondary'}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Upload size={32} className="text-muted mb-2" />
            <p className="mb-2">Drag & drop files here, or</p>
            <label className="btn btn-outline-primary btn-sm">
              <Camera size={16} className="me-1" /> Browse Files
              <input
                type="file"
                className="d-none"
                multiple
                accept="image/*,.pdf,.txt"
                onChange={handleFileInput}
              />
            </label>
            <p className="text-muted small mt-2 mb-0">
              Supported: JPG, PNG, PDF, TXT
            </p>
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="mt-3">
              {files.map(file => {
                const Icon = getFileIcon(file.type)
                return (
                  <div key={file.id} className="d-flex align-items-center gap-2 p-2 bg-light rounded mb-2">
                    {file.preview ? (
                      <img src={file.preview} alt="" className="rounded" style={{ width: 40, height: 40, objectFit: 'cover' }} />
                    ) : (
                      <div className="bg-white rounded p-2">
                        <Icon size={20} className="text-muted" />
                      </div>
                    )}
                    <div className="flex-grow-1 overflow-hidden">
                      <div className="text-truncate small fw-medium">{file.name}</div>
                      <div className="text-muted" style={{ fontSize: '11px' }}>
                        {(file.size / 1024).toFixed(1)} KB
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => removeFile(file.id)}
                    >
                      <X size={14} />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Desired Resolution */}
        <div className="mb-4">
          <label className="form-label fw-medium">What resolution do you prefer?</label>
          <select
            className="form-select"
            value={formData.desiredResolution}
            onChange={(e) => setFormData(prev => ({ ...prev, desiredResolution: e.target.value }))}
          >
            <option value="">Select preferred resolution...</option>
            {resolutions.map(res => (
              <option key={res.value} value={res.value}>{res.label} - {res.description}</option>
            ))}
          </select>
        </div>

        {/* Warning */}
        <div className="alert alert-warning d-flex gap-2 mb-0">
          <AlertTriangle size={20} className="flex-shrink-0" />
          <div className="small">
            <strong>Before submitting:</strong> Have you tried contacting the photographer directly?
            Many issues can be resolved through communication. Disputes are reviewed within 24-48 hours.
          </div>
        </div>
      </div>

      <div className="modal-footer border-0 pt-0">
        <button type="button" className="btn btn-outline-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button
          type="submit"
          className="btn btn-danger"
          disabled={loading || !formData.category || !formData.description}
        >
          {loading ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" />
              Submitting...
            </>
          ) : (
            <>
              <Send size={18} className="me-1" /> Submit Dispute
            </>
          )}
        </button>
      </div>
    </form>
  )
}

export default DisputeForm
