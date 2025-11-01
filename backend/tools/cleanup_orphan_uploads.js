const fs = require('fs');
const path = require('path');
const mysql = require('mysql2');

const UPLOADS_DIR = path.join(__dirname, 'uploads');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'trbg',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'thunder_road',
  waitForConnections: true,
  connectionLimit: 4
});

async function main() {
  if (!fs.existsSync(UPLOADS_DIR)) {
    console.log('Uploads directory does not exist:', UPLOADS_DIR);
    process.exit(0);
  }

  const files = fs.readdirSync(UPLOADS_DIR).filter(f => f && f !== '.' && f !== '..');
  console.log('Found', files.length, 'files in uploads directory');
  if (files.length === 0) return process.exit(0);

  const toDelete = [];
  for (const fname of files) {
    const candidatePath = path.join(UPLOADS_DIR, fname);
    if (!fs.statSync(candidatePath).isFile()) continue;
    // Check DB for a reference. media.file_url typically stores '/uploads/<filename>'
    const like = '%/' + fname;
    // Use promise wrapper
    const [rows] = await pool.promise().query('SELECT COUNT(*) as cnt FROM media_library WHERE file_url LIKE ? OR file_name = ?', [like, fname]);
    const cnt = Array.isArray(rows) && rows[0] ? rows[0].cnt : 0;
    if (!cnt) toDelete.push(fname);
  }

  if (toDelete.length === 0) {
    console.log('No orphaned files found.');
    pool.end();
    return;
  }

  console.log('Orphaned files to delete:', toDelete.length);
  for (const f of toDelete) {
    const p = path.join(UPLOADS_DIR, f);
    try {
      fs.unlinkSync(p);
      console.log('Deleted:', f);
    } catch (e) {
      console.error('Failed to delete', f, e && e.message);
    }
  }

  // Summary
  const remaining = fs.readdirSync(UPLOADS_DIR).filter(f => fs.statSync(path.join(UPLOADS_DIR, f)).isFile());
  console.log('Remaining files in uploads dir:', remaining.length);
  pool.end();
}

main().catch(err => {
  console.error('Error during cleanup:', err && err.message);
  pool.end();
  process.exit(1);
});
