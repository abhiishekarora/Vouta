require("dotenv").config();
const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

// Migrations MUST use the unpooled (direct) connection.
// Neon's pgbouncer runs in transaction mode and can't handle:
// - DDL inside DO blocks (e.g. CREATE TRIGGER)
// - Multi-statement scripts in a single connection
const connStr = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;

if (!connStr) {
  console.error("[Migrate] ERROR: No DATABASE_URL or DATABASE_URL_UNPOOLED set.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: connStr,
  ssl: { rejectUnauthorized: false },
  max: 1,
  connectionTimeoutMillis: 15000,
});

async function migrate() {
  const client = await pool.connect();
  try {
    console.log("[Migrate] Running schema migration via unpooled connection…");
    const sqlPath = path.join(__dirname, "../migrations/001_init.sql");
    const sql = fs.readFileSync(sqlPath, "utf8");
    await client.query(sql);
    console.log("[Migrate] ✓ Schema applied successfully.");
  } catch (err) {
    console.error("[Migrate] ✗ Failed:", err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
