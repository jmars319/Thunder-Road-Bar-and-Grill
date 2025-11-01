require('dotenv').config();

module.exports = {
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'thunder_road',
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined
  },
  migrations: {
    directory: __dirname + '/migrations'
  }
};
