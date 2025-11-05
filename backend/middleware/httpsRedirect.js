const logger = require('../utils/logger');

/**
 * HTTPS Redirect Middleware
 * 
 * Purpose:
 * - Enforce HTTPS in production by redirecting HTTP requests to HTTPS
 * - Set secure cookie flags in production
 * - Add security headers
 * 
 * Usage:
 * - Apply in server.js before routes
 * - Only active when NODE_ENV=production
 * 
 * Configuration:
 * - Set TRUST_PROXY=true if behind a proxy (Nginx, CloudFlare, etc.)
 * - Set FORCE_HTTPS=true to enable HTTPS enforcement
 * 
 * Notes:
 * - Checks X-Forwarded-Proto header for proxy scenarios
 * - Adds Strict-Transport-Security header
 * - Redirects with 301 (permanent) status
 */

function httpsRedirect(req, res, next) {
  const isProduction = process.env.NODE_ENV === 'production';
  const forceHttps = process.env.FORCE_HTTPS === 'true';
  const trustProxy = process.env.TRUST_PROXY === 'true';

  // Only enforce HTTPS in production when explicitly enabled
  if (!isProduction || !forceHttps) {
    return next();
  }

  // Determine if request is already HTTPS
  let isSecure = req.secure;
  
  // If behind a proxy, check X-Forwarded-Proto header
  if (trustProxy && req.headers['x-forwarded-proto']) {
    isSecure = req.headers['x-forwarded-proto'] === 'https';
  }

  if (!isSecure) {
    const host = req.headers.host || req.hostname;
    const redirectUrl = `https://${host}${req.url}`;
    
    logger.info('Redirecting HTTP to HTTPS', {
      originalUrl: req.url,
      redirectUrl,
      ip: req.ip,
      userAgent: req.get('user-agent')
    });

    // 301 Moved Permanently - browsers will remember this redirect
    return res.redirect(301, redirectUrl);
  }

  // Add HSTS header for HTTPS requests
  // max-age=31536000 = 1 year
  // includeSubDomains = apply to all subdomains
  // preload = allow browser preload list inclusion
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');

  next();
}

module.exports = httpsRedirect;
