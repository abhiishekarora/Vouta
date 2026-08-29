const express = require("express");
const { z } = require("zod");
const { pool } = require("../config/db");
const { authenticate } = require("../middleware/auth");
const { validate } = require("../middleware/validate");

const router = express.Router();
router.use(authenticate);

const taskSchema = z.object({
  projectId:  z.string().uuid("Invalid project ID."),
  title:      z.string().min(1, "Task title is required.").max(300).trim(),
  assignedTo: z.string().uuid("Invalid team member ID.").optional().nullable(),
  priority:   z.enum(["high", "medium", "low"]).default("medium"),
});

const moveSchema = z.object({
  status: z.enum(["To Do", "In Progress", "Done"]),
});

// GET /api/project-tasks?projectId=xxx
router.get("/", async (req, res) => {
  try {
    let query = "SELECT * FROM project_tasks WHERE user_id = $1";
    const params = [req.user.id];

    if (req.query.projectId) {
      params.push(req.query.projectId);
      query += ` AND project_id = $${params.length}`;
    }

    query += " ORDER BY created_at DESC";
    const { rows } = await pool.query(query, params);
    return res.json(rows.map(fromRow));
  } catch (err) {
    console.error("[Tasks] GET error:", err.message);
    return res.status(500).json({ error: "Failed to fetch tasks." });
  }
});

// POST /api/project-tasks
router.post("/", validate(taskSchema), async (req, res) => {
  const { projectId, title, assignedTo, priority } = req.body;

  // Verify project belongs to this user
  try {
    const proj = await pool.query(
      "SELECT id FROM projects WHERE user_id = $1 AND id = $2",
      [req.user.id, projectId]
    );
    if (!proj.rows[0]) {
      return res.status(404).json({ error: "Project not found or access denied." });
    }

    const { rows } = await pool.query(
      `INSERT INTO project_tasks (user_id, project_id, assigned_to, title, priority)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [req.user.id, projectId, assignedTo || null, title, priority]
    );
    return res.status(201).json(fromRow(rows[0]));
  } catch (err) {
    console.error("[Tasks] POST error:", err.message);
    return res.status(500).json({ error: "Failed to create task." });
  }
});

// PATCH /api/project-tasks/:id/move — move to a new Kanban status
router.patch("/:id/move", validate(moveSchema), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `UPDATE project_tasks SET status = $1
       WHERE user_id = $2 AND id = $3 RETURNING *`,
      [req.body.status, req.user.id, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Task not found." });
    return res.json(fromRow(rows[0]));
  } catch (err) {
    console.error("[Tasks] PATCH move error:", err.message);
    return res.status(500).json({ error: "Failed to move task." });
  }
});

// DELETE /api/project-tasks/:id
router.delete("/:id", async (req, res) => {
  try {
    const { rowCount } = await pool.query(
      "DELETE FROM project_tasks WHERE user_id = $1 AND id = $2",
      [req.user.id, req.params.id]
    );
    if (!rowCount) return res.status(404).json({ error: "Task not found." });
    return res.status(204).end();
  } catch (err) {
    console.error("[Tasks] DELETE error:", err.message);
    return res.status(500).json({ error: "Failed to delete task." });
  }
});

function fromRow(r) {
  return {
    id: r.id,
    projectId: r.project_id,
    assignedTo: r.assigned_to,
    title: r.title,
    status: r.status,
    priority: r.priority,
    createdAt: r.created_at,
  };
}

module.exports = router;
