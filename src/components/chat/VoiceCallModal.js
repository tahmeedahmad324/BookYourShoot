import React, { useState, useEffect, useCallback } from 'react';
import { Phone, PhoneOff, PhoneIncoming, Mic, MicOff, X } from 'lucide-react';
import voiceChatService, { VoiceChatService } from '../../services/voiceChatService';
import './VoiceCallModal.css';

/**
 * Voice Call Modal Component
 * Displays call UI for outgoing, incoming, and active calls
 */
const VoiceCallModal = ({ 
  isOpen, 
  onClose, 
  conversationId, 
  remoteUserId, 
  remoteUserName,
  currentUserId,
  currentUserName,
  token 
}) => {
  const [callState, setCallState] = useState('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [incomingCallInfo, setIncomingCallInfo] = useState(null);
  const [currentMic, setCurrentMic] = useState('');

  // Initialize voice service
  useEffect(() => {
    if (token && currentUserId) {
      voiceChatService.initSignaling(token, currentUserId);
      
      voiceChatService.onStateChange = (newState) => {
        setCallState(newState);
        
        if (newState === 'ringing') {
          voiceChatService.playRingtone();
          setIncomingCallInfo(voiceChatService.getPendingCallInfo());
        }
        
        if (newState === 'idle' || newState === 'ended') {
          setCallDuration(0);
          setIsMuted(false);
        }
      };
      
      voiceChatService.onCallDurationUpdate = (duration) => {
        setCallDuration(duration);
      };
    }
    
    return () => {
      voiceChatService.disconnect();
    };
  }, [token, currentUserId]);

  // Start outgoing call
  const startCall = useCallback(async () => {
    try {
      await voiceChatService.startCall(conversationId, remoteUserId, currentUserName);
      // Get mic info after call starts
      const micInfo = voiceChatService.getCurrentMicrophone();
      setCurrentMic(micInfo.label || 'Default microphone');
    } catch (error) {
      console.error('Failed to start call:', error);
      alert('Failed to start call. Please check microphone permissions.');
    }
  }, [conversationId, remoteUserId, currentUserName]);

  // Accept incoming call
  const acceptCall = useCallback(async () => {
    try {
      await voiceChatService.acceptCall();
      // Get mic info after accepting
      const micInfo = voiceChatService.getCurrentMicrophone();
      setCurrentMic(micInfo.label || 'Default microphone');
    } catch (error) {
      console.error('Failed to accept call:', error);
    }
  }, []);

  // Reject incoming call
  const rejectCall = useCallback(() => {
    voiceChatService.rejectCall();
    setIncomingCallInfo(null);
  }, []);

  // End current call
  const endCall = useCallback(() => {
    voiceChatService.endCall();
    onClose();
  }, [onClose]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    const muted = voiceChatService.toggleMute();
    setIsMuted(muted);
  }, []);

  // Close modal and cleanup
  const handleClose = useCallback(() => {
    if (callState !== 'idle' && callState !== 'ended') {
      voiceChatService.endCall();
    }
    onClose();
  }, [callState, onClose]);

  // Auto-start call when modal opens for outgoing
  useEffect(() => {
    if (isOpen && callState === 'idle' && remoteUserId) {
      startCall();
    }
  }, [isOpen, callState, remoteUserId, startCall]);

  // Show modal if: explicitly opened OR in an active call state
  const isActiveCall = ['ringing', 'calling', 'connected'].includes(callState);
  if (!isOpen && !isActiveCall) return null;

  // Incoming call UI
  if (callState === 'ringing' && incomingCallInfo) {
    return (
      <div className="voice-call-overlay">
        <div className="voice-call-modal incoming">
          <div className="call-avatar incoming-pulse">
            <PhoneIncoming size={48} />
          </div>
          
          <h3 className="caller-name">{incomingCallInfo.callerName || 'Unknown'}</h3>
          <p className="call-status">Incoming voice call...</p>
          
          <div className="call-actions">
            <button className="call-btn reject" onClick={rejectCall} title="Decline">
              <PhoneOff size={24} />
            </button>
            <button className="call-btn accept" onClick={acceptCall} title="Accept">
              <Phone size={24} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Active/Outgoing call UI
  // For connected calls that started as incoming, use the caller name from incomingCallInfo
  const displayName = remoteUserName || incomingCallInfo?.callerName || 'Unknown';
  
  return (
    <div className="voice-call-overlay">
      <div className="voice-call-modal">
        <button className="close-btn" onClick={handleClose}>
          <X size={20} />
        </button>
        
        <div className={`call-avatar ${callState === 'calling' ? 'calling-pulse' : ''} ${callState === 'connected' ? 'connected-glow' : ''}`}>
          <Phone size={40} />
        </div>
        
        <h3 className="caller-name">{displayName}</h3>
        
        <p className="call-status">
          {callState === 'calling' && 'Calling...'}
          {callState === 'connected' && VoiceChatService.formatDuration(callDuration)}
          {callState === 'ended' && 'Call ended'}
          {callState === 'idle' && 'Ready to call'}
        </p>
        
        {currentMic && (callState === 'calling' || callState === 'connected') && (
          <p className="mic-info" style={{ 
            fontSize: '0.75rem', 
            color: 'rgba(255, 255, 255, 0.6)', 
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}>
            <Mic size={14} />
            {currentMic}
          </p>
        )}
        
        {callState === 'connected' && (
          <div className="call-controls">
            <button 
              className={`control-btn ${isMuted ? 'active' : ''}`} 
              onClick={toggleMute}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
            </button>
          </div>
        )}
        
        <div className="call-actions">
          <button className="call-btn end" onClick={endCall} title="End Call">
            <PhoneOff size={24} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default VoiceCallModal;
