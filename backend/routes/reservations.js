const express = require('express');
const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');
const router = express.Router();

// Rate limiter for reservation submissions: 3 requests per hour per IP
const reservationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: { error: 'Too many reservation requests from this IP, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

/*
  Reservations routes

  Purpose:
  - Provide public reservation creation and admin management endpoints.

  Endpoints:
  - GET /api/reservations
  - POST /api/reservations
  - PUT /api/reservations/:id
  - DELETE /api/reservations/:id

  Notes:
  - Ensure `reservation_date` and `reservation_time` are validated and use
    a consistent format compatible with MySQL.
  - Consider rate-limiting or adding captcha on the public POST endpoint to
    reduce spam and automated bookings.
  Developer annotations:
  - Inputs (POST /api/reservations): { name, email, phone?, reservation_date, reservation_time, number_of_guests, special_requests? }
  - Inputs (PUT /api/reservations/:id): { status }
  - Outputs: GET returns array of reservations; POST returns { id, message } on success.
  - Security: validate and sanitize inputs; rate-limit public reservation POSTs; consider sending confirmation emails with unique tokens to verify bookings.
  - Example: curl -X POST http://localhost:5001/api/reservations -H "Content-Type: application/json" -d '{"name":"John","email":"j@x.com","reservation_date":"2025-10-15","reservation_time":"19:00","number_of_guests":4}'
  
  Last reviewed: 2025-10-24 — validated input guidance and rate-limit recommendation.
*/

// Get all reservations
router.get('/reservations', (req, res) => {
  req.db.query(
    'SELECT * FROM reservations ORDER BY reservation_date DESC, reservation_time DESC',
    (err, results) => {
      if (err) {
        logger.error('Failed to fetch reservations', { error: err.message, stack: err.stack });
        return res.status(500).json({ error: err.message });
      }
      res.json(results);
    }
  );
});

const { body } = require('express-validator');
const validateRequest = require('../middleware/validateRequest');

// Create reservation (with express-validator + async/await + rate limiting)
router.post('/reservations',
  reservationLimiter,
  // Validation chain
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('phone').trim().notEmpty().withMessage('Phone is required'),
  body('reservation_date').trim().notEmpty().withMessage('Reservation date is required').matches(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/).withMessage('Reservation date must be in YYYY-MM-DD format'),
  body('reservation_time').trim().notEmpty().withMessage('Reservation time is required').matches(/^([01][0-9]|2[0-3]):([0-5][0-9])$/).withMessage('Reservation time must be in HH:MM 24-hour format'),
  body('number_of_guests').notEmpty().withMessage('Number of guests is required').bail().isInt({ min: 1 }).withMessage('Number of guests must be a positive integer'),
  validateRequest,
  async (req, res, next) => {
    try {
      const { name, email, phone, reservation_date, reservation_time, number_of_guests, special_requests } = req.body;
      const guests = Number(number_of_guests);

      if (!req.dbPromise) return res.status(500).json({ error: 'Database not available' });

      const [result] = await req.dbPromise.query(
        'INSERT INTO reservations (name, email, phone, reservation_date, reservation_time, number_of_guests, special_requests) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [name, email, phone, reservation_date, reservation_time, guests, special_requests]
      );

      logger.info('Reservation created', { id: result.insertId, email, reservation_date, reservation_time });
      return res.json({ id: result.insertId, message: 'Reservation created' });
    } catch (err) {
      return next(err);
    }
  }
);

// Update reservation status
router.put('/reservations/:id', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  req.db.query(
    'UPDATE reservations SET status = ? WHERE id = ?',
    [status, id],
    (err) => {
      if (err) {
        logger.error('Failed to update reservation', { error: err.message, stack: err.stack, id, status });
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: 'Reservation updated' });
    }
  );
});

// Delete reservation
router.delete('/reservations/:id', (req, res) => {
  const { id } = req.params;
  req.db.query('DELETE FROM reservations WHERE id = ?', [id], (err) => {
    if (err) {
      logger.error('Failed to delete reservation', { error: err.message, stack: err.stack, id });
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: 'Reservation deleted' });
  });
});

module.exports = router;
