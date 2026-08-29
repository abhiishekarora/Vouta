const express = require("express");
const { z } = require("zod");
const { pool } = require("../config/db");
const { authenticate } = require("../middleware/auth");
const { validate } = require("../middleware/validate");

const router = express.Router();
router.use(authenticate);

const docSchema = z.object({
  title:      z.string().min(1, "Title is required.").max(300).trim(),
  category:   z.string().max(100).trim().default("Other"),
  docNumber:  z.string().max(100).trim().default(""),
  issueDate:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  status:     z.string().max(50).trim().default("Filed"),
  notes:      z.string().max(1000).trim().default(""),
  content:    z.string().max(10000).trim().default(""),
});

// GET /api/documents
router.get("/", async (req, res) => {
  const { search, category } = req.query;
  try {
    let query = "SELECT * FROM documents WHERE user_id = $1";
    const params = [req.user.id];

    if (category && category !== "all") {
      params.push(category);
      query += ` AND category = $${params.length}`;
    }
    if (search) {
      params.push(`%${search.toLowerCase()}%`);
      query += ` AND (LOWER(title) LIKE $${params.length} OR LOWER(doc_number) LIKE $${params.length} OR LOWER(notes) LIKE $${params.length} OR LOWER(content) LIKE $${params.length})`;
    }

    query += " ORDER BY issue_date DESC NULLS LAST, created_at DESC";
    const { rows } = await pool.query(query, params);
    return res.json(rows.map(fromRow));
  } catch (err) {
    console.error("[Documents] GET error:", err.message);
    return res.status(500).json({ error: "Failed to fetch documents." });
  }
});

// POST /api/documents
router.post("/", validate(docSchema), async (req, res) => {
  const { title, category, docNumber, issueDate, expiryDate, status, notes, content } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO documents (user_id, title, category, doc_number, issue_date, expiry_date, status, notes, content)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [req.user.id, title, category, docNumber, issueDate || null, expiryDate || null, status, notes, content]
    );
    return res.status(201).json(fromRow(rows[0]));
  } catch (err) {
    console.error("[Documents] POST error:", err.message);
    return res.status(500).json({ error: "Failed to create document." });
  }
});

// DELETE /api/documents/:id
router.delete("/:id", async (req, res) => {
  try {
    const { rowCount } = await pool.query(
      "DELETE FROM documents WHERE user_id = $1 AND id = $2",
      [req.user.id, req.params.id]
    );
    if (!rowCount) return res.status(404).json({ error: "Document not found." });
    return res.status(204).end();
  } catch (err) {
    console.error("[Documents] DELETE error:", err.message);
    return res.status(500).json({ error: "Failed to delete document." });
  }
});

function fromRow(r) {
  return {
    id: r.id,
    title: r.title,
    category: r.category,
    docNumber: r.doc_number,
    issueDate: r.issue_date,
    expiryDate: r.expiry_date,
    status: r.status,
    notes: r.notes,
    content: r.content,
    createdAt: r.created_at,
  };
}

module.exports = router;
