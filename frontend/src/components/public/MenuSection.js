/*
  MenuSection

  Purpose:
  - Render the public menu. Loads menu categories and items from the API and
  - allows expanding/collapsing categories with measured panel animations.

  Contract:
  - Expects GET /api/menu to return an array of categories with `items` arrays.
  - Optionally reads `site-settings.menu_description` for a description override.

  Notes:
  - Uses stale-while-revalidate via `cachedFetch` to provide instant content
  -   with background refresh.
  - Panel expansion uses JS measurements to animate `max-height` smoothly.
*/
import React, { useState, useEffect, useRef } from 'react';
import { icons } from '../../icons';
import cachedFetch, { clearCacheFor } from '../../lib/cachedFetch';
import makeAbsolute from '../../lib/makeAbsolute';
import menuDescription from '../../config/menuDescription';
import LazyImage from '../LazyImage';
import { buildSrcSet, buildWebpSrcSet } from '../../utils/imageUtils';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:5001/api';

export default function MenuSection() {
  const [categories, setCategories] = useState([]);
  const [siteMenuDescription, setSiteMenuDescription] = useState(menuDescription);
  const [expandedCategory, setExpandedCategory] = useState(null);
  const panelsRef = useRef({});

  const measurePanel = (id) => {
    const el = panelsRef.current[id];
    if (!el) return;
    // Only adjust if this panel is currently expanded
    if (Number(expandedCategory) === Number(id)) {
      el.style.maxHeight = `${el.scrollHeight}px`;
    }
  };

  // initial fetch + stale-while-revalidate
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const cached = await cachedFetch(`${API_BASE}/menu`);
        if (mounted && cached) {
          const normalized = (Array.isArray(cached) ? cached : []).map(cat => ({
            ...cat,
            display_columns: cat.display_columns || 2,
            gallery_image_url: makeAbsolute(cat.gallery_image_url || cat.image_url || ''),
          }));
          setCategories(normalized);
        }

        const res = await fetch(`${API_BASE}/menu`);
        if (!res.ok) throw new Error('Failed to fetch menu');
        const fresh = await res.json();
        if (mounted) {
          const normalizedFresh = (Array.isArray(fresh) ? fresh : []).map(cat => ({
            ...cat,
            display_columns: cat.display_columns || 2,
            gallery_image_url: makeAbsolute(cat.gallery_image_url || cat.image_url || ''),
          }));
          setCategories(normalizedFresh);
        }
        // fetch site-settings (menu description) as a fallback to the build-time config
        try {
          const s = await cachedFetch(`${API_BASE}/site-settings`);
          if (mounted && s && typeof s.menu_description === 'string') setSiteMenuDescription(s.menu_description);
        } catch (e) {
          // ignore — we'll keep the build-time menuDescription
        }
      } catch (e) {
        if (mounted) setCategories([]);
      }
    })();

    const menuHandler = () => {
      clearCacheFor(`${API_BASE}/menu`);
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

  // Animate panels to exact height using JS measurement
  useEffect(() => {
    Object.keys(panelsRef.current).forEach(key => {
      const el = panelsRef.current[key];
      if (!el) return;
      if (Number(key) === Number(expandedCategory)) {
        el.style.transition = `max-height var(--panel-transition-duration, 360ms) var(--panel-transition-easing, cubic-bezier(0.2,0.8,0.2,1)), opacity var(--panel-fade-duration,240ms) linear, transform var(--panel-transition-duration,360ms) var(--panel-transition-easing, cubic-bezier(0.2,0.8,0.2,1))`;
        const target = el.scrollHeight;
        el.style.maxHeight = `${target}px`;
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      } else {
        el.style.transition = `max-height var(--panel-transition-duration, 360ms) var(--panel-transition-easing, cubic-bezier(0.2,0.8,0.2,1)), opacity var(--panel-fade-duration,240ms) linear, transform var(--panel-transition-duration,360ms) var(--panel-transition-easing, cubic-bezier(0.2,0.8,0.2,1))`;
        el.style.maxHeight = `${el.scrollHeight}px`;
        // force reflow
        // eslint-disable-next-line no-unused-expressions
        el.offsetHeight;
        el.style.maxHeight = '0';
        el.style.opacity = '0';
        el.style.transform = 'translateY(-6px)';
      }
    });
  }, [expandedCategory, categories]);

  // Re-measure helper used by image load handlers and resize
  useEffect(() => {
    const onResize = () => {
      if (!expandedCategory) return;
      const el = panelsRef.current[expandedCategory];
      if (!el) return;
      // apply current scrollHeight
      el.style.maxHeight = `${el.scrollHeight}px`;
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [expandedCategory]);

  return (
  <div id="menu" className="py-12 bg-surface-warm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl sm:text-3xl font-heading font-bold text-center mb-4">Our Menu</h2>
        {siteMenuDescription && (
          <p className="mx-auto text-center text-base leading-snug text-text-secondary w-full max-w-screen-lg px-4 sm:px-6 mb-6 whitespace-pre-line">
            {siteMenuDescription}
          </p>
        )}

        <div className="space-y-4">
          {categories.map(category => (
            <div
              key={category.id}
              className={`menu-card bg-surface rounded-lg shadow-lg overflow-hidden card-hover transition-all ${expandedCategory === category.id ? 'expanded' : ''}`}
            >
              <button
                type="button"
                onClick={() => setExpandedCategory(prev => (prev === category.id ? null : category.id))}
                className="w-full flex items-center justify-between p-4 hover:bg-surface-warm transition"
                aria-expanded={expandedCategory === category.id}
                aria-controls={`menu-cat-${category.id}`}
              >
                <div className="text-left">
                  <h3 className="text-xl md:text-2xl font-heading font-bold text-text-primary mb-1">{category.name}</h3>
                  {category.description && (
                    <p className="text-text-secondary text-sm leading-snug mt-1 whitespace-pre-line">{category.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  {React.createElement(icons.ChevronDown, { className: `chevron ${expandedCategory === category.id ? 'rotated text-primary' : 'text-text-muted'}`, size: 24 })}
                </div>
              </button>

              {(category.gallery_image_url || category.image_url) && (
                <div className="relative z-0">
                  {/* Provide responsive srcsets (webp + jpeg/png) so the browser
                      can request the smallest suitable variant generated by the
                      backend tools (e.g. name-480.webp, name-768.jpg, etc.). */}
                  <LazyImage
                    src={category.gallery_image_url || category.image_url}
                    alt={category.name}
                    onLoad={() => measurePanel(category.id)}
                    onError={() => measurePanel(category.id)}
                    className="w-full h-40"
                    sizes="100vw"
                    srcSet={buildSrcSet(category.gallery_image_url || category.image_url)}
                    sources={[
                      { srcSet: buildWebpSrcSet(category.gallery_image_url || category.image_url), type: 'image/webp', sizes: '100vw' }
                    ]}
                  />
                  <div className="absolute inset-0 overlay-gradient"></div>
                </div>
              )}

              <div
                ref={el => { panelsRef.current[category.id] = el; }}
                id={`menu-cat-${category.id}`}
                className={`relative z-20 border-t ${category.gallery_image_url ? 'expanded-panel--image' : 'bg-surface-warm'} expanded-panel ${expandedCategory === category.id ? 'expanded' : 'collapsed'}`}
                aria-hidden={expandedCategory !== category.id}
              >
                {Array.isArray(category.items) && category.items.length > 0 ? (
                  <div className={
                    category.display_columns === 2 ? 'grid grid-cols-1 md:grid-cols-2 gap-4 p-4' :
                    category.display_columns === 3 ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4' :
                    'divide-y divide-divider'
                  }>
                    {category.items.map(item => (
                      <div key={item.id} className={
                        category.display_columns >= 2 
                          ? 'p-3 bg-surface rounded border border-divider hover:border-primary transition'
                          : 'p-4 md:p-6 flex justify-between items-start hover:bg-surface-warm transition'
                      }>
                        <div className={category.display_columns >= 2 ? 'w-full' : 'flex-1'}>
                          <h4 className="text-base md:text-lg font-heading font-semibold text-text-primary">{item.name}</h4>
                          {!category.hide_descriptions && item.description && (
                            item.description.includes('|') && category.display_columns >= 2 ? (
                              <div className="text-text-secondary text-sm mt-2 columns-2 gap-3">
                                {item.description.split('|').map((text, idx) => (
                                  <div key={idx} className="break-inside-avoid mb-1">
                                    {text.trim()}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-text-secondary text-sm mt-1">{item.description}</p>
                            )
                          )}
                          {category.display_columns >= 2 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {(typeof item.price === 'number' && Number(item.price) !== 0) ? (
                                <span className="price-badge" aria-label={`Price ${item.price}`}>
                                  {item.primary_quantity ? `${item.primary_quantity} · $${item.price.toFixed(2)}` : `$${item.price.toFixed(2)}`}
                                </span>
                              ) : null}
                              {typeof item.secondary_price === 'number' && Number(item.secondary_price) !== 0 && (
                                <span className="price-badge" aria-label={`Alternate price ${item.secondary_price}`}>
                                  {item.secondary_quantity ? `${item.secondary_quantity} · ` : ''}{`$${item.secondary_price.toFixed(2)}`}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        {category.display_columns < 2 && (
                          <div className="ml-4 flex flex-col items-end">
                            {(typeof item.price === 'number' && Number(item.price) !== 0) ? (
                              <span className="price-badge" aria-label={`Price ${item.price}`}>
                                {item.primary_quantity ? `${item.primary_quantity} · $${item.price.toFixed(2)}` : `$${item.price.toFixed(2)}`}
                              </span>
                            ) : null}
                            {typeof item.secondary_price === 'number' && Number(item.secondary_price) !== 0 && (
                              <span className="price-badge mt-2" aria-label={`Alternate price ${item.secondary_price}`}>
                                {item.secondary_quantity ? `${item.secondary_quantity} · ` : ''}{`$${item.secondary_price.toFixed(2)}`}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center text-text-muted">No items in this category</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Keep a small module-scope reference so some linters that don't detect
// member-expression JSX (e.g., <icons.ChevronDown />) won't flag unused
// imports. This is intentional and safe.
const __usedMenu = { icons };
void __usedMenu;
// Mark LazyImage as used for linters that don't see JSX usages in some configs
const __usedComponents = { LazyImage };
void __usedComponents;
