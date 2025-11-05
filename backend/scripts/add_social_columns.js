#!/usr/bin/env node
/**
 * One-off script to add instagram and facebook columns to site_settings
 * Uses environment variables (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME)
 * to connect. Safe to run multiple times; will skip columns that already
 * exist.
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

(async function main() {
  const host = process.env.DB_HOST || 'localhost';
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || undefined;
  const database = process.env.DB_NAME || 'thunder_road';

  console.log('Connecting to DB', { host, user, database });
  const conn = await mysql.createConnection({ host, user, password, database });
  try {
    const [rows] = await conn.execute(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'site_settings' AND COLUMN_NAME IN ('instagram','facebook','google')",
      [database]
    );
    const present = (rows || []).map(r => String(r.COLUMN_NAME).toLowerCase());
    if (!present.includes('instagram')) {
      console.log('Adding instagram column...');
      await conn.execute("ALTER TABLE site_settings ADD COLUMN instagram VARCHAR(255) NULL");
    } else {
      console.log('instagram column already present');
    }
    if (!present.includes('facebook')) {
      console.log('Adding facebook column...');
      await conn.execute("ALTER TABLE site_settings ADD COLUMN facebook VARCHAR(255) NULL");
    } else {
      console.log('facebook column already present');
    }
    if (!present.includes('google')) {
      console.log('Adding google column...');
      await conn.execute("ALTER TABLE site_settings ADD COLUMN google VARCHAR(255) NULL");
    } else {
      console.log('google column already present');
    }
    console.log('Done');
  } catch (err) {
    console.error('Migration error:', err && err.message ? err.message : err);
    process.exitCode = 2;
  } finally {
    try { await conn.end(); } catch (e) {}
  }
})();
