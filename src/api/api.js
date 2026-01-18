import { createClient } from '@supabase/supabase-js';

// Detect if we're on localhost or accessing from network
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// Use the same host as the frontend, just change the port
const API_HOST = isLocalhost ? 'localhost' : window.location.hostname;
const API_BASE_URL = process.env.REACT_APP_API_URL || `http://${API_HOST}:5000`;

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;

// Initialize Supabase client for authentication
export const supabase = SUPABASE_URL && SUPABASE_ANON_KEY 
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

// Helper to get auth headers with JWT token
const getAuthHeaders = async () => {
  const headers = {
    'Content-Type': 'application/json',
  };

  // Try to get token from Supabase session first
  if (supabase) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
      return headers;
    }
  }

  // Fallback to localStorage/sessionStorage token
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
};

// Generic API request handler
const apiRequest = async (endpoint, options = {}) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || data.error || 'API request failed');
    }

    return data;
  } catch (error) {
    console.error(`API Error (${endpoint}):`, error);
    throw error;
  }
};

// ==================== Authentication APIs ====================

export const authAPI = {
  // Send OTP to email
  sendOTP: async (email) => {
    return apiRequest('/api/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  // Verify OTP and complete signup/login
  verifyOTP: async (email, otp, userData = {}) => {
    return apiRequest('/api/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({
        email,
        otp,
        full_name: userData.full_name || '',
        phone: userData.phone || '',
        city: userData.city || '',
      }),
    });
  },

  // Signup new user
  signup: async (userData) => {
    return apiRequest('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  // Login with email/password (if using password auth)
  login: async (email, password) => {
    if (supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      return data;
    }
    throw new Error('Supabase client not initialized');
  },

  // Logout
  logout: async () => {
    if (supabase) {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    }
  },

  // Get current session
  getSession: async () => {
    if (supabase) {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    }
    return null;
  },

  // Get current user
  getCurrentUser: async () => {
    if (supabase) {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    }
    return null;
  },
};

// ==================== Photographer APIs ====================

export const photographerAPI = {
  // Search photographers
  search: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.city) query.append('city', params.city);
    if (params.specialty) query.append('specialty', params.specialty);
    if (params.min_rating) query.append('min_rating', params.min_rating);
    if (params.limit) query.append('limit', params.limit);
    if (params.offset) query.append('offset', params.offset);

    return apiRequest(`/api/photographers/?${query.toString()}`);
  },

  // Get photographer by ID
  getById: async (photographerId) => {
    return apiRequest(`/api/photographers/${photographerId}`);
  },

  // Get photographer public profile with reviews and equipment
  getProfile: async (photographerId) => {
    return apiRequest(`/api/profile/photographer/${photographerId}`);
  },
};

// ==================== Booking APIs ====================

export const bookingAPI = {
  // Create new booking
  create: async (bookingData) => {
    return apiRequest('/api/bookings/', {
      method: 'POST',
      body: JSON.stringify(bookingData),
    });
  },

  // Get user's bookings (client or photographer based on role)
  list: async () => {
    return apiRequest('/api/bookings/');
  },

  // Get booking by ID
  getById: async (bookingId) => {
    return apiRequest(`/api/bookings/${bookingId}`);
  },

  // Update booking status
  updateStatus: async (bookingId, status, notes = '') => {
    return apiRequest(`/api/bookings/${bookingId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, notes }),
    });
  },

  // Cancel booking
  cancel: async (bookingId, reason = '') => {
    return apiRequest(`/api/bookings/${bookingId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'cancelled', notes: reason }),
    });
  },

  // Mark work as completed (photographer only)
  markWorkCompleted: async (bookingId, notes = '') => {
    return apiRequest(`/api/bookings/${bookingId}/work-completed`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    });
  },

  // Mark payment as complete (client only)
  markPaymentComplete: async (bookingId, paymentType, amount) => {
    return apiRequest(`/api/bookings/${bookingId}/payment-complete`, {
      method: 'POST',
      body: JSON.stringify({ paymentType, amount }),
    });
  },
};

// ==================== Review APIs ====================

export const reviewAPI = {
  // Create review
  create: async (reviewData) => {
    return apiRequest('/api/reviews/', {
      method: 'POST',
      body: JSON.stringify(reviewData),
    });
  },

  // Get photographer reviews
  getPhotographerReviews: async (photographerId, limit = 10, offset = 0) => {
    return apiRequest(`/api/reviews/photographer/${photographerId}?limit=${limit}&offset=${offset}`);
  },

  // Get review by ID
  getById: async (reviewId) => {
    return apiRequest(`/api/reviews/${reviewId}`);
  },

  // Update review
  update: async (reviewId, updates) => {
    return apiRequest(`/api/reviews/${reviewId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  // Delete review
  delete: async (reviewId) => {
    return apiRequest(`/api/reviews/${reviewId}`, {
      method: 'DELETE',
    });
  },
};

// ==================== Equipment APIs ====================

export const equipmentAPI = {
  // Add equipment (photographer only)
  add: async (equipmentData) => {
    return apiRequest('/api/equipment/', {
      method: 'POST',
      body: JSON.stringify(equipmentData),
    });
  },

  // Get my equipment
  getMyEquipment: async () => {
    return apiRequest('/api/equipment/my-equipment');
  },

  // Get photographer's equipment
  getPhotographerEquipment: async (photographerId) => {
    return apiRequest(`/api/equipment/photographer/${photographerId}`);
  },

  // Update equipment
  update: async (equipmentId, updates) => {
    return apiRequest(`/api/equipment/${equipmentId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  // Delete equipment
  delete: async (equipmentId) => {
    return apiRequest(`/api/equipment/${equipmentId}`, {
      method: 'DELETE',
    });
  },
};

// ==================== Profile APIs ====================

export const profileAPI = {
  // Get my profile
  getMyProfile: async () => {
    return apiRequest('/api/profile/me');
  },

  // Update my profile
  updateMyProfile: async (updates) => {
    return apiRequest('/api/profile/me', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  // Update photographer profile
  updatePhotographerProfile: async (updates) => {
    return apiRequest('/api/profile/photographer/me', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  // Upgrade to photographer
  upgradeToPhotographer: async () => {
    return apiRequest('/api/profile/photographer/upgrade', {
      method: 'POST',
    });
  },
};

// ==================== Chat APIs ====================

export const chatAPI = {
  // Send message
  sendMessage: async (receiverId, message) => {
    return apiRequest('/api/chat/messages', {
      method: 'POST',
      body: JSON.stringify({ receiver_id: receiverId, message }),
    });
  },

  // Get conversations
  getConversations: async () => {
    return apiRequest('/api/chat/conversations');
  },

  // Get messages with a partner
  getMessages: async (partnerId) => {
    return apiRequest(`/api/chat/messages/${partnerId}`);
  },

  // Mark message as read
  markAsRead: async (messageId) => {
    return apiRequest(`/api/chat/messages/${messageId}/read`, {
      method: 'PUT',
    });
  },

  // Get unread count
  getUnreadCount: async () => {
    return apiRequest('/api/chat/unread-count');
  },
};

// ==================== Music APIs ====================

export const musicAPI = {
  // Get music suggestions
  getSuggestions: async (params = {}) => {
    const query = new URLSearchParams(params);
    return apiRequest(`/api/music/suggestions?${query.toString()}`);
  },

  // Get track details
  getTrackDetails: async (trackId) => {
    return apiRequest(`/api/music/track/${trackId}`);
  },

  // Search music
  search: async (searchQuery, limit = 20) => {
    return apiRequest(`/api/music/search?q=${encodeURIComponent(searchQuery)}&limit=${limit}`);
  },
};

// ==================== Travel APIs ====================

export const travelAPI = {
  // Calculate travel estimate
  calculateEstimate: async (fromCity, toCity, mode = 'car') => {
    return apiRequest('/api/travel/estimate', {
      method: 'POST',
      body: JSON.stringify({
        from_city: fromCity,
        to_city: toCity,
        mode,
      }),
    });
  },

  // Get supported cities
  getSupportedCities: async () => {
    return apiRequest('/api/travel/cities');
  },

  // Get quick distance
  getQuickDistance: async (fromCity, toCity) => {
    return apiRequest(`/api/travel/distance?from_city=${fromCity}&to_city=${toCity}`);
  },
};

// ==================== Admin APIs ====================

export const adminAPI = {
  // Get dashboard stats
  getDashboardStats: async () => {
    return apiRequest('/api/admin/dashboard/stats');
  },

  // Get pending verifications
  getPendingVerifications: async () => {
    return apiRequest('/api/admin/verifications/pending');
  },

  // Verify photographer
  verifyPhotographer: async (photographerId, approved, rejectionReason = null) => {
    return apiRequest(`/api/admin/verifications/${photographerId}`, {
      method: 'PUT',
      body: JSON.stringify({
        approved,
        rejection_reason: rejectionReason,
      }),
    });
  },

  // Get all users
  getAllUsers: async (role = null, limit = 50, offset = 0) => {
    const query = new URLSearchParams({ limit, offset });
    if (role) query.append('role', role);
    return apiRequest(`/api/admin/users?${query.toString()}`);
  },

  // Get user details
  getUserDetails: async (userId) => {
    return apiRequest(`/api/admin/users/${userId}`);
  },

  // Update user status
  updateUserStatus: async (userId, isActive, reason = null) => {
    return apiRequest(`/api/admin/users/${userId}/status`, {
      method: 'PUT',
      body: JSON.stringify({
        is_active: isActive,
        reason,
      }),
    });
  },

  // Get all bookings
  getAllBookings: async (status = null, limit = 50, offset = 0) => {
    const query = new URLSearchParams({ limit, offset });
    if (status) query.append('status', status);
    return apiRequest(`/api/admin/bookings?${query.toString()}`);
  },
};

// ==================== Complaint APIs ====================

export const complaintAPI = {
  // Create complaint
  create: async (complaintData) => {
    return apiRequest('/api/complaints/', {
      method: 'POST',
      body: JSON.stringify(complaintData),
    });
  },

  // Get my complaints
  getMyComplaints: async () => {
    return apiRequest('/api/complaints/my');
  },

  // Get complaint by ID
  getById: async (complaintId) => {
    return apiRequest(`/api/complaints/${complaintId}`);
  },

  // Get all complaints (admin)
  getAll: async (status = null) => {
    const query = status ? `?status=${status}` : '';
    return apiRequest(`/api/complaints/all${query}`);
  },

  // Update complaint (admin)
  update: async (complaintId, updates) => {
    return apiRequest(`/api/complaints/${complaintId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },
};

// ==================== Support APIs ====================

export const supportAPI = {
  // Create support ticket
  createTicket: async (ticketData) => {
    return apiRequest('/api/support/tickets', {
      method: 'POST',
      body: JSON.stringify(ticketData),
    });
  },

  // Get my tickets
  getMyTickets: async () => {
    return apiRequest('/api/support/tickets/my');
  },

  // Get all tickets (admin)
  getAllTickets: async (status = null) => {
    const query = status ? `?status=${status}` : '';
    return apiRequest(`/api/support/tickets/all${query}`);
  },

  // Get ticket details
  getTicketDetails: async (ticketId) => {
    return apiRequest(`/api/support/tickets/${ticketId}`);
  },

  // Reply to ticket
  replyToTicket: async (ticketId, message, isAdmin = false) => {
    return apiRequest(`/api/support/tickets/${ticketId}/reply`, {
      method: 'POST',
      body: JSON.stringify({ message, is_admin: isAdmin }),
    });
  },

  // Update ticket status
  updateTicketStatus: async (ticketId, status) => {
    return apiRequest(`/api/support/tickets/${ticketId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  },
};

// ==================== CNIC APIs ====================

export const cnicAPI = {
  // Upload CNIC image for OCR
  uploadCNIC: async (imageFile, side = 'front') => {
    const formData = new FormData();
    formData.append('file', imageFile);

    // Get auth headers but remove Content-Type for FormData
    const headers = await getAuthHeaders();
    const authHeaders = {};
    if (headers['Authorization']) {
      authHeaders['Authorization'] = headers['Authorization'];
    }

    // Use different endpoint for back side
    const endpoint = side === 'back' ? '/api/cnic/verify-back' : '/api/cnic/verify';

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: authHeaders, // Only include Authorization, let browser set Content-Type
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || data.error || 'CNIC upload failed');
    }

    // Return data based on side
    if (side === 'back') {
      return {
        success: true,
        data: {
          qr_success: data.qr_success,
          // Backend intentionally does not return raw QR payload for privacy.
          cnic_number_from_qr: data.cnic_number_from_qr || null,
          message: data.message
        }
      };
    }

    return {
      success: true,
      data: {
        is_readable: data.is_readable,
        cnic_number: data.cnic_number,
        possible_name: data.possible_name,
        dates: data.dates || [],
        expiry_info: data.expiry_info,
        readability_score: data.is_readable ? 80 : 30, // Estimate based on is_readable
        quality: data.quality
      }
    };
  },

  // Verify CNIC using BOTH sides: front OCR CNIC number must match CNIC embedded in back QR
  verifyPair: async (frontFile, backFile) => {
    const formData = new FormData();
    formData.append('front_file', frontFile);
    formData.append('back_file', backFile);

    const headers = await getAuthHeaders();
    const authHeaders = {};
    if (headers['Authorization']) {
      authHeaders['Authorization'] = headers['Authorization'];
    }

    const response = await fetch(`${API_BASE_URL}/api/cnic/verify-pair`, {
      method: 'POST',
      headers: authHeaders,
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || data.error || 'CNIC pair verification failed');
    }

    return { success: true, data };
  },

  // Get CNIC verification status
  getVerificationStatus: async () => {
    return apiRequest('/api/cnic/verification-status');
  },
};

// Export all APIs
export default {
  auth: authAPI,
  photographers: photographerAPI,
  bookings: bookingAPI,
  reviews: reviewAPI,
  equipment: equipmentAPI,
  profile: profileAPI,
  chat: chatAPI,
  music: musicAPI,
  travel: travelAPI,
  admin: adminAPI,
  complaints: complaintAPI,
  support: supportAPI,
  cnic: cnicAPI,
};
