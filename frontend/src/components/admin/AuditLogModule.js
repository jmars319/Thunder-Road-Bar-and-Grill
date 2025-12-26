import { useEffect, useState, useMemo } from 'react';
import { authenticatedFetch } from '../../utils/api';
import { icons } from '../../icons';

const initialFilters = {
  action: '',
  actor_type: '',
  start_date: '',
  end_date: ''
};

function formatTimestamp(ts) {
  if (!ts) {
    return '';
  }
  try {
    return new Date(ts).toLocaleString();
  } catch (e) {
    return ts;
  }
}

function MetaPreview({ meta }) {
  if (!meta || typeof meta !== 'object' || Object.keys(meta).length === 0) {
    return <span className="text-text-secondary">(no details)</span>;
  }

  const entries = Object.entries(meta).slice(0, 3);
  return (
    <div className="text-xs text-text-secondary">
      {entries.map(([key, value]) => (
        <div key={key}>
          <span className="font-medium text-text-primary">{key}:</span>{' '}
          <span>{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
        </div>
      ))}
      {Object.entries(meta).length > entries.length && (
        <div>…</div>
      )}
    </div>
  );
}

function MetaModal({ entry, onClose }) {
  if (!entry) return null;
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-surface rounded-lg shadow-xl max-w-3xl w-full mx-4">
        <div className="border-b border-divider px-6 py-4 flex items-center justify-between">
          <div>
            <div className="text-sm text-text-secondary">{formatTimestamp(entry.created_at)}</div>
            <div className="text-lg font-heading text-text-primary">{entry.action}</div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-surface-warm text-text-primary" aria-label="Close">
            {icons.X ? <icons.X size={20} /> : null}
          </button>
        </div>
        <div className="px-6 py-4 space-y-3 overflow-auto max-h-[70vh] text-sm">
          <div><strong>Actor:</strong> {entry.actor_type || 'unknown'}{entry.actor_id ? ` (#${entry.actor_id})` : ''}</div>
          {entry.entity_type && (
            <div><strong>Entity:</strong> {entry.entity_type}{entry.entity_id ? ` (#${entry.entity_id})` : ''}</div>
          )}
          {entry.ip && <div><strong>IP:</strong> {entry.ip}</div>}
          {entry.user_agent && <div><strong>User Agent:</strong> {entry.user_agent}</div>}
          <div>
            <strong>Meta JSON:</strong>
            <pre className="mt-2 bg-surface-warm rounded-lg p-3 overflow-auto text-xs">
              {JSON.stringify(entry.meta, null, 2)}
            </pre>
          </div>
        </div>
        <div className="border-t border-divider px-6 py-4 text-right">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-surface text-text-primary border border-divider">Close</button>
        </div>
      </div>
    </div>
  );
}

export default function AuditLogModule() {
  const [filters, setFilters] = useState(initialFilters);
  const [page, setPage] = useState(1);
  const [perPage] = useState(25);
  const [loading, setLoading] = useState(false);
  const [entries, setEntries] = useState([]);
  const [pagination, setPagination] = useState({ total_pages: 1, total: 0 });
  const [viewEntry, setViewEntry] = useState(null);
  const [exporting, setExporting] = useState(false);

  const filterParams = useMemo(() => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('per_page', String(perPage));
    if (filters.action) params.set('action', filters.action);
    if (filters.actor_type) params.set('actor_type', filters.actor_type);
    if (filters.start_date) params.set('start_date', filters.start_date);
    if (filters.end_date) params.set('end_date', filters.end_date);
    return params;
  }, [page, perPage, filters]);

  useEffect(() => {
    let ignore = false;
    const fetchEntries = async () => {
      setLoading(true);
      try {
        const res = await authenticatedFetch(`/audit-log?${filterParams.toString()}`);
        if (res.ok) {
          const data = await res.json();
          if (!ignore) {
            setEntries(Array.isArray(data.data) ? data.data : []);
            setPagination(data.pagination || { total_pages: 1, total: 0 });
          }
        } else if (!ignore) {
          setEntries([]);
          setPagination({ total_pages: 1, total: 0 });
        }
      } catch (err) {
        if (!ignore) {
          setEntries([]);
          setPagination({ total_pages: 1, total: 0 });
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    fetchEntries();
    return () => {
      ignore = true;
    };
  }, [filterParams]);

  const resetFilters = () => {
    setFilters(initialFilters);
    setPage(1);
  };

  const handleExport = async (range, format) => {
    if (exporting) return;
    setExporting(true);
    try {
      const res = await authenticatedFetch(`/audit-log/export?range=${range}&format=${format}`);
      if (!res.ok) {
        return;
      }
      const blob = await res.blob();
      const disposition = res.headers.get('Content-Disposition') || '';
      const match = disposition.match(/filename="?([^";]+)"?/i);
      const name = match ? match[1] : `audit-log-${range}.${format === 'json' ? 'json' : 'txt'}`;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      // swallow; UI already indicates exporting state
    } finally {
      setExporting(false);
    }
  };

  const totalPages = Math.max(1, pagination.total_pages || 1);

  return (
    <div className="space-y-4">
      <div className="bg-surface rounded-lg shadow p-4 space-y-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex flex-col">
            <label className="text-xs text-text-secondary">Action</label>
            <input
              type="text"
              value={filters.action}
              onChange={(e) => { setFilters(prev => ({ ...prev, action: e.target.value })); setPage(1); }}
              className="admin-input"
              placeholder="action key"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-text-secondary">Actor Type</label>
            <select
              value={filters.actor_type}
              onChange={(e) => { setFilters(prev => ({ ...prev, actor_type: e.target.value })); setPage(1); }}
              className="admin-input"
            >
              <option value="">Any</option>
              <option value="admin">Admin</option>
              <option value="public">Public</option>
              <option value="system">System</option>
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-text-secondary">Start date</label>
            <input
              type="date"
              value={filters.start_date}
              onChange={(e) => { setFilters(prev => ({ ...prev, start_date: e.target.value })); setPage(1); }}
              className="admin-input"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-text-secondary">End date</label>
            <input
              type="date"
              value={filters.end_date}
              onChange={(e) => { setFilters(prev => ({ ...prev, end_date: e.target.value })); setPage(1); }}
              className="admin-input"
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={resetFilters} className="px-3 py-2 rounded-lg bg-surface text-text-primary border border-divider">Clear Filters</button>
          <div className="flex flex-wrap gap-2 text-xs text-text-secondary">
            <span className="text-text-primary font-medium">Exports:</span>
            <button
              type="button"
              className="px-3 py-2 rounded-lg bg-surface-warm text-text-primary border border-divider hover:bg-surface"
              onClick={() => handleExport('24h', 'json')}
            >24h JSON</button>
            <button
              type="button"
              className="px-3 py-2 rounded-lg bg-surface-warm text-text-primary border border-divider hover:bg-surface"
              onClick={() => handleExport('24h', 'text')}
            >24h Text</button>
            <button
              type="button"
              className="px-3 py-2 rounded-lg bg-surface-warm text-text-primary border border-divider hover:bg-surface"
              onClick={() => handleExport('7d', 'json')}
            >7d JSON</button>
            <button
              type="button"
              className="px-3 py-2 rounded-lg bg-surface-warm text-text-primary border border-divider hover:bg-surface"
              onClick={() => handleExport('7d', 'text')}
            >7d Text</button>
          </div>
        </div>
      </div>

      <div className="bg-surface rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-warm border-b border-divider">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wide">Timestamp</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wide">Action</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wide">Actor</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wide">Entity</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wide">Meta</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wide">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-divider">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-text-secondary">Loading audit log…</td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-text-secondary">No audit log entries.</td>
                </tr>
              ) : (
                entries.map(entry => (
                  <tr key={entry.id} className="hover:bg-surface-warm/60">
                    <td className="px-4 py-3 whitespace-nowrap">{formatTimestamp(entry.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-text-primary">{entry.action}</div>
                      <div className="text-xs text-text-secondary">ID: {entry.id}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-text-primary">{entry.actor_type || 'unknown'}</div>
                      {entry.actor_id && <div className="text-xs text-text-secondary">#{entry.actor_id}</div>}
                      {entry.ip && <div className="text-xs text-text-secondary">IP {entry.ip}</div>}
                    </td>
                    <td className="px-4 py-3">
                      {entry.entity_type ? (
                        <>
                          <div className="font-medium text-text-primary">{entry.entity_type}</div>
                          {entry.entity_id && <div className="text-xs text-text-secondary">#{entry.entity_id}</div>}
                        </>
                      ) : (
                        <span className="text-text-secondary">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <MetaPreview meta={entry.meta} />
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setViewEntry(entry)}
                        className="px-3 py-1 rounded-full text-xs bg-surface text-text-primary border border-divider"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-divider px-4 py-3 flex items-center justify-between text-sm">
          <div>Page {page} of {totalPages} (Total {pagination.total || 0})</div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage(prev => Math.max(1, prev - 1))}
              className={`px-3 py-1 rounded-lg border border-divider ${page <= 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
              className={`px-3 py-1 rounded-lg border border-divider ${page >= totalPages ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <MetaModal entry={viewEntry} onClose={() => setViewEntry(null)} />
    </div>
  );
}
