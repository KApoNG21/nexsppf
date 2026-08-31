ALTER TABLE warranties
  ADD COLUMN IF NOT EXISTS work_order_ref text,
  ADD COLUMN IF NOT EXISTS installation_type text NOT NULL DEFAULT 'full_body',
  ADD COLUMN IF NOT EXISTS coverage_area text NOT NULL DEFAULT 'ติดตั้งเต็มคัน',
  ADD COLUMN IF NOT EXISTS installation_branch text,
  ADD COLUMN IF NOT EXISTS installer_name text,
  ADD COLUMN IF NOT EXISTS vehicle_year integer,
  ADD COLUMN IF NOT EXISTS vehicle_color text,
  ADD COLUMN IF NOT EXISTS vehicle_vin_last6 text,
  ADD COLUMN IF NOT EXISTS odometer_km integer;

ALTER TABLE warranties
  DROP CONSTRAINT IF EXISTS warranties_installation_type_check;

ALTER TABLE warranties
  ADD CONSTRAINT warranties_installation_type_check
  CHECK (installation_type IN ('full_body', 'partial', 'color_wrap', 'custom'));

ALTER TABLE warranties
  DROP CONSTRAINT IF EXISTS warranties_vehicle_year_check;

ALTER TABLE warranties
  ADD CONSTRAINT warranties_vehicle_year_check
  CHECK (vehicle_year IS NULL OR vehicle_year BETWEEN 1950 AND 2100);

ALTER TABLE warranties
  DROP CONSTRAINT IF EXISTS warranties_odometer_km_check;

ALTER TABLE warranties
  ADD CONSTRAINT warranties_odometer_km_check
  CHECK (odometer_km IS NULL OR odometer_km BETWEEN 0 AND 5000000);

CREATE INDEX IF NOT EXISTS warranties_work_order_ref_idx
  ON warranties (work_order_ref)
  WHERE work_order_ref IS NOT NULL;
