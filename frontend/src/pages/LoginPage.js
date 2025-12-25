import { useState } from 'react';
import BrandLogo from '../components/shared/BrandLogo';
import { API_BASE } from '../config/api';

/*
  Purpose:
  - Lightweight admin sign-in page used by the AdminPanel. Posts credentials
    to the backend and calls `onLogin(user)` when the server confirms success.

  Contract:
  - Expects backend POST /api/login with { email, password } and a JSON
    response containing a `success` boolean and optionally a `user` object.

  Notes:
  - Accessibility: uses labels, input ids, and an aria-live error region for
    screen reader announcements.
*/

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
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
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
            <div className="inline-block mb-4 logo-badge">
              <BrandLogo className="inline-block h-12 w-auto" />
            </div>
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
                placeholder="Enter your admin username"
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
                placeholder="Enter your password"
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
        </div>
      </div>
    </div>
  );
}
