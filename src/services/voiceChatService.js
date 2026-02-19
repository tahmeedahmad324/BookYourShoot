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
    this.stateChangeCallback = null;
    this.onRemoteStream = null;
    this.incomingCallCallback = null;
    this.micChangeCallback = null;
    this.currentCallId = null;
    this.currentConversationId = null;
    this.currentUserId = null;
    this.remoteUserId = null;
    this.authToken = null;
    this.callLogMessageId = null;  // Track the call log message for updates
    this.qualityMonitorInterval = null;  // Quality monitoring interval
    
    // ICE servers for NAT traversal (optimized for stability)
    this.iceServers = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        // Add more STUN servers as fallback
        { urls: 'stun:stun.services.mozilla.com' }
      ],
      iceCandidatePoolSize: 10,
      // Additional configuration for better voice quality
      bundlePolicy: 'max-bundle',        // Bundle all media into one connection
      rtcpMuxPolicy: 'require',           // Multiplex RTP and RTCP
      iceTransportPolicy: 'all'           // Try all connection types
    };
    
    // Audio constraints optimized for maximum voice call stability
    this.audioConstraints = {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1,  // Mono for voice (better stability)
        sampleRate: 16000,  // 16kHz (speech optimized, very stable)
        sampleSize: 16,
        // Chrome-specific optimizations
        googEchoCancellation: true,
        googNoiseSuppression: true,
        googAutoGainControl: true,
        googHighpassFilter: true,
        // Jitter buffer
        googAudioMirroring: false
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
   * Optimize SDP for stable voice call quality
   * Prefers Opus codec with voice-optimized settings
   */
  optimizeAudioSDP(sdp) {
    let optimizedSdp = sdp;
    
    // Set Opus codec parameters optimized for voice calls with maximum stability
    const opusParams = [
      'maxaveragebitrate=32000',    // 32 kbps (very stable for voice)
      'maxplaybackrate=16000',      // 16kHz sample rate (speech optimized)
      'stereo=0',                   // Mono (better stability)
      'sprop-stereo=0',             // No stereo
      'cbr=1',                      // Constant bitrate (most stable)
      'useinbandfec=1',             // Forward error correction (critical for stability)
      'usedtx=0',                   // Disable discontinuous transmission
      'ptime=20',                   // 20ms packet time (standard)
      'minptime=10',                // Min 10ms
      'maxptime=40'                 // Max 40ms (shorter for lower latency)
    ].join(';');
    
    // Find the Opus codec line and add/update parameters
    const opusMatch = optimizedSdp.match(/a=rtpmap:(\d+) opus\/\d+(?:\/\d+)?/);
    if (opusMatch) {
      const payloadType = opusMatch[1];
      
      // Remove existing fmtp line if present
      optimizedSdp = optimizedSdp.replace(
        new RegExp(`a=fmtp:${payloadType}.*\\r\\n`, 'g'),
        ''
      );
      
      // Add optimized fmtp line after rtpmap
      const rtpmapLine = optimizedSdp.match(new RegExp(`a=rtpmap:${payloadType}.*\\r\\n`))[0];
      optimizedSdp = optimizedSdp.replace(
        rtpmapLine,
        `${rtpmapLine}a=fmtp:${payloadType} ${opusParams}\r\n`
      );
      
      // Add bandwidth limit for stability (32 kbps application bandwidth)
      if (!optimizedSdp.includes('b=AS:')) {
        optimizedSdp = optimizedSdp.replace(
          /(m=audio \d+ [^\r\n]+\r\n)/,
          '$1b=AS:32\r\nb=TIAS:32000\r\n'
        );
      }
      
      console.log('🎵 Optimized Opus codec for maximum voice stability');
      console.log('   - Bitrate: 32 kbps (constant)');
      console.log('   - FEC: Enabled (packet loss recovery)');
      console.log('   - Mode: Mono, 16kHz');
    }
    
    return optimizedSdp;
  }

  /**
   * Initialize WebSocket connection for signaling
   */
  initSignaling(token, userId) {
    this.currentUserId = userId;
    this.authToken = token;  // Store for API calls
    
    // Debug: Check token
    console.log(`🔍 Initializing voice WebSocket for user ${userId}`);
    console.log(`🔑 Token: ${token ? token.substring(0, 20) + '...' : 'NULL'}`);
    
    if (!token) {
      console.error('❌ Cannot initialize voice WebSocket: token is null/undefined');
      return;
    }
    
    // Use the existing chat WebSocket for signaling
    const wsUrl = `ws://localhost:8000/ws/voice?token=${token}`;
    console.log(`🔌 Connecting to: ${wsUrl.substring(0, 50)}...`);
    this.ws = new WebSocket(wsUrl);
    
    this.ws.onopen = () => {
      console.log('✅ Voice signaling connected');
      console.log(`   User ID: ${userId}`);
      console.log(`   ReadyState: ${this.ws.readyState}`);
    };
    
    this.ws.onmessage = async (event) => {
      const data = JSON.parse(event.data);
      console.log('📨 Voice signaling message received:', data.type);
      await this.handleSignalingMessage(data);
    };
    
    this.ws.onerror = (error) => {
      console.error('❌ Voice signaling error:', error);
    };
    
    this.ws.onclose = (event) => {
      console.log(`🔌 Voice signaling disconnected - Code: ${event.code}, Reason: ${event.reason || 'No reason'}`);
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
        
        // Notify subscribers of incoming call
        if (this.incomingCallCallback) {
          this.incomingCallCallback({
            call_id: data.call_id,
            conversation_id: data.conversation_id,
            from_user_id: data.from_user_id,
            caller_name: data.caller_name
          });
        }
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
    console.log('📞 voiceChatService.startCall:', { conversationId, remoteUserId, callerName });
    
    try {
      this.currentConversationId = conversationId;
      this.remoteUserId = remoteUserId;
      this.currentCallId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      console.log('📞 Call ID generated:', this.currentCallId);
      
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
      
      // Set up connection state monitoring with enhanced recovery
      this.peerConnection.onconnectionstatechange = () => {
        const state = this.peerConnection.connectionState;
        console.log('📞 Connection state:', state);
        
        if (state === 'failed') {
          console.error('⚠️ Connection failed, attempting ICE restart');
          this.peerConnection.restartIce();
        } else if (state === 'disconnected') {
          console.warn('⚠️ Connection disconnected, waiting for recovery...');
          // Give it 5 seconds to reconnect before ending call
          setTimeout(() => {
            if (this.peerConnection && this.peerConnection.connectionState === 'disconnected') {
              console.error('❌ Connection recovery failed, ending call');
              this.endCall();
            }
          }, 5000);
        } else if (state === 'connected') {
          console.log('✅ Peer connection established successfully');
          // Start monitoring audio quality
          this.startQualityMonitoring();
        }
      };
      
      this.peerConnection.oniceconnectionstatechange = () => {
        const state = this.peerConnection.iceConnectionState;
        console.log('📞 ICE connection state:', state);
        
        if (state === 'failed') {
          console.error('❌ ICE connection failed');
        } else if (state === 'connected' || state === 'completed') {
          console.log('✅ ICE connection successful');
        }
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
      
      // Create and send offer with optimized audio
      const offer = await this.peerConnection.createOffer();
      
      // Optimize SDP for better audio quality
      offer.sdp = this.optimizeAudioSDP(offer.sdp);
      
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
      
      // Set up connection state monitoring with enhanced recovery
      this.peerConnection.onconnectionstatechange = () => {
        const state = this.peerConnection.connectionState;
        console.log('📞 Connection state:', state);
        
        if (state === 'failed') {
          console.error('⚠️ Connection failed, attempting ICE restart');
          this.peerConnection.restartIce();
        } else if (state === 'disconnected') {
          console.warn('⚠️ Connection disconnected, waiting for recovery...');
          // Give it 5 seconds to reconnect before ending call
          setTimeout(() => {
            if (this.peerConnection && this.peerConnection.connectionState === 'disconnected') {
              console.error('❌ Connection recovery failed, ending call');
              this.endCall();
            }
          }, 5000);
        } else if (state === 'connected') {
          console.log('✅ Peer connection established successfully');
          // Start monitoring audio quality
          this.startQualityMonitoring();
        }
      };
      
      this.peerConnection.oniceconnectionstatechange = () => {
        const state = this.peerConnection.iceConnectionState;
        console.log('📞 ICE connection state:', state);
        
        if (state === 'failed') {
          console.error('❌ ICE connection failed');
        } else if (state === 'connected' || state === 'completed') {
          console.log('✅ ICE connection successful');
        }
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
      
      // Create and send answer with optimized audio
      const answer = await this.peerConnection.createAnswer();
      
      // Optimize SDP for better audio quality
      answer.sdp = this.optimizeAudioSDP(answer.sdp);
      
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
   * Initialize voice service globally
   */
  async init(token, userId) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('⚠️  Voice service already initialized');
      return;
    }
    
    this.initSignaling(token, userId);
    
    // Get available microphones
    const mics = await this.getAvailableMicrophones();
    if (mics.length > 0) {
      console.log(`🎤 Found ${mics.length} microphones`);
    }
  }

  /**
   * Register state change callback
   */
  onStateChange(callback) {
    this.stateChangeCallback = callback;
  }

  /**
   * Register incoming call callback
   */
  onIncomingCall(callback) {
    this.incomingCallCallback = callback;
  }

  /**
   * Register mic change callback
   */
  onMicChange(callback) {
    this.micChangeCallback = callback;
  }

  /**
   * Set current microphone and notify listeners
   */
  _setCurrentMic(label) {
    this.currentMicLabel = label;
    if (this.micChangeCallback) {
      this.micChangeCallback(label);
    }
  }

  /**
   * Set call state and notify listeners
   */
  setState(newState) {
    this.callState = newState;
    if (this.stateChangeCallback) {
      this.stateChangeCallback(newState);
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
      // Optimize for voice call playback
      this.remoteAudio.volume = 1.0; // Full volume
      this.remoteAudio.autoplay = true;
      // Reduce audio latency
      if ('setSinkId' in this.remoteAudio) {
        this.remoteAudio.setSinkId('default').catch(e => console.warn('setSinkId failed:', e));
      }
    }
    this.remoteAudio.srcObject = stream;
    // Play with error handling
    this.remoteAudio.play().catch(err => {
      console.error('Failed to play remote audio:', err);
      // Retry once after a short delay
      setTimeout(() => {
        this.remoteAudio.play().catch(e => console.error('Retry failed:', e));
      }, 100);
    });
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
   * Start monitoring audio quality statistics
   */
  startQualityMonitoring() {
    // Clear any existing monitor
    if (this.qualityMonitorInterval) {
      clearInterval(this.qualityMonitorInterval);
    }
    
    // Monitor every 3 seconds
    this.qualityMonitorInterval = setInterval(async () => {
      if (!this.peerConnection) return;
      
      try {
        const stats = await this.peerConnection.getStats();
        stats.forEach(report => {
          if (report.type === 'inbound-rtp' && report.kind === 'audio') {
            const packetsLost = report.packetsLost || 0;
            const packetsReceived = report.packetsReceived || 0;
            const jitter = report.jitter || 0;
            
            if (packetsReceived > 0) {
              const lossPercent = ((packetsLost / (packetsLost + packetsReceived)) * 100).toFixed(2);
              console.log(`📊 Audio Quality: Packet Loss: ${lossPercent}%, Jitter: ${(jitter * 1000).toFixed(2)}ms, Packets: ${packetsReceived}`);
              
              // Warn if quality is degrading
              if (lossPercent > 5) {
                console.warn(`⚠️ High packet loss detected: ${lossPercent}%`);
              }
              if (jitter > 0.1) {
                console.warn(`⚠️ High jitter detected: ${(jitter * 1000).toFixed(2)}ms`);
              }
            }
          }
        });
      } catch (error) {
        console.error('Error monitoring quality:', error);
      }
    }, 3000);
  }

  /**
   * Start monitoring audio quality statistics
   */
  startQualityMonitoring() {
    // Clear any existing monitor
    if (this.qualityMonitorInterval) {
      clearInterval(this.qualityMonitorInterval);
    }
    
    // Monitor every 3 seconds
    this.qualityMonitorInterval = setInterval(async () => {
      if (!this.peerConnection) return;
      
      try {
        const stats = await this.peerConnection.getStats();
        stats.forEach(report => {
          if (report.type === 'inbound-rtp' && report.kind === 'audio') {
            const packetsLost = report.packetsLost || 0;
            const packetsReceived = report.packetsReceived || 0;
            const jitter = report.jitter || 0;
            
            if (packetsReceived > 0) {
              const lossPercent = ((packetsLost / (packetsLost + packetsReceived)) * 100).toFixed(2);
              console.log(`📊 Audio Quality: Packet Loss: ${lossPercent}%, Jitter: ${(jitter * 1000).toFixed(2)}ms, Packets: ${packetsReceived}`);
              
              // Warn if quality is degrading
              if (lossPercent > 5) {
                console.warn(`⚠️ High packet loss detected: ${lossPercent}%`);
              }
              if (jitter > 0.1) {
                console.warn(`⚠️ High jitter detected: ${(jitter * 1000).toFixed(2)}ms`);
              }
            }
          }
        });
      } catch (error) {
        console.error('Error monitoring quality:', error);
      }
    }, 3000);
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    // Stop quality monitoring
    if (this.qualityMonitorInterval) {
      clearInterval(this.qualityMonitorInterval);
      this.qualityMonitorInterval = null;
    }
    
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
