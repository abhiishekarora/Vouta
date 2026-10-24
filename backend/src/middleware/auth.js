const jwt = require("jsonwebtoken");
const { pool } = require("../config/db");

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error("[Auth] FATAL: JWT_SECRET must be set to a random string of at least 32 characters.");
  process.exit(1);
}
const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Resolves the JWT from the request.
 *
 * Priority order:
 *  1. httpOnly cookie `vouta_token`  — set by /auth/login and /auth/register (production path)
 *  2. Authorization: Bearer <token>  — fallback for browsers that block cross-site cookies, curl, Postman
 */
function extractToken(req) {
  if (req.cookies && req.cookies.vouta_token) {
    return req.cookies.vouta_token;
  }
  const authHeader = req.headers["authorization"];
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  return null;
}

/**
 * Returns { effectiveUserId, role } for a user: the workspace of their most recent
 * accepted invite, or their own workspace as admin. Membership is matched on user_id
 * only — never on email — so an invite cannot pull someone into a workspace without
 * them accepting it.
 */
async function resolveWorkspace(userId) {
  const { rows } = await pool.query(
    `SELECT owner_id, role FROM workspace_members
      WHERE user_id = $1 AND status = 'accepted' AND owner_id <> $1
      ORDER BY updated_at DESC LIMIT 1`,
    [userId]
  );
  return rows[0]
    ? { effectiveUserId: rows[0].owner_id, role: rows[0].role }
    : { effectiveUserId: userId, role: "admin" };
}

/**
 * Verifies the JWT from cookie (primary) or Authorization header (fallback).
 * Attaches decoded user payload + workspace role to req.user.
 */
async function authenticate(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ error: "No authentication token provided." });
  }

  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] });
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Session expired. Please sign in again." });
    }
    return res.status(401).json({ error: "Invalid authentication token." });
  }

  try {
    req.user = { ...payload, ...(await resolveWorkspace(payload.id)) };
  } catch (dbErr) {
    // Fail closed: never guess a role when the membership lookup is unavailable.
    console.error("[Auth] Workspace lookup failed:", dbErr.message);
    return res.status(503).json({ error: "Service temporarily unavailable. Please try again." });
  }
  next();
}

/**
 * Enforces role permissions middleware.
 * Usage: requireRole(['admin', 'edit'])
 */
function requireRole(allowedRoles) {
  return (req, res, next) => {
    const role = req.user?.role || "view";
    if (allowedRoles.includes(role)) {
      return next();
    }
    return res.status(403).json({
      error: `Access denied. Action requires '${allowedRoles.join(" or ")}' role, but your role is '${role}'.`,
    });
  };
}

module.exports = { authenticate, requireRole, resolveWorkspace };
