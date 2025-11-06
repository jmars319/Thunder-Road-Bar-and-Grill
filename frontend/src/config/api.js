/**
 * API Configuration
 * 
 * Centralized API base URL configuration for the entire frontend.
 * 
 * Usage:
 *   import { API_BASE, getApiUrl } from '@/config/api';
 *   
 *   // Use API_BASE directly
 *   const url = `${API_BASE}/menu`;
 *   
 *   // Or use the helper function
 *   const url = getApiUrl('/menu');
 * 
 * Environment Variables:
 *   - REACT_APP_API_BASE: Full API base URL (e.g., https://api.example.com/api)
 *   - Falls back to http://localhost:5001/api for development
 * 
 * Notes:
 *   - This is the single source of truth for API configuration
 *   - All components should import from this file, not define API_BASE locally
 *   - The /api suffix is included in the base URL
 */

export const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:5001/api';

/**
 * Get full API URL for a given endpoint
 * @param {string} endpoint - API endpoint path (with or without leading slash)
 * @returns {string} Full API URL
 * 
 * @example
 * getApiUrl('/menu') // => 'http://localhost:5001/api/menu'
 * getApiUrl('menu')  // => 'http://localhost:5001/api/menu'
 */
export function getApiUrl(endpoint) {
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${API_BASE}${path}`;
}

/**
 * Get the API origin (without /api suffix)
 * Useful for constructing absolute URLs for uploads, etc.
 * @returns {string} API origin
 * 
 * @example
 * getApiOrigin() // => 'http://localhost:5001'
 */
export function getApiOrigin() {
  return API_BASE.replace(/\/api$/, '');
}

export default API_BASE;
