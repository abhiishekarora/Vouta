const express = require("express");
const { z } = require("zod");
const { pool } = require("../config/db");
const { authenticate, requireRole } = require("../middleware/auth");
const { validate } = require("../middleware/validate");

const router = express.Router();
router.use(authenticate);

const txSchema = z.object({
  type: z.enum(["income", "expense"]),
  amount: z.coerce.number().positive("Amount must be positive."),
  category: z.string().min(1).max(100).trim(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format."),
  note: z.string().max(500).trim().default(""),
});

// GET /api/transactions
router.get("/", async (req, res) => {
  const ownerId = req.user.effectiveUserId || req.user.id;
  try {
    const { rows } = await pool.query(
      "SELECT * FROM transactions WHERE user_id = $1 ORDER BY date DESC, created_at DESC",
      [ownerId]
    );
    return res.json(rows.map(fromRow));
  } catch (err) {
    console.error("[Transactions] GET error:", err.message);
    return res.status(500).json({ error: "Failed to fetch transactions." });
  }
});

// POST /api/transactions
router.post("/", requireRole(["admin", "edit"]), validate(txSchema), async (req, res) => {
  const { type, amount, category, date, note } = req.body;
  const ownerId = req.user.effectiveUserId || req.user.id;
  try {
    const { rows } = await pool.query(
      `INSERT INTO transactions (user_id, type, amount, category, date, note)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [ownerId, type, amount, category, date, note]
    );
    return res.status(201).json(fromRow(rows[0]));
  } catch (err) {
    console.error("[Transactions] POST error:", err.message);
    return res.status(500).json({ error: "Failed to create transaction." });
  }
});

// DELETE /api/transactions/:id
router.delete("/:id", requireRole(["admin", "edit"]), async (req, res) => {
  const ownerId = req.user.effectiveUserId || req.user.id;
  try {
    const { rowCount } = await pool.query(
      "DELETE FROM transactions WHERE user_id = $1 AND id = $2",
      [ownerId, req.params.id]
    );
    if (!rowCount) return res.status(404).json({ error: "Transaction not found." });
    return res.status(204).end();
  } catch (err) {
    console.error("[Transactions] DELETE error:", err.message);
    return res.status(500).json({ error: "Failed to delete transaction." });
  }
});

function fromRow(r) {
  return {
    id: r.id,
    type: r.type,
    amount: Number(r.amount),
    category: r.category,
    date: r.date,
    note: r.note,
    createdAt: r.created_at,
  };
}

module.exports = router;
