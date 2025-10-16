import React, { useState, useRef, useEffect } from 'react';
import { api } from '../utils/axios';
import '../../css/Chatbot.css';

const Chatbot = () => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [lastSentMessage, setLastSentMessage] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const messagesEndRef = useRef(null);

  const addMessage = (text, sender) => {
    setMessages(prev => [...prev, { text, sender }]);
  };

  const handleSendMessage = async (e) => {
    // only trigger on Enter key or click event
    if ((e.key === 'Enter' || e.type === 'click') && inputMessage.trim() && !isLoading) {
      const message = inputMessage.trim();
      // store last message in case we need to retry
      setLastSentMessage(message);
      addMessage(message, 'user');
      setInputMessage('');
      setErrorMessage('');
      setIsLoading(true);
      try {
        await sendMessage(message);
      } finally {
        setIsLoading(false);
      }
    }
  };

  // sendMessage performs the network call with timeout and sets system messages or error state
  const sendMessage = async (message) => {
    if (!message) return;
    if (!isOnline || (typeof navigator !== 'undefined' && !navigator.onLine)) {
      setErrorMessage('You appear to be offline. Please check your internet connection.');
      addMessage('Error: no internet connection.', 'system');
      return;
    }

    let timeoutId;
    const timeoutMs = 20000; // 20s
    try {
      const postPromise = api.post('/chat', { message });
      const timeoutPromise = new Promise((_, reject) => { timeoutId = setTimeout(() => reject(new Error('timeout')), timeoutMs); });
      const response = await Promise.race([postPromise, timeoutPromise]);
      clearTimeout(timeoutId);

      if (response && response.data) {
        // prefer structured response
        addMessage(response.data.response || 'No response from server.', 'system');
      } else {
        addMessage('No response from server.', 'system');
      }
      setErrorMessage('');
    } catch (error) {
      clearTimeout(timeoutId);
      // provide friendlier messages depending on the failure
      if (error.message === 'timeout') {
        setErrorMessage('The request timed out. Check your connection and try again.');
        addMessage('Error: request timed out.', 'system');
      } else if (error.message === 'Network Error' || (error.request && !error.response)) {
        setErrorMessage('Network error. Please check your internet connection.');
        addMessage('Error: network failure.', 'system');
      } else if (error.response) {
        setErrorMessage(`Server error (${error.response.status}). Please try again later.`);
        addMessage('Sorry, there was an error. Please try again later.', 'system');
      } else {
        setErrorMessage('An unexpected error occurred. Please try again.');
        addMessage('Sorry, there was an error. Please try again later.', 'system');
      }
    }
  };

  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // listen to online/offline events to show status and prevent sending
  useEffect(() => {
    const handleOnline = () => { setIsOnline(true); setErrorMessage(''); };
    const handleOffline = () => { setIsOnline(false); setErrorMessage('You appear to be offline. Check your internet connection.'); };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <>
      {/* Floating Chat Button */}
      <button
        className="chat-button genz-chat-btn"
        style={{ 
          position: 'fixed', 
          bottom: 24, 
          right: 24, 
          zIndex: 999,
          background: 'linear-gradient(135deg, #CD8B3E 0%, #B77B35 100%)',
          color: '#ffffff',
          border: 'none',
          borderRadius: '25px',
          padding: '16px 20px',
          fontSize: '0.9rem',
          fontWeight: '700',
          cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(205, 139, 62, 0.4)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          backdropFilter: 'blur(10px)',
          textShadow: '0 1px 2px rgba(0,0,0,0.1)',
          letterSpacing: '0.5px'
        }}
        onClick={() => setIsOpen(true)}
        aria-label="Open chat window"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width={22} height={22}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
        <span>Chat with us</span>
      </button>

      {/* Chat Window */}
      <section
        className={`chat-window${isOpen ? ' active' : ''}`}
        id="chatWindow"
        aria-label="Chat window"
        tabIndex={-1}
      >
        <header className="chat-header genz-header">
          <span style={{ fontSize: '1.4rem', fontWeight: '800' }}>Vici</span>
          <button className="close-chat genz-close" onClick={() => setIsOpen(false)} aria-label="Close chat window">
            <span style={{ fontSize: '18px' }}>✕</span>
          </button>
        </header>
        {/* Error banner when offline or network issues */}
        {errorMessage && (
          <div style={{ padding: '12px 16px', background: '#fef2f2', color: '#dc2626', borderRadius: '8px', margin: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, border: '1px solid #fecaca' }} role="alert">
            <div style={{ fontSize: '0.9rem' }}>{errorMessage}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {lastSentMessage && (
                <button
                  type="button"
                  onClick={async () => {
                    if (!lastSentMessage) return;
                    setErrorMessage('');
                    setIsLoading(true);
                    try {
                      await sendMessage(lastSentMessage);
                    } finally {
                      setIsLoading(false);
                    }
                  }}
                  style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  Retry
                </button>
              )}
              <button type="button" onClick={() => setErrorMessage('')} style={{ background: 'transparent', border: '1px solid #d1d5db', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' }}>Dismiss</button>
            </div>
          </div>
        )}

        <main className="chat-messages">
          {messages.length === 0 ? (
            <div style={{ 
              color: '#CD8B3E', 
              textAlign: 'center', 
              margin: '2rem 0', 
              fontSize: '0.9rem', 
              fontWeight: '500'
            }}>
              How can we help you today?
            </div>
          ) : (
            <>
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={msg.sender === 'user' ? 'user-bubble' : 'bot-bubble'}
                >
                  {msg.text}
                </div>
              ))}
              {isLoading && (
                <div className="bot-bubble genz-typing" style={{ 
                  fontStyle: 'italic', 
                  color: '#B77B35',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #F7F3ED 0%, #FFEBC9 100%)',
                  border: '1px solid #CD8B3E',
                  padding: '8px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.95rem'
                }}>
                  <span style={{ fontSize: '0.8rem' }}>Vici is typing</span>
                  <div style={{ display: 'flex', gap: '1px' }}>
                    <div style={{ 
                      width: '2px', 
                      height: '2px', 
                      backgroundColor: '#B77B35', 
                      borderRadius: '50%',
                      animation: 'typing-dot 1.4s infinite ease-in-out'
                    }}></div>
                    <div style={{ 
                      width: '2px', 
                      height: '2px', 
                      backgroundColor: '#B77B35', 
                      borderRadius: '50%',
                      animation: 'typing-dot 1.4s infinite ease-in-out 0.2s'
                    }}></div>
                    <div style={{ 
                      width: '2px', 
                      height: '2px', 
                      backgroundColor: '#B77B35', 
                      borderRadius: '50%',
                      animation: 'typing-dot 1.4s infinite ease-in-out 0.4s'
                    }}></div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </main>
        <form className="chat-input genz-input" onSubmit={e => { e.preventDefault(); handleSendMessage({ type: 'click' }); }}>
          <input
            type="text"
            aria-label="Type your message"
            placeholder={isLoading ? 'Please wait...' : (!isOnline ? 'You are offline' : 'Type your message...')}
            value={inputMessage}
            onChange={e => setInputMessage(e.target.value)}
            onKeyDown={handleSendMessage}
            disabled={isLoading || !isOnline}
            style={{
              borderRadius: '16px',
              border: '1px solid #CD8B3E',
              background: '#ffffff',
              fontSize: '0.85rem'
            }}
          />
          <button
            type="submit"
            disabled={isLoading}
            aria-label="Send message"
            tabIndex={-1}
            style={{
              background: 'linear-gradient(135deg, #CD8B3E 0%, #B77B35 100%)',
              borderRadius: '16px',
              padding: '8px 12px',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 6px rgba(205, 139, 62, 0.3)',
              minWidth: '36px',
              height: '36px'
            }}
            onMouseOver={e => {
              if (!isLoading) {
                e.target.style.transform = 'translateY(-1px)';
                e.target.style.boxShadow = '0 3px 8px rgba(205, 139, 62, 0.4)';
              }
            }}
            onMouseOut={e => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 2px 6px rgba(205, 139, 62, 0.3)';
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="#fff" viewBox="0 0 24 24" width={20} height={20}>
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
          </button>
        </form>
      </section>
    </>
  );
};

export default Chatbot;