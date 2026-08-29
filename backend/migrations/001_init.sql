-- ============================================================
--  Vouta Business Console — Database Schema
--  Run with: psql -d vouta -f 001_init.sql
--  Or via: npm run migrate (from server/)
-- ============================================================

-- Enable UUID support
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────────
--  USERS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           TEXT NOT NULL UNIQUE,
  password_hash   TEXT NOT NULL,
  owner_name      TEXT NOT NULL DEFAULT '',
  business_name   TEXT NOT NULL DEFAULT '',
  business_type   TEXT NOT NULL DEFAULT 'Other',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

-- ─────────────────────────────────────────────
--  GOALS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS goals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  target_amount   NUMERIC(14, 2) NOT NULL DEFAULT 0,
  current_amount  NUMERIC(14, 2) NOT NULL DEFAULT 0,
  deadline        DATE,
  note            TEXT NOT NULL DEFAULT '',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals (user_id);

-- ─────────────────────────────────────────────
--  TRANSACTIONS (Ledger)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount      NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
  category    TEXT NOT NULL,
  date        DATE NOT NULL,
  note        TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions (user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date    ON transactions (date DESC);

-- ─────────────────────────────────────────────
--  INVOICES
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoices (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invoice_no  TEXT NOT NULL,
  client      TEXT NOT NULL,
  amount      NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
  issue_date  DATE NOT NULL,
  due_date    DATE,
  status      TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','paid','overdue')),
  note        TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices (user_id);

-- ─────────────────────────────────────────────
--  TODOS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS todos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text        TEXT NOT NULL,
  priority    TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('high','medium','low')),
  due_date    DATE,
  done        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_todos_user_id ON todos (user_id);

-- ─────────────────────────────────────────────
--  TEAM MEMBERS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS team_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT '',
  email       TEXT NOT NULL DEFAULT '',
  department  TEXT NOT NULL DEFAULT 'Other',
  capacity    INTEGER NOT NULL DEFAULT 40 CHECK (capacity >= 0 AND capacity <= 168),
  on_leave    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members (user_id);

-- ─────────────────────────────────────────────
--  PROJECTS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS projects (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  label       TEXT NOT NULL DEFAULT 'Internal',
  start_date  DATE,
  status      TEXT NOT NULL DEFAULT 'Not Started' CHECK (status IN ('Not Started','Active','Blocked','Completed')),
  description TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects (user_id);

-- ─────────────────────────────────────────────
--  PROJECT TASKS (Kanban)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS project_tasks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id   UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  assigned_to  UUID REFERENCES team_members(id) ON DELETE SET NULL,
  title        TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'To Do' CHECK (status IN ('To Do','In Progress','Done')),
  priority     TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('high','medium','low')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_tasks_user_id    ON project_tasks (user_id);
CREATE INDEX IF NOT EXISTS idx_project_tasks_project_id ON project_tasks (project_id);

-- ─────────────────────────────────────────────
--  DOCUMENTS (Compliance Vault)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS documents (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  category     TEXT NOT NULL DEFAULT 'Other',
  doc_number   TEXT NOT NULL DEFAULT '',
  issue_date   DATE,
  expiry_date  DATE,
  status       TEXT NOT NULL DEFAULT 'Filed',
  notes        TEXT NOT NULL DEFAULT '',
  content      TEXT NOT NULL DEFAULT '',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents (user_id);

-- ─────────────────────────────────────────────
--  Auto-update updated_at trigger helper
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['users','goals','invoices','todos','team_members','projects','project_tasks','documents']
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_%s_updated_at ON %s;
       CREATE TRIGGER trg_%s_updated_at
       BEFORE UPDATE ON %s
       FOR EACH ROW EXECUTE FUNCTION update_updated_at();',
      t, t, t, t
    );
  END LOOP;
END;
$$;
