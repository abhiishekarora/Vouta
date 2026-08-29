const express = require("express");
const { z } = require("zod");
const { pool } = require("../config/db");
const { authenticate, requireRole } = require("../middleware/auth");
const { validate } = require("../middleware/validate");

const router = express.Router();
router.use(authenticate);

const projectSchema = z.object({
  name:        z.string().min(1, "Project name is required.").max(200).trim(),
  label:       z.string().max(50).trim().default("Internal"),
  startDate:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  status:      z.enum(["Not Started", "Active", "Blocked", "Completed"]).default("Not Started"),
  description: z.string().max(1000).trim().default(""),
});

const statusSchema = z.object({
  status: z.enum(["Not Started", "Active", "Blocked", "Completed"]),
});

// GET /api/projects
router.get("/", async (req, res) => {
  const ownerId = req.user.effectiveUserId || req.user.id;
  try {
    const { rows } = await pool.query(
      "SELECT * FROM projects WHERE user_id = $1 ORDER BY created_at DESC",
      [ownerId]
    );
    return res.json(rows.map(fromRow));
  } catch (err) {
    console.error("[Projects] GET error:", err.message);
    return res.status(500).json({ error: "Failed to fetch projects." });
  }
});

// POST /api/projects
router.post("/", requireRole(["admin", "edit"]), validate(projectSchema), async (req, res) => {
  const { name, label, startDate, status, description } = req.body;
  const ownerId = req.user.effectiveUserId || req.user.id;
  try {
    const { rows } = await pool.query(
      `INSERT INTO projects (user_id, name, label, start_date, status, description)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [ownerId, name, label, startDate || null, status, description]
    );
    return res.status(201).json(fromRow(rows[0]));
  } catch (err) {
    console.error("[Projects] POST error:", err.message);
    return res.status(500).json({ error: "Failed to create project." });
  }
});

// PATCH /api/projects/:id/status
router.patch("/:id/status", requireRole(["admin", "edit"]), validate(statusSchema), async (req, res) => {
  const ownerId = req.user.effectiveUserId || req.user.id;
  try {
    const { rows } = await pool.query(
      "UPDATE projects SET status = $1 WHERE user_id = $2 AND id = $3 RETURNING *",
      [req.body.status, ownerId, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Project not found." });
    return res.json(fromRow(rows[0]));
  } catch (err) {
    console.error("[Projects] PATCH status error:", err.message);
    return res.status(500).json({ error: "Failed to update project status." });
  }
});

// DELETE /api/projects/:id
router.delete("/:id", requireRole(["admin", "edit"]), async (req, res) => {
  const ownerId = req.user.effectiveUserId || req.user.id;
  try {
    const { rowCount } = await pool.query(
      "DELETE FROM projects WHERE user_id = $1 AND id = $2",
      [ownerId, req.params.id]
    );
    if (!rowCount) return res.status(404).json({ error: "Project not found." });
    return res.status(204).end();
  } catch (err) {
    console.error("[Projects] DELETE error:", err.message);
    return res.status(500).json({ error: "Failed to delete project." });
  }
});

function fromRow(r) {
  return {
    id: r.id,
    name: r.name,
    label: r.label,
    startDate: r.start_date,
    status: r.status,
    description: r.description,
    createdAt: r.created_at,
  };
}

module.exports = router;
