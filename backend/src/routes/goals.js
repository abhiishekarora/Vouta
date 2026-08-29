const express = require("express");
const { z } = require("zod");
const { pool } = require("../config/db");
const { authenticate, requireRole } = require("../middleware/auth");
const { validate } = require("../middleware/validate");

const router = express.Router();
router.use(authenticate);

const GOAL_CATEGORIES = ["financial", "milestone", "deadline", "build"];
const GOAL_STATUSES = ["active", "completed", "archived"];

const goalSchema = z.object({
  title: z.string().min(1, "Title is required.").max(200).trim(),
  category: z.enum(GOAL_CATEGORIES).default("financial"),
  targetAmount: z.coerce.number().positive("Target amount must be positive.").optional().nullable(),
  currentAmount: z.coerce.number().min(0).default(0),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format.").optional().nullable(),
  note: z.string().max(1000).trim().default(""),
});

// GET /api/goals
router.get("/", async (req, res) => {
  try {
    const ownerId = req.user.effectiveUserId || req.user.id;
    const { rows } = await pool.query(
      "SELECT * FROM goals WHERE user_id = $1 ORDER BY created_at DESC",
      [ownerId]
    );
    return res.json(rows.map(fromRow));
  } catch (err) {
    console.error("[Goals] GET error:", err.message);
    return res.status(500).json({ error: "Failed to fetch goals." });
  }
});

// POST /api/goals
router.post("/", requireRole(["admin", "edit"]), validate(goalSchema), async (req, res) => {
  const { title, category, targetAmount, currentAmount, deadline, note } = req.body;
  const ownerId = req.user.effectiveUserId || req.user.id;
  try {
    const { rows } = await pool.query(
      `INSERT INTO goals (user_id, title, category, target_amount, current_amount, deadline, note)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [ownerId, title, category || "financial", targetAmount || null, currentAmount || 0, deadline || null, note]
    );
    return res.status(201).json(fromRow(rows[0]));
  } catch (err) {
    console.error("[Goals] POST error:", err.message);
    return res.status(500).json({ error: "Failed to create goal." });
  }
});

// PATCH /api/goals/:id
router.patch("/:id", requireRole(["admin", "edit"]), async (req, res) => {
  const ownerId = req.user.effectiveUserId || req.user.id;
  const updates = {};
  const body = req.body;

  if (body.title !== undefined)         updates.title          = String(body.title).slice(0, 200);
  if (body.category !== undefined)      updates.category       = GOAL_CATEGORIES.includes(body.category) ? body.category : "financial";
  if (body.targetAmount !== undefined)  updates.target_amount  = body.targetAmount !== null ? Number(body.targetAmount) : null;
  if (body.currentAmount !== undefined) updates.current_amount = Number(body.currentAmount);
  if (body.deadline !== undefined)      updates.deadline       = body.deadline || null;
  if (body.note !== undefined)          updates.note           = String(body.note).slice(0, 1000);
  if (body.status !== undefined)        updates.status         = GOAL_STATUSES.includes(body.status) ? body.status : "active";

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: "No valid fields to update." });
  }

  const sets = Object.keys(updates).map((k, i) => `${k} = $${i + 1}`).join(", ");
  const vals = [...Object.values(updates), ownerId, req.params.id];

  try {
    const { rows } = await pool.query(
      `UPDATE goals SET ${sets} WHERE user_id = $${vals.length - 1} AND id = $${vals.length} RETURNING *`,
      vals
    );
    if (!rows[0]) return res.status(404).json({ error: "Goal not found." });
    return res.json(fromRow(rows[0]));
  } catch (err) {
    console.error("[Goals] PATCH error:", err.message);
    return res.status(500).json({ error: "Failed to update goal." });
  }
});

// DELETE /api/goals/:id
router.delete("/:id", requireRole(["admin", "edit"]), async (req, res) => {
  const ownerId = req.user.effectiveUserId || req.user.id;
  try {
    const { rowCount } = await pool.query(
      "DELETE FROM goals WHERE user_id = $1 AND id = $2",
      [ownerId, req.params.id]
    );
    if (!rowCount) return res.status(404).json({ error: "Goal not found." });
    return res.status(204).end();
  } catch (err) {
    console.error("[Goals] DELETE error:", err.message);
    return res.status(500).json({ error: "Failed to delete goal." });
  }
});

function fromRow(r) {
  return {
    id: r.id,
    title: r.title,
    category: r.category || "financial",
    targetAmount: r.target_amount !== null ? Number(r.target_amount) : null,
    currentAmount: Number(r.current_amount || 0),
    deadline: r.deadline,
    note: r.note,
    status: r.status || "active",
    createdAt: r.created_at,
  };
}

module.exports = router;
