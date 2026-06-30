const mysql = require('mysql2/promise');
require('dotenv').config();

// Create the connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'amigoweb_timesheet',
  password: process.env.DB_PASSWORD || 'Aammigo@123',
  database: process.env.DB_NAME || 'amigoweb_timesheet',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test connection on startup
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log('Database connection pool initialized successfully.');
    connection.release();
  } catch (error) {
    console.error('Error establishing connection to MariaDB database:', error.message);
  }
})();

module.exports = pool;
