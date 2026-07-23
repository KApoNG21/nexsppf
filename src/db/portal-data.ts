import { env } from "@/lib/server-env";

export type PortalRecord = {
  reference: string;
  subject: string;
  detail: string;
  date: string;
  status: string;
};

export type PortalStats = {
  primary: number;
  secondary: number;
  tertiary: number;
  quaternary: number;
};

export type DealerWarrantyDetail = {
  id: number;
  serial_code: string;
  product_model_code: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_plate: string;
  install_date: string;
  expiry_date: string | null;
  status: string;
};

export type DealerMaintenanceItem = { id: number; reference_code: string; maintenance_date: string; maintenance_type: string; performed_by: string | null; result_status: string; note: string | null };
export type DealerMediaItem = { id: number; original_name: string; content_type: string; size_bytes: number };
export type DealerProfile = {
  dealer_code: string;
  name: string;
  province: string;
  contact_name: string;
  phone: string;
  email: string | null;
  certification_tier: string | null;
  status: string;
};

type CountRow = { count: number };

async function count(sql: string, ...bindings: unknown[]): Promise<number> {
  const row = await env.DB.prepare(sql).bind(...bindings).first<CountRow>();
  return Number(row?.count ?? 0);
}

export async function getDealerStats(dealerId: number): Promise<PortalStats> {
  const [active, maintenanceDue, openSupport, total] = await Promise.all([
    count("SELECT COUNT(*) AS count FROM warranties WHERE dealer_id = ? AND status = 'active'", dealerId),
    count("SELECT COUNT(*) AS count FROM maintenance_records WHERE dealer_id = ? AND next_recommended_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'", dealerId),
    count(`SELECT COUNT(*) AS count FROM (
      SELECT id FROM support_requests WHERE assigned_dealer_id = ? AND status NOT IN ('closed','rejected')
      UNION ALL
      SELECT id FROM inspection_requests WHERE assigned_dealer_id = ? AND status NOT IN ('closed','rejected')
    )`, dealerId, dealerId),
    count("SELECT COUNT(*) AS count FROM warranties WHERE dealer_id = ?", dealerId),
  ]);
  return { primary: active, secondary: maintenanceDue, tertiary: openSupport, quaternary: total };
}

export async function getDealerWarranties(dealerId: number, limit = 20): Promise<PortalRecord[]> {
  const result = await env.DB.prepare(`
    SELECT w.serial_code AS reference, w.product_model_code AS subject,
      w.vehicle_make || ' ' || w.vehicle_model AS detail, w.install_date AS date, w.status
    FROM warranties w
    WHERE w.dealer_id = ?
    ORDER BY w.created_at DESC
    LIMIT ?
  `).bind(dealerId, limit).all<PortalRecord>();
  return result.results ?? [];
}

export async function getDealerTasks(dealerId: number, limit = 8): Promise<PortalRecord[]> {
  const result = await env.DB.prepare(`
    SELECT reference_code AS reference, 'Support' AS subject,
      request_type || ' · ' || contact_name || ' · ' || contact_phone AS detail,
      created_at AS date, status
    FROM support_requests WHERE assigned_dealer_id = ? AND status NOT IN ('closed','rejected')
    UNION ALL
    SELECT reference_code AS reference, 'Inspection' AS subject,
      contact_name || ' · ' || contact_phone AS detail,
      created_at AS date, status
    FROM inspection_requests WHERE assigned_dealer_id = ? AND status NOT IN ('closed','rejected')
    ORDER BY date DESC LIMIT ?
  `).bind(dealerId, dealerId, limit).all<PortalRecord>();
  return result.results ?? [];
}

export async function getDealerProfile(dealerId: number): Promise<DealerProfile | null> {
  return env.DB.prepare(`
    SELECT dealer_code, name, province, contact_name, phone, email, certification_tier, status
    FROM dealers
    WHERE id = ?
    LIMIT 1
  `).bind(dealerId).first<DealerProfile>();
}

export async function getDealerWarrantyDetail(dealerId: number, serialCode: string): Promise<{ warranty: DealerWarrantyDetail; maintenance: DealerMaintenanceItem[]; media: DealerMediaItem[] } | null> {
  const warranty = await env.DB.prepare(`SELECT id, serial_code, product_model_code, customer_name, customer_phone, customer_email, vehicle_make, vehicle_model, vehicle_plate, install_date, expiry_date, status FROM warranties WHERE dealer_id = ? AND serial_code = ? LIMIT 1`).bind(dealerId, serialCode).first<DealerWarrantyDetail>();
  if (!warranty) return null;
  const [maintenance, media] = await Promise.all([
    env.DB.prepare(`SELECT id, reference_code, maintenance_date, maintenance_type, performed_by, result_status, note FROM maintenance_records WHERE warranty_id = ? AND dealer_id = ? ORDER BY maintenance_date DESC`).bind(warranty.id, dealerId).all<DealerMaintenanceItem>(),
    env.DB.prepare(`SELECT id, original_name, content_type, size_bytes FROM media_assets WHERE (owner_type = 'warranty' AND owner_reference = ?) OR (owner_type = 'maintenance' AND owner_reference IN (SELECT reference_code FROM maintenance_records WHERE warranty_id = ? AND dealer_id = ?)) ORDER BY created_at DESC`).bind(serialCode, warranty.id, dealerId).all<DealerMediaItem>(),
  ]);
  return { warranty, maintenance: maintenance.results ?? [], media: media.results ?? [] };
}

export async function getAdminStats(): Promise<PortalStats> {
  const [serials, warranties, dealers, requests] = await Promise.all([
    count("SELECT COUNT(*) AS count FROM serials"),
    count("SELECT COUNT(*) AS count FROM warranties WHERE status = 'active'"),
    count("SELECT COUNT(*) AS count FROM dealers WHERE status = 'active'"),
    count(`SELECT COUNT(*) AS count FROM (
      SELECT id FROM support_requests WHERE status NOT IN ('closed','rejected')
      UNION ALL
      SELECT id FROM inspection_requests WHERE status NOT IN ('closed','rejected')
    )`),
  ]);
  return { primary: serials, secondary: warranties, tertiary: dealers, quaternary: requests };
}

export type AdminRecordType = "warranties" | "dealers" | "maintenance" | "support" | "inspection" | "contact" | "exceptions";

export async function getAdminProducts(limit = 50): Promise<PortalRecord[]> {
  const result = await env.DB.prepare(`SELECT model_code AS reference, name AS subject, category || CASE WHEN warranty_years IS NULL THEN '' ELSE ' · ' || warranty_years || ' years' END AS detail, created_at AS date, status FROM product_series ORDER BY id LIMIT ?`).bind(limit).all<PortalRecord>();
  return result.results ?? [];
}

export async function getAdminSerials(limit = 100): Promise<PortalRecord[]> {
  const result = await env.DB.prepare(`
    SELECT serial_code AS reference, model_code AS subject, batch_code AS detail,
      imported_at AS date, status
    FROM serials
    ORDER BY imported_at DESC, id DESC
    LIMIT ?
  `).bind(limit).all<PortalRecord>();
  return result.results ?? [];
}

export async function getAdminMedia(limit = 50): Promise<PortalRecord[]> {
  const result = await env.DB.prepare(`SELECT CAST(id AS TEXT) AS reference, original_name AS subject, owner_type || ' · ' || owner_reference AS detail, created_at AS date, content_type AS status FROM media_assets ORDER BY created_at DESC LIMIT ?`).bind(limit).all<PortalRecord>();
  return result.results ?? [];
}

export async function getAdminRecords(type: AdminRecordType, limit = 30): Promise<PortalRecord[]> {
  const queries: Record<AdminRecordType, string> = {
    warranties: `SELECT w.serial_code AS reference, w.product_model_code AS subject, d.name AS detail, w.install_date AS date, w.status
      FROM warranties w JOIN dealers d ON d.id = w.dealer_id ORDER BY w.created_at DESC LIMIT ?`,
    dealers: `SELECT dealer_code AS reference, name AS subject, province AS detail, created_at AS date, status
      FROM dealers ORDER BY created_at DESC LIMIT ?`,
    maintenance: `SELECT COALESCE(m.reference_code, 'MNT-' || m.id) AS reference, w.serial_code AS subject, m.maintenance_type || CASE WHEN m.performed_by IS NULL THEN '' ELSE ' · ' || m.performed_by END AS detail, m.maintenance_date AS date, m.result_status AS status
      FROM maintenance_records m JOIN warranties w ON w.id = m.warranty_id ORDER BY m.created_at DESC LIMIT ?`,
    support: `SELECT reference_code AS reference, serial_code AS subject,
      request_type || ' · ' || contact_name || ' · ' || contact_phone AS detail,
      created_at AS date, status
      FROM support_requests ORDER BY created_at DESC LIMIT ?`,
    inspection: `SELECT reference_code AS reference, serial_code AS subject,
      contact_name || ' · ' || contact_phone AS detail,
      created_at AS date, status
      FROM inspection_requests ORDER BY created_at DESC LIMIT ?`,
    contact: `SELECT reference_code AS reference, subject,
      contact_name || ' · ' || contact_phone || CASE WHEN contact_email IS NULL THEN '' ELSE ' · ' || contact_email END AS detail,
      created_at AS date, status
      FROM contact_requests ORDER BY created_at DESC LIMIT ?`,
    exceptions: `SELECT e.reference_code AS reference, e.serial_code AS subject, d.name || ' · ' || replace(e.reason_code, '_', ' ') AS detail, e.created_at AS date, e.status
      FROM registration_exceptions e JOIN dealers d ON d.id = e.dealer_id ORDER BY e.created_at DESC LIMIT ?`,
  };
  const result = await env.DB.prepare(queries[type]).bind(limit).all<PortalRecord>();
  return result.results ?? [];
}

export async function getAdminAuditLogs(limit = 100): Promise<PortalRecord[]> {
  const result = await env.DB.prepare(`
    SELECT CAST(id AS TEXT) AS reference,
      action AS subject,
      actor_role || ' · ' || actor_email || ' · ' || entity_type || ':' || entity_id AS detail,
      created_at AS date,
      'logged' AS status
    FROM audit_logs
    ORDER BY created_at DESC, id DESC
    LIMIT ?
  `).bind(limit).all<PortalRecord>();
  return result.results ?? [];
}

export async function getAdminQueues(): Promise<PortalRecord[]> {
  const result = await env.DB.prepare(`
    SELECT reference_code AS reference, 'Support review' AS subject, request_type AS detail, created_at AS date, status
    FROM support_requests WHERE status NOT IN ('closed','rejected')
    UNION ALL
    SELECT reference_code AS reference, 'Inspection' AS subject, 'Assign dealer / review' AS detail, created_at AS date, status
    FROM inspection_requests WHERE status NOT IN ('closed','rejected')
    UNION ALL
    SELECT reference_code AS reference, 'Contact' AS subject, subject AS detail, created_at AS date, status
    FROM contact_requests WHERE status != 'closed'
    UNION ALL
    SELECT reference_code AS reference, 'Registration exception' AS subject, serial_code || ' · ' || replace(reason_code, '_', ' ') AS detail, created_at AS date, status
    FROM registration_exceptions WHERE status = 'pending'
    ORDER BY date DESC LIMIT 10
  `).all<PortalRecord>();
  return result.results ?? [];
}
