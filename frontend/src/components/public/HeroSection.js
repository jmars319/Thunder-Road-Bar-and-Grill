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

import { useEffect, useState, useRef } from 'react';
import { buildImageVariant, hasRenderableImageVariant } from '../../utils/imageVariants';
import ResponsiveImage from '../common/ResponsiveImage';
import { getApiUrl } from '../../config/api';

// New HeroSection: supports a simple slideshow driven by site settings (hero_images).
export default function HeroSection() {
  // images: array of { src, alt }
  const [images, setImages] = useState([]);
  const [heroCopy, setHeroCopy] = useState({ title: '', subtitle: '', ctas: [] });
  const [slideshowSpeed, setSlideshowSpeed] = useState(6000);
  const idxRef = useRef(0);
  const [index, setIndex] = useState(0);

  useEffect(() => {
  fetch(getApiUrl('/settings')).then(r => r.ok ? r.json() : {}).then(async payload => {
        const heroVariants = Array.isArray(payload?.settings?.hero_images_variants)
          ? payload.settings.hero_images_variants
          : [];
        const settings = payload?.settings || {};
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
        if (heroVariants.length) {
          const normalized = heroVariants
            .map((hero) => ({
              id: hero.id,
              alt: hero.alt_text || hero.title || '',
              variant: buildImageVariant(hero, { sizes: '100vw' })
            }))
            .filter((entry) => entry.variant);
          if (normalized.length) {
            setImages(normalized);
            return;
          }
        }

      // Fallback: if site settings don't include hero images, fetch recent hero-category media
      try {
        const mres = await fetch(getApiUrl('/media?category=hero'));
        if (!mres.ok) return;
        const payload = await mres.json();
        const heroes = Array.isArray(payload?.media) ? payload.media : Array.isArray(payload) ? payload : [];
        const filtered = heroes.filter((entry) => hasRenderableImageVariant(entry));
        if (filtered.length) {
          const variants = filtered.map((entry) => ({
            id: entry.id,
            alt: entry.alt_text || entry.title || '',
            variant: buildImageVariant(entry, { sizes: '100vw' })
          })).filter((img) => img.variant);
          setImages(variants);
        }
      } catch (e) {
        // ignore fallback failure
      }
  }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!images.length) return;
    const interval = slideshowSpeed || 6000;
    const id = window.setInterval(() => {
      idxRef.current = (idxRef.current + 1) % images.length;
      setIndex(idxRef.current);
    }, interval);
    return () => window.clearInterval(id);
  }, [images, slideshowSpeed]);

  // Render the hero as image elements so Lighthouse and browsers can discover
  // and prioritize the LCP image. Use object-fit to maintain cover behavior
  // and preload the first image with high priority to improve LCP.
  useEffect(() => {
    if (!images.length) return;
    const first = images[0];
    if (!first?.variant?.fallback) return;
    let link;
    try {
      link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = first.variant.webpSrcset ? first.variant.webpSrcset.split(' ')[0] : first.variant.fallback;
      link.setAttribute('fetchpriority', 'high');
      document.head.appendChild(link);
    } catch (e) {
      // ignore
    }
    return () => {
      if (link && link.parentNode) link.parentNode.removeChild(link);
    };
  }, [images]);

  return (
    <div className="hero-gradient text-text-inverse py-20 relative overflow-hidden">
      {/* image slideshow: using <img> so it's discoverable and preloadable */}
      <div className="absolute inset-0 z-0" aria-hidden={images.length === 0}>
        {images.length > 0 && (
          <>
            {images.map((img, i) => (
              <div
                key={img.id || i}
                className={`absolute inset-0 w-full h-full ${i === index ? 'opacity-100' : 'opacity-0'} transition-opacity duration-1000`}
              >
                <ResponsiveImage
                  variant={img.variant}
                  alt={img.alt || ''}
                  loading={i === 0 ? 'eager' : 'lazy'}
                  pictureClassName="absolute inset-0 block w-full h-full"
                  className="absolute inset-0 w-full h-full object-cover"
                  imgProps={i === 0 ? { fetchpriority: 'high' } : {}}
                />
              </div>
            ))}
          </>
        )}
      </div>

  {/* overlay gradient must sit above images but below content */}
  <div className="absolute inset-0 z-10 overlay-gradient" aria-hidden="true" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-20">
        {/* Accessibility: render an offscreen image with active slide alt text for screen readers */}
        {images[index]?.variant?.fallback && (
          <img src={images[index].variant.fallback} alt={images[index].alt || ''} className="sr-only" />
        )}
        <div className="inline-flex flex-col gap-4 px-6 py-5 rounded-2xl bg-black/45 backdrop-blur-md shadow-xl max-w-3xl mx-auto">
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
        <div className="flex gap-4 justify-center flex-wrap mt-8">
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
