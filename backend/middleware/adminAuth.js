// Lightweight admin auth middleware for dev/admin UI protection
// Checks for a simple header or cookie to gate admin endpoints. Replace with
// production-ready authentication (sessions/JWT) before deploying.
module.exports = function adminAuth(req, res, next) {
  // Lightweight admin auth middleware used for local/dev admin UI.
  // Hardening rules:
  // - In production (NODE_ENV=production) the simple header-based auth
  //   (X-Admin-Auth: admin) is NOT accepted. Use a real auth mechanism
  //   (session cookie / JWT) in production deployments.
  // - Allow the header only when explicitly enabled via
  //   ALLOW_DEV_ADMIN_HEADER=1 (useful for local tooling).
  // - Prefer a cookie named `admin=true` for quick local testing.

  const allowHeader = String(process.env.ALLOW_DEV_ADMIN_HEADER || '0') === '1';
  const header = req.get('X-Admin-Auth');

  if (header && allowHeader && header === 'admin') {
    // Dev convenience (explicitly enabled)
    return next();
  }

  // Prefer cookie-based dev auth only when running locally
  if (req.cookies && (req.cookies.admin === 'true' || req.cookies.admin === true) && process.env.NODE_ENV !== 'production') {
    return next();
  }

  // In production, optionally restrict admin access to requests originating
  // from the configured FRONTEND_URL(s). This prevents third-party origins
  // from invoking admin endpoints via the browser.
  if (process.env.NODE_ENV === 'production') {
    try {
      const FRONTEND = process.env.FRONTEND_URL || '';
      const allowed = FRONTEND.split(',').map(s => s.trim()).filter(Boolean);
      const origin = req.headers.origin;
      if (origin && allowed.indexOf(origin) === -1) {
        console.warn('Blocked admin access from disallowed origin:', origin);
        return res.status(401).json({ error: 'Unauthorized - admin only' });
      }
    } catch (e) {
      // If anything goes wrong, fallthrough to reject.
    }
  }

  // Default: reject and return a generic error without leaking details.
  return res.status(401).json({ error: 'Unauthorized - admin only' });
};
