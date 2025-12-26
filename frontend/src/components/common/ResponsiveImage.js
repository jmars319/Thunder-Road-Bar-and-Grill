/**
 * ResponsiveImage
 *
 * Renders a <picture> tree using manifest-driven variant data (srcsets + WebP fallbacks).
 * Expects a `variant` object created via buildImageVariant (utils/imageVariants).
 */
export default function ResponsiveImage({
  variant,
  alt = '',
  className = '',
  loading = 'lazy',
  decoding = 'async',
  sizes,
  imgProps = {},
  pictureClassName = ''
}) {
  if (!variant) return null;
  const resolvedSizes = sizes || variant.sizes || '100vw';
  const firstOptimized = variant.optimizedSrcset?.split(',')?.[0]?.trim().split(' ')?.[0];
  const firstWebp = variant.webpSrcset?.split(',')?.[0]?.trim().split(' ')?.[0];
  const fallbackSrc = variant.fallback || firstOptimized || firstWebp || '';
  return (
    <picture className={pictureClassName}>
      {variant.webpSrcset && (
        <source srcSet={variant.webpSrcset} type="image/webp" sizes={resolvedSizes} />
      )}
      {variant.optimizedSrcset && (
        <source srcSet={variant.optimizedSrcset} type="image/jpeg" sizes={resolvedSizes} />
      )}
      <img
        src={fallbackSrc}
        alt={alt}
        className={className}
        loading={loading}
        decoding={decoding}
        sizes={resolvedSizes}
        srcSet={variant.optimizedSrcset || undefined}
        width={variant.width || undefined}
        height={variant.height || undefined}
        {...imgProps}
      />
    </picture>
  );
}
