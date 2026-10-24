-- Migration 004: file attachment columns (previously added at server boot) and
-- invite-acceptance hardening for workspace_members.

ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS file_data BYTEA,
  ADD COLUMN IF NOT EXISTS file_name TEXT,
  ADD COLUMN IF NOT EXISTS file_mime TEXT;

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS file_data BYTEA,
  ADD COLUMN IF NOT EXISTS file_name TEXT,
  ADD COLUMN IF NOT EXISTS file_mime TEXT;

-- Invites must now be accepted by the invitee. Link existing accepted rows to their
-- user account; rows whose email has no account yet go back to 'pending'.
UPDATE workspace_members wm
   SET user_id = u.id
  FROM users u
 WHERE wm.user_id IS NULL AND LOWER(u.email) = LOWER(wm.email);

UPDATE workspace_members SET status = 'pending' WHERE user_id IS NULL;

ALTER TABLE workspace_members ALTER COLUMN status SET DEFAULT 'pending';

-- updated_at trigger was never attached to this table
DROP TRIGGER IF EXISTS trg_workspace_members_updated_at ON workspace_members;
CREATE TRIGGER trg_workspace_members_updated_at
  BEFORE UPDATE ON workspace_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
