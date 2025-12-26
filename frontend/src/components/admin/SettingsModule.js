/*
  SettingsModule

  Purpose:
  - Admin settings page for business information, site branding, and basic site configuration.

  Contract:
  - Rendered inside the admin shell. Reads and updates site settings via API.

  Notes:
  - Changing branding text (hero copy, section headings, etc.) should trigger a `siteSettingsUpdated` event so the public site updates live.
*/
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { clearCacheFor } from '../../lib/cachedFetch';
import { icons } from '../../icons';
import { authenticatedFetch, API_BASE } from '../../utils/api';
import RichTextField from './RichTextField';
import NavigationEditor from './NavigationEditor';
import Spinner from '../ui/Spinner';
import makeAbsolute from '../../lib/makeAbsolute';
import { buildImageVariant, hasRenderableImageVariant } from '../../utils/imageVariants';

const normalizeHeroImages = (rawValue, fallbackVariants = []) => {
  const asArray = (() => {
    if (Array.isArray(rawValue)) return rawValue;
    if (typeof rawValue === 'string') {
      try {
        const parsed = JSON.parse(rawValue);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  })();

  if (asArray.length > 0) {
    // Ensure id/title/alt_text fields exist and ids are numeric
    return asArray
      .map((entry) => ({
        id: typeof entry.id === 'number' ? entry.id : Number(entry.id),
        title: entry.title || '',
        alt_text: entry.alt_text || ''
      }))
      .filter((entry) => Number.isFinite(entry.id));
  }

  if (!Array.isArray(fallbackVariants) || fallbackVariants.length === 0) {
    return [];
  }

  return fallbackVariants
    .map((variant) => ({
      id: typeof variant.id === 'number' ? variant.id : Number(variant.id),
      title: variant.title || '',
      alt_text: variant.alt_text || ''
    }))
    .filter((entry) => Number.isFinite(entry.id));
};

/*
  SettingsModule

  Purpose:
  - Admin area to manage global site settings, the About content, and business hours.

  API expectations:
  - GET /api/settings -> { ... }
  - PUT /api/site-settings
  - GET /api/about -> { header, paragraph, map_embed_url }
  - PUT /api/about
  - GET /api/business-hours -> [ { id, day_of_week, opening_time, closing_time, is_closed }, ... ]
  - PUT /api/business-hours/:id

  Notes:
  - All network calls are performed with minimal optimistic UX. Errors are caught and silently ignored
    to keep the admin UI responsive; consider surfacing errors to the user via toasts for a better UX.
*/

function SettingsModule() {
  const [siteSettings, setSiteSettings] = useState({});
  const [aboutContent, setAboutContent] = useState({});
  const [businessHours, setBusinessHours] = useState([]);
  const [selectedArea, setSelectedArea] = useState('kitchen');
  const [saved, setSaved] = useState(false);
  const [menuSaved, setMenuSaved] = useState(false);
  const [heroMedia, setHeroMedia] = useState([]);
  const [loadingHeroMedia, setLoadingHeroMedia] = useState(false);
  const [heroMediaError, setHeroMediaError] = useState('');
  const [openSections, setOpenSections] = useState({
    business: true,
    heroCopy: true,
    heroImages: true,
    menuCopy: true,
    reservations: true,
    about: true,
    jobs: true,
    footer: true,
    navigation: false,
    businessHours: true
  });
  const originalSettingsRef = useRef({});
  const heroDragIndexRef = useRef(null);
  const toggleSection = useCallback((key) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  useEffect(() => {
    // Load all settings in a single async function with error handling
    const loadAll = async () => {
      try {
        const [siteRes, aboutRes, hoursRes] = await Promise.all([
          authenticatedFetch('/settings'),
          authenticatedFetch('/about'),
          authenticatedFetch('/business-hours')
        ]);

        if (siteRes.ok) {
          const siteData = await siteRes.json();
          const settingsPayload = siteData?.settings || {};
          settingsPayload.hero_images = normalizeHeroImages(
            settingsPayload.hero_images,
            settingsPayload.hero_images_variants
          );
          const parsedSpeed = parseInt(settingsPayload.hero_slideshow_speed, 10);
          settingsPayload.hero_slideshow_speed = Number.isFinite(parsedSpeed) && parsedSpeed > 0 ? parsedSpeed : 6000;
          const normalizedSettings = JSON.parse(JSON.stringify(settingsPayload));
          setSiteSettings(normalizedSettings);
          originalSettingsRef.current = normalizedSettings;
        }

        if (aboutRes.ok) {
          const aboutData = await aboutRes.json();
          setAboutContent(aboutData || {});
        }

        if (hoursRes.ok) {
          const hoursData = await hoursRes.json();
          setBusinessHours(Array.isArray(hoursData) ? hoursData : []);
        }
      } catch {
        // Intentionally quiet: admin UI will render empty/default values on error
        setSiteSettings({});
        setAboutContent({});
        setBusinessHours([]);
      }
    };

    loadAll();
  }, []);

  const loadHeroMedia = useCallback(async () => {
    setLoadingHeroMedia(true);
    setHeroMediaError('');
    try {
      const res = await authenticatedFetch('/media?category=hero&limit=200');
      if (!res.ok) throw new Error('Failed to load hero media');
      const payload = await res.json();
      const list = Array.isArray(payload?.media)
        ? payload.media
        : Array.isArray(payload)
          ? payload
          : [];
      setHeroMedia(list);
    } catch (err) {
      setHeroMedia([]);
      setHeroMediaError('Unable to load hero images. Upload hero images from Media Manager and try again.');
    } finally {
      setLoadingHeroMedia(false);
    }
  }, []);

  useEffect(() => {
    loadHeroMedia();
    const handler = () => loadHeroMedia();
    window.addEventListener('mediaUpdated', handler);
    return () => window.removeEventListener('mediaUpdated', handler);
  }, [loadHeroMedia]);

  const updateHeroImages = useCallback((updater) => {
    setSiteSettings((prev) => {
      const current = Array.isArray(prev.hero_images) ? prev.hero_images : [];
      const next = typeof updater === 'function' ? updater(current) : updater;
      return { ...prev, hero_images: next };
    });
  }, []);

  const heroSelection = useMemo(() => {
    const base = Array.isArray(siteSettings.hero_images) ? siteSettings.hero_images : [];
    if (base.length > 0) {
      return base;
    }

    const fallbackList = Array.isArray(siteSettings.hero_images_variants)
      ? siteSettings.hero_images_variants
      : [];

    return fallbackList
      .map((entry) => ({
        id: typeof entry.id === 'number' ? entry.id : Number(entry.id),
        title: entry.title || '',
        alt_text: entry.alt_text || ''
      }))
      .filter((entry) => Number.isFinite(entry.id));
  }, [siteSettings.hero_images, siteSettings.hero_images_variants]);

  const heroSelectionIds = useMemo(() => heroSelection.map((entry) => Number(entry.id)), [heroSelection]);

  const heroMediaMap = useMemo(() => {
    return heroMedia.reduce((acc, item) => {
      if (item && typeof item.id !== 'undefined') {
        const key = String(item.id);
        acc[key] = item;
      }
      return acc;
    }, {});
  }, [heroMedia]);

  const heroVariantMap = useMemo(() => {
    const list = Array.isArray(siteSettings.hero_images_variants)
      ? siteSettings.hero_images_variants
      : [];
    return list.reduce((acc, entry) => {
      if (!entry) return acc;
      const id = Number(entry.id);
      if (Number.isFinite(id)) {
        acc[String(id)] = entry;
      }
      return acc;
    }, {});
  }, [siteSettings.hero_images_variants]);

  const availableHeroMedia = useMemo(() => {
    if (!heroMedia.length) return [];
    return heroMedia.filter((item) => !heroSelectionIds.includes(Number(item.id)));
  }, [heroMedia, heroSelectionIds]);

  const heroSelectionHydrated = heroSelection.map((entry) => {
    const key = String(entry.id);
    return {
      ...entry,
      media: heroMediaMap[key] || heroVariantMap[key]
    };
  });

  const heroPreviewUrl = (media) => {
    if (!media) return '';
    if (hasRenderableImageVariant(media)) {
      const variant = buildImageVariant(media, { sizes: '320px' });
      if (variant?.fallback) return variant.fallback;
    }
    return makeAbsolute(
      media.fallback_original ||
        media.file_url ||
        media.optimized_path ||
        media.webp_path ||
        ''
    );
  };

  const handleHeroAdd = (media) => {
    if (!media?.id) return;
    const numericId = Number(media.id);
    if (!Number.isFinite(numericId)) return;
    updateHeroImages((current) => {
      if (current.some((entry) => Number(entry.id) === numericId)) return current;
      return [
        ...current,
        {
          id: numericId,
          title: media.title || media.file_name || '',
          alt_text: media.alt_text || ''
        }
      ];
    });
  };

  const handleHeroRemove = (id) => {
    const numeric = Number(id);
    updateHeroImages((current) => current.filter((entry) => Number(entry.id) !== numeric));
  };

  const handleHeroMetaChange = (index, field, value) => {
    updateHeroImages((current) =>
      current.map((entry, idx) => (idx === index ? { ...entry, [field]: value } : entry))
    );
  };

  const moveHero = (index, direction) => {
    updateHeroImages((current) => {
      const next = [...current];
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= next.length) return current;
      const [item] = next.splice(index, 1);
      next.splice(targetIndex, 0, item);
      return next;
    });
  };

  const handleHeroDragStart = (index) => {
    heroDragIndexRef.current = index;
  };

  const handleHeroDragOver = (event) => {
    event.preventDefault();
  };

  const handleHeroDrop = (targetIndex) => {
    const from = heroDragIndexRef.current;
    heroDragIndexRef.current = null;
    if (from === null || from === targetIndex) return;
    updateHeroImages((current) => {
      if (from < 0 || from >= current.length || targetIndex < 0 || targetIndex >= current.length) {
        return current;
      }
      const next = [...current];
      const [item] = next.splice(from, 1);
      next.splice(targetIndex, 0, item);
      return next;
    });
  };

  const handleHeroDragEnd = () => {
    heroDragIndexRef.current = null;
  };

  const saveSiteSettings = async () => {
    try {
      // Send only fields that changed to avoid overwriting unrelated values
      const orig = originalSettingsRef.current || {};
      const payload = {};
      const keys = [
        'business_name','tagline','phone','email','address','hero_images','hero_slideshow_speed','instagram','facebook','google',
        'hero_title','hero_subtitle','hero_cta_primary_label','hero_cta_primary_href','hero_cta_secondary_label','hero_cta_secondary_href',
        'menu_heading','menu_intro',
        'reservations_heading','reservations_intro','reservations_success_copy','reservations_error_copy',
        'about_heading','about_intro',
        'jobs_success_copy','jobs_error_copy',
        'jobs_sidebar_heading','jobs_sidebar_intro','jobs_sidebar_benefits','jobs_positions_label'
      ];
      for (const k of keys) {
        const cur = siteSettings[k];
        const o = orig[k];
        if (Array.isArray(cur) || Array.isArray(o)) {
          const curJson = JSON.stringify(cur || []);
          const oJson = JSON.stringify(o || []);
          if (curJson !== oJson) payload[k] = cur;
        } else if (cur !== o) {
          payload[k] = cur;
        }
      }

      // If nothing changed, show a quick saved indicator and return
      if (Object.keys(payload).length === 0) {
        setSaved(true);
        setTimeout(() => setSaved(false), 1200);
        return;
      }

      // Ensure google is always sent when present in the UI. Some browsers or
      // minimal-diff logic can omit fields unexpectedly; force-send google when
      // the admin filled it so the backend gets the updated value.
      try {
        if ((typeof siteSettings.google !== 'undefined') && !Object.prototype.hasOwnProperty.call(payload, 'google')) {
          payload.google = siteSettings.google;
        }
      } catch (e) {}

      const res = await authenticatedFetch('/site-settings', {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        // Clear cached entries that depend on site-settings and menu so public UI updates immediately
        clearCacheFor(`${API_BASE}/settings`);
        clearCacheFor(`${API_BASE}/menu`);
        // Emit window events so other tabs/components can respond
        try {
          const Ev = (typeof window !== 'undefined' && window.CustomEvent) ? window.CustomEvent : (typeof window !== 'undefined' ? window.Event : null);
          if (Ev) {
            window.dispatchEvent(new Ev('siteSettingsUpdated'));
            window.dispatchEvent(new Ev('menuUpdated'));
          }
        } catch (e) {}

        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        // update original copy to reflect saved state
        try { originalSettingsRef.current = { ...(originalSettingsRef.current || {}), ...payload }; } catch (e) {}
        // show a small toast if the menu description was part of the save
        if (siteSettings.menu_intro && siteSettings.menu_intro.length > 0) {
          setMenuSaved(true);
          setTimeout(() => setMenuSaved(false), 2500);
        }
      }
    } catch {
      // swallow for now; could show toast on failure
    }
  };

  const saveAboutContent = async () => {
    try {
      // If admin pasted a full <iframe ...> HTML snippet into the Map Embed URL
      // field, extract the src attribute and store that instead of the raw HTML.
      const payload = { ...aboutContent };
      if (payload.map_embed_url && typeof payload.map_embed_url === 'string') {
        const trimmed = payload.map_embed_url.trim();
        // Detect an iframe tag quickly
        if (/^<iframe\s+/i.test(trimmed)) {
          // Extract src attribute value
          const match = trimmed.match(/src\s*=\s*"([^"]+)"/i);
          if (match && match[1]) {
            payload.map_embed_url = match[1];
          } else {
            // Try single-quoted src
            const match2 = trimmed.match(/src\s*=\s*'([^']+)'/i);
            if (match2 && match2[1]) payload.map_embed_url = match2[1];
          }
        }
      }

      const res = await authenticatedFetch('/about', {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
  } catch {
    // swallow for now; consider showing an error toast
    }
  };

  // Update a single day's hours. Returns the fetch Response so callers can handle errors.
  const saveBusinessHours = async (id, data) => {
    try {
      const res = await authenticatedFetch(`/business-hours/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
      return res;
    } catch (err) {
      // bubble up so caller can surface an error
      throw err;
    }
  };

  // Save all business hours in one action. This calls the single-day PUT for
  // each entry and then refetches the hours to ensure the UI matches server state.
  const saveAllBusinessHours = async () => {
    try {
      const saves = businessHours.map((d) => saveBusinessHours(d.id, d));
      const results = await Promise.allSettled(saves);

      const rejected = results.filter(r => r.status === 'rejected');
      const failed = results.filter(r => r.status === 'fulfilled' && !r.value.ok);

      if (rejected.length || failed.length) {
        // Surface a generic error message; for more granularity we could
        // examine individual responses and show per-day messages.
        setSaved(false);
        setTimeout(() => setSaved(false), 2000);
        // throw to allow downstream handling (e.g., toasts)
        throw new Error('One or more days failed to save');
      }

      // All saved successfully — refetch hours to ensure canonical state
      try {
        const hr = await authenticatedFetch('/business-hours');
        if (hr.ok) {
          const data = await hr.json();
          setBusinessHours(Array.isArray(data) ? data : []);
        }
      } catch (e) {
        // ignore refetch errors — we still mark saved
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Failed to save business hours:', err && err.message);
      setSaved(false);
    }
  };

  return (
    <div className="space-y-6">
      {saved && (
    <div className="bg-success text-text-inverse px-4 py-3 rounded-lg flex items-center gap-2">
          <icons.Save size={18} />
          Settings saved successfully!
        </div>
      )}

      <CollapsibleCard
        title="Business Identity"
        helper="Appears anywhere the business name is rendered (hero, footer, SEO)."
        isOpen={openSections.business}
        onToggle={() => toggleSection('business')}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field
            label="Business Name"
            value={siteSettings.business_name || ''}
            onChange={(v) => setSiteSettings({ ...siteSettings, business_name: v })}
          />
          <Field
            label="Tagline"
            value={siteSettings.tagline || ''}
            onChange={(v) => setSiteSettings({ ...siteSettings, tagline: v })}
            helper="Appears beneath the hero title if no hero subtitle is set."
          />
        </div>
      </CollapsibleCard>

      <CollapsibleCard
        title="Hero Copy"
        helper="Appears on the homepage hero headline and CTA buttons."
        isOpen={openSections.heroCopy}
        onToggle={() => toggleSection('heroCopy')}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Hero Title" value={siteSettings.hero_title || ''} onChange={(v) => setSiteSettings({ ...siteSettings, hero_title: v })} />
          <Field label="Hero Subtitle" value={siteSettings.hero_subtitle || ''} onChange={(v) => setSiteSettings({ ...siteSettings, hero_subtitle: v })} />
          <Field label="Primary CTA Label" value={siteSettings.hero_cta_primary_label || ''} onChange={(v) => setSiteSettings({ ...siteSettings, hero_cta_primary_label: v })} />
          <Field label="Primary CTA Link" value={siteSettings.hero_cta_primary_href || ''} onChange={(v) => setSiteSettings({ ...siteSettings, hero_cta_primary_href: v })} helper="Accepts full URLs or #section anchors." />
          <Field label="Secondary CTA Label" value={siteSettings.hero_cta_secondary_label || ''} onChange={(v) => setSiteSettings({ ...siteSettings, hero_cta_secondary_label: v })} />
          <Field label="Secondary CTA Link" value={siteSettings.hero_cta_secondary_href || ''} onChange={(v) => setSiteSettings({ ...siteSettings, hero_cta_secondary_href: v })} helper="Accepts full URLs or #section anchors." />
        </div>
      </CollapsibleCard>

      <CollapsibleCard
        title="Hero Slideshow Images"
        helper="Upload hero images in the Media Manager (Hero Images tab) before selecting."
        isOpen={openSections.heroImages}
        onToggle={() => toggleSection('heroImages')}
      >
          {heroMediaError && (
            <div className="mb-4 bg-error/10 border border-error text-error px-4 py-2 rounded flex items-center gap-2 text-sm">
              <icons.AlertTriangle size={16} />
              <span>{heroMediaError}</span>
            </div>
          )}
          {loadingHeroMedia ? (
            <div className="flex items-center gap-2 text-text-secondary text-sm">
              <Spinner size={16} />
              <span>Loading hero images…</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="border border-divider rounded-lg bg-background">
                <div className="flex items-center justify-between px-4 py-3 border-b border-divider">
                  <div>
                    <h4 className="text-sm font-semibold text-text-primary">Selected hero images</h4>
                    <p className="text-2xs text-text-secondary">Order determines slideshow order.</p>
                  </div>
                  <span className="text-xs text-text-secondary">{heroSelection.length} selected</span>
                </div>
                <div className="p-4 space-y-4">
                  {heroSelectionHydrated.length === 0 ? (
                    <div className="text-sm text-text-secondary">
                      No hero images selected. Choose from the available hero uploads on the right.
                    </div>
                  ) : (
                    <>
                      <p className="text-2xs text-text-secondary">Tip: drag cards to reorder slides.</p>
                      {heroSelectionHydrated.map((entry, index) => {
                        const previewUrl = heroPreviewUrl(entry.media);
                        return (
                          <div
                            key={entry.id || index}
                            className="border border-divider rounded-lg overflow-hidden bg-surface-warm cursor-grab active:cursor-grabbing"
                            draggable
                            onDragStart={() => handleHeroDragStart(index)}
                            onDragOver={handleHeroDragOver}
                            onDrop={() => handleHeroDrop(index)}
                            onDragEnd={handleHeroDragEnd}
                          >
                            <div className="flex flex-col md:flex-row gap-4 p-4">
                              <div className="relative w-full md:w-40 h-32 rounded overflow-hidden bg-background flex-shrink-0">
                                {previewUrl ? (
                                  <img src={previewUrl} alt={entry.title || 'Hero preview'} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-xs text-text-secondary text-center px-2">
                                    Missing file. Delete or replace this hero image.
                                  </div>
                                )}
                                <span className="absolute top-2 left-2 bg-black/60 text-text-inverse text-xs px-2 py-1 rounded-full">
                                  #{index + 1}
                                </span>
                              </div>
                              <div className="flex-1 space-y-3">
                                <div>
                                  <label className="text-2xs uppercase tracking-wide text-text-secondary">Display Title</label>
                                  <input
                                    type="text"
                                    value={entry.title || ''}
                                    onChange={(e) => handleHeroMetaChange(index, 'title', e.target.value)}
                                    className="form-input w-full text-sm mt-1"
                                    placeholder="Optional display title"
                                  />
                                </div>
                                <div>
                                  <label className="text-2xs uppercase tracking-wide text-text-secondary">Alt text</label>
                                  <input
                                    type="text"
                                    value={entry.alt_text || ''}
                                    onChange={(e) => handleHeroMetaChange(index, 'alt_text', e.target.value)}
                                    className="form-input w-full text-sm mt-1"
                                    placeholder="Describe the image for accessibility"
                                  />
                                </div>
                                <div className="flex flex-wrap gap-2 text-xs">
                                  <button
                                    type="button"
                                    onClick={() => moveHero(index, -1)}
                                    disabled={index === 0}
                                    className="px-3 py-1 rounded border border-divider text-text-primary disabled:opacity-40"
                                  >
                                    Move Up
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => moveHero(index, 1)}
                                    disabled={index === heroSelectionHydrated.length - 1}
                                    className="px-3 py-1 rounded border border-divider text-text-primary disabled:opacity-40"
                                  >
                                    Move Down
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleHeroRemove(entry.id)}
                                    className="px-3 py-1 rounded bg-error/10 text-error hover:bg-error/20 transition"
                                  >
                                    Remove
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              </div>

              <div className="border border-divider rounded-lg bg-background">
                <div className="px-4 py-3 border-b border-divider">
                  <h4 className="text-sm font-semibold text-text-primary">Available hero uploads</h4>
                  <p className="text-2xs text-text-secondary">Click an image to add it to the hero slideshow.</p>
                </div>
                <div className="p-4">
                  {availableHeroMedia.length === 0 ? (
                    <div className="text-sm text-text-secondary">
                      No unused hero uploads. Upload hero images in the Media Manager (choose Hero Images category).
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {availableHeroMedia.map((item) => {
                        const previewUrl = heroPreviewUrl(item);
                        return (
                          <button
                            type="button"
                            key={item.id}
                            onClick={() => handleHeroAdd(item)}
                            className="border border-divider rounded-lg overflow-hidden text-left hover:border-primary transition bg-surface-warm"
                          >
                            <div className="w-full h-28 bg-background">
                              {previewUrl ? (
                                <img src={previewUrl} alt={item.title || item.file_name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-2xs text-text-secondary">
                                  Preview unavailable
                                </div>
                              )}
                            </div>
                            <div className="px-3 py-2">
                              <p className="text-sm font-medium text-text-primary truncate">{item.title || item.file_name}</p>
                              <p className="text-2xs text-text-secondary truncate">Click to select</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
              <div className="border border-divider rounded-lg bg-background p-4 xl:col-span-2">
                <label className="block text-sm font-medium text-text-primary mb-2">Slideshow speed</label>
                <select
                  value={siteSettings.hero_slideshow_speed || 6000}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setSiteSettings((prev) => ({ ...prev, hero_slideshow_speed: Number.isFinite(val) ? val : 6000 }));
                  }}
                  className="form-select w-full max-w-xs"
                >
                  <option value="3000">Every 3 seconds</option>
                  <option value="5000">Every 5 seconds</option>
                  <option value="7000">Every 7 seconds</option>
                  <option value="10000">Every 10 seconds</option>
                </select>
                <p className="text-2xs text-text-secondary mt-2">
                  Controls how quickly hero slides advance on the public site. Applies after you save settings.
                </p>
              </div>
            </div>
          )}
      </CollapsibleCard>

      <CollapsibleCard
        title="Menu Section Copy"
        helper="Appears on the public menu intro paragraph."
        isOpen={openSections.menuCopy}
        onToggle={() => toggleSection('menuCopy')}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Menu Heading" value={siteSettings.menu_heading || ''} onChange={(v) => setSiteSettings({ ...siteSettings, menu_heading: v })} />
        </div>
        <RichTextField
          label="Menu Intro"
          value={siteSettings.menu_intro || ''}
          onChange={(html) => setSiteSettings({ ...siteSettings, menu_intro: html })}
          helperText="Allows bold, italic, line breaks, and short lists."
        />
      </CollapsibleCard>

      <CollapsibleCard
        title="Reservations Copy"
        helper="Controls the reservation form heading, intro, and success/error states."
        isOpen={openSections.reservations}
        onToggle={() => toggleSection('reservations')}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Reservations Heading" value={siteSettings.reservations_heading || ''} onChange={(v) => setSiteSettings({ ...siteSettings, reservations_heading: v })} />
          <Field label="Reservations Intro" value={siteSettings.reservations_intro || ''} onChange={(v) => setSiteSettings({ ...siteSettings, reservations_intro: v })} textarea rows={3} />
          <Field label="Success Message" value={siteSettings.reservations_success_copy || ''} onChange={(v) => setSiteSettings({ ...siteSettings, reservations_success_copy: v })} textarea rows={2} />
          <Field label="Error Message" value={siteSettings.reservations_error_copy || ''} onChange={(v) => setSiteSettings({ ...siteSettings, reservations_error_copy: v })} textarea rows={2} />
        </div>
      </CollapsibleCard>

      <CollapsibleCard
        title="About Content"
        helper="Single hub for the homepage About copy and the detailed About page content (text + map)."
        isOpen={openSections.about}
        onToggle={() => toggleSection('about')}
      >
        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-sm font-semibold text-text-primary">Homepage About copy</h4>
                <p className="text-2xs text-text-secondary">Controls the heading + intro paragraph shown on the homepage.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="About Heading" value={siteSettings.about_heading || ''} onChange={(v) => setSiteSettings({ ...siteSettings, about_heading: v })} />
            </div>
            <Field
              label="About Intro"
              value={siteSettings.about_intro || ''}
              onChange={(v) => setSiteSettings({ ...siteSettings, about_intro: v })}
              textarea
              rows={3}
            />
          </div>

          <div className="pt-4 border-t border-divider">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-sm font-semibold text-text-primary">Full About page content</h4>
                <p className="text-2xs text-text-secondary">Manages the long-form About copy and map embed.</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Header</label>
                <input
                  type="text"
                  value={aboutContent.header || ''}
                  onChange={(e) => setAboutContent({ ...aboutContent, header: e.target.value })}
                  className="w-full form-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Paragraph</label>
                <textarea
                  value={aboutContent.paragraph || ''}
                  onChange={(e) => setAboutContent({ ...aboutContent, paragraph: e.target.value })}
                  className="w-full form-input"
                  rows="4"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Map Embed URL</label>
                <input
                  type="text"
                  value={aboutContent.map_embed_url || ''}
                  onChange={(e) => setAboutContent({ ...aboutContent, map_embed_url: e.target.value })}
                  className="w-full form-input"
                  placeholder="Google Maps embed URL"
                />
              </div>
              <button
                onClick={saveAboutContent}
                className="bg-primary text-text-inverse px-4 py-2 rounded-lg hover:bg-primary-dark flex items-center gap-2"
              >
                <icons.Save size={18} />
                Save About Page Content
              </button>
            </div>
          </div>
        </div>
      </CollapsibleCard>

      <CollapsibleCard
        title="Jobs Section Copy"
        helper="Controls careers form messaging and sidebar content."
        isOpen={openSections.jobs}
        onToggle={() => toggleSection('jobs')}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Jobs Success Message" value={siteSettings.jobs_success_copy || ''} onChange={(v) => setSiteSettings({ ...siteSettings, jobs_success_copy: v })} textarea rows={2} />
          <Field label="Jobs Error Message" value={siteSettings.jobs_error_copy || ''} onChange={(v) => setSiteSettings({ ...siteSettings, jobs_error_copy: v })} textarea rows={2} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Sidebar Heading" value={siteSettings.jobs_sidebar_heading || ''} onChange={(v) => setSiteSettings({ ...siteSettings, jobs_sidebar_heading: v })} />
          <Field label="Positions Label" value={siteSettings.jobs_positions_label || ''} onChange={(v) => setSiteSettings({ ...siteSettings, jobs_positions_label: v })} />
        </div>
        <Field label="Sidebar Intro" value={siteSettings.jobs_sidebar_intro || ''} onChange={(v) => setSiteSettings({ ...siteSettings, jobs_sidebar_intro: v })} textarea rows={3} />
        <RichTextField
          label="Sidebar Benefits List"
          value={siteSettings.jobs_sidebar_benefits || ''}
          onChange={(html) => setSiteSettings({ ...siteSettings, jobs_sidebar_benefits: html })}
          helperText="Use short paragraphs or bullet lists to highlight perks. Supports the same tags as menu descriptions."
        />
      </CollapsibleCard>

      <CollapsibleCard
        title="Footer Contact & Social"
        helper="Feeds the footer contact block and social icons."
        isOpen={openSections.footer}
        onToggle={() => toggleSection('footer')}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Phone" value={siteSettings.phone || ''} onChange={(v) => setSiteSettings({ ...siteSettings, phone: v })} />
          <Field label="Email" value={siteSettings.email || ''} onChange={(v) => setSiteSettings({ ...siteSettings, email: v })} />
        </div>
        <Field label="Address" value={siteSettings.address || ''} onChange={(v) => setSiteSettings({ ...siteSettings, address: v })} textarea rows={2} />
        <Field label="Instagram URL" value={siteSettings.instagram || ''} onChange={(v) => setSiteSettings({ ...siteSettings, instagram: v })} />
        <Field label="Facebook URL" value={siteSettings.facebook || ''} onChange={(v) => setSiteSettings({ ...siteSettings, facebook: v })} />
        <Field label="Google Listing URL" value={siteSettings.google || ''} onChange={(v) => setSiteSettings({ ...siteSettings, google: v })} />
      </CollapsibleCard>

      <div className="flex flex-wrap gap-3 justify-end">
        <button
          onClick={saveSiteSettings}
          className="bg-primary text-text-inverse px-4 py-2 rounded-lg hover:bg-primary-dark flex items-center gap-2"
        >
          <icons.Save size={18} />
          Save Global Settings
        </button>
      </div>
      {menuSaved && (
        <div className="fixed right-6 top-6 z-50">
          <div className="bg-success text-text-inverse px-4 py-2 rounded shadow flex items-center gap-2">
            <icons.CheckCircle size={16} />
            <span className="text-sm">Menu intro saved</span>
          </div>
        </div>
      )}

      <CollapsibleCard
        title="Navigation Links"
        helper="Source of truth for the public navigation menu."
        isOpen={openSections.navigation}
        onToggle={() => toggleSection('navigation')}
      >
        <p className="text-xs text-text-secondary mb-4">
          Toggle visibility to hide links without redeploying.
        </p>
        <NavigationEditor />
      </CollapsibleCard>

      {/* Business Hours: show Kitchen and Bar side-by-side */}
      <CollapsibleCard
        title="Business Hours"
        helper="Manage kitchen and bar hours. Layout adapts for smaller screens."
        isOpen={openSections.businessHours}
        onToggle={() => toggleSection('businessHours')}
      >
        {Array.isArray(businessHours) && businessHours.length === 0 && (
          <div className="text-text-muted">No business hours configured</div>
        )}

        {Array.isArray(businessHours) && businessHours.length > 0 && (() => {
          const areas = Array.from(new Set(businessHours.map(h => h.area || 'kitchen')));
          // Ensure kitchen then bar ordering when present
          const ordered = [];
          if (areas.includes('kitchen')) ordered.push('kitchen');
          if (areas.includes('bar')) ordered.push('bar');
          for (const a of areas) if (!ordered.includes(a)) ordered.push(a);

          const grouped = ordered.reduce((acc, area) => {
            acc[area] = businessHours.filter(h => (h.area || 'kitchen') === area).sort((a,b) => a.id - b.id);
            return acc;
          }, {});

          // Responsive: on small screens show a selector to pick area; on md+ show both columns
          return (
            <div>
              <div className="mb-4 xl:hidden">
                <label className="sr-only">Select area</label>
                <select
                  value={selectedArea}
                  onChange={(e) => setSelectedArea(e.target.value)}
                  className="w-full form-select"
                >
                  {ordered.map(a => (
                    <option key={a} value={a}>{a === 'kitchen' ? 'Kitchen' : (a.charAt(0).toUpperCase() + a.slice(1))}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {ordered.map(area => (
                  <div
                    key={area}
                    className={`${area === selectedArea ? 'block' : 'hidden'} xl:block bg-background p-4 rounded space-y-3`}
                  >
                    <h4 className="font-medium mb-2">{area === 'kitchen' ? 'Kitchen Hours' : (area.charAt(0).toUpperCase() + area.slice(1) + ' Hours')}</h4>
                    <div className="space-y-3">
                      {grouped[area].map(day => (
                        <div key={day.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 border border-divider rounded-lg bg-surface-warm/20">
                          <div className="w-full sm:w-32 font-medium text-text-primary">{day.day_of_week}</div>
                          <input
                            type="time"
                            value={day.opening_time || ''}
                            onChange={(e) => {
                              const updated = businessHours.map(d => d.id === day.id ? { ...d, opening_time: e.target.value } : d);
                              setBusinessHours(updated);
                            }}
                            disabled={day.is_closed}
                            className="form-input w-full sm:w-32"
                          />
                          <span className="text-text-secondary hidden sm:inline">to</span>
                          <input
                            type="time"
                            value={day.closing_time || ''}
                            onChange={(e) => {
                              const updated = businessHours.map(d => d.id === day.id ? { ...d, closing_time: e.target.value } : d);
                              setBusinessHours(updated);
                            }}
                            disabled={day.is_closed}
                            className="form-input w-full sm:w-32"
                          />
                          <label className="flex items-center gap-2 sm:ml-auto">
                            <input
                              type="checkbox"
                              checked={!!day.is_closed}
                              onChange={(e) => {
                                const updated = businessHours.map(d => d.id === day.id ? { ...d, is_closed: e.target.checked } : d);
                                setBusinessHours(updated);
                              }}
                            />
                            <span className="text-sm text-text-secondary">Closed</span>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        <div className="mt-4">
          <button
            onClick={saveAllBusinessHours}
            className="bg-primary text-text-inverse px-4 py-2 rounded-lg hover:bg-primary-dark flex items-center gap-2"
          >
            <icons.Save size={16} />
            Save All Hours
          </button>
        </div>
      </CollapsibleCard>
    </div>
  );
}

function CollapsibleCard({ title, helper, isOpen, onToggle, children }) {
  return (
    <div className="bg-surface rounded-lg shadow overflow-hidden border border-divider/60">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="w-full flex items-center justify-between px-6 py-4 border-b border-divider focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 bg-surface-dark text-text-inverse"
      >
        <div className="text-left">
          <h3 className="text-lg font-semibold">{title}</h3>
          {helper && <p className="text-xs text-text-inverse/80 mt-1">{helper}</p>}
        </div>
        <icons.ChevronDown
          size={18}
          className={`text-text-inverse/80 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      {isOpen && (
        <div className="px-6 py-4 border-t border-divider space-y-4 bg-surface">
          {children}
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, helper, textarea = false, rows = 1 }) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-text-primary">{label}</label>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          className="w-full form-input"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full form-input"
        />
      )}
      {helper && <p className="text-xs text-text-secondary">{helper}</p>}
    </div>
  );
}

const Module = {
  component: SettingsModule,
  name: 'Settings',
  icon: icons.Settings
};

export default Module;
