ALTER TABLE account_roles
  ADD COLUMN IF NOT EXISTS is_owner boolean NOT NULL DEFAULT false;

UPDATE account_roles
SET is_owner = true
WHERE role = 'admin';

CREATE TABLE IF NOT EXISTS account_role_permissions (
  id serial PRIMARY KEY,
  account_role_id integer NOT NULL REFERENCES account_roles(id) ON DELETE CASCADE,
  permission text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (account_role_id, permission)
);

CREATE INDEX IF NOT EXISTS account_role_permissions_role_idx
  ON account_role_permissions (account_role_id);

CREATE TABLE IF NOT EXISTS stock_workspace_state (
  workspace_key text PRIMARY KEY,
  version integer NOT NULL DEFAULT 1,
  units_json jsonb NOT NULL,
  activity_json jsonb NOT NULL,
  updated_by text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS stock_workspace_updated_at_idx
  ON stock_workspace_state (updated_at DESC);
