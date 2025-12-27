import { useState, useEffect, useMemo, useCallback } from 'react';
import { icons } from '../../icons';
import Spinner from '../ui/Spinner';
import makeAbsolute from '../../lib/makeAbsolute';
import { authenticatedFetch, API_BASE } from '../../utils/api';

const TAB_CONFIG = [
  { key: 'all', label: 'All Files' },
  { key: 'hero', label: 'Hero Images' },
  { key: 'menu', label: 'Menu Images' },
  { key: 'other', label: 'Other' }
];

const CATEGORY_LABELS = {
  hero: 'Hero Images',
  menu: 'Menu Images',
  gallery: 'Other'
};

const CATEGORY_OPTIONS = [
  { value: 'hero', label: 'Hero Images' },
  { value: 'menu', label: 'Menu Images' },
  { value: 'gallery', label: 'Other / Misc' }
];

const VARIANT_SUFFIXES = ['1x', '2x', '3x'];
const DEFAULT_VARIANT_WIDTHS = [768, 1536, 2304];

const normalizeCategory = (value) => {
  const normalized = String(value ?? '').toLowerCase();
  if (normalized === 'hero' || normalized === 'menu') return normalized;
  if (!normalized || normalized === 'gallery' || normalized === 'general') return 'gallery';
  return normalized;
};

const formatBytes = (bytes) => {
  if (!bytes && bytes !== 0) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes || 1) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(value >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
};

const getMediaPreviewUrl = (media) => {
  if (!media) return '';
  return makeAbsolute(
    media.optimized_path ||
      media.webp_path ||
      media.file_url ||
      media.fallback_original ||
      ''
  );
};

const getCopyUrl = (media) => {
  if (!media) return '';
  return makeAbsolute(
    (media.responsive_variants?.optimized?.[0]?.url) ||
      media.optimized_path ||
      media.webp_path ||
      media.file_url ||
      media.fallback_original ||
      ''
  );
};

const describeVariantSummary = (entry) => {
  if (!entry) return null;
  const variants = entry.responsive_variants || entry.image_variants || {};
  const optimized = Array.isArray(variants.optimized) ? variants.optimized : [];
  const collected = optimized
    .map((variant) => Number(variant.width) || 0)
    .filter((value) => value > 0);
  const uniqueWidths = [];
  collected.forEach((value) => {
    if (!uniqueWidths.includes(value)) {
      uniqueWidths.push(value);
    }
  });
  const widthsToUse = uniqueWidths.length
    ? uniqueWidths.slice(0, VARIANT_SUFFIXES.length)
    : DEFAULT_VARIANT_WIDTHS;
  if (!widthsToUse.length) {
    return null;
  }
  const suffixCount = Math.min(widthsToUse.length, VARIANT_SUFFIXES.length);
  const suffixLabel = VARIANT_SUFFIXES.slice(0, suffixCount).join('/');
  const widthLabel = uniqueWidths.length ? widthsToUse.slice(0, suffixCount).join('/') : '';
  return widthLabel
    ? `Generated variants: ${suffixLabel} (${widthLabel})`
    : `Generated variants: ${suffixLabel}`;
};

const defaultUploadState = {
  file: null,
  previewUrl: '',
  progress: 0,
  uploading: false,
  processing: false
};

export default function MediaModule() {
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [uploadCategory, setUploadCategory] = useState('hero');
  const [uploadState, setUploadState] = useState(defaultUploadState);
  const [editMedia, setEditMedia] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [usageMap, setUsageMap] = useState({ hero: {}, menu: {} });

  const loadUsage = useCallback(async () => {
    try {
      const [settingsRes, categoriesRes] = await Promise.all([
        authenticatedFetch('/settings'),
        authenticatedFetch('/menu/categories')
      ]);

      let heroUsage = {};
      if (settingsRes.ok) {
        const sitePayload = await settingsRes.json();
        const entries = Array.isArray(sitePayload?.settings?.hero_images)
          ? sitePayload.settings.hero_images
          : [];
        heroUsage = entries.reduce((acc, entry, index) => {
          if (entry && entry.id && !entry.is_fallback) {
            acc[entry.id] = {
              order: index + 1,
              title: entry.title || `Slide ${index + 1}`
            };
          }
          return acc;
        }, {});
      }

      let menuUsage = {};
      if (categoriesRes.ok) {
        const categories = await categoriesRes.json();
        if (Array.isArray(categories)) {
          menuUsage = categories.reduce((acc, category) => {
            const mediaId = category?.gallery_image_id;
            if (mediaId) {
              if (!acc[mediaId]) acc[mediaId] = [];
              acc[mediaId].push(category.name || `Category ${category.id}`);
            }
            return acc;
          }, {});
        }
      }

      setUsageMap({ hero: heroUsage, menu: menuUsage });
    } catch (err) {
      setUsageMap({ hero: {}, menu: {} });
    }
  }, []);

  const loadMedia = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await authenticatedFetch(`/media?limit=400&_=${Date.now()}`, {
        cache: 'no-store'
      });
      if (!res.ok) throw new Error('Failed to fetch media');
      const payload = await res.json();
      const list = Array.isArray(payload?.media)
        ? payload.media
        : Array.isArray(payload)
          ? payload
          : [];
      setMedia(list);
    } catch (err) {
      setError('Unable to load media. Please try again in a moment.');
      setMedia([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMedia();
    const handler = () => loadMedia();
    window.addEventListener('mediaUpdated', handler);
    return () => window.removeEventListener('mediaUpdated', handler);
  }, [loadMedia]);

  useEffect(() => {
    loadUsage();
    const reload = () => loadUsage();
    window.addEventListener('siteSettingsUpdated', reload);
    window.addEventListener('menuUpdated', reload);
    window.addEventListener('mediaUpdated', reload);
    return () => {
      window.removeEventListener('siteSettingsUpdated', reload);
      window.removeEventListener('menuUpdated', reload);
      window.removeEventListener('mediaUpdated', reload);
    };
  }, [loadUsage]);

  const counts = useMemo(() => {
    const tally = { hero: 0, menu: 0, other: 0 };
    media.forEach((item) => {
      const cat = normalizeCategory(item.category);
      if (cat === 'hero') tally.hero += 1;
      else if (cat === 'menu') tally.menu += 1;
      else tally.other += 1;
    });
    return tally;
  }, [media]);

  const filteredMedia = useMemo(() => {
    if (activeTab === 'all') return media;
    if (activeTab === 'other') {
      return media.filter((item) => {
        const cat = normalizeCategory(item.category);
        return cat !== 'hero' && cat !== 'menu';
      });
    }
    return media.filter((item) => normalizeCategory(item.category) === activeTab);
  }, [media, activeTab]);

  const resetUploadState = () => {
    if (uploadState.previewUrl) {
      try { URL.revokeObjectURL(uploadState.previewUrl); } catch (e) {}
    }
    setUploadState(defaultUploadState);
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      resetUploadState();
      return;
    }
    setUploadState((prev) => ({
      ...prev,
      file,
      previewUrl: URL.createObjectURL(file),
      progress: 0
    }));
  };

  const uploadMedia = (file, category) => new Promise((resolve, reject) => {
    const xhr = new window.XMLHttpRequest();
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', file.name);
    formData.append('category', category);
    xhr.open('POST', `${API_BASE}/media`);
    const token = window.localStorage.getItem('authToken');
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        setUploadState((prev) => ({
          ...prev,
          progress: Math.round((event.loaded / event.total) * 100)
        }));
      }
    };
    xhr.upload.onload = () => {
      setUploadState((prev) => ({ ...prev, processing: true }));
    };
    xhr.onerror = () => reject(new Error('Upload failed. Please try again.'));
    xhr.onload = () => {
      setUploadState((prev) => ({ ...prev, processing: false }));
      const status = xhr.status;
      let response = {};
      try {
        response = JSON.parse(xhr.responseText || '{}');
      } catch (e) {}
      if (status >= 200 && status < 300) {
        resolve(response);
      } else {
        const message = response?.message || response?.error || 'Upload failed. Please try again.';
        const error = new Error(message);
        error.code = response?.error || null;
        error.status = status;
        error.details = response?.details || null;
        reject(error);
      }
    };
    xhr.send(formData);
  });

  const handleUpload = async () => {
    if (!uploadState.file) return;
    setError('');
    setMessage('');
    setUploadState((prev) => ({ ...prev, uploading: true, processing: false }));
    try {
      await uploadMedia(uploadState.file, uploadCategory);
      setMessage('File uploaded successfully');
      resetUploadState();
      await loadMedia();
      try { window.dispatchEvent(new window.CustomEvent('mediaUpdated')); } catch (e) {}
    } catch (err) {
      if (err?.code === 'file_too_large' || err?.status === 413) {
        const detailBytes =
          Number(err?.details?.max_bytes) ||
          Number(err?.details?.effective_bytes) ||
          Number(err?.details?.env_MAX_UPLOAD_SIZE) ||
          0;
        const humanLabel =
          err?.details?.max_human ||
          err?.details?.effective_human ||
          (detailBytes ? formatBytes(detailBytes) : null);
        const labelText = humanLabel ? ` is ~${humanLabel}` : ' reached';
        setError(`Upload too large. Server limit${labelText}.`);
      } else {
        setError(err?.message || 'Upload failed. Please try again.');
      }
      setUploadState((prev) => ({ ...prev, uploading: false, processing: false }));
      return;
    } finally {
      setUploadState((prev) => ({ ...prev, uploading: false, processing: false }));
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm('Delete this image? This cannot be undone.')) return;
    setError('');
    try {
      const res = await authenticatedFetch(`/media/${item.id}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 404) {
        throw new Error('Delete failed');
      }
      setMessage('Media deleted');
      await loadMedia();
      try { window.dispatchEvent(new window.CustomEvent('mediaUpdated')); } catch (e) {}
    } catch (err) {
      setError('Failed to delete media. Please try again.');
    }
  };

  const openEditModal = (item) => {
    const normalizedCategory = normalizeCategory(item.category);
    setEditMedia(item);
    setEditForm({
      alt_text: item.alt_text || '',
      caption: item.caption || '',
      category: normalizedCategory
    });
  };

  const handleEditSave = async () => {
    if (!editMedia || !editForm) return;
    setSavingEdit(true);
    setError('');
    setMessage('');
    try {
      const res = await authenticatedFetch(`/media/${editMedia.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          alt_text: editForm.alt_text || '',
          caption: editForm.caption || '',
          category: editForm.category
        })
      });
      if (!res.ok) throw new Error('Failed to save changes');
      setEditMedia(null);
      setEditForm(null);
      setMessage('Media updated');
      await loadMedia();
      try { window.dispatchEvent(new window.CustomEvent('mediaUpdated')); } catch (e) {}
    } catch (err) {
      setError(err.message || 'Failed to save changes');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleCopyUrl = (item) => {
    const url = getCopyUrl(item);
    if (!url) {
      setError('File URL unavailable');
      return;
    }
    try {
      navigator.clipboard.writeText(url);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (e) {
      setError('Clipboard copy failed');
    }
  };

  const countForTab = (tab) => {
    if (tab === 'all') return media.length;
    if (tab === 'hero') return counts.hero;
    if (tab === 'menu') return counts.menu;
    return counts.other;
  };

  const getUsageBadges = (mediaId) => {
    const heroInfo = usageMap.hero?.[mediaId];
    const menuInfo = usageMap.menu?.[mediaId] || [];
    return { heroInfo, menuInfo };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-text-primary">Media Manager</h2>
          <p className="text-sm text-text-secondary">Upload, edit, and delete hero/menu images from one place.</p>
        </div>
      </div>

      {message && (
        <div className="bg-success/10 border border-success text-success px-4 py-2 rounded flex items-center gap-2">
          <icons.CheckCircle size={16} />
          <span>{message}</span>
        </div>
      )}
      {error && (
        <div className="bg-error/10 border border-error text-error px-4 py-2 rounded flex items-center gap-2">
          <icons.AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      <section className="bg-surface rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4">Upload New Image</h3>
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-text-primary">Select file</label>
              <div className="flex items-center gap-3 flex-wrap">
                <label className="bg-surface-warm text-text-primary px-4 py-2 rounded cursor-pointer hover:bg-surface transition">
                  <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                  Choose Image
                </label>
                {uploadState.file && <span className="text-sm text-text-secondary truncate">{uploadState.file.name}</span>}
                {uploadState.file && (
                  <button
                    type="button"
                    className="text-xs text-error hover:underline"
                    onClick={resetUploadState}
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-text-primary">Category</label>
              <select
                value={uploadCategory}
                onChange={(e) => setUploadCategory(e.target.value)}
                className="form-select w-full max-w-xs"
              >
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            {uploadState.uploading && (
              <div>
                <div className="flex items-center justify-between text-xs text-text-secondary mb-1">
                  <span>Uploading…</span>
                  <span>{uploadState.progress}%</span>
                </div>
                <div className="h-2 bg-surface rounded">
                  <div
                    className="h-2 bg-primary rounded transition-all"
                    style={{ width: `${uploadState.progress}%` }}
                  />
                </div>
              </div>
            )}

            {uploadState.processing && (
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <Spinner size={16} />
                <span>Processing images…</span>
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                className="media-upload-button"
                onClick={handleUpload}
                disabled={!uploadState.file || uploadState.uploading || uploadState.processing}
              >
                Upload Image
              </button>
            </div>
          </div>

          <div className="w-full lg:w-72 border border-divider rounded-lg overflow-hidden bg-background">
            {uploadState.previewUrl ? (
              <>
                <img src={uploadState.previewUrl} alt="Preview" className="w-full h-40 object-cover" />
                <div className="p-3 text-sm text-text-secondary">Preview of the file to be uploaded.</div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-6 text-center text-text-secondary text-sm">
                <icons.Image size={36} className="mb-2 text-text-muted" />
                No file selected
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="bg-surface rounded-lg shadow">
        <div className="border-b border-divider px-6 pt-4">
          <div className="flex items-center gap-2 overflow-auto pb-2">
            {TAB_CONFIG.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                  activeTab === tab.key
                    ? 'bg-primary text-text-inverse'
                    : 'bg-surface-warm text-text-primary hover:bg-surface'
                }`}
              >
                {tab.label}
                <span className="ml-2 text-xs text-text-secondary">
                  {countForTab(tab.key)}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center gap-2 text-text-secondary">
              <Spinner size={18} />
              <span>Loading media…</span>
            </div>
          ) : filteredMedia.length === 0 ? (
            <div className="text-text-secondary text-sm">
              No media in this category yet. Upload some images to get started.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredMedia.map((item) => {
                const { heroInfo, menuInfo } = getUsageBadges(item.id);
                const menuTooltip = menuInfo && menuInfo.length
                  ? `Used by: ${menuInfo.join(', ')}`
                  : '';
                const variantSummary = describeVariantSummary(item);
                return (
                <div key={item.id} className="border border-divider rounded-lg overflow-hidden bg-background flex flex-col">
                  <div className="relative">
                    <img
                      src={getMediaPreviewUrl(item)}
                      alt={item.alt_text || item.title || ''}
                      className="w-full h-40 object-cover"
                      loading="lazy"
                    />
                    <span className="absolute top-2 left-2 text-2xs uppercase text-text-inverse bg-black/60 px-2 py-1 rounded-full">
                      {CATEGORY_LABELS[normalizeCategory(item.category)]}
                    </span>
                    {(heroInfo || (menuInfo && menuInfo.length)) && (
                      <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
                        {heroInfo && (
                          <span
                            className="text-2xs uppercase tracking-wide bg-primary text-text-inverse px-2 py-1 rounded-full shadow"
                            title="Used in hero slideshow"
                          >
                            Hero #{heroInfo.order}
                          </span>
                        )}
                        {menuInfo && menuInfo.length > 0 && (
                          <span
                            className="text-2xs uppercase tracking-wide bg-black/70 text-text-inverse px-2 py-1 rounded-full shadow cursor-help"
                            title={menuTooltip}
                          >
                            In menu
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="p-4 flex flex-col gap-2 flex-1">
                    <div>
                      <p className="text-sm font-semibold text-text-primary truncate">{item.title || item.file_name}</p>
                      <p className="text-2xs text-text-secondary truncate">{item.file_name}</p>
                    </div>
                    <p className="text-2xs text-text-secondary">Size: {formatBytes(item.file_size)}</p>
                    {variantSummary && (
                      <p className="text-2xs text-text-secondary">{variantSummary}</p>
                    )}
                    {menuInfo && menuInfo.length > 0 && (
                      <p className="text-2xs text-text-secondary truncate" title={menuTooltip}>
                        Used by: {menuInfo.slice(0, 2).join(', ')}{menuInfo.length > 2 ? ` +${menuInfo.length - 2}` : ''}
                      </p>
                    )}
                    <div className="mt-auto flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopyUrl(item)}
                        className="flex-1 text-xs bg-surface-warm hover:bg-surface transition px-2 py-1 rounded flex items-center justify-center gap-1"
                      >
                        {copiedId === item.id ? (
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
                      <button
                        type="button"
                        onClick={() => openEditModal(item)}
                        className="px-2 py-1 rounded bg-surface hover:bg-surface-warm text-xs flex items-center gap-1"
                      >
                        <icons.Edit size={12} />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item)}
                        className="px-2 py-1 rounded bg-error/10 text-error hover:bg-error/20 text-xs flex items-center gap-1"
                      >
                        <icons.Trash2 size={12} />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            </div>
          )}
        </div>
      </section>

      {editMedia && editForm && (
        <div className="modal-backdrop flex items-center justify-center z-50">
          <div className="bg-surface rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-text-primary">Edit Media</h3>
              <button type="button" onClick={() => { setEditMedia(null); setEditForm(null); }} aria-label="Close edit modal">
                <icons.X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-lg overflow-hidden border border-divider">
                <img
                  src={getMediaPreviewUrl(editMedia)}
                  alt={editMedia.alt_text || editMedia.title || ''}
                  className="w-full h-60 object-cover"
                />
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Filename</label>
                  <input
                    type="text"
                    value={editMedia.file_name}
                    readOnly
                    className="form-input w-full bg-surface-warm text-text-secondary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Category</label>
                  <select
                    value={editForm.category}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, category: e.target.value }))}
                    className="form-select w-full"
                  >
                    {CATEGORY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Alt Text</label>
                  <input
                    type="text"
                    value={editForm.alt_text}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, alt_text: e.target.value }))}
                    className="form-input w-full"
                  />
                  <p className="text-2xs text-text-secondary mt-1">Used for accessibility and SEO.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Caption</label>
                  <textarea
                    value={editForm.caption}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, caption: e.target.value }))}
                    className="form-input w-full"
                    rows={3}
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={() => { setEditMedia(null); setEditForm(null); }}
                className="px-4 py-2 rounded bg-surface-warm hover:bg-surface transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleEditSave}
                className="px-4 py-2 rounded bg-primary text-text-inverse hover:bg-primary-dark transition disabled:opacity-60"
                disabled={savingEdit}
              >
                {savingEdit ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
