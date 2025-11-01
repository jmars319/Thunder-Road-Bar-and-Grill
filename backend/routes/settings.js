const express = require('express');
const { body, param } = require('express-validator');
const validateRequest = require('../middleware/validateRequest');
const router = express.Router();

/*
  Settings routes

  Purpose:
  - Serve site-wide configuration, navigation, business hours, 'about' page
    content and footer columns. These endpoints are used by the public site
    to render content and by the admin UI to edit site data.

  Public endpoints in this file (prefixed by /api when mounted):
  - GET  /site-settings        -> { business_name, tagline, logo_url, phone, email, address }
  - PUT  /site-settings        -> body: { business_name, tagline, logo_url, phone, email, address }
  - GET  /navigation          -> [{ id, label, url, display_order }]
  - GET  /business-hours      -> [{ id, opening_time, closing_time, is_closed }]
  - PUT  /business-hours/:id  -> body: { opening_time, closing_time, is_closed }
  - GET  /about               -> { header, paragraph, phone, email, address, map_embed_url }
  - PUT  /about               -> body: { header, paragraph, phone, email, address, map_embed_url }
  - GET  /footer-columns      -> [{ id, column_title, links: [{ id, label, url }] }]

  Notes:
  - These routes perform direct SQL queries and return raw rows. In an
    admin context, ensure these routes are protected with authentication
    and authorization middleware.
  - For input validation and stricter error handling, adopt a schema
    validator (express-validator or Joi) and normalize date/time formats
    for business hours.
  Developer annotations:
  - Outputs: GET endpoints return objects/arrays for site settings, navigation, business hours, about content, and footer columns.
  - Inputs: PUT endpoints accept JSON matching the described fields above. Validate lengths and sanitize any HTML stored for `about` content.
  - Security: ensure admin-only protection on mutation endpoints (PUT/POST/DELETE). Consider using transactions for multi-step updates and a safe pattern for file URLs (store metadata, not raw user input).
  - Example: curl http://localhost:5001/api/site-settings
  
  Last reviewed: 2025-10-24 — guidance reviewed; suggest adding schema validation (express-validator) when time permits.
*/

// Get site settings
router.get('/site-settings', async (req, res, next) => {
  try {
    const [rows] = await req.dbPromise.query('SELECT * FROM site_settings WHERE id = 1');
    const row = rows[0] || {};
    // parse hero_images JSON if present
    try {
      row.hero_images = row.hero_images ? JSON.parse(row.hero_images) : [];
    } catch (e) {
      row.hero_images = [];
    }
    // cache short-lived public responses to reduce repeat load on the server
    res.set('Cache-Control', 'public, max-age=300');
    return res.json(row);
  } catch (err) {
    // If the schema/table is missing in this environment, return a safe
    // default rather than a 500 so the public site remains functional.
    if (err && (err.code === 'ER_NO_SUCH_TABLE' || /doesn't exist/.test(err.message))) {
      console.warn('Missing site_settings table; returning empty settings for public site');
      return res.json({});
    }
    return next(err);
  }
});

// Update site settings
router.put('/site-settings',
  // Basic validation and sanitization
  body('business_name').optional().isLength({ max: 255 }).trim().escape(),
  body('tagline').optional().isLength({ max: 512 }).trim().escape(),
  body('logo_url').optional().isURL().trim(),
  body('phone').optional().isLength({ max: 64 }).trim().escape(),
  body('email').optional().isEmail().normalizeEmail(),
  body('address').optional().isLength({ max: 1024 }).trim().escape(),
  body('menu_description').optional().isLength({ max: 2000 }).trim(),
  validateRequest,
  async (req, res, next) => {
    try {
      const { business_name, tagline, logo_url, phone, email, address, hero_images, menu_description } = req.body;
      const heroImagesJson = Array.isArray(hero_images) ? JSON.stringify(hero_images) : null;

      await req.dbPromise.query(
        'UPDATE site_settings SET business_name = ?, tagline = ?, logo_url = ?, phone = ?, email = ?, address = ?, hero_images = ?, menu_description = ? WHERE id = 1',
        [business_name, tagline, logo_url, phone, email, address, heroImagesJson, menu_description || null]
      );

      return res.json({ message: 'Settings updated' });
    } catch (err) {
      console.error('Failed to update site_settings:', err && err.message ? err.message : err);
      return next(err);
    }
  }
);

// Get navigation links
router.get('/navigation', async (req, res, next) => {
  try {
    const [results] = await req.dbPromise.query('SELECT * FROM navigation_links ORDER BY display_order');
    return res.json(results);
  } catch (err) {
    if (err && (err.code === 'ER_NO_SUCH_TABLE' || /doesn't exist/.test(err.message))) {
      console.warn('Missing navigation_links table; returning empty list for public site');
      return res.json([]);
    }
    return next(err);
  }
});

// Get business hours
router.get('/business-hours', async (req, res, next) => {
  try {
    const [results] = await req.dbPromise.query('SELECT * FROM business_hours ORDER BY id');
    res.set('Cache-Control', 'public, max-age=300');
    return res.json(results);
  } catch (err) {
    if (err && (err.code === 'ER_NO_SUCH_TABLE' || /doesn't exist/.test(err.message))) {
      console.warn('Missing business_hours table; returning empty hours for public site');
      res.set('Cache-Control', 'public, max-age=300');
      return res.json([]);
    }
    return next(err);
  }
});

// Update business hours
router.put('/business-hours/:id',
  param('id').isInt().toInt(),
  body('opening_time').optional().isString().trim(),
  body('closing_time').optional().isString().trim(),
  body('is_closed').optional().isBoolean(),
  validateRequest,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { opening_time, closing_time, is_closed } = req.body;
      await req.dbPromise.query(
        'UPDATE business_hours SET opening_time = ?, closing_time = ?, is_closed = ? WHERE id = ?',
        [opening_time, closing_time, is_closed, id]
      );
      return res.json({ message: 'Hours updated' });
    } catch (err) {
      return next(err);
    }
  }
);

// Get about content
router.get('/about', async (req, res, next) => {
  try {
    const [results] = await req.dbPromise.query('SELECT * FROM about_content WHERE id = 1');
    return res.json(results[0] || {});
  } catch (err) {
    if (err && (err.code === 'ER_NO_SUCH_TABLE' || /doesn't exist/.test(err.message))) {
      console.warn('Missing about_content table; returning empty about content');
      return res.json({});
    }
    return next(err);
  }
});

// Update about content
router.put('/about',
  body('header').optional().isLength({ max: 255 }).trim(),
  body('paragraph').optional().isLength({ max: 5000 }).trim(),
  body('phone').optional().isLength({ max: 64 }).trim(),
  body('email').optional().isEmail().normalizeEmail(),
  body('address').optional().isLength({ max: 1024 }).trim(),
  body('map_embed_url').optional().isURL().trim(),
  validateRequest,
  async (req, res, next) => {
    try {
      const { header, paragraph, phone, email, address, map_embed_url } = req.body;
      await req.dbPromise.query(
        'UPDATE about_content SET header = ?, paragraph = ?, phone = ?, email = ?, address = ?, map_embed_url = ? WHERE id = 1',
        [header, paragraph, phone, email, address, map_embed_url]
      );
      return res.json({ message: 'About content updated' });
    } catch (err) {
      return next(err);
    }
  }
);

// Get footer columns
router.get('/footer-columns', async (req, res, next) => {
  const query = `
    SELECT 
      fc.id as column_id,
      fc.column_title,
      fc.display_order as column_order,
      fl.id as link_id,
      fl.label as link_label,
      fl.url as link_url,
      fl.display_order as link_order
    FROM footer_columns fc
    LEFT JOIN footer_links fl ON fc.id = fl.column_id
    ORDER BY fc.display_order, fl.display_order
  `;

  try {
    const [results] = await req.dbPromise.query(query);

    const columns = {};
    results.forEach(row => {
      if (!columns[row.column_id]) {
        columns[row.column_id] = {
          id: row.column_id,
          column_title: row.column_title,
          display_order: row.column_order,
          links: []
        };
      }
      
      if (row.link_id) {
        columns[row.column_id].links.push({
          id: row.link_id,
          label: row.link_label,
          url: row.link_url,
          display_order: row.link_order
        });
      }
    });

    res.set('Cache-Control', 'public, max-age=300');
    return res.json(Object.values(columns));
  } catch (err) {
    if (err && (err.code === 'ER_NO_SUCH_TABLE' || /doesn't exist/.test(err.message))) {
      console.warn('Missing footer_columns/footer_links tables; returning empty columns');
      res.set('Cache-Control', 'public, max-age=300');
      return res.json([]);
    }
    return next(err);
  }
});

module.exports = router;
