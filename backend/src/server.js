/**
 * Local development server entry point.
 * Vercel uses app.js directly (exported Express app).
 * This file is only for running locally with: npm run dev
 */
require("dotenv").config();
const { testConnection } = require("./config/db");
const app = require("./app");

const PORT = process.env.PORT || 4000;

async function start() {
  await testConnection(); // exits if DB unreachable
  app.listen(PORT, () => {
    console.log(`[Server] Vouta API running on http://localhost:${PORT}`);
    console.log(`[Server] Environment: ${process.env.NODE_ENV || "development"}`);
  });
}

start();
