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
    }
    setCurrentUser(user);
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    // Clear JWT token from localStorage
    localStorage.removeItem('authToken');
    setIsLoggedIn(false);
    setCurrentUser(null);
    setShowAdmin(false);
  };

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
            onLogout={handleLogout} 
            onBackToSite={() => setShowAdmin(false)} 
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
          onBack={() => setShowAdmin(false)} 
        />
      </ErrorBoundary>
    );
  }

  // Show public website (default)
  // Simple route handling for a couple of static pages. This keeps the app
  // free of a router dependency while allowing direct links to /privacy and
  // /terms to render proper pages (useful for crawlers and direct navigation).
  const path = typeof window !== 'undefined' ? window.location.pathname : '/';

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
        <PublicSite onGoToAdmin={() => setShowAdmin(true)} />
      </ErrorBoundary>
    </HelmetProvider>
  );
}
