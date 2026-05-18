import {
  appendMenuImageCacheBuster,
  applyMenuImageCacheBuster,
  buildMenuImageVariant,
  normalizeMenuImageUrl,
} from './menuImageUtils';

export default function ResponsiveImagePreview({
  apiOrigin,
  entry,
  fallbackUrl,
  alt = '',
  className = '',
  sizes = '320px',
  cacheBuster = null
}) {
  const hydratedEntry = cacheBuster && entry ? applyMenuImageCacheBuster(entry, cacheBuster) : entry;
  const variant = buildMenuImageVariant(hydratedEntry, sizes);
  const fallbackSource = fallbackUrl ? normalizeMenuImageUrl(apiOrigin, fallbackUrl) : '';
  const fallback = variant?.fallback
    || (fallbackSource ? appendMenuImageCacheBuster(fallbackSource, cacheBuster || hydratedEntry?.cache_buster || null) : '');

  if (variant) {
    return (
      <picture>
        {variant.webpSrcset && (
          <source type="image/webp" srcSet={variant.webpSrcset} sizes={variant.sizes} />
        )}
        {variant.optimizedSrcset && (
          <source type="image/jpeg" srcSet={variant.optimizedSrcset} sizes={variant.sizes} />
        )}
        <img
          src={fallback}
          alt={alt}
          className={className}
          loading="lazy"
          sizes={variant.sizes}
          srcSet={variant.optimizedSrcset || undefined}
        />
      </picture>
    );
  }

  if (fallback) {
    return (
      <img
        src={fallback}
        alt={alt}
        className={className}
        loading="lazy"
      />
    );
  }

  return (
    <div className={`bg-surface-warm text-text-secondary text-xs flex items-center justify-center ${className}`}>
      No image selected
    </div>
  );
}
