const { validationResult } = require('express-validator');

// Middleware to format express-validator errors into { errors: [{ field, error }] }
module.exports = function validateRequest(req, res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  const errors = result.array().map(e => ({ field: e.param, error: e.msg }));
  const err = new Error('Validation failed');
  err.status = 400;
  err.errors = errors;
  return next(err);
};
