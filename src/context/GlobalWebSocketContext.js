import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';

/**
 * Global WebSocket Context for Real-Time Notifications
 * Stays connected across all pages to receive:
 * - New message notifications
 * - Booking updates
 * - Payment notifications
 * - System alerts
 */

const GlobalWebSocketContext = createContext(null);

export const useGlobalWebSocket = () => {
  const context = useContext(GlobalWebSocketContext);
  if (!context) {
    throw new Error('useGlobalWebSocket must be used within GlobalWebSocketProvider');
  }
  return context;
};

export const GlobalWebSocketProvider = ({ children }) => {
  const { getToken, userId, userRole } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  // Notification event listeners
  const notificationListenersRef = useRef(new Set());

  const addNotificationListener = (callback) => {
    notificationListenersRef.current.add(callback);
    return () => notificationListenersRef.current.delete(callback);
  };

  const connect = async () => {
    if (!userId) {
      console.log('⏸️  GlobalWebSocket: No userId, skipping connection');
      return;
    }

    const token = await getToken();
    if (!token) {
      console.log('⏸️  GlobalWebSocket: No auth token, skipping connection');
      return;
    }

    // Don't reconnect if already connected
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('✅ GlobalWebSocket already connected');
      return;
    }

    try {
      const wsUrl = `ws://localhost:8000/ws/chat?token=${token}`;
      console.log('🔌 GlobalWebSocket connecting with token:', token.substring(0, 20) + '...');
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('✅ GlobalWebSocket connected globally');
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;

        // Join user's conversations for notifications
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
              // Notify listeners (e.g., ChatContainer to refresh conversations)
              console.log('🔔 GlobalWebSocket received new_message');
              
              // Don't increment unread count here - wait for notification event
              // (backend creates both new_message and notification events)
              
              // Notify all listeners
              notificationListenersRef.current.forEach(callback => {
                callback({
                  type: 'new_message',
                  data: data.message,
                  conversation_id: data.conversation_id
                });
              });
              break;

            case 'notification':
              // System notification from backend
              console.log('🔔 GlobalWebSocket received notification:', data.notification);
              setNotifications(prev => [data.notification, ...prev]);
              
              // Increment unread count ONLY for notifications
              setUnreadCount(prev => prev + 1);
              
              notificationListenersRef.current.forEach(callback => {
                callback({
                  type: 'notification',
                  data: data.notification
                });
              });
              break;

            case 'notification_read':
              // Mark notification as read
              setNotifications(prev =>
                prev.map(n => n.id === data.notification_id ? { ...n, read: true } : n)
              );
              setUnreadCount(prev => Math.max(0, prev - 1));
              break;

            case 'joined_conversations':
              console.log(`✅ GlobalWebSocket joined ${data.count} conversations`);
              break;

            default:
              // Other message types handled by specific components
              break;
          }
        } catch (err) {
          console.error('❌ GlobalWebSocket message parse error:', err);
        }
      };

      ws.onerror = (error) => {
        console.error('❌ GlobalWebSocket error:', error);
      };

      ws.onclose = () => {
        console.log('🔌 GlobalWebSocket disconnected');
        setIsConnected(false);
        wsRef.current = null;

        // Auto-reconnect with exponential backoff
        if (reconnectAttemptsRef.current < maxReconnectAttempts && userId) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          console.log(`⏳ GlobalWebSocket reconnecting in ${delay}ms...`);
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current += 1;
            connect();
          }, delay);
        } else {
          console.log('❌ GlobalWebSocket max reconnect attempts reached');
        }
      };

      wsRef.current = ws;
    } catch (err) {
      console.error('❌ GlobalWebSocket connection error:', err);
    }
  };

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      console.log('🔌 GlobalWebSocket disconnecting...');
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  };

  // Connect on mount if userId available
  useEffect(() => {
    if (userId && userRole) {
      console.log('🚀 GlobalWebSocket initializing for user:', userId);
      (async () => {
        await connect();
      })();
    }

    return () => {
      disconnect();
    };
  }, [userId, userRole]);

  // Refresh unread count on mount
  useEffect(() => {
    const loadUnreadCount = async () => {
      const token = await getToken();
      if (!token || !userId) return;

      try {
        const response = await fetch('http://localhost:8000/api/notifications/unread-count', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setUnreadCount(data.count || 0);
        }
      } catch (err) {
        console.error('Failed to load unread count:', err);
      }
    };

    if (userId) {
      loadUnreadCount();
    }
  }, [userId]);

  const value = {
    isConnected,
    notifications,
    unreadCount,
    setUnreadCount,
    addNotificationListener,
    connect,
    disconnect
  };

  return (
    <GlobalWebSocketContext.Provider value={value}>
      {children}
    </GlobalWebSocketContext.Provider>
  );
};
