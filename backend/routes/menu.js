const express = require('express');
const router = express.Router();
const adminAuth = require('../middleware/adminAuth');

/*
  Menu routes

  Purpose:
  - Provide public menu data (categories and their items) and admin CRUD
    endpoints for categories and items used by the admin UI.

  Public endpoints:
  - GET /api/menu -> returns categories with nested items (for public site)

  Admin endpoints (CRUD for categories and items):
  - GET /api/menu/categories
  - GET /api/menu/categories/:categoryId/items
  - POST /api/menu/categories
  - PUT /api/menu/categories/:id
  - DELETE /api/menu/categories/:id
  - POST /api/menu/items
  - PUT /api/menu/items/:id
  - DELETE /api/menu/items/:id

  Notes:
  - Routes use `req.db` (a mysql2 connection) injected by server.js. Queries
    are callback-based; consider using `db.promise()` and async/await for
    clearer async flow.
  - Validate inputs at the route boundary (e.g., ensure `price` is numeric
    and `display_order` is an integer). Consider normalizing menu schema if
    the menu grows more complex.
  Developer annotations:
// Last updated: 2025-10-21 — doc sweep: noted gallery image id additions in migrations/ and API expectations.
  - Outputs: Public `GET /api/menu` returns an array of categories with nested items; admin endpoints return arrays or CRUD response objects.
  - Inputs: POST/PUT endpoints accept JSON matching column names (see SQL queries in each route). Ensure numeric fields are validated.
  - Security: sanitize any HTML in item descriptions if you later allow rich text. Consider transactionally updating categories/items where multiple related inserts/updates occur.
  - Example: curl http://localhost:5001/api/menu
*/

// Get all menu categories with items
// Simple in-memory cache for public menu
const menuCache = { payload: null, expiresAt: 0 };
const MENU_CACHE_TTL_MS = 5000; // 5 seconds

function invalidateMenuCache() {
  menuCache.payload = null;
  menuCache.expiresAt = 0;
}

router.get('/menu', (req, res) => {
  // Serve from cache when available
  if (menuCache.payload && Date.now() < menuCache.expiresAt) {
    return res.json(menuCache.payload);
  }
  const query = `
    SELECT 
      c.id as category_id,
      c.name as category_name,
      c.description as category_description,
      c.image_url as category_image,
      c.gallery_image_id as category_gallery_image_id,
      ml.file_url as category_gallery_image,
      c.display_order as category_order,
      i.id as item_id,
      i.name as item_name,
      i.description as item_description,
      i.price as item_price,
      i.primary_quantity as item_primary_quantity,
      i.secondary_quantity as item_secondary_quantity,
      i.secondary_price as item_secondary_price,
      i.image_url as item_image,
      i.display_order as item_order
    FROM menu_categories c
    LEFT JOIN menu_items i ON c.id = i.category_id
    LEFT JOIN media_library ml ON c.gallery_image_id = ml.id
    WHERE c.is_active = 1 AND (COALESCE(i.is_available, 1) = 1 OR i.id IS NULL)
    ORDER BY c.display_order, i.display_order
  `;

  req.db.query(query, (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Group items by category
    const categories = {};
    results.forEach(row => {
      if (!categories[row.category_id]) {
        categories[row.category_id] = {
          id: row.category_id,
          name: row.category_name,
          description: row.category_description,
          image_url: row.category_image,
          gallery_image_url: row.category_gallery_image || null,
          display_order: row.category_order,
          items: []
        };
      }
      
      if (row.item_id) {
        categories[row.category_id].items.push({
          id: row.item_id,
          name: row.item_name,
          description: row.item_description,
          price: row.item_price === null ? null : Number(row.item_price),
          primary_quantity: row.item_primary_quantity || null,
          secondary_quantity: row.item_secondary_quantity || null,
          secondary_price: row.item_secondary_price === null ? null : (row.item_secondary_price !== null ? Number(row.item_secondary_price) : null),
          image_url: row.item_image,
          display_order: row.item_order
        });
      }
    });

    const out = Object.values(categories);
    // Store serialized payload in cache
    menuCache.payload = out;
    menuCache.expiresAt = Date.now() + MENU_CACHE_TTL_MS;
    res.json(out);
  });
});

// Admin endpoint: return all categories (regardless of active) with nested items
// Ordered by category display_order and item display_order. Admin-only.
router.get('/menu/admin', adminAuth, (req, res) => {
  const query = `
    SELECT 
      c.id as category_id,
      c.name as category_name,
      c.description as category_description,
      c.image_url as category_image,
      c.gallery_image_id as category_gallery_image_id,
      ml.file_url as category_gallery_image,
      c.display_order as category_order,
      c.is_active as category_active,
      i.id as item_id,
      i.name as item_name,
      i.description as item_description,
      i.price as item_price,
      i.primary_quantity as item_primary_quantity,
      i.secondary_quantity as item_secondary_quantity,
      i.secondary_price as item_secondary_price,
      i.image_url as item_image,
      i.display_order as item_order,
      i.is_available as item_available
    FROM menu_categories c
    LEFT JOIN menu_items i ON c.id = i.category_id
    LEFT JOIN media_library ml ON c.gallery_image_id = ml.id
    ORDER BY c.display_order, i.display_order
  `;

  req.db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });

    const categories = {};
    results.forEach(row => {
      if (!categories[row.category_id]) {
        categories[row.category_id] = {
          id: row.category_id,
          name: row.category_name,
          description: row.category_description,
          image_url: row.category_image,
          gallery_image_url: row.category_gallery_image || null,
          display_order: row.category_order,
          is_active: row.category_active,
          items: []
        };
      }

      if (row.item_id) {
        categories[row.category_id].items.push({
          id: row.item_id,
          name: row.item_name,
          description: row.item_description,
          price: row.item_price === null ? null : Number(row.item_price),
          primary_quantity: row.item_primary_quantity || null,
          secondary_quantity: row.item_secondary_quantity || null,
          secondary_price: row.item_secondary_price === null ? null : (row.item_secondary_price !== null ? Number(row.item_secondary_price) : null),
          image_url: row.item_image,
          display_order: row.item_order,
          is_available: row.item_available
        });
      }
    });

    res.json(Object.values(categories));
  });
});

// Get all categories (admin)
router.get('/menu/categories', (req, res) => {
  req.db.query('SELECT id, name, description, image_url, gallery_image_id, gallery_image_url, display_order, is_active FROM menu_categories ORDER BY display_order', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// Get items by category (admin)
router.get('/menu/categories/:categoryId/items', (req, res) => {
  const { categoryId } = req.params;
  req.db.query(
    'SELECT * FROM menu_items WHERE category_id = ? ORDER BY display_order',
    [categoryId],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(results);
    }
  );
});

// Create category
router.post('/menu/categories', (req, res) => {
  const { name, description, image_url, gallery_image_id, display_order } = req.body;
  const is_active = typeof req.body.is_active !== 'undefined' && req.body.is_active !== null ? req.body.is_active : 1;
  req.db.query(
    'INSERT INTO menu_categories (name, description, image_url, gallery_image_id, display_order, is_active) VALUES (?, ?, ?, ?, ?, ?)',
    [name, description, image_url, gallery_image_id || null, display_order || 0, is_active],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      invalidateMenuCache();
      res.json({ id: result.insertId, message: 'Category created' });
    }
  );
});

// Update category
router.put('/menu/categories/:id', (req, res) => {
  const { id } = req.params;
  const { name, description, image_url, gallery_image_id, display_order } = req.body;
  const is_active = typeof req.body.is_active !== 'undefined' && req.body.is_active !== null ? req.body.is_active : 1;
  req.db.query(
    'UPDATE menu_categories SET name = ?, description = ?, image_url = ?, gallery_image_id = ?, display_order = ?, is_active = ? WHERE id = ?',
    [name, description, image_url, gallery_image_id || null, display_order, is_active, id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      invalidateMenuCache();
      res.json({ message: 'Category updated' });
    }
  );
});

// Delete category
router.delete('/menu/categories/:id', (req, res) => {
  const { id } = req.params;
  req.db.query('DELETE FROM menu_categories WHERE id = ?', [id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    invalidateMenuCache();
    res.json({ message: 'Category deleted' });
  });
});

// Create menu item
router.post('/menu/items', (req, res) => {
  const { category_id, name, description, price, image_url, display_order, primary_quantity, secondary_quantity, secondary_price, is_available } = req.body;
  req.db.query(
    'INSERT INTO menu_items (category_id, name, description, price, image_url, display_order, primary_quantity, secondary_quantity, secondary_price, is_available) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [category_id, name, description, price, image_url, display_order || 0, primary_quantity || null, secondary_quantity || null, typeof secondary_price !== 'undefined' ? secondary_price : null, typeof is_available !== 'undefined' ? is_available : 1],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      invalidateMenuCache();
      res.json({ id: result.insertId, message: 'Item created' });
    }
  );
});

// Update menu item
router.put('/menu/items/:id', (req, res) => {
  const { id } = req.params;
  const { name, description, price, image_url, display_order, is_available, primary_quantity, secondary_quantity, secondary_price } = req.body;
  req.db.query(
    'UPDATE menu_items SET name = ?, description = ?, price = ?, image_url = ?, display_order = ?, is_available = ?, primary_quantity = ?, secondary_quantity = ?, secondary_price = ? WHERE id = ?',
    [name, description, price, image_url, display_order, is_available, primary_quantity || null, secondary_quantity || null, typeof secondary_price !== 'undefined' ? secondary_price : null, id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      invalidateMenuCache();
      res.json({ message: 'Item updated' });
    }
  );
});

// Delete menu item
router.delete('/menu/items/:id', (req, res) => {
  const { id } = req.params;
  req.db.query('DELETE FROM menu_items WHERE id = ?', [id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    invalidateMenuCache();
    res.json({ message: 'Item deleted' });
  });
});

module.exports = router;
