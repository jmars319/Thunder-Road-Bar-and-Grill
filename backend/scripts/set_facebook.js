#!/usr/bin/env node
require('dotenv').config();
const mysql = require('mysql2/promise');

async function main() {
  const url = process.argv[2] || process.env.FACEBOOK_URL;
  if (!url) {
    console.error('Usage: node scripts/set_facebook.js <facebook_url>');
    process.exit(2);
  }

  const host = process.env.DB_HOST || 'localhost';
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || undefined;
  const database = process.env.DB_NAME || 'thunder_road';

  const conn = await mysql.createConnection({ host, user, password, database });
  try {
    const [res] = await conn.execute('UPDATE site_settings SET facebook = ? WHERE id = 1', [url]);
    console.log('Updated rows:', res.affectedRows);
  } catch (err) {
    console.error('Error:', err && err.message ? err.message : err);
    process.exitCode = 2;
  } finally {
    try { await conn.end(); } catch (e) {}
  }
}

main();
