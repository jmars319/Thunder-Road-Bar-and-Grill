const express = require('express');
const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');
const router = express.Router();

// Basic rate limiter for public-facing contact POSTs: 6 requests per hour per IP
const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 6,
  message: { error: 'Too many contact requests from this IP, please try again later' }
});

// Simple sanitizer to remove control characters
function sanitizeString(s) {
  if (typeof s !== 'string') return s;
  return s.replace(/[\x00-\x1F\x7F]/g, '').trim();
}

// Basic email validation
function isValidEmail(e) {
  if (!e || typeof e !== 'string') return false;
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e) && e.length <= 255;
}

/*
  Contact routes

  Purpose:
  - Receive messages from the public site and provide admin endpoints to
    review, mark, and delete messages.

  Endpoints:
  - GET /api/contact/messages
  - POST /api/contact
  - PUT /api/contact/messages/:id
  - DELETE /api/contact/messages/:id

  Notes:
  - The public POST should validate inputs (lengths, email format) and
    include spam protections (rate limiting and optionally a captcha).
  - Messages are stored in `contact_messages`. Consider indexing the
    email/submitted_at columns for faster admin queries.
  Developer annotations:
  - Inputs (POST /api/contact): { name, email, phone?, subject, message }
  - Inputs (PUT /api/contact/messages/:id): { is_read: boolean }
  - Outputs: standard JSON arrays or objects; errors return { error: string } with appropriate HTTP status codes.
  - Security: validate/sanitize inputs to avoid XSS in admin views and use rate-limiting to avoid spam.
  - Example: curl -X POST http://localhost:5001/api/contact -H "Content-Type: application/json" -d '{"name":"Jane","email":"jane@example.com","subject":"Hello","message":"Hi"}'
*/

// Last updated: 2025-10-21 — documentation sweep: added rate-limit note and input validation guidance.

// Get contact messages (paginated for admin)
// Query params: page (1-based), per_page
router.get('/contact/messages', (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const per_page = Math.min(100, Math.max(10, parseInt(req.query.per_page, 10) || 25));
  const offset = (page - 1) * per_page;

  // Get total count and page slice
  req.db.query('SELECT COUNT(*) AS total FROM contact_messages', (cntErr, cntRows) => {
    if (cntErr) {
      logger.error('Failed to count contact messages', { error: cntErr.message, stack: cntErr.stack });
      return res.status(500).json({ error: cntErr.message });
    }
    const total = (cntRows && cntRows[0] && cntRows[0].total) || 0;
    req.db.query(
      'SELECT * FROM contact_messages ORDER BY submitted_at DESC LIMIT ? OFFSET ?',
      [per_page, offset],
      (err, results) => {
        if (err) {
          logger.error('Failed to fetch contact messages', { error: err.message, stack: err.stack, page, per_page });
          return res.status(500).json({ error: err.message });
        }
        res.json({ total, page, per_page, messages: results });
      }
    );
  });
});

// Submit contact message (rate-limited)
router.post('/contact', contactLimiter, (req, res) => {
  let { name, email, phone, subject, message } = req.body || {};

  // sanitize
  name = sanitizeString(name || '');
  email = sanitizeString(email || '');
  phone = sanitizeString(phone || '');
  subject = sanitizeString(subject || '');
  message = sanitizeString(message || '');

  // validate
  if (!name || name.length > 100) return res.status(400).json({ error: 'Name is required and must be <= 100 chars' });
  if (!isValidEmail(email)) return res.status(400).json({ error: 'A valid email is required' });
  if (!message || message.length > 2000) return res.status(400).json({ error: 'Message is required and must be <= 2000 chars' });
  if (subject.length > 255) return res.status(400).json({ error: 'Subject must be <= 255 chars' });
  if (phone.length > 50) return res.status(400).json({ error: 'Phone must be <= 50 chars' });

  req.db.query(
    'INSERT INTO contact_messages (name, email, phone, subject, message) VALUES (?, ?, ?, ?, ?)',
    [name, email, phone, subject, message],
    (err, result) => {
      if (err) {
        logger.error('Failed to insert contact message', { error: err.message, stack: err.stack, email });
        return res.status(500).json({ error: err.message });
      }
      logger.info('Contact message submitted', { id: result.insertId, email });
      res.json({ id: result.insertId, message: 'Message sent successfully' });
    }
  );
});

// Mark message as read
router.put('/contact/messages/:id', (req, res) => {
  const { id } = req.params;
  const { is_read } = req.body;
  
  req.db.query(
    'UPDATE contact_messages SET is_read = ? WHERE id = ?',
    [is_read, id],
    (err) => {
      if (err) {
        logger.error('Failed to update contact message', { error: err.message, stack: err.stack, id });
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: 'Message updated' });
    }
  );
});

// Delete contact message
router.delete('/contact/messages/:id', (req, res) => {
  const { id } = req.params;
  req.db.query('DELETE FROM contact_messages WHERE id = ?', [id], (err) => {
    if (err) {
      logger.error('Failed to delete contact message', { error: err.message, stack: err.stack, id });
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: 'Message deleted' });
  });
});

module.exports = router;
