import React, { useState, useEffect, useRef } from 'react';
import { icons } from '../../icons';
import cachedFetch, { clearCacheFor } from '../../lib/cachedFetch';
import makeAbsolute from '../../lib/makeAbsolute';
import menuDescription from '../../config/menuDescription';

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
    <div id="menu" className="py-16 bg-surface-warm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-4xl font-heading font-bold text-center mb-4">Our Menu</h2>
        {siteMenuDescription && (
          <p className="mx-auto text-center text-lg text-text-secondary max-w-2xl mb-8 whitespace-pre-line">
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
                className="w-full flex items-center justify-between p-6 hover:bg-surface-warm transition"
                aria-expanded={expandedCategory === category.id}
                aria-controls={`menu-cat-${category.id}`}
              >
                <div className="text-left">
                  <h3 className="text-2xl font-heading font-bold text-text-primary">{category.name}</h3>
                  <p className="text-text-secondary text-base leading-relaxed mt-1 whitespace-pre-line">{category.description}</p>
                </div>
                <div className="flex items-center gap-4">
                  {React.createElement(icons.ChevronDown, { className: `chevron ${expandedCategory === category.id ? 'rotated text-primary' : 'text-text-muted'}`, size: 24 })}
                </div>
              </button>

              {(category.gallery_image_url || category.image_url) && (
                <div className="relative z-0">
                  <img
                    src={category.gallery_image_url || category.image_url}
                    alt={category.name}
                    loading="lazy"
                    decoding="async"
                    onLoad={() => measurePanel(category.id)}
                    onError={() => measurePanel(category.id)}
                    className="w-full h-40 object-cover"
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
                  <div className="divide-y divide-divider">
                    {category.items.map(item => (
                      <div key={item.id} className="p-6 flex justify-between items-start hover:bg-surface-warm transition">
                        <div className="flex-1">
                          <h4 className="text-lg font-heading font-semibold text-text-primary">{item.name}</h4>
                          <p className="text-text-secondary text-sm mt-1">{item.description}</p>
                        </div>
                        <div className="ml-4 flex flex-col items-end">
                          <span className="price-badge" aria-label={typeof item.price === 'number' ? `Price ${item.price}` : 'Price not available'}>
                            {typeof item.price === 'number'
                              ? (
                                item.primary_quantity
                                  ? `${item.primary_quantity} · $${item.price.toFixed(2)}`
                                  : `$${item.price.toFixed(2)}`
                              )
                              : '\u2014'
                            }
                          </span>
                          {typeof item.secondary_price === 'number' && (
                            <span className="price-badge mt-2" aria-label={`Alternate price ${item.secondary_price}`}>
                              {item.secondary_quantity ? `${item.secondary_quantity} · ` : ''}{`$${item.secondary_price.toFixed(2)}`}
                            </span>
                          )}
                        </div>
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
