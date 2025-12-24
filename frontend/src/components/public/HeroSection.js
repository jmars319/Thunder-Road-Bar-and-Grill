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

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:5001/api';

// New HeroSection: supports a simple slideshow driven by site settings (hero_images).
export default function HeroSection() {
  // images: array of { src, alt }
  const [images, setImages] = useState([]);
  const idxRef = useRef(0);
  const [index, setIndex] = useState(0);

  useEffect(() => {
  fetch(`${API_BASE}/settings`).then(r => r.ok ? r.json() : {}).then(async payload => {
        const heroVariants = Array.isArray(payload?.settings?.hero_images_variants)
          ? payload.settings.hero_images_variants
          : [];
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
        const mres = await fetch(`${API_BASE}/media?category=hero`);
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
    const id = window.setInterval(() => {
      idxRef.current = (idxRef.current + 1) % images.length;
      setIndex(idxRef.current);
    }, 6000);
    return () => window.clearInterval(id);
  }, [images]);

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
        <h1 className="hero-title text-4xl md:text-5xl font-heading font-extrabold mb-4">
          Welcome to Thunder Road Bar and Grill
        </h1>
        <p className="hero-subtitle text-lg md:text-xl opacity-90 mb-6 max-w-2xl mx-auto">
          Great Food. Cold Drinks. Good Times.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <a
            href="#menu"
            role="button"
            aria-label="View menu"
            className="bg-primary text-text-inverse px-6 py-2 rounded-lg hover:bg-primary-dark transition font-bold shadow-sm"
          >
            View Menu
          </a>
          <a
            href="#reservations"
            role="button"
            aria-label="Make a reservation"
            className="bg-surface text-text-primary px-6 py-2 rounded-lg hover:bg-surface-warm transition font-bold shadow-sm"
          >
            Make a Reservation
          </a>
        </div>
      </div>
    </div>
  );
}
