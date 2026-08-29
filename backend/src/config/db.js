require("dotenv").config();
const { Pool } = require("pg");

if (!process.env.DATABASE_URL) {
  console.error("[DB] ERROR: DATABASE_URL is not set in .env");
  process.exit(1);
}

// Neon (and most managed PG providers) require SSL.
// rejectUnauthorized: false trusts the server cert without local CA bundle.
const sslConfig = { rejectUnauthorized: false };

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: sslConfig,
  max: 10,                   // pgbouncer caps concurrent connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on("error", (err) => {
  console.error("[DB] Unexpected client error:", err.message);
});

/**
 * Verify database connectivity on startup.
 * Returns the pg version string on success, exits on failure.
 */
async function testConnection() {
  try {
    const client = await pool.connect();
    const { rows } = await client.query("SELECT version()");
    client.release();
    console.log(`[DB] Connected — ${rows[0].version.split(" ").slice(0, 2).join(" ")}`);
  } catch (err) {
    console.error("[DB] Connection failed:", err.message);
    process.exit(1);
  }
}

module.exports = { pool, testConnection };
