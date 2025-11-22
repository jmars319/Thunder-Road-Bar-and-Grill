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
import { useState, useEffect, useRef } from 'react';
import { icons } from '../../icons';
import Toast from '../ui/Toast';
import usePaginatedResource from '../../hooks/usePaginatedResource';
import Spinner from '../ui/Spinner';
import { authenticatedFetch, API_BASE } from '../../utils/api';
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
  const [categories, setCategories] = useState([]);
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [originalCategory, setOriginalCategory] = useState(null);
  const [uploading, setUploading] = useState(false);
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

  // paginated gallery media hook (infinite scroll sentinel provided by hook)
  const { items: pagedMedia, loading: pagedLoading, total: pagedTotal, sentinelRef, fetchPage, reset } = usePaginatedResource(`${API_BASE}/media?category=gallery`, { limit: MEDIA_LIMIT_MENU });
  const [selectedMediaId, setSelectedMediaId] = useState(null);
  const [toast, setToast] = useState(null);
  const [showZeroPriceConfirm, setShowZeroPriceConfirm] = useState(false);
  const [pendingSavePayload, setPendingSavePayload] = useState(null);

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

  useEffect(() => {
    fetchCategories();
  }, []);

  const apiOrigin = API_BASE.replace(/\/api$/, '');
  const normalizeUrl = (u) => {
    if (!u) return '';
    if (u.startsWith('http://') || u.startsWith('https://')) return u;
    if (u.startsWith('/')) return `${apiOrigin}${u}`;
    return `${apiOrigin}/${u}`;
  };

  const fetchCategories = async () => {
    try {
      const res = await authenticatedFetch('/menu/admin');
      if (!res.ok) { setCategories([]); return; }
      const data = await res.json();
      // server returns categories already ordered by display_order and items ordered by display_order
      setCategories(Array.isArray(data) ? data : []);
    } catch (e) {
      setCategories([]);
    }
  };

  const saveCategory = () => {
    // client-side validation: name required
    if (!editingCategory.name || !editingCategory.name.trim()) {
    setUploadError(null);
    try { window.dispatchEvent(new window.CustomEvent('snackbar', { detail: 'Category name is required' })); } catch (e) {}
    return;
    }
    const method = editingCategory.id ? 'PUT' : 'POST';
    const url = editingCategory.id 
      ? `${API_BASE}/menu/categories/${editingCategory.id}`
      : `${API_BASE}/menu/categories`;

  // Build payload with required fields
  const payload = { 
      name: editingCategory.name,
      description: editingCategory.description || '',
      display_order: editingCategory.display_order || 0,
      display_columns: 2, // Always use 2-column layout
      hide_descriptions: editingCategory.hide_descriptions || 0,
      is_active: editingCategory.is_active
    };
    
    // Include image fields only if explicitly modified or for new categories
    // Compare with original to detect changes
    if (originalCategory) {
      // Only include if changed
      if (editingCategory.image_url !== originalCategory.image_url) {
        payload.image_url = editingCategory.image_url;
      }
      if (editingCategory.gallery_image_id !== originalCategory.gallery_image_id) {
        payload.gallery_image_id = editingCategory.gallery_image_id;
      }
    } else {
      // New category - include all image fields
      payload.image_url = editingCategory.image_url || null;
      payload.gallery_image_id = editingCategory.gallery_image_id || null;
    }

    // clean save path (no debug helpers)

    authenticatedFetch(url, {
      method,
      body: JSON.stringify(payload)
    }).then(() => {
      fetchCategories();
      setEditingCategory(null);
      setOriginalCategory(null);
      setToast({ type: 'success', message: 'Category saved' });
      setTimeout(() => setToast(null), 3000);
    }).catch(() => {
      setToast({ type: 'error', message: 'Failed to save category' });
      setTimeout(() => setToast(null), 3000);
    });
  };

  // Upload helper: XMLHttpRequest-based so we can track progress and cancel
  const uploadFile = (file, category = 'general') => {
    if (!file) return Promise.resolve(null);
    return new Promise((resolve, reject) => {
      setUploading(true);
      setUploadProgress(0);
      setUploadError(null);
      const xhr = new window.XMLHttpRequest();
      uploadXhr.current = xhr;
      const fd = new FormData();
      fd.append('file', file);
      // Allow callers to specify a category (logo, hero, gallery, resume, general)
      fd.append('category', category);

      xhr.open('POST', `${API_BASE}/media/upload`);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 100);
          setUploadProgress(pct);
        }
      };

      xhr.onload = () => {
        uploadXhr.current = null;
        setUploading(false);
        setUploadProgress(100);
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            resolve(data.file_url || null);
          } catch (err) {
            setUploadError('Invalid server response');
            reject(new Error('Invalid response'));
          }
        } else {
          setUploadError('Upload failed');
          reject(new Error('Upload failed'));
        }
      };

      xhr.onerror = () => {
        uploadXhr.current = null;
        setUploading(false);
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

  const deleteCategory = (id) => {
    if (window.confirm('Delete this category and all its items?')) {
      authenticatedFetch(`/menu/categories/${id}`, { method: 'DELETE' })
        .then(() => fetchCategories());
    }
  };

  // When saving an item, if any price equals 0.00 we require an explicit
  // confirmation from the admin because public menus hide $0.00 prices.
  const doSaveItem = (payload) => {
    const method = payload.id ? 'PUT' : 'POST';
    const url = payload.id ? `/menu/items/${payload.id}` : '/menu/items';

    authenticatedFetch(url, {
      method,
      body: JSON.stringify(payload)
    }).then(() => {
      fetchCategories();
      setEditingItem(null);
      setPendingSavePayload(null);
      setShowZeroPriceConfirm(false);
    }).catch(() => {
      // still refetch to keep UI consistent
      fetchCategories();
      setEditingItem(null);
      setPendingSavePayload(null);
      setShowZeroPriceConfirm(false);
    });
  };

  const attemptSaveItem = () => {
    // Ensure is_available is explicit so backend update doesn't set it to NULL
    const payload = { ...editingItem, is_available: typeof editingItem.is_available !== 'undefined' ? editingItem.is_available : 1 };

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

  const deleteItem = (id) => {
    if (window.confirm('Delete this menu item?')) {
      authenticatedFetch(`/menu/items/${id}`, { method: 'DELETE' })
        .then(() => fetchCategories());
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
          description: original.description,
          price: typeof original.price === 'number' ? original.price : original.price,
          image_url: original.image_url || null,
          display_order: u.display_order,
          is_available: typeof original.is_available !== 'undefined' ? original.is_available : 1,
        };
        return authenticatedFetch(`/menu/items/${u.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        }).then(res => {
          if (!res.ok) return Promise.reject(new Error('Failed to update item'));
          return res;
        });
      });
      await Promise.all(promises);
      // refresh to ensure server-side canonical ordering
      fetchCategories();
      setToast({ type: 'success', message: 'Order saved' });
      setTimeout(() => setToast(null), 2500);
    } catch (e) {
      setToast({ type: 'error', message: 'Failed to save order' });
      setTimeout(() => setToast(null), 2500);
      // fallback: refetch original
      fetchCategories();
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
      const response = await authenticatedFetch('/menu/categories/reorder', {
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
      fetchCategories(); // Refresh to ensure consistency
    } catch (err) {
      fetchCategories(); // Revert on error
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
            onClick={() => setEditingCategory({ name: '', description: '', display_order: 0, is_active: 1 })}
            className="bg-primary text-text-inverse px-4 py-2 rounded-lg hover:bg-primary-dark flex items-center gap-2"
            aria-label="Add menu category"
          >
            <icons.Plus size={18} />
            Add Category
          </button>
        </div>
      </div>

      {/* Category Editor Modal */}
      {editingCategory && (
        <div className="modal-backdrop flex items-center justify-center z-50">
                <div className="bg-surface rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4 text-text-primary">
              {editingCategory.id ? 'Edit' : 'Add'} Category
            </h3>
            <p className="text-sm text-text-muted mb-3">Existing images will be preserved unless you remove or replace them.</p>
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
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Description</label>
                <textarea
                  value={editingCategory.description}
                  onChange={(e) => setEditingCategory({...editingCategory, description: e.target.value})}
                  className="w-full form-input"
                  rows="3"
                />
                <p className="text-xs text-text-muted mt-1">
                  Lines with pipes (|) display in columns. Lines without pipes display normally. Example:<br/>
                  Current Flavors:<br/>
                  Chocolate | Vanilla | Strawberry
                </p>
              </div>
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
                <p className="text-xs text-text-muted mt-1">
                  Check this to hide menu item descriptions (useful for simple lists)
                </p>
              </div>
              <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Image URL (optional)</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={editingCategory.image_url || ''}
                    onChange={(e) => setEditingCategory({...editingCategory, image_url: e.target.value})}
                    placeholder="https://.../image.jpg"
                    className="w-full form-input"
                    disabled={uploading}
                  />
                    <label className={`px-3 py-2 rounded cursor-pointer text-sm ${uploading ? 'opacity-60 pointer-events-none' : 'bg-surface'}`}>
                    <input type="file" accept="image/*" className="hidden" onChange={async (ev) => {
                      const f = ev.target.files?.[0];
                      if (!f) return;
                      // client-side checks: image type and size <= 5MB
                      const MAX_BYTES = 5 * 1024 * 1024;
                      if (!f.type.startsWith("image/")) {
                        setUploadError('Please select an image file');
                        return;
                      }
                      if (f.size > MAX_BYTES) {
                        setUploadError('Image must be 5 MB or smaller');
                        return;
                      }
                      try {
                        // Use the 'gallery' category for category images so they are
                        // discoverable in the gallery listing and treated with gallery rules.
                        const url = await uploadFile(f, 'gallery');
                        if (url) setEditingCategory(c => ({ ...c, image_url: url }));
                      } catch (err) {
                        // error state is handled by uploadError
                      }
                    }} />
                    {uploading ? `Uploading ${uploadProgress}%` : 'Upload'}
                  </label>
                </div>
                {uploadError && <Toast type="error" onClose={() => setUploadError(null)}>{uploadError}</Toast>}
                {editingCategory.image_url && (
                  <div className="mt-2">
                    <img loading="lazy" src={editingCategory.image_url} alt="preview" className="h-24 rounded object-cover" />
                    {uploading && <div className="w-full bg-surface-warm h-2 rounded mt-2 overflow-hidden"><div className="bg-accent h-2" style={{ width: `${uploadProgress}%` }} /></div>}
                    {uploading && <div className="mt-2"><button type="button" onClick={cancelUpload} className="btn btn-ghost btn-sm">Cancel</button></div>}
                  </div>
                )}

                  {/* debug overlay removed (2025-10-24) — historical note removed to reduce noise */}
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Gallery image (optional)</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={editingCategory.gallery_image_url || ''}
                    onChange={(e) => setEditingCategory({...editingCategory, gallery_image_url: e.target.value})}
                    placeholder="https://.../image.jpg"
                    className="w-full form-input"
                    disabled={uploading}
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      // open picker and fetch first page
                      const cur = editingCategory.gallery_image_url;
                      setSelectedMediaId(null);
                      setShowMediaPicker(true);
                      try {
                        reset();
                        await fetchPage(0, false);
                        if (cur) {
                          const match = (pagedMedia || []).find(m => normalizeUrl(m.file_url) === normalizeUrl(cur) || m.file_url === cur);
                          if (match) setSelectedMediaId(match.id);
                        }
                      } catch (e) {
                        // ignore
                      }
                    }}
                    className="px-3 py-2 rounded text-sm bg-surface"
                  >
                    Choose from Media
                  </button>
                  {editingCategory.gallery_image_url && (
                    <button type="button" onClick={() => setEditingCategory(c => ({ ...c, gallery_image_url: '', gallery_image_id: null }))} className="px-3 py-2 rounded text-sm bg-surface">Remove</button>
                  )}
                </div>
                {editingCategory.gallery_image_url && (
                  <div className="mt-2">
                    <img loading="lazy" src={normalizeUrl(editingCategory.gallery_image_url)} alt="gallery preview" className="h-24 rounded object-cover" />
                  </div>
                )}
                {/* media errors are handled by the paginated hook when needed */}
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
                    if (media) setEditingCategory(c => ({ ...c, gallery_image_url: media.file_url, gallery_image_id: media.id }));
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
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Description</label>
                <textarea
                  value={editingItem.description}
                  onChange={(e) => setEditingItem({...editingItem, description: e.target.value})}
                  className="w-full form-input"
                  rows="2"
                />
              </div>
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
              <button
                type="button"
                onClick={() => setExpandedCategory(expandedCategory === category.id ? null : category.id)}
                className="flex-1 flex items-center gap-3 text-left"
                aria-expanded={expandedCategory === category.id}
                aria-controls={`category-items-${category.id}`}
              >
                <div>
                  {expandedCategory === category.id ? <icons.ChevronUp size={20} /> : <icons.ChevronDown size={20} />}
                </div>
                <div className="flex items-center gap-3">
                  {category.gallery_image_url && (
                    <img loading="lazy" src={normalizeUrl(category.gallery_image_url)} alt="thumb" className="w-12 h-8 object-cover rounded" />
                  )}
                  <div>
                    <h3 className="font-bold text-lg text-text-primary">{category.name}</h3>
                    <p className="text-sm text-text-secondary">{category.description}</p>
                  </div>
                </div>
              </button>
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
                    setEditingCategory({ ...category, is_active: category.is_active == null ? 1 : category.is_active });
                    setOriginalCategory(category);
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
                          <p className="text-sm text-text-secondary">{item.description}</p>
                            <p className="text-lg font-heading text-primary mt-1">{typeof item.price === 'number' ? `$${item.price.toFixed(2)}` : '—'}</p>
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
