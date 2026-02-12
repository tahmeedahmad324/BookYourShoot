import { useEffect, useRef, useState, useCallback } from 'react';

// Key for localStorage persistence
const ONLINE_USERS_KEY = 'chat_online_users';
const ONLINE_STATUS_EXPIRY = 5 * 60 * 1000; // 5 minutes

/**
 * WebSocket Hook for Real-Time Chat
 * Handles connection, reconnection, and message streaming
 */
export const useWebSocketChat = (token, userId) => {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState({});
  
  // Initialize online users from localStorage
  const getInitialOnlineUsers = () => {
    try {
      const stored = localStorage.getItem(ONLINE_USERS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const now = Date.now();
        // Filter out expired entries
        const valid = parsed.filter(entry => (now - entry.timestamp) < ONLINE_STATUS_EXPIRY);
        return new Set(valid.map(entry => entry.userId));
      }
    } catch (err) {
      console.error('Error loading online users from localStorage:', err);
    }
    return new Set();
  };
  
  const [onlineUsers, setOnlineUsers] = useState(getInitialOnlineUsers);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  
  // Persist online users to localStorage whenever they change
  useEffect(() => {
    try {
      const data = Array.from(onlineUsers).map(userId => ({
        userId,
        timestamp: Date.now()
      }));
      localStorage.setItem(ONLINE_USERS_KEY, JSON.stringify(data));
    } catch (err) {
      console.error('Error saving online users to localStorage:', err);
    }
  }, [onlineUsers]);

  const connect = useCallback(() => {
    if (!token || !userId) return;

    try {
      const wsUrl = `ws://localhost:8000/ws/chat?token=${token}`;
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('✅ WebSocket connected');
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
        
        // Join user's conversations
        ws.send(JSON.stringify({
          type: 'join_conversations',
          user_id: userId
        }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          switch (data.type) {
            case 'new_message':
              // Handle new message from server (with inquiry status update)
              setMessages(prev => [...prev, data.message]);
              
              // Emit inquiry status for conversation list update
              if (data.inquiry_status) {
                window.dispatchEvent(new CustomEvent('inquiry-status-update', {
                  detail: {
                    conversation_id: data.conversation_id,
                    inquiry_status: data.inquiry_status
                  }
                }));
              }
              break;
            
            case 'message':
              // Handle legacy "message" type for backwards compatibility
              if (data.data) {
                setMessages(prev => [...prev, data.data]);
              }
              break;
              
            case 'joined_conversations':
              console.log(`✅ Joined ${data.count} conversations via WebSocket`);
              break;
              
            case 'typing_start':
              setTypingUsers(prev => ({
                ...prev,
                [data.conversation_id]: {
                  user_id: data.user_id,
                  user_name: data.user_name
                }
              }));
              break;
              
            case 'typing_stop':
              setTypingUsers(prev => {
                const next = { ...prev };
                delete next[data.conversation_id];
                return next;
              });
              break;
              
            case 'user_online':
              setOnlineUsers(prev => new Set([...prev, data.user_id]));
              break;
              
            case 'user_offline':
              setOnlineUsers(prev => {
                const next = new Set(prev);
                next.delete(data.user_id);
                return next;
              });
              break;
              
            case 'message_read':
              // Update message read status
              setMessages(prev => prev.map(msg => 
                msg.id === data.message_id 
                  ? { ...msg, is_read: true, read_at: data.read_at }
                  : msg
              ));
              break;
              
            case 'error':
              console.error('WebSocket error:', data.message);
              break;
              
            default:
              console.log('Unknown message type:', data.type);
          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);
        wsRef.current = null;
        
        // Attempt reconnection with exponential backoff
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          console.log(`Reconnecting in ${delay}ms... (attempt ${reconnectAttemptsRef.current + 1})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, delay);
        }
      };

      wsRef.current = ws;
    } catch (err) {
      console.error('WebSocket connection error:', err);
    }
  }, [token, userId]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  const sendMessage = useCallback((conversationId, content, contentType = 'text', attachmentUrls = null) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.error('WebSocket not connected');
      return false;
    }

    const payload = {
      type: 'send_message',
      conversation_id: conversationId,
      content,
      content_type: contentType
    };
    
    // Include attachment URLs if provided
    if (attachmentUrls) {
      payload.attachment_urls = attachmentUrls;
    }

    wsRef.current.send(JSON.stringify(payload));
    
    return true;
  }, []);

  const sendTypingIndicator = useCallback((conversationId, isTyping) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    wsRef.current.send(JSON.stringify({
      type: isTyping ? 'typing_start' : 'typing_stop',
      conversation_id: conversationId
    }));
  }, []);

  const markMessageAsRead = useCallback((messageId) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    wsRef.current.send(JSON.stringify({
      type: 'mark_read',
      message_id: messageId
    }));
  }, []);

  return {
    isConnected,
    messages,
    typingUsers,
    onlineUsers,
    sendMessage,
    sendTypingIndicator,
    markMessageAsRead,
    reconnect: connect
  };
};
