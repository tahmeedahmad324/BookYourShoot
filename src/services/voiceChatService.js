/**
 * Voice Chat Service
 * WebRTC-based peer-to-peer audio calling
 */

class VoiceChatService {
  constructor() {
    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = null;
    this.ws = null;
    this.callState = 'idle'; // idle, calling, ringing, connected, ended
    this.onStateChange = null;
    this.onRemoteStream = null;
    this.currentCallId = null;
    this.currentConversationId = null;
    this.currentUserId = null;
    this.remoteUserId = null;
    this.authToken = null;
    this.callLogMessageId = null;  // Track the call log message for updates
    
    // ICE servers for NAT traversal
    this.iceServers = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' }
      ],
      iceCandidatePoolSize: 10
    };
    
    // Audio constraints for better quality
    this.audioConstraints = {
      audio: {
        echoCancellation: { exact: true },
        noiseSuppression: { exact: true },
        autoGainControl: { exact: true },
        channelCount: { ideal: 2 },  // Stereo if supported
        sampleRate: { ideal: 48000 },  // High quality sample rate
        sampleSize: { ideal: 16 },
        latency: { ideal: 0.01 },  // Low latency (10ms)
        // Advanced constraints for better quality
        googEchoCancellation: { exact: true },
        googNoiseSuppression: { exact: true },
        googAutoGainControl: { exact: true },
        googHighpassFilter: { exact: true },
        googTypingNoiseDetection: { exact: true }
      },
      video: false
    };
    
    // Selected microphone device ID
    this.selectedMicId = null;
    this.currentMicLabel = null;
    
    // Audio elements
    this.localAudio = null;
    this.remoteAudio = null;
    
    // Call duration tracking
    this.callStartTime = null;
    this.callDurationInterval = null;
    this.onCallDurationUpdate = null;
  }

  /**
   * Initialize WebSocket connection for signaling
   */
  initSignaling(token, userId) {
    this.currentUserId = userId;
    this.authToken = token;  // Store for API calls
    
    // Use the existing chat WebSocket for signaling
    const wsUrl = `ws://localhost:8000/ws/voice?token=${token}`;
    this.ws = new WebSocket(wsUrl);
    
    this.ws.onopen = () => {
      console.log('✅ Voice signaling connected');
    };
    
    this.ws.onmessage = async (event) => {
      const data = JSON.parse(event.data);
      await this.handleSignalingMessage(data);
    };
    
    this.ws.onerror = (error) => {
      console.error('Voice signaling error:', error);
    };
    
    this.ws.onclose = () => {
      console.log('Voice signaling disconnected');
    };
  }

  /**
   * Handle incoming signaling messages
   */
  async handleSignalingMessage(data) {
    switch (data.type) {
      case 'voice_call_offer':
        // Incoming call
        this.currentCallId = data.call_id;
        this.currentConversationId = data.conversation_id;
        this.remoteUserId = data.from_user_id;
        this.setState('ringing');
        
        // Store the offer for when user accepts
        this.pendingOffer = data.offer;
        this.pendingCallerName = data.caller_name;
        break;
        
      case 'voice_call_answer':
        // Call was answered
        if (this.peerConnection && data.answer) {
          await this.peerConnection.setRemoteDescription(
            new RTCSessionDescription(data.answer)
          );
          this.setState('connected');
          this.startCallTimer();
          
          // Update call log to connected
          await this.logCallStatus('connected');
        }
        break;
        
      case 'voice_call_ice_candidate':
        // ICE candidate received
        if (this.peerConnection && data.candidate) {
          await this.peerConnection.addIceCandidate(
            new RTCIceCandidate(data.candidate)
          );
        }
        break;
        
      case 'voice_call_rejected':
        // Call was rejected
        await this.logCallStatus('rejected');
        this.endCall(false);
        this.setState('ended');
        break;
        
      case 'voice_call_ended':
        // Remote party ended the call
        this.endCall(false);
        this.setState('ended');
        break;
        
      case 'voice_call_busy':
        // Remote party is busy or call not allowed
        console.warn('📞 Call busy:', data.reason || 'User is not available');
        if (data.reason) {
          alert(data.reason);
        }
        this.endCall(false);
        this.setState('idle');
        break;
        
      default:
        console.log('Unknown voice signaling message:', data.type);
    }
  }

  /**
   * Get available microphones
   */
  async getAvailableMicrophones() {
    try {
      // Request permission first
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const devices = await navigator.mediaDevices.enumerateDevices();
      const microphones = devices.filter(device => device.kind === 'audioinput');
      
      console.log('📢 Available microphones:', microphones);
      return microphones;
    } catch (error) {
      console.error('Error enumerating microphones:', error);
      return [];
    }
  }

  /**
   * Set active microphone
   */
  setMicrophone(deviceId) {
    this.selectedMicId = deviceId;
    console.log('🎤 Selected microphone:', deviceId);
  }

  /**
   * Get current microphone info
   */
  getCurrentMicrophone() {
    return {
      deviceId: this.selectedMicId,
      label: this.currentMicLabel
    };
  }

  /**
   * Start an outgoing call
   */
  async startCall(conversationId, remoteUserId, callerName) {
    try {
      this.currentConversationId = conversationId;
      this.remoteUserId = remoteUserId;
      this.currentCallId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Prepare audio constraints with selected device
      const constraints = { ...this.audioConstraints };
      if (this.selectedMicId) {
        constraints.audio = {
          ...constraints.audio,
          deviceId: { exact: this.selectedMicId }
        };
      }
      
      // Get local audio stream with quality constraints
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Store current mic info
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        this.currentMicLabel = audioTrack.label;
        console.log('🎤 Using microphone:', audioTrack.label);
        console.log('🎤 Settings:', audioTrack.getSettings());
      }
      
      // Create peer connection
      this.peerConnection = new RTCPeerConnection(this.iceServers);
      
      // Set up connection state monitoring
      this.peerConnection.onconnectionstatechange = () => {
        console.log('📞 Connection state:', this.peerConnection.connectionState);
        if (this.peerConnection.connectionState === 'failed') {
          console.error('Connection failed, attempting restart');
          this.peerConnection.restartIce();
        }
      };
      
      this.peerConnection.oniceconnectionstatechange = () => {
        console.log('📞 ICE state:', this.peerConnection.iceConnectionState);
      };
      
      // Add local stream
      this.localStream.getTracks().forEach(track => {
        this.peerConnection.addTrack(track, this.localStream);
      });
      
      // Handle remote stream
      this.peerConnection.ontrack = (event) => {
        this.remoteStream = event.streams[0];
        if (this.onRemoteStream) {
          this.onRemoteStream(this.remoteStream);
        }
        this.playRemoteAudio(this.remoteStream);
      };
      
      // Handle ICE candidates
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          this.sendSignalingMessage({
            type: 'voice_call_ice_candidate',
            call_id: this.currentCallId,
            conversation_id: conversationId,
            to_user_id: remoteUserId,
            candidate: event.candidate
          });
        }
      };
      
      // Create and send offer
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      
      this.sendSignalingMessage({
        type: 'voice_call_offer',
        call_id: this.currentCallId,
        conversation_id: conversationId,
        to_user_id: remoteUserId,
        caller_name: callerName,
        offer: offer
      });
      
      this.setState('calling');
      
      // Log call initiation in chat
      await this.logCallStatus('initiated');
      
      // Play ringback tone
      this.playRingbackTone();
      
    } catch (error) {
      console.error('Failed to start call:', error);
      this.setState('idle');
      throw error;
    }
  }

  /**
   * Accept an incoming call
   */
  async acceptCall() {
    try {
      if (!this.pendingOffer) {
        throw new Error('No pending call to accept');
      }
      
      // Stop ringtone
      this.stopRingtone();
      
      // Prepare audio constraints with selected device
      const constraints = { ...this.audioConstraints };
      if (this.selectedMicId) {
        constraints.audio = {
          ...constraints.audio,
          deviceId: { exact: this.selectedMicId }
        };
      }
      
      // Get local audio stream with quality constraints
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Store current mic info
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        this.currentMicLabel = audioTrack.label;
        console.log('🎤 Using microphone:', audioTrack.label);
        console.log('🎤 Settings:', audioTrack.getSettings());
      }
      
      // Create peer connection
      this.peerConnection = new RTCPeerConnection(this.iceServers);
      
      // Set up connection state monitoring
      this.peerConnection.onconnectionstatechange = () => {
        console.log('📞 Connection state:', this.peerConnection.connectionState);
        if (this.peerConnection.connectionState === 'failed') {
          console.error('Connection failed, attempting restart');
          this.peerConnection.restartIce();
        }
      };
      
      this.peerConnection.oniceconnectionstatechange = () => {
        console.log('📞 ICE state:', this.peerConnection.iceConnectionState);
      };
      
      // Add local stream
      this.localStream.getTracks().forEach(track => {
        this.peerConnection.addTrack(track, this.localStream);
      });
      
      // Handle remote stream
      this.peerConnection.ontrack = (event) => {
        this.remoteStream = event.streams[0];
        if (this.onRemoteStream) {
          this.onRemoteStream(this.remoteStream);
        }
        this.playRemoteAudio(this.remoteStream);
      };
      
      // Handle ICE candidates
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          this.sendSignalingMessage({
            type: 'voice_call_ice_candidate',
            call_id: this.currentCallId,
            conversation_id: this.currentConversationId,
            to_user_id: this.remoteUserId,
            candidate: event.candidate
          });
        }
      };
      
      // Set remote description (the offer)
      await this.peerConnection.setRemoteDescription(
        new RTCSessionDescription(this.pendingOffer)
      );
      
      // Create and send answer
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      
      this.sendSignalingMessage({
        type: 'voice_call_answer',
        call_id: this.currentCallId,
        conversation_id: this.currentConversationId,
        to_user_id: this.remoteUserId,
        answer: answer
      });
      
      this.setState('connected');
      this.startCallTimer();
      this.pendingOffer = null;
      
      // Log that call is now connected
      await this.logCallStatus('connected');
      
    } catch (error) {
      console.error('Failed to accept call:', error);
      this.rejectCall();
      throw error;
    }
  }

  /**
   * Reject an incoming call
   */
  rejectCall() {
    this.stopRingtone();
    
    if (this.currentCallId) {
      this.sendSignalingMessage({
        type: 'voice_call_rejected',
        call_id: this.currentCallId,
        conversation_id: this.currentConversationId,
        to_user_id: this.remoteUserId
      });
      
      // Log call rejection
      this.logCallStatus('rejected');
    }
    
    this.setState('idle');
    this.cleanup();
  }

  /**
   * End the current call
   */
  endCall(sendMessage = true) {
    this.stopRingbackTone();
    this.stopCallTimer();
    
    // Get final call duration
    const duration = this.getCallDuration();
    
    if (sendMessage && this.currentCallId) {
      this.sendSignalingMessage({
        type: 'voice_call_ended',
        call_id: this.currentCallId,
        conversation_id: this.currentConversationId,
        to_user_id: this.remoteUserId
      });
    }
    
    // Log call end with duration
    if (this.currentCallId && this.callLogMessageId) {
      this.logCallStatus('ended', duration);
    }
    
    this.cleanup();
    this.setState('idle');
  }

  /**
   * Toggle mute
   */
  toggleMute() {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        return !audioTrack.enabled; // Returns true if now muted
      }
    }
    return false;
  }

  /**
   * Check if currently muted
   */
  isMuted() {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      return audioTrack ? !audioTrack.enabled : true;
    }
    return true;
  }

  /**
   * Send signaling message via WebSocket
   */
  sendSignalingMessage(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      message.from_user_id = this.currentUserId;
      this.ws.send(JSON.stringify(message));
    } else {
      console.error('WebSocket not connected');
    }
  }

  /**
   * Set call state and notify listeners
   */
  setState(newState) {
    this.callState = newState;
    if (this.onStateChange) {
      this.onStateChange(newState);
    }
  }

  /**
   * Get current call state
   */
  getState() {
    return this.callState;
  }

  /**
   * Get pending caller info
   */
  getPendingCallInfo() {
    return {
      callId: this.currentCallId,
      callerName: this.pendingCallerName,
      conversationId: this.currentConversationId
    };
  }

  /**
   * Play remote audio
   */
  playRemoteAudio(stream) {
    if (!this.remoteAudio) {
      this.remoteAudio = new Audio();
    }
    this.remoteAudio.srcObject = stream;
    this.remoteAudio.play().catch(err => console.error('Failed to play remote audio:', err));
  }

  /**
   * Play ringtone for incoming call
   */
  playRingtone() {
    // Simple oscillator-based ringtone
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    this.ringtoneContext = audioContext;
    
    const playTone = () => {
      if (!this.ringtoneContext || this.callState !== 'ringing') return;
      
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 440; // A4 note
      oscillator.type = 'sine';
      gainNode.gain.value = 0.3;
      
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.2);
      
      setTimeout(() => {
        if (this.callState === 'ringing') {
          const oscillator2 = audioContext.createOscillator();
          oscillator2.connect(gainNode);
          oscillator2.frequency.value = 523; // C5 note
          oscillator2.type = 'sine';
          oscillator2.start();
          oscillator2.stop(audioContext.currentTime + 0.2);
        }
      }, 200);
    };
    
    playTone();
    this.ringtoneInterval = setInterval(playTone, 2000);
  }

  /**
   * Stop ringtone
   */
  stopRingtone() {
    if (this.ringtoneInterval) {
      clearInterval(this.ringtoneInterval);
      this.ringtoneInterval = null;
    }
    if (this.ringtoneContext) {
      this.ringtoneContext.close();
      this.ringtoneContext = null;
    }
  }

  /**
   * Play ringback tone (for caller while waiting)
   */
  playRingbackTone() {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    this.ringbackContext = audioContext;
    
    const playTone = () => {
      if (!this.ringbackContext || this.callState !== 'calling') return;
      
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 440;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.2;
      
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 1);
    };
    
    playTone();
    this.ringbackInterval = setInterval(playTone, 3000);
  }

  /**
   * Stop ringback tone
   */
  stopRingbackTone() {
    if (this.ringbackInterval) {
      clearInterval(this.ringbackInterval);
      this.ringbackInterval = null;
    }
    if (this.ringbackContext) {
      this.ringbackContext.close();
      this.ringbackContext = null;
    }
  }

  /**
   * Start call duration timer
   */
  startCallTimer() {
    this.callStartTime = Date.now();
    this.callDurationInterval = setInterval(() => {
      if (this.onCallDurationUpdate) {
        const duration = Math.floor((Date.now() - this.callStartTime) / 1000);
        this.onCallDurationUpdate(duration);
      }
    }, 1000);
  }

  /**
   * Stop call duration timer
   */
  stopCallTimer() {
    if (this.callDurationInterval) {
      clearInterval(this.callDurationInterval);
      this.callDurationInterval = null;
    }
    this.callStartTime = null;
  }

  /**
   * Get call duration in seconds
   */
  getCallDuration() {
    if (this.callStartTime) {
      return Math.floor((Date.now() - this.callStartTime) / 1000);
    }
    return 0;
  }

  /**
   * Format duration as MM:SS
   */
  static formatDuration(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Create or update call log message in chat
   */
  async logCallStatus(status, duration = null) {
    if (!this.authToken || !this.currentConversationId || !this.currentCallId) {
      console.warn('Cannot log call status - missing required data');
      return;
    }

    try {
      const payload = {
        conversation_id: this.currentConversationId,
        call_id: this.currentCallId,
        call_status: status,
        duration: duration,
        message_id: this.callLogMessageId
      };

      const response = await fetch('http://localhost:8000/api/chat/voice-call-log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          // Store message ID for future updates
          if (!this.callLogMessageId) {
            this.callLogMessageId = data.data.id;
          }
          console.log('📞 Call log updated:', status);
        }
      } else {
        console.error('Failed to log call status:', await response.text());
      }
    } catch (error) {
      console.error('Error logging call status:', error);
    }
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    
    // Close peer connection
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    
    // Stop remote audio
    if (this.remoteAudio) {
      this.remoteAudio.srcObject = null;
    }
    
    // Clear call info
    this.currentCallId = null;
    this.remoteUserId = null;
    this.pendingOffer = null;
    this.pendingCallerName = null;
    this.callLogMessageId = null;  // Reset call log message ID
    
    // Stop tones
    this.stopRingtone();
    this.stopRingbackTone();
    this.stopCallTimer();
  }

  /**
   * Disconnect completely
   */
  disconnect() {
    this.cleanup();
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

// Singleton instance
const voiceChatService = new VoiceChatService();

export default voiceChatService;
export { VoiceChatService };
