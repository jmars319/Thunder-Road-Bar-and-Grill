require('dotenv').config();

// Determine database client and connection based on environment
// Render uses DATABASE_URL (PostgreSQL), local development uses MySQL
const isPg = !!process.env.DATABASE_URL;

module.exports = {
  client: isPg ? 'pg' : 'mysql2',
  connection: isPg
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false } // Required for Render PostgreSQL
      }
    : {
        host: process.env.DB_HOST || '127.0.0.1',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'thunder_road',
        port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined
      },
  pool: {
    min: 2,
    max: parseInt(process.env.DB_CONN_LIMIT) || 10
  },
  migrations: {
    directory: __dirname + '/migrations'
  }
};
