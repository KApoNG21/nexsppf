import { env } from "@/lib/server-env";
import { serviceTypeLabel } from "@/lib/after-sales";

export type PublicWarrantyStatus = "active" | "not-registered" | "profile-required" | "expired" | "under-review" | "invalid";

export type PublicServiceBenefit = {
  included: boolean;
  used: number;
  limit: number | null;
  remaining: number | null;
  intervalMonths?: number | null;
};

export type PublicServiceHistory = {
  reference: string;
  type: string;
  label: string;
  date: string;
  pieces: number;
  scope: string | null;
  result: string;
  nextDate: string;
};

export type PublicWarrantyRecord = {
  status: PublicWarrantyStatus;
  product: string;
  productWarrantyYears: number | null;
  serial: string;
  vehicle: string;
  install: string;
  expiry: string;
  dealer: string;
  workOrder: string;
  wrapType: string;
  coverage: string;
  branch: string;
  vehicleYear: number | null;
  vehicleColor: string | null;
  maintenance: string;
  nextMaintenance: string;
  planNote: string | null;
  installationWarrantyTerms: string | null;
  removalWarrantyTerms: string | null;
  benefits: {
    maintenance: PublicServiceBenefit;
    claim: PublicServiceBenefit;
    rewrap: PublicServiceBenefit;
  };
  serviceHistory: PublicServiceHistory[];
};

export type CustomerRegistrationDraft = {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: string;
  vehicleColor: string;
  vehiclePlate: string;
  vehicleVinLast6: string;
  odometerKm: string;
};

type CustomerRegistrationDraftRow = {
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  vehicle_year: number | null;
  vehicle_color: string | null;
  vehicle_plate: string | null;
  vehicle_vin_last6: string | null;
  odometer_km: number | null;
};

type PublicWarrantyRow = {
  warranty_id: number | null;
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
  warranty_years: number | null;
  dealer_name: string | null;
  dealer_province: string | null;
  work_order_ref: string | null;
  installation_type: string;
  coverage_area: string;
  installation_branch: string | null;
  vehicle_year: number | null;
  vehicle_color: string | null;
};

type PlanRow = {
  maintenance_included: boolean;
  maintenance_interval_months: number | null;
  maintenance_visit_limit: number | null;
  claim_included: boolean;
  claim_piece_limit: number | null;
  rewrap_included: boolean;
  rewrap_piece_limit: number | null;
  plan_note: string | null;
  installation_warranty_terms: string | null;
  removal_warranty_terms: string | null;
  maintenance_used: number;
  claim_used: number;
  rewrap_used: number;
  next_recommended_date: string | Date | null;
};

type HistoryRow = {
  reference_code: string;
  maintenance_date: string | Date;
  maintenance_type: string;
  result_status: string;
  next_recommended_date: string | Date | null;
  pieces_count: number;
  service_scope: string | null;
};

const emptyBenefits = () => ({
  maintenance: { included: false, used: 0, limit: null, remaining: null, intervalMonths: null },
  claim: { included: false, used: 0, limit: null, remaining: null },
  rewrap: { included: false, used: 0, limit: null, remaining: null },
});

export async function findCustomerRegistrationDraft(serial: string): Promise<CustomerRegistrationDraft | null> {
  const row = await env.DB.prepare(`
    SELECT customer_name, customer_phone, customer_email, vehicle_make, vehicle_model,
      vehicle_year, vehicle_color, vehicle_plate, vehicle_vin_last6, odometer_km
    FROM warranties
    WHERE serial_code = ? AND status = 'pending_customer'
    LIMIT 1
  `).bind(serial).first<CustomerRegistrationDraftRow>();
  if (!row) return null;
  return {
    customerName: row.customer_name ?? "",
    customerPhone: row.customer_phone ?? "",
    customerEmail: row.customer_email ?? "",
    vehicleMake: row.vehicle_make ?? "",
    vehicleModel: row.vehicle_model ?? "",
    vehicleYear: row.vehicle_year == null ? "" : String(row.vehicle_year),
    vehicleColor: row.vehicle_color ?? "",
    vehiclePlate: row.vehicle_plate ?? "",
    vehicleVinLast6: row.vehicle_vin_last6 ?? "",
    odometerKm: row.odometer_km == null ? "" : String(row.odometer_km),
  };
}

export async function findPublicWarranty(serial: string): Promise<PublicWarrantyRecord | null> {
  const row = await env.DB.prepare(`
    SELECT
      w.id AS warranty_id,
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
      ps.warranty_years,
      d.name AS dealer_name,
      d.province AS dealer_province,
      w.work_order_ref,
      COALESCE(w.installation_type, 'full_body') AS installation_type,
      COALESCE(w.coverage_area, 'ติดตั้งเต็มคัน') AS coverage_area,
      w.installation_branch,
      w.vehicle_year,
      w.vehicle_color
    FROM serials s
    LEFT JOIN warranties w ON w.serial_code = s.serial_code
    LEFT JOIN product_series ps ON ps.model_code = COALESCE(w.product_model_code, s.model_code)
    LEFT JOIN dealers d ON d.id = w.dealer_id
    WHERE s.serial_code = ?
    LIMIT 1
  `).bind(serial).first<PublicWarrantyRow>();

  if (!row || row.serial_status === "invalid") return null;

  const product = row.product_name ?? row.product_model_code ?? row.serial_model_code;
  const base = {
    product,
    productWarrantyYears: row.warranty_years == null ? null : Number(row.warranty_years),
    serial: row.serial_code,
    install: formatDate(row.install_date),
    expiry: formatDate(row.expiry_date),
    dealer: row.dealer_name
      ? `${row.dealer_name}${row.dealer_province ? ` · ${row.dealer_province}` : ""}`
      : "NEXS Authorized Dealer",
    workOrder: row.work_order_ref || "-",
    wrapType: installationTypeLabel(row.installation_type),
    coverage: row.coverage_area,
    branch: row.installation_branch || row.dealer_name || "NEXS Authorized Dealer",
    vehicleYear: row.vehicle_year == null ? null : Number(row.vehicle_year),
    vehicleColor: row.vehicle_color,
    nextMaintenance: "-",
    planNote: null,
    installationWarrantyTerms: null,
    removalWarrantyTerms: null,
    benefits: emptyBenefits(),
    serviceHistory: [],
  };
  if (!row.warranty_status || row.serial_status === "available") {
    return { ...base, status: "not-registered", vehicle: "ยังไม่ลงทะเบียน", install: "-", expiry: "-", dealer: "-", maintenance: "-" };
  }

  if (row.warranty_status === "pending_customer") {
    return { ...base, status: "profile-required", vehicle: "รอลูกค้ากรอกข้อมูล", maintenance: "ยังไม่มีรายการบำรุงรักษา" };
  }

  const [plan, historyResult] = await Promise.all([
    env.DB.prepare(`
      SELECT
        COALESCE(p.maintenance_included, false) AS maintenance_included,
        p.maintenance_interval_months, p.maintenance_visit_limit,
        COALESCE(p.claim_included, false) AS claim_included, p.claim_piece_limit,
        COALESCE(p.rewrap_included, false) AS rewrap_included, p.rewrap_piece_limit,
        p.plan_note, p.installation_warranty_terms, p.removal_warranty_terms,
        (SELECT COUNT(*) FROM maintenance_records m WHERE m.warranty_id = ? AND m.maintenance_type = 'maintenance') AS maintenance_used,
        (SELECT COALESCE(SUM(m.pieces_count), 0) FROM maintenance_records m WHERE m.warranty_id = ? AND m.maintenance_type = 'claim') AS claim_used,
        (SELECT COALESCE(SUM(m.pieces_count), 0) FROM maintenance_records m WHERE m.warranty_id = ? AND m.maintenance_type = 'rewrap') AS rewrap_used,
        COALESCE(
          (SELECT m.next_recommended_date FROM maintenance_records m
           WHERE m.warranty_id = ? AND m.next_recommended_date IS NOT NULL
           ORDER BY m.maintenance_date DESC, m.id DESC LIMIT 1),
          CASE WHEN p.maintenance_included
            THEN (CAST(? AS date) + make_interval(months => p.maintenance_interval_months))::date
            ELSE NULL END
        ) AS next_recommended_date
      FROM warranty_service_plans p
      WHERE p.warranty_id = ?
    `).bind(row.warranty_id, row.warranty_id, row.warranty_id, row.warranty_id, dateOnly(row.install_date), row.warranty_id).first<PlanRow>(),
    env.DB.prepare(`
      SELECT reference_code, maintenance_date, maintenance_type, result_status,
        next_recommended_date, pieces_count, service_scope
      FROM maintenance_records
      WHERE warranty_id = ?
      ORDER BY maintenance_date DESC, id DESC
      LIMIT 50
    `).bind(row.warranty_id).all<HistoryRow>(),
  ]);

  const maintenanceUsed = Number(plan?.maintenance_used ?? 0);
  const claimUsed = Number(plan?.claim_used ?? 0);
  const rewrapUsed = Number(plan?.rewrap_used ?? 0);
  const benefits = {
    maintenance: benefit(Boolean(plan?.maintenance_included), maintenanceUsed, plan?.maintenance_visit_limit, plan?.maintenance_interval_months),
    claim: benefit(Boolean(plan?.claim_included), claimUsed, plan?.claim_piece_limit),
    rewrap: benefit(Boolean(plan?.rewrap_included), rewrapUsed, plan?.rewrap_piece_limit),
  };
  const history = (historyResult.results ?? []).map((item) => ({
    reference: item.reference_code,
    type: item.maintenance_type,
    label: serviceTypeLabel(item.maintenance_type),
    date: formatDate(item.maintenance_date),
    pieces: Number(item.pieces_count ?? 0),
    scope: item.service_scope,
    result: resultLabel(item.result_status),
    nextDate: formatDate(item.next_recommended_date),
  }));

  const expiryDateOnly = dateOnly(row.expiry_date);
  const expiredByDate = expiryDateOnly
    ? new Date(`${expiryDateOnly}T23:59:59+07:00`).getTime() < Date.now()
    : false;
  const status: PublicWarrantyStatus = row.warranty_status === "expired" || expiredByDate
    ? "expired"
    : row.warranty_status === "under_review" || row.warranty_status === "suspended" || row.serial_status === "suspended"
      ? "under-review"
      : "active";

  return {
    ...base,
    status,
    expiry: status === "under-review" ? "อยู่ระหว่างตรวจสอบ" : base.expiry,
    vehicle: `${[row.vehicle_make, row.vehicle_model, row.vehicle_year].filter(Boolean).join(" ") || "Vehicle"}${row.vehicle_color ? ` · สีเดิม ${row.vehicle_color}` : ""} · ${maskPlate(row.vehicle_plate)}`,
    maintenance: benefits.maintenance.included
      ? `${benefits.maintenance.used}/${benefits.maintenance.limit} ครั้ง`
      : "ไม่รวมในแพ็กเกจ",
    nextMaintenance: benefits.maintenance.included ? formatDate(plan?.next_recommended_date ?? null) : "-",
    planNote: plan?.plan_note ?? null,
    installationWarrantyTerms: plan?.installation_warranty_terms ?? null,
    removalWarrantyTerms: plan?.removal_warranty_terms ?? null,
    benefits,
    serviceHistory: history,
  };
}

function installationTypeLabel(value: string): string {
  return { full_body: "Wrap เต็มคัน", partial: "Wrap บางส่วน", color_wrap: "เปลี่ยนสีรถ", custom: "งานออกแบบพิเศษ" }[value] ?? "งาน Wrap";
}

function benefit(included: boolean, used: number, limit: number | null | undefined, intervalMonths?: number | null): PublicServiceBenefit {
  const normalizedLimit = included && limit != null ? Number(limit) : null;
  return {
    included,
    used,
    limit: normalizedLimit,
    remaining: normalizedLimit == null ? null : Math.max(0, normalizedLimit - used),
    ...(intervalMonths !== undefined ? { intervalMonths: intervalMonths == null ? null : Number(intervalMonths) } : {}),
  };
}

function resultLabel(value: string): string {
  return {
    normal: "เรียบร้อย",
    passed: "ผ่านการตรวจ",
    follow_up: "นัดติดตามผล",
    admin_review: "ส่งตรวจสอบ",
    under_review: "อยู่ระหว่างตรวจสอบ",
  }[value] ?? value;
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
