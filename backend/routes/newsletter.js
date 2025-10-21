const express = require('express');
const router = express.Router();

/*
  Newsletter routes

  Purpose:
  - Manage newsletter subscriptions. Store subscribers in `newsletter_subscribers`
    and provide admin access to list and remove subscribers.

  Endpoints:
  - GET /api/newsletter/subscribers
  - POST /api/newsletter/subscribe
  - POST /api/newsletter/unsubscribe
  - DELETE /api/newsletter/subscribers/:id

  Notes:
  - The POST subscribe endpoint handles duplicate email errors (returns 400).
  - For large subscriber lists implement pagination or add a server-side CSV
    export to support bulk downloads in the admin UI.
  Developer annotations:
  - Inputs (POST /api/newsletter/subscribe): { email, name? }
  - Inputs (POST /api/newsletter/unsubscribe): { email }
  - Outputs: GET returns array of subscriber objects; POST/DELETE return { id?, message } or { error } on failure.
  - Security: validate email format server-side and avoid leaking subscriber lists in logs. Consider rate-limiting subscribe endpoints to reduce abuse.
  - Example: curl -X POST http://localhost:5001/api/newsletter/subscribe -H "Content-Type: application/json" -d '{"email":"user@example.com","name":"User"}'
  
  Last updated: 2025-10-21 — doc sweep: clarified inputs/outputs and added security reminder.
*/

// Get all subscribers
router.get('/newsletter/subscribers', (req, res) => {
  req.db.query(
    'SELECT * FROM newsletter_subscribers ORDER BY subscribed_at DESC',
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(results);
    }
  );
});

// Subscribe to newsletter
router.post('/newsletter/subscribe', (req, res) => {
  const { email, name } = req.body;
  
  req.db.query(
    'INSERT INTO newsletter_subscribers (email, name) VALUES (?, ?)',
    [email, name],
    (err, result) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(400).json({ error: 'Email already subscribed' });
        }
        return res.status(500).json({ error: err.message });
      }
      res.json({ id: result.insertId, message: 'Subscribed successfully' });
    }
  );
});

// Unsubscribe
router.post('/newsletter/unsubscribe', (req, res) => {
  const { email } = req.body;
  
  req.db.query(
    'UPDATE newsletter_subscribers SET is_active = 0 WHERE email = ?',
    [email],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Unsubscribed successfully' });
    }
  );
});

// Delete subscriber
router.delete('/newsletter/subscribers/:id', (req, res) => {
  const { id } = req.params;
  req.db.query('DELETE FROM newsletter_subscribers WHERE id = ?', [id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Subscriber deleted' });
  });
});

module.exports = router;
