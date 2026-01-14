import React, { useState, useEffect } from 'react';
import { 
    Play, RefreshCw, Eye, CheckCircle, XCircle, 
    Code, Zap, Send, FileText, Clock, X
} from 'lucide-react';
import '../../styles/global.css';

const WebhookSimulator = () => {
    const [events, setEvents] = useState([]);
    const [supportedEvents, setSupportedEvents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [simulating, setSimulating] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [showModal, setShowModal] = useState(false);
    
    const [formData, setFormData] = useState({
        event_type: 'checkout.session.completed',
        booking_id: `BK-${Date.now().toString().slice(-6)}`,
        amount: 15000,
        client_email: 'client@example.com',
        client_name: 'Test Client',
        photographer_name: 'Test Photographer',
        photographer_email: 'photographer@example.com',
        service_type: 'Photography Session',
        session_date: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        fetchEvents();
        fetchSupportedEvents();
    }, []);

    const fetchEvents = async () => {
        setLoading(true);
        try {
            const res = await fetch('http://localhost:5000/api/payments/webhooks/events');
            const data = await res.json();
            if (data.success) setEvents(data.events);
        } catch (err) {
            console.error('Error fetching events:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchSupportedEvents = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/payments/webhooks/supported-events');
            const data = await res.json();
            if (data.success) setSupportedEvents(data.events);
        } catch (err) {
            console.error('Error fetching supported events:', err);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'amount' ? parseFloat(value) : value
        }));
    };

    const simulateWebhook = async () => {
        setSimulating(true);
        setError(null);
        setSuccess(null);
        
        try {
            const res = await fetch('http://localhost:5000/api/payments/webhooks/simulate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            
            const data = await res.json();
            
            if (data.success) {
                setSuccess(`Webhook '${formData.event_type}' simulated successfully!`);
                fetchEvents();
                setFormData(prev => ({
                    ...prev,
                    booking_id: `BK-${Date.now().toString().slice(-6)}`
                }));
            } else {
                setError(data.detail || 'Failed to simulate webhook');
            }
        } catch (err) {
            setError('Failed to connect to backend');
        } finally {
            setSimulating(false);
        }
    };

    const simulateFullFlow = async () => {
        setSimulating(true);
        setError(null);
        setSuccess(null);
        
        try {
            const res = await fetch('http://localhost:5000/api/payments/webhooks/simulate-full-flow', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            
            const data = await res.json();
            
            if (data.success) {
                setSuccess(
                    <div>
                        <strong>Full payment flow simulated!</strong>
                        <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
                            {data.flow_steps.map((step, i) => (
                                <li key={i}>{step}</li>
                            ))}
                        </ul>
                    </div>
                );
                fetchEvents();
                setFormData(prev => ({
                    ...prev,
                    booking_id: `BK-${Date.now().toString().slice(-6)}`
                }));
            } else {
                setError(data.detail || 'Failed to simulate full flow');
            }
        } catch (err) {
            setError('Failed to connect to backend');
        } finally {
            setSimulating(false);
        }
    };

    const viewEventDetails = async (eventId) => {
        try {
            const res = await fetch(`http://localhost:5000/api/payments/webhooks/events/${eventId}`);
            const data = await res.json();
            if (data.success) {
                setSelectedEvent(data.event);
                setShowModal(true);
            }
        } catch (err) {
            console.error('Error fetching event:', err);
        }
    };

    const getEventBadgeColor = (type) => {
        if (type.includes('completed') || type.includes('succeeded') || type.includes('success')) return '#28a745';
        if (type.includes('failed')) return '#dc3545';
        if (type.includes('refunded')) return '#ffc107';
        if (type.includes('dispute')) return '#dc3545';
        return '#007bff';
    };

    const getSourceColor = (source) => {
        const colors = { stripe: '#635bff', jazzcash: '#e63946', easypaisa: '#00a651' };
        return colors[source] || '#6c757d';
    };

    return (
        <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Zap size={28} /> Webhook Simulator
                    </h2>
                    <p style={{ color: '#6c757d', marginTop: '4px' }}>Test payment flows by simulating webhook events</p>
                </div>
                <button 
                    onClick={fetchEvents} 
                    disabled={loading}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '8px 16px', border: '1px solid #ddd', borderRadius: '6px',
                        background: '#fff', cursor: 'pointer'
                    }}
                >
                    <RefreshCw size={16} className={loading ? 'spin' : ''} /> Refresh
                </button>
            </div>

            {/* Alerts */}
            {error && (
                <div style={{ background: '#f8d7da', color: '#721c24', padding: '12px 16px', borderRadius: '6px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
                    {error}
                    <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={16} /></button>
                </div>
            )}
            {success && (
                <div style={{ background: '#d4edda', color: '#155724', padding: '12px 16px', borderRadius: '6px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
                    {success}
                    <button onClick={() => setSuccess(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={16} /></button>
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: '24px' }}>
                {/* Form */}
                <div>
                    <div style={{ background: '#fff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                        <div style={{ background: '#007bff', color: '#fff', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Send size={18} /> Simulate Webhook Event
                        </div>
                        <div style={{ padding: '16px' }}>
                            <div style={{ marginBottom: '12px' }}>
                                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Event Type</label>
                                <select name="event_type" value={formData.event_type} onChange={handleInputChange}
                                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}>
                                    {supportedEvents.map(evt => (
                                        <option key={evt.type} value={evt.type}>{evt.type} ({evt.source})</option>
                                    ))}
                                </select>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Booking ID</label>
                                    <input name="booking_id" value={formData.booking_id} onChange={handleInputChange}
                                        style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Amount (PKR)</label>
                                    <input type="number" name="amount" value={formData.amount} onChange={handleInputChange}
                                        style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }} />
                                </div>
                            </div>

                            <div style={{ marginBottom: '12px' }}>
                                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Client Name</label>
                                <input name="client_name" value={formData.client_name} onChange={handleInputChange}
                                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }} />
                            </div>

                            <div style={{ marginBottom: '12px' }}>
                                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Client Email</label>
                                <input type="email" name="client_email" value={formData.client_email} onChange={handleInputChange}
                                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }} />
                            </div>

                            <div style={{ marginBottom: '12px' }}>
                                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Photographer Name</label>
                                <input name="photographer_name" value={formData.photographer_name} onChange={handleInputChange}
                                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }} />
                            </div>

                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Session Date</label>
                                <input type="date" name="session_date" value={formData.session_date} onChange={handleInputChange}
                                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }} />
                            </div>

                            <button onClick={simulateWebhook} disabled={simulating}
                                style={{
                                    width: '100%', padding: '10px', marginBottom: '8px',
                                    background: '#007bff', color: '#fff', border: 'none', borderRadius: '6px',
                                    cursor: simulating ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                                }}>
                                {simulating ? <><RefreshCw size={16} className="spin" /> Simulating...</> : <><Play size={16} /> Simulate Event</>}
                            </button>
                            
                            <button onClick={simulateFullFlow} disabled={simulating}
                                style={{
                                    width: '100%', padding: '10px',
                                    background: '#28a745', color: '#fff', border: 'none', borderRadius: '6px',
                                    cursor: simulating ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                                }}>
                                <Zap size={16} /> Simulate Full Payment Flow
                            </button>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div style={{ background: '#fff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginTop: '16px', overflow: 'hidden' }}>
                        <div style={{ padding: '12px 16px', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <FileText size={18} /> Quick Actions
                        </div>
                        <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <button onClick={() => setFormData(prev => ({ ...prev, event_type: 'checkout.session.completed' }))}
                                style={{ padding: '8px', border: '1px solid #28a745', background: '#fff', color: '#28a745', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <CheckCircle size={14} /> Test Successful Payment
                            </button>
                            <button onClick={() => setFormData(prev => ({ ...prev, event_type: 'payment_intent.payment_failed' }))}
                                style={{ padding: '8px', border: '1px solid #dc3545', background: '#fff', color: '#dc3545', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <XCircle size={14} /> Test Failed Payment
                            </button>
                            <button onClick={() => setFormData(prev => ({ ...prev, event_type: 'charge.refunded' }))}
                                style={{ padding: '8px', border: '1px solid #ffc107', background: '#fff', color: '#856404', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <RefreshCw size={14} /> Test Refund
                            </button>
                        </div>
                    </div>
                </div>

                {/* Event Log */}
                <div style={{ background: '#fff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Clock size={18} /> Recent Webhook Events</span>
                        <span style={{ background: '#6c757d', color: '#fff', padding: '2px 8px', borderRadius: '12px', fontSize: '12px' }}>{events.length} events</span>
                    </div>
                    
                    {events.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '48px', color: '#6c757d' }}>
                            <Zap size={48} style={{ opacity: 0.5, marginBottom: '12px' }} />
                            <p>No webhook events yet</p>
                            <p style={{ fontSize: '14px' }}>Simulate an event to see it here</p>
                        </div>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: '#f8f9fa' }}>
                                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: '500' }}>Event</th>
                                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: '500' }}>Source</th>
                                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: '500' }}>Time</th>
                                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: '500' }}>Status</th>
                                    <th style={{ padding: '10px 12px', width: '40px' }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {events.map(event => (
                                    <tr key={event.id} style={{ borderBottom: '1px solid #eee' }}>
                                        <td style={{ padding: '10px 12px' }}>
                                            <span style={{ 
                                                background: getEventBadgeColor(event.type), color: '#fff',
                                                padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontFamily: 'monospace'
                                            }}>{event.type}</span>
                                        </td>
                                        <td style={{ padding: '10px 12px' }}>
                                            <span style={{ background: getSourceColor(event.source), color: '#fff', padding: '2px 8px', borderRadius: '4px', fontSize: '12px' }}>
                                                {event.source}
                                            </span>
                                        </td>
                                        <td style={{ padding: '10px 12px', color: '#6c757d', fontSize: '13px' }}>
                                            {new Date(event.created_at).toLocaleTimeString()}
                                        </td>
                                        <td style={{ padding: '10px 12px' }}>
                                            {event.processed ? (
                                                event.result?.success ? (
                                                    <span style={{ background: '#28a745', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                        <CheckCircle size={12} /> Processed
                                                    </span>
                                                ) : (
                                                    <span style={{ background: '#dc3545', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                        <XCircle size={12} /> Failed
                                                    </span>
                                                )
                                            ) : (
                                                <span style={{ background: '#ffc107', color: '#000', padding: '2px 8px', borderRadius: '4px', fontSize: '12px' }}>Pending</span>
                                            )}
                                        </td>
                                        <td style={{ padding: '10px 12px' }}>
                                            <button onClick={() => viewEventDetails(event.id)} 
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#007bff' }}>
                                                <Eye size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Modal */}
            {showModal && selectedEvent && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }} onClick={() => setShowModal(false)}>
                    <div style={{ background: '#fff', borderRadius: '8px', maxWidth: '700px', width: '90%', maxHeight: '80vh', overflow: 'auto' }}
                        onClick={e => e.stopPropagation()}>
                        <div style={{ padding: '16px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}><Code size={20} /> Event Details</h3>
                            <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
                        </div>
                        <div style={{ padding: '16px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                                <div><strong>Event ID:</strong> <code>{selectedEvent.id}</code></div>
                                <div><strong>Type:</strong> <span style={{ background: getEventBadgeColor(selectedEvent.type), color: '#fff', padding: '2px 6px', borderRadius: '4px', fontSize: '12px' }}>{selectedEvent.type}</span></div>
                                <div><strong>Source:</strong> <span style={{ background: getSourceColor(selectedEvent.source), color: '#fff', padding: '2px 6px', borderRadius: '4px', fontSize: '12px' }}>{selectedEvent.source}</span></div>
                                <div><strong>Created:</strong> {new Date(selectedEvent.created_at).toLocaleString()}</div>
                            </div>
                            
                            <h4>Payload</h4>
                            <pre style={{ background: '#1e1e1e', color: '#d4d4d4', padding: '12px', borderRadius: '6px', overflow: 'auto', maxHeight: '200px', fontSize: '12px' }}>
                                {JSON.stringify(selectedEvent.payload, null, 2)}
                            </pre>

                            {selectedEvent.result && (
                                <>
                                    <h4>Processing Result</h4>
                                    <pre style={{ 
                                        background: selectedEvent.result.success ? '#d4edda' : '#f8d7da',
                                        padding: '12px', borderRadius: '6px', overflow: 'auto', maxHeight: '150px', fontSize: '12px'
                                    }}>
                                        {JSON.stringify(selectedEvent.result, null, 2)}
                                    </pre>
                                </>
                            )}
                        </div>
                        <div style={{ padding: '16px', borderTop: '1px solid #eee', textAlign: 'right' }}>
                            <button onClick={() => setShowModal(false)} style={{ padding: '8px 16px', background: '#6c757d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Close</button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

export default WebhookSimulator;
