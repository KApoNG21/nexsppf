ALTER TABLE auth_accounts
  ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false;

ALTER TABLE auth_accounts
  ADD COLUMN IF NOT EXISTS password_changed_at timestamptz;

CREATE INDEX IF NOT EXISTS auth_accounts_status_idx
  ON auth_accounts (status, must_change_password);
