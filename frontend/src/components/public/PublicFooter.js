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
  // DEV: Footer color tokens are the canonical surface/text tokens. If you
  // need to adjust contrast or spacing across the site, change the tokens in
  // `frontend/src/custom-styles.css` so updates apply everywhere consistently.
  const [columns, setColumns] = useState([]);
  const [showHours, setShowHours] = useState(false);
  const [siteSettings, setSiteSettings] = useState(null);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showContact, setShowContact] = useState(false);

  useEffect(() => {
    // Keep fetch resilient: swallow errors and fallback to an empty array so the
    // public site doesn't crash if the API is temporarily unavailable.
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
          // admin updates may include siteSettings updates; clear relevant cache
          clearCacheFor(`${API_BASE}/site-settings`);
          clearCacheFor(`${API_BASE}/footer-columns`);
          // re-trigger a reload of settings
          cachedFetch(`${API_BASE}/site-settings`).then(s => setSiteSettings(s || {}));
          cachedFetch(`${API_BASE}/footer-columns`).then(cols => setColumns(Array.isArray(cols) ? cols : []));
        };

        window.addEventListener('siteSettingsUpdated', handler);
        return () => window.removeEventListener('siteSettingsUpdated', handler);
  }, []);

  return (
    <footer className="bg-surface text-text-inverse py-12" role="contentinfo" aria-label="Site footer">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-8">
        {columns.map(col => (
          <div key={col.id}>
            <h4 className="text-lg font-heading font-semibold mb-3 text-text-primary">{col.column_title}</h4>
            <ul className="space-y-2">
              {Array.isArray(col.links) && col.links.map(link => (
                <li key={link.id}>
                  {link.url === '#privacy' ? (
                    <button
                      type="button"
                      onClick={() => setShowPrivacy(true)}
                      className="text-text-muted hover:text-text-primary transition"
                    >
                      {link.label}
                    </button>
                  ) : link.url === '#terms' ? (
                    <button
                      type="button"
                      onClick={() => setShowTerms(true)}
                      className="text-text-muted hover:text-text-primary transition"
                    >
                      {link.label}
                    </button>
                  ) : (
                    <a href={link.url} className="text-text-muted hover:text-text-primary transition">{link.label}</a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mt-8 text-center text-sm text-text-secondary">
        <div className="mb-2">© {new Date().getFullYear()} {siteSettings?.business_name || 'Thunder Road Bar and Grill'}</div>
        <div className="flex items-center justify-center gap-4">
          {siteSettings?.phone && (
            <a href={`tel:${siteSettings.phone}`} className="text-text-muted hover:text-text-primary text-sm">{siteSettings.phone}</a>
          )}

          {siteSettings?.email && (
            <a href={`mailto:${siteSettings.email}`} className="text-text-muted hover:text-text-primary text-sm">{siteSettings.email}</a>
          )}

          {siteSettings?.address && (
            <span className="text-text-muted text-sm">{siteSettings.address}</span>
          )}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowContact(true)}
              className="text-text-muted hover:text-text-primary underline text-sm"
              aria-haspopup="dialog"
            >
              Contact
            </button>

            <button
              type="button"
              onClick={() => setShowHours(true)}
              className="text-text-muted hover:text-text-primary underline text-sm"
              aria-haspopup="dialog"
            >
              Hours
            </button>
          </div>
          
          {/* unobtrusive admin link moved to footer */}
          <div className="ml-4">
            <a
              href="/admin"
              onClick={(e) => {
                try {
                  e.preventDefault();
                  if (typeof onGoToAdmin === 'function') {
                    onGoToAdmin();
                  } else {
                    // fallback to a full navigation if parent didn't provide handler
                    window.location.href = '/admin';
                  }
                } catch (err) {
                  // if anything goes wrong, fallback to navigation
                  window.location.href = '/admin';
                }
              }}
              className="text-text-muted hover:text-text-primary text-sm"
            >
              Admin
            </a>
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
