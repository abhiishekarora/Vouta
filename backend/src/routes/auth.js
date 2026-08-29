const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { z } = require("zod");
const { pool } = require("../config/db");
const { validate } = require("../middleware/validate");
const { authenticate, requireRole } = require("../middleware/auth");

const router = express.Router();

// ─── Zod Schemas ──────────────────────────────────────────────────
const registerSchema = z.object({
  email: z.string().email("Invalid email address.").toLowerCase(),
  password: z.string().min(8, "Password must be at least 8 characters."),
  ownerName: z.string().min(1, "Owner name is required.").max(120).trim(),
  businessName: z.string().min(1, "Business name is required.").max(200).trim(),
  businessType: z.string().max(100).trim().default("Other"),
});

const loginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1, "Password is required."),
});

const profileSchema = z.object({
  ownerName: z.string().min(1).max(120).trim().optional(),
  businessName: z.string().min(1).max(200).trim().optional(),
  businessType: z.string().max(100).trim().optional(),
});

const inviteSchema = z.object({
  email: z.string().email("Invalid email.").toLowerCase(),
  role: z.enum(["view", "edit", "admin"]).default("view"),
});

const roleSchema = z.object({
  role: z.enum(["view", "edit", "admin"]),
});

const DEFAULT_JWT_SECRET = "00a659ca0fda44eb79130032f81bf750850a0a7b347175b9834bbd1afe75a327d68f60ee9ccf5ad42e4a040c103606dbeb3e6e3f360de26c91b9429d29484ee6";

function signToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      businessName: user.business_name,
    },
    process.env.JWT_SECRET || DEFAULT_JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}

// ─── POST /api/auth/register ──────────────────────────────────────
router.post("/register", validate(registerSchema), async (req, res) => {
  const { email, password, ownerName, businessName, businessType } = req.body;
  try {
    const existing = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: "An account with this email already exists." });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const { rows } = await pool.query(
      `INSERT INTO users (email, password_hash, owner_name, business_name, business_type)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, owner_name, business_name, business_type, created_at`,
      [email, passwordHash, ownerName, businessName, businessType]
    );

    const user = rows[0];
    const token = signToken(user);
    return res.status(201).json({ token, user: sanitizeUser(user, "admin") });
  } catch (err) {
    console.error("[Auth] Register error:", err.message);
    return res.status(500).json({ error: "Registration failed. Please try again." });
  }
});

// ─── POST /api/auth/login ─────────────────────────────────────────
router.post("/login", validate(loginSchema), async (req, res) => {
  const { email, password } = req.body;
  try {
    const { rows } = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    const user = rows[0];

    const dummyHash = "$2a$12$invalidhashpadding00000000000000000000000000000000000000";
    const valid = user
      ? await bcrypt.compare(password, user.password_hash)
      : await bcrypt.compare(password, dummyHash);

    if (!user || !valid) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const token = signToken(user);
    return res.json({ token, user: sanitizeUser(user, "admin") });
  } catch (err) {
    console.error("[Auth] Login error:", err.message);
    return res.status(500).json({ error: "Login failed. Please try again." });
  }
});

// ─── GET /api/auth/me ─────────────────────────────────────────────
router.get("/me", authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, email, owner_name, business_name, business_type, created_at FROM users WHERE id = $1",
      [req.user.effectiveUserId || req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "User not found." });
    return res.json({ user: sanitizeUser(rows[0], req.user.role) });
  } catch (err) {
    console.error("[Auth] /me error:", err.message);
    return res.status(500).json({ error: "Failed to retrieve user." });
  }
});

// ─── PATCH /api/auth/profile ──────────────────────────────────────
router.patch("/profile", authenticate, requireRole(["admin", "edit"]), validate(profileSchema), async (req, res) => {
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

  values.push(req.user.effectiveUserId || req.user.id);
  try {
    const { rows } = await pool.query(
      `UPDATE users SET ${fields.join(", ")} WHERE id = $${idx}
       RETURNING id, email, owner_name, business_name, business_type, created_at`,
      values
    );
    return res.json({ user: sanitizeUser(rows[0], req.user.role) });
  } catch (err) {
    console.error("[Auth] Profile update error:", err.message);
    return res.status(500).json({ error: "Failed to update profile." });
  }
});

// ─── Workspace Partner Access Endpoints ────────────────────────────

// GET /api/auth/members — List all partners invited to workspace
router.get("/members", authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT wm.id, wm.email, wm.role, wm.status, wm.created_at, u.owner_name
       FROM workspace_members wm
       LEFT JOIN users u ON LOWER(u.email) = LOWER(wm.email)
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

// POST /api/auth/invite — Invite partner by email + assign role
router.post("/invite", authenticate, requireRole(["admin"]), validate(inviteSchema), async (req, res) => {
  const { email, role } = req.body;
  const ownerId = req.user.effectiveUserId;

  try {
    // Check if target user already exists
    const userMatch = await pool.query("SELECT id FROM users WHERE LOWER(email) = LOWER($1)", [email]);
    const targetUserId = userMatch.rows[0]?.id || null;

    const { rows } = await pool.query(
      `INSERT INTO workspace_members (owner_id, user_id, email, role, status)
       VALUES ($1, $2, $3, $4, 'accepted')
       ON CONFLICT (owner_id, email) DO UPDATE SET role = EXCLUDED.role, status = 'accepted'
       RETURNING id, email, role, status, created_at`,
      [ownerId, targetUserId, email, role]
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

function sanitizeUser(u, role = "admin") {
  return {
    id: u.id,
    email: u.email,
    ownerName: u.owner_name,
    businessName: u.business_name,
    businessType: u.business_type,
    role: role || "admin",
    createdAt: u.created_at,
  };
}

module.exports = router;
