/*
  Purpose:
  - Provide media management endpoints used by the admin UI: list media,
    upload files (multipart/form-data), and delete media records.
  - This route relies on the `upload` instance configured in `server.js` and
    exposed via `app.get('upload')`.
  Notes:
  - Keep file handling and metadata insertion here; avoid moving business
    logic into server.js.
  Developer annotations:
// Last updated: 2025-10-21 — doc sweep: clarified expected media payloads and size limits.
  - Inputs (POST /api/media/upload): multipart/form-data with field `file`; optional fields: title, alt_text, category.
  - Outputs: GET returns array of media objects; POST returns { id, file_url, message } on success.
  - Security: validate MIME type and size server-side. Store files outside the webroot or use safe filename handling. The route uses the multer `upload` instance configured in `server.js`.
  - Example (curl with file):
    curl -F "file=@./image.jpg" -F "title=My Image" http://localhost:5001/api/media/upload
*/

const express = require('express');
const router = express.Router();

// Get all media
// GET /api/media?category=gallery - optional category filter
router.get('/media', (req, res) => {
  const category = req.query.category;
  // pagination params
  const limit = Math.min(parseInt(req.query.limit || '48', 10), 200);
  const offset = Math.max(parseInt(req.query.offset || '0', 10), 0);

  const params = [];
  let where = '';
  if (category) {
    where = ' WHERE category = ?';
    params.push(category);
  }

  const sql = `SELECT * FROM media_library${where} ORDER BY uploaded_at DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  // Also return total count for client-side pagination
  const countSql = `SELECT COUNT(*) as total FROM media_library${where}`;

  req.db.query(countSql, category ? [category] : [], (cErr, cRes) => {
    if (cErr) return res.status(500).json({ error: cErr.message });
    const total = Array.isArray(cRes) && cRes[0] ? cRes[0].total : 0;
    req.db.query(sql, params, (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      // Normalize file_url values to always start with a leading slash. Some
      // older DB rows may have been stored without the leading slash which
      // causes inconsistencies on the client. Keep the DB untouched here,
      // but ensure responses always return the normalized form.
      const normalized = results.map((r) => {
        if (r && r.file_url && typeof r.file_url === 'string' && !r.file_url.startsWith('/')) {
          return Object.assign({}, r, { file_url: '/' + r.file_url });
        }
        return r;
      });
      res.setHeader('X-Total-Count', String(total));
      res.json(normalized);
    });
  });
});

// Upload media
router.post('/media/upload', (req, res) => {
  const upload = req.app.get('upload');

  // We call the multer middleware directly so we can access req.file and
  // handle errors uniformly within this route.
  upload.single('file')(req, res, (err) => {
    if (err) {
      const status = err.status || 500;
      return res.status(status).json({ error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

  const { filename, originalname, mimetype, size } = req.file;
  const file_url = `/uploads/${filename}`;
  // Ensure stored file_url has a leading slash before inserting into DB.
  const storedFileUrl = file_url.startsWith('/') ? file_url : '/' + file_url;
  const { title, alt_text, category } = req.body;

    req.db.query(
      'INSERT INTO media_library (file_url, file_name, file_type, file_size, title, alt_text, category) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [storedFileUrl, originalname, mimetype, size, title, alt_text, category],
      (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({
          id: result.insertId,
          file_url: storedFileUrl,
          message: 'File uploaded successfully'
        });
      }
    );
  });
});

// Delete media
router.delete('/media/:id', (req, res) => {
  const { id } = req.params;
  req.db.query('DELETE FROM media_library WHERE id = ?', [id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Media deleted' });
  });
});

module.exports = router;
