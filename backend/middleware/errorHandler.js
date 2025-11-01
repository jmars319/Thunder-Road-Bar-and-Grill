// Centralized error handling middleware
module.exports = function errorHandler(err, req, res, next) {
  // Log full error for server-side debugging
  console.error(err && err.stack ? err.stack : err);

  // If the handler set a status, use it. Otherwise default to 500.
  const status = err && err.status ? err.status : 500;

  // If this is a validation error shaped from express-validator, normalize it
  if (err && Array.isArray(err.errors)) {
    return res.status(status).json({ errors: err.errors });
  }

  // For other errors, return a sanitized message.
  return res.status(status).json({ error: err && err.message ? err.message : 'Internal server error' });
};
