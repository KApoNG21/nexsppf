ALTER TABLE warranty_service_plans
  ADD COLUMN IF NOT EXISTS installation_warranty_terms text;

ALTER TABLE warranty_service_plans
  ADD COLUMN IF NOT EXISTS removal_warranty_terms text;

COMMENT ON COLUMN warranty_service_plans.installation_warranty_terms IS
  'Optional installation workmanship warranty terms supplied and owned by the installing dealer.';

COMMENT ON COLUMN warranty_service_plans.removal_warranty_terms IS
  'Optional film removal service or warranty terms supplied and owned by the installing dealer.';
