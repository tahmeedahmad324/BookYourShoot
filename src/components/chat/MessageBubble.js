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
