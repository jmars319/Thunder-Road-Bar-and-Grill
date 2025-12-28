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
  const displaySizes = '(max-width: 639px) calc(100vw - 32px), (max-width: 1023px) calc(100vw - 96px), (max-width: 1535px) 720px, 960px';
  let heroVariant = responsiveEntry && hasRenderableImageVariant(responsiveEntry)
    ? buildImageVariant(responsiveEntry, { sizes: displaySizes, maxVariants: 2 })
    : null;
  if (!heroVariant && fallbackUrl) {
    heroVariant = {
      fallback: fallbackUrl,
      optimizedSrcset: '',
      webpSrcset: '',
      sizes: displaySizes
    };
  }

  return {
    ...cat,
    display_columns: cat.display_columns || 2,
    gallery_image_url: fallbackUrl,
    heroVariant
  };
}
