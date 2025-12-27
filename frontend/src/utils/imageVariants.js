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
  const maxVariants = Number.isFinite(options.maxVariants) && options.maxVariants > 0
    ? Math.max(1, Math.floor(options.maxVariants))
    : null;
  const normalized = normalizeImageVariants(entry);
  if (!normalized.optimized.length && !normalized.webp.length) {
    return null;
  }
  const clampList = (list) => {
    if (!maxVariants) return list;
    return list.slice(0, maxVariants);
  };
  const optimizedList = clampList(normalized.optimized);
  const webpList = clampList(normalized.webp);
  const smallestOptimized = optimizedList[0] || null;
  const smallestWebp = webpList[0] || null;
  const fallbackCandidate = smallestOptimized?.url || smallestWebp?.url || '';
  const optimizedSrcset = optimizedList
    .map((variant) => `${variant.url} ${variant.width}w`)
    .join(', ');
  const webpSrcset = webpList
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

export function appendCacheBuster(url, version) {
  if (!url || version === null || typeof version === 'undefined') {
    return url;
  }
  const value = String(version);
  if (value === '') {
    return url;
  }
  const isAbsolute = /^https?:\/\//i.test(url);
  try {
    const parsed = isAbsolute ? new URL(url) : new URL(url, 'http://cache-buster.local');
    parsed.searchParams.set('v', value);
    if (isAbsolute) {
      return parsed.toString();
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch (error) {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}v=${encodeURIComponent(value)}`;
  }
}

export function applyCacheBusterToEntry(entry, version) {
  if (!entry || version === null || typeof version === 'undefined' || version === '') {
    return entry;
  }
  const updateUrl = (url) => appendCacheBuster(url, version);
  const mutateVariantList = (list) => {
    if (!Array.isArray(list)) return list;
    return list.map((variant) => {
      if (!variant) return variant;
      const next = { ...variant };
      if (next.url) {
        next.url = updateUrl(next.url);
      }
      if (next.path) {
        next.path = updateUrl(next.path);
      }
      return next;
    });
  };
  const mutateVariants = (variants) => {
    if (!variants) return variants;
    return {
      ...variants,
      optimized: mutateVariantList(variants.optimized || []),
      webp: mutateVariantList(variants.webp || [])
    };
  };
  return {
    ...entry,
    cache_buster: version,
    fallback_original: entry.fallback_original ? updateUrl(entry.fallback_original) : entry.fallback_original,
    file_url: entry.file_url ? updateUrl(entry.file_url) : entry.file_url,
    image_variants: mutateVariants(entry.image_variants),
    responsive_variants: mutateVariants(entry.responsive_variants)
  };
}
