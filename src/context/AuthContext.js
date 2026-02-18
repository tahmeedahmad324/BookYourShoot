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
  // sessionParam is optional - if provided, use it directly instead of calling getSession()
  const fetchUserProfile = async (userId, sessionParam = null) => {
    console.log('[AuthContext] fetchUserProfile called for userId:', userId);
    try {
      const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:8000";

      // Use provided session or get it from Supabase
      let accessToken;
      if (sessionParam?.access_token) {
        console.log('[AuthContext] Using provided session');
        accessToken = sessionParam.access_token;
      } else {
        // Get auth token for authenticated request - only if session not provided
        console.log('[AuthContext] Getting session from Supabase...');
        const { data: { session } } = await supabase.auth.getSession();
        console.log('[AuthContext] Session received:', session ? 'yes' : 'no');
        accessToken = session?.access_token;
      }

      if (!accessToken) {
        console.warn('[AuthContext] No session token available');
        return null;
      }

      // Use /me endpoint which requires authentication
      console.log('[AuthContext] Fetching profile from:', `${API_BASE}/api/profile/me`);
      const response = await fetch(`${API_BASE}/api/profile/me`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      console.log('[AuthContext] Profile fetch response status:', response.status);

      if (!response.ok) {
        console.warn('[AuthContext] Failed to fetch user profile from backend');
        return null;
      }

      const data = await response.json();
      console.log('[AuthContext] Profile data received:', data);
      // Return user data from response (structure: {success: true, data: {user: {...}, photographer_profile: {...}}})
      return data.data?.user || null;
    } catch (error) {
      console.error('[AuthContext] Error fetching user profile:', error);
      return null;
    }
  };

  useEffect(() => {
    console.log('[AuthContext] useEffect initializing...');

    // Clear any old mock user data (migration to real auth)
    localStorage.removeItem('mock_user');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userId');
    localStorage.removeItem('userName');
    console.log('[AuthContext] Cleared any legacy mock user data');

    // Check for real user stored in sessionStorage (from login)
    const realUserData = sessionStorage.getItem('real_user');
    if (realUserData) {
      try {
        const realUser = JSON.parse(realUserData);
        console.log('[AuthContext] Found real_user in sessionStorage:', realUser);
        setUser(realUser);
        setLoading(false);
        // Don't return - still set up Supabase listener for session updates
      } catch (e) {
        sessionStorage.removeItem('real_user');
      }
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);

      if (session?.user) {
        // Fetch user profile with role from our database
        fetchUserProfile(session.user.id, session).then(profile => {
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

      // Always use real Supabase authentication (no mock bypass)

      if (session?.user) {
        // Fetch complete user profile from our database
        const profile = await fetchUserProfile(session.user.id, session);
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
    // If logged in with mock account, return mock token
    if (user?.is_mock) {
      const mockToken = `mock-jwt-token-${user.role}`;
      console.log('[AuthContext] getToken() - Using mock token for test account');
      return mockToken;
    }
    
    // Otherwise get real Supabase token
    console.log('[AuthContext] getToken() - Fetching real Supabase token');
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      console.warn('[AuthContext] No Supabase session available');
      return null;
    }
    
    console.log('[AuthContext] Real token obtained from Supabase');
    return session.access_token;
  };

  const login = async (userData) => {
    console.log('[AuthContext] login() called with:', userData);

    // Handle both real Supabase sessions and mock accounts
    // Always use real Supabase session
    console.log('[AuthContext] Setting user from Supabase session');
    setUser(userData);
    // Store user data temporarily to prevent loss during navigation
    sessionStorage.setItem('real_user', JSON.stringify(userData));
  };

  const logout = async () => {
    try {
      // If mock account, just clear state
      if (user?.is_mock) {
        console.log('[AuthContext] Logging out mock account');
        setUser(null);
        sessionStorage.removeItem('real_user');
        return;
      }
      
      // Otherwise use real Supabase logout
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);

      // Clear ALL user-related storage
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      localStorage.removeItem('userId');
      localStorage.removeItem('userRole');
      localStorage.removeItem('userName');
      localStorage.removeItem('mock_user');
      sessionStorage.removeItem('user');
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('real_user');
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
    loading,
    userId: user?.id || localStorage.getItem('userId'),
    userRole: user?.role || localStorage.getItem('userRole')
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
