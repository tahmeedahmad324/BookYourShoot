import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Badge, Table, Alert, Spinner, Modal, Form, Tab, Tabs } from 'react-bootstrap';
import { FaWallet, FaMoneyBillWave, FaClock, FaCheckCircle, FaTimesCircle, FaUniversity, FaMobileAlt, FaHistory, FaExclamationTriangle } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { payoutsAPI } from '../../api/payouts';
import { toast } from 'react-toastify';
import '../../styles/PhotographerEarnings.css';

const PAKISTANI_BANKS = [
    "Allied Bank Limited",
    "Askari Bank",
    "Bank Alfalah",
    "Bank Al-Habib",
    "Bank of Punjab",
    "Faysal Bank",
    "Habib Bank Limited (HBL)",
    "Habib Metropolitan Bank",
    "JS Bank",
    "MCB Bank",
    "Meezan Bank",
    "National Bank of Pakistan",
    "Silk Bank",
    "Soneri Bank",
    "Standard Chartered Pakistan",
    "Summit Bank",
    "United Bank Limited (UBL)"
];

const PhotographerEarnings = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [balance, setBalance] = useState(null);
    const [payouts, setPayouts] = useState([]);
    const [bankDetails, setBankDetails] = useState(null);
    const [showPayoutModal, setShowPayoutModal] = useState(false);
    const [showBankModal, setShowBankModal] = useState(false);
    const [payoutAmount, setPayoutAmount] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');

    // Bank details form
    const [bankForm, setBankForm] = useState({
        preferredMethod: 'bank',
        bankName: '',
        accountTitle: '',
        accountNumber: '',
        walletNumber: ''
    });

    useEffect(() => {
        fetchAllData();
    }, []);

    const fetchAllData = async () => {
        setLoading(true);
        try {
            const [balanceRes, payoutsRes, bankRes] = await Promise.all([
                payoutsAPI.getBalance(),
                payoutsAPI.getMyPayouts(),
                payoutsAPI.getBankDetails()
            ]);

            if (balanceRes.status === 'success') {
                setBalance(balanceRes.balance);
            }
            if (payoutsRes.status === 'success') {
                setPayouts(payoutsRes.payouts || []);
            }
            if (bankRes.status === 'success' && bankRes.has_details) {
                setBankDetails(bankRes.details);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            toast.error('Failed to load earnings data');
        } finally {
            setLoading(false);
        }
    };

    const handleRequestPayout = async () => {
        if (!bankDetails) {
            toast.warning('Please add your bank details first');
            setShowBankModal(true);
            return;
        }

        const amount = payoutAmount ? parseFloat(payoutAmount) : null;
        if (payoutAmount && (isNaN(amount) || amount <= 0)) {
            toast.error('Please enter a valid amount');
            return;
        }

        if (balance?.available_balance <= 0) {
            toast.error('No available balance to withdraw');
            return;
        }

        setSubmitting(true);
        try {
            const result = await payoutsAPI.requestPayout(amount);
            if (result.status === 'success') {
                toast.success(`Payout request submitted for Rs. ${result.payout?.amount?.toLocaleString()}`);
                setShowPayoutModal(false);
                setPayoutAmount('');
                fetchAllData();
            } else {
                toast.error(result.message || 'Failed to request payout');
            }
        } catch (error) {
            toast.error(error.message || 'Failed to request payout');
        } finally {
            setSubmitting(false);
        }
    };

    const handleSaveBankDetails = async (e) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const payload = {
                preferred_method: bankForm.preferredMethod,
                bank_name: bankForm.preferredMethod === 'bank' ? bankForm.bankName : null,
                account_title: bankForm.preferredMethod === 'bank' ? bankForm.accountTitle : null,
                account_number: bankForm.preferredMethod === 'bank' ? bankForm.accountNumber : null,
                wallet_number: bankForm.preferredMethod !== 'bank' ? bankForm.walletNumber : null
            };

            const result = await payoutsAPI.saveBankDetails(payload);
            if (result.status === 'success') {
                toast.success('Bank details saved successfully');
                setShowBankModal(false);
                fetchAllData();
            } else {
                toast.error(result.message || 'Failed to save bank details');
            }
        } catch (error) {
            toast.error(error.message || 'Failed to save bank details');
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

    if (loading) {
        return (
            <Container className="py-5 text-center">
                <Spinner animation="border" variant="primary" />
                <p className="mt-3">Loading earnings data...</p>
            </Container>
        );
    }

    return (
        <Container className="py-4">
            <h2 className="mb-4">
                <FaWallet className="me-2" /> My Earnings
            </h2>

            {/* Balance Overview Cards */}
            <Row className="mb-4">
                <Col md={4}>
                    <Card className="earnings-card available">
                        <Card.Body>
                            <div className="earnings-icon">
                                <FaMoneyBillWave />
                            </div>
                            <div className="earnings-content">
                                <h6>Available Balance</h6>
                                <h2>Rs. {(balance?.available_balance || 0).toLocaleString()}</h2>
                                <small className="text-muted">Ready to withdraw</small>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={4}>
                    <Card className="earnings-card pending">
                        <Card.Body>
                            <div className="earnings-icon">
                                <FaClock />
                            </div>
                            <div className="earnings-content">
                                <h6>Pending Balance</h6>
                                <h2>Rs. {(balance?.pending_balance || 0).toLocaleString()}</h2>
                                <small className="text-muted">In escrow (7-day hold)</small>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={4}>
                    <Card className="earnings-card total">
                        <Card.Body>
                            <div className="earnings-icon">
                                <FaCheckCircle />
                            </div>
                            <div className="earnings-content">
                                <h6>Total Earnings</h6>
                                <h2>Rs. {(balance?.total_earnings || 0).toLocaleString()}</h2>
                                <small className="text-muted">Lifetime earnings</small>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Bank Details Alert */}
            {!bankDetails && (
                <Alert variant="warning" className="d-flex align-items-center justify-content-between">
                    <div>
                        <FaExclamationTriangle className="me-2" />
                        <strong>Add your bank details</strong> to start receiving payouts
                    </div>
                    <Button variant="warning" size="sm" onClick={() => setShowBankModal(true)}>
                        Add Bank Details
                    </Button>
                </Alert>
            )}

            {/* Action Buttons */}
            <div className="d-flex gap-3 mb-4">
                <Button 
                    variant="success" 
                    size="lg"
                    onClick={() => setShowPayoutModal(true)}
                    disabled={!balance?.available_balance || balance.available_balance <= 0}
                >
                    <FaMoneyBillWave className="me-2" />
                    Request Payout
                </Button>
                <Button 
                    variant="outline-primary"
                    onClick={() => setShowBankModal(true)}
                >
                    <FaUniversity className="me-2" />
                    {bankDetails ? 'Update Bank Details' : 'Add Bank Details'}
                </Button>
            </div>

            {/* Tabs for Details */}
            <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-4">
                <Tab eventKey="overview" title="Overview">
                    <Card>
                        <Card.Body>
                            <h5>Payment Information</h5>
                            <Row className="mt-3">
                                <Col md={6}>
                                    <div className="info-item">
                                        <span className="label">Platform Commission:</span>
                                        <span className="value">10% of booking amount</span>
                                    </div>
                                    <div className="info-item">
                                        <span className="label">Escrow Period:</span>
                                        <span className="value">7 days after job completion</span>
                                    </div>
                                    <div className="info-item">
                                        <span className="label">Minimum Payout:</span>
                                        <span className="value">Rs. 500</span>
                                    </div>
                                </Col>
                                <Col md={6}>
                                    <div className="info-item">
                                        <span className="label">Payout Method:</span>
                                        <span className="value">{bankDetails?.preferred_method || 'Not set'}</span>
                                    </div>
                                    {bankDetails?.preferred_method === 'bank' && (
                                        <>
                                            <div className="info-item">
                                                <span className="label">Bank:</span>
                                                <span className="value">{bankDetails.bank_name}</span>
                                            </div>
                                            <div className="info-item">
                                                <span className="label">Account:</span>
                                                <span className="value">{bankDetails.account_number_masked}</span>
                                            </div>
                                        </>
                                    )}
                                    {bankDetails?.preferred_method !== 'bank' && bankDetails?.wallet_number_masked && (
                                        <div className="info-item">
                                            <span className="label">Wallet:</span>
                                            <span className="value">{bankDetails.wallet_number_masked}</span>
                                        </div>
                                    )}
                                </Col>
                            </Row>
                        </Card.Body>
                    </Card>
                </Tab>

                <Tab eventKey="payouts" title={<><FaHistory className="me-1" /> Payout History</>}>
                    <Card>
                        <Card.Body>
                            {payouts.length === 0 ? (
                                <div className="text-center py-5 text-muted">
                                    <FaHistory size={48} className="mb-3" />
                                    <p>No payout history yet</p>
                                </div>
                            ) : (
                                <Table responsive hover>
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Amount</th>
                                            <th>Method</th>
                                            <th>Status</th>
                                            <th>Reference</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {payouts.map((payout) => (
                                            <tr key={payout.id}>
                                                <td>{formatDate(payout.created_at)}</td>
                                                <td><strong>Rs. {payout.amount?.toLocaleString()}</strong></td>
                                                <td>
                                                    {payout.payout_method === 'bank' ? (
                                                        <><FaUniversity className="me-1" /> Bank Transfer</>
                                                    ) : (
                                                        <><FaMobileAlt className="me-1" /> {payout.payout_method}</>
                                                    )}
                                                </td>
                                                <td>{getStatusBadge(payout.status)}</td>
                                                <td>
                                                    {payout.transaction_reference || '-'}
                                                    {payout.rejection_reason && (
                                                        <div className="text-danger small">
                                                            Reason: {payout.rejection_reason}
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            )}
                        </Card.Body>
                    </Card>
                </Tab>

                <Tab eventKey="transactions" title="Recent Transactions">
                    <Card>
                        <Card.Body>
                            {!balance?.recent_transactions?.length ? (
                                <div className="text-center py-5 text-muted">
                                    <FaWallet size={48} className="mb-3" />
                                    <p>No transactions yet</p>
                                </div>
                            ) : (
                                <Table responsive hover>
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Description</th>
                                            <th>Type</th>
                                            <th>Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {balance.recent_transactions.map((txn, idx) => (
                                            <tr key={idx}>
                                                <td>{formatDate(txn.date)}</td>
                                                <td>{txn.description}</td>
                                                <td>
                                                    <Badge bg={txn.type === 'credit' ? 'success' : 'danger'}>
                                                        {txn.type}
                                                    </Badge>
                                                </td>
                                                <td className={txn.type === 'credit' ? 'text-success' : 'text-danger'}>
                                                    {txn.type === 'credit' ? '+' : '-'} Rs. {txn.amount?.toLocaleString()}
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

            {/* Request Payout Modal */}
            <Modal show={showPayoutModal} onHide={() => setShowPayoutModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Request Payout</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div className="mb-3">
                        <p><strong>Available Balance:</strong> Rs. {balance?.available_balance?.toLocaleString()}</p>
                    </div>
                    <Form.Group>
                        <Form.Label>Amount to Withdraw</Form.Label>
                        <Form.Control
                            type="number"
                            placeholder={`Max: Rs. ${balance?.available_balance?.toLocaleString()}`}
                            value={payoutAmount}
                            onChange={(e) => setPayoutAmount(e.target.value)}
                            min={500}
                            max={balance?.available_balance}
                        />
                        <Form.Text className="text-muted">
                            Leave empty to withdraw full available balance. Minimum: Rs. 500
                        </Form.Text>
                    </Form.Group>

                    {bankDetails && (
                        <div className="mt-3 p-3 bg-light rounded">
                            <small className="text-muted">Payout will be sent to:</small>
                            <p className="mb-0">
                                {bankDetails.preferred_method === 'bank' ? (
                                    <><FaUniversity className="me-2" />{bankDetails.bank_name} - {bankDetails.account_number_masked}</>
                                ) : (
                                    <><FaMobileAlt className="me-2" />{bankDetails.preferred_method} - {bankDetails.wallet_number_masked}</>
                                )}
                            </p>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowPayoutModal(false)}>
                        Cancel
                    </Button>
                    <Button 
                        variant="success" 
                        onClick={handleRequestPayout}
                        disabled={submitting}
                    >
                        {submitting ? <Spinner size="sm" /> : 'Request Payout'}
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Bank Details Modal */}
            <Modal show={showBankModal} onHide={() => setShowBankModal(false)} centered size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Bank / Wallet Details</Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleSaveBankDetails}>
                    <Modal.Body>
                        <Form.Group className="mb-3">
                            <Form.Label>Preferred Payout Method</Form.Label>
                            <div>
                                <Form.Check
                                    inline
                                    type="radio"
                                    label="Bank Transfer"
                                    name="payoutMethod"
                                    checked={bankForm.preferredMethod === 'bank'}
                                    onChange={() => setBankForm({ ...bankForm, preferredMethod: 'bank' })}
                                />
                                <Form.Check
                                    inline
                                    type="radio"
                                    label="JazzCash"
                                    name="payoutMethod"
                                    checked={bankForm.preferredMethod === 'jazzcash'}
                                    onChange={() => setBankForm({ ...bankForm, preferredMethod: 'jazzcash' })}
                                />
                                <Form.Check
                                    inline
                                    type="radio"
                                    label="EasyPaisa"
                                    name="payoutMethod"
                                    checked={bankForm.preferredMethod === 'easypaisa'}
                                    onChange={() => setBankForm({ ...bankForm, preferredMethod: 'easypaisa' })}
                                />
                            </div>
                        </Form.Group>

                        {bankForm.preferredMethod === 'bank' ? (
                            <>
                                <Form.Group className="mb-3">
                                    <Form.Label>Bank Name</Form.Label>
                                    <Form.Select
                                        value={bankForm.bankName}
                                        onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value })}
                                        required
                                    >
                                        <option value="">Select Bank</option>
                                        {PAKISTANI_BANKS.map((bank) => (
                                            <option key={bank} value={bank}>{bank}</option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                                <Form.Group className="mb-3">
                                    <Form.Label>Account Title</Form.Label>
                                    <Form.Control
                                        type="text"
                                        placeholder="Account holder name"
                                        value={bankForm.accountTitle}
                                        onChange={(e) => setBankForm({ ...bankForm, accountTitle: e.target.value })}
                                        required
                                    />
                                </Form.Group>
                                <Form.Group className="mb-3">
                                    <Form.Label>Account Number / IBAN</Form.Label>
                                    <Form.Control
                                        type="text"
                                        placeholder="Enter account number or IBAN"
                                        value={bankForm.accountNumber}
                                        onChange={(e) => setBankForm({ ...bankForm, accountNumber: e.target.value })}
                                        required
                                    />
                                </Form.Group>
                            </>
                        ) : (
                            <Form.Group className="mb-3">
                                <Form.Label>{bankForm.preferredMethod === 'jazzcash' ? 'JazzCash' : 'EasyPaisa'} Number</Form.Label>
                                <Form.Control
                                    type="tel"
                                    placeholder="03XX-XXXXXXX"
                                    value={bankForm.walletNumber}
                                    onChange={(e) => setBankForm({ ...bankForm, walletNumber: e.target.value })}
                                    required
                                />
                                <Form.Text className="text-muted">
                                    Enter your registered {bankForm.preferredMethod} mobile number
                                </Form.Text>
                            </Form.Group>
                        )}
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowBankModal(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" variant="primary" disabled={submitting}>
                            {submitting ? <Spinner size="sm" /> : 'Save Details'}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>
        </Container>
    );
};

export default PhotographerEarnings;
