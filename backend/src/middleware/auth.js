const jwt = require("jsonwebtoken");

const DEFAULT_JWT_SECRET = "00a659ca0fda44eb79130032f81bf750850a0a7b347175b9834bbd1afe75a327d68f60ee9ccf5ad42e4a040c103606dbeb3e6e3f360de26c91b9429d29484ee6";

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
  const secret = process.env.JWT_SECRET || DEFAULT_JWT_SECRET;
  try {
    const payload = jwt.verify(token, secret);
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
