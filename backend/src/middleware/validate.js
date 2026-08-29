const { z } = require("zod");

/**
 * Returns an Express middleware that validates req.body against a Zod schema.
 * Responds 400 with formatted errors on failure.
 */
function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.errors.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      }));
      return res.status(400).json({ error: "Validation failed.", details: errors });
    }
    req.body = result.data; // replace with cleaned/coerced data
    next();
  };
}

module.exports = { validate };
