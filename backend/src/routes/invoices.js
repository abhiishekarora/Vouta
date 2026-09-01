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
      `SELECT id, user_id, invoice_no, client, amount, issue_date, due_date,
              status, note, file_name, file_mime, created_at
       FROM invoices WHERE user_id = $1 ORDER BY issue_date DESC, created_at DESC`,
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
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING id, user_id, invoice_no, client, amount, issue_date, due_date, status, note, file_name, file_mime, created_at`,
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
      `UPDATE invoices SET status = $1 WHERE user_id = $2 AND id = $3
       RETURNING id, user_id, invoice_no, client, amount, issue_date, due_date, status, note, file_name, file_mime, created_at`,
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

// POST /api/invoices/:id/upload — attach a PDF/JPG/PNG file to an invoice
router.post("/:id/upload", requireRole(["admin", "edit"]), (req, res, next) => {
  const limiter = req.app.get("uploadLimiter");
  limiter(req, res, () => {
    const upload = req.app.get("upload");
    upload.single("file")(req, res, next);
  });
}, async (req, res) => {
  const ownerId = req.user.effectiveUserId || req.user.id;

  if (!req.file) {
    return res.status(400).json({ error: "No file provided. Please attach a PDF, JPG, or PNG file." });
  }

  try {
    const { rows } = await pool.query(
      `UPDATE invoices
       SET file_data = $1, file_name = $2, file_mime = $3
       WHERE user_id = $4 AND id = $5
       RETURNING id, invoice_no, file_name, file_mime`,
      [req.file.buffer, req.file.originalname, req.file.mimetype, ownerId, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Invoice not found." });
    return res.json({
      message: "File uploaded successfully.",
      fileName: rows[0].file_name,
      fileMime: rows[0].file_mime,
    });
  } catch (err) {
    console.error("[Invoices] Upload error:", err.message);
    return res.status(500).json({ error: "Failed to upload file." });
  }
});

// GET /api/invoices/:id/file — download/stream the attached invoice file
router.get("/:id/file", async (req, res) => {
  const ownerId = req.user.effectiveUserId || req.user.id;
  try {
    const { rows } = await pool.query(
      "SELECT file_data, file_name, file_mime FROM invoices WHERE user_id = $1 AND id = $2",
      [ownerId, req.params.id]
    );
    if (!rows[0] || !rows[0].file_data) {
      return res.status(404).json({ error: "No file attached to this invoice." });
    }
    const { file_data, file_name, file_mime } = rows[0];
    res.setHeader("Content-Type", file_mime);
    res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(file_name)}"`);
    res.setHeader("Content-Length", file_data.length);
    return res.send(file_data);
  } catch (err) {
    console.error("[Invoices] File download error:", err.message);
    return res.status(500).json({ error: "Failed to retrieve file." });
  }
});

// DELETE /api/invoices/:id/file — remove attached file without deleting the invoice
router.delete("/:id/file", requireRole(["admin", "edit"]), async (req, res) => {
  const ownerId = req.user.effectiveUserId || req.user.id;
  try {
    const { rowCount } = await pool.query(
      "UPDATE invoices SET file_data = NULL, file_name = NULL, file_mime = NULL WHERE user_id = $1 AND id = $2",
      [ownerId, req.params.id]
    );
    if (!rowCount) return res.status(404).json({ error: "Invoice not found." });
    return res.status(204).end();
  } catch (err) {
    console.error("[Invoices] File delete error:", err.message);
    return res.status(500).json({ error: "Failed to remove file." });
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
    fileName: r.file_name || null,
    fileMime: r.file_mime || null,
    hasFile: !!r.file_name,
    createdAt: r.created_at,
  };
}

module.exports = router;
