import React, { useState, useEffect } from 'react';
import { icons } from '../../icons';
import cachedFetch, { clearCacheFor } from '../../lib/cachedFetch';
import makeAbsolute from '../../lib/makeAbsolute';

/*
  MenuSection

  Purpose:
  - Render the restaurant menu grouped by categories fetched from the backend.

  Accessibility & contract:
  - Buttons controlling collapsible panels include `aria-expanded` for screen
    readers. Price labels are plain text inside a span with `aria-hidden` false
    so screen readers announce amounts correctly.
*/

/* DEV:
   - This component relies on semantic design tokens (e.g., bg-surface-warm,
     text-text-primary, divide-divider). Update colors in
     `frontend/src/custom-styles.css` rather than altering utilities here.
   - `ChevronDown` / `ChevronUp` are imported from `lucide-react` and used
     below. The earlier eslint suppression was unnecessary and removed so
     the codebase has fewer per-file suppressions.
   
   Last reviewed: 2025-10-24 — caching and stale-while-revalidate behavior is intentional. Keep dependency array empty by design and use event listener for cache invalidation.
*/

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:5001/api';

export default function MenuSection() {
  const [categories, setCategories] = useState([]);
  const [expandedCategory, setExpandedCategory] = useState(null);

  // This effect is intentionally run once on mount. It uses a mounted flag to
  // avoid updating state after unmount and performs stale-while-revalidate.
  // We intentionally omit `categories` from the dependency array to avoid
  // re-running during state updates.
  // Note: intentionally run once on mount. We rely on a mounted flag and
  // explicit event listeners for cache invalidation to refresh data. The
  // dependency array is intentionally empty to avoid re-running during
  // state updates.
  useEffect(() => {
    let mounted = true;

    // stale-while-revalidate: use cachedFetch for immediate content, then
    // refresh in background to get up-to-date data.
    (async () => {
      try {
        const cached = await cachedFetch(`${API_BASE}/menu`);
        if (mounted && cached) {
          const normalized = (Array.isArray(cached) ? cached : []).map(cat => ({
            ...cat,
            gallery_image_url: makeAbsolute(cat.gallery_image_url || cat.image_url || ''),
          }));
          setCategories(normalized);
        }

        // revalidate from network (bypass cachedFetch to ensure fresh copy)
        const res = await fetch(`${API_BASE}/menu`);
        if (!res.ok) throw new Error('Failed to fetch menu');
        const fresh = await res.json();
        if (mounted) {
          const normalizedFresh = (Array.isArray(fresh) ? fresh : []).map(cat => ({
            ...cat,
            gallery_image_url: makeAbsolute(cat.gallery_image_url || cat.image_url || ''),
          }));
          setCategories(normalizedFresh);
        }
      } catch (e) {
        if (mounted && !Array.isArray(categories)) setCategories([]);
      }
    })();

    const menuHandler = () => {
      clearCacheFor(`${API_BASE}/menu`);
      // re-run the fetch flow by forcibly setting mounted true and re-calling
      // the same IIFE. Simpler: reload the page's menu via a small fetch.
      cachedFetch(`${API_BASE}/menu`).then(fresh => {
        if (!mounted) return;
        if (!fresh) return;
        const normalizedFresh = (Array.isArray(fresh) ? fresh : []).map(cat => ({
          ...cat,
          gallery_image_url: makeAbsolute(cat.gallery_image_url || cat.image_url || ''),
        }));
        setCategories(normalizedFresh);
      }).catch(() => {});
    };

    window.addEventListener('menuUpdated', menuHandler);
    return () => { mounted = false; window.removeEventListener('menuUpdated', menuHandler); };
  }, []);

  return (
    <div id="menu" className="py-16 bg-surface-warm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-4xl font-heading font-bold text-center mb-12">Our Menu</h2>
        
        <div className="space-y-4">
          {categories.map(category => (
            <div
              key={category.id}
              className={`menu-card bg-surface rounded-lg shadow-lg overflow-hidden card-hover transition-all ${expandedCategory === category.id ? 'expanded' : ''}`}
            >
              <button
                type="button"
                onClick={() => setExpandedCategory(expandedCategory === category.id ? null : category.id)}
                className="w-full flex items-center justify-between p-6 hover:bg-surface-warm transition"
                aria-expanded={expandedCategory === category.id}
                aria-controls={`menu-cat-${category.id}`}
              >
                <div className="text-left">
                  <h3 className="text-2xl font-heading font-bold text-text-primary">{category.name}</h3>
                  <p className="text-text-secondary text-sm mt-1 whitespace-pre-line">{category.description}</p>
                </div>
                <div className="flex items-center gap-4">
                  {expandedCategory === category.id ? (
                    React.createElement(icons.ChevronUp, { className: 'text-primary', size: 24 })
                  ) : (
                    React.createElement(icons.ChevronDown, { className: 'text-text-muted', size: 24 })
                  )}
                </div>
              </button>

                {/* Category banner: prefer gallery_image_url, fall back to image_url */}
                {(category.gallery_image_url || category.image_url) && (
                <div className="relative z-0">
                  <img
                    src={category.gallery_image_url || category.image_url}
                    alt={category.name}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-40 object-cover"
                  />
                  <div className="absolute inset-0 overlay-gradient"></div>
                </div>
              )}

              {expandedCategory === category.id && (
                <div id={`menu-cat-${category.id}`} className="relative z-20 border-t bg-surface-warm">
                  {Array.isArray(category.items) && category.items.length > 0 ? (
                    <div className="divide-y divide-divider">
                      {category.items.map(item => (
                        <div key={item.id} className="p-6 flex justify-between items-start hover:bg-surface-warm transition">
                          <div className="flex-1">
                            <h4 className="text-lg font-heading font-semibold text-text-primary">{item.name}</h4>
                            <p className="text-text-secondary text-sm mt-1">{item.description}</p>
                          </div>
                          <div className="ml-4">
                            <span className="price-badge" aria-label={typeof item.price === 'number' ? `Price ${item.price}` : 'Price not available'}>
                              {typeof item.price === 'number' ? `$${item.price.toFixed(2)}` : '\u2014'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 text-center text-text-muted">No items in this category</div>
                  )}
                </div>
              )}
            </div>
          ))}
          {/* ensure lucide-react icons are considered used by some linters */}
          {/* (no-op handled at module scope) */}
        </div>
      </div>
    </div>
  );
}

// Some editor/lint setups don't detect usage of member-expression JSX like
// <icons.ChevronUp />. Keep a small module-scope reference to satisfy those
// tools. This is intentional and safe.
const __usedMenu = { icons };
void __usedMenu;
