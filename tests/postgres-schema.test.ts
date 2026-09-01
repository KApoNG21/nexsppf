import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('PostgreSQL migration contract', () => {
  it('defines the connected warranty, role, request, audit, and storage records', () => {
    const sql = readFileSync('migrations/postgres/0001_unified_warranty_system.sql', 'utf8');
    for (const table of [
      'auth_accounts',
      'account_roles',
      'dealers',
      'product_series',
      'serials',
      'warranties',
      'maintenance_records',
      'support_requests',
      'inspection_requests',
      'contact_requests',
      'registration_exceptions',
      'media_assets',
      'admin_policies',
      'audit_logs',
    ]) {
      expect(sql).toContain(`CREATE TABLE IF NOT EXISTS ${table}`);
    }
    expect(sql).toContain('serial_code text NOT NULL UNIQUE');
    expect(sql).toContain("role text NOT NULL CHECK (role IN ('dealer', 'admin'))");
    expect(sql).toContain("CHECK ((role = 'dealer' AND dealer_id IS NOT NULL) OR (role = 'admin' AND dealer_id IS NULL))");
  });

  it('seeds the warranty years shown by the unified public catalog', () => {
    const sql = readFileSync('migrations/postgres/0002_self_service_qr_activation.sql', 'utf8');
    expect(sql).toContain("WHEN 'BEGIN' THEN 5");
    expect(sql).toContain("WHEN 'PRIME' THEN 6");
    expect(sql).toContain("WHEN 'PRO' THEN 8");
    expect(sql).toContain("WHEN 'ULTIMATE' THEN 9");
  });

  it('supports dealer activation followed by one-time customer completion', () => {
    const sql = readFileSync('migrations/postgres/0002_self_service_qr_activation.sql', 'utf8');
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS customer_completed_at");
    expect(sql).toContain("'pending_customer'");
    expect(sql).toContain("ALTER COLUMN customer_name DROP NOT NULL");
  });

  it('supports managed Dealer credentials and forced first-login password changes', () => {
    const sql = readFileSync('migrations/postgres/0003_partner_account_management.sql', 'utf8');
    expect(sql).toContain('must_change_password');
    expect(sql).toContain('password_changed_at');
    expect(sql).toContain('auth_accounts_status_idx');
  });

  it('supports a dealer-selected next maintenance appointment', () => {
    const sql = readFileSync('migrations/postgres/0009_dealer_service_plan_editing.sql', 'utf8');
    expect(sql).toContain('next_recommended_date_override');
  });

  it('supports Dealer and customer LINE contact channels', () => {
    const sql = readFileSync('migrations/postgres/0010_contact_channels.sql', 'utf8');
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS line_id');
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS customer_line_id');
  });
});
