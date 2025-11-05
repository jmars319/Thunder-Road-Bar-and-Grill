const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');

/*
  Auth routes

  Purpose:
  - Provide secure authentication endpoints for the admin UI using bcrypt
    password hashing and JWT tokens.

  Endpoints:
  - POST /api/login
    Request: { username, password }
    Response: { success: boolean, token?: string, user?: { id, username, role }, message?: string }

  Notes:
  - Uses bcrypt for password hashing (10 rounds)
  - Issues JWT tokens with 24h expiration
  - Rate limited to 5 attempts per 15 minutes
  - Tokens should be stored in httpOnly cookies (handled by client)
  
  Last updated: 2025-11-05 — Implemented secure authentication with bcrypt + JWT
*/

// JWT secret from environment (MUST be set in production)
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '24h';

if (process.env.NODE_ENV === 'production' && JWT_SECRET === 'dev-secret-change-in-production') {
  console.error('⚠️  CRITICAL: JWT_SECRET not set in production! Set JWT_SECRET environment variable.');
}

// Rate limiter for login endpoint
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: { success: false, message: 'Too many login attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Login endpoint with bcrypt verification and JWT
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username and password are required' 
      });
    }

    // Get database connection from app context
    const db = req.dbPromise;
    
    // Look up user by username
    const [users] = await db.query(
      'SELECT id, username, password_hash, email, full_name, role, is_active FROM users WHERE username = ? LIMIT 1',
      [username]
    );

    const user = users[0];

    // Return generic error to prevent username enumeration
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    // Check if user is active
    if (!user.is_active) {
      return res.status(401).json({ 
        success: false, 
        message: 'Account is disabled' 
      });
    }

    // Verify password with bcrypt
    const isValid = await bcrypt.compare(password, user.password_hash);

    if (!isValid) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    // Update last_login timestamp
    await db.query(
      'UPDATE users SET last_login = NOW() WHERE id = ?',
      [user.id]
    );

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        username: user.username, 
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    // Return success with token and user info (no sensitive data)
    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.full_name,
        email: user.email,
        role: user.role
      }
    });

  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ 
      success: false, 
      message: 'An error occurred during login' 
    });
  }
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
