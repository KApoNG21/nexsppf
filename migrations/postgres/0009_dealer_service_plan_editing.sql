ALTER TABLE warranty_service_plans
  ADD COLUMN IF NOT EXISTS next_recommended_date_override date;

COMMENT ON COLUMN warranty_service_plans.next_recommended_date_override IS
  'Optional next maintenance appointment selected by the owning dealer.';

