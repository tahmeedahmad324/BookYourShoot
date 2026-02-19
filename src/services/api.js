/**
 * Centralized API Client with Automatic Authentication
 * 
 * This module provides a configured axios instance that automatically:
 * - Attaches Supabase JWT tokens to all requests
 * - Handles 401 errors (token expiry/invalid)
 * - Provides consistent error handling
 * 
 * Usage:
 *   import api from './services/api';
 *   const response = await api.get('/bookings');
 *   const data = await api.post('/bookings', { ... });
 */

import axios from 'axios';
import { supabase } from '../supabaseClient';

// Base URL for API (port 8000)
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: Attach Supabase JWT token
api.interceptors.request.use(
  async (config) => {
    try {
      // First check for mock user in sessionStorage (test accounts)
      const mockUserData = sessionStorage.getItem('real_user');
      if (mockUserData) {
        try {
          const mockUser = JSON.parse(mockUserData);
          if (mockUser.is_mock && mockUser.role) {
            // Generate mock token for test accounts
            const mockToken = `mock-jwt-token-${mockUser.role}`;
            config.headers.Authorization = `Bearer ${mockToken}`;
            return config;
          }
        } catch (e) {
          console.error('[api service] Failed to parse mock user:', e);
        }
      }

      // Get current session from Supabase
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.access_token) {
        config.headers.Authorization = `Bearer ${session.access_token}`;
      }
    } catch (error) {
      console.error('Error getting session for API request:', error);
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor: Handle common errors
api.interceptors.response.use(
  (response) => {
    // Return successful responses as-is
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // Check if this is a mock user - don't try to refresh session
      const mockUserData = sessionStorage.getItem('real_user');
      if (mockUserData) {
        try {
          const mockUser = JSON.parse(mockUserData);
          if (mockUser.is_mock) {
            // For mock users, just reject the error - don't logout
            // The 401 might be from a different issue (backend DEV_MODE not enabled, etc)
            console.warn('[api service] Mock user got 401 - check backend DEV_MODE setting');
            return Promise.reject(error);
          }
        } catch (e) {}
      }

      try {
        // Try to refresh the session
        const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError || !session) {
          // Refresh failed, sign out user
          await supabase.auth.signOut();
          window.location.href = '/login';
          return Promise.reject(error);
        }

        // Retry the original request with new token
        originalRequest.headers.Authorization = `Bearer ${session.access_token}`;
        return api(originalRequest);
      } catch (refreshErr) {
        // Refresh failed, redirect to login
        await supabase.auth.signOut();
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }

    // Handle 403 Forbidden (usually role-based access issues)
    if (error.response?.status === 403) {
      console.error('Access forbidden:', error.response.data);
    }

    // Handle network errors
    if (!error.response) {
      console.error('Network error - API server may be down');
    }

    return Promise.reject(error);
  }
);

export default api;
