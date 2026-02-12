import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useGlobalWebSocket } from '../context/GlobalWebSocketContext';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

/**
 * NotificationDropdown Component
 * Shows all notifications including messages, payment/booking notifications in navbar
 * Real-time updates via GlobalWebSocket
 */
const NotificationDropdown = () => {
  const { getToken, user } = useAuth();
  const { unreadCount, setUnreadCount, addNotificationListener } = useGlobalWebSocket();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  // Load initial notifications
  useEffect(() => {
    if (user?.id) {
      loadNotifications();
    }
  }, [user?.id]);

  // Subscribe to WebSocket notifications
  useEffect(() => {
    if (user?.id) {
      const unsubscribe = addNotificationListener((event) => {
        console.log('🔔 Notification received:', event.type);
        
        // Reload notifications when new one arrives
        if (event.type === 'new_message' || event.type === 'notification') {
          loadNotifications();
        }
      });

      return unsubscribe;
    }
  }, [user?.id]);

  useEffect(() => {
    // Close dropdown when clicking outside
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadNotifications = async () => {
    if (!user?.id) return;

    try {
      const token = await getToken();
      if (!token) {
        console.warn('No auth token available for notifications');
        return;
      }
      
      const res = await fetch(`${API_BASE}/api/notifications/?limit=20`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setNotifications(data.data || []);
      } else {
        console.error('Failed to load notifications:', data.error);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      const token = await getToken();
      if (!token) return;
      
      await fetch(`${API_BASE}/api/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Update local state
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      
      // Decrement unread count
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    if (!user?.id || unreadCount === 0) return;
    try {
      const token = await getToken();
      if (!token) return;
      
      await fetch(`${API_BASE}/api/notifications/mark-all-read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Update local state
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      
      // Reset unread count
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  };

  const handleNotificationClick = async (notification) => {
    // Mark as read first
    if (!notification.read) {
      await markAsRead(notification.id);
    }
    
    // Navigate to link if exists
    if (notification.link) {
      navigate(notification.link);
    }
    
    setIsOpen(false);
  };

  const handleToggle = () => {
    const newIsOpen = !isOpen;
    setIsOpen(newIsOpen);
  };

  const getNotificationIcon = (type) => {
    const icons = {
      message: '💬',
      payment_received: '💳',
      payment_held: '🔒',
      payment_released: '💰',
      payment_refunded: '↩️',
      booking_confirmed: '✅',
      booking_cancelled: '❌',
      booking_completed: '🎉',
      booking: '📅',
      dispute_opened: '⚠️',
      dispute_resolved: '✔️',
      system: '🔔',
      payment: '💳',
      payout: '💸',
      review: '⭐'
    };
    return icons[type] || '🔔';
  };

  const formatTime = (isoString) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (!user?.id) return null;

  return (
    <div className="notification-dropdown position-relative" ref={dropdownRef}>
      <button
        className="btn btn-link text-dark position-relative p-2"
        onClick={handleToggle}
        style={{ textDecoration: 'none' }}
        title="Notifications"
      >
        🔔
        {unreadCount > 0 && (
          <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className="dropdown-menu show shadow-lg"
          style={{
            position: 'absolute',
            right: 0,
            top: '100%',
            width: '350px',
            maxHeight: '400px',
            overflowY: 'auto',
            zIndex: 1050
          }}
        >
          <div className="dropdown-header d-flex justify-content-between align-items-center">
            <strong>Notifications</strong>
            <div className="d-flex gap-2 align-items-center">
              {unreadCount > 0 && (
                <>
                  <span className="badge bg-primary">{unreadCount} new</span>
                  <button 
                    className="btn btn-link btn-sm p-0 text-decoration-none"
                    onClick={markAllAsRead}
                    style={{ fontSize: '0.75rem' }}
                  >
                    Mark all read
                  </button>
                </>
              )}
            </div>
          </div>
          <div className="dropdown-divider m-0"></div>

          {loading ? (
            <div className="text-center py-3">
              <div className="spinner-border spinner-border-sm text-primary"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-4 text-muted">
              <div style={{ fontSize: '2rem' }}>🔔</div>
              <p className="mb-0 small">No notifications yet</p>
            </div>
          ) : (
            <div>
              {notifications.slice(0, 10).map(notif => (
                <div
                  key={notif.id}
                  className={`dropdown-item py-2 px-3 ${!notif.read ? 'bg-light' : ''}`}
                  style={{ cursor: 'pointer', whiteSpace: 'normal' }}
                  onClick={() => handleNotificationClick(notif)}
                >
                  <div className="d-flex gap-2">
                    <span style={{ fontSize: '1.2rem' }}>
                      {getNotificationIcon(notif.type)}
                    </span>
                    <div className="flex-grow-1">
                      <div className="d-flex justify-content-between align-items-start">
                        <strong className="small">{notif.title}</strong>
                        <small className="text-muted">{formatTime(notif.created_at)}</small>
                      </div>
                      <p className="mb-0 small text-muted" style={{ lineHeight: 1.3 }}>
                        {notif.message.length > 80
                          ? notif.message.substring(0, 80) + '...'
                          : notif.message}
                      </p>
                      {notif.amount && (
                        <small className="text-primary fw-bold">
                          Rs. {notif.amount.toLocaleString()}
                        </small>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {notifications.length > 10 && (
                <div className="dropdown-item text-center text-primary small">
                  View all {notifications.length} notifications
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;
