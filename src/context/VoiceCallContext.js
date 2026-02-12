import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import voiceChatService from '../services/voiceChatService';

const VoiceCallContext = createContext(null);

export const useVoiceCall = () => {
  const context = useContext(VoiceCallContext);
  if (!context) {
    throw new Error('useVoiceCall must be used within VoiceCallProvider');
  }
  return context;
};

export const VoiceCallProvider = ({ children }) => {
  const { user, getToken } = useAuth();
  const [isServiceReady, setIsServiceReady] = useState(false);
  const [callState, setCallState] = useState('idle'); // idle, calling, ringing, connected, ended
  const [currentCall, setCurrentCall] = useState(null); // { conversationId, remoteUserId, remoteName, isIncoming }
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [currentMic, setCurrentMic] = useState(null);
  
  const durationIntervalRef = useRef(null);
  
  // Get current user ID
  const currentUserId = React.useMemo(() => {
    const storedUserId = localStorage.getItem('userId');
    if (storedUserId) return storedUserId;
    if (user?.id) return user.id;
    
    const token = localStorage.getItem('token');
    if (token && token.startsWith('mock-jwt-token')) {
      const parts = token.split('-');
      const role = parts[parts.length - 1];
      const mockUserIds = {
        'client': '257f9b67-99fa-44ce-ae67-6229c36380b5',
        'photographer': '21bf398a-e012-4c4d-9b55-caeac7ec6dc7',
        'admin': '5fb7a96b-3dd0-4d44-9631-c07a256292ee'
      };
      return mockUserIds[role] || null;
    }
    return null;
  }, [user?.id]);

  // Initialize voice service when user logs in
  useEffect(() => {
    const initService = async () => {
      if (!currentUserId) {
        setIsServiceReady(false);
        return;
      }

      try {
        const token = await getToken() || localStorage.getItem('token');
        
        // Initialize the service
        await voiceChatService.init(token, currentUserId);
        
        // Set up state change listener
        voiceChatService.onStateChange((state) => {
          console.log('🎙️ Voice call state changed:', state);
          setCallState(state);
          
          if (state === 'idle' || state === 'ended') {
            // Clear call duration timer
            if (durationIntervalRef.current) {
              clearInterval(durationIntervalRef.current);
              durationIntervalRef.current = null;
            }
            setCallDuration(0);
            setCurrentCall(null);
            setIsMuted(false);
          } else if (state === 'connected') {
            // Start duration timer
            durationIntervalRef.current = setInterval(() => {
              setCallDuration(prev => prev + 1);
            }, 1000);
          }
        });
        
        // Set up incoming call listener
        voiceChatService.onIncomingCall((callInfo) => {
          console.log('📞 Incoming call from:', callInfo);
          setCurrentCall({
            conversationId: callInfo.conversation_id,
            remoteUserId: callInfo.from_user_id,
            remoteName: callInfo.caller_name,
            isIncoming: true,
            callId: callInfo.call_id
          });
        });
        
        // Set up mic change listener
        voiceChatService.onMicChange((micLabel) => {
          setCurrentMic(micLabel);
        });
        
        setIsServiceReady(true);
        console.log('✅ Voice call service initialized globally');
        
      } catch (error) {
        console.error('❌ Failed to initialize voice service:', error);
        setIsServiceReady(false);
      }
    };

    initService();

    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, [currentUserId, getToken]);

  // Start outgoing call
  const startCall = useCallback(async (conversationId, remoteUserId, remoteName, callerName) => {
    console.log('🎙️ VoiceCallContext.startCall called:', { conversationId, remoteUserId, remoteName, callerName, isServiceReady });
    
    if (!isServiceReady) {
      console.error('❌ Voice service not ready');
      return;
    }

    try {
      console.log('🎙️ Setting current call...');
      setCurrentCall({
        conversationId,
        remoteUserId,
        remoteName,
        isIncoming: false
      });
      
      console.log('🎙️ Calling voiceChatService.startCall...');
      // Note: voiceChatService.startCall expects (conversationId, remoteUserId, callerName)
      await voiceChatService.startCall(conversationId, remoteUserId, callerName);
      console.log('✅ voiceChatService.startCall completed');
    } catch (error) {
      console.error('❌ Failed to start call:', error);
      setCurrentCall(null);
    }
  }, [isServiceReady]);

  // Accept incoming call
  const acceptCall = useCallback(async () => {
    if (!currentCall || !currentCall.isIncoming) return;
    
    try {
      await voiceChatService.acceptCall();
    } catch (error) {
      console.error('Failed to accept call:', error);
    }
  }, [currentCall]);

  // Reject incoming call
  const rejectCall = useCallback(() => {
    if (!currentCall || !currentCall.isIncoming) return;
    
    voiceChatService.rejectCall();
    setCurrentCall(null);
    setCallState('idle');
  }, [currentCall]);

  // End active call
  const endCall = useCallback(() => {
    voiceChatService.endCall();
    setCurrentCall(null);
    setCallState('idle');
    
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    setCallDuration(0);
  }, []);

  // Toggle mute
  const toggleMute = useCallback(() => {
    voiceChatService.toggleMute();
    setIsMuted(prev => !prev);
  }, []);

  // Close modal (for ended/rejected calls)
  const closeModal = useCallback(() => {
    setCurrentCall(null);
    setCallState('idle');
    setCallDuration(0);
  }, []);

  const value = {
    isServiceReady,
    callState,
    currentCall,
    callDuration,
    isMuted,
    currentMic,
    currentUserId,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    closeModal
  };

  return (
    <VoiceCallContext.Provider value={value}>
      {children}
    </VoiceCallContext.Provider>
  );
};
