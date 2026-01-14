import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"
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
  RefreshCw,
  Wallet,
  TrendingUp,
  Banknote,
  Heart
} from "lucide-react"

const API_BASE = 'http://localhost:5000/api';

const PhotographerPayments = () => {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [tips, setTips] = useState([])
  const [tipStats, setTipStats] = useState({ total_tips: 0, tip_count: 0, average_tip: 0 })

  // Fetch tips for photographer
  useEffect(() => {
    const fetchTips = async () => {
      const photographerId = user?.id || user?.email || 'photographer-1';
      try {
        const res = await fetch(`${API_BASE}/payments/tips/photographer/${photographerId}`);
        const data = await res.json();
        if (data.status === 'success') {
          setTips(data.tips || []);
          setTipStats(data.stats || { total_tips: 0, tip_count: 0, average_tip: 0 });
        }
      } catch (err) {
        console.error('Failed to fetch tips:', err);
      }
    };
    fetchTips();
  }, [user]);

  // Mock transaction data for photographer
  useEffect(() => {
    const mockTransactions = [
      {
        id: "TXN-001",
        bookingId: "BK-2024-001",
        clientName: "Muhammad Ali",
        clientAvatar: "https://ui-avatars.com/api/?name=Muhammad+Ali&background=1a73e8&color=fff",
        service: "Wedding Photography",
        date: "2024-02-15",
        grossAmount: 45000,
        platformFee: 4500,
        netAmount: 40500,
        status: "paid",
        escrowStatus: "released",
        payoutMethod: "Bank Transfer",
        payoutDate: "2024-02-22",
        createdAt: "2024-02-10T10:30:00Z"
      },
      {
        id: "TXN-002",
        bookingId: "BK-2024-002",
        clientName: "Ayesha Khan",
        clientAvatar: "https://ui-avatars.com/api/?name=Ayesha+Khan&background=e91e63&color=fff",
        service: "Portrait Session",
        date: "2024-02-20",
        grossAmount: 15000,
        platformFee: 1500,
        netAmount: 13500,
        status: "secured",
        escrowStatus: "held",
        releaseDate: "2024-02-27",
        createdAt: "2024-02-18T14:00:00Z"
      },
      {
        id: "TXN-003",
        bookingId: "BK-2024-003",
        clientName: "Bilal Ahmed",
        clientAvatar: "https://ui-avatars.com/api/?name=Bilal+Ahmed&background=4caf50&color=fff",
        service: "Event Coverage",
        date: "2024-02-25",
        grossAmount: 25000,
        platformFee: 2500,
        netAmount: 22500,
        status: "secured",
        escrowStatus: "held",
        releaseDate: "2024-03-04",
        createdAt: "2024-02-22T09:15:00Z"
      },
      {
        id: "TXN-004",
        bookingId: "BK-2024-004",
        clientName: "Zainab Fatima",
        clientAvatar: "https://ui-avatars.com/api/?name=Zainab+Fatima&background=ff9800&color=fff",
        service: "Product Photography",
        date: "2024-01-15",
        grossAmount: 20000,
        platformFee: 2000,
        netAmount: 0,
        status: "cancelled",
        escrowStatus: "refunded",
        refundReason: "Client cancelled - 14+ days notice",
        createdAt: "2024-01-10T16:45:00Z"
      },
      {
        id: "TXN-005",
        bookingId: "BK-2024-005",
        clientName: "Hassan Raza",
        clientAvatar: "https://ui-avatars.com/api/?name=Hassan+Raza&background=9c27b0&color=fff",
        service: "Birthday Party",
        date: "2024-01-20",
        grossAmount: 18000,
        platformFee: 900,
        netAmount: 8100,
        status: "partial",
        escrowStatus: "partially_released",
        partialReason: "Client cancelled within 7-13 days - 50% compensation",
        createdAt: "2024-01-18T11:20:00Z"
      },
      {
        id: "TXN-006",
        bookingId: "BK-2024-006",
        clientName: "Sana Malik",
        clientAvatar: "https://ui-avatars.com/api/?name=Sana+Malik&background=00bcd4&color=fff",
        service: "Graduation Photos",
        date: "2024-03-01",
        grossAmount: 12000,
        platformFee: 1200,
        netAmount: 10800,
        status: "ready",
        escrowStatus: "ready_for_payout",
        createdAt: "2024-02-25T08:00:00Z"
      }
    ]

    setTimeout(() => {
      setTransactions(mockTransactions)
      setLoading(false)
    }, 500)
  }, [])

  const getStatusBadge = (status) => {
    const badges = {
      paid: { color: "success", icon: CheckCircle, text: "Paid Out" },
      secured: { color: "warning", icon: Shield, text: "Secured" },
      ready: { color: "info", icon: Wallet, text: "Ready for Payout" },
      cancelled: { color: "secondary", icon: XCircle, text: "Cancelled" },
      partial: { color: "warning", icon: AlertTriangle, text: "Partial Payment" },
      pending: { color: "secondary", icon: Clock, text: "Pending" }
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
    const matchesSearch = txn.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         txn.service.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         txn.id.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const stats = {
    totalEarnings: transactions.filter(t => t.status === "paid").reduce((sum, t) => sum + t.netAmount, 0),
    secured: transactions.filter(t => t.status === "secured").reduce((sum, t) => sum + t.netAmount, 0),
    readyForPayout: transactions.filter(t => t.status === "ready").reduce((sum, t) => sum + t.netAmount, 0),
    thisMonth: transactions.filter(t => {
      const date = new Date(t.createdAt)
      const now = new Date()
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear() && t.status === "paid"
    }).reduce((sum, t) => sum + t.netAmount, 0)
  }

  const getDaysUntilRelease = (releaseDate) => {
    if (!releaseDate) return null
    const now = new Date()
    const release = new Date(releaseDate)
    const diff = Math.ceil((release - now) / (1000 * 60 * 60 * 24))
    return diff > 0 ? diff : 0
  }

  return (
    <div className="photographer-payments py-4">
      <div className="container">
        {/* Header */}
        <div className="d-flex align-items-center mb-4">
          <Link to="/photographer/dashboard" className="btn btn-outline-secondary me-3">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h2 className="fw-bold mb-0">Earnings & Payouts</h2>
            <p className="text-muted mb-0">Track your earnings and payment history</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="row g-3 mb-4">
          <div className="col-6 col-md-3">
            <div className="card border-0 shadow-sm h-100 border-start border-success border-4">
              <div className="card-body text-center">
                <h6 className="text-muted mb-1">Total Earnings</h6>
                <h4 className="fw-bold text-success mb-0">PKR {stats.totalEarnings.toLocaleString()}</h4>
              </div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body text-center">
                <h6 className="text-muted mb-1">Secured in Escrow</h6>
                <h4 className="fw-bold text-warning mb-0">PKR {stats.secured.toLocaleString()}</h4>
              </div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="card border-0 shadow-sm h-100 border-start border-info border-4">
              <div className="card-body text-center">
                <h6 className="text-muted mb-1">Ready for Payout</h6>
                <h4 className="fw-bold text-info mb-0">PKR {stats.readyForPayout.toLocaleString()}</h4>
              </div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body text-center">
                <h6 className="text-muted mb-1">This Month</h6>
                <h4 className="fw-bold text-primary mb-0">PKR {stats.thisMonth.toLocaleString()}</h4>
                <small className="text-success d-flex align-items-center justify-content-center gap-1">
                  <TrendingUp size={12} /> +15% vs last month
                </small>
              </div>
            </div>
          </div>
        </div>

        {/* Payout Action Card */}
        {stats.readyForPayout > 0 && (
          <div className="card border-0 shadow-sm mb-4 border-start border-info border-4">
            <div className="card-body">
              <div className="row align-items-center">
                <div className="col-md-8">
                  <div className="d-flex align-items-center gap-3">
                    <div className="bg-info bg-opacity-10 p-3 rounded-circle">
                      <Wallet size={32} className="text-info" />
                    </div>
                    <div>
                      <h5 className="mb-1">Ready for Withdrawal</h5>
                      <p className="text-muted mb-0">
                        You have <strong className="text-info">PKR {stats.readyForPayout.toLocaleString()}</strong> ready to be withdrawn to your bank account.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="col-md-4 text-md-end mt-3 mt-md-0">
                  <button className="btn btn-info text-white">
                    <Banknote size={18} className="me-1" /> Request Payout
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tips Section */}
        {(tipStats.total_tips > 0 || tips.length > 0) && (
          <div className="card border-0 shadow-sm mb-4 border-start border-danger border-4">
            <div className="card-body">
              <div className="row align-items-center">
                <div className="col-md-8">
                  <div className="d-flex align-items-center gap-3">
                    <div className="bg-danger bg-opacity-10 p-3 rounded-circle">
                      <Heart size={32} className="text-danger" />
                    </div>
                    <div>
                      <h5 className="mb-1">💝 Tips Received</h5>
                      <p className="text-muted mb-0">
                        You've received <strong className="text-danger">PKR {tipStats.total_tips.toLocaleString()}</strong> in tips from {tipStats.tip_count} happy clients!
                        {tipStats.average_tip > 0 && (
                          <span className="ms-2">(Avg: PKR {tipStats.average_tip.toLocaleString()})</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="col-md-4">
                  {tips.length > 0 && (
                    <div className="text-md-end">
                      <small className="text-muted d-block mb-1">Recent Tips:</small>
                      {tips.slice(0, 2).map(tip => (
                        <div key={tip.id} className="small text-success">
                          💝 PKR {tip.amount.toLocaleString()} from {tip.client_name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

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
                  <option value="paid">Paid Out</option>
                  <option value="secured">Secured in Escrow</option>
                  <option value="ready">Ready for Payout</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="partial">Partial Payment</option>
                </select>
              </div>
              <div className="col-md-4 text-end">
                <button className="btn btn-outline-primary">
                  <Download size={18} className="me-1" /> Export Statement
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Transactions List */}
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-white py-3">
            <h5 className="mb-0 fw-bold">Transaction History</h5>
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
                      <th>Client</th>
                      <th>Service</th>
                      <th>Amount</th>
                      <th>Net Earnings</th>
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
                          <small className="text-muted">{txn.bookingId}</small>
                        </td>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <img
                              src={txn.clientAvatar}
                              alt={txn.clientName}
                              className="rounded-circle"
                              width="32"
                              height="32"
                            />
                            <span>{txn.clientName}</span>
                          </div>
                        </td>
                        <td>{txn.service}</td>
                        <td>
                          <div>PKR {txn.grossAmount.toLocaleString()}</div>
                          <small className="text-muted">Fee: -{txn.platformFee.toLocaleString()}</small>
                        </td>
                        <td>
                          <div className={`fw-bold ${txn.netAmount > 0 ? 'text-success' : 'text-muted'}`}>
                            PKR {txn.netAmount.toLocaleString()}
                          </div>
                        </td>
                        <td>
                          {getStatusBadge(txn.status)}
                          {txn.status === "secured" && txn.releaseDate && (
                            <div className="mt-1">
                              <small className="text-warning">
                                <Clock size={12} className="me-1" />
                                Releases in {getDaysUntilRelease(txn.releaseDate)} days
                              </small>
                            </div>
                          )}
                          {txn.payoutDate && (
                            <div className="mt-1">
                              <small className="text-success">
                                Paid on {new Date(txn.payoutDate).toLocaleDateString()}
                              </small>
                            </div>
                          )}
                        </td>
                        <td>
                          <div>{new Date(txn.createdAt).toLocaleDateString()}</div>
                          <small className="text-muted">
                            Booking: {txn.date}
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
                                <button className="dropdown-item d-flex align-items-center gap-2">
                                  <Eye size={16} /> View Details
                                </button>
                              </li>
                              <li>
                                <button className="dropdown-item d-flex align-items-center gap-2">
                                  <Download size={16} /> Download Invoice
                                </button>
                              </li>
                              {txn.status === "secured" && (
                                <>
                                  <li><hr className="dropdown-divider" /></li>
                                  <li>
                                    <button className="dropdown-item d-flex align-items-center gap-2 text-warning">
                                      <AlertTriangle size={16} /> Report Issue
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

export default PhotographerPayments
