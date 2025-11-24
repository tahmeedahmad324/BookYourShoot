import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import photographersData from '../../data/photographers.json';

const ClientChat = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [photographer, setPhotographer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Mock responses for demonstration
  const mockResponses = [
    "Hello! Thanks for reaching out. How can I help you today?",
    "I'd be happy to discuss your photography needs. What type of event are you planning?",
    "That sounds wonderful! I have experience with that type of photography.",
    "My rates are competitive and I offer flexible packages. Would you like to discuss pricing?",
    "I'm available on the date you mentioned. Shall we proceed with booking details?",
    "Thank you for your interest! I'll get back to you with a detailed quote soon.",
    "I use professional equipment including Canon cameras and professional lighting.",
    "Yes, I can provide references from previous clients if needed.",
    "The editing process typically takes 7-10 business days.",
    "I offer both indoor and outdoor photography services.",
    "Travel charges may apply for locations outside my usual service area.",
    "I'm looking forward to working with you!"
  ];

  useEffect(() => {
    // Simulate API call to get photographer details
    setTimeout(() => {
      const foundPhotographer = photographersData.photographers.find(p => p.id === parseInt(id));
      if (foundPhotographer) {
        setPhotographer(foundPhotographer);
        
        // Initialize with welcome message
        const initialMessages = [
          {
            id: 1,
            sender: 'photographer',
            text: `Hello ${user?.name || 'there'}! Welcome to my chat. How can I help you with your photography needs?`,
            timestamp: new Date(Date.now() - 60000).toISOString()
          }
        ];
        setMessages(initialMessages);
      }
      setLoading(false);
    }, 1000);
  }, [id, user]);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = (e) => {
    e.preventDefault();
    
    if (!newMessage.trim()) return;
    
    const userMessage = {
      id: Date.now(),
      sender: 'user',
      text: newMessage.trim(),
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setNewMessage('');
    
    // Show photographer typing
    setIsTyping(true);
    
    // Simulate photographer response after 2-3 seconds
    setTimeout(() => {
      const randomResponse = mockResponses[Math.floor(Math.random() * mockResponses.length)];
      const photographerMessage = {
        id: Date.now() + 1,
        sender: 'photographer',
        text: randomResponse,
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, photographerMessage]);
      setIsTyping(false);
    }, 2000 + Math.random() * 2000);
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const today = new Date();
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    }
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const groupMessagesByDate = (messages) => {
    const groups = {};
    
    messages.forEach(message => {
      const date = formatDate(message.timestamp);
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
    });
    
    return groups;
  };

  if (loading) {
    return (
      <div className="client-chat py-4">
        <div className="container">
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-3">Loading chat...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!photographer) {
    return (
      <div className="client-chat py-4">
        <div className="container">
          <div className="text-center py-5">
            <h4 className="fw-bold mb-3">Photographer Not Found</h4>
            <p className="text-muted mb-4">The photographer you're trying to chat with doesn't exist.</p>
            <Link to="/search" className="btn btn-primary" onClick={() => window.scrollTo(0, 0)}>
              Find Photographers
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const messageGroups = groupMessagesByDate(messages);

  return (
    <div className="client-chat py-4">
      <div className="container-fluid" style={{ maxWidth: '1200px' }}>
        {/* Chat Header */}
        <div className="gradient-header rounded-3 p-3 mb-4">
          <div className="row align-items-center">
            <div className="col-auto">
              <div className="rounded-circle bg-white bg-opacity-20 d-flex align-items-center justify-content-center" 
                   style={{ width: '50px', height: '50px', fontSize: '1.5rem' }}>
                📸
              </div>
            </div>
            <div className="col">
              <h5 className="fw-bold text-white mb-1">{photographer.name}</h5>
              <div className="text-white-50 small">
                <span className="me-3">⭐ {photographer.rating} rating</span>
                <span className="me-3">📍 {photographer.location}</span>
                <span className={`me-3 ${isOnline ? 'text-success' : 'text-warning'}`}>
                  {isOnline ? '🟢 Online' : '🟡 Away'}
                </span>
                <span>⏱️ {photographer.response_time} response time</span>
              </div>
            </div>
            <div className="col-auto">
              <Link to={`/photographer/${photographer.id}`} className="btn btn-light btn-sm" onClick={() => window.scrollTo(0, 0)}>
                View Profile
              </Link>
            </div>
          </div>
        </div>

        <div className="row">
          {/* Main Chat Area */}
          <div className="col-lg-8">
            <div className="card border-0 shadow-sm">
              <div className="card-body p-0" style={{ height: '600px' }}>
                {/* Messages Container */}
                <div className="chat-messages p-4" style={{ height: '500px', overflowY: 'auto' }}>
                  {Object.entries(messageGroups).map(([date, dateMessages]) => (
                    <div key={date}>
                      <div className="text-center mb-3">
                        <span className="badge bg-light text-dark">
                          {date}
                        </span>
                      </div>
                      {dateMessages.map((message) => (
                        <div 
                          key={message.id} 
                          className={`mb-3 d-flex ${message.sender === 'user' ? 'justify-content-end' : 'justify-content-start'}`}
                        >
                          {message.sender === 'photographer' && (
                            <div className="col-auto">
                              <div className="rounded-circle bg-light d-flex align-items-center justify-content-center" 
                                   style={{ width: '40px', height: '40px', fontSize: '1rem' }}>
                                📸
                              </div>
                            </div>
                          )}
                          <div className={`col-auto ${message.sender === 'user' ? 'text-end' : ''}`}>
                            <div className={`message-bubble ${message.sender === 'user' ? 'chat-message-sent' : 'chat-message-received'}`}>
                              {message.text}
                            </div>
                            <div className={`text-muted small ${message.sender === 'user' ? 'text-end' : ''} mt-1`}>
                              {formatTime(message.timestamp)}
                            </div>
                          </div>
                          {message.sender === 'user' && (
                            <div className="col-auto">
                              <div className="rounded-circle bg-light d-flex align-items-center justify-content-center" 
                                   style={{ width: '40px', height: '40px', fontSize: '1rem' }}>
                                👤
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                  
                  {/* Typing Indicator */}
                  {isTyping && (
                    <div className="d-flex justify-content-start mb-3">
                      <div className="col-auto">
                        <div className="rounded-circle bg-light d-flex align-items-center justify-content-center" 
                             style={{ width: '40px', height: '40px', fontSize: '1rem' }}>
                          📸
                        </div>
                      </div>
                      <div className="col-auto">
                        <div className="chat-message-received">
                          <div className="typing-indicator">
                            <span></span>
                            <span></span>
                            <span></span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div className="border-top p-3">
                  <form onSubmit={sendMessage}>
                    <div className="d-flex gap-2">
                      <input
                        ref={inputRef}
                        type="text"
                        className="form-control"
                        placeholder="Type your message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        disabled={isTyping}
                      />
                      <button 
                        type="submit" 
                        className="btn btn-primary"
                        disabled={!newMessage.trim() || isTyping}
                      >
                        Send
                      </button>
                    </div>
                  </form>
                  
                  <div className="d-flex justify-content-between align-items-center mt-2">
                    <small className="text-muted">
                      {isOnline ? '🟢 Photographer is online' : '🟡 Photographer is away'} • Typically responds within {photographer.response_time}
                    </small>
                    <small className="text-muted">
                      End-to-end encrypted
                    </small>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="col-lg-4">
            {/* Quick Actions */}
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-header bg-white border-0 pt-4 pb-3">
                <h6 className="fw-bold mb-0">Quick Actions</h6>
              </div>
              <div className="card-body">
                <div className="d-grid gap-2">
                  <Link to={`/booking/request/${photographer.id}`} className="btn btn-primary" onClick={() => window.scrollTo(0, 0)}>
                    📅 Book {photographer.name}
                  </Link>
                  <button className="btn btn-outline-primary">
                    📞 Request Phone Call
                  </button>
                  <button className="btn btn-outline-primary">
                    📧 Send Email
                  </button>
                  <button className="btn btn-outline-primary">
                    📍 Get Directions
                  </button>
                </div>
              </div>
            </div>

            {/* Photographer Info */}
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-header bg-white border-0 pt-4 pb-3">
                <h6 className="fw-bold mb-0">About {photographer.name}</h6>
              </div>
              <div className="card-body">
                <div className="mb-3">
                  <div className="d-flex justify-content-between mb-1">
                    <span className="text-muted">Experience:</span>
                    <span className="fw-semibold">{photographer.experience} years</span>
                  </div>
                  <div className="d-flex justify-content-between mb-1">
                    <span className="text-muted">Bookings:</span>
                    <span className="fw-semibold">{photographer.completed_bookings}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-1">
                    <span className="text-muted">Rating:</span>
                    <span className="fw-semibold">⭐ {photographer.rating}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-1">
                    <span className="text-muted">Rate:</span>
                    <span className="fw-semibold">PKR {photographer.hourly_rate}/hr</span>
                  </div>
                </div>
                
                <div className="mb-3">
                  <h6 className="small text-muted mb-2">Specialties:</h6>
                  <div className="d-flex flex-wrap gap-1">
                    {photographer.specialty.map((spec, index) => (
                      <span key={index} className="badge bg-light text-dark small">
                        {spec}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div className="alert alert-info small">
                  <strong>💡 Tip:</strong> Ask about their portfolio, equipment, and previous experience with events similar to yours.
                </div>
              </div>
            </div>

            {/* Chat Guidelines */}
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-white border-0 pt-4 pb-3">
                <h6 className="fw-bold mb-0">Chat Guidelines</h6>
              </div>
              <div className="card-body">
                <ul className="list-unstyled small">
                  <li className="mb-2">📝 Be clear about your photography needs</li>
                  <li className="mb-2">📅 Mention event date and location</li>
                  <li className="mb-2">💰 Discuss budget and pricing upfront</li>
                  <li className="mb-2">🤝 Be respectful and professional</li>
                  <li className="mb-2">📸 Ask about their experience with similar events</li>
                  <li className="mb-2">⏰ Response time is usually {photographer.response_time}</li>
                  <li className="mb-2">🔒 Your conversation is private and secure</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientChat;
