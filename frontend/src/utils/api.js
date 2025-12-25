/*
  API Utility

  Purpose:
  - Provides authenticated fetch wrapper for admin API calls
  - Automatically adds JWT token from localStorage to Authorization header
  - Handles token expiration and redirects to login

  Usage:
  - import { authenticatedFetch } from '../utils/api';
  - const response = await authenticatedFetch('/api/reservations');
  
  Last updated: 2025-11-05 — Created for JWT authentication
*/

import { API_BASE } from '../config/api';

/**
 * Make an authenticated API request with JWT token
 * @param {string} url - URL path (will be prefixed with API_BASE if relative)
 * @param {object} options - fetch options (method, body, headers, etc.)
 * @returns {Promise<Response>} - fetch response
 */
export async function authenticatedFetch(url, options = {}) {
  // Get JWT token from localStorage
  const token = localStorage.getItem('authToken');
  
  // Build full URL if relative path provided
  const fullUrl = url.startsWith('http') ? url : `${API_BASE}${url.startsWith('/') ? url : `/${url}`}`;
  
  // Merge headers with Authorization
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    ...options.headers,
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  try {
    const response = await fetch(fullUrl, {
      ...options,
      headers,
    });
    
    // If token expired or invalid, clear it and redirect to login
    if (response.status === 401) {
      localStorage.removeItem('authToken');
      // Dispatch custom event to trigger logout in App.js
      const event = document.createEvent('Event');
      event.initEvent('authExpired', true, true);
      window.dispatchEvent(event);
    }
    
    return response;
  } catch (err) {
    throw err;
  }
}

/**
 * Get the current API base URL
 * @deprecated Import API_BASE directly from '../config/api' instead
 */
export function getApiBase() {
  return API_BASE;
}

// Re-export API_BASE for convenience
export { API_BASE };
