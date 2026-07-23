CREATE TABLE IF NOT EXISTS warranty_service_plans (
  warranty_id integer PRIMARY KEY REFERENCES warranties(id) ON DELETE CASCADE,
  maintenance_included boolean NOT NULL DEFAULT false,
  maintenance_interval_months integer,
  maintenance_visit_limit integer,
  claim_included boolean NOT NULL DEFAULT false,
  claim_piece_limit integer,
  rewrap_included boolean NOT NULL DEFAULT false,
  rewrap_piece_limit integer,
  plan_note text,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (
    (maintenance_included AND maintenance_interval_months BETWEEN 1 AND 60 AND maintenance_visit_limit BETWEEN 1 AND 100)
    OR
    (NOT maintenance_included AND maintenance_interval_months IS NULL AND maintenance_visit_limit IS NULL)
  ),
  CHECK (
    (claim_included AND claim_piece_limit BETWEEN 1 AND 100)
    OR
    (NOT claim_included AND claim_piece_limit IS NULL)
  ),
  CHECK (
    (rewrap_included AND rewrap_piece_limit BETWEEN 1 AND 100)
    OR
    (NOT rewrap_included AND rewrap_piece_limit IS NULL)
  )
);

ALTER TABLE maintenance_records
  ADD COLUMN IF NOT EXISTS pieces_count integer NOT NULL DEFAULT 0;

ALTER TABLE maintenance_records
  ADD COLUMN IF NOT EXISTS service_scope text;

ALTER TABLE maintenance_records
  DROP CONSTRAINT IF EXISTS maintenance_records_pieces_count_check;

ALTER TABLE maintenance_records
  ADD CONSTRAINT maintenance_records_pieces_count_check
  CHECK (pieces_count BETWEEN 0 AND 100);

CREATE INDEX IF NOT EXISTS maintenance_warranty_date_idx
  ON maintenance_records (warranty_id, maintenance_date DESC, id DESC);

INSERT INTO warranty_service_plans (warranty_id)
SELECT id FROM warranties
ON CONFLICT (warranty_id) DO NOTHING;

CREATE OR REPLACE FUNCTION enforce_warranty_service_entitlement()
RETURNS trigger AS $$
DECLARE
  service_plan warranty_service_plans%ROWTYPE;
  already_used integer;
BEGIN
  IF NEW.maintenance_type NOT IN ('maintenance', 'claim', 'rewrap') THEN
    RETURN NEW;
  END IF;

  SELECT * INTO service_plan
  FROM warranty_service_plans
  WHERE warranty_id = NEW.warranty_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'service_plan_missing';
  END IF;

  IF NEW.maintenance_type = 'maintenance' THEN
    IF NOT service_plan.maintenance_included THEN
      RAISE EXCEPTION 'maintenance_not_included';
    END IF;
    SELECT COUNT(*) INTO already_used
    FROM maintenance_records
    WHERE warranty_id = NEW.warranty_id AND maintenance_type = 'maintenance';
    IF already_used + 1 > service_plan.maintenance_visit_limit THEN
      RAISE EXCEPTION 'maintenance_limit_exceeded';
    END IF;
  ELSIF NEW.maintenance_type = 'claim' THEN
    IF NOT service_plan.claim_included THEN
      RAISE EXCEPTION 'claim_not_included';
    END IF;
    SELECT COALESCE(SUM(pieces_count), 0) INTO already_used
    FROM maintenance_records
    WHERE warranty_id = NEW.warranty_id AND maintenance_type = 'claim';
    IF NEW.pieces_count < 1 OR already_used + NEW.pieces_count > service_plan.claim_piece_limit THEN
      RAISE EXCEPTION 'claim_limit_exceeded';
    END IF;
  ELSIF NEW.maintenance_type = 'rewrap' THEN
    IF NOT service_plan.rewrap_included THEN
      RAISE EXCEPTION 'rewrap_not_included';
    END IF;
    SELECT COALESCE(SUM(pieces_count), 0) INTO already_used
    FROM maintenance_records
    WHERE warranty_id = NEW.warranty_id AND maintenance_type = 'rewrap';
    IF NEW.pieces_count < 1 OR already_used + NEW.pieces_count > service_plan.rewrap_piece_limit THEN
      RAISE EXCEPTION 'rewrap_limit_exceeded';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS maintenance_entitlement_guard ON maintenance_records;
CREATE TRIGGER maintenance_entitlement_guard
BEFORE INSERT ON maintenance_records
FOR EACH ROW
EXECUTE FUNCTION enforce_warranty_service_entitlement();
