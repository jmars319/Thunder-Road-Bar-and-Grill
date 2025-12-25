/*
  ReservationsModule

  Purpose:
  - Admin interface for reviewing and updating reservation statuses.

  Contract:
  - Rendered in admin shell. Expects GET /api/reservations and PUT /api/reservations/:id
    for status updates.

  Notes:
  - Designed for simple status workflow; consider server-side pagination when lists grow.
*/
import { useEffect, useState, useCallback } from 'react';
import { icons } from '../../icons';
import { authenticatedFetch } from '../../utils/api';

/*
  ReservationsModule

  Purpose:
  - Admin interface for reviewing and updating reservation statuses.

  API expectations:
  - GET /api/reservations -> [ { id, name, phone, email, reservation_date, reservation_time, number_of_guests, status, special_requests }, ... ]
  - PUT /api/reservations/:id { status }

  Notes:
  - Deletion is intentionally omitted. Use status updates to manage lifecycle.
  - Consider server-side pagination if the reservations list grows large.
*/

  // Developer notes:
  // - UI uses semantic Tailwind tokens (bg-surface, bg-warning, text-text-inverse, etc.).
  // - Icons are re-exported from `src/icons` to keep import surface consistent.
  // - If icons appear unused during linting in some build setups, keep a module-scope no-op: `void Calendar;` (below).

  // Icons are referenced via the centralized `icons` map so linters pick up usage.

  // Last updated: 2025-10-21 — doc sweep: clarified status lifecycle and pagination recommendations.


function ReservationsModule() {
  const [reservations, setReservations] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [perPage] = useState(25);
  const [sortBy, setSortBy] = useState('reservation_date');
  const [sortDir, setSortDir] = useState('DESC');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [loading, setLoading] = useState(false);
  const [viewReservation, setViewReservation] = useState(null);

  const fetchReservations = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      per_page: String(perPage),
      sort_by: sortBy,
      sort_dir: sortDir,
      status: statusFilter
    });
    try {
      const res = await authenticatedFetch(`/reservations?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setReservations(Array.isArray(data.data) ? data.data : []);
        setTotal(typeof data.total === 'number' ? data.total : 0);
      } else {
        setReservations([]);
        setTotal(0);
      }
    } catch {
      setReservations([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, perPage, sortBy, sortDir, statusFilter]);

  useEffect(() => {
    fetchReservations();
  }, [fetchReservations]);

  const updateStatus = async (id, status) => {
    await authenticatedFetch(`/reservations/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
    fetchReservations();
  };

  const deleteReservation = async (id) => {
    if (!window.confirm('Permanently delete this reservation?')) return;
    await authenticatedFetch(`/reservations/${id}`, { method: 'DELETE' });
    fetchReservations();
  };

  const changeSort = (column) => {
    if (sortBy === column) {
      setSortDir(prev => (prev === 'ASC' ? 'DESC' : 'ASC'));
    } else {
      setSortBy(column);
      setSortDir('ASC');
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-warning text-text-inverse';
      case 'confirmed':
        return 'bg-success text-text-inverse';
      case 'cancelled':
        return 'bg-error text-text-inverse';
      case 'completed':
        return 'bg-surface text-text-primary';
      case 'archived':
        return 'bg-surface-warm text-text-secondary';
      default:
        return 'bg-surface text-text-primary';
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {['pending', 'confirmed', 'cancelled', 'completed', 'archived', 'all'].map(status => (
          <button
            key={status}
            onClick={() => { setPage(1); setStatusFilter(status); }}
            className={`px-3 py-1.5 rounded-full text-sm ${
              statusFilter === status ? 'bg-primary text-text-inverse' : 'bg-surface text-text-primary border border-divider'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      <div className="bg-surface rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-warm border-b border-divider">
              <tr>
                <SortableTh label="Name" sortKey="name" sortBy={sortBy} sortDir={sortDir} onSort={changeSort} />
                <SortableTh label="Contact" sortKey="email" sortBy={sortBy} sortDir={sortDir} onSort={changeSort} />
                <SortableTh label="Date" sortKey="reservation_date" sortBy={sortBy} sortDir={sortDir} onSort={changeSort} />
                <SortableTh label="Time" sortKey="reservation_time" sortBy={sortBy} sortDir={sortDir} onSort={changeSort} />
                <SortableTh label="Guests" sortKey="number_of_guests" sortBy={sortBy} sortDir={sortDir} onSort={changeSort} />
                <SortableTh label="Status" sortKey="status" sortBy={sortBy} sortDir={sortDir} onSort={changeSort} />
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-divider">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-text-secondary">Loading reservations…</td>
                </tr>
              ) : reservations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-text-secondary">No reservations.</td>
                </tr>
              ) : (
                reservations.map(res => (
                  <tr key={res.id} className="hover:bg-surface-warm/60">
                    <td className="px-4 py-3">
                      <div className="font-medium text-text-primary">{res.name}</div>
                      {res.special_requests && <div className="text-xs text-text-secondary mt-1">{res.special_requests}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs text-text-secondary">{res.phone}</div>
                      {res.email && <div className="text-xs text-text-secondary">{res.email}</div>}
                    </td>
                    <td className="px-4 py-3">{res.reservation_date ? new Date(res.reservation_date).toLocaleDateString() : ''}</td>
                    <td className="px-4 py-3">{res.reservation_time || ''}</td>
                    <td className="px-4 py-3">{res.number_of_guests}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusClass(res.status)}`}>{res.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setViewReservation(res)}
                          className="px-3 py-1 rounded-full text-xs bg-surface text-text-primary border border-divider"
                        >
                          View
                        </button>
                        {res.status === 'pending' && (
                          <button type="button" onClick={() => updateStatus(res.id, 'confirmed')} className="px-3 py-1 rounded-full text-xs font-medium bg-success text-text-inverse">Confirm</button>
                        )}
                        {res.status === 'confirmed' && (
                          <button type="button" onClick={() => updateStatus(res.id, 'completed')} className="px-3 py-1 rounded-full text-xs font-medium bg-primary text-text-inverse">Complete</button>
                        )}
                        {res.status !== 'archived' && (
                          <button type="button" onClick={() => updateStatus(res.id, 'archived')} className="px-3 py-1 rounded-full text-xs font-medium bg-surface text-text-primary border border-divider">Archive</button>
                        )}
                        {res.status !== 'cancelled' && (
                          <button type="button" onClick={() => updateStatus(res.id, 'cancelled')} className="px-3 py-1 rounded-full text-xs font-medium bg-error text-text-inverse">Cancel</button>
                        )}
                        <button type="button" onClick={() => deleteReservation(res.id)} className="px-3 py-1 rounded-full text-xs font-medium bg-error/80 text-text-inverse flex items-center gap-1">
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
      {viewReservation && (
        <div className="modal-backdrop flex items-center justify-center z-50">
          <div className="bg-surface rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-text-primary">{viewReservation.name}</h3>
                <p className="text-sm text-text-secondary">{viewReservation.email || 'No email'} · {viewReservation.phone || 'No phone'}</p>
              </div>
              <button type="button" onClick={() => setViewReservation(null)} aria-label="Close" className="text-text-secondary hover:text-text-primary">
                <icons.X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-text-primary mb-4">
              <DetailRow label="Date" value={viewReservation.reservation_date ? new Date(viewReservation.reservation_date).toLocaleDateString() : '—'} />
              <DetailRow label="Time" value={viewReservation.reservation_time || '—'} />
              <DetailRow label="Guests" value={viewReservation.number_of_guests || '—'} />
              <DetailRow label="Status" value={viewReservation.status} />
            </div>
            {viewReservation.special_requests && (
              <div className="mb-4">
                <p className="text-xs uppercase text-text-secondary tracking-wide mb-1">Special requests</p>
                <p className="text-sm text-text-primary whitespace-pre-line bg-surface-warm rounded-lg p-3 border border-divider">
                  {viewReservation.special_requests}
                </p>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => { updateStatus(viewReservation.id, 'confirmed'); setViewReservation(null); }} className="px-3 py-1 rounded-full text-xs font-medium bg-success text-text-inverse">Confirm</button>
              <button type="button" onClick={() => { updateStatus(viewReservation.id, 'completed'); setViewReservation(null); }} className="px-3 py-1 rounded-full text-xs font-medium bg-primary text-text-inverse">Complete</button>
              <button type="button" onClick={() => { updateStatus(viewReservation.id, 'cancelled'); setViewReservation(null); }} className="px-3 py-1 rounded-full text-xs font-medium bg-error text-text-inverse">Cancel</button>
              <button type="button" onClick={() => { updateStatus(viewReservation.id, 'archived'); setViewReservation(null); }} className="px-3 py-1 rounded-full text-xs font-medium bg-surface text-text-primary border border-divider">Archive</button>
            </div>
          </div>
        </div>
      )}
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

function DetailRow({ label, value }) {
  return (
    <div className="border border-divider rounded-lg p-3">
      <p className="text-2xs uppercase text-text-secondary tracking-wide mb-1">{label}</p>
      <p>{value || '—'}</p>
    </div>
  );
}

const Module = {
  component: ReservationsModule,
  name: 'Reservations',
  icon: icons.Calendar
};

export default Module;
