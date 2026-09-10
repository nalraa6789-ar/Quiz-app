// backend/config/database.js
// Creates a MySQL connection pool using credentials from environment variables.
// A pool is used (instead of a single connection) so the app can handle many
// simultaneous requests without running out of connections.

require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'quiz_app',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true,
});

// Quick helper to verify the DB is reachable when the server starts.
async function testConnection() {
  try {
    const conn = await pool.getConnection();
    console.log('✅ Connected to MySQL database:', process.env.DB_NAME || 'quiz_app');
    conn.release();
    return true;
  } catch (err) {
    console.error('❌ Could not connect to MySQL:', err.message);
    console.error('   Check that MySQL is running and .env contains the correct DB password.');
    return false;
  }
}

module.exports = { pool, testConnection };
