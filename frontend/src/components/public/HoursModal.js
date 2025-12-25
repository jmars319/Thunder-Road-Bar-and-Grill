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

import { useEffect, useState, useRef } from 'react';
import { getApiUrl } from '../../config/api';

export default function HoursModal({ onClose }) {
  const [hours, setHours] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const modalRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    fetch(getApiUrl('/business-hours'))
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

  // Accessibility: improved focus management and keyboard handling
  useEffect(() => {
    const el = modalRef.current;
    if (!el) return;

    // remember previously focused element to restore on close
  const previous = (document.activeElement && typeof document.activeElement.focus === 'function') ? document.activeElement : null;
    // move focus into the dialog
    el.focus();

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'Tab') {
        // recompute focusable elements each time (handles dynamic content)
  const focusable = Array.from(el.querySelectorAll('a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])')).filter((n) => typeof n.focus === 'function');
        if (!focusable.length) {
          // if nothing focusable, keep focus on the dialog container
          e.preventDefault();
          el.focus();
          return;
        }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      // restore focus to the previous element if possible
      try {
        if (previous && typeof previous.focus === 'function') previous.focus();
      } catch (err) {
        // ignore
      }
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="hours-modal-title"
        aria-describedby="hours-modal-desc"
        tabIndex={-1}
        className="relative bg-surface text-text-primary rounded-lg shadow-lg max-w-3xl w-full p-4"
      >
        <div className="flex items-start justify-between mb-3">
          <h3 id="hours-modal-title" className="text-lg font-heading font-semibold">Hours</h3>
          <button onClick={onClose} aria-label="Close" className="text-text-muted hover:text-text-primary">✕</button>
        </div>
        <div id="hours-modal-desc" className="sr-only">This modal displays business hours for kitchen and bar. Press Escape to close.</div>

        <div className="min-h-[6rem]">
          {loading && <div className="text-text-muted">Loading...</div>}
          {error && <div className="text-red-500">{error}</div>}

          {!loading && !error && (
            <div>
              {Object.keys(hours).length === 0 && <div className="text-text-muted">No hours available</div>}

              {/* Responsive two-column layout: stacked on small screens, side-by-side on md+ */}
              <div className="relative">
                {/* subtle vertical divider on md+ screens */}
                <div className="hidden md:block absolute inset-y-0 left-1/2 w-px bg-current/10 transform -translate-x-0.5" aria-hidden="true" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {(() => {
                  // Ensure a predictable left/right layout: kitchen left, bar right when present
                  const keys = Object.keys(hours);
                  const ordered = ['kitchen', 'bar', ...keys.filter(k => k !== 'kitchen' && k !== 'bar')];
                  return ordered.map(area => {
                    const list = hours[area] || [];
                    return (
                      <div
                        key={area}
                        className={`rounded-lg p-4 border-2 ${
                          area === 'kitchen'
                            ? 'bg-amber-50 border-amber-300 dark:bg-amber-900/20 dark:border-amber-700'
                            : 'bg-blue-50 border-blue-300 dark:bg-blue-900/20 dark:border-blue-700'
                        }`}
                      >
                        <h4 className={`font-heading text-lg font-bold mb-3 ${
                          area === 'kitchen'
                            ? 'text-amber-800 dark:text-amber-300'
                            : 'text-blue-800 dark:text-blue-300'
                        }`}>
                          {area === 'kitchen' ? 'Kitchen Hours' : (area.charAt(0).toUpperCase() + area.slice(1) + ' Hours')}
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
                    );
                  });
                })()}
                </div>
              </div>
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
