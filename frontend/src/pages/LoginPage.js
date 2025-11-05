import { useState, useEffect } from 'react';
import { ReactComponent as DefaultLogo } from '../logo.svg';

// Mark intentionally imported but conditionally-rendered components as used
// so static analyzers don't report false-positive 'defined but never used'.
const __usedLogin = { DefaultLogo };
void __usedLogin;

/*
  Purpose:
  - Lightweight admin sign-in page used by the AdminPanel. Posts credentials
    to the backend and calls `onLogin(user)` when the server confirms success.

  Contract:
  - Expects backend POST /api/login with { email, password } and a JSON
    response containing a `success` boolean and optionally a `user` object.

  Notes:
  - API_BASE is currently hard-coded for local development. Move to
    environment configuration for deployments.
  - Accessibility: uses labels, input ids, and an aria-live error region for
    screen reader announcements.
*/

// Use environment-driven API base so deployments can override without code changes
const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:5001/api';

/**
 * Props:
 * - onLogin(user): called when login succeeds; receives server `user` object
 * - onBack(): optional -- navigate back to the public site
 */
export default function LoginPage({ onLogin = () => {}, onBack = () => {} }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [siteSettings, setSiteSettings] = useState(null);
  const [logoSvg, setLogoSvg] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/site-settings`).then(r => r.ok ? r.json() : {}).then(s => setSiteSettings(s || {})).catch(() => {});
    const handler = (e) => setSiteSettings(e?.detail || {});
    window.addEventListener('siteSettingsUpdated', handler);
    return () => window.removeEventListener('siteSettingsUpdated', handler);
  }, []);

  useEffect(() => {
    if (!siteSettings?.logo_url) return;
    const url = siteSettings.logo_url;
    if (typeof url === 'string' && url.toLowerCase().endsWith('.svg')) {
      // Fetch sanitized SVG from backend API instead of direct file access
      fetch(`${API_BASE}/logo/sanitized`)
        .then(r => (r.ok ? r.text() : Promise.reject()))
        .then(t => setLogoSvg(t))
        .catch(() => setLogoSvg(null));
    } else {
      setLogoSvg(null);
    }
  }, [siteSettings]);

  // Helpers for responsive srcset generation (same convention as backend generator)
  function buildSrcSet(url, sizesArr = [480, 768, 1024, 1600]) {
    try {
      if (!url) return '';
      const qIdx = url.indexOf('?');
      const clean = qIdx === -1 ? url : url.slice(0, qIdx);
      const dot = clean.lastIndexOf('.');
      if (dot === -1) return '';
      const ext = clean.slice(dot + 1);
      const base = clean.slice(0, dot);
      const parts = sizesArr.map(w => `${base}-${w}.${ext} ${w}w`);
      parts.push(`${clean} ${Math.max(...sizesArr)}w`);
      return parts.join(', ');
    } catch (e) {
      return '';
    }
  }

  function buildWebpSrcSet(url, sizesArr = [480, 768, 1024, 1600]) {
    try {
      if (!url) return '';
      const base = url.slice(0, url.lastIndexOf('.'));
      const parts = sizesArr.map(w => `${base}-${w}.webp ${w}w`);
      parts.push(`${base}.webp ${Math.max(...sizesArr)}w`);
      return parts.join(', ');
    } catch (e) {
      return '';
    }
  }

  // Primary submit handler. Keeps error/loading state local and defensive about
  // response shapes. We always check `response.ok` before parsing JSON because
  // some servers return HTML or an error page on non-2xx status codes.
  const handleSubmit = async () => {
    // Basic UX guard: avoid duplicate submits
    if (loading) return;

    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (!response.ok) {
        // Generic message for non-2xx errors. Server may include a JSON
        // message body we can show, but avoid leaking raw server HTML.
        setError('Login failed. Please check your credentials.');
        return;
      }

      const data = await response.json();

      if (data && data.success) {
        // Defensive: ensure onLogin is callable
        // Pass both user and token to parent component
        if (typeof onLogin === 'function') onLogin(data.user, data.token);
      } else {
        // Prefer server-provided message when available.
        setError(data?.message || 'Invalid credentials');
      }
  } catch {
      // Network or unexpected runtime error
      setError('Login failed. Please try again.');
      // For debugging locally you may want to console.error(err)
    } finally {
      setLoading(false);
    }
  };

  // We still support pressing Enter in inputs by submitting the form; keep a
  // small handler for backward compatibility in case the UI is used outside
  // of a form element in the future.
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-accent to-surface flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-surface rounded-lg shadow-2xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
                {
                  (() => {
                    const isBundledDefault = !siteSettings?.logo_url;
                    const logoUrl = siteSettings?.logo_url || '';
                    return (
                      <div className="inline-block mb-4 logo-badge">
                        {logoSvg ? (
                          <span role="img" aria-label={siteSettings?.business_name || 'Site logo'} dangerouslySetInnerHTML={{ __html: logoSvg }} className="h-12 w-12 inline-block" />
                        ) : (
                          <picture>
                            {buildWebpSrcSet(logoUrl, [160, 320, 480, 768, 1024, 1600]) ? (
                              <source srcSet={buildWebpSrcSet(logoUrl, [160, 320, 480, 768, 1024, 1600])} type="image/webp" sizes="(min-width: 768px) 80px, 64px" />
                            ) : null}
                            {buildSrcSet(logoUrl, [160, 320, 480, 768, 1024, 1600]) ? (
                              <source srcSet={buildSrcSet(logoUrl, [160, 320, 480, 768, 1024, 1600])} type="image/jpeg" sizes="(min-width: 768px) 80px, 64px" />
                            ) : null}
                            {isBundledDefault ? (
                              <DefaultLogo role="img" aria-label={siteSettings?.business_name || 'Site logo'} className="inline-block h-12 w-auto" />
                            ) : (
                              <img src={logoUrl} srcSet={buildSrcSet(logoUrl, [160, 320, 480, 768, 1024, 1600]) || undefined} sizes="(min-width: 768px) 80px, 64px" alt={siteSettings?.business_name || 'Site logo'} className="inline-block h-12 w-auto" />
                            )}
                          </picture>
                        )}
                      </div>
                    );
                  })()
                }
            <h1 className="text-2xl font-bold text-text-primary">Thunder Road Admin</h1>
            <p className="text-text-secondary text-sm mt-2">Sign in to manage your site</p>
          </div>

          {/* Error Message: use aria-live so screen readers announce it */}
          {error && (
            <div
              className="bg-error/10 border border-error text-error px-4 py-3 rounded mb-4 text-sm"
              role="alert"
              aria-live="assertive"
            >
              {error}
            </div>
          )}

          {/* Login Form: form submit improves accessibility and handles Enter key */}
          <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-4" noValidate>
            <div>
              <label htmlFor="login-username" className="block text-sm font-medium text-text-primary mb-1">
                Username
              </label>
              <input
                id="login-username"
                name="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="admin"
                className="w-full form-input"
                autoComplete="username"
                aria-label="username"
              />
            </div>

            <div>
              <label htmlFor="login-password" className="block text-sm font-medium text-text-primary mb-1">
                Password
              </label>
              <input
                id="login-password"
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder=""
                className="w-full form-input"
                autoComplete="current-password"
                aria-label="password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-text-inverse py-2 rounded-lg font-semibold hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>

            <button
              type="button"
              onClick={onBack}
              className="w-full bg-surface-warm text-text-primary py-2 rounded-lg font-semibold hover:bg-surface transition"
            >
              Back to Website
            </button>
          </form>

          {/* Demo Credentials (kept for local/dev environments) */}
          <div className="mt-6 p-4 bg-surface-warm rounded-lg">
            <p className="text-center text-sm text-text-primary">
              <strong>Demo Credentials:</strong><br />
              Username: admin<br />
              Password: admin123
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

