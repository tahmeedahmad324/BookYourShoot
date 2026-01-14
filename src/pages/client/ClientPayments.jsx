import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"
import DisputeForm from "../../components/DisputeForm"
import {
  ArrowLeft,
  Download,
  Filter,
  Search,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  Shield,
  Calendar,
  Receipt,
  Eye,
  ChevronDown,
  RefreshCw
} from "lucide-react"

const ClientPayments = () => {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [showDisputeForm, setShowDisputeForm] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState(null)

  // Mock transaction data
  useEffect(() => {
    const mockTransactions = [
      {
        id: "TXN-001",
        bookingId: "BK-2024-001",
        photographerName: "Ahmed Khan",
        photographerAvatar: "https://ui-avatars.com/api/?name=Ahmed+Khan&background=1a73e8&color=fff",
        service: "Wedding Photography",
        date: "2024-02-15",
        amount: 45000,
        platformFee: 4500,
        status: "completed",
        escrowStatus: "released",
        paymentMethod: "Card ****4242",
        createdAt: "2024-02-10T10:30:00Z"
      },
      {
        id: "TXN-002",
        bookingId: "BK-2024-002",
        photographerName: "Sara Ali",
        photographerAvatar: "https://ui-avatars.com/api/?name=Sara+Ali&background=e91e63&color=fff",
        service: "Portrait Session",
        date: "2024-02-20",
        amount: 15000,
        platformFee: 1500,
        status: "held",
        escrowStatus: "held",
        paymentMethod: "Card ****1234",
        createdAt: "2024-02-18T14:00:00Z",
        releaseDate: "2024-02-27"
      },
      {
        id: "TXN-003",
        bookingId: "BK-2024-003",
        photographerName: "Usman Malik",
        photographerAvatar: "https://ui-avatars.com/api/?name=Usman+Malik&background=4caf50&color=fff",
        service: "Event Coverage",
        date: "2024-02-25",
        amount: 25000,
        platformFee: 2500,
        status: "held",
        escrowStatus: "held",
        paymentMethod: "JazzCash",
        createdAt: "2024-02-22T09:15:00Z",
        releaseDate: "2024-03-04"
      },
      {
        id: "TXN-004",
        bookingId: "BK-2024-004",
        photographerName: "Fatima Zahra",
        photographerAvatar: "https://ui-avatars.com/api/?name=Fatima+Zahra&background=ff9800&color=fff",
        service: "Product Photography",
        date: "2024-01-15",
        amount: 20000,
        platformFee: 2000,
        status: "refunded",
        escrowStatus: "refunded",
        refundAmount: 20000,
        refundReason: "Booking cancelled - 14+ days notice",
        paymentMethod: "Card ****5678",
        createdAt: "2024-01-10T16:45:00Z"
      },
      {
        id: "TXN-005",
        bookingId: "BK-2024-005",
        photographerName: "Ali Hassan",
        photographerAvatar: "https://ui-avatars.com/api/?name=Ali+Hassan&background=9c27b0&color=fff",
        service: "Birthday Party",
        date: "2024-01-20",
        amount: 18000,
        platformFee: 1800,
        status: "partial_refund",
        escrowStatus: "partially_refunded",
        refundAmount: 9000,
        refundReason: "Cancelled within 7-13 days - 50% refund",
        paymentMethod: "EasyPaisa",
        createdAt: "2024-01-18T11:20:00Z"
      }
    ]

    setTimeout(() => {
      setTransactions(mockTransactions)
      setLoading(false)
    }, 500)
  }, [])

  const getStatusBadge = (status) => {
    const badges = {
      completed: { color: "success", icon: CheckCircle, text: "Completed" },
      held: { color: "warning", icon: Shield, text: "Payment Secured" },
      refunded: { color: "info", icon: RefreshCw, text: "Refunded" },
      partial_refund: { color: "secondary", icon: AlertTriangle, text: "Partial Refund" },
      pending: { color: "secondary", icon: Clock, text: "Pending" },
      failed: { color: "danger", icon: XCircle, text: "Failed" }
    }
    const badge = badges[status] || badges.pending
    const Icon = badge.icon
    return (
      <span className={`badge bg-${badge.color} d-inline-flex align-items-center gap-1`}>
        <Icon size={14} /> {badge.text}
      </span>
    )
  }

  const filteredTransactions = transactions.filter(txn => {
    const matchesFilter = filter === "all" || txn.status === filter
    const matchesSearch = txn.photographerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         txn.service.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         txn.id.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const stats = {
    total: transactions.reduce((sum, t) => sum + t.amount, 0),
    held: transactions.filter(t => t.status === "held").reduce((sum, t) => sum + t.amount, 0),
    completed: transactions.filter(t => t.status === "completed").reduce((sum, t) => sum + t.amount, 0),
    refunded: transactions.filter(t => t.status === "refunded" || t.status === "partial_refund")
                          .reduce((sum, t) => sum + (t.refundAmount || 0), 0)
  }

  const getDaysUntilRelease = (releaseDate) => {
    if (!releaseDate) return null
    const now = new Date()
    const release = new Date(releaseDate)
    const diff = Math.ceil((release - now) / (1000 * 60 * 60 * 24))
    return diff > 0 ? diff : 0
  }

  // Download receipt as PDF
  const downloadReceipt = async (transactionId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/payments/receipts/${transactionId}/pdf`)
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
        // Fallback to HTML view if PDF not available
        window.open(`http://localhost:5000/api/payments/receipts/${transactionId}/html`, '_blank')
      }
    } catch (err) {
      console.error('Error downloading receipt:', err)
      alert('Receipt not available. Please try again.')
    }
  }

  // View receipt in new tab
  const viewReceipt = (transactionId) => {
    window.open(`http://localhost:5000/api/payments/receipts/${transactionId}/html`, '_blank')
  }

  // Open dispute form
  const handleOpenDispute = (txn) => {
    setSelectedTransaction(txn)
    setShowDisputeForm(true)
  }

  // Handle dispute submission
  const handleDisputeSubmit = (disputeData) => {
    console.log('Dispute submitted:', disputeData)
    setShowDisputeForm(false)
    setSelectedTransaction(null)
    alert('Dispute submitted successfully! Our team will review it within 24-48 hours.')
  }

  // Handle dispute cancellation
  const handleDisputeCancel = () => {
    setShowDisputeForm(false)
    setSelectedTransaction(null)
  }

  // Show dispute form modal
  if (showDisputeForm && selectedTransaction) {
    return (
      <div className="client-payments py-4">
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-lg-8">
              <DisputeForm
                bookingId={selectedTransaction.bookingId}
                transactionId={selectedTransaction.id}
                photographerName={selectedTransaction.photographerName}
                clientName={user?.name || 'Client'}
                amount={selectedTransaction.amount}
                onSubmit={handleDisputeSubmit}
                onCancel={handleDisputeCancel}
              />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="client-payments py-4">
      <div className="container">
        {/* Header */}
        <div className="d-flex align-items-center mb-4">
          <Link to="/client/dashboard" className="btn btn-outline-secondary me-3">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h2 className="fw-bold mb-0">Payment History</h2>
            <p className="text-muted mb-0">View all your transactions and receipts</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="row g-3 mb-4">
          <div className="col-6 col-md-3">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body text-center">
                <h6 className="text-muted mb-1">Total Spent</h6>
                <h4 className="fw-bold text-primary mb-0">PKR {stats.total.toLocaleString()}</h4>
              </div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="card border-0 shadow-sm h-100 border-start border-warning border-4">
              <div className="card-body text-center">
                <h6 className="text-muted mb-1">In Escrow</h6>
                <h4 className="fw-bold text-warning mb-0">PKR {stats.held.toLocaleString()}</h4>
              </div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="card border-0 shadow-sm h-100 border-start border-success border-4">
              <div className="card-body text-center">
                <h6 className="text-muted mb-1">Released</h6>
                <h4 className="fw-bold text-success mb-0">PKR {stats.completed.toLocaleString()}</h4>
              </div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="card border-0 shadow-sm h-100 border-start border-info border-4">
              <div className="card-body text-center">
                <h6 className="text-muted mb-1">Refunded</h6>
                <h4 className="fw-bold text-info mb-0">PKR {stats.refunded.toLocaleString()}</h4>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body">
            <div className="row g-3 align-items-center">
              <div className="col-md-4">
                <div className="input-group">
                  <span className="input-group-text bg-white">
                    <Search size={18} />
                  </span>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search transactions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <div className="col-md-4">
                <select
                  className="form-select"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                >
                  <option value="all">All Transactions</option>
                  <option value="held">Payment Secured</option>
                  <option value="completed">Completed</option>
                  <option value="refunded">Refunded</option>
                  <option value="partial_refund">Partial Refund</option>
                </select>
              </div>
              <div className="col-md-4 text-end">
                <button className="btn btn-outline-primary">
                  <Download size={18} className="me-1" /> Export
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Transactions List */}
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-white py-3">
            <h5 className="mb-0 fw-bold">Transactions</h5>
          </div>
          <div className="card-body p-0">
            {loading ? (
              <div className="p-5 text-center">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="p-5 text-center text-muted">
                <Receipt size={48} className="mb-3 opacity-50" />
                <p>No transactions found</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Transaction</th>
                      <th>Photographer</th>
                      <th>Service</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Date</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.map((txn) => (
                      <tr key={txn.id}>
                        <td>
                          <div className="fw-medium">{txn.id}</div>
                          <small className="text-muted">{txn.paymentMethod}</small>
                        </td>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <img
                              src={txn.photographerAvatar}
                              alt={txn.photographerName}
                              className="rounded-circle"
                              width="32"
                              height="32"
                            />
                            <span>{txn.photographerName}</span>
                          </div>
                        </td>
                        <td>{txn.service}</td>
                        <td>
                          <div className="fw-bold">PKR {txn.amount.toLocaleString()}</div>
                          <small className="text-muted">Fee: PKR {txn.platformFee.toLocaleString()}</small>
                        </td>
                        <td>
                          {getStatusBadge(txn.status)}
                          {txn.status === "held" && txn.releaseDate && (
                            <div className="mt-1">
                              <small className="text-warning">
                                <Clock size={12} className="me-1" />
                                Releases in {getDaysUntilRelease(txn.releaseDate)} days
                              </small>
                            </div>
                          )}
                          {txn.refundAmount && (
                            <div className="mt-1">
                              <small className="text-info">
                                Refund: PKR {txn.refundAmount.toLocaleString()}
                              </small>
                            </div>
                          )}
                        </td>
                        <td>
                          <div>{new Date(txn.createdAt).toLocaleDateString()}</div>
                          <small className="text-muted">
                            {new Date(txn.createdAt).toLocaleTimeString()}
                          </small>
                        </td>
                        <td>
                          <div className="dropdown">
                            <button
                              className="btn btn-sm btn-outline-secondary"
                              data-bs-toggle="dropdown"
                            >
                              <ChevronDown size={16} />
                            </button>
                            <ul className="dropdown-menu dropdown-menu-end">
                              <li>
                                <button 
                                  className="dropdown-item d-flex align-items-center gap-2"
                                  onClick={() => viewReceipt(txn.id)}
                                >
                                  <Eye size={16} /> View Receipt
                                </button>
                              </li>
                              <li>
                                <button 
                                  className="dropdown-item d-flex align-items-center gap-2"
                                  onClick={() => downloadReceipt(txn.id)}
                                >
                                  <Download size={16} /> Download PDF
                                </button>
                              </li>
                              {txn.status === "held" && (
                                <>
                                  <li><hr className="dropdown-divider" /></li>
                                  <li>
                                    <button className="dropdown-item d-flex align-items-center gap-2 text-success">
                                      <CheckCircle size={16} /> Confirm & Release
                                    </button>
                                  </li>
                                  <li>
                                    <button 
                                      className="dropdown-item d-flex align-items-center gap-2 text-danger"
                                      onClick={() => handleOpenDispute(txn)}
                                    >
                                      <AlertTriangle size={16} /> Open Dispute
                                    </button>
                                  </li>
                                </>
                              )}
                            </ul>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ClientPayments
