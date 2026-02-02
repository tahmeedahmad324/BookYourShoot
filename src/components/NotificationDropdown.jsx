import React, { useState, useEffect, useRef } from 'react';

const API_BASE = 'http://localhost:5000/api';

/**
 * NotificationDropdown Component
 * Shows payment/booking notifications in navbar
 */
const NotificationDropdown = ({ userId }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (userId) {
      loadNotifications();
      // Poll every 30 seconds
      const interval = setInterval(loadNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [userId]);

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
    if (!userId) return;
    
    try {
      const res = await fetch(`${API_BASE}/payments/notifications/${userId}`);
      const data = await res.json();
      if (data.status === 'success') {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unread_count || 0);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await fetch(`${API_BASE}/payments/notifications/${notificationId}/read`, {
        method: 'POST'
      });
      loadNotifications();
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    if (!userId || unreadCount === 0) return;
    try {
      await fetch(`${API_BASE}/payments/notifications/${userId}/read-all`, {
        method: 'POST'
      });
      loadNotifications();
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  };

  const handleToggle = () => {
    const newIsOpen = !isOpen;
    setIsOpen(newIsOpen);
    // Mark all as read when opening the dropdown
    if (newIsOpen && unreadCount > 0) {
      markAllAsRead();
    }
  };

  const getNotificationIcon = (type) => {
    const icons = {
      payment_received: '💳',
      payment_held: '🔒',
      payment_released: '💰',
      payment_refunded: '↩️',
      booking_confirmed: '✅',
      booking_cancelled: '❌',
      booking_completed: '🎉',
      dispute_opened: '⚠️',
      dispute_resolved: '✔️'
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

  if (!userId) return null;

  return (
    <div className="notification-dropdown position-relative" ref={dropdownRef}>
      <button
        className="btn btn-link text-dark position-relative p-2"
        onClick={handleToggle}
        style={{ textDecoration: 'none' }}
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
            {unreadCount > 0 && (
              <span className="badge bg-primary">{unreadCount} new</span>
            )}
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
                  onClick={() => markAsRead(notif.id)}
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
