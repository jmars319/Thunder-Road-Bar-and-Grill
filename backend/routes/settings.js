const express = require('express');
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
router.get('/site-settings', (req, res) => {
  req.db.query('SELECT * FROM site_settings WHERE id = 1', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    const row = results[0] || {};
    // parse hero_images JSON if present
    try {
      row.hero_images = row.hero_images ? JSON.parse(row.hero_images) : [];
    } catch (e) {
      row.hero_images = [];
    }
    // cache short-lived public responses to reduce repeat load on the server
    res.set('Cache-Control', 'public, max-age=300');
    res.json(row);
  });
});

// Update site settings
router.put('/site-settings', (req, res) => {
  const { business_name, tagline, logo_url, phone, email, address, hero_images, menu_description } = req.body;
  
  // Debug: log incoming hero_images so we can trace admin saves
  console.log('PUT /site-settings received hero_images:', Array.isArray(hero_images) ? hero_images.length : typeof hero_images);

  const heroImagesJson = Array.isArray(hero_images) ? JSON.stringify(hero_images) : null;

  // Ensure hero_images and menu_description columns exist (migration may not have been applied on some environments)
  req.db.query('ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS hero_images TEXT NULL DEFAULT NULL', (alterErr) => {
    if (alterErr) {
      console.error('Failed to ensure hero_images column exists:', alterErr.message);
      // continue; next step will attempt to ALTER menu_description as well
    }

    req.db.query('ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS menu_description TEXT NULL DEFAULT NULL', (altErr2) => {
      if (altErr2) console.error('Failed to ensure menu_description column exists:', altErr2.message);

      req.db.query(
        'UPDATE site_settings SET business_name = ?, tagline = ?, logo_url = ?, phone = ?, email = ?, address = ?, hero_images = ?, menu_description = ? WHERE id = 1',
        [business_name, tagline, logo_url, phone, email, address, heroImagesJson, menu_description || null],
        (err) => {
          if (err) {
            console.error('Failed to update site_settings:', err.message);
            return res.status(500).json({ error: err.message });
          }

          // Log current DB value for easier verification
          req.db.query('SELECT hero_images, menu_description FROM site_settings WHERE id = 1', (selErr, rows) => {
            if (selErr) console.error('Failed to read back site_settings fields:', selErr.message);
            else console.log('site_settings after update:', rows[0]);
            res.json({ message: 'Settings updated' });
          });
        }
      );
    });
  });
});

// Get navigation links
router.get('/navigation', (req, res) => {
  req.db.query(
    'SELECT * FROM navigation_links ORDER BY display_order',
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(results);
    }
  );
});

// Get business hours
router.get('/business-hours', (req, res) => {
  req.db.query('SELECT * FROM business_hours ORDER BY id', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.set('Cache-Control', 'public, max-age=300');
    res.json(results);
  });
});

// Update business hours
router.put('/business-hours/:id', (req, res) => {
  const { id } = req.params;
  const { opening_time, closing_time, is_closed } = req.body;
  
  req.db.query(
    'UPDATE business_hours SET opening_time = ?, closing_time = ?, is_closed = ? WHERE id = ?',
    [opening_time, closing_time, is_closed, id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Hours updated' });
    }
  );
});

// Get about content
router.get('/about', (req, res) => {
  req.db.query('SELECT * FROM about_content WHERE id = 1', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results[0] || {});
  });
});

// Update about content
router.put('/about', (req, res) => {
  const { header, paragraph, phone, email, address, map_embed_url } = req.body;
  
  req.db.query(
    'UPDATE about_content SET header = ?, paragraph = ?, phone = ?, email = ?, address = ?, map_embed_url = ? WHERE id = 1',
    [header, paragraph, phone, email, address, map_embed_url],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'About content updated' });
    }
  );
});

// Get footer columns
router.get('/footer-columns', (req, res) => {
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

  req.db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });

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
    res.json(Object.values(columns));
  });
});

module.exports = router;
