const express = require("express");
const { z } = require("zod");
const { pool } = require("../config/db");
const { authenticate, requireRole } = require("../middleware/auth");
const { validate } = require("../middleware/validate");

const router = express.Router();
router.use(authenticate);

const memberSchema = z.object({
  name:       z.string().min(1, "Name is required.").max(120).trim(),
  role:       z.string().max(150).trim().default(""),
  email:      z.string().email("Invalid email.").toLowerCase(),
  department: z.string().max(100).trim().default("Other"),
  capacity:   z.coerce.number().int().min(0).max(168).default(40),
});

// GET /api/team
router.get("/", async (req, res) => {
  const ownerId = req.user.effectiveUserId || req.user.id;
  try {
    const { rows } = await pool.query(
      "SELECT * FROM team_members WHERE user_id = $1 ORDER BY created_at DESC",
      [ownerId]
    );
    return res.json(rows.map(fromRow));
  } catch (err) {
    console.error("[Team] GET error:", err.message);
    return res.status(500).json({ error: "Failed to fetch team members." });
  }
});

// POST /api/team
router.post("/", requireRole(["admin", "edit"]), validate(memberSchema), async (req, res) => {
  const { name, role, email, department, capacity } = req.body;
  const ownerId = req.user.effectiveUserId || req.user.id;
  try {
    const { rows } = await pool.query(
      `INSERT INTO team_members (user_id, name, role, email, department, capacity)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [ownerId, name, role, email, department, capacity]
    );
    return res.status(201).json(fromRow(rows[0]));
  } catch (err) {
    console.error("[Team] POST error:", err.message);
    return res.status(500).json({ error: "Failed to add team member." });
  }
});

// PATCH /api/team/:id/leave
router.patch("/:id/leave", requireRole(["admin", "edit"]), async (req, res) => {
  const ownerId = req.user.effectiveUserId || req.user.id;
  try {
    const { rows } = await pool.query(
      `UPDATE team_members SET on_leave = NOT on_leave
       WHERE user_id = $1 AND id = $2 RETURNING *`,
      [ownerId, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Team member not found." });
    return res.json(fromRow(rows[0]));
  } catch (err) {
    console.error("[Team] PATCH leave error:", err.message);
    return res.status(500).json({ error: "Failed to update member status." });
  }
});

// DELETE /api/team/:id
router.delete("/:id", requireRole(["admin", "edit"]), async (req, res) => {
  const ownerId = req.user.effectiveUserId || req.user.id;
  try {
    const { rowCount } = await pool.query(
      "DELETE FROM team_members WHERE user_id = $1 AND id = $2",
      [ownerId, req.params.id]
    );
    if (!rowCount) return res.status(404).json({ error: "Team member not found." });
    return res.status(204).end();
  } catch (err) {
    console.error("[Team] DELETE error:", err.message);
    return res.status(500).json({ error: "Failed to delete team member." });
  }
});

function fromRow(r) {
  return {
    id: r.id,
    name: r.name,
    role: r.role,
    email: r.email,
    department: r.department,
    capacity: r.capacity,
    onLeave: r.on_leave,
    createdAt: r.created_at,
  };
}

module.exports = router;
