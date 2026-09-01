const jwt = require("jsonwebtoken");
const { pool } = require("../config/db");

if (!process.env.JWT_SECRET) {
  console.error("[Auth] FATAL: JWT_SECRET environment variable is not set. Server cannot start securely.");
  process.exit(1);
}
const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Resolves the JWT from the request.
 *
 * Priority order:
 *  1. httpOnly cookie `vouta_token`  — set by /auth/login and /auth/register (production path)
 *  2. Authorization: Bearer <token>  — fallback for local dev, curl, Postman
 *
 * This dual-source approach lets the cookie migration roll out without breaking
 * existing sessions or developer tooling.
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
 * Verifies the JWT from cookie (primary) or Authorization header (fallback).
 * Attaches decoded user payload + workspace role to req.user.
 */
async function authenticate(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ error: "No authentication token provided." });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload; // { id, email, businessName, iat, exp }

    // Resolve workspace owner ID and user role
    try {
      const memberRes = await pool.query(
        "SELECT owner_id, role FROM workspace_members WHERE (user_id = $1 OR LOWER(email) = LOWER($2)) AND status = 'accepted' ORDER BY created_at DESC LIMIT 1",
        [payload.id, payload.email]
      );

      if (memberRes.rows.length > 0) {
        req.user.effectiveUserId = memberRes.rows[0].owner_id;
        req.user.role = memberRes.rows[0].role;
      } else {
        req.user.effectiveUserId = payload.id;
        req.user.role = "admin"; // Default owner role
      }
    } catch (dbErr) {
      req.user.effectiveUserId = payload.id;
      req.user.role = "admin";
    }

    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Session expired. Please sign in again." });
    }
    return res.status(401).json({ error: "Invalid authentication token." });
  }
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

module.exports = { authenticate, requireRole };
