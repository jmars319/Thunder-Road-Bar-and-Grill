import { buildImageVariant, hasRenderableImageVariant, prefixUploadUrl } from './imageVariants';

export function normalizeMenuCategory(cat = {}) {
  const fallbackUrl = cat.gallery_image_url || cat.image_url || '';
  const responsiveEntry = cat.gallery_image_responsive
    || (cat.gallery_image_variants
      ? {
          image_variants: cat.gallery_image_variants,
          responsive_variants: cat.gallery_image_variants,
          fallback_original: fallbackUrl,
          file_url: fallbackUrl,
          alt_text: cat.name
        }
      : null);
  const heroVariant = responsiveEntry && hasRenderableImageVariant(responsiveEntry)
    ? buildImageVariant(responsiveEntry, { sizes: '100vw' })
    : null;

  return {
    ...cat,
    display_columns: cat.display_columns || 2,
    gallery_image_url: prefixUploadUrl(fallbackUrl),
    heroVariant
  };
}
