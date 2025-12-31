// Jest setup file (not a test)
require('dotenv').config({ path: '.env.test' });
const { Pool } = require('pg');

// Create a separate test database pool
const testPool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});


// Clean up database before each test
const cleanDatabase = async () => {
  try {
    await testPool.query('TRUNCATE users, gyms RESTART IDENTITY CASCADE');
  } catch (error) {
    console.error('Error cleaning database:', error);
    throw error;
  }
};

// Close database connection after all tests
const closeDatabase = async () => {
  try {
    await testPool.end();
  } catch (error) {
    console.error('Error closing database:', error);
  }
};

module.exports = {
  testPool,
  cleanDatabase,
  closeDatabase
};