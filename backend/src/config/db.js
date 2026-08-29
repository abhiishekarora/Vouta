require("dotenv").config();
const { Pool } = require("pg");

const DEFAULT_NEON_URL = "postgresql://neondb_owner:npg_q9xjJBHo3FpM@ep-snowy-scene-azhbnqs8-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=verify-full";

const connectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.POSTGRES_URL_NON_POOLING ||
  DEFAULT_NEON_URL;

// Managed Neon PostgreSQL requires SSL
const sslConfig = { rejectUnauthorized: false };

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
