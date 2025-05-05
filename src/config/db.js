const mysql = require('mysql2');

// Create a connection pool instead of a single connection
const pool = mysql.createPool({
  host: process.env.DB_HOST ,
  user: process.env.DB_USER ,
  password: process.env.DB_PASSWORD ,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 10, // Adjust based on your needs
  queueLimit: 0
});

// Verify the connection
pool.getConnection((err, connection) => {
  if (err) {
    console.error('Database connection failed:', err);
  } else {
    console.log('Konekted');
    connection.release(); // Release the connection back to the pool
  }
});

// Add promise wrapper to allow async/await syntax
const promisePool = pool.promise();

module.exports = {
  pool,
  promisePool
};