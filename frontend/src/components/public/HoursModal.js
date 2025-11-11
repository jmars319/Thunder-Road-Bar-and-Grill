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
        // Data may include multiple areas (e.g., 'kitchen', 'bar'). Group by area for display.
        const rows = Array.isArray(data) ? data : [];
        const grouped = rows.reduce((acc, r) => {
          const area = r.area || 'kitchen';
          acc[area] = acc[area] || [];
          acc[area].push(r);
          return acc;
        }, {});
        setHours(grouped);
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
            <div className="space-y-6">
              {Object.keys(hours).length === 0 && <div className="text-text-muted">No hours available</div>}
              {Object.entries(hours).map(([area, list]) => (
                <div 
                  key={area} 
                  className={`rounded-lg p-4 border-2 ${
                    area === 'kitchen' 
                      ? 'bg-amber-50 border-amber-300 dark:bg-amber-900/20 dark:border-amber-700' 
                      : 'bg-blue-50 border-blue-300 dark:bg-blue-900/20 dark:border-blue-700'
                  }`}
                >
                  <h4 className={`font-heading text-lg font-bold mb-3 flex items-center gap-2 ${
                    area === 'kitchen'
                      ? 'text-amber-800 dark:text-amber-300'
                      : 'text-blue-800 dark:text-blue-300'
                  }`}>
                    {area === 'kitchen' ? (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                        </svg>
                        Kitchen Hours
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        {area.charAt(0).toUpperCase() + area.slice(1)} Hours
                      </>
                    )}
                  </h4>
                  <ul className="space-y-2">
                    {list.map(h => (
                      <li key={h.id} className="flex justify-between items-center py-1 border-b border-current/10 last:border-0">
                        <span className="font-semibold text-text-primary">{h.day_of_week}</span>
                        <span className={`font-medium ${h.is_closed ? 'text-red-600 dark:text-red-400' : 'text-text-secondary'}`}>
                          {h.is_closed ? 'Closed' : `${h.opening_time?.slice(0,5)} - ${h.closing_time?.slice(0,5)}`}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 text-right">
          <button onClick={onClose} className="inline-flex items-center gap-2 bg-primary text-text-inverse py-2 px-4 rounded hover:bg-primary-dark">Close</button>
        </div>
      </div>
    </div>
  );
}
