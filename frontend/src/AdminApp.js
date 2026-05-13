import { lazy, Suspense, useEffect, useState } from 'react';

import LoginPage from './pages/LoginPage';
import ErrorBoundary from './components/ErrorBoundary';
import { authenticatedFetch } from './utils/api';
import {
  AUTH_TOKEN_KEY,
  clearSession,
  hasAuthToken,
  persistSession,
  readStoredUser,
} from './session';

const AdminPanel = lazy(() => import('./pages/AdminPanel'));

export default function AdminApp() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => hasAuthToken());
  const [currentUser, setCurrentUser] = useState(() => readStoredUser());

  const handleLogout = () => {
    clearSession();
    setIsLoggedIn(false);
    setCurrentUser(null);
  };

  useEffect(() => {
    const handleAuthExpired = () => {
      handleLogout();
    };
    window.addEventListener('authExpired', handleAuthExpired);
    return () => window.removeEventListener('authExpired', handleAuthExpired);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) {
      handleLogout();
      return;
    }
    const storedUser = readStoredUser();
    if (storedUser) {
      setCurrentUser(storedUser);
      setIsLoggedIn(true);
    }
    (async () => {
      try {
        const res = await authenticatedFetch('/media?limit=1');
        if (!res.ok) throw new Error('verify failed');
      } catch {
        handleLogout();
      }
    })();
  }, []);

  const handleLogin = (user, token) => {
    persistSession(user, token);
    setCurrentUser(user || null);
    setIsLoggedIn(true);
  };

  const handleBackToSite = () => {
    window.location.href = '/';
  };

  if (isLoggedIn && currentUser) {
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
            token={localStorage.getItem(AUTH_TOKEN_KEY)}
            onLogout={handleLogout}
            onBackToSite={handleBackToSite}
          />
        </Suspense>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <LoginPage
        onLogin={handleLogin}
        onBack={handleBackToSite}
      />
    </ErrorBoundary>
  );
}
