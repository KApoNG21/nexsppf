ALTER TABLE dealers
  ADD COLUMN IF NOT EXISTS line_id text;

ALTER TABLE warranties
  ADD COLUMN IF NOT EXISTS customer_line_id text;

CREATE INDEX IF NOT EXISTS warranties_customer_line_id_idx
  ON warranties (customer_line_id)
  WHERE customer_line_id IS NOT NULL;

UPDATE warranties
SET work_order_ref = 'NXS-' || replace(install_date::text, '-', '') || '-' || serial_code
WHERE work_order_ref IS NULL OR work_order_ref LIKE 'AUTO-%';
