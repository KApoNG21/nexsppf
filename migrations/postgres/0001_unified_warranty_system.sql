CREATE TABLE IF NOT EXISTS auth_accounts (
  id serial PRIMARY KEY,
  email text NOT NULL UNIQUE,
  display_name text NOT NULL,
  password_hash text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS dealers (
  id serial PRIMARY KEY,
  dealer_code text NOT NULL UNIQUE,
  name text NOT NULL,
  province text NOT NULL,
  contact_name text NOT NULL,
  phone text NOT NULL,
  email text,
  certification_tier text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'inactive')),
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS account_roles (
  id serial PRIMARY KEY,
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('dealer', 'admin')),
  dealer_id integer REFERENCES dealers(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (email, role),
  CHECK ((role = 'dealer' AND dealer_id IS NOT NULL) OR (role = 'admin' AND dealer_id IS NULL))
);

CREATE INDEX IF NOT EXISTS account_roles_email_status_idx ON account_roles (lower(email), status);

CREATE TABLE IF NOT EXISTS product_series (
  id serial PRIMARY KEY,
  model_code text NOT NULL UNIQUE,
  name text NOT NULL,
  category text NOT NULL,
  warranty_years integer,
  public_copy text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'inactive')),
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS serials (
  id serial PRIMARY KEY,
  serial_code text NOT NULL UNIQUE,
  model_code text NOT NULL REFERENCES product_series(model_code),
  batch_code text NOT NULL,
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'active', 'suspended', 'invalid', 'expired')),
  imported_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS warranties (
  id serial PRIMARY KEY,
  serial_code text NOT NULL UNIQUE REFERENCES serials(serial_code),
  dealer_id integer NOT NULL REFERENCES dealers(id) ON DELETE RESTRICT,
  product_model_code text NOT NULL REFERENCES product_series(model_code),
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  customer_email text,
  vehicle_make text NOT NULL,
  vehicle_model text NOT NULL,
  vehicle_plate text NOT NULL,
  install_date date NOT NULL,
  expiry_date date,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'under_review', 'suspended', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS warranties_dealer_status_idx ON warranties (dealer_id, status);

CREATE TABLE IF NOT EXISTS maintenance_records (
  id serial PRIMARY KEY,
  reference_code text NOT NULL UNIQUE,
  warranty_id integer NOT NULL REFERENCES warranties(id) ON DELETE CASCADE,
  dealer_id integer NOT NULL REFERENCES dealers(id) ON DELETE RESTRICT,
  maintenance_date date NOT NULL,
  maintenance_type text NOT NULL,
  performed_by text,
  result_status text NOT NULL,
  note text,
  next_recommended_date date,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS maintenance_dealer_date_idx ON maintenance_records (dealer_id, maintenance_date);

CREATE TABLE IF NOT EXISTS support_requests (
  id serial PRIMARY KEY,
  reference_code text NOT NULL UNIQUE,
  serial_code text NOT NULL,
  request_type text NOT NULL,
  contact_name text NOT NULL,
  contact_phone text NOT NULL,
  detail text NOT NULL,
  status text NOT NULL DEFAULT 'under_review',
  assigned_dealer_id integer REFERENCES dealers(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS support_assignee_status_idx ON support_requests (assigned_dealer_id, status);

CREATE TABLE IF NOT EXISTS inspection_requests (
  id serial PRIMARY KEY,
  reference_code text NOT NULL UNIQUE,
  serial_code text NOT NULL,
  contact_name text NOT NULL,
  contact_phone text NOT NULL,
  detail text NOT NULL,
  status text NOT NULL DEFAULT 'under_review',
  assigned_dealer_id integer REFERENCES dealers(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS inspection_assignee_status_idx ON inspection_requests (assigned_dealer_id, status);

CREATE TABLE IF NOT EXISTS contact_requests (
  id serial PRIMARY KEY,
  reference_code text NOT NULL UNIQUE,
  contact_name text NOT NULL,
  contact_phone text NOT NULL,
  contact_email text,
  subject text NOT NULL,
  detail text NOT NULL,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS registration_exceptions (
  id serial PRIMARY KEY,
  reference_code text NOT NULL UNIQUE,
  serial_code text NOT NULL,
  dealer_id integer NOT NULL REFERENCES dealers(id) ON DELETE RESTRICT,
  reason_code text NOT NULL,
  detail text,
  status text NOT NULL DEFAULT 'pending',
  review_note text,
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS registration_exceptions_status_created_idx ON registration_exceptions (status, created_at);
CREATE INDEX IF NOT EXISTS registration_exceptions_dealer_serial_idx ON registration_exceptions (dealer_id, serial_code);

CREATE TABLE IF NOT EXISTS media_assets (
  id serial PRIMARY KEY,
  owner_type text NOT NULL,
  owner_reference text NOT NULL,
  object_key text NOT NULL UNIQUE,
  original_name text NOT NULL,
  content_type text NOT NULL,
  size_bytes integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admin_policies (
  id serial PRIMARY KEY,
  policy_key text NOT NULL UNIQUE,
  draft_value text NOT NULL,
  approved_value text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'published', 'archived')),
  updated_by text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id serial PRIMARY KEY,
  actor_email text NOT NULL,
  actor_role text NOT NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  detail text,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS audit_entity_created_idx ON audit_logs (entity_type, entity_id, created_at);

CREATE TABLE IF NOT EXISTS public_request_limits (
  limit_key text PRIMARY KEY,
  request_count integer NOT NULL DEFAULT 1,
  window_started_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS public_request_limits_window_idx ON public_request_limits (window_started_at);

CREATE TABLE IF NOT EXISTS auth_login_limits (
  limit_key text PRIMARY KEY,
  request_count integer NOT NULL DEFAULT 1,
  window_started_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO product_series (model_code, name, category, warranty_years, public_copy, status) VALUES
  ('BEGIN', 'BEGIN', 'clear', 4, 'Entry / Daily Protection · product warranty 4 years · peeling warranty 3 years', 'active'),
  ('PRIME', 'PRIME', 'clear', 7, 'Best Balance / Recommended · product warranty 7 years · peeling warranty 4 years', 'active'),
  ('PRO', 'PRO', 'clear', 8, 'Premium Protection · product warranty 8 years · peeling warranty 5 years', 'active'),
  ('ULTIMATE', 'ULTIMATE', 'clear', 9, 'Flagship / Top Tier · product warranty 9 years · peeling warranty 7 years', 'active')
ON CONFLICT (model_code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  warranty_years = EXCLUDED.warranty_years,
  public_copy = EXCLUDED.public_copy,
  status = EXCLUDED.status;

INSERT INTO dealers (dealer_code, name, province, contact_name, phone, email, certification_tier, status) VALUES
  ('DLR-001', 'NEXS Authorized Dealer', 'Bangkok', 'NEXS Service Team', '096-596-4639', NULL, 'certified', 'active')
ON CONFLICT (dealer_code) DO UPDATE SET
  name = EXCLUDED.name,
  province = EXCLUDED.province,
  contact_name = EXCLUDED.contact_name,
  phone = EXCLUDED.phone,
  certification_tier = EXCLUDED.certification_tier;
