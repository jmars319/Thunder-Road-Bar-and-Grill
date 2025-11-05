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

import { useState } from 'react';
 
import PublicSite from './pages/PublicSite';
import PrivacyPage from './pages/PrivacyPage';
import TermsPage from './pages/TermsPage';
 
import AdminPanel from './pages/AdminPanel';
 
import LoginPage from './pages/LoginPage';

// References to the routes are used inside the App function; keep a local
// registry to make usage explicit for linters that don't follow JSX.

export default function App() {
  // Local registry to ensure imports are used in JS by linters that don't
  // follow JSX usage. This is a minimal in-function reference and has no
  // runtime impact.
  const _routes = { PublicSite, AdminPanel, LoginPage, PrivacyPage, TermsPage };
  void _routes;
  const [showAdmin, setShowAdmin] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  const handleLogin = (user) => {
    setCurrentUser(user);
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    setShowAdmin(false);
  };

  // Show admin panel if logged in
  if (showAdmin && isLoggedIn && currentUser) {
    return (
      <AdminPanel 
        user={currentUser} 
        onLogout={handleLogout} 
        onBackToSite={() => setShowAdmin(false)} 
      />
    );
  }

  // Show login page if trying to access admin
  if (showAdmin && !isLoggedIn) {
    return (
      <LoginPage 
        onLogin={handleLogin} 
        onBack={() => setShowAdmin(false)} 
      />
    );
  }

  // Show public website (default)
  // Simple route handling for a couple of static pages. This keeps the app
  // free of a router dependency while allowing direct links to /privacy and
  // /terms to render proper pages (useful for crawlers and direct navigation).
  const path = typeof window !== 'undefined' ? window.location.pathname : '/';

  if (path === '/privacy') {
    return <PrivacyPage />;
  }

  if (path === '/terms') {
    return <TermsPage />;
  }

  return (
    <PublicSite onGoToAdmin={() => setShowAdmin(true)} />
  );
}
