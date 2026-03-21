// config/db.js
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const query = async (text, params) => {
  const result = await pool.query(text, params);
  return result;
};

const getClient = async () => {
  const client = await pool.connect();
  return client;
};

module.exports = { query, getClient, pool };
