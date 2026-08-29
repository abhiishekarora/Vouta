const jwt = require("jsonwebtoken");

/**
 * Verifies the JWT Bearer token from the Authorization header.
 * Attaches decoded user payload to req.user.
 */
function authenticate(req, res, next) {
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No authentication token provided." });
  }

  const token = authHeader.slice(7); // strip "Bearer "
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { id, email, businessName, iat, exp }
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Session expired. Please sign in again." });
    }
    return res.status(401).json({ error: "Invalid authentication token." });
  }
}

module.exports = { authenticate };
