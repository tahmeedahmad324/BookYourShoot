import React from 'react';
import './TypingIndicator.css';

/**
 * TypingIndicator Component
 * Animated dots to show when someone is typing
 */

const TypingIndicator = ({ userName = 'Someone' }) => {
  return (
    <div className="typing-indicator-container mb-3">
      <div
        className="typing-indicator-bubble"
        style={{
          backgroundColor: '#f1f3f4',
          borderRadius: '12px',
          padding: '10px 14px',
          display: 'inline-block',
          boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
        }}
      >
        <div className="typing-indicator">
          <span className="typing-dot"></span>
          <span className="typing-dot"></span>
          <span className="typing-dot"></span>
        </div>
        <div style={{ fontSize: '0.75rem', marginTop: '4px', opacity: 0.7 }}>
          {userName} is typing...
        </div>
      </div>
    </div>
  );
};

export default TypingIndicator;
