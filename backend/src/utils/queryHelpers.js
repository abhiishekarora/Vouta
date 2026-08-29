/**
 * Generic CRUD route factory for simple resources.
 * All resources belong to the authenticated user (user_id isolation).
 *
 * Usage:
 *   const router = createCrudRouter({ table, schema, toRow, fromRow });
 */

/**
 * Builds a snake_case SET clause for UPDATE from an object.
 * Returns { clause, values, nextIdx }
 */
function buildSetClause(fields, startIdx = 1) {
  const clause = Object.keys(fields)
    .map((key, i) => `${key} = $${startIdx + i}`)
    .join(", ");
  const values = Object.values(fields);
  return { clause, values, nextIdx: startIdx + values.length };
}

module.exports = { buildSetClause };
