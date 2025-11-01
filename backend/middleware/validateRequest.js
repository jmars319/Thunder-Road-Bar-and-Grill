const { validationResult } = require('express-validator');

// Middleware to format express-validator errors into { errors: [{ field, error }] }
module.exports = function validateRequest(req, res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  // Log validation failures for easier debugging in development.
  // This prints the request path, the parsed request body, and the
  // validation error array so we can quickly see why a client-side
  // submission was rejected.
  try {
    console.warn('Validation failed for', req.method, req.path);
    console.warn('Request body:', req.body);
    console.warn('Validation errors:', result.array());
  } catch (e) {
    // swallow logging errors
  }

  const errors = result.array().map(e => ({ field: e.param, error: e.msg }));
  const err = new Error('Validation failed');
  err.status = 400;
  err.errors = errors;
  return next(err);
};
