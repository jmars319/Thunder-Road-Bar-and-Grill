/*
  HeroSection

  Purpose:
  - Hero section for the homepage: headline, subtitle, and CTAs. Presentational
    and intentionally static to avoid unexpected layout changes.

  Accessibility:
  - This component renders the main H1 for the public site. If you embed
    multiple instances on the same page, ensure only one H1 remains for
    correct semantic structure.
*/

// React 17+ with new JSX transform doesn't require importing React for JSX usage.

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { buildImageVariant } from '../../utils/imageVariants';
import ResponsiveImage from '../common/ResponsiveImage';
import { getApiUrl } from '../../config/api';
import cachedFetch from '../../lib/cachedFetch';
import { STATIC_HERO_META, STATIC_HERO_SLIDES } from '../../config/permanentAssets';

const HERO_SIZES = '100vw';
const HERO_FRAME_CLASS = 'absolute inset-0 overflow-hidden';
const HERO_OVERLAY_CLASS = 'absolute inset-0 z-10 overlay-gradient pointer-events-none';
const HERO_STAGE_CLASS = 'relative w-full hero-stage';
const HERO_STAGE_STYLE = {
  minHeight: 'clamp(520px, 68vh, 760px)',
  width: '100%'
};
const DEFAULT_HERO_COPY = {
  title: 'Welcome to Thunder Road Bar and Grill',
  subtitle: 'Great Food. Cold Drinks. Good Times.',
  ctas: [
    { label: 'View Menu', href: '#menu' },
    { label: 'Make a Reservation', href: '#reservations' }
  ]
};
// New HeroSection: supports a simple slideshow driven by site settings (hero_images).
export default function HeroSection() {
  // images: array of { src, alt }
  const [images, setImages] = useState([]);
  const [heroCopy, setHeroCopy] = useState(DEFAULT_HERO_COPY);
  const [slideshowSpeed, setSlideshowSpeed] = useState(6000);
  const idxRef = useRef(0);
  const [index, setIndex] = useState(0);
  const [firstImageLoaded, setFirstImageLoaded] = useState(false);
  const [slideshowActive, setSlideshowActive] = useState(false);
  const [failedSlideKeys, setFailedSlideKeys] = useState([]);

  const applySlides = useCallback((slides) => {
    if (!Array.isArray(slides)) {
      return;
    }
    idxRef.current = 0;
    setIndex(0);
    setFailedSlideKeys([]);
    setImages(slides);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadHero = async () => {
      try {
        const payload = await cachedFetch(getApiUrl('/settings'));
        if (!payload) {
          throw new Error('Failed to load site settings');
        }
        if (cancelled) return;
        const settings = payload?.settings || {};
        const heroSelection = Array.isArray(settings?.hero_images)
          ? settings.hero_images
          : [];
        const heroVariants = Array.isArray(settings?.hero_images_variants)
          ? settings.hero_images_variants
          : [];
        const variantMap = heroVariants.reduce((acc, entry) => {
          if (!entry || typeof entry.id === 'undefined') {
            return acc;
          }
          acc[String(entry.id)] = entry;
          return acc;
        }, {});
        const nextCopy = {
          title: settings.hero_title || DEFAULT_HERO_COPY.title,
          subtitle: settings.hero_subtitle || DEFAULT_HERO_COPY.subtitle,
          ctas: [
            settings.hero_cta_primary_label
              ? { label: settings.hero_cta_primary_label, href: settings.hero_cta_primary_href || '#menu' }
              : null,
            settings.hero_cta_secondary_label
              ? { label: settings.hero_cta_secondary_label, href: settings.hero_cta_secondary_href || '#reservations' }
              : null
          ].filter(Boolean)
        };
        if (!nextCopy.ctas.length) {
          nextCopy.ctas = DEFAULT_HERO_COPY.ctas;
        }
        setHeroCopy(nextCopy);
        const parsedSpeed = parseInt(settings.hero_slideshow_speed, 10);
        setSlideshowSpeed(Number.isFinite(parsedSpeed) && parsedSpeed > 0 ? parsedSpeed : 6000);
        const orderedSlides = [];
        if (heroSelection.length) {
          heroSelection.forEach((entry) => {
            const rawId = entry && typeof entry === 'object' ? entry.id : entry;
            const id = Number(rawId);
            if (!Number.isFinite(id)) {
              return;
            }
            const variantSource = variantMap[String(id)];
            if (!variantSource) {
              return;
            }
            const variant = buildImageVariant(variantSource, { sizes: HERO_SIZES, maxVariants: 2 });
            if (!variant) {
              return;
            }
            orderedSlides.push({
              id,
              alt: (entry?.alt_text || entry?.title || '') || variantSource.alt_text || variantSource.title || '',
              variant
            });
          });
        }
        if (orderedSlides.length) {
          applySlides(orderedSlides);
        } else {
          idxRef.current = 0;
          setIndex(0);
          setImages([]);
        }
      } catch (error) {
        if (!cancelled) {
          idxRef.current = 0;
          setIndex(0);
          setImages([]);
        }
      }
    };
    loadHero();
    return () => {
      cancelled = true;
    };
  }, [applySlides]);

  const availableImages = useMemo(
    () => images.filter((img, i) => !failedSlideKeys.includes(getSlideKey(img, i))),
    [images, failedSlideKeys]
  );
  const displayedImages = availableImages.length ? availableImages : STATIC_HERO_SLIDES;
  const firstImageKey = displayedImages.length ? displayedImages[0]?.id ?? displayedImages[0]?.variant?.fallback ?? 'hero' : 'empty';

  useEffect(() => {
    setFirstImageLoaded(false);
    setSlideshowActive(false);
  }, [firstImageKey]);

  useEffect(() => {
    if (!displayedImages.length || !slideshowActive || displayedImages.length <= 1) {
      return undefined;
    }
    const interval = slideshowSpeed || 6000;
    const id = window.setInterval(() => {
      idxRef.current = (idxRef.current + 1) % displayedImages.length;
      setIndex(idxRef.current);
    }, interval);
    return () => window.clearInterval(id);
  }, [displayedImages.length, slideshowActive, slideshowSpeed]);

  useEffect(() => {
    if (!firstImageLoaded) return undefined;
    const activate = () => setSlideshowActive(true);
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      const idleId = window.requestIdleCallback(() => activate(), { timeout: 1500 });
      return () => {
        try {
          window.cancelIdleCallback(idleId);
        } catch (e) {
          // ignore
        }
      };
    }
    const timer = window.setTimeout(activate, 1500);
    return () => window.clearTimeout(timer);
  }, [firstImageLoaded]);

  const firstVariant = displayedImages[0]?.variant || null;
  const firstVariantKey = firstVariant
    ? firstVariant.webpSrcset || firstVariant.optimizedSrcset || firstVariant.fallback
    : null;

  useEffect(() => {
    if (!firstVariantKey || typeof document === 'undefined') return undefined;
    const variant = displayedImages[0]?.variant;
    if (!variant) return undefined;
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.dataset.heroPreload = 'true';
    if (variant.webpSrcset || variant.optimizedSrcset) {
      const srcset = variant.webpSrcset || variant.optimizedSrcset;
      link.setAttribute('imagesrcset', srcset);
      link.setAttribute('imagesizes', variant.sizes || HERO_SIZES);
    }
    link.href = variant.fallback || '';
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, [firstVariantKey, displayedImages]);

  const hasSlides = displayedImages.length > 0;
  const handleFirstImageLoad = () => {
    if (!firstImageLoaded) {
      setFirstImageLoaded(true);
    }
  };
  const handleSlideError = useCallback((slideKey) => {
    setFailedSlideKeys((current) => (
      current.includes(slideKey) ? current : [...current, slideKey]
    ));
    setFirstImageLoaded(true);
    idxRef.current = 0;
    setIndex(0);
  }, []);
  const activeIndex = displayedImages.length ? index % displayedImages.length : 0;

  return (
    <div className={`hero-shell hero-gradient ${hasSlides ? 'hero-gradient--with-images' : 'hero-gradient--empty'} text-text-inverse relative overflow-hidden`}>
      <div className={HERO_STAGE_CLASS} style={HERO_STAGE_STYLE}>
        {/* image slideshow: using <img> so it's discoverable and preloadable */}
        <div className={`${HERO_FRAME_CLASS} z-0`} aria-hidden="true">
        <picture className="absolute inset-0 block w-full h-full">
          <source
            type="image/webp"
            srcSet={STATIC_HERO_META.webpSrcset}
            sizes="100vw"
          />
          <source
            type="image/jpeg"
            srcSet={STATIC_HERO_META.jpgSrcset}
            sizes="100vw"
          />
          <img
            src={STATIC_HERO_META.fallbackSrc}
            alt={STATIC_HERO_META.alt}
            className="absolute inset-0 w-full h-full object-cover"
            loading="eager"
            fetchpriority="high"
            decoding="async"
            width={STATIC_HERO_META.width}
            height={STATIC_HERO_META.height}
          />
        </picture>
        {displayedImages.length > 0 && (
          <>
            {displayedImages.map((img, i) => {
              const slideKey = getSlideKey(img, i);
              const variant = i === 0 ? img.variant : limitHeroVariantToSingle(img.variant);
              const isVisible = i === activeIndex;
              const transitionClass = slideshowActive ? 'transition-opacity duration-1000' : '';
              const baseImgProps = {
                width: variant?.width || undefined,
                height: variant?.height || undefined,
                onError: () => handleSlideError(slideKey)
              };
              const eagerProps = i === 0
                ? {
                    decoding: 'async',
                    onLoad: handleFirstImageLoad
                  }
                : {};
              const imgProps = { ...baseImgProps, ...eagerProps };
              return (
              <div
                key={slideKey}
                className={`absolute inset-0 w-full h-full ${isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'} ${transitionClass}`}
              >
                <ResponsiveImage
                  variant={variant}
                  alt={img.alt || ''}
                  loading="lazy"
                  pictureClassName="absolute inset-0 block w-full h-full"
                  className="absolute inset-0 w-full h-full object-cover"
                  sizes={HERO_SIZES}
                  imgProps={imgProps}
                />
              </div>
              );
            })}
          </>
        )}
        </div>

        {/* overlay gradient must sit above images but below content */}
        <div className={HERO_OVERLAY_CLASS} aria-hidden="true" />

        <div className="hero-content absolute inset-0 z-20 flex flex-col items-center justify-center text-center px-4 sm:px-6 lg:px-8">
          {/* Accessibility: provide current slide text for screen readers without triggering extra image downloads */}
          {displayedImages[activeIndex]?.alt && (
            <span className="sr-only" aria-live="polite">
              {displayedImages[activeIndex].alt}
            </span>
          )}
          <div className="hero-copy-shell inline-flex flex-col gap-4 px-6 py-5 md:px-10 md:py-8 rounded-2xl shadow-lg max-w-4xl mx-auto">
            {heroCopy.title && (
              <h1 className="text-4xl md:text-6xl font-heading font-extrabold tracking-tight text-brand-cream drop-shadow-sm">
                {heroCopy.title}
              </h1>
            )}
            {heroCopy.subtitle && (
              <p className="text-lg md:text-xl text-brand-cream/90">
                {heroCopy.subtitle}
              </p>
            )}
          </div>
          <div className="hero-cta-row flex gap-4 justify-center flex-wrap mt-8">
            {heroCopy.ctas.map((cta, idx) => (
              <a
                key={`${cta.label}-${idx}`}
                href={cta.href || '#'}
                role="button"
                className={`cta-glass ${idx === 0 ? 'cta-glass--primary' : 'cta-glass--secondary'}`}
              >
                {cta.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function getSlideKey(img, i) {
  return String(img?.id ?? img?.variant?.fallback ?? i);
}

function limitHeroVariantToSingle(variant) {
  if (!variant) return null;
  const clampSrcset = (srcset) => {
    if (!srcset) return '';
    const [first] = srcset.split(',');
    return first ? first.trim() : '';
  };
  const limitedOptimized = clampSrcset(variant.optimizedSrcset);
  const limitedWebp = clampSrcset(variant.webpSrcset);
  return {
    ...variant,
    optimizedSrcset: limitedOptimized,
    webpSrcset: limitedWebp,
    sizes: HERO_SIZES
  };
}
