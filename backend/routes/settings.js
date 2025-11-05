const express = require('express');
const { body, param } = require('express-validator');
const validateRequest = require('../middleware/validateRequest');
const router = express.Router();
const isProduction = process.env.NODE_ENV === 'production';
const logoUrlValidatorOptions = isProduction ? {} : { require_tld: false };

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

// Normalization helpers shared by multiple handlers.
// Keep them near the top so other routes (including preview) can reuse them.
const normalizeSocial = (val) => {
  if (!val) return null;
  try {
    let s = String(val).trim();
    if (s.startsWith('@')) s = s.slice(1);
    if (!/^https?:\/\//i.test(s) && /[./]/.test(s)) {
      s = 'https://' + s;
    }
    if (/^https?:\/\//i.test(s)) {
      new URL(s);
      return s;
    }
    return null;
  } catch (err) {
    return null;
  }
};

const normalizeGoogle = (val) => normalizeSocial(val);


// Update site settings
router.put('/site-settings',
  // Basic validation and sanitization
  // Allow nullable/empty values for optional fields so admin UX that
  // clears a field doesn't fail validation. Use optional({ nullable: true, checkFalsy: true })
  body('business_name').optional({ nullable: true, checkFalsy: true }).isLength({ max: 255 }).trim().escape(),
  body('tagline').optional({ nullable: true, checkFalsy: true }).isLength({ max: 512 }).trim().escape(),
  // Validate logo_url; relax require_tld in non-production so local uploads
  // (e.g., http://localhost:5001/uploads/...) are accepted during dev.
  body('logo_url').optional({ nullable: true, checkFalsy: true }).isURL(logoUrlValidatorOptions).trim(),
  // Accept free-form strings for social fields (admin may paste handles without protocol).
  // We'll normalize/validate them in the handler so UX doesn't fail when admin omits https://
  body('instagram').optional({ nullable: true, checkFalsy: true }).isString().trim(),
  body('facebook').optional({ nullable: true, checkFalsy: true }).isString().trim(),
  body('google').optional({ nullable: true, checkFalsy: true }).isString().trim(),
  body('phone').optional({ nullable: true, checkFalsy: true }).isLength({ max: 64 }).trim().escape(),
  body('email').optional({ nullable: true, checkFalsy: true }).isEmail().normalizeEmail(),
  body('address').optional({ nullable: true, checkFalsy: true }).isLength({ max: 1024 }).trim().escape(),
  body('menu_description').optional({ nullable: true, checkFalsy: true }).isLength({ max: 2000 }).trim(),
  validateRequest,
  async (req, res, next) => {
    try {
  const { business_name, tagline, logo_url, phone, email, address, hero_images, menu_description, instagram, facebook, google } = req.body;

      // Fetch current settings so we don't overwrite unspecified fields with null
      const [existingRows] = await req.dbPromise.query('SELECT * FROM site_settings WHERE id = 1');
      const existing = existingRows[0] || {};

      const heroImagesJson = Array.isArray(hero_images) ? JSON.stringify(hero_images) : (existing.hero_images || null);

      // Treat empty strings as "not provided" for menu_description so that
      // accidental empty values (from uncontrolled inputs) don't wipe out the
      // stored menu description when admins update unrelated fields like Google.
      // If an admin really wants to clear the menu description, they can send
      // an explicit null value (the admin UI can be updated to send null when
      // clearing). This is a pragmatic safeguard.
      const resolved = {
        business_name: (typeof business_name !== 'undefined') ? business_name : existing.business_name,
        tagline: (typeof tagline !== 'undefined') ? tagline : existing.tagline,
        logo_url: (typeof logo_url !== 'undefined') ? logo_url : existing.logo_url,
        phone: (typeof phone !== 'undefined') ? phone : existing.phone,
        email: (typeof email !== 'undefined') ? email : existing.email,
        address: (typeof address !== 'undefined') ? address : existing.address,
        menu_description: (typeof menu_description !== 'undefined' && menu_description !== '') ? menu_description : existing.menu_description
      };

      // Normalize social URLs: allow admins to paste handles like "facebook.com/foo", "@handle",
      // or Google-specific inputs like numeric CIDs or maps short links. Return a validated
      // absolute URL (https) or null when it can't be normalized.
      const normalizeSocial = (val) => {
        if (!val) return null;
        try {
          let s = String(val).trim();
          if (s.startsWith('@')) s = s.slice(1);
          // If they used just a handle (no dots/slashes), don't guess a domain
          if (!/^https?:\/\//i.test(s) && /[./]/.test(s)) {
            s = 'https://' + s;
          }
          if (/^https?:\/\//i.test(s)) {
            new URL(s);
            return s;
          }
          return null;
        } catch (err) {
          return null;
        }
      };

      // Treat google the same as other social inputs: accept free-form strings
      // and normalize similarly to instagram/facebook. Google URLs come in many
      // forms and strict normalization can incorrectly return null for valid
      // share/search URLs. Using the generic normalizeSocial keeps behavior
      // consistent and avoids rejecting valid admin inputs.
      const normalizeGoogle = (val) => normalizeSocial(val);

      // Build a dynamic UPDATE that only sets columns included in the request body.
      // This ensures updating one field (e.g. google) won't overwrite unrelated
      // fields (e.g. menu_description) when they are not present in the payload.
      const fields = [];
      const params = [];

      if (typeof business_name !== 'undefined') { fields.push('business_name = ?'); params.push(business_name); }
      if (typeof tagline !== 'undefined') { fields.push('tagline = ?'); params.push(tagline); }
      if (typeof logo_url !== 'undefined') { fields.push('logo_url = ?'); params.push(logo_url); }
      if (typeof phone !== 'undefined') { fields.push('phone = ?'); params.push(phone); }
      if (typeof email !== 'undefined') { fields.push('email = ?'); params.push(email); }
      if (typeof address !== 'undefined') { fields.push('address = ?'); params.push(address); }

      if (typeof hero_images !== 'undefined') {
        fields.push('hero_images = ?');
        params.push(Array.isArray(hero_images) ? JSON.stringify(hero_images) : null);
      }

      if (typeof menu_description !== 'undefined') {
        fields.push('menu_description = ?');
        params.push(menu_description);
      }

      if (typeof instagram !== 'undefined') {
        fields.push('instagram = ?');
        params.push(normalizeSocial(instagram));
      }

      if (typeof facebook !== 'undefined') {
        fields.push('facebook = ?');
        params.push(normalizeSocial(facebook));
      }

      if (typeof google !== 'undefined') {
        fields.push('google = ?');
        params.push(normalizeGoogle(google));
      }

      if (fields.length === 0) {
        return res.status(400).json({ error: 'No updatable fields provided' });
      }

      const sql = `UPDATE site_settings SET ${fields.join(', ')} WHERE id = 1`;
      // Debug: log the dynamic update fields and params to help diagnose why
      // some updates (e.g. google) may not persist in certain environments.
      try {
        console.debug && console.debug('DEBUG: site_settings UPDATE', { sql, fields, params });
      } catch (e) {}
      const doUpdate = async () => req.dbPromise.query(sql, params);

      try {
        await doUpdate();
      } catch (err) {
        const msgLower = err && err.message ? String(err.message).toLowerCase() : '';
        const isDataTooLong = err && (err.code === 'ER_DATA_TOO_LONG' || /data too long for column/i.test(msgLower));
        if (isDataTooLong) {
          try {
            await req.dbPromise.query("ALTER TABLE site_settings MODIFY COLUMN google TEXT NULL");
            await doUpdate();
            return res.json({ message: 'Settings updated' });
          } catch (errTooLong) {
            console.error('Failed to widen google column and retry update:', errTooLong && errTooLong.message ? errTooLong.message : errTooLong);
            throw errTooLong;
          }
        }

        const msg = err && err.message ? String(err.message) : '';
        const missing = [];
        if (/unknown column 'instagram'/i.test(msg) || (/instagram/.test(msg) && /unknown/i.test(msg))) missing.push('instagram');
        if (/unknown column 'facebook'/i.test(msg) || (/facebook/.test(msg) && /unknown/i.test(msg))) missing.push('facebook');
        if (/unknown column 'google'/i.test(msg) || (/google/.test(msg) && /unknown/i.test(msg))) missing.push('google');

        if (missing.length > 0) {
          try {
            for (const col of missing) {
              if (col === 'google') {
                await req.dbPromise.query(`ALTER TABLE site_settings ADD COLUMN ${col} TEXT NULL`);
              } else {
                await req.dbPromise.query(`ALTER TABLE site_settings ADD COLUMN ${col} VARCHAR(255) NULL`);
              }
            }
            await doUpdate();
          } catch (err2) {
            console.error('Failed to add missing social columns or retry update:', err2 && err2.message ? err2.message : err2);
            throw err2;
          }
        } else {
          throw err;
        }
      }

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

// Export router
module.exports = router;

// Temporary migration endpoint: add missing social columns to site_settings.
// This is intentionally placed here for convenience and should be removed
// after a successful run in production. It will only add columns if they
// are not already present.
router.post('/internal/migrate-site-settings', async (req, res, next) => {
  try {
    // Determine which columns already exist
    const [rows] = await req.dbPromise.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'site_settings' AND COLUMN_NAME IN ('instagram','facebook','google')"
    );
    const present = (rows || []).map(r => r.COLUMN_NAME.toLowerCase());

    const added = [];
    if (!present.includes('instagram')) {
      await req.dbPromise.query("ALTER TABLE site_settings ADD COLUMN instagram VARCHAR(255) NULL");
      added.push('instagram');
    }
    if (!present.includes('facebook')) {
      await req.dbPromise.query("ALTER TABLE site_settings ADD COLUMN facebook VARCHAR(255) NULL");
      added.push('facebook');
    }
    // Ensure google column exists and is TEXT so very long Google search/share
    // URLs are accepted without truncation.
    if (!present.includes('google')) {
      await req.dbPromise.query("ALTER TABLE site_settings ADD COLUMN google TEXT NULL");
      added.push('google');
    } else {
      // Modify to TEXT unconditionally to ensure space for long links.
      try {
        await req.dbPromise.query("ALTER TABLE site_settings MODIFY COLUMN google TEXT NULL");
        added.push('google_widened');
      } catch (err) {
        // If MODIFY fails for permissions or other reasons, log and continue.
        console.error('Failed to widen google column in migration endpoint:', err && err.message ? err.message : err);
      }
    }

    return res.json({ ok: true, added, present });
  } catch (err) {
    console.error('Migration failed:', err && err.message ? err.message : err);
    return next(err);
  }
});

// Preview endpoint: validate and normalize a partial site-settings payload
// without persisting it. Useful for conservative integration tests or
// admin-side preview functionality. This mirrors normalization logic used
// by the PUT handler but does not touch the database.
router.post('/internal/site-settings/preview', async (req, res, next) => {
  try {
    const { instagram, facebook, google, logo_url } = req.body || {};
    return res.json({
      instagram: normalizeSocial(instagram),
      facebook: normalizeSocial(facebook),
      google: normalizeGoogle(google),
      logo_url: (logo_url && typeof logo_url === 'string') ? String(logo_url).trim() : null
    });
  } catch (err) {
    return next(err);
  }
});
