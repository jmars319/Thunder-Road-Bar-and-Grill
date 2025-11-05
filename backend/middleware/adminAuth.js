const jwt = require('jsonwebtoken');

/*
  Admin authentication middleware
  
  Purpose:
  - Verifies JWT tokens for admin endpoints
  - Supports legacy dev-only simple auth when NODE_ENV !== 'production'
  
  Security:
  - Production: ONLY accepts valid JWT tokens in Authorization header
  - Development: Falls back to simple header/cookie for local testing
  - Tokens must include role='admin' and be signed with JWT_SECRET
  
  Last updated: 2025-11-05 — Implemented JWT verification
*/

// JWT secret must match auth.js
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

module.exports = function adminAuth(req, res, next) {
  // Extract token from Authorization header (Bearer <token>)
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') 
    ? authHeader.substring(7) 
    : null;

  if (token) {
    try {
      // Verify JWT token
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // Check that user has admin role
      if (decoded.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden - admin access required' });
      }

      // Attach user info to request for use by route handlers
      req.user = {
        id: decoded.id,
        username: decoded.username,
        role: decoded.role
      };

      return next();

    } catch (err) {
      // Token invalid or expired
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expired' });
      }
      return res.status(401).json({ error: 'Invalid token' });
    }
  }

  // Development fallback: allow simple header/cookie ONLY in non-production
  if (process.env.NODE_ENV !== 'production') {
    const allowHeader = String(process.env.ALLOW_DEV_ADMIN_HEADER || '0') === '1';
    const header = req.get('X-Admin-Auth');

    if (header && allowHeader && header === 'admin') {
      // Dev convenience with explicit enable
      req.user = { id: 1, username: 'admin', role: 'admin' }; // Mock user for dev
      return next();
    }

    // Cookie-based dev auth
    if (req.cookies && (req.cookies.admin === 'true' || req.cookies.admin === true)) {
      req.user = { id: 1, username: 'admin', role: 'admin' }; // Mock user for dev
      return next();
    }
  }

  // No valid authentication found
  return res.status(401).json({ error: 'Unauthorized - admin authentication required' });
};
