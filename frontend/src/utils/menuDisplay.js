import {
  buildImageVariant,
  hasRenderableImageVariant,
  prefixUploadUrl,
  applyCacheBusterToEntry,
  appendCacheBuster
} from './imageVariants';

export function normalizeMenuCategory(cat = {}) {
  const fallbackUrlRaw = cat.gallery_image_url || cat.image_url || '';
  const cacheBuster = cat.gallery_image_cache_buster || null;
  const fallbackUrl = appendCacheBuster(prefixUploadUrl(fallbackUrlRaw), cacheBuster);
  const responsiveEntryRaw = cat.gallery_image_responsive
    || (cat.gallery_image_variants
      ? {
          image_variants: cat.gallery_image_variants,
          responsive_variants: cat.gallery_image_variants,
          fallback_original: fallbackUrlRaw,
          file_url: fallbackUrlRaw,
          alt_text: cat.name
        }
      : null);
  const responsiveEntry = cacheBuster ? applyCacheBusterToEntry(responsiveEntryRaw, cacheBuster) : responsiveEntryRaw;
  let heroVariant = responsiveEntry && hasRenderableImageVariant(responsiveEntry)
    ? buildImageVariant(responsiveEntry, { sizes: '(max-width: 768px) 90vw, 640px' })
    : null;
  if (!heroVariant && fallbackUrl) {
    heroVariant = {
      fallback: fallbackUrl,
      optimizedSrcset: '',
      webpSrcset: '',
      sizes: '(max-width: 768px) 90vw, 640px'
    };
  }

  return {
    ...cat,
    display_columns: cat.display_columns || 2,
    gallery_image_url: fallbackUrl,
    heroVariant
  };
}
