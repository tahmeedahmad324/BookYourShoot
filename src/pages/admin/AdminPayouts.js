import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Badge, Table, Alert, Spinner, Modal, Form, Tab, Tabs, InputGroup } from 'react-bootstrap';
import { FaMoneyBillWave, FaClock, FaCheckCircle, FaTimesCircle, FaSearch, FaEye, FaUniversity, FaMobileAlt, FaChartLine, FaUsers, FaExclamationTriangle } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { payoutsAPI } from '../../api/payouts';
import { toast } from 'react-toastify';
import '../../styles/AdminPayouts.css';

const AdminPayouts = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState(null);
    const [pendingPayouts, setPendingPayouts] = useState([]);
    const [allPayouts, setAllPayouts] = useState([]);
    const [selectedPayout, setSelectedPayout] = useState(null);
    const [showProcessModal, setShowProcessModal] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [transactionRef, setTransactionRef] = useState('');
    const [rejectReason, setRejectReason] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState('pending');
    const [statusFilter, setStatusFilter] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchAllData();
    }, [statusFilter]);

    const fetchAllData = async () => {
        setLoading(true);
        try {
            const [statsRes, pendingRes, allRes] = await Promise.all([
                payoutsAPI.getPayoutStats(),
                payoutsAPI.getPendingPayouts(),
                payoutsAPI.getAllPayouts(statusFilter || null)
            ]);

            if (statsRes.status === 'success') {
                setStats(statsRes.stats);
            }
            if (pendingRes.status === 'success') {
                setPendingPayouts(pendingRes.payouts || []);
            }
            if (allRes.status === 'success') {
                setAllPayouts(allRes.payouts || []);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            toast.error('Failed to load payout data');
        } finally {
            setLoading(false);
        }
    };

    const handleProcessPayout = async () => {
        if (!selectedPayout) return;
        
        setSubmitting(true);
        try {
            const result = await payoutsAPI.processPayout(selectedPayout.id, transactionRef);
            if (result.status === 'success') {
                toast.success('Payout processed successfully!');
                setShowProcessModal(false);
                setTransactionRef('');
                setSelectedPayout(null);
                fetchAllData();
            } else {
                toast.error(result.message || 'Failed to process payout');
            }
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to process payout');
        } finally {
            setSubmitting(false);
        }
    };

    const handleRejectPayout = async () => {
        if (!selectedPayout || !rejectReason.trim()) {
            toast.error('Please provide a reason for rejection');
            return;
        }
        
        setSubmitting(true);
        try {
            const result = await payoutsAPI.rejectPayout(selectedPayout.id, rejectReason);
            if (result.status === 'success') {
                toast.success('Payout rejected');
                setShowRejectModal(false);
                setRejectReason('');
                setSelectedPayout(null);
                fetchAllData();
            } else {
                toast.error(result.message || 'Failed to reject payout');
            }
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to reject payout');
        } finally {
            setSubmitting(false);
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        return new Date(dateStr).toLocaleDateString('en-PK', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getStatusBadge = (status) => {
        const badges = {
            pending: { variant: 'warning', icon: <FaClock />, text: 'Pending' },
            processing: { variant: 'info', icon: <FaClock />, text: 'Processing' },
            completed: { variant: 'success', icon: <FaCheckCircle />, text: 'Completed' },
            rejected: { variant: 'danger', icon: <FaTimesCircle />, text: 'Rejected' }
        };
        const badge = badges[status] || badges.pending;
        return (
            <Badge bg={badge.variant}>
                {badge.icon} {badge.text}
            </Badge>
        );
    };

    const filteredPayouts = allPayouts.filter(payout => {
        if (!searchTerm) return true;
        const search = searchTerm.toLowerCase();
        return (
            payout.photographer_name?.toLowerCase().includes(search) ||
            payout.id?.toLowerCase().includes(search) ||
            payout.bank_name?.toLowerCase().includes(search)
        );
    });

    if (loading) {
        return (
            <Container className="py-5 text-center">
                <Spinner animation="border" variant="primary" />
                <p className="mt-3">Loading payout data...</p>
            </Container>
        );
    }

    return (
        <Container fluid className="py-4">
            <h2 className="mb-4">
                <FaMoneyBillWave className="me-2" /> Payout Management
            </h2>

            {/* Stats Overview Cards */}
            <Row className="mb-4">
                <Col md={3}>
                    <Card className="stat-card pending-stat">
                        <Card.Body>
                            <div className="stat-icon"><FaClock /></div>
                            <div className="stat-content">
                                <h3>{stats?.pending_count || 0}</h3>
                                <span>Pending Requests</span>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="stat-card amount-stat">
                        <Card.Body>
                            <div className="stat-icon"><FaMoneyBillWave /></div>
                            <div className="stat-content">
                                <h3>Rs. {(stats?.pending_amount || 0).toLocaleString()}</h3>
                                <span>Pending Amount</span>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="stat-card processed-stat">
                        <Card.Body>
                            <div className="stat-icon"><FaCheckCircle /></div>
                            <div className="stat-content">
                                <h3>Rs. {(stats?.total_processed || 0).toLocaleString()}</h3>
                                <span>Total Processed</span>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="stat-card photographers-stat">
                        <Card.Body>
                            <div className="stat-icon"><FaUsers /></div>
                            <div className="stat-content">
                                <h3>{stats?.photographers_with_balance || 0}</h3>
                                <span>Active Photographers</span>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Pending Alert */}
            {pendingPayouts.length > 0 && (
                <Alert variant="warning" className="d-flex align-items-center">
                    <FaExclamationTriangle className="me-2" />
                    <strong>{pendingPayouts.length} payout request(s)</strong> are waiting for your review
                </Alert>
            )}

            {/* Main Content Tabs */}
            <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-4">
                <Tab eventKey="pending" title={<><FaClock className="me-1" /> Pending ({pendingPayouts.length})</>}>
                    <Card>
                        <Card.Body>
                            {pendingPayouts.length === 0 ? (
                                <div className="text-center py-5 text-muted">
                                    <FaCheckCircle size={48} className="mb-3" />
                                    <p>No pending payout requests</p>
                                </div>
                            ) : (
                                <Table responsive hover className="payout-table">
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Photographer</th>
                                            <th>Amount</th>
                                            <th>Method</th>
                                            <th>Account Details</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pendingPayouts.map((payout) => (
                                            <tr key={payout.id}>
                                                <td>{formatDate(payout.created_at)}</td>
                                                <td>
                                                    <strong>{payout.photographer_name || 'N/A'}</strong>
                                                    <div className="small text-muted">{payout.photographer_email}</div>
                                                </td>
                                                <td><strong className="text-success">Rs. {payout.amount?.toLocaleString()}</strong></td>
                                                <td>
                                                    {payout.payout_method === 'bank' ? (
                                                        <><FaUniversity className="me-1" /> Bank</>
                                                    ) : (
                                                        <><FaMobileAlt className="me-1" /> {payout.payout_method}</>
                                                    )}
                                                </td>
                                                <td>
                                                    {payout.payout_method === 'bank' ? (
                                                        <>
                                                            <div>{payout.bank_name}</div>
                                                            <div className="small text-muted">{payout.account_number_masked}</div>
                                                        </>
                                                    ) : (
                                                        <>{payout.wallet_number_masked}</>
                                                    )}
                                                </td>
                                                <td>
                                                    <Button 
                                                        variant="success" 
                                                        size="sm" 
                                                        className="me-2"
                                                        onClick={() => {
                                                            setSelectedPayout(payout);
                                                            setShowProcessModal(true);
                                                        }}
                                                    >
                                                        <FaCheckCircle /> Process
                                                    </Button>
                                                    <Button 
                                                        variant="outline-danger" 
                                                        size="sm"
                                                        onClick={() => {
                                                            setSelectedPayout(payout);
                                                            setShowRejectModal(true);
                                                        }}
                                                    >
                                                        <FaTimesCircle /> Reject
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            )}
                        </Card.Body>
                    </Card>
                </Tab>

                <Tab eventKey="all" title={<><FaChartLine className="me-1" /> All Payouts</>}>
                    <Card>
                        <Card.Header className="bg-white">
                            <Row className="align-items-center">
                                <Col md={4}>
                                    <InputGroup>
                                        <InputGroup.Text><FaSearch /></InputGroup.Text>
                                        <Form.Control
                                            placeholder="Search by name, ID..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                    </InputGroup>
                                </Col>
                                <Col md={3}>
                                    <Form.Select 
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                    >
                                        <option value="">All Statuses</option>
                                        <option value="pending">Pending</option>
                                        <option value="processing">Processing</option>
                                        <option value="completed">Completed</option>
                                        <option value="rejected">Rejected</option>
                                    </Form.Select>
                                </Col>
                                <Col md={5} className="text-end">
                                    <span className="text-muted">
                                        Showing {filteredPayouts.length} payouts
                                    </span>
                                </Col>
                            </Row>
                        </Card.Header>
                        <Card.Body>
                            {filteredPayouts.length === 0 ? (
                                <div className="text-center py-5 text-muted">
                                    <FaMoneyBillWave size={48} className="mb-3" />
                                    <p>No payouts found</p>
                                </div>
                            ) : (
                                <Table responsive hover className="payout-table">
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Photographer</th>
                                            <th>Amount</th>
                                            <th>Method</th>
                                            <th>Status</th>
                                            <th>Reference</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredPayouts.map((payout) => (
                                            <tr key={payout.id}>
                                                <td>{formatDate(payout.created_at)}</td>
                                                <td>
                                                    <strong>{payout.photographer_name || 'N/A'}</strong>
                                                </td>
                                                <td><strong>Rs. {payout.amount?.toLocaleString()}</strong></td>
                                                <td>
                                                    {payout.payout_method === 'bank' ? (
                                                        <><FaUniversity className="me-1" /> Bank</>
                                                    ) : (
                                                        <><FaMobileAlt className="me-1" /> {payout.payout_method}</>
                                                    )}
                                                </td>
                                                <td>{getStatusBadge(payout.status)}</td>
                                                <td>{payout.transaction_reference || '-'}</td>
                                                <td>
                                                    <Button 
                                                        variant="outline-primary" 
                                                        size="sm"
                                                        onClick={() => {
                                                            setSelectedPayout(payout);
                                                            setShowDetailsModal(true);
                                                        }}
                                                    >
                                                        <FaEye /> View
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            )}
                        </Card.Body>
                    </Card>
                </Tab>
            </Tabs>

            {/* Process Payout Modal */}
            <Modal show={showProcessModal} onHide={() => setShowProcessModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Process Payout</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedPayout && (
                        <>
                            <div className="payout-summary mb-4">
                                <div className="d-flex justify-content-between mb-2">
                                    <span>Photographer:</span>
                                    <strong>{selectedPayout.photographer_name}</strong>
                                </div>
                                <div className="d-flex justify-content-between mb-2">
                                    <span>Amount:</span>
                                    <strong className="text-success">Rs. {selectedPayout.amount?.toLocaleString()}</strong>
                                </div>
                                <div className="d-flex justify-content-between mb-2">
                                    <span>Method:</span>
                                    <strong>
                                        {selectedPayout.payout_method === 'bank' 
                                            ? `${selectedPayout.bank_name}` 
                                            : selectedPayout.payout_method}
                                    </strong>
                                </div>
                                <div className="d-flex justify-content-between">
                                    <span>Account:</span>
                                    <strong>
                                        {selectedPayout.payout_method === 'bank'
                                            ? selectedPayout.account_number
                                            : selectedPayout.wallet_number}
                                    </strong>
                                </div>
                            </div>

                            <Alert variant="info">
                                Please transfer the amount via bank/wallet and enter the transaction reference below.
                            </Alert>

                            <Form.Group>
                                <Form.Label>Transaction Reference (Optional)</Form.Label>
                                <Form.Control
                                    type="text"
                                    placeholder="e.g., TXN123456789"
                                    value={transactionRef}
                                    onChange={(e) => setTransactionRef(e.target.value)}
                                />
                                <Form.Text className="text-muted">
                                    Enter the bank/wallet transaction ID for record keeping
                                </Form.Text>
                            </Form.Group>
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowProcessModal(false)}>
                        Cancel
                    </Button>
                    <Button 
                        variant="success" 
                        onClick={handleProcessPayout}
                        disabled={submitting}
                    >
                        {submitting ? <Spinner size="sm" /> : 'Confirm Payment Sent'}
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Reject Payout Modal */}
            <Modal show={showRejectModal} onHide={() => setShowRejectModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Reject Payout</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedPayout && (
                        <>
                            <div className="payout-summary mb-4">
                                <div className="d-flex justify-content-between mb-2">
                                    <span>Photographer:</span>
                                    <strong>{selectedPayout.photographer_name}</strong>
                                </div>
                                <div className="d-flex justify-content-between">
                                    <span>Amount:</span>
                                    <strong>Rs. {selectedPayout.amount?.toLocaleString()}</strong>
                                </div>
                            </div>

                            <Alert variant="warning">
                                The amount will be returned to the photographer's available balance.
                            </Alert>

                            <Form.Group>
                                <Form.Label>Reason for Rejection *</Form.Label>
                                <Form.Control
                                    as="textarea"
                                    rows={3}
                                    placeholder="e.g., Invalid bank details, Account verification failed..."
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                    required
                                />
                            </Form.Group>
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowRejectModal(false)}>
                        Cancel
                    </Button>
                    <Button 
                        variant="danger" 
                        onClick={handleRejectPayout}
                        disabled={submitting || !rejectReason.trim()}
                    >
                        {submitting ? <Spinner size="sm" /> : 'Reject Payout'}
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Payout Details Modal */}
            <Modal show={showDetailsModal} onHide={() => setShowDetailsModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Payout Details</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedPayout && (
                        <div className="payout-details">
                            <div className="detail-row">
                                <span className="label">Payout ID:</span>
                                <span className="value">{selectedPayout.id}</span>
                            </div>
                            <div className="detail-row">
                                <span className="label">Status:</span>
                                <span className="value">{getStatusBadge(selectedPayout.status)}</span>
                            </div>
                            <div className="detail-row">
                                <span className="label">Photographer:</span>
                                <span className="value">{selectedPayout.photographer_name}</span>
                            </div>
                            <div className="detail-row">
                                <span className="label">Amount:</span>
                                <span className="value text-success">Rs. {selectedPayout.amount?.toLocaleString()}</span>
                            </div>
                            <div className="detail-row">
                                <span className="label">Method:</span>
                                <span className="value">{selectedPayout.payout_method}</span>
                            </div>
                            <div className="detail-row">
                                <span className="label">Requested:</span>
                                <span className="value">{formatDate(selectedPayout.created_at)}</span>
                            </div>
                            {selectedPayout.processed_at && (
                                <div className="detail-row">
                                    <span className="label">Processed:</span>
                                    <span className="value">{formatDate(selectedPayout.processed_at)}</span>
                                </div>
                            )}
                            {selectedPayout.transaction_reference && (
                                <div className="detail-row">
                                    <span className="label">Reference:</span>
                                    <span className="value">{selectedPayout.transaction_reference}</span>
                                </div>
                            )}
                            {selectedPayout.rejection_reason && (
                                <div className="detail-row">
                                    <span className="label">Rejection Reason:</span>
                                    <span className="value text-danger">{selectedPayout.rejection_reason}</span>
                                </div>
                            )}
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowDetailsModal(false)}>
                        Close
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default AdminPayouts;
