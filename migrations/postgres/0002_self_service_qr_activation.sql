ALTER TABLE warranties
  ALTER COLUMN customer_name DROP NOT NULL,
  ALTER COLUMN customer_phone DROP NOT NULL,
  ALTER COLUMN vehicle_make DROP NOT NULL,
  ALTER COLUMN vehicle_model DROP NOT NULL,
  ALTER COLUMN vehicle_plate DROP NOT NULL;

ALTER TABLE warranties
  ADD COLUMN IF NOT EXISTS customer_completed_at timestamptz;

ALTER TABLE warranties
  DROP CONSTRAINT IF EXISTS warranties_status_check;

ALTER TABLE warranties
  ADD CONSTRAINT warranties_status_check
  CHECK (status IN ('pending_customer', 'active', 'expired', 'under_review', 'suspended', 'cancelled'));

UPDATE product_series
SET warranty_years = CASE model_code
  WHEN 'BEGIN' THEN 5
  WHEN 'PRIME' THEN 6
  WHEN 'PRO' THEN 8
  WHEN 'ULTIMATE' THEN 9
  ELSE warranty_years
END
WHERE model_code IN ('BEGIN', 'PRIME', 'PRO', 'ULTIMATE');
