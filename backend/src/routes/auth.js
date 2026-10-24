const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const { z } = require("zod");
const { pool } = require("../config/db");
const { validate, uuidParam } = require("../middleware/validate");
const { authenticate, requireRole, resolveWorkspace } = require("../middleware/auth");

// ─── Auth-specific rate limiters (login + register only) ──────────
// Applied directly to the write routes so that GET /auth/me (which fires
// on every page load) does NOT consume the budget.
// Two layers: a strict per-account limit stops password guessing on one account,
// and a looser per-IP limit stops spraying many accounts — loose enough that users
// behind a shared IP (mobile carrier NAT, office networks) don't lock each other out.
const limiterDefaults = {
  windowMs: 15 * 60 * 1000,  // 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Please try again in 15 minutes." },
  skipSuccessfulRequests: true,
};
const authIpLimiter = rateLimit({ ...limiterDefaults, max: 100 });
const authAccountLimiter = rateLimit({
  ...limiterDefaults,
  max: 10,
  keyGenerator: (req) => `acct:${String(req.body?.email || "").toLowerCase().trim()}`,
});

const router = express.Router();
router.param("id", uuidParam);

// ─── Zod Schemas ──────────────────────────────────────────────────
const registerSchema = z.object({
  email: z.string().trim().email("Invalid email address.").max(254).toLowerCase(),
  password: z.string().min(8, "Password must be at least 8 characters.").max(128, "Password is too long."),
  ownerName: z.string().trim().min(1, "Owner name is required.").max(120),
  businessName: z.string().trim().min(1, "Business name is required.").max(200),
  businessType: z.string().max(100).trim().default("Other"),
});

const loginSchema = z.object({
  email: z.string().trim().email("Invalid email address.").max(254).toLowerCase(),
  password: z.string().min(1, "Password is required.").max(128),
});

const profileSchema = z.object({
  ownerName: z.string().trim().min(1).max(120).optional(),
  businessName: z.string().trim().min(1).max(200).optional(),
  businessType: z.string().max(100).trim().optional(),
});

const inviteSchema = z.object({
  email: z.string().trim().email("Invalid email.").max(254).toLowerCase(),
  role: z.enum(["view", "edit", "admin"]).default("view"),
});

const roleSchema = z.object({
  role: z.enum(["view", "edit", "admin"]),
});

// ─── Cookie config ─────────────────────────────────────────────────
// JWT_EXPIRES_IN is e.g. "7d". Convert to milliseconds for cookie maxAge.
function cookieMaxAgeMs() {
  const raw = process.env.JWT_EXPIRES_IN || "7d";
  const match = raw.match(/^(\d+)([smhd])$/);
  if (!match) return 7 * 24 * 60 * 60 * 1000; // default 7 days
  const [, n, unit] = match;
  const mul = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return parseInt(n, 10) * (mul[unit] || 86_400_000);
}

/**
 * Cookie flags. sameSite "none" in production because the frontend and backend live on
 * different onrender.com subdomains (onrender.com is on the Public Suffix List, so they are
 * cross-site). CSRF is mitigated by the CORS origin allowlist rejecting foreign origins before
 * any route runs, and by the API accepting only JSON bodies.
 */
function cookieOptions() {
  const isProd = process.env.NODE_ENV === "production";
  return { httpOnly: true, secure: isProd, sameSite: isProd ? "none" : "lax", path: "/" };
}

function setAuthCookie(res, token) {
  res.cookie("vouta_token", token, { ...cookieOptions(), maxAge: cookieMaxAgeMs() });
}

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET,
    { algorithm: "HS256", expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}

// Same cost as real hashes so unknown emails take as long as wrong passwords.
const DUMMY_HASH = bcrypt.hashSync("vouta-timing-equalizer", 12);

/**
 * The client-facing user: identity (email, displayName) is the signed-in person;
 * business fields and role come from the workspace they are working in.
 */
async function buildUser(userId, ws) {
  const { rows } = await pool.query(
    "SELECT id, email, owner_name, business_name, business_type, created_at FROM users WHERE id = ANY($1::uuid[])",
    [[userId, ws.effectiveUserId]]
  );
  const self = rows.find((r) => r.id === userId);
  const owner = rows.find((r) => r.id === ws.effectiveUserId) || self;
  if (!self) return null;
  return {
    id: self.id,
    email: self.email,
    displayName: self.owner_name,
    ownerName: owner.owner_name,
    businessName: owner.business_name,
    businessType: owner.business_type,
    role: ws.role,
    isOwner: ws.effectiveUserId === self.id,
    createdAt: self.created_at,
  };
}

// ─── POST /api/auth/register ──────────────────────────────────────
router.post("/register", authIpLimiter, validate(registerSchema), authAccountLimiter, async (req, res) => {
  const { email, password, ownerName, businessName, businessType } = req.body;
  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const { rows } = await pool.query(
      `INSERT INTO users (email, password_hash, owner_name, business_name, business_type)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email`,
      [email, passwordHash, ownerName, businessName, businessType]
    );

    const user = rows[0];
    const token = signToken(user);

    // Set httpOnly cookie AND return token in JSON body for dual auth support
    setAuthCookie(res, token);

    const ws = await resolveWorkspace(user.id);
    return res.status(201).json({ user: await buildUser(user.id, ws), token });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "An account with this email already exists." });
    }
    console.error("[Auth] Register error:", err.message);
    return res.status(500).json({ error: "Registration failed. Please try again." });
  }
});

// ─── POST /api/auth/login ─────────────────────────────────────────
router.post("/login", authIpLimiter, validate(loginSchema), authAccountLimiter, async (req, res) => {
  const { email, password } = req.body;
  try {
    const { rows } = await pool.query("SELECT id, email, password_hash FROM users WHERE email = $1", [email]);
    const user = rows[0];

    const valid = await bcrypt.compare(password, user ? user.password_hash : DUMMY_HASH);
    if (!user || !valid) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const token = signToken(user);

    // Set httpOnly cookie AND return token in JSON body for dual auth support
    setAuthCookie(res, token);

    const ws = await resolveWorkspace(user.id);
    return res.json({ user: await buildUser(user.id, ws), token });
  } catch (err) {
    console.error("[Auth] Login error:", err.message);
    return res.status(500).json({ error: "Login failed. Please try again." });
  }
});

// ─── POST /api/auth/logout ────────────────────────────────────────
// Clears the httpOnly auth cookie. JS on the page cannot clear it directly.
router.post("/logout", (req, res) => {
  res.clearCookie("vouta_token", cookieOptions());
  return res.json({ message: "Logged out successfully." });
});

// ─── GET /api/auth/me ─────────────────────────────────────────────
router.get("/me", authenticate, async (req, res) => {
  try {
    const user = await buildUser(req.user.id, req.user);
    if (!user) return res.status(401).json({ error: "Account no longer exists." });
    return res.json({ user });
  } catch (err) {
    console.error("[Auth] /me error:", err.message);
    return res.status(500).json({ error: "Failed to retrieve user." });
  }
});

// ─── PATCH /api/auth/profile ──────────────────────────────────────
// Business profile of the current workspace (admin only — matches the Settings UI).
router.patch("/profile", authenticate, requireRole(["admin"]), validate(profileSchema), async (req, res) => {
  const { ownerName, businessName, businessType } = req.body;
  const fields = [];
  const values = [];
  let idx = 1;

  if (ownerName !== undefined)    { fields.push(`owner_name = $${idx++}`);    values.push(ownerName); }
  if (businessName !== undefined) { fields.push(`business_name = $${idx++}`); values.push(businessName); }
  if (businessType !== undefined) { fields.push(`business_type = $${idx++}`); values.push(businessType); }

  if (fields.length === 0) {
    return res.status(400).json({ error: "No fields provided to update." });
  }

  values.push(req.user.effectiveUserId);
  try {
    await pool.query(`UPDATE users SET ${fields.join(", ")} WHERE id = $${idx}`, values);
    return res.json({ user: await buildUser(req.user.id, req.user) });
  } catch (err) {
    console.error("[Auth] Profile update error:", err.message);
    return res.status(500).json({ error: "Failed to update profile." });
  }
});

// ─── Workspace Partner Access Endpoints (workspace admin side) ─────

// GET /api/auth/members — List all partners invited to workspace
router.get("/members", authenticate, requireRole(["admin"]), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT wm.id, wm.email, wm.role, wm.status, wm.created_at, u.owner_name
       FROM workspace_members wm
       LEFT JOIN users u ON u.id = wm.user_id
       WHERE wm.owner_id = $1
       ORDER BY wm.created_at DESC`,
      [req.user.effectiveUserId]
    );
    return res.json(rows);
  } catch (err) {
    console.error("[Auth] GET members error:", err.message);
    return res.status(500).json({ error: "Failed to fetch workspace members." });
  }
});

// POST /api/auth/invite — Invite partner by email + assign role. The invitee must accept.
router.post("/invite", authenticate, requireRole(["admin"]), validate(inviteSchema), async (req, res) => {
  const { email, role } = req.body;
  const ownerId = req.user.effectiveUserId;

  try {
    const owner = await pool.query("SELECT email FROM users WHERE id = $1", [ownerId]);
    if (email === req.user.email.toLowerCase() || email === owner.rows[0]?.email.toLowerCase()) {
      return res.status(400).json({ error: "You cannot invite yourself or the workspace owner." });
    }

    const { rows } = await pool.query(
      `INSERT INTO workspace_members (owner_id, email, role, status)
       VALUES ($1, $2, $3, 'pending')
       ON CONFLICT (owner_id, email) DO UPDATE SET role = EXCLUDED.role
       RETURNING id, email, role, status, created_at`,
      [ownerId, email, role]
    );

    return res.status(201).json(rows[0]);
  } catch (err) {
    console.error("[Auth] Invite partner error:", err.message);
    return res.status(500).json({ error: "Failed to invite workspace partner." });
  }
});

// PATCH /api/auth/members/:id/role — Update a partner's role
router.patch("/members/:id/role", authenticate, requireRole(["admin"]), validate(roleSchema), async (req, res) => {
  const { role } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE workspace_members SET role = $1
       WHERE id = $2 AND owner_id = $3
       RETURNING id, email, role, status, created_at`,
      [role, req.params.id, req.user.effectiveUserId]
    );
    if (!rows[0]) return res.status(404).json({ error: "Partner member not found." });
    return res.json(rows[0]);
  } catch (err) {
    console.error("[Auth] Update role error:", err.message);
    return res.status(500).json({ error: "Failed to update partner role." });
  }
});

// DELETE /api/auth/members/:id — Revoke partner access
router.delete("/members/:id", authenticate, requireRole(["admin"]), async (req, res) => {
  try {
    const { rowCount } = await pool.query(
      "DELETE FROM workspace_members WHERE id = $1 AND owner_id = $2",
      [req.params.id, req.user.effectiveUserId]
    );
    if (!rowCount) return res.status(404).json({ error: "Partner member not found." });
    return res.status(204).end();
  } catch (err) {
    console.error("[Auth] Revoke partner error:", err.message);
    return res.status(500).json({ error: "Failed to revoke partner access." });
  }
});

// ─── Invitations (invitee side) ────────────────────────────────────
// Rows addressed to the signed-in user: pending ones by email, accepted ones by user_id.
const MINE = "(wm.user_id = $1 OR (wm.status = 'pending' AND LOWER(wm.email) = LOWER($2)))";

// GET /api/auth/invitations — invitations for me, pending and accepted
router.get("/invitations", authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT wm.id, wm.role, wm.status, wm.created_at, u.business_name, u.owner_name
       FROM workspace_members wm JOIN users u ON u.id = wm.owner_id
       WHERE ${MINE}
       ORDER BY wm.created_at DESC`,
      [req.user.id, req.user.email]
    );
    return res.json(rows.map((r) => ({
      id: r.id,
      role: r.role,
      status: r.status,
      businessName: r.business_name,
      ownerName: r.owner_name,
      createdAt: r.created_at,
    })));
  } catch (err) {
    console.error("[Auth] GET invitations error:", err.message);
    return res.status(500).json({ error: "Failed to fetch invitations." });
  }
});

// POST /api/auth/invitations/:id/accept — join the inviting workspace
router.post("/invitations/:id/accept", authenticate, async (req, res) => {
  try {
    const { rowCount } = await pool.query(
      `UPDATE workspace_members wm SET status = 'accepted', user_id = $1
       WHERE wm.id = $3 AND wm.status = 'pending' AND ${MINE}`,
      [req.user.id, req.user.email, req.params.id]
    );
    if (!rowCount) return res.status(404).json({ error: "Invitation not found." });
    const ws = await resolveWorkspace(req.user.id);
    return res.json({ user: await buildUser(req.user.id, ws) });
  } catch (err) {
    console.error("[Auth] Accept invitation error:", err.message);
    return res.status(500).json({ error: "Failed to accept invitation." });
  }
});

// DELETE /api/auth/invitations/:id — decline a pending invite, or leave a workspace
router.delete("/invitations/:id", authenticate, async (req, res) => {
  try {
    const { rowCount } = await pool.query(
      `DELETE FROM workspace_members wm WHERE wm.id = $3 AND ${MINE}`,
      [req.user.id, req.user.email, req.params.id]
    );
    if (!rowCount) return res.status(404).json({ error: "Invitation not found." });
    const ws = await resolveWorkspace(req.user.id);
    return res.json({ user: await buildUser(req.user.id, ws) });
  } catch (err) {
    console.error("[Auth] Leave workspace error:", err.message);
    return res.status(500).json({ error: "Failed to leave workspace." });
  }
});

module.exports = router;
