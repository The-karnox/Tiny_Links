const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;

// Reuse a global pool in serverless environments to avoid exhausting connections
let pool = null;
if (DATABASE_URL) {
  if (!global.__pgPool) {
    global.__pgPool = new Pool({ connectionString: DATABASE_URL });
  }
  pool = global.__pgPool;
}

module.exports = { pool };
