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
require('dotenv').config();

const app = express();
// Default to 5001 to match the frontend's default API_BASE (http://localhost:5001/api)
const PORT = process.env.PORT || 5001;

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

app.use(cors({ origin: FRONTEND_URL }));

// Limit JSON body size to avoid large payload abuse
app.use(express.json({ limit: '1mb' }));

// Serve uploaded files from absolute path (uploads/). Add caching for static
// assets (images) to reduce repeated transfer; the admin UI can invalidate
// caches by emitting events or bumping file URLs on update.
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  etag: true,
  maxAge: '1h'
}));

// Basic security headers (small subset of what helmet provides)
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  // Cross-Origin-Resource-Policy helps mitigate some mixed-content/resource attacks
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  next();
});

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
    console.error('Database connection failed:', err);
  } else {
    conn.release();
    console.log('\u2705 Connected to MySQL database (pool)');
  }
});

// Make the pool available to routes via req.db for compatibility with
// existing code that calls req.db.query(sql, params, cb).
app.use((req, res, next) => {
  req.db = dbPool;
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

// Limit uploads to 10MB and allow common image/video/document types
// NOTE: allowing documents (PDF/DOC/DOCX) is necessary for resume uploads.
// Keep size reasonable to avoid abuse; scan or validate files further if needed.
const upload = multer({ 
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

// Start Server
app.listen(PORT, () => {
  console.log(`\ud83d\ude80 Server running on http://localhost:${PORT}`);
});
