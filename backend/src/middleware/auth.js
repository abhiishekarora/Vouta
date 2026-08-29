const jwt = require("jsonwebtoken");
const { pool } = require("../config/db");

const DEFAULT_JWT_SECRET = "00a659ca0fda44eb79130032f81bf750850a0a7b347175b9834bbd1afe75a327d68f60ee9ccf5ad42e4a040c103606dbeb3e6e3f360de26c91b9429d29484ee6";

/**
 * Verifies the JWT Bearer token from the Authorization header.
 * Attaches decoded user payload + workspace role to req.user.
 */
async function authenticate(req, res, next) {
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No authentication token provided." });
  }

  const token = authHeader.slice(7);
  const secret = process.env.JWT_SECRET || DEFAULT_JWT_SECRET;
  try {
    const payload = jwt.verify(token, secret);
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
