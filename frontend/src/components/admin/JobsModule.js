import { useEffect, useState, useCallback, useMemo } from 'react';
import { icons } from '../../icons';
import { authenticatedFetch } from '../../utils/api';

const STATUS_OPTIONS = ['new', 'reviewing', 'interviewed', 'hired', 'rejected', 'archived'];
const STATUS_ALIASES = {
  new: ['new', 'pending', 'submitted', 'received', 'unread', 'inbox', '0'],
  reviewing: ['reviewing', 'review', 'in_review'],
  interviewed: ['interviewed', 'interview', 'phone'],
  hired: ['hired', 'accepted'],
  rejected: ['rejected', 'declined', 'denied'],
  archived: ['archived', 'closed', 'withdrawn']
};

export function normalizeJobStatus(input) {
  if (input === undefined || input === null) return 'new';
  const normalized = String(input).trim().toLowerCase();
  if (!normalized) return 'new';
  if (STATUS_OPTIONS.includes(normalized)) return normalized;
  const match = Object.entries(STATUS_ALIASES).find(([, values]) => values.includes(normalized));
  return match ? match[0] : 'new';
}

function JobsModule() {
  const [applications, setApplications] = useState([]);
  const [selectedApp, setSelectedApp] = useState(null);
  const [positions, setPositions] = useState([]);
  const [page, setPage] = useState(1);
  const perPage = 25;
  const [statusFilter, setStatusFilter] = useState('new');
  const [sortBy, setSortBy] = useState('submitted_at');
  const [sortDir, setSortDir] = useState('DESC');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchPositions();
  }, []);

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      per_page: '500',
      status: 'all'
    });
    try {
      const res = await authenticatedFetch(`/jobs?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        const normalized = (Array.isArray(data.data) ? data.data : []).map(app => ({
          ...app,
          normalizedStatus: normalizeJobStatus(app.status)
        }));
        setApplications(normalized);
      } else {
        setApplications([]);
      }
    } catch {
      setApplications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

useEffect(() => {
  setPage(1);
}, [statusFilter]);

useEffect(() => {
  if (!selectedApp) return;
  const latest = applications.find(app => app.id === selectedApp.id);
  if (latest && latest !== selectedApp) {
    setSelectedApp(latest);
  }
}, [applications, selectedApp]);

  const fetchPositions = async () => {
    try {
      const res = await authenticatedFetch('/job-positions');
      if (res.ok) {
        const data = await res.json();
        setPositions(Array.isArray(data) ? data : []);
      } else {
        setPositions([]);
      }
    } catch {
      setPositions([]);
    }
  };

  const togglePosition = async (position) => {
    setPositions(prev => prev.map(p => (p.id === position.id ? { ...p, is_active: !p.is_active } : p)));
    await authenticatedFetch(`/job-positions/${position.id}`, {
      method: 'PUT',
      body: JSON.stringify({ is_active: !position.is_active })
    }).catch(fetchPositions);
  };

  const deletePosition = async (id) => {
    if (!window.confirm('Delete this position?')) return;
    await authenticatedFetch(`/job-positions/${id}`, { method: 'DELETE' });
    fetchPositions();
  };

  const applyStatusLocally = (id, status) => {
    const normalized = normalizeJobStatus(status);
    setApplications(prev => prev.map(app => (app.id === id ? { ...app, status, normalizedStatus: normalized } : app)));
    setSelectedApp(prev => (prev && prev.id === id ? { ...prev, status, normalizedStatus: normalized } : prev));
  };

  const updateStatus = async (id, status) => {
    const canonical = normalizeJobStatus(status);
    await authenticatedFetch(`/jobs/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status: canonical })
    });
    applyStatusLocally(id, canonical);
  };

  const deleteApplication = async (id) => {
    if (!window.confirm('Delete this application?')) return;
    await authenticatedFetch(`/jobs/${id}`, { method: 'DELETE' });
    setApplications(prev => prev.filter(app => app.id !== id));
    setSelectedApp(current => (current?.id === id ? null : current));
  };

  const changeSort = (column) => {
    if (sortBy === column) {
      setSortDir(prev => (prev === 'ASC' ? 'DESC' : 'ASC'));
    } else {
      setSortBy(column);
      setSortDir('ASC');
    }
  };

  const sortApplications = useCallback((list) => {
    const sorted = [...list];
    sorted.sort((a, b) => {
      const dir = sortDir === 'ASC' ? 1 : -1;
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name) * dir;
      }
      if (sortBy === 'position') {
        return (a.position || '').localeCompare(b.position || '') * dir;
      }
      if (sortBy === 'status') {
        return a.normalizedStatus.localeCompare(b.normalizedStatus) * dir;
      }
      const aDate = a.submitted_at ? new Date(a.submitted_at).getTime() : 0;
      const bDate = b.submitted_at ? new Date(b.submitted_at).getTime() : 0;
      return (aDate - bDate) * dir;
    });
    return sorted;
  }, [sortBy, sortDir]);

  const filteredApplications = useMemo(() => {
    if (statusFilter === 'all') return applications;
    return applications.filter(app => app.normalizedStatus === statusFilter);
  }, [applications, statusFilter]);

  const sortedApplications = useMemo(() => sortApplications(filteredApplications), [filteredApplications, sortApplications]);
  const totalFiltered = sortedApplications.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / perPage));
  const pagedApplications = sortedApplications.slice((page - 1) * perPage, page * perPage);

  const selectedAppStatus = selectedApp ? (selectedApp.normalizedStatus || normalizeJobStatus(selectedApp.status)) : 'new';

  return (
    <div className="space-y-6">
      <div className="bg-surface rounded-lg shadow p-4 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <h3 className="font-semibold text-text-primary">Public Positions</h3>
            <p className="text-xs text-text-secondary">Check a role to display it on the careers page.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {positions.map(p => (
            <label key={p.id} className="flex gap-3 items-start border border-divider rounded-lg p-3 bg-surface-warm/30">
              <input type="checkbox" className="mt-1" checked={!!p.is_active} onChange={() => togglePosition(p)} />
              <div>
                <p className="text-sm font-medium text-text-primary flex items-center gap-2">
                  {p.name}
                  <button type="button" onClick={() => deletePosition(p.id)} className="text-error text-xs hover:underline">Remove</button>
                </p>
                {p.description && <p className="text-xs text-text-secondary mt-1">{p.description}</p>}
              </div>
            </label>
          ))}
        </div>
        {positions.length === 0 && (
          <p className="text-sm text-text-secondary">No positions found. Seed data via migrations to populate the list.</p>
        )}
      </div>

      <div className="bg-surface rounded-lg shadow overflow-hidden">
        <div className="flex flex-wrap items-center justify-between p-4 border-b border-divider gap-2 text-xs">
          <div className="flex gap-2 flex-wrap">
            {[...STATUS_OPTIONS, 'all'].map(status => (
              <button
                key={status}
                onClick={() => { setStatusFilter(status); setPage(1); }}
                className={`px-3 py-1 rounded-full ${statusFilter === status ? 'bg-primary text-text-inverse' : 'bg-surface-warm text-text-primary'}`}
              >
                {status}
              </button>
            ))}
          </div>
          <span className="text-text-secondary">Total {totalFiltered}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-warm border-b border-divider">
              <tr>
                <SortableTh label="Name" sortKey="name" sortBy={sortBy} sortDir={sortDir} onSort={changeSort} />
                <SortableTh label="Position" sortKey="position" sortBy={sortBy} sortDir={sortDir} onSort={changeSort} />
                <SortableTh label="Submitted" sortKey="submitted_at" sortBy={sortBy} sortDir={sortDir} onSort={changeSort} />
                <SortableTh label="Status" sortKey="status" sortBy={sortBy} sortDir={sortDir} onSort={changeSort} />
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-divider">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-text-secondary">Loading applications…</td>
                </tr>
              ) : pagedApplications.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-text-secondary">No applications.</td>
                </tr>
              ) : (
                pagedApplications.map(app => (
                  <tr key={app.id} className="hover:bg-surface-warm/60">
                    <td className="px-4 py-3">
                      <button type="button" className="text-left font-medium text-text-primary" onClick={() => setSelectedApp(app)}>{app.name}</button>
                      <div className="text-xs text-text-secondary">{app.email} · {app.phone}</div>
                    </td>
                    <td className="px-4 py-3">{app.position}</td>
                    <td className="px-4 py-3">{app.submitted_at ? new Date(app.submitted_at).toLocaleDateString() : ''}</td>
                    <td className="px-4 py-3 capitalize">{app.normalizedStatus}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedApp(app)}
                          className="px-2 py-1 rounded-full text-xs border border-divider text-text-primary"
                        >
                          View
                        </button>
                        <select
                          className="form-input text-xs"
                          value={app.normalizedStatus}
                          onChange={(e) => updateStatus(app.id, e.target.value)}
                        >
                          {STATUS_OPTIONS.map(option => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                        <button type="button" onClick={() => deleteApplication(app.id)} className="px-2 py-1 rounded-full text-xs bg-error text-text-inverse flex items-center gap-1">
                          <icons.Trash2 size={12} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-divider text-xs text-text-secondary">
          <span>Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <button type="button" className="px-3 py-1 rounded-full border border-divider disabled:opacity-50" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Prev</button>
            <button type="button" className="px-3 py-1 rounded-full border border-divider disabled:opacity-50" disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Next</button>
          </div>
        </div>
      </div>

      {selectedApp && (
        <div className="modal-backdrop flex items-center justify-center z-50">
          <div className="bg-surface rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-text-primary">{selectedApp.name}</h3>
                <p className="text-sm text-text-secondary">{selectedApp.position}</p>
                <p className="text-xs text-text-secondary">{selectedApp.email} · {selectedApp.phone || 'No phone'}</p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => deleteApplication(selectedApp.id)} className="text-error flex items-center gap-1">
                  <icons.Trash2 size={16} /> Delete
                </button>
                <button type="button" onClick={() => setSelectedApp(null)} className="text-text-secondary hover:text-text-primary">
                  <icons.X size={18} />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-text-primary mb-4">
              <DetailBlock title="Status" value={selectedAppStatus} />
              <DetailBlock title="Submitted" value={selectedApp.submitted_at ? new Date(selectedApp.submitted_at).toLocaleDateString() : '—'} />
              <DetailBlock title="Availability" value={selectedApp.availability} />
              <DetailBlock title="Experience" value={selectedApp.experience} />
            </div>
            <DetailBlock title="Cover Letter" value={selectedApp.cover_letter} full />
            {selectedApp.resume_url && (
              <div className="mt-4">
                <h4 className="font-semibold text-text-primary text-sm">Resume / Portfolio</h4>
                <a href={selectedApp.resume_url} target="_blank" rel="noopener noreferrer" className="text-primary underline break-all">
                  {selectedApp.resume_url}
                </a>
              </div>
            )}
            <div className="flex flex-wrap gap-2 mt-4">
              <select
                className="form-input text-xs"
                value={selectedAppStatus}
                onChange={(e) => {
                  const next = e.target.value;
                  updateStatus(selectedApp.id, next);
                  setSelectedApp(prev => (prev ? { ...prev, status: next, normalizedStatus: normalizeJobStatus(next) } : prev));
                }}
              >
                {STATUS_OPTIONS.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailBlock({ title, value, full = false }) {
  return (
    <div className={`border border-divider rounded-lg ${full ? 'p-4 mt-4' : 'p-3'}`}>
      <h4 className="font-semibold text-text-primary text-sm mb-1">{title}</h4>
      <p className="text-text-secondary whitespace-pre-line">{value || 'Not provided'}</p>
    </div>
  );
}

function SortableTh({ label, sortKey, sortBy, sortDir, onSort }) {
  return (
    <th
      className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wide cursor-pointer select-none"
      onClick={() => onSort(sortKey)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {sortBy === sortKey ? (sortDir === 'ASC' ? '▲' : '▼') : null}
      </span>
    </th>
  );
}

const Module = {
  component: JobsModule,
  name: 'Jobs',
  icon: icons.Briefcase
};

export default Module;
