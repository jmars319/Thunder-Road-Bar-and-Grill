/*
  Purpose:
  - Main application router for the public site and admin panel. Controls
  application-level UI state (current user, logged-in status) and decides
  whether to render the public site, login page, or admin panel.

  Contract:
  - Inputs: none (top-level app). Internal state tracks `isLoggedIn`,
    `currentUser`, and `showAdmin`.
  - Outputs: renders one of: <PublicSite />, <LoginPage />, or <AdminPanel />.

  Notes:
  - Keep this file presentation-focused; individual pages/components should
    handle their own data fetching and side-effects.
*/

import { useState, useEffect, lazy, Suspense } from 'react';
// eslint-disable-next-line no-unused-vars
import { HelmetProvider } from 'react-helmet-async';
 
import PublicSite from './pages/PublicSite';
import PrivacyPage from './pages/PrivacyPage';
import TermsPage from './pages/TermsPage';
import LoginPage from './pages/LoginPage';
import ErrorBoundary from './components/ErrorBoundary';
import { authenticatedFetch } from './utils/api';
import NotFoundPage from './components/error-pages/NotFoundPage';
 
// Lazy load AdminPanel to reduce initial bundle size
const AdminPanel = lazy(() => import('./pages/AdminPanel'));

// References to the routes are used inside the App function; keep a local
// registry to make usage explicit for linters that don't follow JSX.

export default function App() {
  // Local registry to ensure imports are used in JS by linters that don't
  // follow JSX usage. This is a minimal in-function reference and has no
  // runtime impact.
  const _routes = { PublicSite, LoginPage, PrivacyPage, TermsPage, ErrorBoundary };
  const _lazyComponents = { AdminPanel, Suspense };
  void _routes;
  void _lazyComponents;
  const [showAdmin, setShowAdmin] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const ADMIN_MODE_KEY = 'adminMode';
  const AUTH_USER_KEY = 'authUser';

  // Listen for auth expiration events from API utility
  useEffect(() => {
    const handleAuthExpired = () => {
      handleLogout();
    };
    window.addEventListener('authExpired', handleAuthExpired);
    return () => window.removeEventListener('authExpired', handleAuthExpired);
  }, []);

  const handleLogin = (user, token) => {
    // Store JWT token in localStorage for session persistence
    if (token) {
      localStorage.setItem('authToken', token);
      localStorage.setItem(ADMIN_MODE_KEY, '1');
    }
    if (user) {
      try {
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
      } catch (e) {
        localStorage.removeItem(AUTH_USER_KEY);
      }
    }
    setCurrentUser(user || null);
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    // Clear JWT token from localStorage
    localStorage.removeItem('authToken');
    localStorage.removeItem(AUTH_USER_KEY);
    localStorage.removeItem(ADMIN_MODE_KEY);
    setIsLoggedIn(false);
    setCurrentUser(null);
    setShowAdmin(false);
  };

  const handleBackToSite = () => {
    localStorage.removeItem(ADMIN_MODE_KEY);
    setShowAdmin(false);
  };

  const handleEnterAdmin = () => {
    if (isLoggedIn) {
      localStorage.setItem(ADMIN_MODE_KEY, '1');
    }
    setShowAdmin(true);
  };

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      localStorage.removeItem(AUTH_USER_KEY);
      localStorage.removeItem(ADMIN_MODE_KEY);
      return;
    }
    const storedUser = localStorage.getItem(AUTH_USER_KEY);
    if (storedUser) {
      try {
        setCurrentUser(JSON.parse(storedUser));
        setIsLoggedIn(true);
      } catch (e) {
        localStorage.removeItem(AUTH_USER_KEY);
      }
    }
    if (localStorage.getItem(ADMIN_MODE_KEY) === '1') {
      setShowAdmin(true);
    }
    (async () => {
      try {
        const res = await authenticatedFetch('/media?limit=1');
        if (!res.ok) throw new Error('verify failed');
      } catch (err) {
        handleLogout();
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.location.pathname.startsWith('/admin')) {
      setShowAdmin(true);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('debug') === 'contrast' || params.has('contrast')) {
        import('./dev/contrastProbe').then((mod) => {
          if (typeof mod.logContrastPairs === 'function') {
            mod.logContrastPairs();
          }
        });
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('Contrast probe unavailable', error);
    }
  }, []);

  // Show admin panel if logged in (lazy loaded)
  if (showAdmin && isLoggedIn && currentUser) {
    return (
      <ErrorBoundary>
        <Suspense fallback={
          <div className="min-h-screen flex items-center justify-center bg-surface">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-text-secondary">Loading admin panel...</p>
            </div>
          </div>
        }>
          <AdminPanel 
            user={currentUser}
            token={localStorage.getItem('authToken')}
            onLogout={handleLogout} 
            onBackToSite={handleBackToSite} 
          />
        </Suspense>
      </ErrorBoundary>
    );
  }

  // Show login page if trying to access admin
  if (showAdmin && !isLoggedIn) {
    return (
      <ErrorBoundary>
        <LoginPage 
          onLogin={handleLogin} 
          onBack={handleBackToSite} 
        />
      </ErrorBoundary>
    );
  }

  // Show public website (default)
  // Simple route handling for a couple of static pages. This keeps the app
  // free of a router dependency while allowing direct links to /privacy and
  // /terms to render proper pages (useful for crawlers and direct navigation).
  const path = typeof window !== 'undefined' ? window.location.pathname : '/';
  const knownPaths = new Set(['/', '/privacy', '/terms', '/admin']);
  if (!knownPaths.has(path)) {
    return (
      <HelmetProvider>
        <ErrorBoundary>
          <NotFoundPage
            requestId={window.__LAST_REQUEST_ID__ || null}
            timestampUTC={new Date().toISOString()}
          />
        </ErrorBoundary>
      </HelmetProvider>
    );
  }

  if (path === '/privacy') {
    return (
      <HelmetProvider>
        <ErrorBoundary>
          <PrivacyPage />
        </ErrorBoundary>
      </HelmetProvider>
    );
  }

  if (path === '/terms') {
    return (
      <HelmetProvider>
        <ErrorBoundary>
          <TermsPage />
        </ErrorBoundary>
      </HelmetProvider>
    );
  }

  return (
    <HelmetProvider>
      <ErrorBoundary>
        <PublicSite onGoToAdmin={handleEnterAdmin} />
      </ErrorBoundary>
    </HelmetProvider>
  );
}
