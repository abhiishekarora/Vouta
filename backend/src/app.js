require("dotenv").config();

const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");

// ─── Route Imports ────────────────────────────────────────────────
const authRoutes         = require("./routes/auth");
const goalsRoutes        = require("./routes/goals");
const transactionsRoutes = require("./routes/transactions");
const invoicesRoutes     = require("./routes/invoices");
const todosRoutes        = require("./routes/todos");
const teamRoutes         = require("./routes/team");
const projectsRoutes     = require("./routes/projects");
const projectTasksRoutes = require("./routes/projectTasks");
const documentsRoutes    = require("./routes/documents");

const app = express();

// ─── Security Headers (helmet) ────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

// ─── CORS ─────────────────────────────────────────────────────────
// CORS_ORIGIN is a comma-separated list of allowed origins.
// In production on Vercel, set this to your frontend Vercel URL.
const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:3000")
  .split(",")
  .map((o) => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    // Allow no-origin (curl, Postman, same-origin)
    if (!origin) return callback(null, true);

    // Exact match list
    if (allowedOrigins.includes(origin)) return callback(null, true);

    // Allow all *.vercel.app preview deployments automatically
    if (/^https:\/\/[a-z0-9-]+(\.vercel\.app)$/.test(origin)) {
      return callback(null, true);
    }

    callback(new Error(`CORS: Origin '${origin}' not allowed.`));
  },
  credentials: true,
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// ─── Body parsing ─────────────────────────────────────────────────
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false, limit: "1mb" }));
app.use(cookieParser());

// ─── Global rate limiter: 120 req/min per IP ─────────────────────
// Trust Vercel's proxy layer for accurate IP detection
app.set("trust proxy", 1);
app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please slow down." },
}));

// ─── Auth-specific rate limiter: 10 req / 15 min per IP ──────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Try again in 15 minutes." },
  skipSuccessfulRequests: true,
});

// ─── Health check ─────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ─── API Routes ───────────────────────────────────────────────────
app.use("/api/auth",          authLimiter, authRoutes);
app.use("/api/goals",         goalsRoutes);
app.use("/api/transactions",  transactionsRoutes);
app.use("/api/invoices",      invoicesRoutes);
app.use("/api/todos",         todosRoutes);
app.use("/api/team",          teamRoutes);
app.use("/api/projects",      projectsRoutes);
app.use("/api/project-tasks", projectTasksRoutes);
app.use("/api/documents",     documentsRoutes);

// ─── 404 handler ─────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: "Route not found." });
});

// ─── Global error handler ─────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error("[Server] Unhandled error:", err.message);
  const status = err.status || 500;
  const message =
    process.env.NODE_ENV === "production"
      ? "An internal server error occurred."
      : err.message;
  res.status(status).json({ error: message });
});

// ─── Export for Vercel serverless ─────────────────────────────────
// Vercel imports this module and handles connections itself.
// Local dev uses server.js which calls app.listen().
module.exports = app;
