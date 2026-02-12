import React from 'react';
import { formatDistanceToNow } from 'date-fns';

/**
 * MessageBubble Component
 * Displays individual chat message with sender info, timestamp, and read status
 */

const MessageBubble = ({ message, isOwnMessage, showSender = false, onImageClick }) => {
  const {
    content,
    content_type,
    attachment_path,
    attachment_filename,
    created_at,
    status,
    sender
  } = message;

  const formatTime = (timestamp) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
      return new Date(timestamp).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  const getStatusIcon = () => {
    if (!isOwnMessage) return null;
    
    switch (status) {
      case 'SENT':
        return <span className="text-muted ms-1" title="Sent">✓</span>;
      case 'DELIVERED':
        return <span className="text-muted ms-1" title="Delivered">✓✓</span>;
      case 'READ':
        return <span className="text-primary ms-1" title="Read">✓✓</span>;
      default:
        return null;
    }
  };

  const renderContent = () => {
    // Check if this is a voice call message (starts with phone emoji)
    if (content && content.startsWith('📞')) {
      // Voice call log message
      const getCallStyle = () => {
        if (content.includes('declined') || content.includes('Missed')) {
          return { color: '#dc3545', icon: '📞❌' };
        } else if (content.includes('ended') || content.includes('•')) {
          return { color: '#28a745', icon: '📞✓' };
        } else if (content.includes('started') || content.includes('Ringing')) {
          return { color: '#0d6efd', icon: '📞⏳' };
        } else if (content.includes('progress')) {
          return { color: '#20c997', icon: '📞🔊' };
        } else {
          return { color: '#6c757d', icon: '📞' };
        }
      };
      
      const callStyle = getCallStyle();
      
      return (
        <div className="voice-call-log" style={{ 
          padding: '8px 12px', 
          background: isOwnMessage ? 'rgba(13, 110, 253, 0.1)' : 'rgba(108, 117, 125, 0.1)',
          borderRadius: '8px',
          borderLeft: `3px solid ${callStyle.color}`
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: callStyle.color, fontWeight: '500' }}>
            <span style={{ fontSize: '1.2em' }}>{callStyle.icon}</span>
            <span>{content}</span>
          </div>
        </div>
      );
    }
    
    switch (content_type) {
      case 'image':
        return (
          <div>
            {content && <p className="mb-2">{content}</p>}
            <img
              src={`${process.env.REACT_APP_SUPABASE_URL}/storage/v1/object/public/chat-attachments/${attachment_path}`}
              alt={attachment_filename || 'Image'}
              className="message-attachment-image"
              onClick={() => onImageClick && onImageClick(attachment_path)}
            />
          </div>
        );
      
      case 'audio':
        return (
          <div>
            {content && <p className="mb-2">{content}</p>}
            <audio controls className="message-attachment-audio">
              <source
                src={`${process.env.REACT_APP_SUPABASE_URL}/storage/v1/object/public/chat-attachments/${attachment_path}`}
                type="audio/mpeg"
              />
              Your browser does not support audio playback.
            </audio>
          </div>
        );
      
      case 'file':
        return (
          <div>
            {content && <p className="mb-2">{content}</p>}
            <a
              href={`${process.env.REACT_APP_SUPABASE_URL}/storage/v1/object/public/chat-attachments/${attachment_path}`}
              download={attachment_filename}
              className="message-attachment-file"
            >
              📎 {attachment_filename || 'Download File'}
            </a>
          </div>
        );
      
      default:
        return <p className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>{content}</p>;
    }
  };

  return (
    <div className={`message-row ${isOwnMessage ? 'is-own' : 'is-other'}`}>
      <div className={`message-bubble ${isOwnMessage ? 'own-message' : 'other-message'}`}>
        {showSender && !isOwnMessage && sender && (
          <div className="message-sender">
            {sender.full_name || sender.email}
          </div>
        )}

        <div className="message-content">
          {renderContent()}
        </div>

        <div className="message-meta">
          <span className="message-time">{formatTime(created_at)}</span>
          {getStatusIcon()}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
