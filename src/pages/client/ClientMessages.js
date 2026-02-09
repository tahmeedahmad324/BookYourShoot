import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { MessageSquare, User, Clock, ArrowRight } from 'lucide-react';
import axios from 'axios';

const ClientMessages = () => {
  const { user, getToken } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check if user is authenticated
    if (!user) {
      navigate('/login');
      return;
    }
    fetchConversations();
  }, [user, navigate]);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      
      // Get token from AuthContext (works for both real and mock auth)
      let authToken;
      try {
        authToken = await getToken();
      } catch (e) {
        console.log('getToken failed, trying localStorage...');
      }
      
      // Fallback to localStorage for mock tokens
      if (!authToken) {
        authToken = localStorage.getItem('token');
      }
      
      if (!authToken) {
        setError('Please login to view your messages');
        setLoading(false);
        setTimeout(() => navigate('/login'), 2000);
        return;
      }
      
      const response = await axios.get('http://localhost:8000/api/chat/conversations', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      setConversations(response.data.data || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching conversations:', err);
      
      if (err.response?.status === 401) {
        setError('Session expired. Please login again.');
        setTimeout(() => navigate('/login'), 2000);
      } else {
        setError('Failed to load conversations. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return 'Just now';
    
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch (e) {
      return 'Just now';
    }
  };

  const getPhotographerName = (conversation) => {
    const photographer = conversation.other_user;
    return photographer?.name || conversation.participants?.find(p => p.role === 'PHOTOGRAPHER')?.name || 'Photographer';
  };

  if (loading) {
    return (
      <div className="container py-5">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3 text-muted">Loading your conversations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4">
      {/* Header */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="d-flex align-items-center justify-content-between gradient-header rounded-3 p-4">
            <div>
              <h2 className="fw-bold mb-1">
                <MessageSquare className="me-2" size={28} />
                Messages
              </h2>
              <p className="mb-0 text-muted">Chat with photographers and manage inquiries</p>
            </div>
            <div className="badge bg-primary fs-6 px-3 py-2">
              {conversations.length} Conversation{conversations.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="alert alert-danger" role="alert">
          <strong>Error:</strong> {error}
          <button onClick={fetchConversations} className="btn btn-sm btn-outline-danger ms-3">
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && conversations.length === 0 && !error && (
        <div className="text-center py-5">
          <MessageSquare size={64} className="text-muted mb-3" />
          <h4 className="text-muted">No conversations yet</h4>
          <p className="text-muted mb-4">Start chatting with photographers to see your messages here</p>
          <Link to="/search" className="btn btn-primary">
            Find Photographers
          </Link>
        </div>
      )}

      {/* Conversations List */}
      {conversations.length > 0 && (
        <div className="row">
          <div className="col-lg-8 mx-auto">
            <div className="card border-0 shadow-sm">
              <div className="list-group list-group-flush">
                {conversations.map((conversation) => (
                  <Link
                    key={conversation.id}
                    to={`/client/chat/${conversation.id}`}
                    className="list-group-item list-group-item-action p-3 border-0"
                    style={{ textDecoration: 'none' }}
                  >
                    <div className="d-flex align-items-start">
                      {/* Avatar */}
                      <div className="me-3">
                        <div 
                          className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center"
                          style={{ width: '50px', height: '50px', flexShrink: 0 }}
                        >
                          <User size={24} />
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-grow-1" style={{ minWidth: 0 }}>
                        <div className="d-flex justify-content-between align-items-start mb-1">
                          <h6 className="mb-0 fw-bold">{getPhotographerName(conversation)}</h6>
                          <small className="text-muted ms-2" style={{ whiteSpace: 'nowrap' }}>
                            <Clock size={12} className="me-1" />
                            {formatTime(conversation.last_message?.created_at)}
                          </small>
                        </div>

                        {/* Last Message Preview */}
                        {conversation.last_message && (
                          <p 
                            className="mb-1 text-muted" 
                            style={{ 
                              fontSize: '0.9rem',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {conversation.last_message.content_type === 'text' 
                              ? conversation.last_message.content 
                              : `📎 ${conversation.last_message.content_type}`}
                          </p>
                        )}

                        {/* Conversation Type Badge */}
                        <div className="d-flex align-items-center gap-2">
                          <span 
                            className={`badge ${
                              conversation.conversation_type === 'INQUIRY' 
                                ? 'bg-warning text-dark' 
                                : 'bg-success'
                            }`}
                            style={{ fontSize: '0.75rem' }}
                          >
                            {conversation.conversation_type}
                          </span>
                          
                          {conversation.conversation_type === 'INQUIRY' && (
                            <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                              {conversation.inquiry_messages_sent || 0}/{conversation.inquiry_message_limit || 15} messages
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Arrow Icon */}
                      <div className="ms-2 text-muted">
                        <ArrowRight size={20} />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Help Text */}
            <div className="alert alert-info mt-4" role="alert">
              <strong>💡 Tip:</strong> INQUIRY conversations have a 15-message limit. Create a booking to unlock unlimited messaging and media sharing!
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientMessages;
