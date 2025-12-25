/*
  PublicNavbar

  - Top navigation for the public site. Loads site settings and navigation
    and provides responsive navigation, theme toggle and the Order Online modal trigger.

  Contract:
  - Props: { onGoToAdmin?: function }

  Notes:
  - Renders the shared BrandLogo component so the logo always loads from bundled static assets.
*/
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

import { icons } from '../../icons';
import BrandLogo from '../shared/BrandLogo';
import { getApiUrl } from '../../config/api';
// Lazy-load the OrderModal so it's only fetched when a user opens the modal.
// This keeps the initial JS bundle smaller and loads the placeholder only on
// demand. If you add analytics for interest in ordering, dispatch analytics
// events from the click handler that sets `orderOpen`.
const OrderModal = React.lazy(() => import('./OrderModal'));

/*
  PublicNavbar


  Purpose:
  - Site navigation used by the public website. Loads `settings` and
    `navigation` from the backend and renders responsive navigation.

  Contract:
  - Props: { onGoToAdmin?: function }
  - Data: expects GET /api/settings and GET /api/navigation endpoints.

  Accessibility & logo notes:
  - The logo is a static asset rendered via <BrandLogo />. It no longer depends
    on uploaded media, so the navbar remains stable even if the API is offline.
  - Styling: uses design token classes (e.g., bg-primary, bg-surface, text-text-*)
    and runtime theme variables. Prefer editing tokens in `custom-styles.css`.
*/

export default function PublicNavbar({ onGoToAdmin }) {
  // kept for backwards compatibility with parent callers; no-op in navbar now
  void onGoToAdmin;
  const [siteSettings, setSiteSettings] = useState(null);
  const [navLinks, setNavLinks] = useState([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  // Tracks whether the Order Online modal is visible. Use this flag to
  // lazy-load and render the lightweight OrderModal. Prefer `React.Suspense`
  // around the modal so a small loading fallback can be displayed.
  const [orderOpen, setOrderOpen] = useState(false);

  useEffect(() => {
    // Load site-level settings (logo, name, tagline). Keep errors silent for now.
    fetch(getApiUrl('/settings'))
      .then(res => res.json())
      .then(payload => setSiteSettings(payload?.settings || {}))
      .catch(() => {});

    // Load the navigation payload (array of { id, label, url }).
    fetch(getApiUrl('/navigation'))
      .then(res => res.json())
      .then(data => {
        // Ensure we always set an array, even if data is null/undefined/not-an-array
        if (Array.isArray(data)) {
          setNavLinks(data);
        } else {
          console.warn('Navigation data is not an array:', data);
          setNavLinks([]);
        }
      })
      .catch(err => {
        console.error('Failed to fetch navigation:', err);
        setNavLinks([]);
      });
  }, []);

  // Smooth-scroll handler for same-page hash links. For links that begin
  // with '#', prevent default navigation and scroll the matching element
  // into view with smooth behavior. Also close the mobile menu when used.
  function handleNavClick(e, url) {
    if (!url) return;
    try {
      // normalize to a hash fragment if present, e.g. '/#about' or 'https://site/#about'
      const hashIndex = url.indexOf('#');
      if (hashIndex !== -1) {
        e.preventDefault();
        const id = url.slice(hashIndex + 1);
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
          // Fallback to setting the hash so the browser can attempt navigation
          window.location.hash = url;
        }
        setMobileMenuOpen(false);
      }
    } catch (err) {
      // swallow any errors to avoid breaking the nav
    }
  }

  // Show a floating "Back to top" button when the user scrolls down the page
  useEffect(() => {
    const onScroll = () => {
      try {
        setShowBackToTop(window.scrollY > 300);
      } catch (e) {
        // ignore
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Listen for siteSettingsUpdated events so the navbar updates instantly
  // when an admin changes the logo or other settings in the MediaModule.
  useEffect(() => {
    const handler = (e) => {
      try {
        const payload = e?.detail || {};
        setSiteSettings(payload);
      } catch (err) {
        // ignore
      }
    };
    window.addEventListener('siteSettingsUpdated', handler);
    return () => window.removeEventListener('siteSettingsUpdated', handler);
  }, []);

  return (
    <nav className="bg-surface shadow-md header-sticky top-0 z-50 backdrop-blur-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
  <div className="flex justify-between items-center h-16 md:h-20">
          <div className="flex items-center gap-3">
            <div className="logo-badge">
              <BrandLogo className="h-full w-auto object-contain" />
            </div>
            <div>
              <div className="text-lg font-bold text-text-primary font-heading">
                {siteSettings?.business_name || 'Thunder Road Bar and Grill'}
              </div>
              {siteSettings?.tagline && (
                <div className="text-xs text-text-secondary">{siteSettings.tagline}</div>
              )}
            </div>
          </div>

          {/* Desktop navigation */}
          <div className="hidden md:flex items-center gap-4">
            {/**
             * Small mapping: treat an incoming 'Contact' navigation item as the
             * public-facing careers link and map 'About' to the About section.
             * Also, filter out any 'Home' link so we don't render a duplicate.
             */}
            {navLinks
              .filter((link) => {
                const label = String(link.label || '').trim().toLowerCase();
                const url = String(link.url || '').trim();
                if (label === 'home') return false;
                if (url === '/' || url === '/home' || url === '#home') return false;
                return true;
              })
              .map((link) => {
                const lowLabel = String(link.label || '').toLowerCase();
                const isContactLink = (link.url && String(link.url).toLowerCase() === '#contact') || lowLabel.includes('contact');
                const isAboutLink = lowLabel.includes('about') || (link.url && String(link.url).toLowerCase().includes('#about'));
                const renderLabel = isContactLink ? 'Careers' : link.label;
                const renderUrl = isContactLink ? '#jobs' : isAboutLink ? '#about' : link.url;
                return (
                  <a
                    key={link.id}
                    href={renderUrl}
                    onClick={(e) => handleNavClick(e, renderUrl)}
                    className="text-text-secondary hover:text-text-primary font-medium transition"
                  >
                    {renderLabel}
                  </a>
                );
              })}
            {/* DEV: Admin button and nav links use semantic design tokens (bg-primary, text-text-inverse,
                hover:bg-primary-dark, text-text-primary, etc.). Adjust tokens in
                `frontend/src/custom-styles.css` rather than changing utility classes here. */}
            <button
              type="button"
              onClick={() => setOrderOpen(true)}
              title="Order Online - coming soon"
              className="bg-primary text-text-inverse px-3 py-1 rounded-lg hover:bg-primary-dark transition text-sm font-semibold"
            >
              Order Online
            </button>
          </div>

          {/* Mobile menu toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1 rounded-lg hover:bg-surface-warm"
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-menu"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? React.createElement(icons.X, { size: 24 }) : React.createElement(icons.Menu, { size: 24 })}
          </button>
        </div>

        {/* Mobile menu content - keeps markup separate for clarity */}
        {mobileMenuOpen && (
          <div id="mobile-menu" className="md:hidden pb-3 border-t">
            <div className="flex flex-col gap-3 pt-3">
              {navLinks
                .filter((link) => {
                  const label = String(link.label || '').trim().toLowerCase();
                  const url = String(link.url || '').trim();
                  if (label === 'home') return false;
                  if (url === '/' || url === '/home' || url === '#home') return false;
                  return true;
                })
                .map((link) => {
                  const lowLabel = String(link.label || '').toLowerCase();
                  const isContactLink = (link.url && String(link.url).toLowerCase() === '#contact') || lowLabel.includes('contact');
                  const isAboutLink = lowLabel.includes('about') || (link.url && String(link.url).toLowerCase().includes('#about'));
                  const renderLabel = isContactLink ? 'Careers' : link.label;
                  const renderUrl = isContactLink ? '#jobs' : isAboutLink ? '#about' : link.url;
                  return (
                    <a
                      key={link.id}
                      href={renderUrl}
                      className="text-text-primary hover:text-primary font-medium transition-colors px-3 py-1 hover:bg-surface-warm rounded"
                      onClick={(e) => handleNavClick(e, renderUrl)}
                    >
                      {renderLabel}
                    </a>
                  );
                })}
              <button
                onClick={() => { setMobileMenuOpen(false); setOrderOpen(true); }}
                type="button"
                title="Order Online - coming soon"
                className="bg-primary text-text-inverse px-3 py-1 rounded-lg hover:bg-primary-dark transition text-sm font-semibold mx-2"
              >
                Order Online
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  try {
                    if (typeof onGoToAdmin === 'function') onGoToAdmin();
                  } catch (err) {
                    // fallback: navigate directly
                    window.location.href = '/admin';
                  }
                }}
                type="button"
                aria-label="Admin login"
                className="bg-surface text-text-primary px-3 py-1 rounded-lg hover:bg-surface-warm transition text-sm font-semibold mx-2"
              >
                Admin Login
              </button>
            </div>
          </div>
        )}
        {/* Back to top floating button — rendered into document.body via portal so
            position:fixed is always relative to the viewport and not affected
            by transformed/filtered ancestors (backdrop-filter creates a containing block in some browsers). */}
        {showBackToTop && typeof document !== 'undefined' && createPortal(
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            aria-label="Back to top"
            aria-describedby="back-to-top-desc"
            title="Back to top"
            className="fixed right-4 bottom-4 z-50 bg-primary text-text-inverse p-2 rounded-full shadow-sm hover:bg-primary-dark transition-transform duration-200 transform-gpu focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            <span id="back-to-top-desc" className="sr-only">Scroll to top of page</span>
            {React.createElement(icons.ChevronUp, { size: 18 })}
          </button>,
          document.body
        )}
        {orderOpen && (
          <React.Suspense fallback={null}>
            <OrderModal onClose={() => setOrderOpen(false)} />
          </React.Suspense>
        )}
      </div>
    </nav>
  );
}

// Some editor/lint setups don't detect JSX uses of member-expressions like
// `<icons.X />`. Provide a small used-symbol object so those tools don't
// incorrectly report `icons` as unused.
