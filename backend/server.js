/*
  Purpose:
  - Bootstrap the Express server, attach middleware (CORS, JSON body parser),
    configure file uploads, and mount route modules under `/api`.
  - Exposes a configured `upload` instance via `app.get('upload')` and attaches
    the MySQL connection on `req.db` for route handlers to use.
  Notes:
  - Keep business logic in `backend/routes/*` files. This file should remain a
    lightweight wire-up layer.
*/

const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const compression = require('compression');
const multer = require('multer');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('./utils/logger');
// Optional security middlewares. Use try/catch so server still starts if
// packages are missing in some environments.
let helmet;
let rateLimit;
try {
  helmet = require('helmet');
} catch (e) {
  helmet = null;
  logger.warn('helmet package not installed');
}
try {
  rateLimit = require('express-rate-limit');
} catch (e) {
  rateLimit = null;
  logger.warn('express-rate-limit package not installed');
}
require('dotenv').config();

const app = express();
// Default to 5001 to match the frontend's default API_BASE (http://localhost:5001/api)
const PORT = process.env.PORT || 5001;

// Hide implementation details
app.disable('x-powered-by');

// If running behind a trusted proxy (e.g., Heroku, Cloudflare), enable trust proxy
if (process.env.TRUST_PROXY === '1') {
  app.set('trust proxy', 1);
}

// Redirect HTTP -> HTTPS when FORCE_HTTPS=1 (useful behind a proxy that terminates SSL)
if (process.env.FORCE_HTTPS === '1') {
  app.use((req, res, next) => {
    const proto = req.headers['x-forwarded-proto'] || req.protocol;
    if (proto && proto.toLowerCase() === 'http') {
      const host = req.headers.host || '';
      return res.redirect(301, `https://${host}${req.originalUrl}`);
    }
    return next();
  });
}

/*
  server.js - Express app bootstrap

  This file wires the main HTTP server, middleware, database connection, and
  route modules. Keep this file lightweight: complex business logic belongs in
  the `backend/routes/` files and helper modules.

  Security & deployment notes:
  - The CORS origin is restricted to FRONTEND_URL (set in .env). For production
    environments explicitly set FRONTEND_URL to your app origin(s).
  - We set a small subset of security headers here. For stricter protection add
    `helmet()` and other hardening in front of this service (e.g., a reverse
    proxy or CDN with WAF rules).
  - Sensitive values (DB credentials, API keys) must be provided via environment
    variables; do not commit them to source.
*/

// Middleware
// Restrict CORS to the frontend origin by default (set FRONTEND_URL in .env for production)
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Enable gzip/brotli compression for responses to improve network efficiency
app.use(compression());

// Use Helmet if available for a sensible default of security headers.
if (helmet) {
  try {
    app.use(helmet({
      // Keep CSP small and permit the frontend origin and data: for images
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", FRONTEND_URL],
          styleSrc: ["'self'", "'unsafe-inline'", FRONTEND_URL],
          imgSrc: ["'self'", 'data:', FRONTEND_URL],
          connectSrc: ["'self'", FRONTEND_URL],
          frameAncestors: ["'none'"]
        }
      }
    }));
  } catch (e) {
    // If helmet fails for any reason, continue with our minimal headers below.
    logger.warn('helmet middleware failed to initialize', { error: e && e.message });
  }
}

// CORS: allow only configured origins. FRONTEND_URL may be a comma-separated list.
const allowedOrigins = (process.env.FRONTEND_URL || FRONTEND_URL).split(',').map(s => s.trim()).filter(Boolean);

// Strict CORS middleware
// - If a request has no Origin header (e.g., curl/Postman), respond with a
//   wildcard Access-Control-Allow-Origin so server-to-server tools can access it.
// - If a request includes an Origin and it exactly matches one of the
//   configured allowedOrigins, echo that origin and allow credentials.
// - Otherwise, do not set Access-Control-Allow-Origin (browser will block).
app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (!origin) {
    // Non-browser clients
    res.setHeader('Access-Control-Allow-Origin', '*');
  } else if (Array.isArray(allowedOrigins) && allowedOrigins.indexOf(origin) !== -1) {
    // Explicitly allowed origin for browser requests
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Vary', 'Origin');
  }

  // Common preflight headers
  res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  if (req.method === 'OPTIONS') return res.sendStatus(204);
  return next();
});

// Limit JSON body size to avoid large payload abuse
app.use(express.json({ limit: '1mb' }));

// Serve uploaded files from absolute path (uploads/). Add caching for static
// assets (images) to reduce repeated transfer; the admin UI can invalidate
// caches by emitting events or bumping file URLs on update.
// Ensure uploaded media responses include Cross-Origin-Resource-Policy so they
// can be embedded by the frontend when served from a different origin.
app.use('/uploads', (req, res, next) => {
  // Set CORP so the frontend can embed images from this origin.
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  // Small caching policy for uploaded assets
  res.setHeader('Cache-Control', 'public, max-age=3600');

  // If the request includes an Origin header and it matches our allowed
  // frontend origins, echo it back so cross-origin requests with
  // credentials or crossorigin attributes succeed.
  try {
    const origin = req.headers.origin;
    if (origin && Array.isArray(allowedOrigins) && allowedOrigins.indexOf(origin) !== -1) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      // If you need credentialed requests for uploads, set this to true and ensure
      // the frontend uses `withCredentials`/`crossorigin` appropriately.
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Vary', 'Origin');
    }
  } catch (e) {
    // swallow - header setting shouldn't block serving static files
  }

  next();
}, express.static(path.join(__dirname, 'uploads'), {
  etag: true,
  maxAge: '1h'
}));

// Basic security headers (small subset of what helmet provides)
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  // Cross-Origin-Resource-Policy: allow uploaded media to be embedded by the
  // frontend (which may be served from a different origin in dev). For
  // uploaded assets served from /uploads, use 'cross-origin'. For other
  // responses keep a stricter policy.
  if (req.path && req.path.startsWith('/uploads')) {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  } else {
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  }
  next();
});

// Rate limiting: apply a conservative global limit and stricter limits for write endpoints
if (rateLimit) {
  const globalLimiter = rateLimit({ windowMs: 60 * 1000, max: 300 }); // 300 requests per minute per IP
  const strictPostLimiter = rateLimit({ windowMs: 60 * 1000, max: 20, message: 'Too many requests, please try again later.' }); // 20 posts/min

  // Apply global limiter to all /api routes
  app.use('/api', globalLimiter);

  // Apply stricter limiter to common write endpoints
  app.use('/api/jobs', strictPostLimiter);
  app.use('/api/reservations', strictPostLimiter);
  app.use('/api/auth', strictPostLimiter);
}

// MySQL Connection - use a pool for better concurrency and resiliency
// Note: pool.query uses the same API as connection.query. For transaction
// support prefer pool.getConnection() and connection.beginTransaction().
const dbPool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'thunder_road',
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_CONN_LIMIT || '10', 10),
  queueLimit: 0
});

dbPool.getConnection((err, conn) => {
  if (err) {
    logger.error('Database connection failed', { error: err.message, code: err.code });
  } else {
    conn.release();
    logger.info('Connected to MySQL database (pool)');
  }
});

// Make the pool available to routes via req.db for compatibility with
// existing code that calls req.db.query(sql, params, cb).
app.use((req, res, next) => {
  req.db = dbPool;
  // provide a promise-based API for routes that opt in
  if (dbPool && typeof dbPool.promise === 'function') {
    req.dbPromise = dbPool.promise();
  }
  next();
});

// Parse cookies (used by the simple adminAuth middleware)
app.use(cookieParser());

// File Upload Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, 'uploads'));
  },
  filename: (req, file, cb) => {
    // keep original extension, but generate a safe filename
    const safeName = `${Date.now()}-${Math.random().toString(36).slice(2,8)}${path.extname(file.originalname)}`;
    cb(null, safeName);
  }
});

// Load upload configuration from the shared config file. This keeps server/client
// limits aligned and makes adjustments easier.
let upload;
try {
  const uploadConfig = require('../config/upload.json');
  const allowed = Array.isArray(uploadConfig.general && uploadConfig.general.types) ? uploadConfig.general.types : [];
  const max = (uploadConfig.general && uploadConfig.general.maxBytes) ? uploadConfig.general.maxBytes : (10 * 1024 * 1024);

  upload = multer({
    storage,
    limits: { fileSize: max },
    fileFilter: (req, file, cb) => {
      if (allowed.includes(file.mimetype)) return cb(null, true);
      const err = new Error('Invalid file type');
      err.status = 400;
      return cb(err);
    }
  });
} catch (e) {
  // Fallback to previous defaults if config isn't available.
  upload = multer({ 
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      const allowed = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'video/mp4',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];
      if (allowed.includes(file.mimetype)) return cb(null, true);
      const err = new Error('Invalid file type');
      err.status = 400;
      return cb(err);
    }
  });
}
// expose configured upload instance to routes via app.get('upload') or app.set
app.set('upload', upload);

// Import Routes
const authRoutes = require('./routes/auth');
const menuRoutes = require('./routes/menu');
const reservationRoutes = require('./routes/reservations');
const jobRoutes = require('./routes/jobs');
const mediaRoutes = require('./routes/media');
const settingsRoutes = require('./routes/settings');
const newsletterRoutes = require('./routes/newsletter');
const contactRoutes = require('./routes/contact');
const jobConfigRoutes = require('./routes/job-config');

// Mount Routes
// Each route file exports an Express Router; they are mounted under /api
// so a route defined as `router.get('/menu', ...)` will be available at
// `/api/menu`.
app.use('/api', authRoutes);
app.use('/api', menuRoutes);
app.use('/api', reservationRoutes);
app.use('/api', jobRoutes);
app.use('/api', mediaRoutes);
app.use('/api', jobConfigRoutes);
app.use('/api', settingsRoutes);
app.use('/api', newsletterRoutes);
app.use('/api', contactRoutes);

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Thunder Road API is running' });
});

// Centralized error handler (must be registered after routes)
try {
  const errorHandler = require('./middleware/errorHandler');
  app.use(errorHandler);
} catch (e) {
  logger.warn('Error handler not found', { error: e && e.message });
}

// Run any pending migrations (if knex is present) then start the server.
// Using programmatic migrations keeps deployments consistent and avoids
// applying schema changes inside request handlers.
try {
  const Knex = require('knex');
  const knexConfig = require('./knexfile');
  const knex = Knex(knexConfig);

  knex.migrate.latest()
    .then(() => logger.info('Database migrations applied'))
    .catch((err) => logger.error('Database migrations failed', { error: err.message }))
    .finally(() => {
      app.listen(PORT, () => {
        logger.info('Server started', { port: PORT, env: process.env.NODE_ENV || 'development' });
      });
    });
} catch (e) {
  // If knex isn't available for some reason, still start the server but warn.
  logger.warn('Knex not available; skipping programmatic migrations. Starting server anyway.');
  app.listen(PORT, () => {
    logger.info('Server started', { port: PORT, env: process.env.NODE_ENV || 'development' });
  });
}
