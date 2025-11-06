/**
 * imageUtils.test.js
 * 
 * Unit tests for image utility functions that generate responsive srcset strings.
 * Tests the buildSrcSet and buildWebpSrcSet helper functions.
 */

import { buildSrcSet, buildWebpSrcSet, DEFAULT_SIZES, LOGO_SIZES } from '../imageUtils';

describe('imageUtils', () => {
  describe('buildSrcSet', () => {
    test('generates srcset for basic image URL', () => {
      const result = buildSrcSet('/uploads/hero.jpg');
      expect(result).toContain('/uploads/hero-480.jpg 480w');
      expect(result).toContain('/uploads/hero-768.jpg 768w');
      expect(result).toContain('/uploads/hero-1024.jpg 1024w');
      expect(result).toContain('/uploads/hero-1600.jpg 1600w');
      expect(result).toContain('/uploads/hero.jpg 1600w');
    });

    test('handles URLs with query parameters', () => {
      const result = buildSrcSet('/uploads/hero.jpg?v=123');
      expect(result).toContain('/uploads/hero-480.jpg 480w');
      expect(result).toContain('/uploads/hero-768.jpg 768w');
      // Should strip query params when building variants
      expect(result).not.toContain('?v=123');
    });

    test('returns empty string for null or undefined input', () => {
      expect(buildSrcSet(null)).toBe('');
      expect(buildSrcSet(undefined)).toBe('');
      expect(buildSrcSet('')).toBe('');
    });

    test('returns empty string for URLs without file extension', () => {
      expect(buildSrcSet('/uploads/noextension')).toBe('');
    });

    test('handles custom size arrays', () => {
      const result = buildSrcSet('/uploads/hero.jpg', [320, 640]);
      expect(result).toContain('/uploads/hero-320.jpg 320w');
      expect(result).toContain('/uploads/hero-640.jpg 640w');
      expect(result).toContain('/uploads/hero.jpg 640w');
      expect(result).not.toContain('480w');
    });

    test('handles PNG files', () => {
      const result = buildSrcSet('/uploads/image.png');
      expect(result).toContain('/uploads/image-480.png 480w');
      expect(result).toContain('/uploads/image.png 1600w');
    });

    test('handles WebP files', () => {
      const result = buildSrcSet('/uploads/image.webp');
      expect(result).toContain('/uploads/image-480.webp 480w');
    });

    test('handles absolute URLs', () => {
      const result = buildSrcSet('https://example.com/uploads/hero.jpg');
      expect(result).toContain('https://example.com/uploads/hero-480.jpg 480w');
    });
  });

  describe('buildWebpSrcSet', () => {
    test('generates WebP srcset for JPG URL', () => {
      const result = buildWebpSrcSet('/uploads/hero.jpg');
      expect(result).toContain('/uploads/hero-480.webp 480w');
      expect(result).toContain('/uploads/hero-768.webp 768w');
      expect(result).toContain('/uploads/hero-1024.webp 1024w');
      expect(result).toContain('/uploads/hero-1600.webp 1600w');
      expect(result).toContain('/uploads/hero.webp 1600w');
    });

    test('generates WebP srcset for PNG URL', () => {
      const result = buildWebpSrcSet('/uploads/image.png');
      expect(result).toContain('/uploads/image-480.webp 480w');
      expect(result).toContain('/uploads/image.webp 1600w');
    });

    test('returns empty string for null or undefined input', () => {
      expect(buildWebpSrcSet(null)).toBe('');
      expect(buildWebpSrcSet(undefined)).toBe('');
      expect(buildWebpSrcSet('')).toBe('');
    });

    test('handles custom size arrays', () => {
      const result = buildWebpSrcSet('/uploads/hero.jpg', [320, 640]);
      expect(result).toContain('/uploads/hero-320.webp 320w');
      expect(result).toContain('/uploads/hero-640.webp 640w');
      expect(result).toContain('/uploads/hero.webp 640w');
      expect(result).not.toContain('480w');
    });

    test('handles absolute URLs', () => {
      const result = buildWebpSrcSet('https://example.com/uploads/hero.jpg');
      expect(result).toContain('https://example.com/uploads/hero-480.webp 480w');
    });
  });

  describe('Constants', () => {
    test('DEFAULT_SIZES is defined correctly', () => {
      expect(DEFAULT_SIZES).toEqual([480, 768, 1024, 1600]);
    });

    test('LOGO_SIZES is defined correctly', () => {
      expect(LOGO_SIZES).toEqual([160, 320, 480, 768, 1024, 1600]);
    });
  });

  describe('Edge cases', () => {
    test('handles very long URLs', () => {
      const longUrl = '/uploads/' + 'a'.repeat(200) + '.jpg';
      const result = buildSrcSet(longUrl);
      expect(result).toContain('-480.jpg 480w');
    });

    test('handles URLs with multiple dots in filename', () => {
      const result = buildSrcSet('/uploads/my.image.file.jpg');
      expect(result).toContain('/uploads/my.image.file-480.jpg 480w');
      expect(result).toContain('/uploads/my.image.file.jpg 1600w');
    });

    test('handles URLs with hyphens in filename', () => {
      const result = buildSrcSet('/uploads/my-image-name.jpg');
      expect(result).toContain('/uploads/my-image-name-480.jpg 480w');
    });

    test('buildSrcSet returns empty on error', () => {
      // Pass an object that will cause an error when trying to use string methods
      const result = buildSrcSet({ invalid: 'object' });
      expect(result).toBe('');
    });

    test('buildWebpSrcSet returns empty on error', () => {
      const result = buildWebpSrcSet({ invalid: 'object' });
      expect(result).toBe('');
    });
  });
});
