import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ChatBadge = () => {
    const { user, isAuthenticated } = useAuth();
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        if (!isAuthenticated) return;

        const fetchUnreadCount = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) return;

                const response = await fetch('http://localhost:8000/api/chat/conversations', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await response.json();

                if (data.success && data.data) {
                    const total = data.data.reduce((sum, conv) => sum + (conv.unread_count || 0), 0);
                    setUnreadCount(total);
                }
            } catch (err) {
                // Silently fail — badge just won't show
                console.debug('ChatBadge: could not fetch unread count');
            }
        };

        fetchUnreadCount();
        // Poll every 30 seconds
        const interval = setInterval(fetchUnreadCount, 30000);
        return () => clearInterval(interval);
    }, [isAuthenticated]);

    if (!isAuthenticated) return null;

    const chatPath = user?.role === 'photographer' ? '/photographer/chat' : '/client/chat';

    return (
        <Link
            to={chatPath}
            className="btn btn-link position-relative p-1 text-dark text-decoration-none"
            title="Messages"
            style={{ fontSize: '1.3rem' }}
        >
            💬
            {unreadCount > 0 && (
                <span
                    className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger"
                    style={{ fontSize: '0.65rem', minWidth: '18px' }}
                >
                    {unreadCount > 99 ? '99+' : unreadCount}
                </span>
            )}
        </Link>
    );
};

export default ChatBadge;
