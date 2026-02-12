import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useVoiceCall } from '../../context/VoiceCallContext';
import { useWebSocketChat } from '../../hooks/useWebSocketChat';
import axios from 'axios';
import { supabase } from '../../supabaseClient';
import EmojiPicker from 'emoji-picker-react';
import { useDropzone } from 'react-dropzone';
import { 
  Send, 
  ArrowLeft, 
  ChevronDown, 
  AlertCircle,
  MessageSquare,
  Check,
  CheckCheck,
  Smile,
  Paperclip,
  X,
  Search,
  Image as ImageIcon,
  File as FileIcon,
  Bell,
  BellOff,
  Phone,
  Lock
} from 'lucide-react';
import '../../styles/chat.css';

// Notification sound (base64 encoded short beep)
const NOTIFICATION_SOUND = 'data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU' + 'tvT19' + 'HZWVrZmVlZGJhY2s=';

const ChatContainer = ({ userRole = 'client' }) => {
  const { id: urlConversationId } = useParams();
  const { user, getToken } = useAuth();
  const { startCall } = useVoiceCall();
  const navigate = useNavigate();
  
  // Get actual user ID (memoized to prevent recalculation on every render)
  const currentUserId = useMemo(() => {
    // Try localStorage first (for mock users)
    const storedUserId = localStorage.getItem('userId');
    if (storedUserId) {
      return storedUserId;
    }
    
    // Try user context
    if (user?.id) {
      return user.id;
    }
    
    // Fallback - extract from token if it's a mock token
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
  
  // Log userId once on mount
  useEffect(() => {
    console.log('🔑 [ChatContainer] Current userId:', currentUserId);
  }, [currentUserId]);
  
  // Debugging - only log once on mount
  useEffect(() => {
    console.log('💬 [ChatContainer] Mounted:', { userRole, userId: currentUserId });
    return () => console.log('💬 [ChatContainer] Unmounted');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // State
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  
  // New Feature States
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [messageSearchQuery, setMessageSearchQuery] = useState('');
  const [showMessageSearch, setShowMessageSearch] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  
  // Refs
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const textareaRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const initialScrollDoneRef = useRef(false);
  const notificationAudioRef = useRef(null);
  
  // Get auth token
  const [authToken, setAuthToken] = useState(null);
  
  useEffect(() => {
    const loadToken = async () => {
      try {
        const token = await getToken();
        if (!token) {
          setAuthToken(localStorage.getItem('token'));
        } else {
          setAuthToken(token);
        }
      } catch (error) {
        setAuthToken(localStorage.getItem('token'));
      }
    };
    loadToken();
  }, [getToken]);
  
  // WebSocket connection
  const {
    isConnected,
    messages: wsMessages,
    typingUsers,
    onlineUsers,
    sendMessage: wsSendMessage,
    sendTypingIndicator
  } = useWebSocketChat(authToken, currentUserId);
  
  // Initialize notification audio
  useEffect(() => {
    // Try to load notification sound, fallback to synthesized beep
    const audio = new Audio();
    audio.src = '/notification.mp3';
    audio.volume = 0.5;
    
    // If mp3 fails to load, use Web Audio API for a simple beep
    audio.onerror = () => {
      // Create a simple beep using Web Audio API
      notificationAudioRef.current = {
        play: () => {
          try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
            oscillator.start(audioCtx.currentTime);
            oscillator.stop(audioCtx.currentTime + 0.2);
            return Promise.resolve();
          } catch (e) {
            return Promise.reject(e);
          }
        }
      };
    };
    
    notificationAudioRef.current = audio;
    
    // Request notification permission on mount
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);
  
  // Play sound and show notification for new messages
  const playNotificationSound = useCallback(() => {
    if (notificationsEnabled && notificationAudioRef.current) {
      notificationAudioRef.current.play().catch(() => {});
    }
  }, [notificationsEnabled]);
  
  const showBrowserNotification = useCallback((title, body, conversationId) => {
    if (!notificationsEnabled) return;
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(title, {
        body: body,
        icon: '/favicon.ico',
        tag: conversationId // Prevents duplicate notifications for same conversation
      });
      notification.onclick = () => {
        window.focus();
        navigate(`/${userRole}/chat/${conversationId}`);
        notification.close();
      };
    }
  }, [notificationsEnabled, navigate, userRole]);
  
  // File upload with react-dropzone
  const onDrop = useCallback((acceptedFiles) => {
    const newAttachments = acceptedFiles.map(file => ({
      file,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
      name: file.name,
      size: file.size,
      type: file.type
    }));
    setAttachments(prev => [...prev, ...newAttachments]);
  }, []);
  
  const { getRootProps, getInputProps, isDragActive, open: openFilePicker } = useDropzone({
    onDrop,
    noClick: true,
    noKeyboard: true,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    maxSize: 10 * 1024 * 1024 // 10MB max
  });
  
  const removeAttachment = (index) => {
    setAttachments(prev => {
      const newAttachments = [...prev];
      if (newAttachments[index].preview) {
        URL.revokeObjectURL(newAttachments[index].preview);
      }
      newAttachments.splice(index, 1);
      return newAttachments;
    });
  };
  
  // Emoji picker handler
  const onEmojiClick = (emojiData) => {
    setNewMessage(prev => prev + emojiData.emoji);
    setShowEmojiPicker(false);
    textareaRef.current?.focus();
  };
  
  // Load conversations
  useEffect(() => {
    if (!authToken) return;
    loadConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken]);
  
  // Load messages when conversation selected
  useEffect(() => {
    if (!selectedConversation) return;
    loadMessages(selectedConversation.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConversation?.id]);
  
  // Handle URL-based conversation selection
  useEffect(() => {
    if (urlConversationId && conversations.length > 0) {
      const conv = conversations.find(c => c.id === urlConversationId);
      if (conv) {
        setSelectedConversation(conv);
      }
    }
  }, [urlConversationId, conversations]);
  
  // Scroll to bottom helper - scrolls only the chat container, not the page
  const scrollToBottomOfContainer = useCallback((smooth = false) => {
    const container = messagesContainerRef.current;
    if (container) {
      if (smooth) {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: 'smooth'
        });
      } else {
        container.scrollTop = container.scrollHeight;
      }
    }
  }, []);
  
  // Add WebSocket messages to local state and handle optimistic message replacement
  useEffect(() => {
    if (wsMessages.length > 0 && selectedConversation) {
      const relevantMessages = wsMessages.filter(
        msg => msg.conversation_id === selectedConversation.id
      );
      if (relevantMessages.length > 0) {
        setMessages(prev => {
          // Remove optimistic messages that match incoming real messages (by content + sender)
          const optimisticRemoved = prev.filter(m => {
            if (!m._optimistic) return true;
            // Check if any incoming message matches this optimistic one
            const hasMatch = relevantMessages.some(
              rm => rm.content === m.content && rm.sender_id === m.sender_id
            );
            return !hasMatch; // Remove if matched
          });
          
          // Build a map of existing messages for faster lookup
          const existingMap = new Map(optimisticRemoved.map(m => [m.id, m]));
          
          // Process relevant messages: update existing or add new
          const newMsgs = [];
          const updatedMessages = optimisticRemoved.map(existing => {
            // Check if this message has an update in wsMessages
            const updated = relevantMessages.find(rm => rm.id === existing.id);
            if (updated && updated.content !== existing.content) {
              // Message was updated (e.g., call status changed)
              console.log('🔄 Updating message:', existing.content, '→', updated.content);
              return { ...existing, ...updated };
            }
            return existing;
          });
          
          // Find truly new messages (not in existing map)
          relevantMessages.forEach(rm => {
            if (!existingMap.has(rm.id) && !rm.id?.startsWith?.('temp-')) {
              newMsgs.push(rm);
            }
          });
          
          // Merge updated and new messages
          const merged = [...updatedMessages, ...newMsgs];
          
          // Sort by timestamp, handling potential format issues
          merged.sort((a, b) => {
            const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
            const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
            // Put messages with invalid timestamps at the end (they're likely new)
            if (isNaN(timeA)) return 1;
            if (isNaN(timeB)) return -1;
            return timeA - timeB;
          });
          
          // If new messages were added (not our optimistic ones), scroll to bottom
          if (newMsgs.length > 0) {
            // Check if any message is not from us (received from other user)
            const hasReceivedMessages = newMsgs.some(m => m.sender_id !== currentUserId);
            if (hasReceivedMessages) {
              setTimeout(() => scrollToBottomOfContainer(true), 100);
              
              // Play notification sound and show browser notification
              playNotificationSound();
              
              // Get sender info for notification
              const otherMessage = newMsgs.find(m => m.sender_id !== currentUserId);
              if (otherMessage && document.hidden) {
                const senderName = selectedConversation.other_user?.name || 'Someone';
                showBrowserNotification(
                  `New message from ${senderName}`,
                  otherMessage.content.substring(0, 50) + (otherMessage.content.length > 50 ? '...' : ''),
                  selectedConversation.id
                );
              }
            }
          }
          
          return merged;
        });
      }
    }
  }, [wsMessages, selectedConversation, currentUserId, scrollToBottomOfContainer, playNotificationSound, showBrowserNotification]);
  
  // Listen for inquiry status updates from WebSocket
  useEffect(() => {
    const handleInquiryUpdate = (e) => {
      const { conversation_id, inquiry_status } = e.detail;
      setConversations(prev => prev.map(conv => {
        if (conv.id === conversation_id) {
          return {
            ...conv,
            inquiry_messages_sent: conv.inquiry_message_limit - inquiry_status.messages_remaining
          };
        }
        return conv;
      }));
    };
    
    window.addEventListener('inquiry-status-update', handleInquiryUpdate);
    return () => window.removeEventListener('inquiry-status-update', handleInquiryUpdate);
  }, []);
  
  // Track processed message IDs to avoid duplicate counting
  const processedMessageIdsRef = useRef(new Set());
  
  // Update unread counts when WebSocket messages arrive for other conversations
  useEffect(() => {
    if (wsMessages.length > 0) {
      // Check for NEW messages in conversations that are NOT currently selected
      const messagesForOtherConvs = wsMessages.filter(
        msg => msg.conversation_id !== selectedConversation?.id && 
               msg.sender_id !== currentUserId &&
               !processedMessageIdsRef.current.has(msg.id)
      );
      
      if (messagesForOtherConvs.length > 0) {
        // Mark these messages as processed
        messagesForOtherConvs.forEach(msg => {
          processedMessageIdsRef.current.add(msg.id);
        });
        
        // Group by conversation and update unread counts using functional update
        setUnreadCounts(prev => {
          const newCounts = { ...prev };
          messagesForOtherConvs.forEach(msg => {
            if (!newCounts[msg.conversation_id]) {
              newCounts[msg.conversation_id] = 0;
            }
            newCounts[msg.conversation_id]++;
          });
          return newCounts;
        });
        
        // Also update last_message in conversations list
        setConversations(prev => prev.map(conv => {
          const latestMsg = messagesForOtherConvs.find(m => m.conversation_id === conv.id);
          if (latestMsg) {
            return {
              ...conv,
              last_message: latestMsg,
              unread_count: (conv.unread_count || 0) + 1
            };
          }
          return conv;
        }));
      }
    }
  }, [wsMessages, selectedConversation?.id, currentUserId]);
  
  // Clear unread count when conversation is selected
  useEffect(() => {
    if (selectedConversation) {
      setUnreadCounts(prev => ({
        ...prev,
        [selectedConversation.id]: 0
      }));
      setConversations(prev => prev.map(conv => 
        conv.id === selectedConversation.id 
          ? { ...conv, unread_count: 0 }
          : conv
      ));
    }
  }, [selectedConversation?.id]);
  
  // Initial scroll when messages load
  useEffect(() => {
    if (messages.length > 0 && !initialScrollDoneRef.current) {
      setTimeout(() => {
        scrollToBottomOfContainer(false);
        initialScrollDoneRef.current = true;
      }, 50);
    }
  }, [messages.length, scrollToBottomOfContainer]);
  
  // Reset initial scroll ref when conversation changes
  useEffect(() => {
    initialScrollDoneRef.current = false;
  }, [selectedConversation?.id]);
  
  // Scroll button visibility
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      setShowScrollButton(scrollHeight - scrollTop - clientHeight > 200);
    };
    
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [selectedConversation]);
  
  const loadConversations = async () => {
    try {
      const response = await axios.get(
        'http://localhost:8000/api/chat/conversations',
        { headers: { 'Authorization': `Bearer ${authToken}` } }
      );
      const loadedConversations = response.data.data || [];
      setConversations(loadedConversations);
      
      // Calculate unread counts per conversation
      const counts = {};
      loadedConversations.forEach(conv => {
        counts[conv.id] = conv.unread_count || 0;
      });
      setUnreadCounts(counts);
      
      setLoading(false);
    } catch (err) {
      console.error('Error loading conversations:', err.response?.data?.detail || err.message);
      if (err.response?.status === 401) {
        navigate('/login');
      }
      setLoading(false);
    }
  };
  
  const loadMessages = async (conversationId) => {
    try {
      const response = await axios.get(
        `http://localhost:8000/api/chat/conversations/${conversationId}/messages`,
        { headers: { 'Authorization': `Bearer ${authToken}` } }
      );
      const loadedMessages = response.data.data || [];
      // Ensure each message has proper sender_id and sort by created_at ascending
      const processedMessages = loadedMessages.map(msg => ({
        ...msg,
        sender_id: msg.sender_id || msg.user_id || msg.from_user_id
      })).sort((a, b) => {
        const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
        if (isNaN(timeA)) return 1;
        if (isNaN(timeB)) return -1;
        return timeA - timeB;
      });
      setMessages(processedMessages);
      initialScrollDoneRef.current = false; // Reset for new conversation
    } catch (err) {
      console.error('Error loading messages:', err.response?.data?.detail || err.message);
    }
  };
  
  const scrollToBottom = (smooth = true) => {
    scrollToBottomOfContainer(smooth);
  };
  
  const handleConversationClick = (conversation) => {
    setSelectedConversation(conversation);
    navigate(`/${userRole}/chat/${conversation.id}`);
  };
  
  // Upload file to Supabase Storage
  const uploadFileToStorage = async (file, conversationId) => {
    try {
      // Generate unique filename with timestamp
      const timestamp = Date.now();
      const fileExt = file.name.split('.').pop();
      const fileName = `${conversationId}/${timestamp}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
      
      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('chat-attachments')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });
      
      if (error) throw error;
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(fileName);
      
      return {
        success: true,
        url: urlData.publicUrl,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size
      };
    } catch (error) {
      console.error('Upload error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  };
  
  const handleSendMessage = async (e) => {
    e?.preventDefault();
    
    // For INQUIRY conversations, only text is allowed (no attachments)
    const isInquiry = selectedConversation?.conversation_type === 'INQUIRY';
    const effectiveAttachments = isInquiry ? [] : attachments;
    
    // Allow sending if there's text OR attachments (for non-inquiry)
    if ((!newMessage.trim() && effectiveAttachments.length === 0) || sending || !selectedConversation) return;
    
    // Check inquiry limit
    if (isInquiry) {
      const sentCount = selectedConversation.inquiry_messages_sent || 0;
      const limit = selectedConversation.inquiry_message_limit || 15;
      if (sentCount >= limit) {
        return;
      }
    }
    
    setSending(true);
    const messageContent = newMessage.trim();
    const currentAttachments = [...effectiveAttachments];
    setNewMessage('');
    setAttachments([]); // Clear attachments after sending
    
    // Upload files to Supabase Storage first
    let uploadedFiles = [];
    if (currentAttachments.length > 0) {
      for (const attachment of currentAttachments) {
        const uploadResult = await uploadFileToStorage(attachment.file, selectedConversation.id);
        if (uploadResult.success) {
          uploadedFiles.push({
            name: uploadResult.fileName,
            url: uploadResult.url,
            type: uploadResult.fileType,
            size: uploadResult.fileSize
          });
        } else {
          console.error('Failed to upload:', attachment.name, uploadResult.error);
        }
      }
    }
    
    // Optimistic UI update with unique temp ID
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Build message content with attachment info (URLs for uploaded files)
    let displayContent = messageContent;
    let attachmentData = null;
    
    if (uploadedFiles.length > 0) {
      // Store attachment URLs as JSON in a special format
      attachmentData = JSON.stringify(uploadedFiles);
      const attachmentText = uploadedFiles.map(f => `📎 ${f.name}`).join('\n');
      displayContent = messageContent 
        ? `${messageContent}\n${attachmentText}`
        : attachmentText;
    }
    
    const optimisticMessage = {
      id: tempId,
      conversation_id: selectedConversation.id,
      sender_id: currentUserId,
      content: displayContent,
      content_type: uploadedFiles.length > 0 ? 'file' : 'text',
      created_at: new Date().toISOString(),
      is_read: false,
      _optimistic: true,
      _tempId: tempId,
      attachments: uploadedFiles,
      attachment_urls: attachmentData
    };
    setMessages(prev => [...prev, optimisticMessage]);
    
    // Scroll chat container (not page) after adding message
    setTimeout(() => scrollToBottomOfContainer(true), 50);
    
    try {
      // Try WebSocket first - send displayContent (includes attachment names)
      if (isConnected) {
        const contentType = uploadedFiles.length > 0 ? 'file' : 'text';
        const success = wsSendMessage(
          selectedConversation.id, 
          displayContent, 
          contentType, 
          attachmentData
        );
        if (success) {
          // WebSocket will echo the message back, which will replace the optimistic one
          // Set a timeout to clear optimistic flag if no confirmation (fallback)
          setTimeout(() => {
            setMessages(prev => prev.map(m => 
              m.id === tempId ? { ...m, _optimistic: false } : m
            ));
          }, 5000);
          setSending(false);
          return;
        }
      }
      
      // Fallback to HTTP - include attachment_urls
      const response = await axios.post(
        'http://localhost:8000/api/chat/messages',
        {
          conversation_id: selectedConversation.id,
          content: displayContent,
          content_type: uploadedFiles.length > 0 ? 'file' : 'text',
          attachment_urls: attachmentData
        },
        { headers: { 'Authorization': `Bearer ${authToken}` } }
      );
      
      // Replace optimistic message with real one
      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== tempId);
        return [...filtered, response.data.data];
      });
      
      // Reload conversations to update last message
      loadConversations();
    } catch (err) {
      console.error('Error sending message:', err);
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== tempId));
    } finally {
      setSending(false);
    }
  };
  
  const handleTextareaChange = (e) => {
    setNewMessage(e.target.value);
    
    // Auto-resize
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
    
    // Typing indicator
    if (!isTyping && selectedConversation) {
      setIsTyping(true);
      sendTypingIndicator(selectedConversation.id, true);
    }
    
    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Stop typing after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      if (selectedConversation) {
        sendTypingIndicator(selectedConversation.id, false);
      }
    }, 3000);
  };
  
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  // Filter conversations by search
  const filteredConversations = conversations.filter(conv => {
    if (!searchQuery) return true;
    const name = conv.other_user?.name || '';
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });
  
  // Group messages by date
  const groupMessagesByDate = (messages) => {
    const groups = [];
    let currentDate = null;
    let currentGroup = [];
    
    messages.forEach(msg => {
      const msgDate = new Date(msg.created_at).toDateString();
      if (msgDate !== currentDate) {
        if (currentGroup.length > 0) {
          groups.push({ date: currentDate, messages: currentGroup });
        }
        currentDate = msgDate;
        currentGroup = [msg];
      } else {
        currentGroup.push(msg);
      }
    });
    
    if (currentGroup.length > 0) {
      groups.push({ date: currentDate, messages: currentGroup });
    }
    
    return groups;
  };
  
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  };
  
  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };
  
  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };
  
  // Filter messages by search query
  const filteredMessages = messageSearchQuery.trim()
    ? messages.filter(msg => 
        msg.content?.toLowerCase().includes(messageSearchQuery.toLowerCase())
      )
    : messages;
  
  const messageGroups = groupMessagesByDate(filteredMessages);
  const currentTypingUser = selectedConversation ? typingUsers[selectedConversation.id] : null;
  
  // Calculate inquiry limit progress
  const inquiryProgress = selectedConversation?.conversation_type === 'INQUIRY' 
    ? {
        sent: selectedConversation.inquiry_messages_sent || 0,
        limit: selectedConversation.inquiry_message_limit || 15,
        remaining: (selectedConversation.inquiry_message_limit || 15) - (selectedConversation.inquiry_messages_sent || 0)
      }
    : null;
  
  const isInquiryLimitReached = inquiryProgress && inquiryProgress.remaining <= 0;
  
  // Check if this is an inquiry conversation (attachments disabled)
  const isInquiryConversation = selectedConversation?.conversation_type === 'INQUIRY';
  
  return (
    <div className="chat-container">
      {/* Conversation Sidebar */}
      <div className="chat-sidebar">
        <div className="chat-sidebar-header">
          <div className="d-flex align-items-center justify-content-between">
            <div>
              <h5 className="mb-0 fw-bold">Messages</h5>
              <small className="opacity-90">{conversations.length} conversations</small>
            </div>
            {isConnected !== undefined && (
              <div className="connection-status">
                <div className={`connection-dot ${!isConnected ? 'disconnected' : ''}`}></div>
                {isConnected ? 'Connected' : 'Connecting...'}
              </div>
            )}
          </div>
        </div>
        
        <div className="chat-sidebar-search">
          <input 
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="conversations-list">
          {loading ? (
            <div className="chat-loading">
              <div className="loading-spinner"></div>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="chat-empty-state" style={{ padding: '48px 24px' }}>
              <MessageSquare size={48} />
              <h6 className="mt-3">No conversations yet</h6>
              <p className="text-muted small">Start a conversation with a {userRole === 'client' ? 'photographer' : 'client'}</p>
            </div>
          ) : (
            filteredConversations.map(conv => {
              const isOnline = conv.other_user && onlineUsers.has(conv.other_user.user_id);
              const isActive = selectedConversation?.id === conv.id;
              
              return (
                <div
                  key={conv.id}
                  className={`conversation-item ${isActive ? 'active' : ''}`}
                  onClick={() => handleConversationClick(conv)}
                >
                  <div className="conversation-avatar">
                    {conv.other_user?.profile_picture_url ? (
                      <img src={conv.other_user.profile_picture_url} alt={conv.other_user.name} />
                    ) : (
                      getInitials(conv.other_user?.name)
                    )}
                    {isOnline && <div className="online-indicator"></div>}
                  </div>
                  
                  <div className="conversation-details">
                    <div className="conversation-name">
                      <span>{conv.other_user?.name || 'Unknown User'}</span>
                      {conv.last_message && (
                        <span className="conversation-timestamp">
                          {formatTime(conv.last_message.created_at)}
                        </span>
                      )}
                    </div>
                    
                    {conv.last_message && (
                      <div className="conversation-preview">
                        {(conv.last_message.sender_id === currentUserId || 
                          conv.last_message.sender?.id === currentUserId) ? 'You: ' : ''}
                        {conv.last_message.content}
                      </div>
                    )}
                    
                    {conv.conversation_type === 'INQUIRY' && (
                      <div className="mt-1">
                        <span className="badge bg-warning text-dark" style={{ fontSize: '10px' }}>
                          {conv.inquiry_messages_sent}/{conv.inquiry_message_limit} messages
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {conv.unread_count > 0 && (
                    <div className="unread-badge">{conv.unread_count}</div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
      
      {/* Chat Main Area */}
      <div className="chat-main">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="chat-header">
              <div className="chat-header-info">
                <div className="d-md-none">
                  <Link to={`/${userRole}/messages`} className="text-white me-3">
                    <ArrowLeft size={20} />
                  </Link>
                </div>
                
                <div className="chat-header-avatar">
                  {selectedConversation.other_user?.profile_picture_url ? (
                    <img 
                      src={selectedConversation.other_user.profile_picture_url} 
                      alt={selectedConversation.other_user.name}
                      style={{ width: '100%', height: '100%', borderRadius: '50%' }}
                    />
                  ) : (
                    getInitials(selectedConversation.other_user?.name)
                  )}
                </div>
                
                <div className="chat-header-details">
                  <h3 className="mb-0">{selectedConversation.other_user?.name || 'Unknown User'}</h3>
                  <div className="chat-header-status">
                    {selectedConversation.other_user && onlineUsers.has(selectedConversation.other_user.user_id) 
                      ? 'Online' 
                      : 'Offline'}
                  </div>
                </div>
              </div>
              
              {selectedConversation.conversation_type === 'INQUIRY' && inquiryProgress && (
                <div className="text-white text-end me-3">
                  <small className="opacity-90">
                    {inquiryProgress.remaining} messages remaining
                  </small>
                </div>
              )}
              
              {/* Search, Voice Call & Notification Toggle */}
              <div className="chat-header-actions d-flex align-items-center gap-2">
                {/* Voice call - Always visible but disabled for INQUIRY */}
                <button 
                  className={`btn btn-link p-1 position-relative ${
                    selectedConversation.conversation_type === 'INQUIRY' 
                      ? 'text-muted opacity-50' 
                      : 'text-white'
                  }`}
                  onClick={() => {
                    if (selectedConversation.conversation_type !== 'INQUIRY') {
                      // Start voice call using global context
                      const remoteName = selectedConversation.other_user?.name || 'User';
                      const remoteUserId = selectedConversation.other_user?.user_id;
                      const callerName = user?.full_name || user?.name || 'User';
                      
                      console.log('📞 Starting call:', { 
                        conversationId: selectedConversation.id, 
                        remoteUserId, 
                        remoteName, 
                        callerName 
                      });
                      
                      if (remoteUserId) {
                        startCall(selectedConversation.id, remoteUserId, remoteName, callerName);
                      } else {
                        console.error('❌ Cannot start call: remoteUserId is undefined', selectedConversation.other_user);
                      }
                    }
                  }}
                  disabled={selectedConversation.conversation_type === 'INQUIRY'}
                  title={
                    selectedConversation.conversation_type === 'INQUIRY'
                      ? '📞 Voice calls available after booking'
                      : 'Voice call'
                  }
                  style={{ cursor: selectedConversation.conversation_type === 'INQUIRY' ? 'not-allowed' : 'pointer' }}
                >
                  <Phone size={20} />
                  {selectedConversation.conversation_type === 'INQUIRY' && (
                    <Lock 
                      size={10} 
                      className="position-absolute" 
                      style={{ 
                        bottom: '-2px', 
                        right: '-2px', 
                        background: '#6c757d', 
                        borderRadius: '50%', 
                        padding: '2px',
                        color: 'white'
                      }} 
                    />
                  )}
                </button>
                <button 
                  className={`btn btn-link text-white p-1 ${showMessageSearch ? 'active' : ''}`}
                  onClick={() => setShowMessageSearch(!showMessageSearch)}
                  title="Search messages"
                >
                  <Search size={20} />
                </button>
                <button 
                  className={`btn btn-link p-1 ${notificationsEnabled ? 'text-white' : 'text-muted'}`}
                  onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                  title={notificationsEnabled ? 'Mute notifications' : 'Enable notifications'}
                >
                  {notificationsEnabled ? <Bell size={20} /> : <BellOff size={20} />}
                </button>
              </div>
            </div>
            
            {/* Message Search Bar */}
            {showMessageSearch && (
              <div className="chat-search-bar p-2" style={{ background: '#f0f2f5', borderBottom: '1px solid #ddd' }}>
                <div className="input-group">
                  <span className="input-group-text bg-white border-end-0">
                    <Search size={16} className="text-muted" />
                  </span>
                  <input
                    type="text"
                    className="form-control border-start-0"
                    placeholder="Search in conversation..."
                    value={messageSearchQuery}
                    onChange={(e) => setMessageSearchQuery(e.target.value)}
                    autoFocus
                  />
                  {messageSearchQuery && (
                    <button 
                      className="btn btn-outline-secondary"
                      onClick={() => setMessageSearchQuery('')}
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
                {messageSearchQuery && (
                  <small className="text-muted mt-1 d-block">
                    {filteredMessages.length} {filteredMessages.length === 1 ? 'message' : 'messages'} found
                  </small>
                )}
              </div>
            )}
            
            {/* Messages */}
            <div className="chat-messages" ref={messagesContainerRef}>
              {messageGroups.map((group, idx) => (
                <React.Fragment key={idx}>
                  <div className="date-separator">
                    <span>{formatDate(group.date)}</span>
                  </div>
                  
                  {group.messages.map((msg) => {
                    // Robust sender comparison - handle string/object mismatches
                    const msgSenderId = typeof msg.sender_id === 'object' 
                      ? msg.sender_id?.id || msg.sender?.id 
                      : msg.sender_id;
                    const isSent = msgSenderId === currentUserId || msg.sender?.id === currentUserId;
                    
                    // Parse attachment URLs if available
                    let attachmentFiles = [];
                    try {
                      if (msg.attachment_urls) {
                        attachmentFiles = JSON.parse(msg.attachment_urls);
                      } else if (msg.attachments && Array.isArray(msg.attachments)) {
                        attachmentFiles = msg.attachments;
                      }
                    } catch (e) {
                      console.error('Failed to parse attachments:', e);
                    }
                    
                    // Check if message has attachment
                    const hasAttachment = attachmentFiles.length > 0 || msg.content?.includes('📎') || msg.content_type === 'file';
                    
                    // Parse content for display
                    const renderContent = () => {
                      // Split content into text and attachment lines
                      const lines = msg.content ? msg.content.split('\n') : [];
                      const textLines = lines.filter(line => !line.startsWith('📎'));
                      const attachmentLines = lines.filter(line => line.startsWith('📎'));
                      
                      return (
                        <>
                          {/* Text content */}
                          {textLines.length > 0 && (
                            <div className="message-text">
                              {textLines.map((line, idx) => (
                                <span key={idx}>{line}{idx < textLines.length - 1 && <br />}</span>
                              ))}
                            </div>
                          )}
                          
                          {/* Attachment files with URLs */}
                          {attachmentFiles.map((file, idx) => {
                            const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name);
                            
                            if (isImage && file.url) {
                              return (
                                <div key={idx} className="attachment-image-container">
                                  <a href={file.url} target="_blank" rel="noopener noreferrer">
                                    <img 
                                      src={file.url} 
                                      alt={file.name}
                                      className="attachment-image"
                                      loading="lazy"
                                    />
                                  </a>
                                  <div className="attachment-image-name">{file.name}</div>
                                </div>
                              );
                            } else if (file.url) {
                              return (
                                <a 
                                  key={idx} 
                                  href={file.url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="attachment-file-link"
                                >
                                  <FileIcon size={16} />
                                  <span>{file.name}</span>
                                </a>
                              );
                            } else {
                              // Fallback for old messages without URLs
                              const fileName = attachmentLines[idx]?.replace('📎 ', '') || file.name;
                              return (
                                <div key={idx} className="attachment-line">
                                  <FileIcon size={14} />
                                  <span className="attachment-filename">{fileName}</span>
                                </div>
                              );
                            }
                          })}
                        </>
                      );
                    };
                    
                    return (
                      <div key={msg.id} className="message-group">
                        <div className={`message-bubble ${isSent ? 'message-sent' : 'message-received'} ${hasAttachment ? 'has-attachment' : ''}`}>
                          <div className="message-content">{renderContent()}</div>
                          <div className="message-time">
                            {formatTime(msg.created_at)}
                            {isSent && (
                              msg.is_read ? <CheckCheck size={14} /> : <Check size={14} />
                            )}
                            {msg._optimistic && <span className="opacity-50"> • Sending...</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
              
              {currentTypingUser && (
                <div className="typing-indicator">
                  {currentTypingUser.user_name || 'User'} is typing
                  <div className="typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
            
            {/* Scroll to Bottom Button */}
            {showScrollButton && (
              <button 
                className="scroll-to-bottom"
                onClick={() => scrollToBottom(true)}
                aria-label="Scroll to bottom"
              >
                <ChevronDown size={20} />
              </button>
            )}
            
            {/* Input Area */}
            <div className="chat-input-container" {...(isInquiryConversation ? {} : getRootProps())}>
              {!isInquiryConversation && <input {...getInputProps()} />}
              
              {/* Drag overlay - only for non-inquiry */}
              {isDragActive && !isInquiryConversation && (
                <div className="chat-drag-overlay">
                  <ImageIcon size={48} />
                  <p>Drop files here to upload</p>
                </div>
              )}
              
              {inquiryProgress && inquiryProgress.remaining <= 3 && inquiryProgress.remaining > 0 && (
                <div className="inquiry-limit-warning">
                  <AlertCircle size={16} />
                  <span>
                    Only {inquiryProgress.remaining} message{inquiryProgress.remaining !== 1 ? 's' : ''} remaining. 
                    Upgrade to unlimited messaging!
                  </span>
                  <button className="upgrade-cta">
                    Convert to Booking
                  </button>
                </div>
              )}
              
              {isInquiryLimitReached && (
                <div className="inquiry-limit-warning" style={{ background: '#fee2e2', borderColor: '#ef4444' }}>
                  <AlertCircle size={16} style={{ color: '#dc2626' }} />
                  <span style={{ color: '#7f1d1d' }}>
                    Message limit reached. Create a booking to continue chatting!
                  </span>
                  <button className="upgrade-cta">
                    Create Booking
                  </button>
                </div>
              )}
              
              {/* Attachment Preview */}
              {attachments.length > 0 && (
                <div className="attachment-preview-container">
                  {attachments.map((attachment, idx) => (
                    <div key={idx} className="attachment-preview">
                      {attachment.preview ? (
                        <img src={attachment.preview} alt={attachment.name} />
                      ) : (
                        <div className="attachment-file-icon">
                          <FileIcon size={24} />
                        </div>
                      )}
                      <span className="attachment-name">{attachment.name}</span>
                      <button 
                        type="button"
                        className="attachment-remove"
                        onClick={() => removeAttachment(idx)}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Emoji Picker */}
              {showEmojiPicker && (
                <div className="emoji-picker-container">
                  <EmojiPicker 
                    onEmojiClick={onEmojiClick}
                    width={300}
                    height={350}
                    theme="light"
                  />
                </div>
              )}
              
              <form onSubmit={handleSendMessage} className="chat-input-form">
                {/* Attachment button - disabled for inquiry */}
                <button 
                  type="button"
                  className="chat-action-button"
                  onClick={isInquiryConversation ? undefined : openFilePicker}
                  disabled={isInquiryLimitReached || isInquiryConversation}
                  title={isInquiryConversation ? "Book first to send attachments" : "Attach file"}
                  style={isInquiryConversation ? { opacity: 0.4, cursor: 'not-allowed' } : {}}
                >
                  <Paperclip size={20} />
                </button>
                
                {/* Emoji button */}
                <button 
                  type="button"
                  className={`chat-action-button ${showEmojiPicker ? 'active' : ''}`}
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  disabled={isInquiryLimitReached}
                  title="Add emoji"
                >
                  <Smile size={20} />
                </button>
                
                <div className="chat-input-wrapper">
                  <textarea
                    ref={textareaRef}
                    className="chat-textarea"
                    placeholder={isInquiryLimitReached ? "Message limit reached" : "Type a message..."}
                    value={newMessage}
                    onChange={handleTextareaChange}
                    onKeyDown={handleKeyDown}
                    disabled={sending || isInquiryLimitReached}
                    rows={1}
                  />
                </div>
                
                <button 
                  type="submit"
                  className="chat-send-button"
                  disabled={
                    (isInquiryConversation 
                      ? !newMessage.trim() 
                      : (!newMessage.trim() && attachments.length === 0)
                    ) || sending || isInquiryLimitReached
                  }
                >
                  <Send size={18} />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="chat-empty-state">
            <MessageSquare size={64} />
            <h3>Select a conversation</h3>
            <p>Choose a conversation from the left to start messaging</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatContainer;
