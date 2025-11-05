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
  // Support category-based upload rules (e.g., resume vs image). The client
  // may set `category=resume` in form-data to use the stricter resume limits.
  const uploadConfig = (() => {
    try { return require('../config/upload.json'); } catch (e) { return null; }
  })();

  const category = (req.body && req.body.category) || (req.query && req.query.category) || 'general';

  // Build a per-request multer instance so we can enforce category-specific
  // maxBytes and allowed mimetypes (resume vs image vs general).
  const multer = require('multer');
  const path = require('path');
  const fs = require('fs');

  const dest = path.join(__dirname, '..', 'uploads');
  const storage = multer.diskStorage({
    destination: (r, f, cb) => cb(null, dest),
    filename: (r, f, cb) => {
      const safeName = `${Date.now()}-${Math.random().toString(36).slice(2,8)}${path.extname(f.originalname)}`;
      cb(null, safeName);
    }
  });

  const cfg = (uploadConfig && uploadConfig[category]) || (uploadConfig && uploadConfig.general) || { maxBytes: 10 * 1024 * 1024, types: [] };

  const uploader = multer({
    storage,
    limits: { fileSize: cfg.maxBytes },
    fileFilter: (r, file, cb) => {
      const allowed = Array.isArray(cfg.types) ? cfg.types : [];
      if (allowed.length === 0) return cb(null, true); // no restriction
      if (allowed.includes(file.mimetype)) return cb(null, true);
      const err = new Error('Invalid file type for category ' + category);
      err.status = 400;
      return cb(err);
    }
  });

  // Call the per-request uploader
  uploader.single('file')(req, res, (err) => {
    if (err) {
      const status = err.status || 500;
      return res.status(status).json({ error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { filename, originalname, mimetype, size } = req.file;
    const file_url = `/uploads/${filename}`;
    const storedFileUrl = file_url.startsWith('/') ? file_url : '/' + file_url;
    const { title, alt_text } = req.body;

    // Determine the actual category from the parsed form-data (multer
    // has populated req.body at this point). Fall back to the earlier
    // guessed category if not present.
    const actualCategory = (req.body && req.body.category) || category || 'general';
    const cfgActual = (uploadConfig && uploadConfig[actualCategory]) || (uploadConfig && uploadConfig.general) || { maxBytes: 10 * 1024 * 1024, types: [] };

    // Extra server-side sanity check: ensure the stored file's size falls
    // within the config (double-check to be safe).
    try {
      const stats = fs.statSync(path.join(dest, filename));
      if (stats.size > cfgActual.maxBytes) {
        // Remove the file to avoid leaving an oversized file on disk
        try { fs.unlinkSync(path.join(dest, filename)); } catch (e) {}
        return res.status(400).json({ error: 'Uploaded file exceeds allowed size for category' });
      }
    } catch (e) {
      // If we cannot stat the file, respond with error.
      return res.status(500).json({ error: 'Uploaded file could not be validated' });
    }
    // Quick header-based sanity check for resume files to catch simple
    // spoofing attempts (e.g. an image named .pdf). This checks for common
    // resume file signatures like '%PDF' and PK (for DOCX) and the older
    // compound file header for legacy .doc. If this fails, we reject early.
    if (actualCategory === 'resume') {
        try {
          const fd = fs.openSync(path.join(dest, filename), 'r');
          const headerBuf = Buffer.alloc(8);
          fs.readSync(fd, headerBuf, 0, 8, 0);
          fs.closeSync(fd);
          const isPdf = headerBuf.slice(0,4).toString() === '%PDF';
          const isZip = headerBuf[0] === 0x50 && headerBuf[1] === 0x4B; // docx (zip)
          const isOle = headerBuf[0] === 0xD0 && headerBuf[1] === 0xCF; // old .doc
          if (!isPdf && !isZip && !isOle) {
            try { fs.unlinkSync(path.join(dest, filename)); } catch (e) {}
            return res.status(400).json({ error: 'Uploaded resume does not appear to be a valid PDF/Word document' });
          }
        } catch (e) {
          try { fs.unlinkSync(path.join(dest, filename)); } catch (er) {}
          return res.status(400).json({ error: 'Uploaded resume could not be validated' });
        }
      }
    // Perform magic-bytes (file signature) validation using 'file-type' to
    // avoid MIME spoofing. If detection fails or indicates a disallowed type,
    // remove the file and respond with 400.
    
    try {
      const filePath = path.join(dest, filename);
      // Use dynamic import because newer `file-type` releases are ESM-only and
      // cannot be required from CommonJS; dynamic import returns a promise.
      import('file-type').then((fileTypeModule) => {
        // Support both CJS-style and ESM-style module shapes.
        // Support different export names across file-type versions
        const fn = (fileTypeModule && typeof fileTypeModule.fromFile === 'function')
          ? fileTypeModule.fromFile
          : (fileTypeModule && fileTypeModule.default && typeof fileTypeModule.default.fromFile === 'function')
            ? fileTypeModule.default.fromFile
            : (fileTypeModule && typeof fileTypeModule.fileTypeFromFile === 'function')
              ? fileTypeModule.fileTypeFromFile
              : (fileTypeModule && fileTypeModule.default && typeof fileTypeModule.default.fileTypeFromFile === 'function')
                ? fileTypeModule.default.fileTypeFromFile
                : null;
        if (!fn) return Promise.resolve(null);
        return fn(filePath);
      }).then((det) => {
        const detectedMime = det ? det.mime : null;
    const allowed = Array.isArray(cfgActual.types) ? cfgActual.types : [];

        // If we have an allow-list and detection succeeded, ensure it matches.
        if (allowed.length > 0 && detectedMime && !allowed.includes(detectedMime)) {
          try { fs.unlinkSync(filePath); } catch (e) {}
          return res.status(400).json({ error: 'Uploaded file type does not match allowed types for category' });
        }

        // If detection failed but allowed list exists, fall back to the
        // client-provided mimetype (multer). If that doesn't match either,
        // reject. This handles formats that file-type may not recognize.
        if (allowed.length > 0 && !detectedMime && mimetype && !allowed.includes(mimetype)) {
          try { fs.unlinkSync(filePath); } catch (e) {}
          return res.status(400).json({ error: 'Uploaded file type could not be verified' });
        }

        // Sanitize SVG files to prevent XSS attacks
        if (mimetype === 'image/svg+xml' || (detectedMime === 'image/svg+xml')) {
          try {
            const DOMPurify = require('isomorphic-dompurify');
            const svgContent = fs.readFileSync(filePath, 'utf8');
            
            // Sanitize SVG with strict config
            const cleanSvg = DOMPurify.sanitize(svgContent, {
              USE_PROFILES: { svg: true, svgFilters: true },
              ALLOWED_TAGS: ['svg', 'path', 'circle', 'rect', 'line', 'polyline', 'polygon', 'ellipse', 'g', 'text', 'tspan', 'defs', 'linearGradient', 'radialGradient', 'stop', 'clipPath', 'mask', 'pattern', 'use', 'symbol', 'title', 'desc'],
              ALLOWED_ATTR: ['viewBox', 'xmlns', 'width', 'height', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'opacity', 'd', 'cx', 'cy', 'r', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'points', 'transform', 'id', 'class', 'style', 'offset', 'stop-color', 'stop-opacity', 'gradientUnits', 'gradientTransform', 'href', 'xlink:href'],
              FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'textarea', 'button'],
              FORBID_ATTR: ['onload', 'onerror', 'onclick', 'onmouseover', 'onmouseout'],
            });

            // Write sanitized SVG back to file
            fs.writeFileSync(filePath, cleanSvg, 'utf8');
          } catch (sanitizeErr) {
            // If sanitization fails, remove file and reject upload
            try { fs.unlinkSync(filePath); } catch (e) {}
            return res.status(400).json({ error: 'SVG file could not be sanitized' });
          }
        }

        // All checks passed — record metadata in DB
        req.db.query(
          'INSERT INTO media_library (file_url, file_name, file_type, file_size, title, alt_text, category) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [storedFileUrl, originalname, mimetype, size, title, alt_text, actualCategory],
          (err, result) => {
            if (err) {
              try { fs.unlinkSync(filePath); } catch (e) {}
              return res.status(500).json({ error: err.message });
            }
            res.json({ id: result.insertId, file_url: storedFileUrl, message: 'File uploaded successfully' });
          }
        );
      }).catch((ftErr) => {
        // If file-type failed unexpectedly, remove file and return server error
        try { fs.unlinkSync(path.join(dest, filename)); } catch (e) {}
        return res.status(500).json({ error: 'Failed to validate uploaded file' });
      });
    } catch (e) {
      // If requiring file-type fails for any reason, fall back to inserting
      // but log the situation — prefer failing closed in prod.
      try { fs.unlinkSync(path.join(dest, filename)); } catch (er) {}
      return res.status(500).json({ error: 'Server cannot validate uploaded files' });
    }
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
