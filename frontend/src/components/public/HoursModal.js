/*
  HoursModal

  Purpose:
  - Fetch and display the business hours in a simple modal.

  Contract:
  - Props: { onClose: function }

  Notes:
  - This component performs a single GET to /api/business-hours and
    renders the result. Keep the UI minimal to avoid large legal or policy
    text inside this modal.
*/

import { useEffect, useState } from 'react';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:5001/api';

export default function HoursModal({ onClose }) {
  const [hours, setHours] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    fetch(`${API_BASE}/business-hours`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to load hours');
        return res.json();
      })
      .then(data => {
        if (!mounted) return;
        setHours(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        if (!mounted) return;
        setError(err.message || 'Error');
        setLoading(false);
      });

    return () => { mounted = false; };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative bg-surface text-text-primary rounded-lg shadow-lg max-w-md w-full p-4">
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-lg font-heading font-semibold">Hours</h3>
          <button onClick={onClose} aria-label="Close" className="text-text-muted hover:text-text-primary">✕</button>
        </div>

        <div className="min-h-[6rem]">
          {loading && <div className="text-text-muted">Loading...</div>}
          {error && <div className="text-red-500">{error}</div>}

          {!loading && !error && (
            <ul className="space-y-1">
              {hours.length === 0 && <li className="text-text-muted">No hours available</li>}
              {hours.map(h => (
                <li key={h.id} className="flex justify-between">
                  <span className="font-medium">{h.day_of_week}</span>
                  <span className="text-text-muted">
                    {h.is_closed ? 'Closed' : `${h.opening_time?.slice(0,5)} - ${h.closing_time?.slice(0,5)}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-6 text-right">
          <button onClick={onClose} className="inline-flex items-center gap-2 bg-primary text-text-inverse py-2 px-4 rounded hover:bg-primary-dark">Close</button>
        </div>
      </div>
    </div>
  );
}
