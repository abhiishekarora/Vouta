const express = require("express");
const { z } = require("zod");
const { pool } = require("../config/db");
const { authenticate, requireRole } = require("../middleware/auth");
const { validate } = require("../middleware/validate");

const router = express.Router();
router.use(authenticate);

const invoiceSchema = z.object({
  invoiceNo: z.string().min(1).max(60).trim(),
  client:    z.string().min(1).max(200).trim(),
  amount:    z.coerce.number().positive("Amount must be positive."),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dueDate:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  status:    z.enum(["draft", "sent", "paid", "overdue"]).default("draft"),
  note:      z.string().max(500).trim().default(""),
});

const statusSchema = z.object({
  status: z.enum(["draft", "sent", "paid", "overdue"]),
});

// GET /api/invoices
router.get("/", async (req, res) => {
  const ownerId = req.user.effectiveUserId || req.user.id;
  try {
    const { rows } = await pool.query(
      "SELECT * FROM invoices WHERE user_id = $1 ORDER BY issue_date DESC, created_at DESC",
      [ownerId]
    );
    return res.json(rows.map(fromRow));
  } catch (err) {
    console.error("[Invoices] GET error:", err.message);
    return res.status(500).json({ error: "Failed to fetch invoices." });
  }
});

// POST /api/invoices
router.post("/", requireRole(["admin", "edit"]), validate(invoiceSchema), async (req, res) => {
  const { invoiceNo, client, amount, issueDate, dueDate, status, note } = req.body;
  const ownerId = req.user.effectiveUserId || req.user.id;
  try {
    const { rows } = await pool.query(
      `INSERT INTO invoices (user_id, invoice_no, client, amount, issue_date, due_date, status, note)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [ownerId, invoiceNo, client, amount, issueDate, dueDate || null, status, note]
    );
    return res.status(201).json(fromRow(rows[0]));
  } catch (err) {
    console.error("[Invoices] POST error:", err.message);
    return res.status(500).json({ error: "Failed to create invoice." });
  }
});

// PATCH /api/invoices/:id/status
router.patch("/:id/status", requireRole(["admin", "edit"]), validate(statusSchema), async (req, res) => {
  const ownerId = req.user.effectiveUserId || req.user.id;
  try {
    const { rows } = await pool.query(
      "UPDATE invoices SET status = $1 WHERE user_id = $2 AND id = $3 RETURNING *",
      [req.body.status, ownerId, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Invoice not found." });
    return res.json(fromRow(rows[0]));
  } catch (err) {
    console.error("[Invoices] PATCH status error:", err.message);
    return res.status(500).json({ error: "Failed to update invoice status." });
  }
});

// DELETE /api/invoices/:id
router.delete("/:id", requireRole(["admin", "edit"]), async (req, res) => {
  const ownerId = req.user.effectiveUserId || req.user.id;
  try {
    const { rowCount } = await pool.query(
      "DELETE FROM invoices WHERE user_id = $1 AND id = $2",
      [ownerId, req.params.id]
    );
    if (!rowCount) return res.status(404).json({ error: "Invoice not found." });
    return res.status(204).end();
  } catch (err) {
    console.error("[Invoices] DELETE error:", err.message);
    return res.status(500).json({ error: "Failed to delete invoice." });
  }
});

function fromRow(r) {
  return {
    id: r.id,
    invoiceNo: r.invoice_no,
    client: r.client,
    amount: Number(r.amount),
    issueDate: r.issue_date,
    dueDate: r.due_date,
    status: r.status,
    note: r.note,
    createdAt: r.created_at,
  };
}

module.exports = router;
