import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { useLocation, useNavigate } from 'react-router-dom';
import './AIChatbotV2.css';

const AIChatbotV2 = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [contextInfo, setContextInfo] = useState({});
  const [authState, setAuthState] = useState({
    isLoggedIn: !!localStorage.getItem('token'),
    userRole: null
  });
  const [bookingFlow, setBookingFlow] = useState(null); // For interactive booking wizard
  const [followUps, setFollowUps] = useState([]); // Suggested follow-up questions
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

  // Detect user context from URL and localStorage/sessionStorage
  const detectContext = useCallback(() => {
    const path = location.pathname;
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
    let user = null;
    
    try {
      user = userStr ? JSON.parse(userStr) : null;
    } catch (e) {
      console.error('Error parsing user data:', e);
    }

    // Determine current page
    let currentPage = 'home';
    if (path.includes('/dashboard')) currentPage = 'dashboard';
    else if (path.includes('/booking')) currentPage = 'booking';
    else if (path.includes('/album')) currentPage = 'album';
    else if (path.includes('/reel')) currentPage = 'reel';
    else if (path.includes('/profile')) currentPage = 'profile';
    else if (path.includes('/photographer')) currentPage = 'photographer';
    else if (path.includes('/equipment')) currentPage = 'equipment';
    else if (path.includes('/music')) currentPage = 'music';
    else if (path.includes('/search')) currentPage = 'search';

    // Determine user role
    let userRole = 'guest';
    if (user?.role) {
      userRole = user.role;
    } else if (path.includes('/client')) {
      userRole = 'client';
    } else if (path.includes('/photographer')) {
      userRole = 'photographer';
    } else if (path.includes('/admin')) {
      userRole = 'admin';
    }

    // Detect event type from URL params or path
    let eventType = null;
    const urlParams = new URLSearchParams(location.search);
    if (urlParams.get('event')) eventType = urlParams.get('event');
    else if (path.includes('mehndi')) eventType = 'mehndi';
    else if (path.includes('barat')) eventType = 'barat';
    else if (path.includes('walima')) eventType = 'walima';
    else if (path.includes('wedding')) eventType = 'wedding';
    else if (path.includes('birthday')) eventType = 'birthday';
    else if (path.includes('corporate')) eventType = 'corporate';

    // Detect booking stage
    let bookingStage = 'none';
    if (path.includes('/search') || path.includes('/photographer')) bookingStage = 'searching';
    else if (path.includes('/booking/confirm')) bookingStage = 'booked';
    else if (path.includes('/booking/active')) bookingStage = 'in_progress';
    else if (path.includes('/booking/completed') || path.includes('/review')) bookingStage = 'completed';

    return {
      userRole,
      currentPage,
      eventType,
      bookingStage,
      isLoggedIn: !!token,
      userName: user?.full_name || null
    };
  }, [location]);

  // Update context when route changes
  useEffect(() => {
    const ctx = detectContext();
    setContextInfo(ctx);
  }, [location, detectContext]);

  // Monitor authentication state changes (login/logout)
  useEffect(() => {
    const checkAuthState = () => {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
      let user = null;
      
      try {
        user = userStr ? JSON.parse(userStr) : null;
      } catch (e) {
        console.error('Error parsing user:', e);
      }

      const newAuthState = {
        isLoggedIn: !!token,
        userRole: user?.role || 'guest'
      };

      // Check if auth state changed
      if (newAuthState.isLoggedIn !== authState.isLoggedIn || 
          newAuthState.userRole !== authState.userRole) {
        console.log('Auth state changed:', authState, '->', newAuthState);
        setAuthState(newAuthState);
        
        // Reset chatbot on auth change
        setMessages([]);
        setSessionId(null);
        
        // Update context immediately
        const ctx = detectContext();
        setContextInfo(ctx);
      }
    };

    // Check on mount and periodically
    checkAuthState();
    const interval = setInterval(checkAuthState, 1000);

    // Listen for storage events (from other tabs)
    window.addEventListener('storage', checkAuthState);
    
    // Listen for custom auth events (from same tab)
    window.addEventListener('authChanged', checkAuthState);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', checkAuthState);
      window.removeEventListener('authChanged', checkAuthState);
    };
  }, [authState, detectContext]);

  // Welcome message based on context
  useEffect(() => {
    if (messages.length === 0 && contextInfo.userRole) {
      const ctx = contextInfo;
      let welcomeMsg = `Hi${ctx.userName ? ` ${ctx.userName.split(' ')[0]}` : ''}! 👋 I'm BookBot, your AI assistant.\n\n`;
      
      if (ctx.userRole === 'photographer') {
        welcomeMsg += "I can help you with:\n• Managing your profile & portfolio\n• Handling booking requests\n• Equipment rentals\n• Earnings & payouts\n• Tips to get more clients";
      } else if (ctx.userRole === 'admin') {
        welcomeMsg += "I can help you with:\n• User management\n• Booking oversight\n• Support tickets\n• Platform analytics";
      } else if (ctx.userRole === 'client') {
        if (ctx.currentPage === 'search' || ctx.currentPage === 'photographer') {
          welcomeMsg += "Looking for the perfect photographer? I can help you:\n• Compare photographers\n• Understand pricing\n• Check availability\n• Find the right style";
        } else {
          welcomeMsg += "I can help you with:\n• Finding photographers\n• Booking process\n• Album & Reel creation\n• Pricing questions\n• Platform features";
        }
      } else {
        welcomeMsg += "I can help you with:\n• Finding photographers\n• Booking process\n• Album & Reel creation\n• Pricing questions\n• Platform features";
      }
      
      welcomeMsg += "\n\n**What would you like to know?**";
      
      setMessages([{ role: 'assistant', content: welcomeMsg }]);
    }
  }, [contextInfo, messages.length]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      // Scroll to bottom when maximizing
      scrollToBottom();
      // Focus input
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  }, [isOpen, isMinimized]);

  const sendMessage = async (userMessage) => {
    if (!userMessage.trim() || isLoading) return;

    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const ctx = detectContext();
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      // Try authenticated endpoint first if token exists, fallback to public on 401
      let endpoint = token ? '/api/chatbot/ask' : '/api/chatbot/ask-public';
      let headers = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      let response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          message: userMessage,
          session_id: sessionId,
          user_role: ctx.userRole,
          booking_stage: ctx.bookingStage,
          event_type: ctx.eventType,
          current_page: ctx.currentPage
        })
      });

      // If authenticated endpoint returns 401, fallback to public endpoint
      if (!response.ok && response.status === 401 && token) {
        console.log('Auth failed, falling back to public endpoint');
        endpoint = '/api/chatbot/ask-public';
        response = await fetch(`${API_BASE}${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: userMessage,
            session_id: sessionId,
            user_role: ctx.userRole,
            booking_stage: ctx.bookingStage,
            event_type: ctx.eventType,
            current_page: ctx.currentPage
          })
        });
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      setSessionId(data.session_id);
      
      // Add message with unique ID for feedback tracking
      const messageId = `msg_${Date.now()}`;
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: data.response,
        id: messageId,
        feedback: null // null = no feedback, 'up' or 'down'
      }]);
      
      // Generate follow-up suggestions based on the response
      generateFollowUps(userMessage, data.response);
      
    } catch (error) {
      console.error('Chatbot API Error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "I'm having trouble connecting right now. Please try again or contact **support@bookyourshoot.com** for help.",
        id: `msg_${Date.now()}`,
        feedback: null
      }]);
      setFollowUps([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Generate contextual follow-up suggestions
  const generateFollowUps = (userQuery, botResponse) => {
    const query = userQuery.toLowerCase();
    const response = botResponse.toLowerCase();
    
    let suggestions = [];
    
    // Booking-related follow-ups
    if (query.includes('book') || query.includes('photographer') || response.includes('booking')) {
      suggestions = [
        { label: '📍 Find nearby photographers', query: 'Show photographers near me' },
        { label: '💰 Compare prices', query: 'What are typical photography prices?' },
        { label: '📅 Start booking', query: 'Help me book a photographer step by step' }
      ];
    }
    // Pricing follow-ups
    else if (query.includes('price') || query.includes('cost') || query.includes('pkr')) {
      suggestions = [
        { label: '🔍 Search photographers', query: 'Take me to photographer search' },
        { label: '📦 Package details', query: 'What do photography packages include?' },
        { label: '💳 Payment options', query: 'What payment methods do you accept?' }
      ];
    }
    // Event-specific follow-ups
    else if (query.includes('wedding') || query.includes('mehndi') || query.includes('barat')) {
      suggestions = [
        { label: '👰 Wedding packages', query: 'Show me full wedding package options' },
        { label: '📸 Pre-wedding shoots', query: 'Do you offer pre-wedding photoshoots?' },
        { label: '🎥 Video coverage', query: 'Is video/cinematography available?' }
      ];
    }
    // Album/Reel follow-ups
    else if (query.includes('album') || query.includes('reel') || query.includes('photo')) {
      suggestions = [
        { label: '🖼️ Album layouts', query: 'What album layouts are available?' },
        { label: '🎵 Add music', query: 'Can I add Spotify music to my reel?' },
        { label: '💾 Download options', query: 'How do I download my album or reel?' }
      ];
    }
    // General follow-ups
    else {
      suggestions = [
        { label: '📸 Browse photographers', query: 'Show me top photographers' },
        { label: '❓ How it works', query: 'How does BookYourShoot work?' },
        { label: '🆘 Get help', query: 'I need help with my account' }
      ];
    }
    
    setFollowUps(suggestions.slice(0, 3)); // Max 3 suggestions
  };

  // Booking Flow Wizard
  const startBookingFlow = () => {
    setBookingFlow({
      step: 1,
      data: {
        eventType: null,
        city: null,
        date: null,
        budget: null
      }
    });
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: "🎯 **Let's find you the perfect photographer!**\n\nWhat type of event are you planning?",
      id: `msg_${Date.now()}`,
      isBookingStep: true,
      bookingOptions: [
        { label: '💒 Wedding', value: 'wedding' },
        { label: '🎉 Mehndi/Dholki', value: 'mehndi' },
        { label: '🎂 Birthday', value: 'birthday' },
        { label: '👔 Corporate', value: 'corporate' },
        { label: '📷 Portrait', value: 'portrait' },
        { label: '🎭 Other', value: 'other' }
      ]
    }]);
    setFollowUps([]);
  };

  const handleBookingOption = (option) => {
    if (!bookingFlow) return;
    
    const step = bookingFlow.step;
    const newData = { ...bookingFlow.data };
    
    // Add user's selection as a message
    setMessages(prev => [...prev, { role: 'user', content: option.label }]);
    
    if (step === 1) {
      // Event type selected
      newData.eventType = option.value;
      setBookingFlow({ step: 2, data: newData });
      
      setTimeout(() => {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `Great choice! 📍 **Which city is your ${option.label.split(' ')[1] || 'event'} in?**`,
          id: `msg_${Date.now()}`,
          isBookingStep: true,
          bookingOptions: [
            { label: '🏙️ Lahore', value: 'lahore' },
            { label: '🌆 Karachi', value: 'karachi' },
            { label: '🏛️ Islamabad', value: 'islamabad' },
            { label: '🌇 Rawalpindi', value: 'rawalpindi' },
            { label: '🏘️ Faisalabad', value: 'faisalabad' },
            { label: '📍 Other', value: 'other' }
          ]
        }]);
      }, 300);
    } else if (step === 2) {
      // City selected
      newData.city = option.value;
      setBookingFlow({ step: 3, data: newData });
      
      setTimeout(() => {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `Perfect! 💰 **What's your approximate budget?**`,
          id: `msg_${Date.now()}`,
          isBookingStep: true,
          bookingOptions: [
            { label: '💵 Under 20K', value: 'under_20k' },
            { label: '💵 20K - 50K', value: '20k_50k' },
            { label: '💰 50K - 100K', value: '50k_100k' },
            { label: '💎 100K+', value: 'above_100k' },
            { label: '🤷 Not sure', value: 'flexible' }
          ]
        }]);
      }, 300);
    } else if (step === 3) {
      // Budget selected - complete the flow
      newData.budget = option.value;
      setBookingFlow(null);
      
      // Build search URL - use 'location' and 'service' to match search page params
      const searchParams = new URLSearchParams();
      if (newData.city !== 'other') searchParams.set('location', newData.city);
      if (newData.eventType !== 'other') searchParams.set('service', newData.eventType);
      
      setTimeout(() => {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `🎉 **Perfect!** I found photographers for your **${newData.eventType}** in **${newData.city}**.\n\n` +
            `Click below to see matching photographers:\n\n` +
            `👉 [View Photographers](/search?${searchParams.toString()})\n\n` +
            `_Tip: You can filter by ratings, price, and availability on the search page!_`,
          id: `msg_${Date.now()}`
        }]);
        
        setFollowUps([
          { label: '🔍 Go to search', query: 'navigate:/search?' + searchParams.toString() },
          { label: '💬 More questions', query: 'What else should I know before booking?' },
          { label: '🔄 Start over', query: 'Help me book a photographer step by step' }
        ]);
      }, 300);
    }
  };

  const handleSendMessage = () => {
    // Check if user is trying to start booking flow
    const msg = inputMessage.toLowerCase();
    if (msg.includes('book') && (msg.includes('step') || msg.includes('help me') || msg.includes('start'))) {
      setInputMessage('');
      startBookingFlow();
      return;
    }
    
    // Handle navigation commands from follow-ups
    if (inputMessage.startsWith('navigate:')) {
      const path = inputMessage.replace('navigate:', '');
      navigate(path);
      setIsMinimized(true);
      setInputMessage('');
      return;
    }
    
    sendMessage(inputMessage);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setSessionId(null);
    setBookingFlow(null);
    setFollowUps([]);
    // Trigger welcome message reload
    setTimeout(() => {
      const ctx = contextInfo;
      let welcomeMsg = `Chat cleared! 🔄 How can I help you${ctx.userName ? `, ${ctx.userName.split(' ')[0]}` : ''}?`;
      setMessages([{ role: 'assistant', content: welcomeMsg, id: `msg_${Date.now()}` }]);
    }, 100);
  };

  // Quick action buttons based on context
  const getQuickActions = () => {
    const ctx = contextInfo;
    
    if (ctx.userRole === 'photographer') {
      return [
        { label: '📊 View my stats', query: 'How can I see my booking statistics and earnings?' },
        { label: '✏️ Update profile', query: 'How do I update my photographer profile and portfolio?' },
        { label: '💰 Payout help', query: 'How do payouts work and when do I get paid?' },
        { label: '📈 Get more bookings', query: 'Tips to get more clients and bookings' }
      ];
    }
    
    if (ctx.userRole === 'admin') {
      return [
        { label: '👥 User management', query: 'How do I manage users and verify photographers?' },
        { label: '🎫 Support tickets', query: 'How do I handle support tickets and complaints?' },
        { label: '💳 Payments', query: 'How do I oversee payments and payouts?' },
        { label: '📊 Analytics', query: 'How can I view platform statistics?' }
      ];
    }
    
    if (ctx.currentPage === 'search' || ctx.bookingStage === 'searching') {
      return [
        { label: '💰 Pricing guide', query: 'What are typical photography prices in Pakistan?' },
        { label: '📍 Nearby photographers', query: 'How do I find photographers near me?' },
        { label: '⭐ Best rated', query: 'How do I find the best rated photographers?' },
        { label: '🎯 By specialty', query: 'Can I filter photographers by event type like wedding or mehndi?' }
      ];
    }
    
    if (ctx.bookingStage === 'booked' || ctx.bookingStage === 'confirmed') {
      return [
        { label: '💬 Contact photographer', query: 'How do I message my booked photographer?' },
        { label: '📅 Reschedule', query: 'Can I reschedule my booking?' },
        { label: '❌ Cancel booking', query: 'How do I cancel a booking?' },
        { label: '💳 Payment status', query: 'How do I check my payment status?' }
      ];
    }
    
    if (ctx.bookingStage === 'completed') {
      return [
        { label: '📸 Album builder', query: 'How do I create an album from my photos?' },
        { label: '🎬 Create reel', query: 'How does the reel generator work?' },
        { label: '⭐ Leave review', query: 'How do I leave a review for my photographer?' },
        { label: '🔄 Book again', query: 'How do I book the same photographer again?' }
      ];
    }
    
    // Default quick actions
    return [
      { label: '📸 Find photographer', query: 'How do I find and book a photographer?' },
      { label: '💰 Pricing', query: 'What are typical photography prices?' },
      { label: '🎬 Reel generator', query: 'What is the reel generator feature?' },
      { label: '❓ How it works', query: 'How does BookYourShoot work?' }
    ];
  };

  return (
    <>
      {/* Floating Chat Button */}
      <button 
        className={`chatbot-fab ${isOpen ? 'hidden' : ''}`}
        onClick={() => setIsOpen(true)}
        aria-label="Open AI Assistant"
      >
        <svg className="fab-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 13.5997 2.37562 15.1116 3.04346 16.4525C3.22094 16.8088 3.28001 17.2161 3.17712 17.6006L2.58151 19.8267C2.32295 20.793 3.20701 21.677 4.17335 21.4185L6.39939 20.8229C6.78393 20.72 7.19121 20.7791 7.54753 20.9565C8.88837 21.6244 10.4003 22 12 22Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M8 10.5H16" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          <path d="M8 14H13" stroke="white" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        <span className="fab-pulse"></span>
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className={`chatbot-container ${isMinimized ? 'minimized' : ''}`}>
          {/* Header */}
          <div className="chatbot-header" onClick={() => isMinimized && setIsMinimized(false)}>
            <div className="header-left">
              <div className="bot-avatar">
                <span>🤖</span>
                <span className="status-indicator"></span>
              </div>
              <div className="header-info">
                <h4>BookBot</h4>
                <span className="status-text">
                  {isLoading ? 'Typing...' : 'Online'}
                </span>
              </div>
            </div>
            <div className="header-actions">
              <button 
                className="header-btn" 
                onClick={(e) => { e.stopPropagation(); clearChat(); }}
                title="Clear chat"
              >
                🗑️
              </button>
              <button 
                className="header-btn"
                onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }}
                title={isMinimized ? "Expand" : "Minimize"}
              >
                {isMinimized ? '⬆️' : '➖'}
              </button>
              <button 
                className="header-btn close-btn"
                onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
                title="Close"
              >
                ✕
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Messages Area */}
              <div className="chatbot-messages">
                {messages.map((message, index) => (
                  <div 
                    key={index} 
                    className={`message ${message.role}`}
                  >
                    {message.role === 'assistant' && (
                      <div className="message-avatar">🤖</div>
                    )}
                    <div className="message-bubble">
                      {message.role === 'assistant' ? (
                        <>
                          <ReactMarkdown
                            components={{
                              p: ({children}) => <p>{children}</p>,
                              ul: ({children}) => <ul>{children}</ul>,
                              ol: ({children}) => <ol>{children}</ol>,
                              li: ({children}) => <li>{children}</li>,
                              strong: ({children}) => <strong>{children}</strong>,
                              em: ({children}) => <em>{children}</em>,
                              code: ({inline, children}) => 
                                inline ? <code className="inline-code">{children}</code> : 
                                <pre className="code-block"><code>{children}</code></pre>,
                              a: ({href, children}) => {
                                // Check if it's an internal link (starts with /)
                                const isInternal = href && href.startsWith('/');
                                if (isInternal) {
                                  return (
                                    <button 
                                      className="chatbot-link" 
                                      onClick={(e) => {
                                        e.preventDefault();
                                        navigate(href);
                                        setIsMinimized(true); // Minimize chatbot after navigation
                                      }}
                                    >
                                      {children}
                                    </button>
                                  );
                                }
                                // External links open in new tab
                                return <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>;
                              }
                            }}
                          >
                            {message.content}
                          </ReactMarkdown>

                          {/* Booking Flow Options */}
                          {message.isBookingStep && message.bookingOptions && (
                            <div className="booking-options">
                              {message.bookingOptions.map((option, idx) => (
                                <button
                                  key={idx}
                                  className="booking-option-btn"
                                  onClick={() => handleBookingOption(option)}
                                >
                                  {option.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </>
                      ) : (
                        <p>{message.content}</p>
                      )}
                    </div>
                  </div>
                ))}
                
                {isLoading && (
                  <div className="message assistant">
                    <div className="message-avatar">🤖</div>
                    <div className="message-bubble typing">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Follow-up Suggestions */}
              {followUps.length > 0 && !isLoading && (
                <div className="follow-up-suggestions">
                  {followUps.map((followUp, index) => (
                    <button
                      key={index}
                      className="follow-up-btn"
                      onClick={() => {
                        if (followUp.query.startsWith('navigate:')) {
                          const path = followUp.query.replace('navigate:', '');
                          navigate(path);
                          setIsMinimized(true);
                        } else {
                          sendMessage(followUp.query);
                        }
                        setFollowUps([]);
                      }}
                    >
                      {followUp.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Quick Actions */}
              {messages.length <= 2 && followUps.length === 0 && (
                <div className="quick-actions">
                  {getQuickActions().map((action, index) => (
                    <button
                      key={index}
                      className="quick-action-btn"
                      onClick={() => sendMessage(action.query)}
                      disabled={isLoading}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Input Area */}
              <div className="chatbot-input-area">
                <textarea
                  ref={inputRef}
                  className="chat-input"
                  placeholder="Type your message..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  rows="1"
                  disabled={isLoading}
                />
                <button 
                  className="send-btn"
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || isLoading}
                  aria-label="Send message"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                  </svg>
                </button>
              </div>

              {/* Footer */}
              <div className="chatbot-footer">
                <span>Powered by AI • Context-aware assistance</span>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
};

export default AIChatbotV2;
