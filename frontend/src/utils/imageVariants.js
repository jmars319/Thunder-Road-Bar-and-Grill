import { getApiOrigin } from '../config/api';

const SERVER_BASE = getApiOrigin();

function absolutize(url) {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  return `${SERVER_BASE}${url.startsWith('/') ? url : `/${url}`}`;
}

function dedupeVariants(list) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  return list
    .filter((variant) => variant && variant.width && variant.url)
    .sort((a, b) => a.width - b.width)
    .filter((variant) => {
      if (seen.has(variant.width)) return false;
      seen.add(variant.width);
      return true;
    })
    .map((variant) => ({
      width: variant.width,
      url: absolutize(variant.url || variant.path)
    }));
}

export function normalizeImageVariants(entry) {
  const variants = entry?.image_variants || entry?.responsive_variants || {};
  return {
    optimized: dedupeVariants(variants.optimized),
    webp: dedupeVariants(variants.webp)
  };
}

export function hasRenderableImageVariant(entry) {
  const normalized = normalizeImageVariants(entry);
  return normalized.optimized.length > 0 || normalized.webp.length > 0;
}

export function buildImageVariant(entry, options = {}) {
  const sizes = options.sizes || '100vw';
  const normalized = normalizeImageVariants(entry);
  if (!normalized.optimized.length && !normalized.webp.length) {
    return null;
  }
  const smallestOptimized = normalized.optimized[0] || null;
  const smallestWebp = normalized.webp[0] || null;
  const fallbackCandidate = smallestOptimized?.url || smallestWebp?.url || '';
  const optimizedSrcset = normalized.optimized
    .map((variant) => `${variant.url} ${variant.width}w`)
    .join(', ');
  const webpSrcset = normalized.webp
    .map((variant) => `${variant.url} ${variant.width}w`)
    .join(', ');
  return {
    fallback: fallbackCandidate ? absolutize(fallbackCandidate) : '',
    optimizedSrcset,
    webpSrcset,
    sizes,
    width: entry?.width || null,
    height: entry?.height || null
  };
}

export function prefixUploadUrl(url) {
  return absolutize(url);
}
