import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

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
  const [session, setSession] = useState(null);

  // Fetch user profile from our database
  const fetchUserProfile = async (userId) => {
    try {
      const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:8000";
      
      // Get auth token for authenticated request
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        console.warn('No session token available');
        return null;
      }
      
      // Use /me endpoint which requires authentication
      const response = await fetch(`${API_BASE}/api/profile/me`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
      if (!response.ok) {
        console.warn('Failed to fetch user profile from backend');
        return null;
      }
      
      const data = await response.json();
      // Return user data from response (structure: {success: true, data: {user: {...}, photographer_profile: {...}}})
      return data.data?.user || null;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  };

  useEffect(() => {
    // Check for mock user first
    const mockUserData = localStorage.getItem('mock_user');
    if (mockUserData) {
      try {
        const mockUser = JSON.parse(mockUserData);
        setUser(mockUser);
        setLoading(false);
        return;
      } catch (e) {
        localStorage.removeItem('mock_user');
      }
    }
    
    // Check for alternative auth storage (userRole, userId, userName)
    const userRole = localStorage.getItem('userRole');
    const userId = localStorage.getItem('userId');
    const userName = localStorage.getItem('userName');
    
    if (userRole && userId) {
      // Reconstruct user from alternative storage
      setUser({
        id: userId,
        email: `${userRole}@test.com`,
        full_name: userName || 'Test User',
        role: userRole,
        is_mock: true
      });
      setLoading(false);
      return;
    }
    
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      
      if (session?.user) {
        // Fetch user profile with role from our database
        fetchUserProfile(session.user.id).then(profile => {
          // Only set user if profile exists (registration completed)
          if (profile && profile.role) {
            setUser({
              id: session.user.id,
              email: session.user.email,
              ...profile  // Includes role, full_name, phone, city, etc.
            });
          } else {
            // Profile not found - registration incomplete
            setUser(null);
          }
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event);
      setSession(session);
      
      if (session?.user) {
        // Fetch complete user profile from our database
        const profile = await fetchUserProfile(session.user.id);
        // Only set user if profile exists (registration completed)
        if (profile && profile.role) {
          setUser({
            id: session.user.id,
            email: session.user.email,
            ...profile
          });
        } else {
          // Profile not found - registration incomplete
          setUser(null);
        }
      } else {
        setUser(null);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Get current session token for API calls
  const getToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  };

  const login = async (userData) => {
    // Handle both real Supabase sessions and mock accounts
    if (userData.is_mock) {
      // Mock account - set user directly
      setUser(userData);
      // Store in BOTH formats for compatibility
      localStorage.setItem('mock_user', JSON.stringify(userData));
      localStorage.setItem('userRole', userData.role);
      localStorage.setItem('userId', userData.id);
      localStorage.setItem('userName', userData.full_name || userData.name || 'User');
    } else {
      // Real Supabase session - onAuthStateChange will handle it
      setUser(userData);
    }
  };

  const logout = async () => {
    try {
      // Check if mock account
      const mockUser = localStorage.getItem('mock_user');
      if (mockUser) {
        // Just clear mock data
        localStorage.removeItem('mock_user');
        setUser(null);
        return;
      }
      
      // Real Supabase logout
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      
      // Clear any legacy storage (backwards compatibility)
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      sessionStorage.removeItem('user');
      sessionStorage.removeItem('token');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const value = {
    user,
    session,
    login,
    logout,
    getToken,
    isAuthenticated: !!user,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
