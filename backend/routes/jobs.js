const express = require('express');
const router = express.Router();

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
      if (err) return res.status(500).json({ error: err.message });
      res.json(results);
    }
  );
});

// Submit job application
router.post('/jobs', (req, res) => {
  const { name, email, phone, position, experience, cover_letter, resume_url } = req.body;
  
  // Validation: require all fields except cover_letter and resume_url
  const errors = [];
  if (!name || !String(name).trim()) errors.push({ field: 'name', error: 'Name is required' });
  if (!email || !String(email).trim()) errors.push({ field: 'email', error: 'Email is required' });
  else {
    // basic email format check
    const eRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!eRe.test(String(email))) errors.push({ field: 'email', error: 'Email must be a valid email address' });
  }
  if (!phone || !String(phone).trim()) errors.push({ field: 'phone', error: 'Phone is required' });
  if (!position || !String(position).trim()) errors.push({ field: 'position', error: 'Position is required' });
  if (!('experience' in req.body) || !String(experience).trim()) errors.push({ field: 'experience', error: 'Experience is required' });
  if (!('availability' in req.body) || !String(req.body.availability || '').trim()) errors.push({ field: 'availability', error: 'Availability is required' });

  if (errors.length) return res.status(400).json({ errors });

  req.db.query(
    'INSERT INTO job_applications (name, email, phone, position, experience, cover_letter, resume_url) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [name, email, phone, position, experience, cover_letter, resume_url],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: result.insertId, message: 'Application submitted' });
    }
  );
});

const adminAuth = require('../middleware/adminAuth');

// Update application status
router.put('/jobs/:id', adminAuth, (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  req.db.query(
    'UPDATE job_applications SET status = ? WHERE id = ?',
    [status, id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Application updated' });
    }
  );
});

// Delete application
router.delete('/jobs/:id', adminAuth, (req, res) => {
  const { id } = req.params;
  req.db.query('DELETE FROM job_applications WHERE id = ?', [id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Application deleted' });
  });
});

module.exports = router;
