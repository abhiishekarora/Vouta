require("dotenv").config();
const { Pool } = require("pg");

const connectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.POSTGRES_URL_NON_POOLING;

if (!connectionString) {
  console.error("[DB] FATAL: No DATABASE_URL environment variable is set. Cannot connect to database.");
  process.exit(1);
}

// Managed Neon PostgreSQL requires SSL with proper certificate validation
const sslConfig = { rejectUnauthorized: true };

const pool = new Pool({
  connectionString,
  ssl: sslConfig,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on("error", (err) => {
  console.error("[DB] Unexpected client error:", err.message);
});

async function testConnection() {
  try {
    const client = await pool.connect();
    const { rows } = await client.query("SELECT version()");
    client.release();
    console.log(`[DB] Connected — ${rows[0].version.split(" ").slice(0, 2).join(" ")}`);
    return true;
  } catch (err) {
    console.error("[DB] Connection failed:", err.message);
    return false;
  }
}

module.exports = { pool, testConnection };
