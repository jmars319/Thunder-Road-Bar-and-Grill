/*
  Purpose:
  - Render the site footer using content from the backend (footer columns).

  Contract:
  - Expects GET /api/footer-columns returning columns with `links` arrays.

  Notes:
  - Links are plain anchors to keep the footer router-agnostic. Adapt the data
    shape here if the backend changes rather than changing callers.
*/

import React, { useEffect, useState } from 'react';
import cachedFetch, { clearCacheFor } from '../../lib/cachedFetch';

const HoursModal = React.lazy(() => import('./HoursModal'));
const PrivacyModal = React.lazy(() => import('./PrivacyModal'));
const TermsModal = React.lazy(() => import('./TermsModal'));
const ContactModal = React.lazy(() => import('./ContactModal'));
// ensure lazy imports are recognized by some static analyzers as used
void HoursModal; void PrivacyModal; void TermsModal; void ContactModal;

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:5001/api';

export default function PublicFooter({ onGoToAdmin }) {
  // NOTE: Footer uses token classes (`bg-surface`, `text-text-inverse`,
  // `text-text-muted`) so it responds to runtime theme changes. Prefer token
  // updates in `custom-styles.css` when refining color styles.
  const [columns, setColumns] = useState([]);
  const [showHours, setShowHours] = useState(false);
  const [siteSettings, setSiteSettings] = useState(null);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showContact, setShowContact] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const cols = await cachedFetch(`${API_BASE}/footer-columns`);
        setColumns(Array.isArray(cols) ? cols : []);
      } catch (e) {
        setColumns([]);
      }

      try {
        const s = await cachedFetch(`${API_BASE}/site-settings`);
        setSiteSettings(s || {});
      } catch (e) {
        setSiteSettings({});
      }
    })();

    const handler = () => {
      clearCacheFor(`${API_BASE}/site-settings`);
      clearCacheFor(`${API_BASE}/footer-columns`);
      cachedFetch(`${API_BASE}/site-settings`).then(s => setSiteSettings(s || {}));
      cachedFetch(`${API_BASE}/footer-columns`).then(cols => setColumns(Array.isArray(cols) ? cols : []));
    };

    window.addEventListener('siteSettingsUpdated', handler);
    return () => window.removeEventListener('siteSettingsUpdated', handler);
  }, []);

  return (
    <footer className="bg-surface-dark text-text-inverse py-8" role="contentinfo" aria-label="Site footer">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row md:items-start md:justify-between gap-8">
        {/* Left group: API columns + compact contact */}
  <div className="flex flex-col md:flex-row md:items-start md:gap-8 w-full md:w-auto md:-ml-6 lg:-ml-12 xl:-ml-16">
          <div className="flex gap-8">
            {columns
              .filter(col => !/(quick links|legal)/i.test(String(col.column_title || '')))
              .slice(0, 2)
              .map(col => (
                <div key={col.id}>
                  <h4 className="text-sm font-heading font-semibold mb-2 text-text-primary">{col.column_title}</h4>
                  <ul className="space-y-0.5">
                    {Array.isArray(col.links) && col.links.map(link => (
                      <li key={link.id}>
                        {link.url === '#privacy' ? (
                          <button
                            type="button"
                            onClick={() => setShowPrivacy(true)}
                            className="text-text-muted hover:text-text-primary transition text-xs leading-tight tracking-tight"
                          >
                            {link.label}
                          </button>
                        ) : link.url === '#terms' ? (
                          <button
                            type="button"
                            onClick={() => setShowTerms(true)}
                            className="text-text-muted hover:text-text-primary transition text-xs leading-tight tracking-tight"
                          >
                            {link.label}
                          </button>
                        ) : (
                          <a href={link.url} className="text-text-muted hover:text-text-primary transition text-xs leading-tight tracking-tight">{link.label}</a>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
            ))}
          </div>

          {/* compact center contact - stays to left group so right group stays flush right */}
          <div className="flex flex-col items-start md:items-start ml-4">
            <div className="mb-1 text-xs text-text-secondary">© {new Date().getFullYear()} {siteSettings?.business_name || 'Thunder Road Bar and Grill'}</div>
            <div className="flex flex-col items-start gap-1">
              {siteSettings?.phone && (
                <a href={`tel:${siteSettings.phone}`} className="text-text-muted hover:text-text-primary text-xs leading-tight">{siteSettings.phone}</a>
              )}

              {siteSettings?.email && (
                <a href={`mailto:${siteSettings.email}`} className="text-text-muted hover:text-text-primary text-xs leading-tight">{siteSettings.email}</a>
              )}

              {siteSettings?.address && (
                <span className="text-text-muted text-xs">{siteSettings.address}</span>
              )}

              <div className="flex items-center gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setShowContact(true)}
                  className="text-text-muted hover:text-text-primary underline text-xs"
                  aria-haspopup="dialog"
                >
                  Contact
                </button>

                <button
                  type="button"
                  onClick={() => setShowHours(true)}
                  className="text-text-muted hover:text-text-primary underline text-xs"
                  aria-haspopup="dialog"
                >
                  Hours
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right group: Quick Links + Legal/Admin as two columns on md+ */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-end gap-6 md:gap-12">
          {/* Quick Links column */}
          <div className="md:text-left">
            <h4 className="text-sm font-heading font-semibold mb-1 text-text-primary">Quick Links</h4>
            <ul className="space-y-0.5">
              <li><a href="#menu" className="text-text-muted hover:text-text-primary text-xs leading-tight tracking-tight">Menu</a></li>
              <li><a href="#about" className="text-text-muted hover:text-text-primary text-xs leading-tight tracking-tight">About</a></li>
              <li><a href="#reservations" className="text-text-muted hover:text-text-primary text-xs leading-tight tracking-tight">Reservations</a></li>
              <li><a href="#jobs" className="text-text-muted hover:text-text-primary text-xs leading-tight tracking-tight">Careers</a></li>
            </ul>
          </div>

          {/* Legal + Admin column */}
          <div className="md:text-right">
            <h4 className="text-sm font-heading font-semibold mb-1 text-text-primary">Legal</h4>
            <ul className="space-y-0.5">
              <li>
                <button
                  type="button"
                  onClick={() => setShowPrivacy(true)}
                  className="text-text-muted hover:text-text-primary transition text-xs leading-tight tracking-tight"
                >
                  Privacy Policy
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setShowTerms(true)}
                  className="text-text-muted hover:text-text-primary transition text-xs leading-tight tracking-tight"
                >
                  Terms &amp; Conditions
                </button>
              </li>
            </ul>

            <div className="border-t border-divider mt-3 pt-2">
              <a
                href="/admin"
                onClick={(e) => {
                  try {
                    e.preventDefault();
                    if (typeof onGoToAdmin === 'function') {
                      onGoToAdmin();
                    } else {
                      window.location.href = '/admin';
                    }
                  } catch (err) {
                    window.location.href = '/admin';
                  }
                }}
                className="text-text-muted hover:text-text-primary text-xs leading-tight tracking-tight"
              >
                Admin
              </a>
            </div>
          </div>
        </div>
      </div>

      {showHours && (
        <React.Suspense fallback={<div aria-hidden className="fixed inset-0 z-40 flex items-center justify-center"><div className="bg-black/40" /></div>}>
          <HoursModal onClose={() => setShowHours(false)} />
        </React.Suspense>
      )}

      {showContact && (
        <React.Suspense fallback={<div aria-hidden className="fixed inset-0 z-40 flex items-center justify-center"><div className="bg-black/40" /></div>}>
          <ContactModal onClose={() => setShowContact(false)} />
        </React.Suspense>
      )}

      {showPrivacy && (
        <React.Suspense fallback={<div aria-hidden className="fixed inset-0 z-40 flex items-center justify-center"><div className="bg-black/40" /></div>}>
          <PrivacyModal onClose={() => setShowPrivacy(false)} />
        </React.Suspense>
      )}

      {showTerms && (
        <React.Suspense fallback={<div aria-hidden className="fixed inset-0 z-40 flex items-center justify-center"><div className="bg-black/40" /></div>}>
          <TermsModal onClose={() => setShowTerms(false)} />
        </React.Suspense>
      )}
    </footer>
  );
}
