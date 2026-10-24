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

const app = express();
app.disable("x-powered-by");

// ─── Multer — in-memory file storage ─────────────────────────────
const FILE_SIZE_LIMIT = 5 * 1024 * 1024; // 5 MB

// The browser-declared MIME type is attacker-controlled, so uploads are accepted only if
// the file's leading bytes match a real PDF / JPEG / PNG. Returns the verified MIME or null.
function sniffMime(buf) {
  if (buf.length >= 5 && buf.subarray(0, 5).toString("latin1") === "%PDF-") return "application/pdf";
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  return null;
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: FILE_SIZE_LIMIT, files: 1, fields: 5 },
});

function badRequest(message) {
  return Object.assign(new Error(message), { status: 400, expose: true });
}

/**
 * Upload pipeline shared by documents and invoices: rate limit, parse a single "file" field,
 * then verify content and normalise the filename. Sets req.file.mimetype to the sniffed type.
 */
function singleFileUpload(req, res, next) {
  uploadLimiter(req, res, (limitErr) => {
    if (limitErr) return next(limitErr);
    upload.single("file")(req, res, (err) => {
      if (err) return next(err);
      if (!req.file) return next(badRequest("No file provided. Please attach a PDF, JPG, or PNG file."));
      const mime = sniffMime(req.file.buffer);
      if (!mime) return next(badRequest("Only PDF, JPEG, and PNG files are allowed."));
      req.file.mimetype = mime;
      // Strip path parts and control/quote characters; they are echoed in headers and the UI.
      req.file.originalname = (req.file.originalname || "file")
        .split(/[\\/]/).pop()
        .replace(/[\u0000-\u001f\u007f"]/g, "")
        .slice(0, 200) || "file";
      next();
    });
  });
}
app.set("singleFileUpload", singleFileUpload);

// ─── Security Headers (helmet) ────────────────────────────────────
// JSON API: default helmet CSP is fine; stored files get their own sandbox CSP (utils/files.js).
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

// ─── CORS ─────────────────────────────────────────────────────────
// CORS_ORIGIN is a comma-separated list of allowed origins.
const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:3000")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow no-origin requests (curl, Postman, server-to-server)
    if (!origin) return callback(null, true);

    // Exact match against the explicit allowlist only. Rejecting here (before any route runs)
    // is also what blocks cross-site form posts that would otherwise ride the SameSite=None cookie.
    if (allowedOrigins.includes(origin)) return callback(null, true);

    callback(Object.assign(new Error("Origin not allowed."), { status: 403, expose: true }));
  },
  credentials: true,
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  maxAge: 600,
}));

// ─── Body parsing ─────────────────────────────────────────────────
// JSON only: no urlencoded parser, so HTML forms on other sites cannot produce a valid body.
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

// ─── Global rate limiter: 300 req/min per IP ─────────────────────
// Generous because many users share one public IP (mobile carrier NAT, office networks)
// and every page load fires ~9 requests.
// Render puts exactly one proxy in front of the app.
app.set("trust proxy", 1);
app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please slow down." },
}));

// ─── Upload-specific rate limiter: 10 uploads / min per IP ───────
const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many file uploads. Please wait a minute before trying again." },
});

// ─── Health check ─────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ─── API Routes ───────────────────────────────────────────────────
app.use("/api/auth",          authRoutes);  // auth limiters are scoped per-route inside routes/auth.js
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
    return res.status(400).json({ error: "Upload a single file in the 'file' field." });
  }
  next(err);
});

// ─── 404 handler ─────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: "Route not found." });
});

// ─── Global error handler ─────────────────────────────────────────
app.use((err, _req, res, _next) => {
  const status = err.status || err.statusCode || 500;
  if (status >= 500) console.error("[Server] Unhandled error:", err.stack || err.message);
  // Client errors (bad JSON, body too large, CORS) are safe to explain; server errors are not.
  const message =
    status < 500 && err.expose !== false
      ? err.message
      : process.env.NODE_ENV === "production" ? "An internal server error occurred." : err.message;
  res.status(status).json({ error: message });
});

// ─── Export ───────────────────────────────────────────────────────
// server.js calls app.listen(); serverless hosts can import this module directly.
module.exports = app;
module.exports.sniffMime = sniffMime;
