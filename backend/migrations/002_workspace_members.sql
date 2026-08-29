-- ============================================================
--  Vouta — RBAC & Workspace Partner Access Migration
-- ============================================================

CREATE TABLE IF NOT EXISTS workspace_members (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_id      UUID REFERENCES users(id) ON DELETE CASCADE,
  email        TEXT NOT NULL,
  role         TEXT NOT NULL DEFAULT 'view' CHECK (role IN ('view', 'edit', 'admin')),
  status       TEXT NOT NULL DEFAULT 'accepted' CHECK (status IN ('pending', 'accepted')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workspace_members_owner_id ON workspace_members (owner_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id  ON workspace_members (user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_email    ON workspace_members (email);

-- Ensure unique owner + email pair
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_workspace_members_owner_email'
  ) THEN
    ALTER TABLE workspace_members ADD CONSTRAINT uq_workspace_members_owner_email UNIQUE (owner_id, email);
  END IF;
END $$;
