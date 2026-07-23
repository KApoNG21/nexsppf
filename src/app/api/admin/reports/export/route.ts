import { env } from "@/lib/server-env";
import { authorizePartnerRequest, unauthorizedResponse } from "../../../../../db/partner-access";

const reports = {
  serials: {
    filename: "nexs-serial-inventory.csv",
    sql: `SELECT serial_code, model_code, batch_code, status, imported_at
      FROM serials ORDER BY imported_at DESC, id DESC`,
  },
  warranties: {
    filename: "nexs-warranties.csv",
    sql: `SELECT w.serial_code, w.product_model_code, d.dealer_code, d.name AS dealer_name,
      w.vehicle_make, w.vehicle_model, w.install_date, w.expiry_date, w.status, w.created_at
      FROM warranties w JOIN dealers d ON d.id = w.dealer_id
      ORDER BY w.created_at DESC, w.id DESC`,
  },
  maintenance: {
    filename: "nexs-maintenance.csv",
    sql: `SELECT m.reference_code, w.serial_code, d.dealer_code, m.maintenance_date,
      m.maintenance_type, m.performed_by, m.result_status, m.next_recommended_date, m.created_at
      FROM maintenance_records m
      JOIN warranties w ON w.id = m.warranty_id
      JOIN dealers d ON d.id = m.dealer_id
      ORDER BY m.created_at DESC, m.id DESC`,
  },
  requests: {
    filename: "nexs-support-inspection-requests.csv",
    sql: `SELECT 'support' AS request_kind, reference_code, serial_code, request_type,
      assigned_dealer_id, status, created_at FROM support_requests
      UNION ALL
      SELECT 'inspection' AS request_kind, reference_code, serial_code,
      'inspection' AS request_type, assigned_dealer_id, status, created_at
      FROM inspection_requests ORDER BY created_at DESC`,
  },
  dealers: {
    filename: "nexs-dealers.csv",
    sql: `SELECT dealer_code, name, province, certification_tier, status, created_at
      FROM dealers ORDER BY created_at DESC, id DESC`,
  },
  audit: {
    filename: "nexs-audit-log.csv",
    sql: `SELECT id, actor_email, actor_role, action, entity_type, entity_id, detail, created_at
      FROM audit_logs ORDER BY created_at DESC, id DESC`,
  },
} as const;

type ReportKey = keyof typeof reports;
type CsvRow = Record<string, unknown>;

export async function GET(request: Request) {
  const actor = await authorizePartnerRequest(request, "admin");
  if (!actor) return unauthorizedResponse();

  const reportKey = new URL(request.url).searchParams.get("report") as ReportKey | null;
  if (!reportKey || !(reportKey in reports)) {
    return Response.json({ ok: false, error: "ประเภทรายงานไม่ถูกต้อง" }, { status: 400 });
  }

  try {
    const report = reports[reportKey];
    const result = await env.DB.prepare(report.sql).all<CsvRow>();
    const csv = toCsv(result.results ?? []);
    await env.DB.prepare(`
      INSERT INTO audit_logs
        (actor_email, actor_role, action, entity_type, entity_id, detail)
      VALUES (?, 'admin', 'report.export', 'operational_report', ?, ?)
    `).bind(actor.email, reportKey, JSON.stringify({ rowCount: result.results?.length ?? 0 })).run();

    return new Response(`\uFEFF${csv}`, {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="${report.filename}"`,
        "cache-control": "private, no-store, max-age=0",
        "x-content-type-options": "nosniff",
      },
    });
  } catch {
    return Response.json({ ok: false, error: "ไม่สามารถสร้างรายงานได้" }, { status: 500 });
  }
}

function toCsv(rows: CsvRow[]): string {
  if (!rows.length) return "no_data\r\n";
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.map(csvCell).join(","),
    ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(",")),
  ];
  return `${lines.join("\r\n")}\r\n`;
}

function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}
