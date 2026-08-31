import type { AdminPermission } from "@/db/admin-permissions";
import {
  authorizeAdminRequest,
  authorizePartnerRequest,
  hasAdminPermission,
  unauthorizedResponse,
} from "@/db/partner-access";
import { env } from "@/lib/server-env";
import { enforceSameOrigin, fail } from "../../_partner-utils";

const WORKSPACE_KEY = "main";
const MAX_UNITS = 5000;
const MAX_ACTIVITY = 250;

type UnitStatus = "available" | "reserved" | "open" | "in-transit" | "issued" | "damaged";
type LabelStatus = "printed" | "unprinted";
type SerialSource = "existing-qr" | "system" | "opening-balance";
type ProductKind = "standard" | "color";

type StockUnit = {
  serial: string;
  product: string;
  variant: string;
  lot: string;
  location: string;
  status: UnitStatus;
  labelStatus: LabelStatus;
  source: SerialSource;
  initialMetres: number;
  metres: number;
  updatedAt: string;
  productKind?: ProductKind;
  colorProductId?: number;
  colorName?: string;
  colorCode?: string;
  colorHex?: string;
};

type Activity = {
  id: string;
  type: string;
  title: string;
  detail: string;
  time: string;
  tone: "red" | "green" | "blue" | "gold";
};

type StateRow = {
  version: number;
  units_json: StockUnit[];
  activity_json: Activity[];
  updated_by: string;
  updated_at: Date | string;
};

const allowedStatuses = new Set<UnitStatus>(["available", "reserved", "open", "in-transit", "issued", "damaged"]);
const allowedLabelStatuses = new Set<LabelStatus>(["printed", "unprinted"]);
const allowedSources = new Set<SerialSource>(["existing-qr", "system", "opening-balance"]);
const allowedProductKinds = new Set<ProductKind>(["standard", "color"]);
const allowedTones = new Set<Activity["tone"]>(["red", "green", "blue", "gold"]);

export async function GET(request: Request) {
  const actor = await authorizeAdminRequest(request, "stock.view");
  if (!actor) return unauthorizedResponse();

  const result = await env.DB.pool.query<StateRow>(
    `SELECT version, units_json, activity_json, updated_by, updated_at
     FROM stock_workspace_state
     WHERE workspace_key = $1
     LIMIT 1`,
    [WORKSPACE_KEY],
  );
  const row = result.rows[0];
  if (!row) {
    return Response.json(
      { ok: true, exists: false, version: 0, units: null, activity: null },
      { headers: { "cache-control": "private, no-store" } },
    );
  }

  return Response.json(
    {
      ok: true,
      exists: true,
      version: row.version,
      units: row.units_json,
      activity: row.activity_json,
      updatedBy: row.updated_by,
      updatedAt: row.updated_at,
    },
    { headers: { "cache-control": "private, no-store" } },
  );
}

export async function PUT(request: Request) {
  const originFailure = enforceSameOrigin(request);
  if (originFailure) return originFailure;

  const actor = await authorizePartnerRequest(request, "admin");
  if (!actor) return unauthorizedResponse();

  try {
    const body = await request.json() as { version?: unknown; units?: unknown; activity?: unknown };
    const version = Number(body.version);
    if (!Number.isInteger(version) || version < 0) return fail("เวอร์ชันข้อมูลสต็อกไม่ถูกต้อง", 400);

    const units = validateUnits(body.units);
    const activity = validateActivity(body.activity);
    const permission = permissionForActivity(activity[0]?.type);
    if (!permission || !hasAdminPermission(actor, permission)) return unauthorizedResponse();

    const unitsJson = JSON.stringify(units);
    const activityJson = JSON.stringify(activity);
    if (unitsJson.length > 4_000_000 || activityJson.length > 600_000) {
      return fail("ข้อมูลสต็อกมีขนาดเกินกว่าที่ระบบรองรับ", 413);
    }

    const client = await env.DB.pool.connect();
    try {
      await client.query("BEGIN");
      const write = version === 0
        ? await client.query<{ version: number }>(
          `INSERT INTO stock_workspace_state
            (workspace_key, version, units_json, activity_json, updated_by, updated_at)
           VALUES ($1, 1, $2::jsonb, $3::jsonb, $4, CURRENT_TIMESTAMP)
           ON CONFLICT (workspace_key) DO NOTHING
           RETURNING version`,
          [WORKSPACE_KEY, unitsJson, activityJson, actor.email],
        )
        : await client.query<{ version: number }>(
          `UPDATE stock_workspace_state
           SET version = version + 1,
               units_json = $2::jsonb,
               activity_json = $3::jsonb,
               updated_by = $4,
               updated_at = CURRENT_TIMESTAMP
           WHERE workspace_key = $1 AND version = $5
           RETURNING version`,
          [WORKSPACE_KEY, unitsJson, activityJson, actor.email, version],
        );

      const nextVersion = write.rows[0]?.version;
      if (!nextVersion) {
        await client.query("ROLLBACK");
        const current = await env.DB.pool.query<{ version: number }>(
          "SELECT version FROM stock_workspace_state WHERE workspace_key = $1 LIMIT 1",
          [WORKSPACE_KEY],
        );
        return Response.json(
          { ok: false, error: "ข้อมูลถูกอัปเดตจากอีกหน้าต่าง กรุณาโหลดข้อมูลล่าสุด", version: current.rows[0]?.version ?? 0 },
          { status: 409, headers: { "cache-control": "private, no-store" } },
        );
      }

      const latest = activity[0];
      await client.query(
        `INSERT INTO audit_logs
          (actor_email, actor_role, action, entity_type, entity_id, detail)
         VALUES ($1, 'admin', 'stock.workspace_sync', 'stock_workspace', $2, $3)`,
        [actor.email, WORKSPACE_KEY, JSON.stringify({
          versionFrom: version,
          versionTo: nextVersion,
          unitCount: units.length,
          activityId: latest.id,
          activityType: latest.type,
          activityTitle: latest.title,
        })],
      );
      await client.query("COMMIT");
      return Response.json(
        { ok: true, version: nextVersion, updatedBy: actor.email },
        { headers: { "cache-control": "private, no-store" } },
      );
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    if (error instanceof ValidationError) return fail(error.message, 400);
    console.error("stock workspace save failed", error);
    return fail("ไม่สามารถบันทึกข้อมูลสต็อกได้", 500);
  }
}

class ValidationError extends Error {}

function validateUnits(value: unknown): StockUnit[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > MAX_UNITS) {
    throw new ValidationError("จำนวนรายการสต็อกไม่ถูกต้อง");
  }
  const serials = new Set<string>();
  return value.map((item, index) => {
    if (!item || typeof item !== "object") throw new ValidationError(`ข้อมูลหน่วยที่ ${index + 1} ไม่ถูกต้อง`);
    const unit = item as Record<string, unknown>;
    const serial = safeText(unit.serial, "Serial", 1, 120).toUpperCase();
    if (serials.has(serial)) throw new ValidationError(`พบ Serial ซ้ำ: ${serial}`);
    serials.add(serial);
    const status = safeEnum(unit.status, allowedStatuses, "สถานะสต็อก");
    const labelStatus = safeEnum(unit.labelStatus, allowedLabelStatuses, "สถานะ Label");
    const source = safeEnum(unit.source, allowedSources, "แหล่ง Serial");
    const initialMetres = safeNumber(unit.initialMetres, "เมตรตั้งต้น", 0, 10000);
    const metres = safeNumber(unit.metres, "เมตรคงเหลือ", 0, initialMetres);
    const productKind = unit.productKind == null ? undefined : safeEnum(unit.productKind, allowedProductKinds, "ประเภทสินค้า");
    const colorProductId = productKind === "color" ? safeInteger(unit.colorProductId, "รหัสข้อมูลสี", 1, 1_000_000_000) : undefined;
    const colorName = productKind === "color" ? safeText(unit.colorName, "ชื่อสี", 2, 100) : undefined;
    const colorCode = productKind === "color" ? safeOptionalText(unit.colorCode, "รหัสสี", 50) : undefined;
    const colorHex = productKind === "color" ? safeColorHex(unit.colorHex) : undefined;
    return {
      serial,
      product: safeText(unit.product, "สินค้า", 1, 160),
      variant: safeText(unit.variant, "Variant", 1, 160),
      lot: safeText(unit.lot, "Lot", 1, 120),
      location: safeText(unit.location, "ตำแหน่ง", 1, 160),
      status,
      labelStatus,
      source,
      initialMetres,
      metres,
      updatedAt: safeText(unit.updatedAt, "เวลาอัปเดต", 1, 120),
      ...(productKind ? { productKind } : {}),
      ...(colorProductId ? { colorProductId } : {}),
      ...(colorName ? { colorName } : {}),
      ...(productKind === "color" ? { colorCode: colorCode ?? "", colorHex } : {}),
    };
  });
}

function validateActivity(value: unknown): Activity[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > MAX_ACTIVITY) {
    throw new ValidationError("ประวัติความเคลื่อนไหวไม่ถูกต้อง");
  }
  return value.map((item, index) => {
    if (!item || typeof item !== "object") throw new ValidationError(`ประวัติรายการที่ ${index + 1} ไม่ถูกต้อง`);
    const activity = item as Record<string, unknown>;
    return {
      id: safeText(activity.id, "Activity ID", 1, 120),
      type: safeText(activity.type, "ประเภทรายการ", 1, 50),
      title: safeText(activity.title, "ชื่อรายการ", 1, 240),
      detail: safeText(activity.detail, "รายละเอียด", 1, 500),
      time: safeText(activity.time, "เวลา", 1, 80),
      tone: safeEnum(activity.tone, allowedTones, "โทนสถานะ"),
    };
  });
}

function permissionForActivity(type: string | undefined): AdminPermission | null {
  if (type === "รับเข้า") return "stock.receive";
  if (["ผูก QR", "จ่ายออก", "คืนคลัง", "แจ้งเสีย", "ย้ายสินค้า", "เปิดม้วน"].includes(type ?? "")) return "stock.issue";
  if (type === "ตรวจนับ") return "stock.count";
  if (type === "ตั้งต้น") return "stock.adjust";
  return null;
}

function safeText(value: unknown, label: string, min: number, max: number): string {
  if (typeof value !== "string") throw new ValidationError(`${label} ไม่ถูกต้อง`);
  const text = value.trim();
  if (text.length < min || text.length > max) throw new ValidationError(`${label} ไม่ถูกต้อง`);
  return text;
}

function safeNumber(value: unknown, label: string, min: number, max: number): number {
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max) throw new ValidationError(`${label}ไม่ถูกต้อง`);
  return Math.round(number * 1000) / 1000;
}

function safeInteger(value: unknown, label: string, min: number, max: number) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max) throw new ValidationError(`${label}ไม่ถูกต้อง`);
  return number;
}

function safeOptionalText(value: unknown, label: string, max: number) {
  if (value == null) return "";
  if (typeof value !== "string") throw new ValidationError(`${label}ไม่ถูกต้อง`);
  const text = value.trim();
  if (text.length > max) throw new ValidationError(`${label}ไม่ถูกต้อง`);
  return text;
}

function safeColorHex(value: unknown) {
  if (typeof value !== "string" || !/^#[0-9A-Fa-f]{6}$/.test(value)) {
    throw new ValidationError("สีตัวอย่างไม่ถูกต้อง");
  }
  return value.toUpperCase();
}

function safeEnum<T extends string>(value: unknown, allowed: Set<T>, label: string): T {
  if (typeof value !== "string" || !allowed.has(value as T)) throw new ValidationError(`${label}ไม่ถูกต้อง`);
  return value as T;
}
