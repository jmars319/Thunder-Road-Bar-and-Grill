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
  measurePanel,
  isLoaded = false,
  onSkeletonHeight = null,
  onContentHeight = null,
  remeasureKey = 0,
  className = ''
}) {
  const safeMenuIntro = sanitizeRichText(menuIntro || '');
  const hasCategories = Array.isArray(categories) && categories.length > 0;
  const placeholderCount = 3;
  const skeletonRef = React.useRef(null);
  const contentRef = React.useRef(null);
  const measurementRaf = React.useRef({ read: null, write: null });
  const resizeObserverRef = React.useRef(null);
  const observerKeyRef = React.useRef(null);
  const lastReportedHeight = React.useRef(0);
  const [failedBackgrounds, setFailedBackgrounds] = React.useState([]);

  const handleBackgroundError = React.useCallback((categoryId) => {
    const key = String(categoryId);
    setFailedBackgrounds((current) => (
      current.includes(key) ? current : [...current, key]
    ));
  }, []);

  const cancelMeasurementRafs = React.useCallback(() => {
    if (measurementRaf.current.read) {
      cancelAnimationFrame(measurementRaf.current.read);
      measurementRaf.current.read = null;
    }
    if (measurementRaf.current.write) {
      cancelAnimationFrame(measurementRaf.current.write);
      measurementRaf.current.write = null;
    }
  }, []);

  const commitMeasuredHeight = React.useCallback((height) => {
    if (!height || typeof onContentHeight !== 'function') return;
    measurementRaf.current.write = requestAnimationFrame(() => {
      onContentHeight(Math.ceil(height));
    });
  }, [onContentHeight]);

  const reportHeight = React.useCallback((rawHeight) => {
    if (!rawHeight) return false;
    const rounded = Math.ceil(rawHeight);
    if (lastReportedHeight.current && rounded - lastReportedHeight.current < 2) {
      return false;
    }
    lastReportedHeight.current = rounded;
    commitMeasuredHeight(rounded);
    return true;
  }, [commitMeasuredHeight]);

  const disconnectObserver = React.useCallback(() => {
    if (resizeObserverRef.current) {
      resizeObserverRef.current.disconnect();
      resizeObserverRef.current = null;
    }
  }, []);

  const measureContentHeight = React.useCallback((key) => {
    if (!contentRef.current) return;
    cancelMeasurementRafs();
    measurementRaf.current.read = requestAnimationFrame(() => {
      const measured = contentRef.current?.offsetHeight
        || contentRef.current?.getBoundingClientRect?.().height
        || 0;
      if (reportHeight(measured)) {
        observerKeyRef.current = key;
        disconnectObserver();
      }
    });
  }, [cancelMeasurementRafs, reportHeight, disconnectObserver]);

  React.useEffect(() => {
    if (isLoaded || !skeletonRef.current || typeof onSkeletonHeight !== 'function') return undefined;
    const rafId = requestAnimationFrame(() => {
      const measured = skeletonRef.current?.offsetHeight || skeletonRef.current?.getBoundingClientRect?.().height;
      if (measured) {
        onSkeletonHeight(Math.ceil(measured));
      }
    });
    return () => cancelAnimationFrame(rafId);
  }, [isLoaded, onSkeletonHeight]);

  React.useEffect(() => {
    if (!isLoaded || typeof onContentHeight !== 'function' || !contentRef.current) return undefined;
    measureContentHeight(remeasureKey);
    return () => {
      cancelMeasurementRafs();
    };
  }, [isLoaded, categories, expandedCategory, remeasureKey, onContentHeight, measureContentHeight, cancelMeasurementRafs]);

  React.useEffect(() => {
    observerKeyRef.current = null;
  }, [remeasureKey]);

  React.useEffect(() => {
    if (!isLoaded || typeof ResizeObserver === 'undefined' || !contentRef.current) return undefined;
    if (observerKeyRef.current === remeasureKey) return undefined;
    let pendingFrame = null;
    const observer = new ResizeObserver((entries) => {
      const entry = entries?.[0];
      if (pendingFrame) cancelAnimationFrame(pendingFrame);
      pendingFrame = requestAnimationFrame(() => {
        const measured = entry?.contentRect?.height;
        if (reportHeight(measured)) {
          observerKeyRef.current = remeasureKey;
          observer.disconnect();
        }
      });
    });
    resizeObserverRef.current = observer;
    observer.observe(contentRef.current);
    return () => {
      if (pendingFrame) cancelAnimationFrame(pendingFrame);
      observer.disconnect();
      if (resizeObserverRef.current === observer) {
        resizeObserverRef.current = null;
      }
    };
  }, [isLoaded, remeasureKey, reportHeight]);

  return (
    <div className={className}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {menuHeading && <h2 className="text-2xl sm:text-3xl font-heading font-bold text-center mb-4">{menuHeading}</h2>}
        {safeMenuIntro && (
          <div
            className="mx-auto text-center text-base leading-snug text-text-secondary w-full max-w-screen-lg px-4 sm:px-6 mb-6 menu-intro"
            dangerouslySetInnerHTML={{ __html: safeMenuIntro }}
          />
        )}

        <div
          className="space-y-4"
          aria-busy={!isLoaded}
          ref={isLoaded ? contentRef : null}
        >
          {!isLoaded ? (
            <div className="grid gap-4" aria-hidden="true" ref={skeletonRef}>
              {Array.from({ length: placeholderCount }).map((_, idx) => (
                <div
                  key={`menu-skeleton-${idx}`}
                  className="h-44 md:h-48 rounded-xl bg-surface shadow-inner border border-divider/60 animate-pulse"
                />
              ))}
            </div>
          ) : hasCategories ? (
            categories.map(category => {
            const heroVariant = category.heroVariant || null;
            const fallbackBackground = category.gallery_image_url || null;
            const backgroundFailed = failedBackgrounds.includes(String(category.id));
            const hasResponsiveHero = !backgroundFailed && Boolean(heroVariant?.fallback || heroVariant?.optimizedSrcset || heroVariant?.webpSrcset);
            const hasFallbackImage = !backgroundFailed && Boolean(fallbackBackground);
            const hasBackground = hasResponsiveHero || hasFallbackImage;
            const cardSurfaceClass = hasBackground ? 'menu-card--image' : 'menu-card--plain';
            return (
            <div
              key={category.id}
              className={`menu-card ${cardSurfaceClass} bg-surface rounded-lg shadow-lg overflow-hidden card-hover transition-all ${expandedCategory === category.id ? 'expanded' : ''}`}
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
                        imgProps={{ onError: () => handleBackgroundError(category.id) }}
                      />
                    ) : (
                    <img
                      src={fallbackBackground}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      width="960"
                      height="540"
                      className="absolute inset-0 w-full h-full object-cover"
                      onError={() => handleBackgroundError(category.id)}
                    />
                    )}
                    <div className="absolute inset-0 bg-black/25" />
                  </div>
                )}
                <div className="relative z-10 flex items-center justify-between p-4">
                  <div className={`text-left max-w-3xl ${hasBackground ? 'text-white' : ''}`}>
                    <div className={`inline-flex flex-col gap-2 px-4 py-3 rounded-lg ${hasBackground ? 'bg-black/30 backdrop-blur-sm' : ''}`}>
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
          })) : (
            <div className="p-6 text-center text-text-muted border border-dashed border-divider rounded-xl">
              Menu is being updated. Please check back soon.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
