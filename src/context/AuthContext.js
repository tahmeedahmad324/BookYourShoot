import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Attempt to load from localStorage (remember me) or sessionStorage
    const loadStored = () => {
      const lsUser = localStorage.getItem('user');
      const lsToken = localStorage.getItem('token');
      if (lsUser && lsToken) return { user: JSON.parse(lsUser), token: lsToken };
      const ssUser = sessionStorage.getItem('user');
      const ssToken = sessionStorage.getItem('token');
      if (ssUser && ssToken) return { user: JSON.parse(ssUser), token: ssToken };
      return null;
    };
    const stored = loadStored();
    if (stored) {
      setUser(stored.user);
    }
    setLoading(false);
  }, []);

  const login = (userData, token, remember = false) => {
    setUser(userData);
    // Clear any previous persisted state
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('token');
    if (remember) {
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('token', token);
    } else {
      sessionStorage.setItem('user', JSON.stringify(userData));
      sessionStorage.setItem('token', token);
    }
    
    // Notify other components (like chatbot) about auth change
    window.dispatchEvent(new Event('authChanged'));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('token');
    
    // Notify other components (like chatbot) about auth change
    window.dispatchEvent(new Event('authChanged'));
  };

  const value = {
    user,
    login,
    logout,
    isAuthenticated: !!user,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
