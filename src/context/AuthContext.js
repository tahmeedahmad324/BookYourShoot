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

    // Check for mock user first
    const mockUserData = localStorage.getItem('mock_user');
    if (mockUserData) {
      try {
        const mockUser = JSON.parse(mockUserData);
        console.log('[AuthContext] Found mock_user in localStorage:', mockUser);
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
      console.log('[AuthContext] Found userRole/userId in localStorage');
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

      // Skip if using mock authentication
      const mockUserData = localStorage.getItem('mock_user');
      const userRole = localStorage.getItem('userRole');
      if (mockUserData || userRole) {
        console.log('[AuthContext] Mock auth detected, skipping Supabase state change');
        return; // Don't override mock auth
      }

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
    // Check if using mock account
    const mockUser = localStorage.getItem('mock_user');
    if (mockUser) {
      const userData = JSON.parse(mockUser);
      // Return mock token format that backend expects in DEV_MODE
      return `mock-jwt-token-${userData.role}`;
    }
    
    // Real Supabase session
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  };

  const login = async (userData) => {
    console.log('[AuthContext] login() called with:', userData);

    // Handle both real Supabase sessions and mock accounts
    if (userData.is_mock) {
      // Mock account - set user directly
      console.log('[AuthContext] Mock account detected, setting user');
      setUser(userData);
      // Store in BOTH formats for compatibility
      localStorage.setItem('mock_user', JSON.stringify(userData));
      localStorage.setItem('userRole', userData.role);
      localStorage.setItem('userId', userData.id);
      localStorage.setItem('userName', userData.full_name || userData.name || 'User');
    } else {
      // Real Supabase session - set user and persist in sessionStorage
      console.log('[AuthContext] Real account, setting user and storing in sessionStorage');
      setUser(userData);
      // Store real user data temporarily to prevent loss during navigation
      sessionStorage.setItem('real_user', JSON.stringify(userData));
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
