/**
 * Server entry point (local dev and Render): `npm start` / `npm run dev`.
 */
require("dotenv").config();
const { pool, testConnection } = require("./config/db");
const app = require("./app");

const PORT = process.env.PORT || 4000;

async function start() {
  if (!(await testConnection())) process.exit(1);
  const server = app.listen(PORT, () => {
    console.log(`[Server] Vouta API running on http://localhost:${PORT}`);
    console.log(`[Server] Environment: ${process.env.NODE_ENV || "development"}`);
  });

  // Let in-flight requests finish on deploy/restart instead of cutting them off.
  const shutdown = (signal) => {
    console.log(`[Server] ${signal} received, shutting down…`);
    server.close(() => pool.end().finally(() => process.exit(0)));
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

process.on("unhandledRejection", (err) => {
  console.error("[Server] Unhandled promise rejection:", err);
});

start();
