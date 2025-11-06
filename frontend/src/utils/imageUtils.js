/**
 * Image Utilities
 * 
 * Shared utilities for building responsive image srcsets with WebP variants.
 * 
 * Usage:
 *   import { buildSrcSet, buildWebpSrcSet } from '@/utils/imageUtils';
 *   
 *   <img 
 *     src={imageUrl} 
 *     srcSet={buildSrcSet(imageUrl, [480, 768, 1024])}
 *   />
 *   
 *   <picture>
 *     <source srcSet={buildWebpSrcSet(imageUrl)} type="image/webp" />
 *     <source srcSet={buildSrcSet(imageUrl)} type="image/jpeg" />
 *     <img src={imageUrl} alt="..." />
 *   </picture>
 * 
 * Notes:
 *   - These functions assume images are processed with responsive variants
 *   - Image variants follow the naming pattern: basename-WIDTH.ext (e.g., hero-480.jpg)
 *   - WebP variants use .webp extension: basename-WIDTH.webp
 *   - Functions are safe to call with invalid URLs (return empty string)
 */

/**
 * Build srcset attribute for responsive images
 * 
 * Generates srcset string with multiple width variants of an image.
 * Assumes image processor creates variants like: image-480.jpg, image-768.jpg, etc.
 * 
 * @param {string} url - Base image URL
 * @param {number[]} sizesArr - Array of width breakpoints (default: [480, 768, 1024, 1600])
 * @returns {string} srcset attribute value
 * 
 * @example
 * buildSrcSet('/uploads/hero.jpg', [480, 768, 1024])
 * // => '/uploads/hero-480.jpg 480w, /uploads/hero-768.jpg 768w, /uploads/hero-1024.jpg 1024w, /uploads/hero.jpg 1024w'
 */
export function buildSrcSet(url, sizesArr = [480, 768, 1024, 1600]) {
  try {
    if (!url) return '';
    
    // Remove query parameters if present
    const qIdx = url.indexOf('?');
    const clean = qIdx === -1 ? url : url.slice(0, qIdx);
    
    // Extract file extension
    const dot = clean.lastIndexOf('.');
    if (dot === -1) return '';
    
    const ext = clean.slice(dot + 1);
    const base = clean.slice(0, dot);
    
    // Build srcset entries: basename-WIDTH.ext WIDTHw
    const parts = sizesArr.map(w => `${base}-${w}.${ext} ${w}w`);
    
    // Add original image as fallback for largest size
    parts.push(`${clean} ${Math.max(...sizesArr)}w`);
    
    return parts.join(', ');
  } catch (e) {
    // Return empty string on any error
    return '';
  }
}

/**
 * Build srcset attribute for WebP responsive images
 * 
 * Similar to buildSrcSet but generates WebP variant URLs.
 * Assumes image processor creates WebP variants like: image-480.webp, image-768.webp, etc.
 * 
 * @param {string} url - Base image URL (any format)
 * @param {number[]} sizesArr - Array of width breakpoints (default: [480, 768, 1024, 1600])
 * @returns {string} srcset attribute value with WebP URLs
 * 
 * @example
 * buildWebpSrcSet('/uploads/hero.jpg', [480, 768, 1024])
 * // => '/uploads/hero-480.webp 480w, /uploads/hero-768.webp 768w, /uploads/hero-1024.webp 1024w, /uploads/hero.webp 1024w'
 */
export function buildWebpSrcSet(url, sizesArr = [480, 768, 1024, 1600]) {
  try {
    if (!url) return '';
    
    // Remove extension from URL
    const base = url.slice(0, url.lastIndexOf('.'));
    
    // Build WebP srcset entries: basename-WIDTH.webp WIDTHw
    const parts = sizesArr.map(w => `${base}-${w}.webp ${w}w`);
    
    // Add original size WebP as fallback
    parts.push(`${base}.webp ${Math.max(...sizesArr)}w`);
    
    return parts.join(', ');
  } catch (e) {
    // Return empty string on any error
    return '';
  }
}

/**
 * Default size breakpoints for responsive images
 * Use these when calling buildSrcSet/buildWebpSrcSet without custom sizes
 */
export const DEFAULT_SIZES = [480, 768, 1024, 1600];

/**
 * Logo-specific size breakpoints (smaller sizes for UI elements)
 */
export const LOGO_SIZES = [160, 320, 480, 768, 1024, 1600];
