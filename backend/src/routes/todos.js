const express = require("express");
const { z } = require("zod");
const { pool } = require("../config/db");
const { authenticate } = require("../middleware/auth");
const { validate } = require("../middleware/validate");

const router = express.Router();
router.use(authenticate);

const todoSchema = z.object({
  text:     z.string().min(1, "Task text is required.").max(500).trim(),
  priority: z.enum(["high", "medium", "low"]).default("medium"),
  dueDate:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
});

// GET /api/todos
router.get("/", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM todos WHERE user_id = $1 ORDER BY done ASC, created_at DESC",
      [req.user.id]
    );
    return res.json(rows.map(fromRow));
  } catch (err) {
    console.error("[Todos] GET error:", err.message);
    return res.status(500).json({ error: "Failed to fetch tasks." });
  }
});

// POST /api/todos
router.post("/", validate(todoSchema), async (req, res) => {
  const { text, priority, dueDate } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO todos (user_id, text, priority, due_date)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [req.user.id, text, priority, dueDate || null]
    );
    return res.status(201).json(fromRow(rows[0]));
  } catch (err) {
    console.error("[Todos] POST error:", err.message);
    return res.status(500).json({ error: "Failed to create task." });
  }
});

// PATCH /api/todos/:id/toggle  — toggle done state
router.patch("/:id/toggle", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `UPDATE todos SET done = NOT done WHERE user_id = $1 AND id = $2 RETURNING *`,
      [req.user.id, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Task not found." });
    return res.json(fromRow(rows[0]));
  } catch (err) {
    console.error("[Todos] PATCH toggle error:", err.message);
    return res.status(500).json({ error: "Failed to toggle task." });
  }
});

// DELETE /api/todos/:id
router.delete("/:id", async (req, res) => {
  try {
    const { rowCount } = await pool.query(
      "DELETE FROM todos WHERE user_id = $1 AND id = $2",
      [req.user.id, req.params.id]
    );
    if (!rowCount) return res.status(404).json({ error: "Task not found." });
    return res.status(204).end();
  } catch (err) {
    console.error("[Todos] DELETE error:", err.message);
    return res.status(500).json({ error: "Failed to delete task." });
  }
});

function fromRow(r) {
  return {
    id: r.id,
    text: r.text,
    priority: r.priority,
    dueDate: r.due_date,
    done: r.done,
    createdAt: r.created_at,
  };
}

module.exports = router;
