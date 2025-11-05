import React, { useEffect, useRef, useState } from 'react';

/**
 * LazyImage
 * Small, dependency-free lazy image component using IntersectionObserver.
 * Props:
 * - src, alt
 * - srcSet, sizes (optional)
 * - sources: optional array of { srcSet, type, sizes } to render <source> for picture (e.g. webp)
 * - placeholder (optional small image URL) shown before load
 * - className forwarded to the <img>
 * - onLoad, onError forwarded
 * - loading override ('lazy'|'eager')
 */
export default function LazyImage({
  src,
  alt = '',
  srcSet,
  sizes,
  // sources: [{ srcSet, type, sizes }]
  sources,
  placeholder = '',
  className = '',
  onLoad,
  onError,
  loading,
  style,
  ...rest
}) {
  const ref = useRef(null);
  const [isNear, setIsNear] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    if (typeof IntersectionObserver === 'undefined') {
      setIsNear(true);
      return undefined;
    }

    const io = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setIsNear(true);
          observer.disconnect();
        }
      });
    }, { rootMargin: '200px' });

    io.observe(el);
    return () => io.disconnect();
  }, [ref]);

  function handleLoad(e) {
    setLoaded(true);
    if (typeof onLoad === 'function') onLoad(e);
  }

  function handleError(e) {
    if (typeof onError === 'function') onError(e);
  }

  // Safe fallback src when no placeholder provided — 1x1 transparent GIF
  const TRANSPARENT_PIXEL = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';

  // When not near the viewport, we show the placeholder (if provided) or a
  // transparent pixel to avoid the browser issuing requests for an empty src.
  const currentSrc = isNear ? src : (placeholder || TRANSPARENT_PIXEL);

  return (
    <div ref={ref} className={`lazy-image-wrapper ${className}`} style={{ position: 'relative', overflow: 'hidden', ...style }}>
      <picture>
        {/* render provided sources (e.g. webp) when near viewport so browser can choose best format */}
        {Array.isArray(sources) && isNear && sources.map((s, idx) => (
          <source key={idx} srcSet={s.srcSet} sizes={s.sizes} type={s.type} />
        ))}
        {/* fallback/source for provided srcSet */}
        {srcSet && isNear && <source srcSet={srcSet} sizes={sizes} />}
        <img
          src={currentSrc}
          srcSet={isNear ? srcSet : undefined}
          sizes={isNear ? sizes : undefined}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          loading={loading || (isNear ? 'lazy' : 'auto')}
          decoding="async"
          className={`${loaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300 block w-full h-auto object-cover`}
          {...rest}
        />
      </picture>
    </div>
  );
}
