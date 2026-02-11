/**
 * Payouts API - Frontend API client for photographer payouts
 */

import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// Get auth token from localStorage
const getAuthHeaders = () => {
    const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` })
    };
};

export const payoutsAPI = {
    /**
     * Get list of Pakistani banks
     */
    getBanks: async () => {
        const response = await axios.get(`${API_BASE_URL}/payouts/banks`, {
            headers: getAuthHeaders()
        });
        return response.data;
    },

    /**
     * Save bank/wallet details
     */
    saveBankDetails: async (details) => {
        const response = await axios.post(`${API_BASE_URL}/payouts/bank-details`, details, {
            headers: getAuthHeaders()
        });
        return response.data;
    },

    /**
     * Get saved bank/wallet details
     */
    getBankDetails: async () => {
        const response = await axios.get(`${API_BASE_URL}/payouts/bank-details`, {
            headers: getAuthHeaders()
        });
        return response.data;
    },

    /**
     * Get current balance and earnings
     */
    getBalance: async () => {
        const response = await axios.get(`${API_BASE_URL}/payouts/balance`, {
            headers: getAuthHeaders()
        });
        return response.data;
    },

    /**
     * Get transaction history
     */
    getTransactions: async (limit = 20) => {
        const response = await axios.get(`${API_BASE_URL}/payouts/transactions?limit=${limit}`, {
            headers: getAuthHeaders()
        });
        return response.data;
    },

    /**
     * Request a payout
     */
    requestPayout: async (amount = null) => {
        const response = await axios.post(`${API_BASE_URL}/payouts/request`, { amount }, {
            headers: getAuthHeaders()
        });
        return response.data;
    },

    /**
     * Get photographer's payout history
     */
    getMyPayouts: async () => {
        const response = await axios.get(`${API_BASE_URL}/payouts/my-payouts`, {
            headers: getAuthHeaders()
        });
        return response.data;
    },

    /**
     * Get specific payout details
     */
    getPayoutDetails: async (payoutId) => {
        const response = await axios.get(`${API_BASE_URL}/payouts/${payoutId}`, {
            headers: getAuthHeaders()
        });
        return response.data;
    },

    // ==================== Admin Endpoints ====================

    /**
     * Get pending payouts (admin)
     */
    getPendingPayouts: async () => {
        const response = await axios.get(`${API_BASE_URL}/payouts/admin/pending`, {
            headers: getAuthHeaders()
        });
        return response.data;
    },

    /**
     * Get all payouts with optional status filter (admin)
     */
    getAllPayouts: async (status = null) => {
        const url = status
            ? `${API_BASE_URL}/payouts/admin/all?status=${status}`
            : `${API_BASE_URL}/payouts/admin/all`;
        const response = await axios.get(url, {
            headers: getAuthHeaders()
        });
        return response.data;
    },

    /**
     * Get payout statistics (admin)
     */
    getPayoutStats: async () => {
        const response = await axios.get(`${API_BASE_URL}/payouts/admin/stats`, {
            headers: getAuthHeaders()
        });
        return response.data;
    },

    /**
     * Process/approve a payout (admin)
     */
    processPayout: async (payoutId, transactionReference = null) => {
        const response = await axios.post(
            `${API_BASE_URL}/payouts/admin/process/${payoutId}`,
            { transaction_reference: transactionReference },
            { headers: getAuthHeaders() }
        );
        return response.data;
    },

    /**
     * Reject a payout (admin)
     */
    rejectPayout: async (payoutId, reason) => {
        const response = await axios.post(
            `${API_BASE_URL}/payouts/admin/reject/${payoutId}`,
            { reason },
            { headers: getAuthHeaders() }
        );
        return response.data;
    },

    /**
     * Verify photographer's bank details (admin)
     */
    verifyBankDetails: async (photographerId) => {
        const response = await axios.post(
            `${API_BASE_URL}/payouts/admin/verify-bank/${photographerId}`,
            {},
            { headers: getAuthHeaders() }
        );
        return response.data;
    }
};

export default payoutsAPI;
