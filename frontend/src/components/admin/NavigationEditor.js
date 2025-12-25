import { useEffect, useState } from 'react';
import { authenticatedFetch } from '../../utils/api';

export default function NavigationEditor() {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [creating, setCreating] = useState({ label: '', url: '', display_order: 0, is_active: 1 });

  useEffect(() => {
    loadLinks();
  }, []);

  const loadLinks = async () => {
    setLoading(true);
    try {
      const res = await authenticatedFetch('/navigation/admin');
      if (res.ok) {
        const data = await res.json();
        setLinks(Array.isArray(data) ? data : []);
      } else {
        setLinks([]);
      }
    } catch {
      setLinks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (id, field, value) => {
    setLinks(prev => prev.map(link => (link.id === id ? { ...link, [field]: value } : link)));
  };

  const saveLink = async (link) => {
    setSavingId(link.id);
    try {
      await authenticatedFetch(`/navigation/${link.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          label: link.label,
          url: link.url,
          display_order: Number(link.display_order) || 0,
          is_active: link.is_active ? 1 : 0
        })
      });
      await loadLinks();
    } catch {
      setSavingId(null);
    } finally {
      setSavingId(null);
    }
  };

  const deleteLink = async (id) => {
    if (!window.confirm('Delete this navigation link?')) return;
    await authenticatedFetch(`/navigation/${id}`, { method: 'DELETE' });
    loadLinks();
  };

  const createLink = async () => {
    if (!creating.label.trim() || !creating.url.trim()) return;
    await authenticatedFetch('/navigation', {
      method: 'POST',
      body: JSON.stringify({
        label: creating.label.trim(),
        url: creating.url.trim(),
        display_order: Number(creating.display_order) || 0,
        is_active: creating.is_active ? 1 : 0
      })
    });
    setCreating({ label: '', url: '', display_order: 0, is_active: 1 });
    loadLinks();
  };

  if (loading) {
    return <div className="text-sm text-text-secondary">Loading navigation…</div>;
  }

  return (
    <div className="space-y-4">
      <table className="w-full text-sm border border-divider rounded">
        <thead className="bg-surface-warm">
          <tr>
            <th className="text-left px-3 py-2 font-medium text-text-secondary">Label</th>
            <th className="text-left px-3 py-2 font-medium text-text-secondary">URL</th>
            <th className="text-left px-3 py-2 font-medium text-text-secondary">Order</th>
            <th className="text-left px-3 py-2 font-medium text-text-secondary">Visible</th>
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody>
          {links.map(link => (
            <tr key={link.id} className="border-t border-divider">
              <td className="px-3 py-2">
                <input
                  type="text"
                  value={link.label || ''}
                  onChange={(e) => handleChange(link.id, 'label', e.target.value)}
                  className="w-full form-input text-sm"
                />
              </td>
              <td className="px-3 py-2">
                <input
                  type="text"
                  value={link.url || ''}
                  onChange={(e) => handleChange(link.id, 'url', e.target.value)}
                  className="w-full form-input text-sm"
                />
              </td>
              <td className="px-3 py-2">
                <input
                  type="number"
                  value={link.display_order ?? 0}
                  onChange={(e) => handleChange(link.id, 'display_order', e.target.value)}
                  className="w-20 form-input text-sm"
                />
              </td>
              <td className="px-3 py-2">
                <input
                  type="checkbox"
                  checked={!!link.is_active}
                  onChange={(e) => handleChange(link.id, 'is_active', e.target.checked ? 1 : 0)}
                />
              </td>
              <td className="px-3 py-2">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => saveLink(link)}
                    className="px-2 py-1 bg-primary text-text-inverse text-xs rounded"
                    disabled={savingId === link.id}
                  >
                    {savingId === link.id ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteLink(link.id)}
                    className="px-2 py-1 bg-error text-text-inverse text-xs rounded"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
          <tr className="border-t border-divider bg-surface-warm/60">
            <td className="px-3 py-2">
              <input
                type="text"
                value={creating.label}
                onChange={(e) => setCreating({ ...creating, label: e.target.value })}
                className="w-full form-input text-sm"
                placeholder="New label"
              />
            </td>
            <td className="px-3 py-2">
              <input
                type="text"
                value={creating.url}
                onChange={(e) => setCreating({ ...creating, url: e.target.value })}
                className="w-full form-input text-sm"
                placeholder="https://..."
              />
            </td>
            <td className="px-3 py-2">
              <input
                type="number"
                value={creating.display_order}
                onChange={(e) => setCreating({ ...creating, display_order: e.target.value })}
                className="w-20 form-input text-sm"
              />
            </td>
            <td className="px-3 py-2">
              <input
                type="checkbox"
                checked={!!creating.is_active}
                onChange={(e) => setCreating({ ...creating, is_active: e.target.checked ? 1 : 0 })}
              />
            </td>
            <td className="px-3 py-2">
              <button
                type="button"
                onClick={createLink}
                className="px-3 py-1 bg-surface text-text-primary text-xs rounded border border-divider"
              >
                Add Link
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
