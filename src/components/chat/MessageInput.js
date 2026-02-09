import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

/**
 * MessageInput Component  
 * Text input with file attachment support and emoji
 */

const MessageInput = ({ conversationId, onSendMessage, onTypingChange, disabled = false }) => {
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const { token } = useAuth();

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

  // Handle typing indicator
  const handleTyping = () => {
    if (onTypingChange) {
      onTypingChange(true);
      
      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Set new timeout to stop typing after 3 seconds
      typingTimeoutRef.current = setTimeout(() => {
        onTypingChange(false);
      }, 3000);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!message.trim() || disabled || uploading) return;
    
    onSendMessage(message.trim(), 'text');
    setMessage('');
    
    // Stop typing indicator
    if (onTypingChange) {
      onTypingChange(false);
    }
    
    // Clear timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Focus back on input
    inputRef.current?.focus();
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file size (max 25MB)
    const maxSize = 25 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('File too large. Maximum size is 25MB.');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // Step 1: Initialize upload
      const initResp = await axios.post(
        `${API_URL}/api/chat/attachments/init`,
        {
          conversation_id: conversationId,
          filename: file.name,
          content_type: file.type,
          file_size: file.size
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const { object_key, bucket } = initResp.data.data;

      // Step 2: Upload file to Supabase Storage
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.REACT_APP_SUPABASE_URL,
        process.env.REACT_APP_SUPABASE_ANON_KEY
      );

      const { error: uploadError } = await supabase.storage
        .from(bucket || 'chat-attachments')
        .upload(object_key, file, {
          cacheControl: '3600',
          upsert: false,
          onUploadProgress: (progress) => {
            const percent = (progress.loaded / progress.total) * 100;
            setUploadProgress(Math.round(percent));
          }
        });

      if (uploadError) throw uploadError;

      // Step 3: Send message with attachment
      const contentType = file.type.startsWith('image/') ? 'image' :
                         file.type.startsWith('audio/') ? 'audio' : 'file';

      onSendMessage(
        message.trim() || `Sent ${contentType}`,
        contentType,
        object_key,
        file.name,
        file.size
      );

      setMessage('');
      setUploadProgress(0);
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload file. Please try again.');
    } finally {
      setUploading(false);
      e.target.value = ''; // Reset file input
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="message-input-container">
      {uploading && (
        <div className="upload-progress mb-2">
          <div className="progress" style={{ height: '6px' }}>
            <div
              className="progress-bar progress-bar-striped progress-bar-animated"
              role="progressbar"
              style={{ width: `${uploadProgress}%` }}
              aria-valuenow={uploadProgress}
              aria-valuemin="0"
              aria-valuemax="100"
            />
          </div>
          <small className="text-muted">Uploading... {uploadProgress}%</small>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="message-input-form">
        <button
          type="button"
          className="message-icon-btn"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || uploading}
          title="Attach file"
        >
          📎
        </button>

        <textarea
          ref={inputRef}
          className="message-textarea"
          placeholder={disabled ? 'Cannot send messages' : 'Type a message...'}
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            handleTyping();
          }}
          onKeyDown={handleKeyPress}
          disabled={disabled || uploading}
          rows={1}
        />

        <button
          type="submit"
          className="message-send-btn"
          disabled={disabled || uploading || !message.trim()}
        >
          Send
        </button>
            minHeight: '40px',
            maxHeight: '120px',
            overflow: 'auto'
          }}
        />
        
        <button
          type="submit"
          className="btn btn-primary"
          disabled={!message.trim() || disabled || uploading}
        >
          {uploading ? '⏳' : '➤'}
        </button>
      </form>
      
      <div className="text-muted small mt-1" style={{ fontSize: '0.75rem' }}>
        Press Enter to send, Shift+Enter for new line
      </div>
    </div>
  );
};

export default MessageInput;
