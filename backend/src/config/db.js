require("dotenv").config();
const { Pool, types } = require("pg");

// Return DATE columns as plain "YYYY-MM-DD" strings. The default converts them to JS Dates
// at server-local midnight, which shifts dates by a day when serialized to JSON in non-UTC zones.
types.setTypeParser(1082, (v) => v);

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

// Managed Postgres (Neon) requires verified SSL; a local Postgres usually has no SSL at all.
function sslFor(connStr) {
  return /@(localhost|127\.0\.0\.1)(:|\/)/.test(connStr) ? false : { rejectUnauthorized: true };
}

const pool = new Pool({
  connectionString,
  ssl: sslFor(connectionString),
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on("error", (err) => {
  console.error("[DB] Unexpected client error:", err.message);
});

async function testConnection() {
  try {
    const { rows } = await pool.query("SELECT version()");
    console.log(`[DB] Connected — ${rows[0].version.split(" ").slice(0, 2).join(" ")}`);
    return true;
  } catch (err) {
    console.error("[DB] Connection failed:", err.message);
    return false;
  }
}

module.exports = { pool, testConnection, sslFor };
