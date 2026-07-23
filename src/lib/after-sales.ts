export const SERVICE_TYPES = ["maintenance", "claim", "rewrap", "inspection", "after_sales"] as const;
export type ServiceType = (typeof SERVICE_TYPES)[number];

export type ServicePlanInput = {
  maintenanceIncluded: boolean;
  maintenanceIntervalMonths: number | null;
  maintenanceVisitLimit: number | null;
  claimIncluded: boolean;
  claimPieceLimit: number | null;
  rewrapIncluded: boolean;
  rewrapPieceLimit: number | null;
  planNote: string | null;
};

export function parseServicePlan(form: FormData): ServicePlanInput {
  const maintenanceIncluded = form.get("maintenanceIncluded") === "on";
  const claimIncluded = form.get("claimIncluded") === "on";
  const rewrapIncluded = form.get("rewrapIncluded") === "on";
  return {
    maintenanceIncluded,
    maintenanceIntervalMonths: maintenanceIncluded ? positiveInteger(form, "maintenanceIntervalMonths", 1, 60, "รอบ Maintenance") : null,
    maintenanceVisitLimit: maintenanceIncluded ? positiveInteger(form, "maintenanceVisitLimit", 1, 100, "จำนวนครั้ง Maintenance") : null,
    claimIncluded,
    claimPieceLimit: claimIncluded ? positiveInteger(form, "claimPieceLimit", 1, 100, "จำนวนชิ้นเคลม") : null,
    rewrapIncluded,
    rewrapPieceLimit: rewrapIncluded ? positiveInteger(form, "rewrapPieceLimit", 1, 100, "จำนวนชิ้น Re-wrap") : null,
    planNote: cleanOptionalText(form.get("planNote"), 500),
  };
}

export function parseServiceType(value: string): ServiceType {
  if (!SERVICE_TYPES.includes(value as ServiceType)) throw new Error("ประเภทบริการไม่ถูกต้อง");
  return value as ServiceType;
}

export function parsePiecesCount(form: FormData, serviceType: ServiceType): number {
  if (serviceType !== "claim" && serviceType !== "rewrap") return 0;
  return positiveInteger(form, "piecesCount", 1, 100, "จำนวนชิ้น");
}

export function cleanOptionalText(value: FormDataEntryValue | null, maxLength: number): string | null {
  const text = typeof value === "string" ? value.trim() : "";
  return text ? text.slice(0, maxLength) : null;
}

function positiveInteger(form: FormData, name: string, minimum: number, maximum: number, label: string): number {
  const raw = form.get(name);
  const value = typeof raw === "string" ? Number(raw) : Number.NaN;
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${label} ต้องเป็นจำนวนเต็ม ${minimum}-${maximum}`);
  }
  return value;
}

export function serviceTypeLabel(type: string): string {
  return {
    maintenance: "Maintenance",
    claim: "เคลมฟิล์ม",
    rewrap: "Re-wrap",
    inspection: "ตรวจสภาพ",
    after_sales: "บริการหลังการขาย",
    admin_correction: "รายการปรับปรุงโดย Admin",
  }[type] ?? type;
}
