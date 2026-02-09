import React, { useState, useEffect, useRef, useCallback } from 'react';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import TypingIndicator from './TypingIndicator';
import useWebSocket from '../../hooks/useWebSocket';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import './ChatWindow.css';

/**
 * ChatWindow - Main chat interface component
 * Combines all chat components into a complete real-time messaging interface
 * 
 * Props:
 * - conversationId: string (required) - The ID of the conversation to display
 * - onConversationUpdated: function (optional) - Callback when conversation type changes
 */
function ChatWindow({ conversationId, onConversationUpdated }) {
  const { user, token } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [conversationInfo, setConversationInfo] = useState(null);
  const [inquiryStatus, setInquiryStatus] = useState(null);
  const [otherParticipants, setOtherParticipants] = useState([]);
  const [typingUsers, setTypingUsers] = useState({});
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const markReadTimeoutRef = useRef(null);

  // WebSocket connection
  const {
    connected,
    sendMessage,
    joinConversation,
    setTyping,
    markAsRead
  } = useWebSocket(token, handleWebSocketMessage);

  /**
   * Handle incoming WebSocket messages
   */
  function handleWebSocketMessage(wsMessage) {
    if (!wsMessage || !wsMessage.type) return;

    switch (wsMessage.type) {
      case 'message':
        handleNewMessage(wsMessage);
        break;
      
      case 'typing':
        handleTypingIndicator(wsMessage.data);
        break;
      
      case 'read':
        handleReadReceipt(wsMessage.data);
        break;
      
      case 'conversation_upgraded':
        // Inquiry was upgraded to CONFIRMED
        handleConversationUpgrade(wsMessage.data);
        break;
      
      case 'error':
        handleWebSocketError(wsMessage);
        break;
      
      default:
        console.log('Unknown WebSocket message type:', wsMessage.type);
    }
  }

  /**
   * Handle new message from WebSocket
   */
  function handleNewMessage(wsMessage) {
    const newMessage = wsMessage.data;
    const temp_id = wsMessage.temp_id;
    
    // Update inquiry status if provided
    if (wsMessage.inquiry_status) {
      setInquiryStatus(wsMessage.inquiry_status);
      
      // Show upgrade prompt if at limit
      if (wsMessage.inquiry_status.is_at_limit) {
        setShowUpgradePrompt(true);
      }
    }

    setMessages(prev => {
      // Replace temp message if this is an optimistic update
      if (temp_id) {
        const existingIndex = prev.findIndex(m => m.temp_id === temp_id);
        if (existingIndex !== -1) {
          const updated = [...prev];
          updated[existingIndex] = { ...newMessage, temp_id };
          return updated;
        }
      }
      
      // Check for duplicates
      const exists = prev.some(m => m.id === newMessage.id);
      if (exists) return prev;
      
      // Add new message
      return [...prev, newMessage];
    });
    
    // Mark as read if user is viewing
    if (markReadTimeoutRef.current) clearTimeout(markReadTimeoutRef.current);
    markReadTimeoutRef.current = setTimeout(() => {
      const unreadMessages = messages.filter(m => 
        m.sender_id !== user?.id && 
        m.status !== 'READ'
      );
      if (unreadMessages.length > 0) {
        markAsRead(conversationId, unreadMessages.map(m => m.id));
      }
    }, 500);
  }

  /**
   * Handle typing indicator updates
   */
  function handleTypingIndicator(data) {
    if (data.conversation_id !== conversationId) return;
    
    setTypingUsers(prev => ({
      ...prev,
      [data.user_id]: {
        is_typing: data.is_typing,
        user_name: data.user_name,
        timestamp: Date.now()
      }
    }));
    
    // Clear typing indicator after 5 seconds
    if (data.is_typing) {
      setTimeout(() => {
        setTypingUsers(prev => {
          const updated = { ...prev };
          if (updated[data.user_id]?.timestamp < Date.now() - 4500) {
            delete updated[data.user_id];
          }
          return updated;
        });
      }, 5000);
    }
  }

  /**
   * Handle read receipts
   */
  function handleReadReceipt(data) {
    if (data.conversation_id !== conversationId) return;
    
    setMessages(prev => prev.map(msg => 
      data.message_ids.includes(msg.id)
        ? { ...msg, status: 'READ' }
        : msg
    ));
  }

  /**
   * Handle conversation upgrade (INQUIRY → CONFIRMED)
   */
  function handleConversationUpgrade(data) {
    if (data.conversation_id !== conversationId) return;
    
    setConversationInfo(prev => ({
      ...prev,
      conversation_type: 'CONFIRMED'
    }));
    setInquiryStatus(null);
    setShowUpgradePrompt(false);
    
    // Notify parent component
    if (onConversationUpdated) {
      onConversationUpdated(data);
    }
    
    // Show success message
    alert('Chat unlocked! All features are now available.');
  }

  /**
   * Handle WebSocket errors
   */
  function handleWebSocketError(wsMessage) {
    if (wsMessage.code === 'FEATURE_RESTRICTED') {
      // Show upgrade prompt for restricted features
      setShowUpgradePrompt(true);
      alert(wsMessage.message + '\nPlease create a booking to unlock all features.');
    } else {
      console.error('WebSocket error:', wsMessage);
      setError(wsMessage.message || 'An error occurred');
    }
  }

  /**
   * Load initial messages and conversation info
   */
  useEffect(() => {
    if (!conversationId || !token) return;

    async function loadChat() {
      try {
        setLoading(true);
        setError(null);

        // Load conversation info
        const infoResponse = await axios.get(
          `http://localhost:8000/api/chat/conversations/${conversationId}/info`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        setConversationInfo(infoResponse.data);
        
        // Calculate inquiry status
        if (infoResponse.data.conversation_type === 'INQUIRY') {
          const limit = infoResponse.data.inquiry_message_limit || 15;
          const sent = infoResponse.data.inquiry_messages_sent || 0;
          const remaining = Math.max(0, limit - sent);
          
          setInquiryStatus({
            messages_remaining: remaining,
            is_at_limit: remaining === 0,
            warning_level: remaining === 0 ? 'critical' : remaining <= 3 ? 'warning' : remaining <= 5 ? 'low' : null
          });
        }
        
        // Get other participants (for typing indicators)
        const participants = infoResponse.data.participants?.filter(p => p.user_id !== user?.id) || [];
        setOtherParticipants(participants);

        // Load messages
        const messagesResponse = await axios.get(
          `http://localhost:8000/api/chat/conversations/${conversationId}/messages`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        setMessages(messagesResponse.data.messages || []);

      } catch (err) {
        console.error('Failed to load chat:', err);
        setError(err.response?.data?.detail || 'Failed to load chat');
      } finally {
        setLoading(false);
      }
    }

    loadChat();
  }, [conversationId, token, user?.id]);

  /**
   * Join WebSocket conversation when connected
   */
  useEffect(() => {
    if (connected && conversationId) {
      joinConversation(conversationId);
    }
  }, [connected, conversationId, joinConversation]);

  /**
   * Auto-scroll to bottom when new messages arrive
   */
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  /**
   * Send a new message
   */
  const handleSendMessage = useCallback((content, contentType = 'text', attachmentPath = null) => {
    if (!content?.trim() && !attachmentPath) return;

    // Create temporary ID for optimistic UI
    const temp_id = `temp_${Date.now()}_${Math.random()}`;
    
    // Create optimistic message
    const optimisticMessage = {
      id: temp_id,
      temp_id,
      conversation_id: conversationId,
      sender_id: user.id,
      content,
      content_type: contentType,
      attachment_path: attachmentPath,
      created_at: new Date().toISOString(),
      status: 'SENDING',
      sender: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    };
    
    // Add to UI immediately
    setMessages(prev => [...prev, optimisticMessage]);
    
    // Send via WebSocket
    sendMessage(conversationId, content, contentType, attachmentPath, temp_id);
  }, [conversationId, user, sendMessage]);

  /**
   * Handle typing indicator
   */
  const handleTypingChange = useCallback((isTyping) => {
    setTyping(conversationId, isTyping);
  }, [conversationId, setTyping]);

  /**
   * Render loading state
   */
  if (loading) {
    return (
      <div className="chat-window loading">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  /**
   * Render error state
   */
  if (error) {
    return (
      <div className="chat-window error">
        <div className="alert alert-danger" role="alert">
          <i className="bi bi-exclamation-triangle me-2"></i>
          {error}
        </div>
      </div>
    );
  }

  /**
   * Get active typing users (excluding current user)
   */
  const activeTypingUsers = Object.entries(typingUsers)
    .filter(([userId, data]) => 
      userId !== user?.id && 
      data.is_typing && 
      Date.now() - data.timestamp < 5000
    )
    .map(([, data]) => data.user_name);

  /**
   * Render conversation type badge
   */
  const renderConversationTypeBadge = () => {
    if (!conversationInfo) return null;
    
    const isInquiry = conversationInfo.conversation_type === 'INQUIRY';
    
    return (
      <div className={`conversation-type-badge ${isInquiry ? 'inquiry' : 'confirmed'}`}>
        <i className={`bi ${isInquiry ? 'bi-chat-dots' : 'bi-check-circle-fill'} me-1`}></i>
        {isInquiry ? 'Inquiry Chat' : 'Confirmed Booking'}
      </div>
    );
  };

  /**
   * Render inquiry status bar
   */
  const renderInquiryStatus = () => {
    if (!inquiryStatus || conversationInfo?.conversation_type !== 'INQUIRY') return null;
    
    const { messages_remaining, warning_level } = inquiryStatus;
    
    return (
      <div className={`inquiry-status-bar ${warning_level || ''}`}>
        <div className="inquiry-status-content">
          <span className="inquiry-messages-remaining">
            <i className="bi bi-chat-left-text me-2"></i>
            {messages_remaining} message{messages_remaining !== 1 ? 's' : ''} remaining
          </span>
          {warning_level === 'critical' && (
            <span className="inquiry-warning">
              <i className="bi bi-exclamation-triangle me-1"></i>
              Last message! Create a booking to continue chatting.
            </span>
          )}
          {warning_level === 'warning' && (
            <span className="inquiry-warning">
              Running low on messages. Consider booking soon!
            </span>
          )}
        </div>
      </div>
    );
  };

  /**
   * Render upgrade prompt
   */
  const renderUpgradePrompt = () => {
    if (!showUpgradePrompt || conversationInfo?.conversation_type !== 'INQUIRY') return null;
    
    return (
      <div className="upgrade-prompt-overlay">
        <div className="upgrade-prompt-card">
          <button 
            className="btn-close upgrade-prompt-close" 
            onClick={() => setShowUpgradePrompt(false)}
          ></button>
          <div className="upgrade-prompt-icon">
            <i className="bi bi-lock-fill"></i>
          </div>
          <h4>Unlock Full Chat</h4>
          <p>You've reached the message limit for inquiry chats. Create a booking to:</p>
          <ul className="upgrade-benefits">
            <li><i className="bi bi-check-circle-fill text-success"></i> Send unlimited messages</li>
            <li><i className="bi bi-check-circle-fill text-success"></i> Share photos and files</li>
            <li><i className="bi bi-check-circle-fill text-success"></i> Enable voice calls (coming soon)</li>
          </ul>
          <button className="btn btn-primary btn-lg w-100">
            <i className="bi bi-calendar-check me-2"></i>
            Create Booking
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="chat-window">
      {/* Header */}
      <div className="chat-header">
        <div className="chat-header-info">
          <h5 className="chat-title mb-0">
            {conversationInfo?.title || 'Chat'}
          </h5>
          {renderConversationTypeBadge()}
        </div>
        <div className="chat-header-status">
          {connected ? (
            <span className="status-indicator online">
              <i className="bi bi-circle-fill"></i> Online
            </span>
          ) : (
            <span className="status-indicator offline">
              <i className="bi bi-circle"></i> Connecting...
            </span>
          )}
        </div>
      </div>

      {/* Inquiry Status Bar */}
      {renderInquiryStatus()}

      {/* Messages */}
      <div className="chat-messages" ref={messagesContainerRef}>
        {messages.length === 0 ? (
          <div className="chat-empty-state">
            <i className="bi bi-chat-square-text display-4 text-muted mb-3"></i>
            <p className="text-muted">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          <>
            {messages.map((message, index) => (
              <MessageBubble
                key={message.id || message.temp_id || index}
                message={message}
                isOwn={message.sender_id === user?.id}
              />
            ))}
            
            {/* Typing indicator */}
            {activeTypingUsers.length > 0 && (
              <TypingIndicator users={activeTypingUsers} />
            )}
            
            {/* Auto-scroll anchor */}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <MessageInput
        conversationId={conversationId}
        onSend={handleSendMessage}
        onTyping={handleTypingChange}
        disabled={!connected}
        conversationType={conversationInfo?.conversation_type}
      />

      {/* Upgrade Prompt Modal */}
      {renderUpgradePrompt()}
    </div>
  );
}

export default ChatWindow;
