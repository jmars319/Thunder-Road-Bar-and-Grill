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
import { ReactComponent as GoogleIcon } from '../../assets/google-g.svg';
import cachedFetch, { clearCacheFor } from '../../lib/cachedFetch';

const HoursModal = React.lazy(() => import('./HoursModal'));
const PrivacyModal = React.lazy(() => import('./PrivacyModal'));
const TermsModal = React.lazy(() => import('./TermsModal'));
const ContactModal = React.lazy(() => import('./ContactModal'));
const OrderModal = React.lazy(() => import('./OrderModal'));
// ensure lazy imports and SVG components are recognized by some static analyzers as used
void HoursModal; void PrivacyModal; void TermsModal; void ContactModal; void OrderModal;
// mark the inline Google SVG component as intentionally used
void GoogleIcon;

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
  const [showOrder, setShowOrder] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const cols = await cachedFetch(`${API_BASE}/footer-columns`);
        setColumns(Array.isArray(cols) ? cols : []);
      } catch (e) {
        setColumns([]);
      }

      try {
        const s = await cachedFetch(`${API_BASE}/settings`);
        setSiteSettings(s?.settings || {});
      } catch (e) {
        setSiteSettings({});
      }
    })();

    const handler = () => {
      clearCacheFor(`${API_BASE}/settings`);
      clearCacheFor(`${API_BASE}/footer-columns`);
      cachedFetch(`${API_BASE}/settings`).then(s => setSiteSettings(s?.settings || {}));
      cachedFetch(`${API_BASE}/footer-columns`).then(cols => setColumns(Array.isArray(cols) ? cols : []));
    };

    window.addEventListener('siteSettingsUpdated', handler);
    return () => window.removeEventListener('siteSettingsUpdated', handler);
  }, []);

  return (
    <footer className="bg-surface-dark text-text-inverse py-6" role="contentinfo" aria-label="Site footer">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row md:items-start md:justify-between gap-6">
        {/* Left group: API columns + compact contact */}
  <div className="flex flex-col md:flex-row md:items-start md:gap-6 w-full md:w-auto md:-ml-6 lg:-ml-12 xl:-ml-16">
          <div className="flex gap-6">
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
                            className="text-text-muted hover:text-text-primary tracking-tight"
                          >
                            {link.label}
                          </button>
                        ) : link.url === '#terms' ? (
                          <button
                            type="button"
                            onClick={() => setShowTerms(true)}
                            className="text-text-muted hover:text-text-primary tracking-tight"
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
            <div className="flex flex-col items-start md:items-start ml-3">
            <div className="mb-1 text-xs text-text-secondary">
              © {new Date().getFullYear()} {siteSettings?.business_name || 'Thunder Road Bar and Grill'} · Powered by{' '}
              <a 
                href="https://jamarq.digital" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-text-muted hover:text-text-primary underline"
              >
                JAMARQ
              </a>
            </div>
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
              {/* Social links (Instagram, Facebook) */}
              <div className="flex items-center gap-3 mt-2">
                {(
                  siteSettings?.instagram || siteSettings?.instagram_url || siteSettings?.social?.instagram
                ) ? (
                  <a
                    href={siteSettings?.instagram || siteSettings?.instagram_url || siteSettings?.social?.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Thunder Road on Instagram"
                    className="text-text-muted hover:text-text-primary transition"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="inline-block">
                      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                    </svg>
                  </a>
                ) : (
                  <a
                    href="https://www.instagram.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Instagram"
                    className="text-text-muted hover:text-text-primary transition"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="inline-block">
                      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                    </svg>
                  </a>
                )}

                {(
                  siteSettings?.facebook || siteSettings?.facebook_url || siteSettings?.social?.facebook
                ) ? (
                  <a
                    href={siteSettings?.facebook || siteSettings?.facebook_url || siteSettings?.social?.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Thunder Road on Facebook"
                    className="text-text-muted hover:text-text-primary transition"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="inline-block">
                      <path d="M18 2h-3a4 4 0 0 0-4 4v3H8v4h3v8h4v-8h3l1-4h-4V6a1 1 0 0 1 1-1h3z"></path>
                    </svg>
                  </a>
                ) : (
                  <a
                    href="https://www.facebook.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Facebook"
                    className="text-text-muted hover:text-text-primary transition"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="inline-block">
                      <path d="M18 2h-3a4 4 0 0 0-4 4v3H8v4h3v8h4v-8h3l1-4h-4V6a1 1 0 0 1 1-1h3z"></path>
                    </svg>
                  </a>
                )}
                {(
                  siteSettings?.google || siteSettings?.google_url || siteSettings?.social?.google
                ) ? (
                  <a
                    href={siteSettings?.google || siteSettings?.google_url || siteSettings?.social?.google}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Thunder Road on Google"
                    className="text-text-muted hover:text-text-primary transition"
                  >
                    <GoogleIcon width={20} height={20} className="inline-block" aria-hidden="true" />
                  </a>
                ) : (
                  <a
                    href="https://www.google.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Google"
                    className="text-text-muted hover:text-text-primary transition"
                  >
                    <GoogleIcon width={20} height={20} className="inline-block" aria-hidden="true" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right group: Quick Links + Legal/Admin as two columns on md+ */}
  <div className="flex flex-col md:flex-row md:items-start md:justify-end gap-4 md:gap-8">
          {/* Quick Links column */}
          <div className="md:text-left">
            <h4 className="text-sm font-heading font-semibold mb-1 text-text-primary">Quick Links</h4>
            <ul className="space-y-0 text-[11px] leading-tight">
              <li><a href="#menu" className="text-text-muted hover:text-text-primary tracking-tight">Menu</a></li>
              <li><a href="#about" className="text-text-muted hover:text-text-primary tracking-tight">About</a></li>
              <li><a href="#reservations" className="text-text-muted hover:text-text-primary tracking-tight">Reservations</a></li>
              <li><a href="#jobs" className="text-text-muted hover:text-text-primary tracking-tight">Careers</a></li>
              <li>
                <button
                  type="button"
                  onClick={() => setShowOrder(true)}
                  className="text-text-muted hover:text-text-primary tracking-tight"
                >
                  Order Online
                </button>
              </li>
            </ul>
          </div>

          {/* Legal + Admin column */}
          <div className="md:text-right">
            <h4 className="text-sm font-heading font-semibold mb-1 text-text-primary">Legal</h4>
            {/* match quick-links sizing to keep the footer visually consistent */}
            <ul className="space-y-0.5 text-[11px] leading-tight">
              <li>
                <a href="/privacy" className="text-text-muted hover:text-text-primary transition tracking-tight">Privacy Policy</a>
              </li>
              <li>
                <a href="/terms" className="text-text-muted hover:text-text-primary transition tracking-tight">Terms &amp; Conditions</a>
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
                className="text-text-muted hover:text-text-primary tracking-tight text-[11px] leading-tight"
              >
                Admin
              </a>
            </div>
          </div>
        </div>
      </div>

      {showHours && (
        <>
          {/*
            Render lazily-loaded modals via React.Suspense so the main bundle
            doesn't include modal-heavy content. The fallback keeps a simple
            backdrop while the modal chunk loads. This pattern is used for
            Hours, Contact, Privacy and Terms below.
          */}
          <React.Suspense fallback={<div aria-hidden className="fixed inset-0 z-40 flex items-center justify-center"><div className="bg-black/40" /></div>}>
            <HoursModal onClose={() => setShowHours(false)} />
          </React.Suspense>
        </>
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

      {showOrder && (
        <React.Suspense fallback={<div aria-hidden className="fixed inset-0 z-40 flex items-center justify-center"><div className="bg-black/40" /></div>}>
          <OrderModal onClose={() => setShowOrder(false)} />
        </React.Suspense>
      )}
    </footer>
  );
}
