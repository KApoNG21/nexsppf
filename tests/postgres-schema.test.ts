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
    const sql = readFileSync('migrations/postgres/0001_unified_warranty_system.sql', 'utf8');
    expect(sql).toContain("('BEGIN', 'BEGIN', 'clear', 4");
    expect(sql).toContain("('PRIME', 'PRIME', 'clear', 7");
    expect(sql).toContain("('PRO', 'PRO', 'clear', 8");
    expect(sql).toContain("('ULTIMATE', 'ULTIMATE', 'clear', 9");
  });
});
