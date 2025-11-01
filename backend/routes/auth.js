const express = require('express');
const router = express.Router();

/*
  Auth routes

  Purpose:
  - Provide simple authentication endpoints used by the admin UI. This file
    currently contains a development-only login stub and should be replaced
    with a production-ready auth system (hashed passwords, sessions or JWT,
    rate limiting, account lockout, and CSRF protections) before deployment.

  Endpoints:
  - POST /api/login
    Request: { email, password }
    Response: { success: boolean, user?: { id, name, email, role }, message?: string }

  Notes:
  - Responses should aim for a consistent shape so the frontend can handle
    errors and success cases uniformly. Do not store plaintext passwords.
  Developer annotations:
// Last updated: 2025-10-21 — doc sweep: ensure auth flows documented in docs/notes/DEVELOPERS.md when changed.
  - Inputs: JSON body with `email` and `password` for `/login`.
  - Outputs: JSON { success: boolean, user?: { id, name, email, role }, message?: string }.
  - Security: this file currently contains a development stub. Replace with a proper auth service (hashed passwords, rate limiting, secure session/JWT handling) before production. Never return sensitive fields in responses.
  - Example (dev-stub):
    curl -X POST http://localhost:5001/api/login -H "Content-Type: application/json" -d '{"email":"admin","password":"admin123"}'
*/

// Login endpoint (development stub)
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  // NOTE: credentials are intentionally simple for local/dev use. Replace
  // with a real user lookup and password verification in production.
  if (email === 'admin' && password === 'admin123') {
    return res.json({
      success: true,
      user: {
        id: 1,
        name: 'Admin User',
        email: 'admin',
        role: 'admin'
      }
    });
  }

  return res.status(401).json({ success: false, message: 'Invalid credentials' });
});

// Dev-only: set an admin cookie for local testing. This endpoint is intentionally
// permissive and MUST NOT be enabled in production. It returns 200 and sets a
// cookie the browser will include in subsequent requests (when using
// `fetch(..., { credentials: 'include' })`).
router.post('/dev-signin', (req, res) => {
  // Only allow in non-production environments
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ success: false, message: 'Dev signin disabled in production' });
  }

  // Set a simple admin cookie. Use SameSite=None so the cookie will be sent
  // from the frontend origin when requests include credentials. Note: modern
  // browsers require Secure with SameSite=None; we only set Secure when the
  // server indicates HTTPS via FORCE_HTTPS=1 to avoid rejecting the cookie on
  // plain HTTP localhost development.
  const cookieOptions = [];
  cookieOptions.push('Path=/');
  cookieOptions.push('HttpOnly'); // prevent JS access
  cookieOptions.push('SameSite=None');
  if (String(process.env.FORCE_HTTPS || '0') === '1') {
    cookieOptions.push('Secure');
  }

  // Set cookie that adminAuth checks (req.cookies.admin)
  res.setHeader('Set-Cookie', `admin=true; ${cookieOptions.join('; ')}`);
  return res.json({ success: true, message: 'Dev admin cookie set' });
});

module.exports = router;
