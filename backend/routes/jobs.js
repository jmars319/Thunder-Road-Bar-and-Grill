const express = require('express');
const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');
const router = express.Router();

// Rate limiter for job applications: 2 requests per hour per IP
const jobApplicationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 2,
  message: { error: 'Too many job application requests from this IP, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

/*
  Jobs routes

  Purpose:
  - Accept and manage job applications. The public POST endpoint should
    allow applicants to submit resume links (or integrate with the media
    upload route to store resume files) and store applications in
    `job_applications`.

  Endpoints:
  - GET /api/jobs
  - POST /api/jobs
  - PUT /api/jobs/:id
  - DELETE /api/jobs/:id

  Notes:
  - Validate applicant input server-side (email formats, file URL safety).
  - Consider sending notifications (email or Slack) on new submissions and
    storing an `email_sent` flag to avoid duplicate alerts.
  Developer annotations:
  - Inputs (POST /api/jobs): { name, email, phone?, position, experience?, cover_letter?, resume_url? }
  - Inputs (PUT /api/jobs/:id): { status }
  - Outputs: arrays for GET, and standard JSON { id, message } for creations. Errors return { error: string }.
  - Security: sanitize user-submitted rich text (cover_letter) before rendering in admin; store file references rather than raw files when possible.
  - Example: curl -X POST http://localhost:5001/api/jobs -H "Content-Type: application/json" -d '{"name":"Alice","email":"a@x.com","position":"Server"}'
*/

// Last updated: 2025-10-21 — doc sweep: clarified resume handling and notification suggestions.

// Get all job applications
router.get('/jobs', (req, res) => {
  req.db.query(
    'SELECT * FROM job_applications ORDER BY submitted_at DESC',
    (err, results) => {
      if (err) {
        logger.error('Failed to fetch job applications', { error: err.message, stack: err.stack });
        return res.status(500).json({ error: err.message });
      }
      res.json(results);
    }
  );
});

const { body } = require('express-validator');
const validateRequest = require('../middleware/validateRequest');

// Submit job application (validated + async/await + rate-limited)
router.post('/jobs',
  jobApplicationLimiter,
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').trim().notEmpty().withMessage('Email is required').isEmail().withMessage('Email must be a valid email address'),
  body('phone').trim().notEmpty().withMessage('Phone is required'),
  body('position').trim().notEmpty().withMessage('Position is required'),
  body('experience').trim().notEmpty().withMessage('Experience is required'),
  body('availability').trim().notEmpty().withMessage('Availability is required'),
  validateRequest,
  async (req, res, next) => {
    try {
      const { name, email, phone, position, experience, availability, cover_letter, resume_url } = req.body;

      if (!req.dbPromise) return res.status(500).json({ error: 'Database not available' });

        // Server-side enforcement: if a resume_url was provided and it points to
        // our uploads directory, verify that it corresponds to a media_library
        // entry and that the file's type/size comply with the resume policy.
        if (resume_url && typeof resume_url === 'string' && resume_url.indexOf('/uploads/') !== -1) {
          // Normalize to stored form
          const normalized = resume_url.startsWith('/') ? resume_url : '/' + resume_url;
          const uploadCfg = (() => { try { return require('../config/upload.json'); } catch (e) { return null; } })();
          const resumeCfg = (uploadCfg && uploadCfg.resume) || null;

          // Look up the media entry
          const [[mediaEntry]] = await req.dbPromise.query('SELECT * FROM media_library WHERE file_url = ? LIMIT 1', [normalized]);
          if (!mediaEntry) return res.status(400).json({ error: 'Resume file not found or not uploaded' });

          if (resumeCfg) {
            // Validate mime type and size
            if (Array.isArray(resumeCfg.types) && resumeCfg.types.length && resumeCfg.types.indexOf(mediaEntry.file_type) === -1) {
              return res.status(400).json({ error: 'Uploaded resume file type is not permitted' });
            }
            if (typeof resumeCfg.maxBytes === 'number' && mediaEntry.file_size > resumeCfg.maxBytes) {
              return res.status(400).json({ error: 'Uploaded resume exceeds allowed size' });
            }
          }
        }

      const [result] = await req.dbPromise.query(
        'INSERT INTO job_applications (name, email, phone, position, experience, availability, cover_letter, resume_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [name, email, phone, position, experience, availability || null, cover_letter, resume_url]
      );

      logger.info('Job application submitted', { id: result.insertId, email, position });
      return res.json({ id: result.insertId, message: 'Application submitted' });
    } catch (err) {
      return next(err);
    }
  }
);

const adminAuth = require('../middleware/adminAuth');

// Update application status
router.put('/jobs/:id', adminAuth, (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  req.db.query(
    'UPDATE job_applications SET status = ? WHERE id = ?',
    [status, id],
    (err) => {
      if (err) {
        logger.error('Failed to update job application', { error: err.message, stack: err.stack, id, status });
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: 'Application updated' });
    }
  );
});

// Delete application
router.delete('/jobs/:id', adminAuth, (req, res) => {
  const { id } = req.params;
  req.db.query('DELETE FROM job_applications WHERE id = ?', [id], (err) => {
    if (err) {
      logger.error('Failed to delete job application', { error: err.message, stack: err.stack, id });
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: 'Application deleted' });
  });
});

module.exports = router;
