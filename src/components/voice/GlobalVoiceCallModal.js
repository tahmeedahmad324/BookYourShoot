import React from 'react';
import { useVoiceCall } from '../../context/VoiceCallContext';
import { Phone, PhoneOff, PhoneIncoming, Mic, MicOff } from 'lucide-react';
import '../chat/VoiceCallModal.css';

const GlobalVoiceCallModal = () => {
  const {
    callState,
    currentCall,
    callDuration,
    isMuted,
    currentMic,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute
  } = useVoiceCall();

  // Don't show modal if no active call
  if (!currentCall && callState === 'idle') {
    return null;
  }

  // Don't show for ended calls after a delay
  const isActiveCall = ['ringing', 'calling', 'connected'].includes(callState);
  if (!isActiveCall && !currentCall) {
    return null;
  }

  // Format call duration
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Get caller/callee info
  const remoteName = currentCall?.remoteName || 'Unknown';
  const remoteAvatar = currentCall?.remoteAvatar;
  const isIncoming = currentCall?.isIncoming;

  // Different rendering for incoming vs active calls
  if (isIncoming && callState === 'ringing') {
    // Incoming call UI with PhoneIncoming icon and incoming-pulse animation
    return (
      <div className="voice-call-modal-overlay">
        <div className="voice-call-modal incoming-call">
          <div className="call-icon incoming-pulse">
            <PhoneIncoming size={48} />
          </div>

          <div className="call-info">
            <div className="call-avatar">
              {remoteAvatar ? (
                <img src={remoteAvatar} alt={remoteName} />
              ) : (
                <div className="avatar-placeholder">
                  {remoteName.charAt(0)}
                </div>
              )}
            </div>
            <h3 className="caller-name">{remoteName}</h3>
            <p className="call-status">Incoming Voice Call</p>
          </div>

          <div className="call-actions">
            <button
              onClick={acceptCall}
              className="accept-btn"
              title="Accept Call"
            >
              <Phone size={24} />
              <span>Accept</span>
            </button>
            <button
              onClick={rejectCall}
              className="reject-btn"
              title="Decline Call"
            >
              <PhoneOff size={24} />
              <span>Decline</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Active call UI (outgoing, connecting, connected)
  const getIconClass = () => {
    if (callState === 'connected') return 'call-icon connected-glow';
    if (callState === 'calling') return 'call-icon calling-pulse';
    return 'call-icon';
  };

  const getCallStatus = () => {
    if (callState === 'calling') return 'Calling...';
    if (callState === 'connected') return formatDuration(callDuration);
    if (callState === 'ended') return 'Call Ended';
    return '';
  };

  return (
    <div className="voice-call-modal-overlay">
      <div className="voice-call-modal active-call">
        <div className={getIconClass()}>
          <Phone size={48} />
        </div>

        <div className="call-info">
          <div className="call-avatar">
            {remoteAvatar ? (
              <img src={remoteAvatar} alt={remoteName} />
            ) : (
              <div className="avatar-placeholder">
                {remoteName.charAt(0)}
              </div>
            )}
          </div>
          <h3 className="caller-name">{remoteName}</h3>
          <p className="call-status">{getCallStatus()}</p>

          {callState === 'connected' && (
            <div className="mic-info">
              {isMuted ? (
                <>
                  <MicOff size={16} className="mic-icon muted" />
                  <span className="mic-label muted">Muted</span>
                </>
              ) : (
                <>
                  <Mic size={16} className="mic-icon" />
                  <span className="mic-label">
                    {currentMic || 'Microphone Active'}
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        <div className="call-actions">
          {callState === 'connected' && (
            <>
              <button
                onClick={toggleMute}
                className={isMuted ? 'mute-btn muted' : 'mute-btn'}
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
                <span>{isMuted ? 'Unmute' : 'Mute'}</span>
              </button>
              <button
                onClick={endCall}
                className="end-call-btn"
                title="End Call"
              >
                <PhoneOff size={24} />
                <span>End Call</span>
              </button>
            </>
          )}

          {callState === 'calling' && (
            <button
              onClick={endCall}
              className="end-call-btn"
              title="Cancel Call"
            >
              <PhoneOff size={24} />
              <span>Cancel</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default GlobalVoiceCallModal;

