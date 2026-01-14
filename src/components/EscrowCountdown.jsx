import { useState, useEffect } from "react"
import { Clock, CheckCircle, Shield, AlertTriangle } from "lucide-react"

/**
 * EscrowCountdown Component
 * Shows a visual countdown timer for when an escrow payment will auto-release
 * 
 * Props:
 * - releaseDate: ISO date string when payment will be released
 * - status: 'held' | 'released' | 'refunded' | 'disputed'
 * - onRelease: callback when countdown reaches zero
 * - variant: 'card' | 'inline' | 'badge' (display style)
 * - showProgress: boolean to show progress bar
 */
const EscrowCountdown = ({ 
  releaseDate, 
  status = "held", 
  onRelease,
  variant = "card",
  showProgress = true,
  totalDays = 7 // Default escrow period
}) => {
  const [timeLeft, setTimeLeft] = useState(null)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (!releaseDate || status !== "held") return

    const calculateTimeLeft = () => {
      const now = new Date()
      const release = new Date(releaseDate)
      const diff = release - now

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: true })
        setProgress(100)
        if (onRelease) onRelease()
        return
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      setTimeLeft({ days, hours, minutes, seconds, expired: false })

      // Calculate progress (how much time has passed)
      const totalMs = totalDays * 24 * 60 * 60 * 1000
      const elapsed = totalMs - diff
      setProgress(Math.min(100, (elapsed / totalMs) * 100))
    }

    calculateTimeLeft()
    const interval = setInterval(calculateTimeLeft, 1000)

    return () => clearInterval(interval)
  }, [releaseDate, status, onRelease, totalDays])

  // If not in held status, show appropriate status
  if (status === "released") {
    return (
      <div className={`escrow-status escrow-released ${variant === 'inline' ? 'd-inline-flex' : ''}`}>
        <span className="badge bg-success d-inline-flex align-items-center gap-1 px-3 py-2">
          <CheckCircle size={16} /> Payment Released
        </span>
      </div>
    )
  }

  if (status === "refunded") {
    return (
      <div className={`escrow-status escrow-refunded ${variant === 'inline' ? 'd-inline-flex' : ''}`}>
        <span className="badge bg-info d-inline-flex align-items-center gap-1 px-3 py-2">
          <Clock size={16} /> Refunded
        </span>
      </div>
    )
  }

  if (status === "disputed") {
    return (
      <div className={`escrow-status escrow-disputed ${variant === 'inline' ? 'd-inline-flex' : ''}`}>
        <span className="badge bg-danger d-inline-flex align-items-center gap-1 px-3 py-2">
          <AlertTriangle size={16} /> Under Dispute
        </span>
      </div>
    )
  }

  if (!timeLeft) return null

  // Badge variant - compact inline display
  if (variant === "badge") {
    const urgentClass = timeLeft.days <= 1 ? "bg-danger" : timeLeft.days <= 3 ? "bg-warning text-dark" : "bg-primary"
    return (
      <span className={`badge ${urgentClass} d-inline-flex align-items-center gap-1`}>
        <Clock size={14} />
        {timeLeft.expired ? "Ready to release" : `${timeLeft.days}d ${timeLeft.hours}h left`}
      </span>
    )
  }

  // Inline variant - for tables/lists
  if (variant === "inline") {
    return (
      <div className="escrow-countdown-inline d-flex align-items-center gap-2">
        <Shield size={16} className="text-warning" />
        <div>
          <div className="small fw-medium">
            {timeLeft.expired ? (
              <span className="text-success">Ready for release</span>
            ) : (
              <span className="text-warning">
                {timeLeft.days > 0 && `${timeLeft.days}d `}
                {timeLeft.hours}h {timeLeft.minutes}m
              </span>
            )}
          </div>
          <div className="text-muted" style={{ fontSize: "11px" }}>
            until auto-release
          </div>
        </div>
      </div>
    )
  }

  // Card variant - full display with progress
  return (
    <div className="escrow-countdown-card">
      <div className="card border-0 shadow-sm border-start border-4 border-warning">
        <div className="card-body">
          <div className="d-flex align-items-center justify-content-between mb-3">
            <div className="d-flex align-items-center gap-2">
              <div className="bg-warning bg-opacity-10 p-2 rounded-circle">
                <Shield size={24} className="text-warning" />
              </div>
              <div>
                <h6 className="mb-0 fw-bold">Payment Secured</h6>
                <small className="text-muted">Protected by escrow</small>
              </div>
            </div>
            {timeLeft.expired ? (
              <span className="badge bg-success px-3 py-2">Ready to Release</span>
            ) : (
              <span className={`badge ${timeLeft.days <= 1 ? 'bg-danger' : 'bg-warning text-dark'} px-3 py-2`}>
                <Clock size={14} className="me-1" />
                {timeLeft.days}d {timeLeft.hours}h left
              </span>
            )}
          </div>

          {/* Countdown Display */}
          <div className="row text-center mb-3">
            <div className="col-3">
              <div className="bg-light rounded p-2">
                <div className="fs-4 fw-bold text-primary">{timeLeft.days}</div>
                <div className="small text-muted">Days</div>
              </div>
            </div>
            <div className="col-3">
              <div className="bg-light rounded p-2">
                <div className="fs-4 fw-bold text-primary">{timeLeft.hours}</div>
                <div className="small text-muted">Hours</div>
              </div>
            </div>
            <div className="col-3">
              <div className="bg-light rounded p-2">
                <div className="fs-4 fw-bold text-primary">{timeLeft.minutes}</div>
                <div className="small text-muted">Mins</div>
              </div>
            </div>
            <div className="col-3">
              <div className="bg-light rounded p-2">
                <div className="fs-4 fw-bold text-primary">{timeLeft.seconds}</div>
                <div className="small text-muted">Secs</div>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          {showProgress && (
            <div>
              <div className="d-flex justify-content-between small text-muted mb-1">
                <span>Payment received</span>
                <span>Auto-release</span>
              </div>
              <div className="progress" style={{ height: "8px" }}>
                <div
                  className={`progress-bar ${progress >= 100 ? 'bg-success' : 'bg-warning'}`}
                  role="progressbar"
                  style={{ width: `${progress}%` }}
                  aria-valuenow={progress}
                  aria-valuemin="0"
                  aria-valuemax="100"
                />
              </div>
              <div className="text-center small text-muted mt-2">
                {timeLeft.expired ? (
                  <span className="text-success fw-medium">
                    ✓ Escrow period complete - Payment can be released
                  </span>
                ) : (
                  <span>
                    Payment will be automatically released on{" "}
                    <strong>{new Date(releaseDate).toLocaleDateString()}</strong>
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default EscrowCountdown
