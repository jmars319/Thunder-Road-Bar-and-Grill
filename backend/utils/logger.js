/*
  Logger utility

  Purpose:
  - Provides centralized structured logging with winston
  - Supports different log levels (error, warn, info, debug)
  - Configures output format and transports based on environment
  - Strips sensitive data from logs

  Usage:
  - const logger = require('./utils/logger');
  - logger.info('Server started', { port: 5001 });
  - logger.error('Database error', { error: err.message });
  - logger.warn('Missing configuration', { key: 'JWT_SECRET' });
  - logger.debug('Request received', { path: req.path });

  Last updated: 2025-11-05 — Created centralized logging system
*/

const winston = require('winston');
const path = require('path');

// Determine log level based on environment
const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';
const logLevel = process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug');

// Custom format for console output in development
const devFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} ${level}: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    return msg;
  })
);

// JSON format for production (structured logging)
const prodFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create transports array
const transports = [];

// Console transport (always enabled, but formatted differently per env)
transports.push(
  new winston.transports.Console({
    format: isDevelopment ? devFormat : prodFormat,
  })
);

// File transport for errors in production
if (isProduction) {
  transports.push(
    new winston.transports.File({
      filename: path.join(__dirname, '..', 'logs', 'error.log'),
      level: 'error',
      format: prodFormat,
    })
  );
  
  transports.push(
    new winston.transports.File({
      filename: path.join(__dirname, '..', 'logs', 'combined.log'),
      format: prodFormat,
    })
  );
}

// Create logger instance
const logger = winston.createLogger({
  level: logLevel,
  transports,
  // Don't exit on errors
  exitOnError: false,
});

// Helper to sanitize sensitive data from logs
function sanitizeLogData(data) {
  if (!data || typeof data !== 'object') return data;
  
  const sanitized = { ...data };
  const sensitiveKeys = ['password', 'token', 'secret', 'authorization', 'cookie', 'password_hash'];
  
  for (const key of Object.keys(sanitized)) {
    if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
      sanitized[key] = '[REDACTED]';
    }
  }
  
  return sanitized;
}

// Wrap logger methods to sanitize data
const safeLogger = {
  error: (message, meta) => logger.error(message, sanitizeLogData(meta)),
  warn: (message, meta) => logger.warn(message, sanitizeLogData(meta)),
  info: (message, meta) => logger.info(message, sanitizeLogData(meta)),
  debug: (message, meta) => logger.debug(message, sanitizeLogData(meta)),
  http: (message, meta) => logger.http(message, sanitizeLogData(meta)),
};

module.exports = safeLogger;
