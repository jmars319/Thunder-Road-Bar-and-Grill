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
import { useState, useEffect } from 'react';
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
  const [filter, setFilter] = useState('pending');

  useEffect(() => {
    fetchReservations();
  }, []);

  const fetchReservations = () => {
    authenticatedFetch('/reservations')
      .then(res => res.json())
      .then(data => setReservations(Array.isArray(data) ? data : []))
      .catch(() => setReservations([]));
  };

  const updateStatus = (id, status) => {
    authenticatedFetch(`/reservations/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    }).then(() => fetchReservations()).catch(() => {});
  };

  const deleteReservation = (id) => {
    if (!window.confirm('Permanently delete this reservation?')) return;
    authenticatedFetch(`/reservations/${id}`, {
      method: 'DELETE'
    })
      .then(res => {
        if (!res.ok) {
          console.error('Delete failed with status:', res.status);
          return res.json().then(err => {
            alert(`Failed to delete: ${err.error || err.message || 'Unknown error'}`);
          }).catch(() => {
            alert('Failed to delete reservation');
          });
        }
        return fetchReservations();
      })
      .catch(err => {
        console.error('Delete error:', err);
        alert('Network error while deleting reservation');
      });
  };

  const filteredReservations = filter === 'all' 
    ? reservations 
    : reservations.filter(r => r.status === filter);

  const getStatusColor = (status) => {
    switch(status) {
  case 'pending': return 'bg-warning text-text-inverse';
      case 'confirmed': return 'bg-success text-text-inverse';
      case 'cancelled': return 'bg-error text-text-inverse';
      case 'completed': return 'bg-surface text-text-primary';
      default: return 'bg-surface text-text-primary';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        {['pending', 'confirmed', 'cancelled', 'completed', 'all'].map(status => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg font-medium ${
              filter === status 
                ? 'bg-primary text-text-inverse' 
                : 'bg-surface text-text-inverse hover:bg-surface-warm'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      <div className="bg-surface rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-surface-warm border-b border-divider">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-primary uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-primary uppercase">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-primary uppercase">Date & Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-primary uppercase">Guests</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-primary uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-primary uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredReservations.map(res => (
                <tr key={res.id} className="hover:bg-surface-warm">
                  <td className="px-6 py-4">
                    <div className="font-medium text-text-primary">{res.name}</div>
                      {res.special_requests && (
                        <div className="text-sm text-text-secondary mt-1">{res.special_requests}</div>
                      )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-text-secondary">{res.phone}</div>
                    {res.email && <div className="text-sm text-text-secondary">{res.email}</div>}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-text-secondary">{res.reservation_date ? new Date(res.reservation_date).toLocaleDateString() : ''}</div>
                    <div className="text-sm text-text-secondary">{res.reservation_time}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-text-secondary">{res.number_of_guests}</td>
                  <td className="px-6 py-4">
                    <span aria-label={`status: ${res.status}`} className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(res.status)}`}>
                      {res.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      {res.status === 'pending' && (
                        <button
                          onClick={() => updateStatus(res.id, 'confirmed')}
                          className="text-success hover:bg-surface-warm p-2 rounded"
                          title="Confirm"
                        >
                          <icons.CheckCircle size={18} />
                        </button>
                      )}
                      {res.status !== 'cancelled' && (
                        <button
                          onClick={() => updateStatus(res.id, 'cancelled')}
                          className="text-error hover:bg-surface-warm p-2 rounded"
                          title="Cancel"
                        >
                          <icons.XCircle size={18} />
                        </button>
                      )}
                      {res.status === 'confirmed' && (
                        <button
                          onClick={() => updateStatus(res.id, 'completed')}
                          className="text-primary hover:bg-surface-warm p-2 rounded"
                          title="Mark Complete"
                        >
                          <icons.Clock size={18} />
                        </button>
                      )}
                      {(res.status === 'completed' || res.status === 'cancelled') && (
                        <button
                          onClick={() => deleteReservation(res.id)}
                          className="text-error hover:bg-surface-warm p-2 rounded"
                          title="Permanently Delete"
                        >
                          <icons.Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const Module = {
  component: ReservationsModule,
  name: 'Reservations',
  icon: icons.Calendar
};

export default Module;
