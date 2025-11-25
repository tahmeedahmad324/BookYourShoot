import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import './AIChatbot.css';

const AIChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showFAQs, setShowFAQs] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hi! 👋 I\'m your BookYourShoot assistant. I can help you with:\n\n• Finding photographers\n• Understanding our services\n• Booking process\n• Pricing information\n• Account questions\n\nWhat would you like to know?'
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const genAI = new GoogleGenerativeAI('');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const sendMessageToAI = async (userMessage, retryCount = 0) => {
    const maxRetries = 2;
    
    try {
      // Get current date and time
      const now = new Date();
      const currentDateTime = now.toLocaleString('en-PK', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Karachi'
      });

      // Build conversation history for context
      const conversationHistory = messages
        .slice(-6) // Last 6 messages (3 exchanges)
        .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
        .join('\n');

      const systemPrompt = `You are a helpful AI assistant for BookYourShoot, a photography booking platform in Pakistan.

Current Date & Time: ${currentDateTime} (Pakistan Standard Time)

Platform Information:
- 6,000+ verified photographers across 50+ cities in Pakistan (Karachi, Lahore, Islamabad, Rawalpindi, Faisalabad, Multan, etc.)
- Services: Wedding Photography, Portrait Photography, Event Photography, Product Photography, Real Estate Photography
- Currency: PKR (Pakistani Rupees)
- Average Pricing: PKR 5,000-50,000 per session
- Special Features:
  * Album Builder - Create beautiful digital photo albums
  * Reel Generator - AI-powered video reels with Spotify music integration
  * Equipment Rental - Rent cameras, lenses, lighting equipment
  * Real-time Chat - Direct messaging with photographers
  * CNIC Verification - All photographers are verified for safety
  * Travel Bookings - Many photographers accept travel assignments
  * Secure Payments - Protected payment processing

Booking Process:
1. Search by location and photography type
2. View photographer profiles, portfolios, and ratings
3. Check availability and pricing
4. Send booking request with event details
5. Photographer confirms and provides quote
6. Make secure payment
7. Communicate via real-time chat

Recent Conversation:
${conversationHistory}

User's Current Question: ${userMessage}

Instructions:
- Be friendly, helpful, and conversational
- Provide specific, detailed answers
- If asked about date/time, use the current date/time provided above
- Reference conversation history when relevant
- For booking questions, guide users through the process
- For technical issues, suggest contacting support@bookyourshoot.com
- Keep responses natural and engaging (3-5 sentences unless more detail needed)`;

      const model = genAI.getGenerativeModel({ 
        model: 'gemini-2.5-flash',
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 800,
          topP: 0.95,
        }
      });
      
      const result = await model.generateContent(systemPrompt);
      return result.response.text();
    } catch (error) {
      // Retry logic for network errors
      if (retryCount < maxRetries && (error.message?.includes('fetch') || error.message?.includes('network'))) {
        console.log(`Retrying... Attempt ${retryCount + 1} of ${maxRetries}`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        return sendMessageToAI(userMessage, retryCount + 1);
      }
      throw error;
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const text = await sendMessageToAI(userMessage);
      setMessages(prev => [...prev, { role: 'assistant', content: text }]);
    } catch (error) {
      console.error('Gemini API Error:', error);
      
      let errorMessage = 'Sorry, I encountered an error. ';
      
      if (error.message?.includes('fetch') || error.message?.includes('network')) {
        errorMessage = 'Connection issue detected. Please check your internet connection and try again.';
      } else if (error.message?.includes('quota') || error.message?.includes('429')) {
        errorMessage = 'API quota exceeded. Please wait a moment and try again.';
      } else {
        errorMessage = 'Unable to process your request at the moment. Please try again or contact support@bookyourshoot.com';
      }
      
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: errorMessage
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const quickQuestions = [
    'How do I book a photographer?',
    'What services do you offer?',
    'How does pricing work?',
    'How do I become a photographer?',
    'What cities do you cover?',
    'Can I cancel my booking?',
    'How does the Album Builder work?',
    'What is the Reel Generator?',
    'Can photographers travel for events?',
    'How do I contact a photographer?'
  ];

  const handleQuickQuestion = async (question) => {
    setMessages(prev => [...prev, { role: 'user', content: question }]);
    setIsLoading(true);
    
    try {
      const text = await sendMessageToAI(question);
      setMessages(prev => [...prev, { role: 'assistant', content: text }]);
    } catch (error) {
      console.error('Quick question error:', error);
      
      let errorMessage = 'Sorry, I couldn\'t process that question. ';
      
      if (error.message?.includes('fetch') || error.message?.includes('network')) {
        errorMessage = 'Connection issue. Please check your internet and try again.';
      } else {
        errorMessage = 'Please try typing your question instead.';
      }
      
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: errorMessage
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Chat Button */}
      <button 
        className={`chatbot-button ${isOpen ? 'hidden' : ''}`}
        onClick={() => setIsOpen(true)}
        aria-label="Open AI Assistant"
      >
        <span className="chatbot-icon">💬</span>
        <span className="chatbot-badge">AI</span>
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="chatbot-window">
          {/* Header */}
          <div className="chatbot-header">
            <div className="chatbot-header-content">
              <div className="chatbot-avatar">🤖</div>
              <div>
                <h4 className="chatbot-title">AI Assistant</h4>
                <p className="chatbot-status">
                  <span className="status-dot"></span>
                  Always available
                </p>
              </div>
            </div>
            <div className="chatbot-header-actions">
              <button 
                className="chatbot-faq-toggle"
                onClick={() => setShowFAQs(!showFAQs)}
                aria-label="Toggle FAQs"
                title="Show common questions"
              >
                FAQ
              </button>
              <button 
                className="chatbot-close"
                onClick={() => setIsOpen(false)}
                aria-label="Close chat"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="chatbot-messages">
            {messages.map((message, index) => (
              <div 
                key={index} 
                className={`message ${message.role}`}
              >
                <div className="message-avatar">
                  {message.role === 'assistant' ? '🤖' : '👤'}
                </div>
                <div className="message-content">
                  {message.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="message assistant">
                <div className="message-avatar">🤖</div>
                <div className="message-content">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Questions - Show when chat is empty OR FAQ panel is open */}
          {(messages.length === 1 || showFAQs) && (
            <div className={`chatbot-quick-questions ${showFAQs ? 'faq-panel-open' : ''}`}>
              {showFAQs && (
                <div className="faq-header">
                  <h5>💡 Common Questions</h5>
                  <button 
                    className="faq-close-btn"
                    onClick={() => setShowFAQs(false)}
                    aria-label="Close FAQs"
                  >
                    ✕
                  </button>
                </div>
              )}
              <div className="faq-grid">
                {(showFAQs ? quickQuestions : quickQuestions.slice(0, 4)).map((question, index) => (
                  <button
                    key={index}
                    className="quick-question-btn"
                    onClick={() => {
                      handleQuickQuestion(question);
                      setShowFAQs(false);
                    }}
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="chatbot-input-container">
            <textarea
              ref={inputRef}
              className="chatbot-input"
              placeholder="Ask me anything..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              rows="1"
              disabled={isLoading}
            />
            <button 
              className="chatbot-send"
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isLoading}
              aria-label="Send message"
            >
              <span>➤</span>
            </button>
          </div>

          {/* Footer */}
          <div className="chatbot-footer">
            Powered by Gemini AI
          </div>
        </div>
      )}
    </>
  );
};

export default AIChatbot;