import mysql from 'mysql2/promise';

// Validate required environment variables
const requiredEnvVars = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0 && process.env.NODE_ENV !== 'test') {
  console.warn(`Warning: Missing database environment variables: ${missingVars.join(', ')}`);
  console.warn('Please create .env.local file with database configuration');
}

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'baksos_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // Enable reconnection
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

export default pool;

