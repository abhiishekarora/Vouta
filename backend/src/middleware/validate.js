const { z } = require("zod");

/**
 * Returns an Express middleware that validates req.body against a Zod schema.
 * Responds 400 with formatted errors on failure.
 */
function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body ?? {});
    if (!result.success) {
      const errors = result.error.errors.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      }));
      return res.status(400).json({ error: errors[0]?.message || "Validation failed.", details: errors });
    }
    req.body = result.data; // replace with cleaned/coerced data
    next();
  };
}

// "YYYY-MM-DD" that is also a real calendar date (rejects 2024-02-31, which Postgres would 500 on)
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format.").refine((s) => {
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}, "Invalid date.");

// Columns are NUMERIC(14,2): anything at or above 1e12 overflows and errors in Postgres.
const MAX_AMOUNT = 999_999_999_999;
const amount = z.coerce.number().finite().max(MAX_AMOUNT, "Amount is too large.");

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** router.param handler: malformed ids get 404 instead of a Postgres cast error (500). */
function uuidParam(_req, res, next, id) {
  if (!UUID_RE.test(id)) return res.status(404).json({ error: "Not found." });
  next();
}

module.exports = { validate, isoDate, amount, uuidParam, UUID_RE };
