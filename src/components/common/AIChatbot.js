import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import './AIChatbot.css';

const AIChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
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

  // Test API on component mount - try different model names
  useEffect(() => {
    const testAPI = async () => {
      const modelsToTry = [
        'gemini-1.5-flash',
        'gemini-1.5-pro',
        'gemini-pro',
        'gemini-1.0-pro',
        'gemini-pro-vision'
      ];

      console.log('🔍 Testing available models...');
      
      for (const modelName of modelsToTry) {
        try {
          console.log(`Testing: ${modelName}...`);
          const model = genAI.getGenerativeModel({ model: modelName });
          const result = await model.generateContent('Say hello');
          const text = result.response.text();
          console.log(`✅ ${modelName} WORKS! Response:`, text);
          return; // Stop after finding first working model
        } catch (error) {
          console.log(`❌ ${modelName} failed:`, error.message);
        }
      }
      
      console.error('⚠️ No working models found');
    };
    testAPI();
  }, []);

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

  const systemContext = `You are a helpful AI assistant for BookYourShoot, a photography booking platform in Pakistan. 

Key Information:
- BookYourShoot connects clients with professional photographers
- Services: Wedding Photography, Portrait Photography, Event Photography, Product Photography, Real Estate Photography
- Features: Album Builder, Reel Generator with AI music suggestions, Equipment Rental, Real-time Chat
- We have 6,000+ verified photographers across 50+ cities in Pakistan
- Average rating: 4.8 stars
- 100,000+ successful bookings
- Currency: PKR (Pakistani Rupees)
- Photographers can rent equipment through our platform
- Clients can build albums and create reels with their photos
- We offer secure payment processing
- Available for both clients and photographers to sign up

User Roles:
- Clients: Can search, book photographers, manage bookings, create albums/reels
- Photographers: Can list services, manage bookings, rent equipment, accept travel bookings
- Admin: Verification and complaint management

Be friendly, concise, and helpful. If you don't know something specific, guide them to contact support or explore the website. Keep responses under 3-4 sentences when possible.`;

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    
    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const model = genAI.getGenerativeModel({ 
        model: 'gemini-pro',
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 500,
        }
      });
      
      // Create a simple prompt with context
      const fullPrompt = `You are a helpful AI assistant for BookYourShoot, a photography booking platform in Pakistan. 

Key Information:
- BookYourShoot connects clients with professional photographers
- Services: Wedding, Portrait, Event, Product Photography
- 6,000+ verified photographers across 50+ cities in Pakistan
- Currency: PKR (Pakistani Rupees)
- Features: Album Builder, Reel Generator, Equipment Rental, Real-time Chat

User question: ${userMessage}

Provide a helpful, friendly response in 2-3 sentences.`;

      const result = await model.generateContent(fullPrompt);
      const response = result.response;
      const text = response.text();

      // Add assistant response
      setMessages(prev => [...prev, { role: 'assistant', content: text }]);
    } catch (error) {
      console.error('Gemini API Error:', error);
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      
      let errorMessage = 'Sorry, I encountered an error. ';
      
      if (error.message?.includes('API key')) {
        errorMessage += 'There seems to be an issue with the API configuration. ';
      } else if (error.message?.includes('quota')) {
        errorMessage += 'The service is temporarily unavailable due to high demand. ';
      } else if (error.message?.includes('CORS')) {
        errorMessage += 'There was a connection issue. ';
      }
      
      errorMessage += 'Please try again or contact our support team.';
      
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
    'How do I become a photographer?'
  ];

  const handleQuickQuestion = (question) => {
    setInputMessage(question);
    inputRef.current?.focus();
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
            <button 
              className="chatbot-close"
              onClick={() => setIsOpen(false)}
              aria-label="Close chat"
            >
              ✕
            </button>
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

          {/* Quick Questions */}
          {messages.length === 1 && (
            <div className="chatbot-quick-questions">
              {quickQuestions.map((question, index) => (
                <button
                  key={index}
                  className="quick-question-btn"
                  onClick={() => handleQuickQuestion(question)}
                >
                  {question}
                </button>
              ))}
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
