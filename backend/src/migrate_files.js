require("dotenv").config();
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const sql = `
  ALTER TABLE documents
    ADD COLUMN IF NOT EXISTS file_data BYTEA,
    ADD COLUMN IF NOT EXISTS file_name TEXT,
    ADD COLUMN IF NOT EXISTS file_mime TEXT;

  ALTER TABLE invoices
    ADD COLUMN IF NOT EXISTS file_data BYTEA,
    ADD COLUMN IF NOT EXISTS file_name TEXT,
    ADD COLUMN IF NOT EXISTS file_mime TEXT;
`;

pool.query(sql)
  .then(() => {
    console.log("Migration complete: file_data, file_name, file_mime columns added to documents and invoices tables.");
    process.exit(0);
  })
  .catch((e) => {
    console.error("Migration failed:", e.message);
    process.exit(1);
  });
