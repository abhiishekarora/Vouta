const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { z } = require("zod");
const { pool } = require("../config/db");
const { validate } = require("../middleware/validate");
const { authenticate } = require("../middleware/auth");

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

// ─── Token helper ─────────────────────────────────────────────────
function signToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      businessName: user.business_name,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}

// ─── POST /api/auth/register ──────────────────────────────────────
router.post("/register", validate(registerSchema), async (req, res) => {
  const { email, password, ownerName, businessName, businessType } = req.body;
  try {
    // Check duplicate
    const existing = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: "An account with this email already exists." });
    }

    // Hash password with bcrypt cost factor 12
    const passwordHash = await bcrypt.hash(password, 12);

    const { rows } = await pool.query(
      `INSERT INTO users (email, password_hash, owner_name, business_name, business_type)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, owner_name, business_name, business_type, created_at`,
      [email, passwordHash, ownerName, businessName, businessType]
    );

    const user = rows[0];
    const token = signToken(user);
    return res.status(201).json({ token, user: sanitizeUser(user) });
  } catch (err) {
    console.error("[Auth] Register error:", err.message);
    return res.status(500).json({ error: "Registration failed. Please try again." });
  }
});

// ─── POST /api/auth/login ─────────────────────────────────────────
router.post("/login", validate(loginSchema), async (req, res) => {
  const { email, password } = req.body;
  try {
    const { rows } = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );
    const user = rows[0];

    // Constant-time comparison to prevent timing attacks
    const dummyHash = "$2a$12$invalidhashpadding00000000000000000000000000000000000000";
    const valid = user
      ? await bcrypt.compare(password, user.password_hash)
      : await bcrypt.compare(password, dummyHash);

    if (!user || !valid) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const token = signToken(user);
    return res.json({ token, user: sanitizeUser(user) });
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
      [req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "User not found." });
    return res.json({ user: sanitizeUser(rows[0]) });
  } catch (err) {
    console.error("[Auth] /me error:", err.message);
    return res.status(500).json({ error: "Failed to retrieve user." });
  }
});

// ─── PATCH /api/auth/profile ──────────────────────────────────────
router.patch("/profile", authenticate, validate(profileSchema), async (req, res) => {
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

  values.push(req.user.id);
  try {
    const { rows } = await pool.query(
      `UPDATE users SET ${fields.join(", ")} WHERE id = $${idx}
       RETURNING id, email, owner_name, business_name, business_type, created_at`,
      values
    );
    return res.json({ user: sanitizeUser(rows[0]) });
  } catch (err) {
    console.error("[Auth] Profile update error:", err.message);
    return res.status(500).json({ error: "Failed to update profile." });
  }
});

// ─── Sanitize user (never expose password_hash) ───────────────────
function sanitizeUser(u) {
  return {
    id: u.id,
    email: u.email,
    ownerName: u.owner_name,
    businessName: u.business_name,
    businessType: u.business_type,
    createdAt: u.created_at,
  };
}

module.exports = router;
