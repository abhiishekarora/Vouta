require("dotenv").config();

const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const multer = require("multer");

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

const { testConnection } = require("./config/db");
testConnection().catch((err) => console.error("[DB] Migration error on boot:", err));

const app = express();

// ─── Multer — in-memory file storage ─────────────────────────────
// Accepted MIME types for uploaded files
const ALLOWED_MIME = ["application/pdf", "image/jpeg", "image/png"];
const FILE_SIZE_LIMIT = 5 * 1024 * 1024; // 5 MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: FILE_SIZE_LIMIT },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE", "Only PDF, JPEG, and PNG files are allowed."));
    }
  },
});

// Export multer instance so route files can use it
app.set("upload", upload);

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
    // Allow no-origin requests (curl, Postman, server-to-server)
    if (!origin) return callback(null, true);

    // Exact match against the explicit allowlist only.
    // NOTE: The *.vercel.app wildcard has been intentionally removed —
    // it is unsafe to auto-approve unknown origins when credentials:true
    // because any Vercel-hosted page could make authenticated requests.
    if (allowedOrigins.includes(origin)) return callback(null, true);

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


// ─── Upload-specific rate limiter: 5 uploads / min per IP ────────
const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many file uploads. Please wait a minute before trying again." },
});

// Export upload limiter for use in routes
app.set("uploadLimiter", uploadLimiter);

// ─── Health check ─────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ─── API Routes ───────────────────────────────────────────────────
app.use("/api/auth",          authRoutes);  // authLimiter is scoped per-route inside routes/auth.js
app.use("/api/goals",         goalsRoutes);
app.use("/api/transactions",  transactionsRoutes);
app.use("/api/invoices",      invoicesRoutes);
app.use("/api/todos",         todosRoutes);
app.use("/api/team",          teamRoutes);
app.use("/api/projects",      projectsRoutes);
app.use("/api/project-tasks", projectTasksRoutes);
app.use("/api/documents",     documentsRoutes);

// ─── Multer error handler (must be after routes) ──────────────────
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ error: "File too large. Maximum size is 5MB." });
    }
    return res.status(400).json({ error: err.message || "File upload error." });
  }
  next(err);
});

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
