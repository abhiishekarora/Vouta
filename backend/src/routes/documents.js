const express = require("express");
const { z } = require("zod");
const { pool } = require("../config/db");
const { authenticate, requireRole } = require("../middleware/auth");
const { validate } = require("../middleware/validate");

const router = express.Router();
router.use(authenticate);

// Helper to get upload middleware and rate limiter from the app instance
function getUpload(req) {
  return req.app.get("upload");
}
function getUploadLimiter(req) {
  return req.app.get("uploadLimiter");
}

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
  const ownerId = req.user.effectiveUserId || req.user.id;
  const { search, category } = req.query;
  try {
    let query = `SELECT id, user_id, title, category, doc_number, issue_date, expiry_date,
                        status, notes, content, file_name, file_mime, created_at
                 FROM documents WHERE user_id = $1`;
    const params = [ownerId];

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
router.post("/", requireRole(["admin", "edit"]), validate(docSchema), async (req, res) => {
  const { title, category, docNumber, issueDate, expiryDate, status, notes, content } = req.body;
  const ownerId = req.user.effectiveUserId || req.user.id;
  try {
    const { rows } = await pool.query(
      `INSERT INTO documents (user_id, title, category, doc_number, issue_date, expiry_date, status, notes, content)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING id, user_id, title, category, doc_number, issue_date, expiry_date, status, notes, content, file_name, file_mime, created_at`,
      [ownerId, title, category, docNumber, issueDate || null, expiryDate || null, status, notes, content]
    );
    return res.status(201).json(fromRow(rows[0]));
  } catch (err) {
    console.error("[Documents] POST error:", err.message);
    return res.status(500).json({ error: "Failed to create document." });
  }
});

// DELETE /api/documents/:id
router.delete("/:id", requireRole(["admin", "edit"]), async (req, res) => {
  const ownerId = req.user.effectiveUserId || req.user.id;
  try {
    const { rowCount } = await pool.query(
      "DELETE FROM documents WHERE user_id = $1 AND id = $2",
      [ownerId, req.params.id]
    );
    if (!rowCount) return res.status(404).json({ error: "Document not found." });
    return res.status(204).end();
  } catch (err) {
    console.error("[Documents] DELETE error:", err.message);
    return res.status(500).json({ error: "Failed to delete document." });
  }
});

// POST /api/documents/:id/upload — attach a PDF/JPG/PNG file to a document
router.post("/:id/upload", requireRole(["admin", "edit"]), (req, res, next) => {
  // Apply upload rate limiter dynamically
  const limiter = getUploadLimiter(req);
  limiter(req, res, () => {
    const upload = getUpload(req);
    upload.single("file")(req, res, next);
  });
}, async (req, res) => {
  const ownerId = req.user.effectiveUserId || req.user.id;

  if (!req.file) {
    return res.status(400).json({ error: "No file provided. Please attach a PDF, JPG, or PNG file." });
  }

  try {
    const { rows } = await pool.query(
      `UPDATE documents
       SET file_data = $1, file_name = $2, file_mime = $3
       WHERE user_id = $4 AND id = $5
       RETURNING id, title, file_name, file_mime`,
      [req.file.buffer, req.file.originalname, req.file.mimetype, ownerId, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Document not found." });
    return res.json({
      message: "File uploaded successfully.",
      fileName: rows[0].file_name,
      fileMime: rows[0].file_mime,
    });
  } catch (err) {
    console.error("[Documents] Upload error:", err.message);
    return res.status(500).json({ error: "Failed to upload file." });
  }
});

// GET /api/documents/:id/file — download/stream the attached file
router.get("/:id/file", async (req, res) => {
  const ownerId = req.user.effectiveUserId || req.user.id;
  try {
    const { rows } = await pool.query(
      "SELECT file_data, file_name, file_mime FROM documents WHERE user_id = $1 AND id = $2",
      [ownerId, req.params.id]
    );
    if (!rows[0] || !rows[0].file_data) {
      return res.status(404).json({ error: "No file attached to this document." });
    }
    const { file_data, file_name, file_mime } = rows[0];
    res.setHeader("Content-Type", file_mime);
    res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(file_name)}"`);
    res.setHeader("Content-Length", file_data.length);
    return res.send(file_data);
  } catch (err) {
    console.error("[Documents] File download error:", err.message);
    return res.status(500).json({ error: "Failed to retrieve file." });
  }
});

// DELETE /api/documents/:id/file — remove the attached file without deleting the document record
router.delete("/:id/file", requireRole(["admin", "edit"]), async (req, res) => {
  const ownerId = req.user.effectiveUserId || req.user.id;
  try {
    const { rowCount } = await pool.query(
      "UPDATE documents SET file_data = NULL, file_name = NULL, file_mime = NULL WHERE user_id = $1 AND id = $2",
      [ownerId, req.params.id]
    );
    if (!rowCount) return res.status(404).json({ error: "Document not found." });
    return res.status(204).end();
  } catch (err) {
    console.error("[Documents] File delete error:", err.message);
    return res.status(500).json({ error: "Failed to remove file." });
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
    fileName: r.file_name || null,
    fileMime: r.file_mime || null,
    hasFile: !!r.file_name,
    createdAt: r.created_at,
  };
}

module.exports = router;
