import React from 'react';
import { icons } from '../../icons';
import { sanitizeRichText } from '../../utils/richText';
import ResponsiveImage from '../common/ResponsiveImage';

export default function MenuDisplay({
  categories = [],
  menuHeading = '',
  menuIntro = '',
  expandedCategory,
  onToggleCategory,
  panelsRef,
  measurePanel
}) {
  const safeMenuIntro = sanitizeRichText(menuIntro || '');

  return (
    <div className="py-12 bg-surface-warm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {menuHeading && <h2 className="text-2xl sm:text-3xl font-heading font-bold text-center mb-4">{menuHeading}</h2>}
        {safeMenuIntro && (
          <div
            className="mx-auto text-center text-base leading-snug text-text-secondary w-full max-w-screen-lg px-4 sm:px-6 mb-6 menu-intro"
            dangerouslySetInnerHTML={{ __html: safeMenuIntro }}
          />
        )}

        <div className="space-y-4">
          {categories.map(category => {
            const heroVariant = category.heroVariant || null;
            const fallbackBackground = category.gallery_image_url || null;
            const hasResponsiveHero = Boolean(heroVariant?.fallback || heroVariant?.optimizedSrcset || heroVariant?.webpSrcset);
            const hasFallbackImage = Boolean(fallbackBackground);
            const hasBackground = hasResponsiveHero || hasFallbackImage;
            return (
            <div
              key={category.id}
              className={`menu-card bg-surface rounded-lg shadow-lg overflow-hidden card-hover transition-all ${expandedCategory === category.id ? 'expanded' : ''}`}
            >
              <button
                type="button"
                onClick={() => onToggleCategory(category.id)}
                className={`relative w-full text-left overflow-hidden transition ${hasBackground ? 'min-h-[180px]' : 'hover:bg-surface-warm'}`}
                aria-expanded={expandedCategory === category.id}
                aria-controls={`menu-cat-${category.id}`}
              >
                {hasBackground && (
                  <div className="absolute inset-0" aria-hidden="true">
                    {hasResponsiveHero ? (
                      <ResponsiveImage
                        variant={heroVariant}
                        alt=""
                        loading="lazy"
                        pictureClassName="absolute inset-0 block w-full h-full"
                        className="absolute inset-0 w-full h-full object-cover"
                        sizes="(max-width: 768px) 100vw, (max-width: 1280px) 90vw, 70vw"
                      />
                    ) : (
                      <img
                        src={fallbackBackground}
                        alt=""
                        loading="lazy"
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    )}
                    <div className="absolute inset-0 bg-black/35" />
                  </div>
                )}
                <div className="relative z-10 flex items-center justify-between p-4">
                  <div className={`text-left max-w-3xl ${hasBackground ? 'text-white' : ''}`}>
                    <div className={`inline-flex flex-col gap-2 px-4 py-3 rounded-lg ${hasBackground ? 'bg-black/35 backdrop-blur-md' : ''}`}>
                      <h3 className="text-xl md:text-2xl font-heading font-bold mb-1">{category.name}</h3>
                      {category.description && (
                        <div
                          className="text-sm leading-snug menu-description"
                          dangerouslySetInnerHTML={{ __html: sanitizeRichText(category.description || '') }}
                        />
                      )}
                    </div>
                  </div>
                  <div className={`flex items-center gap-4 ${hasBackground ? 'text-white' : ''}`}>
                    {React.createElement(icons.ChevronDown, { className: `chevron ${expandedCategory === category.id ? 'rotated text-primary' : (hasBackground ? 'text-white' : 'text-text-muted')}`, size: 24 })}
                  </div>
                </div>
              </button>

              <div
                ref={el => { if (panelsRef?.current) panelsRef.current[category.id] = el; }}
                id={`menu-cat-${category.id}`}
                className={`relative z-20 border-t ${hasBackground ? 'expanded-panel--image' : 'bg-surface-warm'} expanded-panel ${expandedCategory === category.id ? 'expanded' : 'collapsed'}`}
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
                            <div
                              className="text-text-secondary text-sm mt-1 menu-item-description"
                              dangerouslySetInnerHTML={{ __html: sanitizeRichText(item.description || '') }}
                            />
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
            );
          })}
        </div>
      </div>
    </div>
  );
}
