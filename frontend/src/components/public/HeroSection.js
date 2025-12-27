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

import { useEffect, useState, useRef, useCallback } from 'react';
import { buildImageVariant } from '../../utils/imageVariants';
import ResponsiveImage from '../common/ResponsiveImage';
import { getApiUrl } from '../../config/api';
import cachedFetch from '../../lib/cachedFetch';

// New HeroSection: supports a simple slideshow driven by site settings (hero_images).
export default function HeroSection() {
  // images: array of { src, alt }
  const [images, setImages] = useState([]);
  const [heroCopy, setHeroCopy] = useState({ title: '', subtitle: '', ctas: [] });
  const [slideshowSpeed, setSlideshowSpeed] = useState(6000);
  const idxRef = useRef(0);
  const [index, setIndex] = useState(0);

  const applySlides = useCallback((slides) => {
    if (!Array.isArray(slides)) {
      return;
    }
    idxRef.current = 0;
    setIndex(0);
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
        setHeroCopy({
          title: settings.hero_title || '',
          subtitle: settings.hero_subtitle || '',
          ctas: [
            settings.hero_cta_primary_label ? { label: settings.hero_cta_primary_label, href: settings.hero_cta_primary_href || '#menu' } : null,
            settings.hero_cta_secondary_label ? { label: settings.hero_cta_secondary_label, href: settings.hero_cta_secondary_href || '#reservations' } : null
          ].filter(Boolean)
        });
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
            const variant = buildImageVariant(variantSource, { sizes: '100vw' });
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

  useEffect(() => {
    if (!images.length) return;
    const interval = slideshowSpeed || 6000;
    const id = window.setInterval(() => {
      idxRef.current = (idxRef.current + 1) % images.length;
      setIndex(idxRef.current);
    }, interval);
    return () => window.clearInterval(id);
  }, [images, slideshowSpeed]);

  const hasSlides = images.length > 0;

  return (
    <div className={`hero-gradient ${hasSlides ? 'hero-gradient--with-images' : 'hero-gradient--empty'} text-text-inverse py-20 relative overflow-hidden`}>
      {/* image slideshow: using <img> so it's discoverable and preloadable */}
      <div className="absolute inset-0 z-0" aria-hidden={images.length === 0}>
        {images.length > 0 && (
          <>
            {images.map((img, i) => {
              const variant = i === 0 ? img.variant : limitHeroVariantToSingle(img.variant);
              return (
              <div
                key={img.id || i}
                className={`absolute inset-0 w-full h-full ${i === index ? 'opacity-100' : 'opacity-0'} transition-opacity duration-1000`}
              >
                <ResponsiveImage
                  variant={variant}
                  alt={img.alt || ''}
                  loading={i === 0 ? 'eager' : 'lazy'}
                  pictureClassName="absolute inset-0 block w-full h-full"
                  className="absolute inset-0 w-full h-full object-cover"
                  sizes="100vw"
                  imgProps={i === 0 ? { fetchpriority: 'high' } : {}}
                />
              </div>
              );
            })}
          </>
        )}
      </div>

  {/* overlay gradient must sit above images but below content */}
  <div className="absolute inset-0 z-10 overlay-gradient" aria-hidden="true" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-20">
        {/* Accessibility: provide current slide text for screen readers without triggering extra image downloads */}
        {images[index]?.alt && (
          <span className="sr-only" aria-live="polite">
            {images[index].alt}
          </span>
        )}
        <div className="hero-copy-shell inline-flex flex-col gap-4 px-6 py-5 rounded-2xl bg-black/45 backdrop-blur-md shadow-xl max-w-3xl mx-auto">
          {heroCopy.title && (
            <h1 className="text-4xl md:text-5xl font-heading font-extrabold tracking-tight text-brand-cream drop-shadow-sm">
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
  );
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
    webpSrcset: limitedWebp
  };
}
