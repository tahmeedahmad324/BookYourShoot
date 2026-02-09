import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';

const PhotographerChat = () => {
  const { id } = useParams(); // conversation ID
  const { getToken } = useAuth();
  const navigate = useNavigate();
  
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

  // Fetch conversation and messages
  useEffect(() => {
    loadConversationAndMessages();
    // eslint-disable-next-line
  }, [id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadConversationAndMessages = async () => {
    try {
      let authToken;
      try {
        authToken = await getToken();
      } catch (e) {
        console.log('getToken failed, trying localStorage...');
      }
      
      if (!authToken) {
        authToken = localStorage.getItem('token');
      }
      
      if (!authToken) {
        navigate('/login');
        return;
      }

      // Fetch conversation details
      const conversationsResp = await axios.get(
        'http://localhost:8000/api/chat/conversations',
        { headers: { 'Authorization': `Bearer ${authToken}` } }
      );
      
      const conv = conversationsResp.data.data?.find(c => c.id === id);
      if (!conv) {
        setError('Conversation not found');
        setLoading(false);
        return;
      }
      
      setConversation(conv);

      // Fetch messages
      const messagesResp = await axios.get(
        `http://localhost:8000/api/chat/conversations/${id}/messages`,
        { headers: { 'Authorization': `Bearer ${authToken}` } }
      );
      
      setMessages(messagesResp.data.data || []);
      setLoading(false);
    } catch (err) {
      console.error('Error loading chat:', err);
      if (err.response?.status === 401) {
        navigate('/login');
      } else {
        setError(err.response?.data?.detail || 'Failed to load conversation');
        setLoading(false);
      }
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim() || sending) return;
    
    setSending(true);
    try {
      let authToken = localStorage.getItem('token');
      
      await axios.post(
        'http://localhost:8000/api/chat/messages',
        {
          conversation_id: id,
          content: newMessage.trim(),
          content_type: 'text'
        },
        { headers: { 'Authorization': `Bearer ${authToken}` } }
      );
      
      setNewMessage('');
      // Reload messages
      await loadConversationAndMessages();
    } catch (err) {
      console.error('Error sending message:', err);
      alert(err.response?.data?.detail || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="container py-5">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3">Loading chat...</p>
        </div>
      </div>
    );
  }

  if (error || !conversation) {
    return (
      <div className="container py-5">
        <div className="text-center">
          <h4 className="fw-bold mb-3">{error || 'Conversation Not Found'}</h4>
          <p className="text-muted mb-3">The conversation you're looking for doesn't exist.</p>
          <Link to="/photographer/messages" className="btn btn-primary">
            Back to Messages
          </Link>
        </div>
      </div>
    );
  }

  const otherUser = conversation.other_user || {};
  const currentUserId = localStorage.getItem('userId');

  return (
    <div className="container py-4" style={{ maxWidth: '900px' }}>
      {/* Header */}
      <div className="mb-3">
        <Link to="/photographer/messages" className="btn btn-link text-decoration-none">
          ← Back to Messages
        </Link>
      </div>

      {/* Chat Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0b5d53 0%, #1aa174 100%)',
        color: 'white',
        padding: '1rem',
        borderRadius: '10px 10px 0 0'
      }}>
        <h5 className="mb-0">
          {otherUser.name || 'Client'}
        </h5>
        <small className="text-white-50">
          {conversation.conversation_type} • {conversation.inquiry_messages_sent || 0}/{conversation.inquiry_message_limit || 15} messages
        </small>
      </div>

      {/* Messages Area */}
      <div style={{
        background: '#e5ddd5',
        backgroundImage: 'radial-gradient(circle, #ffffff15 1px, transparent 1px)',
        backgroundSize: '20px 20px',
        minHeight: '500px',
        maxHeight: '60vh',
        overflowY: 'auto',
        padding: '1.5rem'
      }}>
        {messages.length === 0 ? (
          <div className="text-center text-muted py-5">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isCurrentUser = msg.sender_id === currentUserId;
            return (
              <div key={msg.id || idx} className={`mb-2 d-flex ${isCurrentUser ? 'justify-content-end' : 'justify-content-start'}`}>
                <div style={{
                  maxWidth: '70%',
                  background: isCurrentUser ? '#d9fdd3' : 'white',
                  padding: '0.75rem 1rem',
                  borderRadius: '10px',
                  boxShadow: '0 1px 1px rgba(0,0,0,0.1)',
                  position: 'relative'
                }}>
                  {/* Bubble tail */}
                  <div style={{
                    position: 'absolute',
                    bottom: '0',
                    [isCurrentUser ? 'right' : 'left']: '-8px',
                    width: '0',
                    height: '0',
                    borderStyle: 'solid',
                    borderWidth: isCurrentUser ? '0 0 20px 10px' : '0 10px 20px 0',
                    borderColor: isCurrentUser 
                      ? 'transparent transparent #d9fdd3 transparent'
                      : 'transparent white transparent transparent'
                  }} />
                  
                  <div>{msg.content}</div>
                  <div className="text-end" style={{ fontSize: '0.7rem', color: '#667781', marginTop: '0.25rem' }}>
                    {formatTime(msg.created_at)}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={sendMessage} style={{
        background: '#f0f0f0',
        padding: '0.75rem',
        borderRadius: '0 0 10px 10px',
        display: 'flex',
        gap: '0.5rem'
      }}>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="form-control"
          disabled={sending}
          style={{
            border: 'none',
            borderRadius: '20px',
            padding: '0.5rem 1rem'
          }}
        />
        <button 
          type="submit" 
          className="btn"
          disabled={sending || !newMessage.trim()}
          style={{
            background: '#0b5d53',
            color: 'white',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            padding: 0
          }}
        >
          {sending ? '⋯' : '➤'}
        </button>
      </form>
    </div>
  );
};

export default PhotographerChat;
