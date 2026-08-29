const express = require("express");
const { z } = require("zod");
const { pool } = require("../config/db");
const { authenticate } = require("../middleware/auth");
const { validate } = require("../middleware/validate");

const router = express.Router();
router.use(authenticate);

const goalSchema = z.object({
  title: z.string().min(1, "Title is required.").max(200).trim(),
  targetAmount: z.coerce.number().positive("Target amount must be positive."),
  currentAmount: z.coerce.number().min(0).default(0),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format.").optional().nullable(),
  note: z.string().max(1000).trim().default(""),
});

// GET /api/goals
router.get("/", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM goals WHERE user_id = $1 ORDER BY created_at DESC",
      [req.user.id]
    );
    return res.json(rows.map(fromRow));
  } catch (err) {
    console.error("[Goals] GET error:", err.message);
    return res.status(500).json({ error: "Failed to fetch goals." });
  }
});

// POST /api/goals
router.post("/", validate(goalSchema), async (req, res) => {
  const { title, targetAmount, currentAmount, deadline, note } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO goals (user_id, title, target_amount, current_amount, deadline, note)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [req.user.id, title, targetAmount, currentAmount, deadline || null, note]
    );
    return res.status(201).json(fromRow(rows[0]));
  } catch (err) {
    console.error("[Goals] POST error:", err.message);
    return res.status(500).json({ error: "Failed to create goal." });
  }
});

// PATCH /api/goals/:id — allows partial updates (e.g. add progress)
router.patch("/:id", async (req, res) => {
  const allowed = ["title", "target_amount", "current_amount", "deadline", "note"];
  const updates = {};
  const body = req.body;

  if (body.title !== undefined)         updates.title          = String(body.title).slice(0, 200);
  if (body.targetAmount !== undefined)  updates.target_amount  = Number(body.targetAmount);
  if (body.currentAmount !== undefined) updates.current_amount = Number(body.currentAmount);
  if (body.deadline !== undefined)      updates.deadline       = body.deadline || null;
  if (body.note !== undefined)          updates.note           = String(body.note).slice(0, 1000);

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: "No valid fields to update." });
  }

  const sets = Object.keys(updates).map((k, i) => `${k} = $${i + 1}`).join(", ");
  const vals = [...Object.values(updates), req.user.id, req.params.id];

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
router.delete("/:id", async (req, res) => {
  try {
    const { rowCount } = await pool.query(
      "DELETE FROM goals WHERE user_id = $1 AND id = $2",
      [req.user.id, req.params.id]
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
    targetAmount: Number(r.target_amount),
    currentAmount: Number(r.current_amount),
    deadline: r.deadline,
    note: r.note,
    createdAt: r.created_at,
  };
}

module.exports = router;
