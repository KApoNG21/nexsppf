import { env } from "@/lib/server-env";

export type PublicWarrantyStatus = "active" | "not-registered" | "profile-required" | "expired" | "under-review" | "invalid";

export type PublicWarrantyRecord = {
  status: PublicWarrantyStatus;
  product: string;
  serial: string;
  vehicle: string;
  install: string;
  expiry: string;
  dealer: string;
  maintenance: string;
};

type PublicWarrantyRow = {
  serial_code: string;
  serial_model_code: string;
  serial_status: string;
  product_model_code: string | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  vehicle_plate: string | null;
  install_date: string | Date | null;
  expiry_date: string | Date | null;
  warranty_status: string | null;
  product_name: string | null;
  dealer_name: string | null;
  dealer_province: string | null;
  maintenance_count: number;
};

export async function findPublicWarranty(serial: string): Promise<PublicWarrantyRecord | null> {
  const row = await env.DB.prepare(`
    SELECT
      s.serial_code,
      s.model_code AS serial_model_code,
      s.status AS serial_status,
      w.product_model_code,
      w.vehicle_make,
      w.vehicle_model,
      w.vehicle_plate,
      w.install_date,
      w.expiry_date,
      w.status AS warranty_status,
      ps.name AS product_name,
      d.name AS dealer_name,
      d.province AS dealer_province,
      (SELECT COUNT(*) FROM maintenance_records m WHERE m.warranty_id = w.id) AS maintenance_count
    FROM serials s
    LEFT JOIN warranties w ON w.serial_code = s.serial_code
    LEFT JOIN product_series ps ON ps.model_code = COALESCE(w.product_model_code, s.model_code)
    LEFT JOIN dealers d ON d.id = w.dealer_id
    WHERE s.serial_code = ?
    LIMIT 1
  `).bind(serial).first<PublicWarrantyRow>();

  if (!row || row.serial_status === "invalid") return null;

  const product = row.product_name ?? row.product_model_code ?? row.serial_model_code;
  if (!row.warranty_status || row.serial_status === "available") {
    return {
      status: "not-registered",
      product,
      serial: row.serial_code,
      vehicle: "ยังไม่ลงทะเบียน",
      install: "-",
      expiry: "-",
      dealer: "-",
      maintenance: "-",
    };
  }

  if (row.warranty_status === "pending_customer") {
    return {
      status: "profile-required",
      product,
      serial: row.serial_code,
      vehicle: "รอลูกค้ากรอกข้อมูล",
      install: formatDate(row.install_date),
      expiry: formatDate(row.expiry_date),
      dealer: row.dealer_name
        ? `${row.dealer_name}${row.dealer_province ? ` · ${row.dealer_province}` : ""}`
        : "NEXS Authorized Dealer",
      maintenance: row.maintenance_count > 0 ? `${row.maintenance_count} รายการในประวัติบริการ` : "ยังไม่มีรายการบำรุงรักษา",
    };
  }

  const expiryDateOnly = dateOnly(row.expiry_date);
  const expiredByDate = expiryDateOnly
    ? new Date(`${expiryDateOnly}T23:59:59+07:00`).getTime() < Date.now()
    : false;
  const status: PublicWarrantyStatus = row.warranty_status === "expired" || expiredByDate
    ? "expired"
    : row.warranty_status === "under_review" || row.warranty_status === "suspended" || row.serial_status === "suspended"
      ? "under-review"
      : "active";

  const dealer = row.dealer_name
    ? `${row.dealer_name}${row.dealer_province ? ` · ${row.dealer_province}` : ""}`
    : "NEXS Authorized Dealer";

  return {
    status,
    product,
    serial: row.serial_code,
    vehicle: `${[row.vehicle_make, row.vehicle_model].filter(Boolean).join(" ") || "Vehicle"} · ${maskPlate(row.vehicle_plate)}`,
    install: formatDate(row.install_date),
    expiry: status === "under-review" ? "อยู่ระหว่างตรวจสอบ" : formatDate(row.expiry_date),
    dealer,
    maintenance: row.maintenance_count > 0 ? `${row.maintenance_count} รายการในประวัติบริการ` : "ยังไม่มีรายการบำรุงรักษา",
  };
}

function formatDate(value: string | Date | null): string {
  if (!value) return "-";
  const normalized = dateOnly(value);
  if (!normalized) return "-";
  const date = new Date(`${normalized}T12:00:00+07:00`);
  return new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Bangkok" }).format(date);
}

function dateOnly(value: string | Date | null): string | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10);
  const match = value.match(/^\d{4}-\d{2}-\d{2}/);
  return match?.[0] ?? null;
}

function maskPlate(value: string | null): string {
  if (!value?.trim()) return "ทะเบียนปกปิด";
  const prefix = value.trim().split(/\s+/)[0]?.slice(0, 2) ?? "";
  return prefix ? `${prefix} ••••` : "ทะเบียนปกปิด";
}
