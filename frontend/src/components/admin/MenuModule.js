/*
  MenuModule

  Purpose:
  - Admin UI to manage menu categories and items. Provides CRUD operations
    for categories and individual menu items and integrates a media picker
    for image uploads.

  Contract:
  - Rendered inside the admin shell. Expects backend endpoints to exist for
    menu and media operations. Keep data-fetching defensive; failures should
    fall back gracefully.

  Notes:
  - Keep presentation tokenized (use `custom-styles.css` tokens) and avoid
    placing heavy logic here; consider extracting upload helpers/tests.
*/
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { icons } from '../../icons';
import Toast from '../ui/Toast';
import usePaginatedResource from '../../hooks/usePaginatedResource';
import Spinner from '../ui/Spinner';
import { authenticatedFetch, API_BASE } from '../../utils/api';
import { sanitizeRichText } from '../../utils/richText';
import { normalizeMenuCategory } from '../../utils/menuDisplay';
import MenuDisplay from '../public/MenuDisplay';
import RichTextField from './RichTextField';
import { buildImageVariant, hasRenderableImageVariant, applyCacheBusterToEntry, appendCacheBuster } from '../../utils/imageVariants';
// ensure imports are recognized by some linters when used only in JSX
const __usedSpinner = Spinner;
void __usedSpinner;

/* DEV:
   - Admin menu editor uses semantic tokens (bg-primary, bg-surface-warm,
     text-text-primary, text-primary, border-divider). Update
     `frontend/src/custom-styles.css` to adjust colors across the admin UI.
   - Removed the per-file eslint suppression so imports and usages are
     handled by the standard lint rules.
   
   Last reviewed: 2025-10-24 — confirmed lint notes and token guidance are current.
*/

function MenuModule() {
  const debugEnabled = typeof window !== 'undefined' ? (() => {
    try {
      return new URLSearchParams(window.location.search).has('debug');
    } catch (error) {
      return false;
    }
  })() : false;
  const withDebugParam = useCallback((path) => {
    if (!debugEnabled) return path;
    return path.includes('?') ? `${path}&debug=1` : `${path}?debug=1`;
  }, [debugEnabled]);
  const logDebug = useCallback((label, payload) => {
    if (!debugEnabled) return;
    // eslint-disable-next-line no-console
    console.debug(label, payload);
  }, [debugEnabled]);
  const [categories, setCategories] = useState([]);
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [processingUpload, setProcessingUpload] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState(null);
  const uploadXhr = useRef(null);
  const [editingItem, setEditingItem] = useState(null);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  // drag-and-drop state for reordering items within a category
  const [dragging, setDragging] = useState({ itemId: null, fromCategoryId: null });
  // drag-and-drop state for reordering categories
  const [draggingCategory, setDraggingCategory] = useState(null);
  const MEDIA_LIMIT_MENU = 24;

  // paginated menu-media hook (infinite scroll sentinel provided by hook)
  const { items: pagedMedia, loading: pagedLoading, total: pagedTotal, sentinelRef, fetchPage, reset } = usePaginatedResource(`${API_BASE}/media?category=menu`, { limit: MEDIA_LIMIT_MENU });
  const [selectedMediaId, setSelectedMediaId] = useState(null);
  const [toast, setToast] = useState(null);
  const [showZeroPriceConfirm, setShowZeroPriceConfirm] = useState(false);
  const [pendingSavePayload, setPendingSavePayload] = useState(null);
  const previewPanelsRef = useRef({});
  const [previewExpanded, setPreviewExpanded] = useState(null);
  const previewCategories = useMemo(() => categories.map(normalizeMenuCategory), [categories]);
  const [siteSettings, setSiteSettings] = useState({});
  const [previewLoaded, setPreviewLoaded] = useState(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState({});

  const measurePreviewPanel = (id) => {
    const el = previewPanelsRef.current[id];
    if (!el) return;
    if (Number(previewExpanded) === Number(id)) {
      el.style.maxHeight = `${el.scrollHeight}px`;
    }
  };

  const toggleDescriptionPreview = (id) => {
    setDescriptionExpanded((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

    /*
      MenuModule

      Purpose:
      - Admin UI to manage menu categories and items. Supports CRUD operations
        for categories and menu items via the backend API.

      Expected API endpoints:
      - GET /api/menu -> categories with items
      - POST/PUT /api/menu/categories and /api/menu/categories/:id
      - DELETE /api/menu/categories/:id
      - POST/PUT /api/menu/items and /api/menu/items/:id
      - DELETE /api/menu/items/:id

      Notes:
      - The component uses simple modal editors for categories and items. Validation
        is minimal; consider adding required-field checks before saving.
      - Prices are handled as numbers (parseFloat) when editing — guard against NaN where necessary.
    */

  const apiOrigin = API_BASE.replace(/\/api$/, '');
  const normalizeUrl = (u) => {
    if (!u) return '';
    if (u.startsWith('http://') || u.startsWith('https://')) return u;
    if (u.startsWith('/')) return `${apiOrigin}${u}`;
    return `${apiOrigin}/${u}`;
  };

  const getCacheBusterFromMedia = (media) => media?.cache_buster || media?.updated_at || media?.uploaded_at || null;

  const mediaToResponsiveEntry = (media, fallbackInput = '') => {
    if (!media) return null;
    const fallback = fallbackInput || media.fallback_original || media.file_url || '';
    const entry = {
      image_variants: media.image_variants || media.responsive_variants || media.variants || {},
      responsive_variants: media.responsive_variants || media.image_variants || media.variants || {},
      fallback_original: fallback,
      file_url: fallback,
      alt_text: media.alt_text || media.title || ''
    };
    const cacheBuster = getCacheBusterFromMedia(media);
    return cacheBuster ? applyCacheBusterToEntry(entry, cacheBuster) : entry;
  };

  const ensureCategoryResponsiveEntry = useCallback((category) => {
    if (!category) return null;
    const cacheBuster = category?.gallery_image_cache_buster || null;
    let entry = null;
    if (category.gallery_image_responsive) {
      entry = category.gallery_image_responsive;
    } else if (category.gallery_image_variants) {
      entry = {
        image_variants: category.gallery_image_variants,
        responsive_variants: category.gallery_image_variants,
        fallback_original: category.gallery_image_url || '',
        file_url: category.gallery_image_url || '',
        alt_text: category.name || ''
      };
    } else if (category.gallery_image_url) {
      entry = {
        image_variants: {},
        responsive_variants: {},
        fallback_original: category.gallery_image_url,
        file_url: category.gallery_image_url,
        alt_text: category.name || ''
      };
    }
    if (!entry) return null;
    return cacheBuster ? applyCacheBusterToEntry(entry, cacheBuster) : entry;
  }, []);

  const ResponsiveImagePreview = ({ entry, fallbackUrl, alt = '', className = '', sizes = '320px', cacheBuster = null }) => {
    const hydratedEntry = cacheBuster ? applyCacheBusterToEntry(entry, cacheBuster) : entry;
    const variant = hydratedEntry && hasRenderableImageVariant(hydratedEntry)
      ? buildImageVariant(hydratedEntry, { sizes })
      : null;
    const fallbackSource = fallbackUrl ? normalizeUrl(fallbackUrl) : '';
    const fallback = variant?.fallback
      || (fallbackSource ? appendCacheBuster(fallbackSource, cacheBuster || hydratedEntry?.cache_buster || null) : '');

    if (variant) {
      return (
        <picture>
          {variant.webpSrcset && (
            <source type="image/webp" srcSet={variant.webpSrcset} sizes={variant.sizes} />
          )}
          {variant.optimizedSrcset && (
            <source type="image/jpeg" srcSet={variant.optimizedSrcset} sizes={variant.sizes} />
          )}
          <img
            src={fallback}
            alt={alt}
            className={className}
            loading="lazy"
            sizes={variant.sizes}
            srcSet={variant.optimizedSrcset || undefined}
          />
        </picture>
      );
    }

    if (fallback) {
      return (
        <img
          src={fallback}
          alt={alt}
          className={className}
          loading="lazy"
        />
      );
    }

    return (
      <div className={`bg-surface-warm text-text-secondary text-xs flex items-center justify-center ${className}`}>
        No image selected
      </div>
    );
  };

  const fetchCategories = useCallback(async () => {
    try {
      const res = await authenticatedFetch(withDebugParam('/menu/admin'));
      if (!res.ok) { setCategories([]); return; }
      const data = await res.json();
      // server returns categories already ordered by display_order and items ordered by display_order
      setCategories(Array.isArray(data) ? data : []);
    } catch (e) {
      setCategories([]);
    } finally {
      setPreviewLoaded(true);
    }
  }, [withDebugParam]);

  useEffect(() => {
    fetchCategories();
    (async () => {
      try {
        const res = await authenticatedFetch('/settings');
        if (!res.ok) { setSiteSettings({}); return; }
        const payload = await res.json();
        setSiteSettings(payload?.settings || {});
      } catch {
        setSiteSettings({});
      }
    })();
  }, [fetchCategories]);

  const saveCategory = async () => {
    // client-side validation: name required
    if (!editingCategory.name || !editingCategory.name.trim()) {
    setUploadError(null);
    try { window.dispatchEvent(new window.CustomEvent('snackbar', { detail: 'Category name is required' })); } catch (e) {}
    return;
    }
    const method = editingCategory.id ? 'PUT' : 'POST';
    const endpoint = editingCategory.id 
      ? `/menu/categories/${editingCategory.id}`
      : '/menu/categories';
    const url = withDebugParam(endpoint);

    const payload = { 
      name: editingCategory.name.trim(),
      description: sanitizeRichText(editingCategory.description || ''),
      display_order: Number(editingCategory.display_order) || 0,
      display_columns: Number(editingCategory.display_columns) || 1,
      hide_descriptions: editingCategory.hide_descriptions ? 1 : 0,
      is_active: editingCategory.is_active ? 1 : 0
    };

    if (Object.prototype.hasOwnProperty.call(editingCategory, 'gallery_image_id')) {
      payload.gallery_image_id = editingCategory.gallery_image_id || null;
    }

    logDebug('[menu:saveCategory]', payload);

    try {
      const response = await authenticatedFetch(url, {
        method,
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        throw new Error('Failed to save category');
      }
      await fetchCategories();
      try { window.dispatchEvent(new window.CustomEvent('menuUpdated')); } catch (e) {}
      setEditingCategory(null);
      setToast({ type: 'success', message: 'Category saved' });
      setTimeout(() => setToast(null), 3000);
    } catch (error) {
      console.error('Save error:', error);
      setToast({ type: 'error', message: 'Failed to save category' });
      setTimeout(() => setToast(null), 3000);
    }
  };

  // Upload helper: XMLHttpRequest-based so we can track progress and cancel
  const uploadFile = (file, category = 'gallery') => {
    if (!file) return Promise.resolve(null);
    return new Promise((resolve, reject) => {
      setUploading(true);
      setUploadProgress(0);
      setProcessingUpload(false);
      setUploadError(null);
      const xhr = new window.XMLHttpRequest();
      uploadXhr.current = xhr;
      const fd = new FormData();
      fd.append('file', file);
      // Allow callers to specify a category (hero, menu, general)
      fd.append('category', category);

      xhr.open('POST', `${API_BASE}/media`);
      const token = localStorage.getItem('authToken');
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 100);
          setUploadProgress(pct);
        }
      };
      xhr.upload.onload = () => setProcessingUpload(true);

      xhr.onload = () => {
        uploadXhr.current = null;
        setUploading(false);
        setProcessingUpload(false);
        setUploadProgress(100);
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            if (data?.media) {
              resolve(data.media);
              return;
            }
            setUploadError('Invalid server response');
            reject(new Error('Invalid response'));
            return;
          } catch (err) {
            setUploadError('Invalid server response');
            reject(new Error('Invalid response'));
          }
        } else {
        setProcessingUpload(false);
        setUploadError('Upload failed');
        reject(new Error('Upload failed'));
      }
      };

      xhr.onerror = () => {
        uploadXhr.current = null;
        setUploading(false);
        setProcessingUpload(false);
        setUploadError('Network error');
        reject(new Error('Network error'));
      };

      xhr.send(fd);
    });
  };

  const cancelUpload = () => {
    if (uploadXhr.current) {
      try { uploadXhr.current.abort(); } catch (e) {}
      uploadXhr.current = null;
    }
    setUploading(false);
    setUploadProgress(0);
    setUploadError('Upload cancelled');
  };

  const deleteCategory = async (id) => {
    if (!window.confirm('Delete this category and all its items?')) {
      return;
    }
    try {
      const response = await authenticatedFetch(withDebugParam(`/menu/categories/${id}`), { method: 'DELETE' });
      if (!response.ok) {
        throw new Error('Failed to delete category');
      }
      await fetchCategories();
      try { window.dispatchEvent(new window.CustomEvent('menuUpdated')); } catch (e) {}
    } catch (error) {
      console.error('Delete category failed', error);
      setToast({ type: 'error', message: 'Failed to delete category' });
      setTimeout(() => setToast(null), 3000);
    }
  };

  // When saving an item, if any price equals 0.00 we require an explicit
  // confirmation from the admin because public menus hide $0.00 prices.
  const doSaveItem = async (payload) => {
    const method = payload.id ? 'PUT' : 'POST';
    const url = withDebugParam(payload.id ? `/menu/items/${payload.id}` : '/menu/items');

    try {
      const response = await authenticatedFetch(url, {
        method,
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        throw new Error('Failed to save menu item');
      }
      await fetchCategories();
      setEditingItem(null);
      setPendingSavePayload(null);
      setShowZeroPriceConfirm(false);
    } catch (error) {
      console.error('Save item failed', error);
      await fetchCategories();
      setEditingItem(null);
      setPendingSavePayload(null);
      setShowZeroPriceConfirm(false);
      setToast({ type: 'error', message: 'Failed to save menu item' });
      setTimeout(() => setToast(null), 3000);
    }
  };

  const attemptSaveItem = () => {
    // Ensure is_available is explicit so backend update doesn't set it to NULL
    const payload = { ...editingItem, is_available: typeof editingItem.is_available !== 'undefined' ? editingItem.is_available : 1 };
    payload.description = sanitizeRichText(payload.description || '');

    const primaryZero = typeof payload.price === 'number' && payload.price === 0;
    const secondaryZero = typeof payload.secondary_price === 'number' && payload.secondary_price === 0;

    if (primaryZero || secondaryZero) {
      // Ask for confirmation: admin intends to save a 0.00 price which will be hidden publicly
      setPendingSavePayload(payload);
      setShowZeroPriceConfirm(true);
      return;
    }

    doSaveItem(payload);
  };

  const deleteItem = async (id) => {
    if (!window.confirm('Delete this menu item?')) {
      return;
    }
    try {
      const response = await authenticatedFetch(withDebugParam(`/menu/items/${id}`), { method: 'DELETE' });
      if (!response.ok) {
        throw new Error('Failed to delete menu item');
      }
      await fetchCategories();
    } catch (error) {
      console.error('Delete item failed', error);
      setToast({ type: 'error', message: 'Failed to delete menu item' });
      setTimeout(() => setToast(null), 3000);
    }
  };

  // Reorder items in a category locally and persist display_order to the server
  const reorderItems = async (categoryId, fromIndex, toIndex) => {
    const cat = categories.find(c => c.id === categoryId);
    if (!cat) return;
    const items = Array.isArray(cat.items) ? [...cat.items] : [];
    // clamp toIndex
    const to = Math.max(0, Math.min(items.length - 1, toIndex));
    // move item
    const [moved] = items.splice(fromIndex, 1);
    items.splice(to, 0, moved);

    // compute new display_order values (0-based -> server may expect ints)
    const updates = items.map((it, idx) => ({ id: it.id, display_order: idx }));

    // Optimistically update UI
    setCategories(prev => prev.map(c => c.id === categoryId ? { ...c, items } : c));

    // Persist changed display orders. Send only when changed.
    try {
      // Persist updates. Send the full item payload (name, description, price, image_url, is_available)
      // to avoid accidentally nulling fields on the server which expects all columns in the UPDATE.
      const promises = updates.map(u => {
        const original = cat.items.find(i => i.id === u.id);
        if (!original) return Promise.resolve();
        // build payload from original fields and new display_order
        const payload = {
          name: original.name,
          description: sanitizeRichText(original.description || ''),
          price: typeof original.price === 'number' ? original.price : original.price,
          image_url: original.image_url || null,
          display_order: u.display_order,
          is_available: typeof original.is_available !== 'undefined' ? original.is_available : 1,
        };
        return authenticatedFetch(withDebugParam(`/menu/items/${u.id}`), {
          method: 'PUT',
          body: JSON.stringify(payload)
        }).then(res => {
          if (!res.ok) return Promise.reject(new Error('Failed to update item'));
          return res;
        });
      });
      await Promise.all(promises);
      // refresh to ensure server-side canonical ordering
      await fetchCategories();
      setToast({ type: 'success', message: 'Order saved' });
      setTimeout(() => setToast(null), 2500);
    } catch (e) {
      setToast({ type: 'error', message: 'Failed to save order' });
      setTimeout(() => setToast(null), 2500);
      // fallback: refetch original
      await fetchCategories();
    }
  };

  const handleDragStart = (e, itemId, categoryId) => {
    try { e.dataTransfer.setData('text/plain', String(itemId)); } catch (err) {}
    e.dataTransfer.effectAllowed = 'move';
    setDragging({ itemId, fromCategoryId: categoryId });
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, categoryId, dropIndex) => {
    e.preventDefault();
    const itemId = dragging.itemId || (e.dataTransfer && e.dataTransfer.getData('text/plain')) || null;
    if (!itemId) {
      setDragging({ itemId: null, fromCategoryId: null });
      return;
    }

    // find source category and indices
    const fromCategoryId = dragging.fromCategoryId;
    const fromCat = categories.find(c => c.id === fromCategoryId);
    if (!fromCat) return handleDragEnd();
    const fromIndex = fromCat.items.findIndex(i => String(i.id) === String(itemId));
    if (fromIndex === -1) return handleDragEnd();

    // determine target index (if dropping after last element, append)
    const cat = categories.find(c => c.id === categoryId);
    const maxIndex = (cat && cat.items) ? cat.items.length - 1 : 0;
    const toIndex = Math.max(0, Math.min(maxIndex, dropIndex));

    // if same index and same category, nothing to do
    if (fromCategoryId === categoryId && fromIndex === toIndex) {
      handleDragEnd();
      return;
    }

    // perform reorder
    reorderItems(categoryId, fromIndex, toIndex).finally(() => handleDragEnd());
  };

  const handleDragEnd = () => {
    setDragging({ itemId: null, fromCategoryId: null });
  };

  // Category drag-and-drop handlers
  const handleCategoryDragStart = (e, categoryId) => {
    try { e.dataTransfer.setData('text/plain', String(categoryId)); } catch (err) {}
    e.dataTransfer.effectAllowed = 'move';
    setDraggingCategory(categoryId);
  };

  const handleCategoryDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleCategoryDrop = async (e, dropIndex) => {
    e.preventDefault();
    const categoryId = draggingCategory || (e.dataTransfer && e.dataTransfer.getData('text/plain')) || null;
    if (!categoryId) {
      setDraggingCategory(null);
      return;
    }

    const fromIndex = categories.findIndex(c => String(c.id) === String(categoryId));
    if (fromIndex === -1 || fromIndex === dropIndex) {
      setDraggingCategory(null);
      return;
    }

    // Reorder categories locally
    const newCategories = [...categories];
    const [movedCategory] = newCategories.splice(fromIndex, 1);
    newCategories.splice(dropIndex, 0, movedCategory);

    // Update display_order for all categories
    const updates = newCategories.map((cat, idx) => ({
      ...cat,
      display_order: idx
    }));

    setCategories(updates);
    setDraggingCategory(null);

    // Save all category orders to backend using batch endpoint
    try {
      const response = await authenticatedFetch(withDebugParam('/menu/categories/reorder'), {
        method: 'PUT',
        body: JSON.stringify({
          categories: updates.map(cat => ({
            id: cat.id,
            display_order: cat.display_order
          }))
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update category order');
      }

      setToast({ type: 'success', message: 'Category order updated' });
      setTimeout(() => setToast(null), 3000);
      await fetchCategories(); // Refresh to ensure consistency
    } catch (err) {
      await fetchCategories(); // Revert on error
      setToast({ type: 'error', message: 'Failed to update category order' });
      setTimeout(() => setToast(null), 3000);
    }
  };

  const handleCategoryDragEnd = () => {
    setDraggingCategory(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
  <h2 className="text-2xl font-bold text-text-inverse">Menu Management</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setEditingCategory({
              name: '',
              description: '',
              display_order: 0,
              display_columns: 1,
              hide_descriptions: 0,
              is_active: 1,
              gallery_image_id: null,
              gallery_image_url: '',
              gallery_image_responsive: null,
              gallery_image_cache_buster: null
            })}
            className="bg-primary text-text-inverse px-4 py-2 rounded-lg hover:bg-primary-dark flex items-center gap-2"
            aria-label="Add menu category"
          >
            <icons.Plus size={18} />
            Add Category
          </button>
        </div>
      </div>

      <div className="bg-surface rounded-lg shadow p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-3">
          <div>
            <h3 className="text-lg font-semibold text-text-primary">Public Menu Preview</h3>
            <p className="text-xs text-text-secondary">Reflects the live menu layout and sanitizes text exactly like the public site.</p>
          </div>
        </div>
        <div className="border border-divider rounded-lg">
          <MenuDisplay
            categories={previewCategories}
            menuHeading={siteSettings?.menu_heading || ''}
            menuIntro={siteSettings?.menu_intro || ''}
            expandedCategory={previewExpanded}
            onToggleCategory={(id) => setPreviewExpanded(prev => (prev === id ? null : id))}
            panelsRef={previewPanelsRef}
            measurePanel={measurePreviewPanel}
            isLoaded={previewLoaded}
            className="p-4"
          />
        </div>
      </div>

      {/* Category Editor Modal */}
      {editingCategory && (
        <div className="modal-backdrop flex items-center justify-center z-50">
                <div className="bg-surface rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4 text-text-primary">
              {editingCategory.id ? 'Edit' : 'Add'} Category
            </h3>
            <p className="text-sm text-text-secondary mb-3">Existing images will be preserved unless you remove or replace them.</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Name</label>
                <input
                  type="text"
                  value={editingCategory.name}
                  onChange={(e) => setEditingCategory({...editingCategory, name: e.target.value})}
                  className="w-full form-input"
                />
              </div>
              <RichTextField
                label="Description"
                value={editingCategory.description || ''}
                onChange={(html) => setEditingCategory({ ...editingCategory, description: html })}
                helperText="Allowed formatting: bold, italic, line breaks, unordered/ordered lists."
              />
              <div>
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" checked={!!editingCategory.is_active} onChange={(e) => setEditingCategory(c => ({ ...c, is_active: e.target.checked ? 1 : 0 }))} />
                  <span className="text-sm text-text-primary">Active</span>
                </label>
              </div>
              <div>
                <label className="inline-flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    checked={!!editingCategory.hide_descriptions} 
                    onChange={(e) => setEditingCategory(c => ({ ...c, hide_descriptions: e.target.checked ? 1 : 0 }))} 
                  />
                  <span className="text-sm text-text-primary">Hide Item Descriptions</span>
                </label>
                <p className="text-xs text-text-secondary mt-1">
                  Check this to hide menu item descriptions (useful for simple lists)
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Menu image</label>
                <p className="text-xs text-text-secondary mb-2">
                  Pick an image from the media library or upload a new one for this category.
                </p>
                <div className="flex flex-wrap gap-2 items-center">
                  <button
                    type="button"
                    onClick={async () => {
                      const currentId = editingCategory.gallery_image_id;
                      setSelectedMediaId(currentId ? String(currentId) : null);
                      setShowMediaPicker(true);
                      try {
                        reset();
                        await fetchPage(0, false);
                      } catch (e) {
                        // ignore fetch failures; modal still opens
                      }
                    }}
                    className={`px-3 py-2 rounded text-sm bg-surface ${uploading ? 'opacity-60 pointer-events-none' : ''}`}
                    disabled={uploading}
                  >
                    Choose from media
                  </button>
                  <label className={`px-3 py-2 rounded cursor-pointer text-sm bg-surface ${uploading ? 'opacity-60 pointer-events-none' : ''}`}>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploading}
                      onChange={async (ev) => {
                        const file = ev.target.files?.[0];
                        if (!file) return;
                        const MAX_BYTES = 8 * 1024 * 1024;
                        if (!file.type.startsWith('image/')) {
                          setUploadError('Please select an image file');
                          return;
                        }
                        if (file.size > MAX_BYTES) {
                          setUploadError('Image must be 8 MB or smaller');
                          return;
                        }
                        try {
                          const media = await uploadFile(file, 'menu');
                          if (media?.id) {
                            const fallback = media.fallback_original || media.file_url || '';
                            setEditingCategory((prev) => ({
                              ...prev,
                              gallery_image_id: media.id,
                              gallery_image_url: fallback,
                              gallery_image_responsive: mediaToResponsiveEntry(media, fallback),
                              gallery_image_cache_buster: getCacheBusterFromMedia(media)
                            }));
                            setSelectedMediaId(String(media.id));
                            try {
                              window.dispatchEvent(new window.CustomEvent('mediaUpdated'));
                            } catch (eventError) {
                              // ignore Event errors in unsupported browsers
                            }
                          }
                        } catch (err) {
                          // error handled via uploadError state
                        }
                      }}
                    />
                    {uploading ? (processingUpload ? 'Processing images…' : `Uploading ${uploadProgress}%`) : 'Upload new image'}
                  </label>
                  {editingCategory.gallery_image_id && (
                    <button
                      type="button"
                      onClick={() => setEditingCategory((c) => ({
                        ...c,
                        gallery_image_url: '',
                        gallery_image_id: null,
                        gallery_image_responsive: null,
                        gallery_image_cache_buster: null
                      }))}
                      className={`px-3 py-2 rounded text-sm bg-surface ${uploading ? 'opacity-60 pointer-events-none' : ''}`}
                      disabled={uploading}
                    >
                      Remove
                    </button>
                  )}
                </div>
                {uploadError && (
                  <Toast type="error" onClose={() => setUploadError(null)}>{uploadError}</Toast>
                )}
                {uploading && (
                  <div className="text-xs text-text-secondary mt-2 flex items-center gap-2">
                    {processingUpload ? 'Processing images…' : `Uploading ${uploadProgress}%`}
                    <button type="button" onClick={cancelUpload} className="underline text-primary text-xs">
                      Cancel
                    </button>
                  </div>
                )}
                  <div className="mt-2">
                    <ResponsiveImagePreview
                      entry={editingCategory.gallery_image_responsive}
                      fallbackUrl={editingCategory.gallery_image_url}
                      cacheBuster={editingCategory.gallery_image_cache_buster}
                      alt="Menu preview"
                      className="h-24 w-full rounded object-cover"
                      sizes="(max-width: 768px) 80vw, 320px"
                    />
                  </div>
                }
              </div>
              <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={saveCategory}
                    className="flex-1 bg-primary text-text-inverse py-2 rounded-lg hover:bg-primary-dark"
                    disabled={uploading}
                  >
                    {uploading ? 'Uploading…' : 'Save'}
                  </button>
                <button
                  type="button"
                  onClick={() => setEditingCategory(null)}
                  className="flex-1 bg-surface-warm text-text-secondary py-2 rounded-lg hover:bg-surface"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Media Picker Modal */}
      {showMediaPicker && (
        <div className="modal-backdrop flex items-center justify-center z-50">
          <div className="bg-surface rounded-lg p-4 max-w-3xl w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Choose media</h3>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setShowMediaPicker(false)} className="px-3 py-1 rounded">Cancel</button>
                <button
                  type="button"
                  onClick={() => {
                    const media = (pagedMedia || []).find(m => String(m.id) === String(selectedMediaId));
                    if (media) {
                      setEditingCategory(c => ({
                        ...c,
                        gallery_image_url: media.fallback_original || media.file_url || '',
                        gallery_image_id: media.id,
                        gallery_image_responsive: mediaToResponsiveEntry(media, media.fallback_original || media.file_url || ''),
                        gallery_image_cache_buster: getCacheBusterFromMedia(media)
                      }));
                    }
                    setShowMediaPicker(false);
                  }}
                  className="px-3 py-1 rounded bg-primary text-text-inverse"
                >
                  Select
                </button>
              </div>
            </div>
            <div>
                <div className="mb-3">
                <button type="button" onClick={() => {
                  // reset and fetch first page
                  reset();
                  fetchPage(0, false).catch(() => {});
                }} className="px-3 py-1 rounded bg-surface">Refresh</button>
              </div>
                  {pagedLoading ? (
                  <div className="flex items-center gap-2"><Spinner size={18} /><span>Loading…</span></div>
                ) : (
                  <>
                  <div className="grid grid-cols-4 gap-3">
                    {pagedMedia.map(m => (
                      <button key={m.id} type="button" onClick={() => setSelectedMediaId(m.id)} className={`border rounded overflow-hidden p-0 ${String(selectedMediaId) === String(m.id) ? 'ring-2 ring-primary' : ''}`}>
                        <img loading="lazy" src={normalizeUrl(m.file_url)} alt={m.title || ''} className="w-full h-24 object-cover" />
                      </button>
                    ))}
                  </div>
                  {pagedTotal !== null && pagedTotal > pagedMedia.length && (
                    <div className="mt-3 text-center">
                      <div ref={sentinelRef} aria-hidden="true" className="h-6" />
                      <div className="text-xs text-text-secondary mt-2">Loading more as you scroll…</div>
                    </div>
                  )}
                  </>
                )}
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-50">
          <Toast type={toast.type} onClose={() => setToast(null)}>{toast.message}</Toast>
        </div>
      )}

      {/* Item Editor Modal */}
      {editingItem && (
        <div className="modal-backdrop flex items-center justify-center z-50">
                <div className="bg-surface rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4 text-text-primary">
              {editingItem.id ? 'Edit' : 'Add'} Menu Item
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Name</label>
                <input
                  type="text"
                  value={editingItem.name}
                  onChange={(e) => setEditingItem({...editingItem, name: e.target.value})}
                  className="w-full form-input"
                />
              </div>
              <RichTextField
                label="Description"
                value={editingItem.description || ''}
                onChange={(html) => setEditingItem({ ...editingItem, description: html })}
                helperText="Matches the public menu exactly. Allowed tags: p, strong, em, br, ul, ol, li."
              />
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Price</label>
                <input
                  type="number"
                  step="0.01"
                  value={editingItem.price}
                  onChange={(e) => setEditingItem({...editingItem, price: parseFloat(e.target.value)})}
                  className="w-full form-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Primary quantity (optional)</label>
                <input
                  type="text"
                  value={editingItem.primary_quantity || ''}
                  onChange={(e) => setEditingItem({...editingItem, primary_quantity: e.target.value})}
                  className="w-full form-input"
                  placeholder="e.g. 12oz, Small, Single"
                />
              </div>
              <div>
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" checked={!!editingItem.secondary_price} onChange={(e) => {
                    if (e.target.checked) {
                      setEditingItem(c => ({ ...c, secondary_price: (c.secondary_price != null ? c.secondary_price : 0), secondary_quantity: c.secondary_quantity || '' }));
                    } else {
                      setEditingItem(c => ({ ...c, secondary_price: null, secondary_quantity: null }));
                    }
                  }} />
                  <span className="text-sm text-text-primary">Has secondary price</span>
                </label>
              </div>
              {editingItem.secondary_price != null && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1">Secondary quantity</label>
                    <input type="text" value={editingItem.secondary_quantity || ''} onChange={(e) => setEditingItem({...editingItem, secondary_quantity: e.target.value})} className="w-full form-input" placeholder="e.g. Large, 16oz" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1">Secondary price</label>
                    <input type="number" step="0.01" value={editingItem.secondary_price} onChange={(e) => setEditingItem({...editingItem, secondary_price: e.target.value === '' ? null : parseFloat(e.target.value)})} className="w-full form-input" />
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={attemptSaveItem}
                  className="flex-1 bg-primary text-text-inverse py-2 rounded-lg hover:bg-primary-dark"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="flex-1 bg-surface-warm text-text-secondary py-2 rounded-lg hover:bg-surface"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation modal when saving items with a $0.00 price */}
      {showZeroPriceConfirm && (
        <div className="modal-backdrop flex items-center justify-center z-50">
          <div className="bg-surface rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-2 text-text-primary">Confirm zero price</h3>
            <p className="text-sm text-text-secondary mb-4">One or more prices for this item are set to <strong>$0.00</strong>. Items with a $0.00 price are hidden on the public menu. Do you want to save anyway?</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  if (pendingSavePayload) doSaveItem(pendingSavePayload);
                }}
                className="flex-1 bg-primary text-text-inverse py-2 rounded-lg hover:bg-primary-dark"
              >
                Save anyway
              </button>
              <button
                type="button"
                onClick={() => { setShowZeroPriceConfirm(false); setPendingSavePayload(null); }}
                className="flex-1 bg-surface-warm text-text-secondary py-2 rounded-lg hover:bg-surface"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Categories List */}
      <div className="space-y-4">
        {categories.map((category, idx) => (
          <div
            key={category.id}
            className={`bg-surface rounded-lg shadow ${draggingCategory === category.id ? 'opacity-60' : ''}`}
            onDragOver={handleCategoryDragOver}
            onDrop={(e) => handleCategoryDrop(e, idx)}
          >
              <div className="flex items-center justify-between p-4 border-b border-divider">
              {/* Drag handle for category */}
              <button
                type="button"
                className={`mr-3 p-2 rounded ${draggingCategory === category.id ? 'cursor-grabbing' : 'cursor-grab'} text-text-secondary`}
                draggable
                onDragStart={(e) => handleCategoryDragStart(e, category.id)}
                onDragEnd={handleCategoryDragEnd}
                aria-label={`Drag ${category.name} category`}
              >
                <icons.Menu size={20} />
              </button>
              <div
                role="button"
                tabIndex={0}
                onClick={() => setExpandedCategory(expandedCategory === category.id ? null : category.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setExpandedCategory(expandedCategory === category.id ? null : category.id);
                  }
                }}
                className="flex-1 flex items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-md"
                aria-expanded={expandedCategory === category.id}
                aria-controls={`category-items-${category.id}`}
              >
                <div>
                  {expandedCategory === category.id ? <icons.ChevronUp size={20} /> : <icons.ChevronDown size={20} />}
                </div>
                <div className="flex items-center gap-3">
                  <ResponsiveImagePreview
                    entry={category.gallery_image_responsive}
                    fallbackUrl={category.gallery_image_url}
                    cacheBuster={category.gallery_image_cache_buster}
                    alt={`${category.name} preview`}
                    className="w-12 h-8 object-cover rounded"
                    sizes="80px"
                  />
                  <div>
                    <h3 className="font-bold text-lg text-text-primary">{category.name}</h3>
                    {category.description ? (() => {
                      const descHtml = sanitizeRichText(category.description || '');
                      if (!descHtml) return null;
                      const expanded = !!descriptionExpanded[category.id];
                      return (
                        <div className="mt-1">
                          <div className="text-xs uppercase tracking-wide text-text-secondary mb-1">Preview</div>
                          <div className={`menu-description-preview ${expanded ? 'expanded' : 'clamped'}`}>
                            <div
                              className="text-sm text-text-secondary menu-description"
                              dangerouslySetInnerHTML={{ __html: descHtml }}
                            />
                            {!expanded && <div className="menu-description-preview__fade" />}
                          </div>
                          <button
                            type="button"
                            className="text-xs text-primary hover:underline mt-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleDescriptionPreview(category.id);
                            }}
                          >
                            {expanded ? 'Show less' : 'Show more'}
                          </button>
                        </div>
                      );
                    })() : null}
                  </div>
                </div>
              </div>
                <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingItem({ category_id: category.id, name: '', description: '', price: 0 })}
                  className="text-primary hover:bg-surface-warm p-2 rounded"
                  aria-label={`Add item to ${category.name}`}
                >
                  <icons.Plus size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingCategory({
                      ...category,
                      is_active: category.is_active == null ? 1 : category.is_active,
                      gallery_image_responsive: ensureCategoryResponsiveEntry(category)
                    });
                  }}
                  className="text-text-inverse hover:bg-surface-warm p-2 rounded"
                  aria-label={`Edit category ${category.name}`}
                >
                  <icons.Edit size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => deleteCategory(category.id)}
                  className="text-error hover:bg-surface-warm p-2 rounded"
                  aria-label={`Delete category ${category.name}`}
                >
                  <icons.Trash2 size={18} />
                </button>
              </div>
            </div>

            {expandedCategory === category.id && (
              <div id={`category-items-${category.id}`} className="p-4" role="region" aria-label={`${category.name} items`}>
                {category.items && category.items.length > 0 ? (
                  <div className="space-y-2">
                    {category.items.map((item, idx) => (
                      <div
                        key={item.id}
                        className={`flex items-center justify-between p-3 bg-surface-warm rounded-lg ${dragging.itemId === item.id ? 'opacity-60' : ''}`}
                        role="listitem"
                        aria-grabbed={dragging.itemId === item.id}
                        onDragOver={(e) => handleDragOver(e)}
                        onDrop={(e) => handleDrop(e, category.id, idx)}
                      >
                        {/* Drag handle - drag only when grabbing the handle to avoid accidental drags */}
                        <button
                          type="button"
                          className={`mr-3 p-2 rounded ${dragging.itemId === item.id ? 'cursor-grabbing' : 'cursor-grab'} text-text-secondary`}
                          draggable
                          onDragStart={(e) => handleDragStart(e, item.id, category.id)}
                          onDragEnd={handleDragEnd}
                          aria-label={`Drag ${item.name}`}
                        >
                          <icons.Menu size={16} />
                        </button>
                        <div className="flex-1">
                          <p className="font-medium text-text-primary">{item.name}</p>
                          {!category.hide_descriptions && item.description ? (
                            <div
                              className="text-sm text-text-secondary menu-item-description mt-1"
                              dangerouslySetInnerHTML={{ __html: sanitizeRichText(item.description || '') }}
                            />
                          ) : null}
                          <p className="text-lg font-heading text-primary mt-1">
                            {typeof item.price === 'number' ? `$${item.price.toFixed(2)}` : '—'}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingItem(item)}
                            className="text-text-secondary hover:bg-surface p-2 rounded"
                            aria-label={`Edit item ${item.name}`}
                          >
                            <icons.Edit size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteItem(item.id)}
                            className="text-error hover:bg-surface p-2 rounded"
                            aria-label={`Delete item ${item.name}`}
                          >
                            <icons.Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-text-secondary py-4">No items in this category</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const Module = {
  component: MenuModule,
  name: 'Menu',
  icon: icons.UtensilsCrossed
};

export default Module;

// Icons and auxiliary UI components are referenced here so linters pick up usage
// for imports that are only used inside JSX expressions in some editor/tooling
// setups which otherwise report false-positive `no-unused-vars` errors.
const __usedMenuSymbols = { icons, Toast };
void __usedMenuSymbols;

// Icons are referenced through the centralized `icons` map so linters pick up usage.
