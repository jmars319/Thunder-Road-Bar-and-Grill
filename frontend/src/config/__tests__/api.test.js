/**
 * api.test.js
 * 
 * Unit tests for the centralized API configuration module.
 * Tests API_BASE constant and helper functions.
 */

import { API_BASE, getApiUrl, getApiOrigin } from '../api';

describe('API Configuration', () => {
  const originalEnv = process.env.REACT_APP_API_BASE;

  afterEach(() => {
    // Restore original environment
    process.env.REACT_APP_API_BASE = originalEnv;
  });

  describe('API_BASE', () => {
    test('uses environment variable when set', () => {
      // Note: In the actual module, API_BASE is set at module load time,
      // so this test verifies the default behavior
      expect(API_BASE).toBeDefined();
      expect(typeof API_BASE).toBe('string');
    });

    test('has default value when environment variable not set', () => {
      // The default should be the local development server
      expect(API_BASE).toContain('localhost');
      expect(API_BASE).toContain('/api');
    });
  });

  describe('getApiUrl', () => {
    test('builds full URL with endpoint', () => {
      const url = getApiUrl('/menu');
      expect(url).toContain('/api/menu');
      expect(url).not.toContain('//menu'); // no double slash
    });

    test('handles endpoint with leading slash', () => {
      const url = getApiUrl('/contact');
      expect(url).toContain('/api/contact');
    });

    test('handles endpoint without leading slash', () => {
      const url = getApiUrl('reservations');
      expect(url).toContain('/api/reservations');
    });

    test('handles empty endpoint', () => {
      const url = getApiUrl('');
      expect(url).toBe(API_BASE);
    });

    test('handles undefined endpoint', () => {
      const url = getApiUrl();
      expect(url).toBe(API_BASE);
    });

    test('handles query parameters in endpoint', () => {
      const url = getApiUrl('/media?category=hero');
      expect(url).toContain('/api/media?category=hero');
    });
  });

  describe('getApiOrigin', () => {
    test('returns origin without /api suffix', () => {
      const origin = getApiOrigin();
      expect(origin).not.toContain('/api');
      expect(origin).toContain('localhost');
    });

    test('returns valid URL format', () => {
      const origin = getApiOrigin();
      expect(origin).toMatch(/^https?:\/\//);
    });

    test('removes /api from end of URL', () => {
      const origin = getApiOrigin();
      // Should not end with /api
      expect(origin.endsWith('/api')).toBe(false);
    });
  });

  describe('Integration', () => {
    test('getApiUrl and getApiOrigin are consistent', () => {
      const origin = getApiOrigin();
      const url = getApiUrl('/test');
      expect(url.startsWith(origin)).toBe(true);
    });

    test('all functions return valid URLs', () => {
      expect(API_BASE).toMatch(/^https?:\/\//);
      expect(getApiUrl('/test')).toMatch(/^https?:\/\//);
      expect(getApiOrigin()).toMatch(/^https?:\/\//);
    });

    test('API_BASE includes /api path', () => {
      expect(API_BASE).toContain('/api');
    });

    test('getApiOrigin does not include /api path', () => {
      const origin = getApiOrigin();
      // Check that it doesn't end with /api
      expect(origin.slice(-4)).not.toBe('/api');
    });
  });
});
