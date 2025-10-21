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
// Last updated: 2025-10-21 — doc sweep: ensure auth flows documented in DEVELOPERS.md when changed.
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

module.exports = router;
