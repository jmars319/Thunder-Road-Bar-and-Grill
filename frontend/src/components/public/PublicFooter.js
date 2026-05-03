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
import { getApiUrl } from '../../config/api';

const HoursModal = React.lazy(() => import('./HoursModal'));
const PrivacyModal = React.lazy(() => import('./PrivacyModal'));
const TermsModal = React.lazy(() => import('./TermsModal'));
const ContactModal = React.lazy(() => import('./ContactModal'));
const ORDER_ONLINE_URL = 'https://direct.chownow.com/order/42923/locations/64729';
// ensure lazy imports and SVG components are recognized by some static analyzers as used
void HoursModal; void PrivacyModal; void TermsModal; void ContactModal;
// mark the inline Google SVG component as intentionally used
void GoogleIcon;

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
    const footerColumnsUrl = getApiUrl('/footer-columns');
    const settingsUrl = getApiUrl('/settings');

    (async () => {
      try {
        const cols = await cachedFetch(footerColumnsUrl);
        setColumns(Array.isArray(cols) ? cols : []);
      } catch (e) {
        setColumns([]);
      }

      try {
        const s = await cachedFetch(settingsUrl);
        setSiteSettings(s?.settings || {});
      } catch (e) {
        setSiteSettings({});
      }
    })();

    const handler = () => {
      clearCacheFor(settingsUrl);
      clearCacheFor(footerColumnsUrl);
      cachedFetch(settingsUrl).then(s => setSiteSettings(s?.settings || {}));
      cachedFetch(footerColumnsUrl).then(cols => setColumns(Array.isArray(cols) ? cols : []));
    };

    window.addEventListener('siteSettingsUpdated', handler);
    return () => window.removeEventListener('siteSettingsUpdated', handler);
  }, []);

  const cmsColumns = columns
    .filter(col => !/(quick links|legal)/i.test(String(col.column_title || '')))
    .slice(0, 4)
    .map(col => {
      const filteredLinks = Array.isArray(col.links)
        ? col.links.filter(link => link && link.label && link.url)
        : [];
      return { ...col, links: filteredLinks };
    })
    .filter(col => col.column_title && Array.isArray(col.links) && col.links.length > 0);
  const hasCmsColumns = cmsColumns.length > 0;

  return (
    <footer className="bg-surface-dark text-text-inverse py-6" role="contentinfo" aria-label="Site footer">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid gap-6 w-full md:grid-cols-12">
          <div className="flex flex-col gap-1 md:col-span-4 md:col-start-1">
            {siteSettings?.phone && (
              <a href={`tel:${siteSettings.phone}`} className="footer-link text-text-muted hover:text-text-primary text-xs leading-tight">{siteSettings.phone}</a>
            )}

            {siteSettings?.email && (
              <a href={`mailto:${siteSettings.email}`} className="footer-link text-text-muted hover:text-text-primary text-xs leading-tight">{siteSettings.email}</a>
            )}

            {siteSettings?.address && (
              <span className="text-text-muted text-xs">{siteSettings.address}</span>
            )}

            <div className="flex items-center gap-2 mt-1">
              <button
                type="button"
                onClick={() => setShowContact(true)}
                className="footer-link text-text-muted hover:text-text-primary underline text-xs"
                aria-haspopup="dialog"
              >
                Contact
              </button>

              <button
                type="button"
                onClick={() => setShowHours(true)}
                className="footer-link text-text-muted hover:text-text-primary underline text-xs"
                aria-haspopup="dialog"
              >
                Hours
              </button>
            </div>
          </div>

          <div className="space-y-2 md:col-span-4 md:col-start-5">
            <h4 className="text-sm font-heading font-semibold text-text-primary">Quick Links</h4>
            <div className="grid gap-2 sm:grid-cols-2">
              <ul className="space-y-0 text-xs leading-tight tracking-tight">
                <li><a href="#menu" className="footer-link text-text-muted hover:text-text-primary">Menu</a></li>
                <li><a href="#about" className="footer-link text-text-muted hover:text-text-primary">About</a></li>
                <li><a href="#reservations" className="footer-link text-text-muted hover:text-text-primary">Reservations</a></li>
              </ul>
              <ul className="space-y-0 text-xs leading-tight tracking-tight">
                <li><a href="#jobs" className="footer-link text-text-muted hover:text-text-primary">Careers</a></li>
                <li>
                  <a
                    href={ORDER_ONLINE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="footer-link text-text-muted hover:text-text-primary"
                  >
                    Order Online
                  </a>
                </li>
              </ul>
            </div>
            {hasCmsColumns && (
              <div className="pt-2 grid gap-3">
                {cmsColumns.map(col => (
                  <div key={col.id}>
                    <h5 className="text-xs font-heading font-semibold uppercase tracking-wide text-text-secondary mb-1">{col.column_title}</h5>
                    <ul className="space-y-0.5">
                      {col.links.map(link => (
                        <li key={link.id}>
                          {link.url === '#privacy' ? (
                            <button
                              type="button"
                              onClick={() => setShowPrivacy(true)}
                              className="footer-link text-text-muted hover:text-text-primary tracking-tight text-xs"
                            >
                              {link.label}
                            </button>
                          ) : link.url === '#terms' ? (
                            <button
                              type="button"
                              onClick={() => setShowTerms(true)}
                              className="footer-link text-text-muted hover:text-text-primary tracking-tight text-xs"
                            >
                              {link.label}
                            </button>
                          ) : (
                            <a href={link.url} className="footer-link text-text-muted hover:text-text-primary transition text-xs leading-tight tracking-tight">{link.label}</a>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2 md:col-span-4 md:col-start-9 md:flex md:flex-col md:items-end text-left md:text-right">
            <h4 className="text-sm font-heading font-semibold mb-2 text-text-primary w-full md:w-auto">Legal</h4>
            <ul className="space-y-0.5 text-[11px] leading-tight w-full md:w-auto">
              <li>
                <a href="/privacy" className="footer-link text-text-muted hover:text-text-primary transition tracking-tight">Privacy Policy</a>
              </li>
              <li>
                <a href="/terms" className="footer-link text-text-muted hover:text-text-primary transition tracking-tight">Terms &amp; Conditions</a>
              </li>
            </ul>

            <div className="border-t border-divider pt-2 w-full md:w-auto md:self-end">
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
                className="footer-link text-text-muted hover:text-text-primary tracking-tight text-[11px] leading-tight w-full md:w-auto"
              >
                Admin
              </a>
            </div>
          </div>
        </div>

        <div className="mt-6 border-t border-divider pt-4 flex flex-col items-center gap-3">
          <div className="flex items-center gap-3">
            {(
              siteSettings?.instagram || siteSettings?.instagram_url || siteSettings?.social?.instagram
            ) ? (
              <a
                href={siteSettings?.instagram || siteSettings?.instagram_url || siteSettings?.social?.instagram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Thunder Road on Instagram"
                className="footer-social-link text-text-muted hover:text-primary transition"
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
                className="footer-social-link text-text-muted hover:text-text-primary transition"
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
                className="footer-social-link text-text-muted hover:text-text-primary transition"
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
                className="footer-social-link text-text-muted hover:text-text-primary transition"
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
                className="footer-social-link text-text-muted hover:text-text-primary transition"
              >
                <GoogleIcon width={20} height={20} className="inline-block" aria-hidden="true" />
              </a>
            ) : (
              <a
                href="https://www.google.com/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Google"
                className="footer-social-link text-text-muted hover:text-text-primary transition"
              >
                <GoogleIcon width={20} height={20} className="inline-block" aria-hidden="true" />
              </a>
            )}
          </div>
          <div className="text-xs text-text-secondary text-center">
            © {new Date().getFullYear()} {siteSettings?.business_name || 'Thunder Road Bar and Grill'} · Website by{' '}
            <a
              href="https://jamarq.digital"
              target="_blank"
              rel="noopener noreferrer"
              className="footer-link text-text-muted hover:text-text-primary underline"
            >
              JAMARQ Digital
            </a>
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

    </footer>
  );
}
