import { buildImageVariant, hasRenderableImageVariant, applyCacheBusterToEntry, appendCacheBuster } from '../../../utils/imageVariants';

export const getCacheBusterFromMedia = (media) => media?.cache_buster || media?.updated_at || media?.uploaded_at || null;

export function mediaToResponsiveEntry(media, fallbackInput = '') {
  if (!media) return null;
  const fallback = fallbackInput || media.fallback_original || media.file_url || '';
  const entry = {
    image_variants: media.image_variants || media.responsive_variants || media.variants || {},
    responsive_variants: media.responsive_variants || media.image_variants || media.variants || {},
    fallback_original: fallback,
    file_url: fallback,
    alt_text: media.alt_text || media.title || ''
  };
  const cacheBuster = getCacheBusterFromMedia(media);
  return cacheBuster ? applyCacheBusterToEntry(entry, cacheBuster) : entry;
}

export function ensureCategoryResponsiveEntry(category) {
  if (!category) return null;
  const cacheBuster = category?.gallery_image_cache_buster || null;
  let entry = null;
  if (category.gallery_image_responsive) {
    entry = category.gallery_image_responsive;
  } else if (category.gallery_image_variants) {
    entry = {
      image_variants: category.gallery_image_variants,
      responsive_variants: category.gallery_image_variants,
      fallback_original: category.gallery_image_url || '',
      file_url: category.gallery_image_url || '',
      alt_text: category.name || ''
    };
  } else if (category.gallery_image_url) {
    entry = {
      image_variants: {},
      responsive_variants: {},
      fallback_original: category.gallery_image_url,
      file_url: category.gallery_image_url,
      alt_text: category.name || ''
    };
  }
  if (!entry) return null;
  return cacheBuster ? applyCacheBusterToEntry(entry, cacheBuster) : entry;
}

export function normalizeMenuImageUrl(apiOrigin, url) {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/')) return `${apiOrigin}${url}`;
  return `${apiOrigin}/${url}`;
}

export function buildMenuImageVariant(entry, sizes) {
  return entry && hasRenderableImageVariant(entry)
    ? buildImageVariant(entry, { sizes })
    : null;
}

export function appendMenuImageCacheBuster(url, cacheBuster) {
  return appendCacheBuster(url, cacheBuster);
}

export function applyMenuImageCacheBuster(entry, cacheBuster) {
  return applyCacheBusterToEntry(entry, cacheBuster);
}
