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

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:5001/api';

// New HeroSection: supports a simple slideshow driven by site settings (hero_images).
export default function HeroSection() {
  // images: array of { src, alt }
  const [images, setImages] = useState([]);
  const idxRef = useRef(0);
  const [index, setIndex] = useState(0);

  useEffect(() => {
  fetch(`${API_BASE}/site-settings`).then(r => r.ok ? r.json() : {}).then(async s => {
        if (Array.isArray(s?.hero_images) && s.hero_images.length) {
        const origin = API_BASE.replace(/\/api$/, '');
        setImages(s.hero_images.map(h => {
          const src = h?.file_url || '';
          const abs = /^https?:\/\//i.test(src) ? src : origin + src;
          return { src: abs, alt: (h?.alt_text || h?.title || '') };
        }));
        return;
      }

      // Fallback: if site settings don't include hero images, fetch recent hero-category media
      try {
        const mres = await fetch(`${API_BASE}/media`);
        if (!mres.ok) return;
        const list = await mres.json();
        const heroes = Array.isArray(list) ? list.filter(x => x.category === 'hero') : [];
        if (heroes.length) {
          const origin = API_BASE.replace(/\/api$/, '');
          const imgs = heroes.map(h => ({ src: origin + (h.file_url || ''), alt: (h.alt_text || h.title || '') }));
          setImages(imgs);
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

  return (
    <div className="hero-gradient text-text-inverse py-20 relative overflow-hidden">
      {/* background slideshow: always render container so z-index layering is consistent */}
  <div className="absolute inset-0 z-0" aria-hidden={images.length === 0}>
        {images.length > 0 && (
          <>
            {images.map((img, i) => (
              <div
                key={i}
                className={`absolute inset-0 transition-opacity duration-1000 ${i === index ? 'opacity-100' : 'opacity-0'}`}
                style={{ backgroundImage: `url(${img.src})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
              />
            ))}
          </>
        )}
      </div>

  {/* overlay gradient must sit above images but below content */}
  <div className="absolute inset-0 z-10 overlay-gradient" aria-hidden="true" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-20">
        {/* Accessibility: render an offscreen image with active slide alt text for screen readers */}
        {images[index] && (
          <img src={images[index].src} alt={images[index].alt || ''} className="sr-only" />
        )}
        <h1 className="hero-title text-4xl md:text-5xl font-heading font-extrabold mb-4">
          Welcome to Thunder Road
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
