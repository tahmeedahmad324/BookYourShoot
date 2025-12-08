"use client"

import { useState } from "react"
import { Link } from "react-router-dom"

const AdminReportedReviews = () => {
  const [reportedReviews, setReportedReviews] = useState([
    {
      id: 1,
      reviewerName: "Unknown User",
      photographerName: "Ali Photography",
      rating: 1,
      comment: "Terrible service, never showed up!",
      reportReason: "never_booked",
      reportedDate: "2024-12-05",
      status: "pending",
    },
    {
      id: 2,
      reviewerName: "Spammer123",
      photographerName: "Sarah Studios",
      rating: 1,
      comment: "Visit my website for cheap cameras!!!",
      reportReason: "spam",
      reportedDate: "2024-12-07",
      status: "pending",
    },
    {
      id: 3,
      reviewerName: "Ahmed Khan",
      photographerName: "Elite Photography",
      rating: 2,
      comment: "Photos were okay but overpriced",
      reportReason: "fake",
      reportedDate: "2024-12-01",
      status: "dismissed",
    },
    {
      id: 4,
      reviewerName: "Rude Customer",
      photographerName: "Mountain View Photography",
      rating: 1,
      comment: "This photographer is a complete fraud and scammer!!!",
      reportReason: "inappropriate",
      reportedDate: "2024-12-08",
      status: "pending",
    },
  ])

  const [filter, setFilter] = useState("all")

  const handleReviewAction = (reviewId, action) => {
    setReportedReviews(reviews =>
      reviews.map(review =>
        review.id === reviewId
          ? { ...review, status: action === "remove" ? "removed" : "dismissed" }
          : review
      )
    )
    alert(`Review ${action === "remove" ? "removed" : "dismissed"} successfully`)
  }

  const getReportReasonLabel = (reason) => {
    const labels = {
      fake: "Fake/Fraudulent",
      inappropriate: "Inappropriate",
      spam: "Spam",
      wrong_person: "Wrong Photographer",
      never_booked: "Never Booked",
      other: "Other",
    }
    return labels[reason] || reason
  }

  const filteredReviews = filter === "all" 
    ? reportedReviews 
    : reportedReviews.filter(r => r.status === filter)

  const pendingCount = reportedReviews.filter(r => r.status === "pending").length

  return (
    <div className="admin-reported-reviews py-4">
      <div className="container">
        {/* Header */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="d-flex align-items-center mb-3">
              <Link to="/admin/dashboard" className="btn btn-outline-secondary btn-sm me-3">
                ← Back to Dashboard
              </Link>
            </div>
            <div className="gradient-header rounded-3 p-4">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h2 className="fw-bold mb-1">🚩 Reported Reviews</h2>
                  <p className="mb-0 opacity-75">Reviews flagged by photographers for moderation</p>
                </div>
                {pendingCount > 0 && (
                  <span className="badge bg-warning text-dark fs-6">
                    {pendingCount} Pending
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="card border-0 shadow-sm">
              <div className="card-body py-2">
                <div className="btn-group">
                  <button
                    className={`btn ${filter === "all" ? "btn-primary" : "btn-outline-primary"}`}
                    onClick={() => setFilter("all")}
                  >
                    All ({reportedReviews.length})
                  </button>
                  <button
                    className={`btn ${filter === "pending" ? "btn-warning" : "btn-outline-warning"}`}
                    onClick={() => setFilter("pending")}
                  >
                    Pending ({reportedReviews.filter(r => r.status === "pending").length})
                  </button>
                  <button
                    className={`btn ${filter === "removed" ? "btn-danger" : "btn-outline-danger"}`}
                    onClick={() => setFilter("removed")}
                  >
                    Removed ({reportedReviews.filter(r => r.status === "removed").length})
                  </button>
                  <button
                    className={`btn ${filter === "dismissed" ? "btn-secondary" : "btn-outline-secondary"}`}
                    onClick={() => setFilter("dismissed")}
                  >
                    Dismissed ({reportedReviews.filter(r => r.status === "dismissed").length})
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Reviews List */}
        <div className="row">
          <div className="col-12">
            {filteredReviews.length > 0 ? (
              <div className="d-flex flex-column gap-3">
                {filteredReviews.map((review) => (
                  <div 
                    key={review.id} 
                    className={`card shadow-sm ${
                      review.status === "pending" 
                        ? "border-warning border-2" 
                        : review.status === "removed"
                        ? "border-danger"
                        : "border-0"
                    }`}
                  >
                    <div className="card-body">
                      <div className="row">
                        <div className="col-md-8">
                          {/* Review Header */}
                          <div className="d-flex align-items-center gap-2 mb-2">
                            <div 
                              className="rounded-circle bg-secondary d-flex align-items-center justify-content-center"
                              style={{ width: "40px", height: "40px", color: "white" }}
                            >
                              {review.reviewerName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <strong>{review.reviewerName}</strong>
                              <div className="d-flex align-items-center gap-2">
                                <span className="text-warning">
                                  {"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}
                                </span>
                                <span className={`badge ${
                                  review.status === "pending" 
                                    ? "bg-warning text-dark" 
                                    : review.status === "removed"
                                    ? "bg-danger"
                                    : "bg-secondary"
                                }`}>
                                  {review.status}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Review Content */}
                          <div className="mb-2">
                            <small className="text-muted">
                              Review for: <strong className="text-primary">{review.photographerName}</strong>
                            </small>
                          </div>
                          <p className="mb-2 bg-light p-2 rounded">"{review.comment}"</p>

                          {/* Report Info */}
                          <div className="d-flex gap-3 flex-wrap">
                            <span className="badge bg-light text-dark">
                              🚩 Reason: {getReportReasonLabel(review.reportReason)}
                            </span>
                            <small className="text-muted">
                              📅 Reported: {review.reportedDate}
                            </small>
                          </div>
                        </div>

                        <div className="col-md-4 d-flex align-items-center justify-content-end">
                          {review.status === "pending" ? (
                            <div className="d-flex flex-column gap-2">
                              <button
                                className="btn btn-danger"
                                onClick={() => handleReviewAction(review.id, "remove")}
                              >
                                🗑️ Remove Review
                              </button>
                              <button
                                className="btn btn-outline-secondary"
                                onClick={() => handleReviewAction(review.id, "dismiss")}
                              >
                                ✓ Dismiss Report
                              </button>
                            </div>
                          ) : (
                            <div className="text-center">
                              <div style={{ fontSize: "2rem" }}>
                                {review.status === "removed" ? "🗑️" : "✓"}
                              </div>
                              <small className="text-muted">
                                {review.status === "removed" ? "Review Removed" : "Report Dismissed"}
                              </small>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="card border-0 shadow-sm">
                <div className="card-body text-center py-5">
                  <div style={{ fontSize: "48px", marginBottom: "16px" }}>✅</div>
                  <h5 className="text-muted">No reviews found</h5>
                  <p className="text-muted small">
                    {filter === "pending" 
                      ? "All reported reviews have been handled!" 
                      : "No reviews match this filter."}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .gradient-header {
          background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
          color: white;
        }
      `}</style>
    </div>
  )
}

export default AdminReportedReviews
