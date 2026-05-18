import { useEffect } from 'react';
// eslint-disable-next-line no-unused-vars
import { HelmetProvider } from 'react-helmet-async';

import PublicSite from './pages/PublicSite';
import PrivacyPage from './pages/PrivacyPage';
import TermsPage from './pages/TermsPage';
import ErrorBoundary from './components/ErrorBoundary';
import AccessDeniedPage from './components/error-pages/AccessDeniedPage';
import NotFoundPage from './components/error-pages/NotFoundPage';
import TemporaryIssuePage from './components/error-pages/TemporaryIssuePage';

export default function PublicApp() {
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

  const handleEnterAdmin = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/admin';
    }
  };

  const path = typeof window !== 'undefined' ? window.location.pathname : '/';
  if (path === '/status/access-denied') {
    return (
      <HelmetProvider>
        <ErrorBoundary>
          <AccessDeniedPage
            requestId={window.__LAST_REQUEST_ID__ || null}
            timestampUTC={new Date().toISOString()}
          />
        </ErrorBoundary>
      </HelmetProvider>
    );
  }

  if (path === '/status/server-error' || path === '/status/maintenance') {
    return (
      <HelmetProvider>
        <ErrorBoundary>
          <TemporaryIssuePage
            requestId={window.__LAST_REQUEST_ID__ || null}
            timestampUTC={new Date().toISOString()}
            statusCode={path === '/status/maintenance' ? 503 : 500}
          />
        </ErrorBoundary>
      </HelmetProvider>
    );
  }

  const knownPaths = new Set(['/', '/privacy', '/terms']);

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
