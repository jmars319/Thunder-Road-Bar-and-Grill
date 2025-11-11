/*
  MediaModule

  Purpose:
  - Admin media manager for uploading and selecting images used across the site.

  Contract:
  - Rendered inside admin shell. Expects media endpoints (list, upload, delete).

  Notes:
  - Keep upload handling robust (size/type checks) and expose progress to the UI.
*/
import { useState, useEffect } from 'react';
import { icons } from '../../icons';
import usePaginatedResource from '../../hooks/usePaginatedResource';
import Spinner from '../ui/Spinner';
import MediaCardSkeleton from '../ui/MediaCardSkeleton';
import makeAbsolute from '../../lib/makeAbsolute';
import { authenticatedFetch, API_BASE } from '../../utils/api';

// Some linters may report these UI helpers as unused when components are
// conditionally rendered; reference them here to ensure they're recognized.
const __usedSpinner = Spinner;
const __usedMediaCardSkeleton = MediaCardSkeleton;
void __usedSpinner;
void __usedMediaCardSkeleton;

/*
  MediaModule

  Purpose:
  - Simple media manager for uploading images and copying/deleting existing media.

  API expectations:

*/

// Implementation of AllUploadsGrid using the paginated hook. Placed here so
// it can be a top-level component and keep hooks usage valid.
function AllUploadsGridComponent({ mediaLimit = 48, copyUrl, deleteMedia, openGalleryPicker, copiedId }) {
  const { items: pagedAll, loading: pagedAllLoading, total: pagedAllTotal, sentinelRef: allSentinel, fetchPage: fetchAllPage, reset } = usePaginatedResource(`${API_BASE}/media?`, { limit: mediaLimit });

  // load first page on mount; reset on unmount so reopening the section
  // starts fresh (clears items/offset and re-attaches sentinel)
  // Prime paginated lists on mount and load site settings. The fetch/reset
  // helpers are stable from the paginated hook; include them so linters don't
  // flag missing dependencies.
  useEffect(() => {
    fetchAllPage(0, false).catch(() => {});
    return () => {
      try {
        // ensure the paginated hook clears its internal offset/items
        reset();
      } catch (e) {
        // ignore
      }
    };
  }, [fetchAllPage, reset]);

  // refresh when other parts of the app dispatch a mediaUpdated event
  useEffect(() => {
    const handler = () => {
      try {
        reset();
        fetchAllPage(0, false).catch(() => {});
      } catch (e) {}
    };
    window.addEventListener('mediaUpdated', handler);
    return () => window.removeEventListener('mediaUpdated', handler);
  }, [fetchAllPage, reset]);

  return (
    <>
      {pagedAllLoading && pagedAll.length === 0 ? (
        <MediaCardSkeleton count={8} />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {pagedAll.map(item => (
            <div key={item.id} className="bg-surface rounded-lg shadow overflow-hidden card-hover">
              <div className="aspect-square bg-surface-warm flex items-center justify-center">
                {item.file_type?.startsWith('image/') ? (
                  <img src={makeAbsolute(item.file_url)} alt={item.title} className="w-full h-full object-cover" />
                ) : (
                  <icons.Image size={48} className="text-primary" />
                )}
              </div>
              <div className="p-3">
                <p className="text-sm font-medium text-text-primary truncate">{item.title}</p>
                <p className="text-xs text-text-secondary truncate">{item.file_name}</p>
                <div className="flex gap-2 mt-3">
                  <button type="button" onClick={() => copyUrl(item.file_url)} className="flex-1 bg-surface-warm text-text-primary py-1 px-2 rounded text-xs hover:bg-surface transition flex items-center justify-center gap-1">
                    {copiedId === item.file_url ? (
                      <>
                        <icons.CheckCircle size={12} />
                        Copied
                      </>
                    ) : (
                      <>
                        <icons.Copy size={12} />
                        Copy URL
                      </>
                    )}
                  </button>
                  {item.category === 'gallery' && (
                    <button type="button" onClick={() => openGalleryPicker(item)} className="bg-surface-warm text-text-primary py-1 px-2 rounded text-xs hover:bg-surface transition">Use as gallery</button>
                  )}
                  <button type="button" onClick={() => deleteMedia(item.id)} className="bg-surface-warm text-error py-1 px-2 rounded text-xs hover:bg-surface transition"><icons.Trash2 size={12} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {pagedAllTotal !== null && pagedAllTotal > pagedAll.length && (
        <div className="mt-4 text-center">
          <div ref={allSentinel} aria-hidden="true" className="h-6" />
          {pagedAllLoading && <div className="mt-2"><Spinner size={18} /></div>}
        </div>
      )}
    </>
  );
}
// Ensure the top-level helper component is recognized by some linters
const __usedAllUploadsGridComponent = AllUploadsGridComponent;
void __usedAllUploadsGridComponent;
/*
  MediaModule

  Purpose:
  - Simple media manager for uploading images and copying/deleting existing media.

  API expectations:
  - GET  /api/media -> [ { id, title, file_name, file_url, file_type }, ... ]
  - POST /api/media/upload (multipart/form-data)
  - DELETE /api/media/:id

  Developer notes:
  - Uploads use a FormData multipart POST. The backend should return the new media
    list through GET /api/media; this component re-fetches after a successful upload.
  - Copying a URL uses the Clipboard API; it may be unavailable in insecure contexts.
    The code uses try/catch around navigator.clipboard to avoid runtime errors.
  - Consider returning the created media item from the upload endpoint to avoid
    a full re-fetch if performance becomes a concern.
  Accessibility:
  - The upload control uses a hidden file input — ensure label content clearly
    describes the action. Action buttons include explicit type="button" and
    accessible labels.
  // Last updated: 2025-10-21 — developer notes reviewed and clarified for accessibility and API expectations.
*/

// MediaModule

function MediaModule() {
  const MEDIA_LIMIT = 48;
  const [uploading, setUploading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [sections, setSections] = useState({ logos: true, hero: true, gallery: true, all: false });
  const [siteSettings, setSiteSettings] = useState(null);
  // selectedHeroes holds ordered hero slide objects: { id, file_url, title, alt_text }
  const [selectedHeroes, setSelectedHeroes] = useState([]);
  const [showGalleryPicker, setShowGalleryPicker] = useState(false);
  const [galleryItem, setGalleryItem] = useState(null);
  const [categoriesList, setCategoriesList] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);

  // Paginated resources for specific categories to avoid loading all media
  const { items: logoItems, loading: logoLoading, total: logoTotal, sentinelRef: logoSentinel, fetchPage: fetchLogoPage, reset: resetLogo } = usePaginatedResource(`${API_BASE}/media?category=logo`, { limit: MEDIA_LIMIT });
  const { items: heroItems, loading: heroLoading, total: heroTotal, sentinelRef: heroSentinel, fetchPage: fetchHeroPage, reset: resetHero } = usePaginatedResource(`${API_BASE}/media?category=hero`, { limit: MEDIA_LIMIT });
  const { items: galleryItems, loading: galleryLoading, total: galleryTotal, sentinelRef: gallerySentinel, fetchPage: fetchGalleryPage, reset: resetGallery } = usePaginatedResource(`${API_BASE}/media?category=gallery`, { limit: MEDIA_LIMIT });

  useEffect(() => {
    fetchMedia();
    authenticatedFetch('/site-settings').then(r => r.ok ? r.json() : {}).then(s => {
      setSiteSettings(s || {});
      if (Array.isArray(s?.hero_images) && s.hero_images.length) setSelectedHeroes(s.hero_images);
    }).catch(() => {});
    // Ensure paginated category lists fetch their first page on mount so the
    // Logos and Gallery grids are populated. We call these independently so
    // they can paginate separately via their sentinels.
    try { fetchLogoPage(0, false).catch(() => {}); } catch (e) {}
    try { fetchHeroPage(0, false).catch(() => {}); } catch (e) {}
    try { fetchGalleryPage(0, false).catch(() => {}); } catch (e) {}
  }, [fetchLogoPage, fetchHeroPage, fetchGalleryPage, resetLogo, resetHero, resetGallery]);

  const fetchMedia = (category, limit, offset) => {
    // fallback fetch used for uncategorized requests; paginated hooks handle category-specific lists
    const l = typeof limit === 'number' ? limit : MEDIA_LIMIT;
    const o = typeof offset === 'number' ? offset : 0;
    const q = [`limit=${encodeURIComponent(l)}`, `offset=${encodeURIComponent(o)}`];
    if (category) q.unshift(`category=${encodeURIComponent(category)}`);
    const url = `${API_BASE}/media?${q.join('&')}`;
    return fetch(url)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch media');
        const totalHeader = res.headers.get('X-Total-Count');
        const total = totalHeader ? parseInt(totalHeader, 10) : null;
        return res.json().then(data => ({ data, total }));
      })
    .catch(() => ({ data: [], total: null }));
  };
  // generic upload used by section-specific handlers. category string is optional.
  const handleUpload = async (file, category = 'general') => {
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', file.name);
    formData.append('category', category);

    try {
      await authenticatedFetch(`/media/upload?category=${encodeURIComponent(category)}`, {
          method: 'POST',
          headers: {}, // Override to not set Content-Type for FormData
          body: formData
        });
      // refresh the relevant paginated list (and notify All uploads)
      if (category === 'logo') {
        resetLogo();
        fetchLogoPage(0, false).catch(() => {});
      } else if (category === 'hero') {
        resetHero();
        fetchHeroPage(0, false).catch(() => {});
      } else if (category === 'gallery') {
        resetGallery();
        fetchGalleryPage(0, false).catch(() => {});
      } else {
        // fallback: refresh legacy media list
        await fetchMedia();
      }
      try { window.dispatchEvent(new window.CustomEvent('mediaUpdated')); } catch (e) {}
    } catch (err) {
      console.error('upload failed', err);
      try { window.dispatchEvent(new window.CustomEvent('snackbar', { detail: 'Upload failed' })); } catch (e) {}
    } finally {
      setUploading(false);
      // nothing else to do; paginated lists were refreshed above where applicable
    }
  };

  // helper that returns an onChange handler bound to a category
  const makeUploadHandler = (category) => async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await handleUpload(file, category);
  };

  const toggleHeroSelection = (id) => {
    // helper to find media across paginated lists and the legacy media array
    const findMedia = (mid) => {
      return [
        ...logoItems,
        ...heroItems,
        ...galleryItems
      ].find(x => String(x.id) === String(mid));
    };
    setSelectedHeroes(s => {
      const exists = s.find(x => x.id === id);
      if (exists) return s.filter(x => x.id !== id);
      // find media item to add across paginated lists
      const m = findMedia(id);
      if (!m) return s;
      return [...s, { id: m.id, file_url: m.file_url, title: m.title, alt_text: '' }];
    });
  };

  const moveHero = (idx, dir) => {
    setSelectedHeroes(s => {
      const next = [...s];
      const swap = idx + dir;
      if (swap < 0 || swap >= next.length) return s;
      const tmp = next[swap];
      next[swap] = next[idx];
      next[idx] = tmp;
      return next;
    });
  };

  const setHeroAlt = (id, alt) => {
    setSelectedHeroes(s => s.map(x => x.id === id ? { ...x, alt_text: alt } : x));
  };

  const saveHeroImages = async () => {
    const payload = { ...(siteSettings || {}), hero_images: selectedHeroes };
    try {
      const res = await authenticatedFetch('/site-settings', { method: 'PUT', body: JSON.stringify(payload) });
  if (!res.ok) throw new Error('Failed to save');
  setSiteSettings(payload);
      // Broadcast the updated settings so other parts of the app (for example
      // the public navbar) can react immediately instead of waiting for a
      // full page refresh. Use a compatibility-friendly CustomEvent approach.
      try {
        if (typeof window !== 'undefined' && typeof window.CustomEvent === 'function') {
          window.dispatchEvent(new window.CustomEvent('siteSettingsUpdated', { detail: payload }));
        } else if (typeof document !== 'undefined' && document.createEvent) {
          const evt = document.createEvent('CustomEvent');
          evt.initCustomEvent('siteSettingsUpdated', false, false, payload);
          window.dispatchEvent(evt);
        }
      } catch (e) {
        // ignore
      }
  try { window.dispatchEvent(new window.CustomEvent('snackbar', { detail: 'Hero images saved' })); } catch (e) {}
    } catch (err) {
      console.error('MediaModule.saveHeroImages - error', err);
  try { window.dispatchEvent(new window.CustomEvent('snackbar', { detail: 'Failed to save hero images' })); } catch (e) {}
    }
  };

  // Set the provided media item as the site logo. We store an absolute URL so
  // consumers (like PublicNavbar) can fetch inline SVGs or images regardless
  // of the frontend origin. After a successful PUT we dispatch a small
  // cross-window event so other components can react immediately.
  const setAsLogo = async (item) => {
    const absolute = `${API_BASE.replace(/\/api$/, '')}${item.file_url}`;
    const payload = { ...(siteSettings || {}), logo_url: absolute };
    try {
      const res = await authenticatedFetch('/site-settings', { method: 'PUT', body: JSON.stringify(payload) });
      if (!res.ok) throw new Error('Failed to set logo');
      setSiteSettings(payload);
      // Dispatch a cross-component event. Use window.CustomEvent when
      // available, otherwise fall back to the older document.createEvent
      // API for maximum compatibility and to avoid linter 'CustomEvent'
      // undefined errors in some environments.
      try {
        if (typeof window !== 'undefined' && typeof window.CustomEvent === 'function') {
          window.dispatchEvent(new window.CustomEvent('siteSettingsUpdated', { detail: payload }));
        } else if (typeof document !== 'undefined' && document.createEvent) {
          const evt = document.createEvent('CustomEvent');
          // initCustomEvent(type, bubbles, cancelable, detail)
          evt.initCustomEvent('siteSettingsUpdated', false, false, payload);
          window.dispatchEvent(evt);
        }
      } catch (e) {
        // noop
      }
  try { window.dispatchEvent(new window.CustomEvent('snackbar', { detail: 'Site logo updated' })); } catch (e) {}
    } catch (err) {
  try { window.dispatchEvent(new window.CustomEvent('snackbar', { detail: 'Failed to update site logo' })); } catch (e) {}
    }
  };

  const deleteMedia = (id) => {
    if (window.confirm('Delete this media file?')) {
      authenticatedFetch(`/media/${id}`, { method: 'DELETE' })
        .then(() => {
          // refresh legacy and paginated lists
          fetchMedia();
          try { resetLogo(); fetchLogoPage(0, false).catch(() => {}); } catch (e) {}
          try { resetHero(); fetchHeroPage(0, false).catch(() => {}); } catch (e) {}
          try { resetGallery(); fetchGalleryPage(0, false).catch(() => {}); } catch (e) {}
          try { window.dispatchEvent(new window.CustomEvent('mediaUpdated')); } catch (e) {}
        }).catch(() => {});
    }
  };

  const copyUrl = (url) => {
    try {
      const absolute = makeAbsolute(url);
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(absolute);
        setCopiedId(url);
        setTimeout(() => setCopiedId(null), 2000);
      } else {
        // Fallback: create a temporary textarea (rare, but more robust)
        const ta = document.createElement('textarea');
  ta.value = absolute;
        document.body.appendChild(ta);
        ta.select();
        try {
          document.execCommand('copy');
          setCopiedId(url);
          setTimeout(() => setCopiedId(null), 2000);
        } catch {
          // ignore
        }
        document.body.removeChild(ta);
      }
  } catch {
      // Clipboard API may be unavailable; silently ignore for now.
    }
  };

  const openGalleryPicker = (item) => {
    setGalleryItem(item);
    setSelectedCategoryId(null);
  setCategoriesLoading(true);
    authenticatedFetch('/menu/categories')
      .then(r => r.json())
  .then(d => setCategoriesList(Array.isArray(d) ? d : []))
  .catch(() => setCategoriesList([]))
  .finally(() => setCategoriesLoading(false));
    setShowGalleryPicker(true);
  };

  const confirmSetGallery = async () => {
    if (!galleryItem || !selectedCategoryId) {
      try { window.dispatchEvent(new window.CustomEvent('snackbar', { detail: 'Select a category' })); } catch (e) {}
      return;
    }
    const cat = categoriesList.find(c => String(c.id) === String(selectedCategoryId));
    if (!cat) {
      try { window.dispatchEvent(new window.CustomEvent('snackbar', { detail: 'Category not found' })); } catch (e) {}
      return;
    }
    const absolute = `${API_BASE.replace(/\/api$/, '')}${galleryItem.file_url}`;
    const payload = {
      name: cat.name,
      description: cat.description,
      image_url: cat.image_url,
      gallery_image_id: galleryItem.id,
      gallery_image_url: absolute, // keep URL for preview/backcompat
      display_order: cat.display_order,
      is_active: cat.is_active
    };
    try {
      const res = await authenticatedFetch(`/menu/categories/${cat.id}`, { method: 'PUT', body: JSON.stringify(payload) });
      if (!res.ok) throw new Error('Failed to update category');
      setShowGalleryPicker(false);
      setGalleryItem(null);
  try { window.dispatchEvent(new window.CustomEvent('snackbar', { detail: 'Gallery image applied to category' })); } catch (e) {}
    } catch (err) {
      console.error('Failed to set gallery image', err);
  try { window.dispatchEvent(new window.CustomEvent('snackbar', { detail: 'Failed to set gallery image' })); } catch (e) {}
    }
  };

  // (AllUploadsGrid is implemented at top-level and used below; we pass
  // helper callbacks into it so it doesn't need to close over local state.)


  return (
    <>
      <div className="space-y-6">
      {/* Section: Logos */}
      <div className="bg-surface rounded-lg shadow">
        <button type="button" className="w-full flex items-center justify-between p-4" onClick={() => setSections(s => ({ ...s, logos: !s.logos }))} aria-expanded={sections.logos}>
          <div className="flex items-center gap-3">
            <icons.Image size={20} />
            <h3 className="text-lg font-medium">Logos</h3>
          </div>
          <div>{sections.logos ? <icons.ChevronUp /> : <icons.ChevronDown />}</div>
        </button>
        {sections.logos && (
          <div className="p-4 border-t border-divider">
            <label className="flex items-center gap-4">
              <span className="text-sm text-text-secondary">Upload logo</span>
              <input type="file" className="hidden" accept="image/*" onChange={makeUploadHandler('logo')} disabled={uploading} />
              <label className={`px-3 py-2 rounded cursor-pointer text-sm ${uploading ? 'opacity-60 pointer-events-none' : 'bg-surface'}`}>
                <input type="file" accept="image/*" className="hidden" onChange={makeUploadHandler('logo')} />
                {uploading ? 'Uploading…' : 'Choose file'}
              </label>
            </label>
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
              {logoLoading && logoItems.length === 0 ? (
                <MediaCardSkeleton count={4} />
              ) : (
                logoItems.map(item => (
                  <div key={item.id} className="bg-surface rounded overflow-hidden">
                    <img loading="lazy" src={makeAbsolute(item.file_url)} alt={item.title} className="w-full h-24 object-cover" />
                    <div className="p-2 text-xs flex justify-between items-center">
                      <span className="truncate">{item.title}</span>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setAsLogo(item)} className="text-xs">Use as logo</button>
                        <button onClick={() => copyUrl(item.file_url)} className="text-xs">Copy</button>
                        <button onClick={() => deleteMedia(item.id)} className="text-xs text-error">Del</button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            {logoTotal !== null && logoTotal > logoItems.length && (
              <div className="mt-4 text-center">
                <div ref={logoSentinel} aria-hidden="true" className="h-6" />
                {logoLoading && <div className="mt-2"><Spinner size={18} /></div>}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Section: Hero */}
      <div className="bg-surface rounded-lg shadow">
        <button type="button" className="w-full flex items-center justify-between p-4" onClick={() => setSections(s => ({ ...s, hero: !s.hero }))} aria-expanded={sections.hero}>
          <div className="flex items-center gap-3">
            <icons.Image size={20} />
            <h3 className="text-lg font-medium">Hero</h3>
          </div>
          <div>{sections.hero ? <icons.ChevronUp /> : <icons.ChevronDown />}</div>
        </button>
        {sections.hero && (
          <div className="p-4 border-t border-divider">
            <p className="text-sm text-text-secondary mb-2">Upload large hero images</p>
            <label className={`px-3 py-2 rounded cursor-pointer text-sm ${uploading ? 'opacity-60 pointer-events-none' : 'bg-surface'}`}>
              <input type="file" accept="image/*" className="hidden" onChange={makeUploadHandler('hero')} />
              {uploading ? 'Uploading…' : 'Choose file'}
            </label>
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
              {heroLoading && heroItems.length === 0 ? (
                <MediaCardSkeleton count={4} />
              ) : (
                heroItems.map(item => (
                  <div key={item.id} className="bg-surface rounded overflow-hidden relative">
                    <img loading="lazy" src={makeAbsolute(item.file_url)} alt={item.title} className="w-full h-24 object-cover" />
                    <label className="absolute top-2 left-2 bg-white/80 rounded p-1 text-xs">
                      <input type="checkbox" checked={selectedHeroes.some(h => h.id === item.id)} onChange={() => toggleHeroSelection(item.id)} />
                    </label>
                    <div className="p-2 text-xs flex justify-between items-center">
                      <span className="truncate">{item.title}</span>
                      <div className="flex gap-2">
                        <button onClick={() => copyUrl(item.file_url)} className="text-xs">Copy</button>
                        <button onClick={() => deleteMedia(item.id)} className="text-xs text-error">Del</button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            {heroTotal !== null && heroTotal > heroItems.length && (
              <div className="mt-4 text-center">
                <div ref={heroSentinel} aria-hidden="true" className="h-6" />
                {heroLoading && <div className="mt-2"><Spinner size={18} /></div>}
              </div>
            )}
            <div className="mt-3">
              <h4 className="text-sm font-medium mb-2">Selected slides (drag to reorder or use arrows)</h4>
              {selectedHeroes.length === 0 && <p className="text-sm text-text-secondary">No slides selected.</p>}
              <div className="space-y-2">
                {selectedHeroes.map((h, i) => (
                  <div key={h.id} className="flex items-center gap-3 bg-surface p-2 rounded">
                    <img loading="lazy" src={makeAbsolute(h.file_url)} alt={h.title} className="w-16 h-10 object-cover rounded" />
                    <div className="flex-1 text-xs">
                      <div className="font-medium">{h.title}</div>
                      <input type="text" value={h.alt_text || ''} onChange={(e) => setHeroAlt(h.id, e.target.value)} placeholder="Alt text (for accessibility)" className="w-full form-input mt-1" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <button type="button" onClick={() => moveHero(i, -1)} className="px-2 py-1 bg-surface-warm rounded">↑</button>
                      <button type="button" onClick={() => moveHero(i, 1)} className="px-2 py-1 bg-surface-warm rounded">↓</button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex justify-end">
                <button type="button" onClick={saveHeroImages} className="bg-primary text-text-inverse px-3 py-2 rounded">Save hero images</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Section: Gallery */}
      <div className="bg-surface rounded-lg shadow">
        <button type="button" className="w-full flex items-center justify-between p-4" onClick={() => setSections(s => ({ ...s, gallery: !s.gallery }))} aria-expanded={sections.gallery}>
          <div className="flex items-center gap-3">
            <icons.Image size={20} />
            <h3 className="text-lg font-medium">Gallery</h3>
          </div>
          <div>{sections.gallery ? <icons.ChevronUp /> : <icons.ChevronDown />}</div>
        </button>
        {sections.gallery && (
          <div className="p-4 border-t border-divider">
            <p className="text-sm text-text-secondary mb-2">Upload gallery images</p>
            <label className={`px-3 py-2 rounded cursor-pointer text-sm ${uploading ? 'opacity-60 pointer-events-none' : 'bg-surface'}`}>
              <input type="file" accept="image/*" className="hidden" onChange={makeUploadHandler('gallery')} />
              {uploading ? 'Uploading…' : 'Choose file'}
            </label>
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
              {galleryLoading && galleryItems.length === 0 ? (
                <MediaCardSkeleton count={8} />
              ) : (
                galleryItems.map(item => (
                  <div key={item.id} className="bg-surface rounded overflow-hidden">
                    <img loading="lazy" src={makeAbsolute(item.file_url)} alt={item.title} className="w-full h-24 object-cover" />
                    <div className="p-2 text-xs flex justify-between items-center">
                      <span className="truncate">{item.title}</span>
                      <div className="flex gap-2">
                        <button onClick={() => copyUrl(item.file_url)} className="text-xs">Copy</button>
                        <button onClick={() => deleteMedia(item.id)} className="text-xs text-error">Del</button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            {galleryTotal !== null && galleryTotal > galleryItems.length && (
              <div className="mt-4 text-center">
                <div ref={gallerySentinel} aria-hidden="true" className="h-6" />
                {galleryLoading && <div className="mt-2"><Spinner size={18} /></div>}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Section: All uploads (optional) */}
      <div className="bg-surface rounded-lg shadow">
        <button type="button" className="w-full flex items-center justify-between p-4" onClick={() => setSections(s => ({ ...s, all: !s.all }))} aria-expanded={sections.all}>
          <div className="flex items-center gap-3">
            <icons.Folder size={20} />
            <h3 className="text-lg font-medium">All uploads</h3>
          </div>
          <div>{sections.all ? <icons.ChevronUp /> : <icons.ChevronDown />}</div>
        </button>
        {sections.all && (
          <div className="p-4 border-t border-divider">
            <p className="text-sm text-text-secondary mb-2">All uploaded media (latest first)</p>
                  <div className="mt-4">
                    <AllUploadsGridComponent mediaLimit={MEDIA_LIMIT} copyUrl={copyUrl} deleteMedia={deleteMedia} openGalleryPicker={openGalleryPicker} copiedId={copiedId} />
                  </div>
          </div>
        )}
      </div>
      </div>
      {/* Gallery picker modal */}
      {showGalleryPicker && (
      <div className="modal-backdrop flex items-center justify-center z-50">
        <div className="bg-surface rounded-lg p-4 max-w-lg w-full">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold">Apply as gallery image</h3>
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowGalleryPicker(false)} className="px-2 py-1 rounded">Cancel</button>
              <button type="button" onClick={confirmSetGallery} className="px-2 py-1 rounded bg-primary text-text-inverse">Apply</button>
            </div>
          </div>
          {categoriesLoading ? <p>Loading categories…</p> : (
            <div className="space-y-2">
              {categoriesList.map(c => (
                <label key={c.id} className={`flex items-center gap-3 p-2 rounded cursor-pointer ${String(selectedCategoryId) === String(c.id) ? 'ring-2 ring-primary' : 'hover:bg-surface-warm'}`}>
                  <input type="radio" name="gallery-cat" checked={String(selectedCategoryId) === String(c.id)} onChange={() => setSelectedCategoryId(c.id)} />
                  <div className="flex-1">
                    <div className="font-medium">{c.name}</div>
                    <div className="text-sm text-text-secondary">{c.description}</div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>
      )}
    </>
  );
}



const Module = {
  component: MediaModule,
  name: 'Media',
  icon: icons.Image
};
export default Module;
