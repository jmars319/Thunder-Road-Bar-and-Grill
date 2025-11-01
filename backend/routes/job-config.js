const express = require('express');
const router = express.Router();
const adminAuth = require('../middleware/adminAuth');

// JOB POSITIONS
router.get('/job-positions', adminAuth, (req, res) => {
  req.db.query('SELECT * FROM job_positions ORDER BY display_order, id', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// Public endpoint: only return positions that are marked active/open.
// This is intentionally unauthenticated so the public site can show which
// positions are currently open without exposing admin controls.
router.get('/job-positions/public', (req, res) => {
  req.db.query('SELECT id, name, description FROM job_positions WHERE is_active = 1 ORDER BY display_order, id', (err, results) => {
    if (err) {
      if (err && (err.code === 'ER_NO_SUCH_TABLE' || /doesn't exist/.test(err.message))) {
        return res.json([]);
      }
      return res.status(500).json({ error: err.message });
    }
    res.json(results || []);
  });
});

router.post('/job-positions', adminAuth, (req, res) => {
  const { name, description, display_order = 0, is_active = true } = req.body;
  req.db.query('INSERT INTO job_positions (name, description, display_order, is_active) VALUES (?, ?, ?, ?)', [name, description, display_order, is_active], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: result.insertId, message: 'Position created' });
  });
});

router.delete('/job-positions/:id', adminAuth, (req, res) => {
  const { id } = req.params;
  req.db.query('DELETE FROM job_positions WHERE id = ?', [id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Position deleted' });
  });
});

// Update a position (admin) - allow toggling is_active without removing the position
router.put('/job-positions/:id', adminAuth, (req, res) => {
  const { id } = req.params;
  const { is_active } = req.body;
  const activeVal = is_active ? 1 : 0;
  req.db.query('UPDATE job_positions SET is_active = ? WHERE id = ?', [activeVal, id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Position updated' });
  });
});

// APPLICATION FIELDS
// Public GET so the public site can render dynamic application fields.
// Mutating endpoints remain admin-protected.
router.get('/application-fields', (req, res) => {
  req.db.query('SELECT * FROM application_fields ORDER BY display_order, id', (err, results) => {
    if (err) {
      // If the table doesn't exist (fresh DB), return empty array so the public
      // site can continue to function instead of failing with 500.
      if (err && (err.code === 'ER_NO_SUCH_TABLE' || /doesn't exist/.test(err.message))) {
        return res.json([]);
      }
      return res.status(500).json({ error: err.message });
    }
    res.json(results || []);
  });
});

router.post('/application-fields', adminAuth, (req, res) => {
  const { field_name, field_type = 'text', required = false, options = null, display_order = 0 } = req.body;
  req.db.query('INSERT INTO application_fields (field_name, field_type, required, options, display_order) VALUES (?, ?, ?, ?, ?)', [field_name, field_type, required, options, display_order], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: result.insertId, message: 'Field created' });
  });
});

router.delete('/application-fields/:id', adminAuth, (req, res) => {
  const { id } = req.params;
  req.db.query('DELETE FROM application_fields WHERE id = ?', [id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Field deleted' });
  });
});

module.exports = router;
