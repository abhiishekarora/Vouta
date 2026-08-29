require("dotenv").config();
const { Pool } = require("pg");

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn(
    "[DB] WARNING: DATABASE_URL environment variable is not set!\n" +
    "If running on Vercel, please set DATABASE_URL in Vercel Project Settings -> Environment Variables."
  );
}

// Neon (and most managed PG providers) require SSL.
const sslConfig = { rejectUnauthorized: false };

const pool = new Pool({
  connectionString: connectionString || "postgresql://dummy:dummy@localhost:5432/dummy",
  ssl: connectionString ? sslConfig : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on("error", (err) => {
  console.error("[DB] Unexpected client error:", err.message);
});

async function testConnection() {
  if (!process.env.DATABASE_URL) {
    console.error("[DB] Failed: DATABASE_URL is missing.");
    return false;
  }
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
