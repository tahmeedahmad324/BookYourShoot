import { supabase } from '../supabaseClient';
import api from '../services/api';

// Mock test accounts - bypass Supabase auth for testing
const MOCK_ACCOUNTS = [
  'client@test.com',
  'photographer@test.com', 
  'admin@test.com'
];

const isMockAccount = (email) => MOCK_ACCOUNTS.includes(email.toLowerCase());

/**
 * Register with email and password
 * Creates Supabase auth user and saves profile to our database
 */
export const registerWithPassword = async (userData) => {
  try {
    // Sign up with Supabase (creates auth user with password)
    const { data, error } = await supabase.auth.signUp({
      email: userData.email,
      password: userData.password,
      options: {
        data: {
          full_name: userData.full_name,
        },
        emailRedirectTo: `${window.location.origin}/verify-otp`
      }
    });

    if (error) throw error;

    if (!data.user) {
      throw new Error("Failed to create account. Please try again.");
    }

    // Check if email confirmation is required
    if (data.session === null) {
      // Email confirmation required - user will receive OTP email
      console.log('Email confirmation required - check inbox for OTP');
    }

    // Save user profile to our database
    const response = await api.post('/api/auth/register', {
      email: userData.email,
      user_id: data.user.id,
      full_name: userData.full_name,
      phone: userData.phone,
      city: userData.city,
      role: userData.role
    });

    return {
      ...response.data,
      user_id: data.user.id,
      requires_email_confirmation: data.session === null
    };
  } catch (error) {
    console.error("Register error:", error);
    throw new Error(error.response?.data?.detail || error.message || "Registration failed");
  }
};

/**
 * Login with email and password
 * Authenticates user with Supabase, or uses mock accounts for testing
 */
export const loginWithPassword = async (email, password) => {
  try {
    // Check if this is a mock account (bypasses Supabase and rate limits)
    if (isMockAccount(email)) {
      const response = await api.post('/api/auth/mock-login', {
        email: email.toLowerCase(),
        password: password
      });
      
      return {
        user: response.data.user,
        is_mock: true
      };
    }
    
    // Real Supabase authentication
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) throw error;

    if (!data.session || !data.user) {
      throw new Error("Invalid email or password.");
    }

    return {
      access_token: data.session.access_token,
      user_id: data.user.id,
      user: data.user
    };
  } catch (error) {
    console.error("Login error:", error);
    throw new Error(error.response?.data?.detail || error.message || "Login failed");
  }
};
