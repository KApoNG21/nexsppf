import { env } from "@/lib/server-env";
import { cleanOptionalText, parsePiecesCount, parseServiceType, type ServiceType } from "@/lib/after-sales";
import { authorizePartnerRequest, unauthorizedResponse } from "../../../../db/partner-access";
import { enforceSameOrigin, fail, formText, normalizeSerial, PartnerValidationError, requiredText, validIsoDate } from "../../_partner-utils";

type WarrantyOwner = {
  id: number;
  dealer_id: number;
  status: string;
  maintenance_included: boolean;
  maintenance_interval_months: number | null;
  maintenance_visit_limit: number | null;
  maintenance_used: number;
  claim_included: boolean;
  claim_piece_limit: number | null;
  claim_used: number;
  rewrap_included: boolean;
  rewrap_piece_limit: number | null;
  rewrap_used: number;
};
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_FILES = 5;
const acceptedTypes = new Map([["image/jpeg", "jpg"], ["image/png", "png"], ["image/webp", "webp"]]);

export async function POST(request: Request) {
  const originFailure = enforceSameOrigin(request);
  if (originFailure) return originFailure;
  const actor = await authorizePartnerRequest(request, "dealer");
  if (!actor?.dealerId) return unauthorizedResponse();

  const uploadedKeys: string[] = [];
  try {
    const form = await request.formData();
    const serialCode = normalizeSerial(requiredText(form, "serialCode", " Serial Number", 6, 64));
    const maintenanceDate = validIsoDate(requiredText(form, "maintenanceDate", "วันที่เข้ารับบริการ", 10, 10), "วันที่เข้ารับบริการ");
    let maintenanceType: ServiceType;
    let piecesCount: number;
    try {
      maintenanceType = parseServiceType(requiredText(form, "maintenanceType", "ประเภทบริการ", 2, 80));
      piecesCount = parsePiecesCount(form, maintenanceType);
    } catch (error) {
      throw new PartnerValidationError(error instanceof Error ? error.message : "ประเภทบริการไม่ถูกต้อง");
    }
    const performedBy = requiredText(form, "performedBy", "ผู้ดำเนินการ", 2, 120);
    const resultStatus = requiredText(form, "resultStatus", "ผลการตรวจ", 2, 80);
    const note = formText(form, "note").slice(0, 2000);
    const serviceScope = cleanOptionalText(form.get("serviceScope"), 500);
    if ((maintenanceType === "claim" || maintenanceType === "rewrap") && !serviceScope) {
      throw new PartnerValidationError("กรุณาระบุชิ้นส่วนหรือบริเวณที่ให้บริการ");
    }
    const nextRecommendedDateRaw = formText(form, "nextRecommendedDate");
    const nextRecommendedDate = nextRecommendedDateRaw ? validIsoDate(nextRecommendedDateRaw, "วันที่แนะนำครั้งถัดไป") : null;
    const photos = form.getAll("photos").filter((value): value is File => value instanceof File && value.size > 0);
    if (photos.length > MAX_FILES) throw new PartnerValidationError(`แนบภาพได้ไม่เกิน ${MAX_FILES} ไฟล์`);
    for (const photo of photos) {
      if (!acceptedTypes.has(photo.type) || photo.size > MAX_FILE_BYTES) throw new PartnerValidationError("ภาพต้องเป็น JPG, PNG หรือ WEBP และไม่เกิน 5 MB ต่อไฟล์");
    }

    const warranty = await env.DB.prepare(`
      SELECT w.id, w.dealer_id, w.status,
        COALESCE(p.maintenance_included, false) AS maintenance_included,
        p.maintenance_interval_months, p.maintenance_visit_limit,
        (SELECT COUNT(*) FROM maintenance_records m WHERE m.warranty_id = w.id AND m.maintenance_type = 'maintenance') AS maintenance_used,
        COALESCE(p.claim_included, false) AS claim_included, p.claim_piece_limit,
        (SELECT COALESCE(SUM(m.pieces_count), 0) FROM maintenance_records m WHERE m.warranty_id = w.id AND m.maintenance_type = 'claim') AS claim_used,
        COALESCE(p.rewrap_included, false) AS rewrap_included, p.rewrap_piece_limit,
        (SELECT COALESCE(SUM(m.pieces_count), 0) FROM maintenance_records m WHERE m.warranty_id = w.id AND m.maintenance_type = 'rewrap') AS rewrap_used
      FROM warranties w
      LEFT JOIN warranty_service_plans p ON p.warranty_id = w.id
      WHERE w.serial_code = ? AND w.dealer_id = ?
      LIMIT 1
    `).bind(serialCode, actor.dealerId).first<WarrantyOwner>();
    if (!warranty) return fail("ไม่พบบัตรรับประกันของร้านนี้", 404);
    if (warranty.status !== "active") return fail("บัตรต้องลงทะเบียนโดยลูกค้าและมีสถานะ Active ก่อนบันทึกบริการ", 409);
    validateEntitlement(warranty, maintenanceType, piecesCount);
    const referenceCode = createMaintenanceReference();
    for (const photo of photos) {
      const extension = acceptedTypes.get(photo.type)!;
      const objectKey = `maintenance/${referenceCode}/${crypto.randomUUID()}.${extension}`;
      await env.FILES.put(objectKey, photo.stream(), { httpMetadata: { contentType: photo.type }, customMetadata: { referenceCode, serialCode, dealerId: String(actor.dealerId) } });
      uploadedKeys.push(objectKey);
    }

    const results = await env.DB.batch([
      env.DB.prepare(`
        INSERT INTO maintenance_records
          (reference_code, warranty_id, dealer_id, maintenance_date, maintenance_type, performed_by,
           result_status, note, next_recommended_date, pieces_count, service_scope)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?,
          CASE
            WHEN ?::date IS NOT NULL THEN ?::date
            WHEN ? = 'maintenance' AND ?::integer IS NOT NULL
              THEN (?::date + make_interval(months => ?::integer))::date
            ELSE NULL
          END,
          ?, ?)
      `).bind(
        referenceCode, warranty.id, actor.dealerId, maintenanceDate, maintenanceType, performedBy,
        resultStatus, note || null,
        nextRecommendedDate, nextRecommendedDate,
        maintenanceType, warranty.maintenance_interval_months,
        maintenanceDate, warranty.maintenance_interval_months,
        piecesCount, serviceScope,
      ),
      ...photos.map((photo, index) => env.DB.prepare(`
        INSERT INTO media_assets (owner_type, owner_reference, object_key, original_name, content_type, size_bytes)
        VALUES ('maintenance', ?, ?, ?, ?, ?)
      `).bind(referenceCode, uploadedKeys[index], photo.name.slice(0, 160), photo.type, photo.size)),
      env.DB.prepare(`
        INSERT INTO audit_logs (actor_email, actor_role, action, entity_type, entity_id, detail)
        VALUES (?, 'dealer', 'maintenance.create', 'warranty', ?, ?)
      `).bind(actor.email, serialCode, JSON.stringify({ referenceCode, dealerId: actor.dealerId, maintenanceType, piecesCount, serviceScope, performedBy, resultStatus, photoCount: photos.length })),
    ]);
    return Response.json({ ok: true, referenceCode, recordId: Number(results[0]?.meta?.last_row_id ?? 0), serialCode }, { status: 201 });
  } catch (error) {
    await Promise.allSettled(uploadedKeys.map((key) => env.FILES.delete(key)));
    if (error instanceof PartnerValidationError) return fail(error.message, 400);
    return fail("ไม่สามารถบันทึกข้อมูลการดูแลได้", 500);
  }
}

function validateEntitlement(warranty: WarrantyOwner, type: ServiceType, pieces: number) {
  if (type === "maintenance") {
    if (!warranty.maintenance_included) throw new PartnerValidationError("แพ็กเกจของบัตรนี้ไม่รวม Maintenance");
    if (Number(warranty.maintenance_used) >= Number(warranty.maintenance_visit_limit)) throw new PartnerValidationError("ใช้สิทธิ์ Maintenance ครบแล้ว");
  }
  if (type === "claim") {
    if (!warranty.claim_included) throw new PartnerValidationError("แพ็กเกจของบัตรนี้ไม่รวมสิทธิ์เคลม");
    if (Number(warranty.claim_used) + pieces > Number(warranty.claim_piece_limit)) throw new PartnerValidationError("จำนวนชิ้นเกินสิทธิ์เคลมคงเหลือ");
  }
  if (type === "rewrap") {
    if (!warranty.rewrap_included) throw new PartnerValidationError("แพ็กเกจของบัตรนี้ไม่รวมสิทธิ์ Re-wrap");
    if (Number(warranty.rewrap_used) + pieces > Number(warranty.rewrap_piece_limit)) throw new PartnerValidationError("จำนวนชิ้นเกินสิทธิ์ Re-wrap คงเหลือ");
  }
}

function createMaintenanceReference(): string {
  const parts = new Intl.DateTimeFormat("en", { year: "2-digit", month: "2-digit", day: "2-digit", timeZone: "Asia/Bangkok" }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const bytes = crypto.getRandomValues(new Uint8Array(3));
  const suffix = [...bytes].map((value) => value.toString(16).padStart(2, "0")).join("").toUpperCase();
  return `MNT-${values.year}${values.month}${values.day}-${suffix}`;
}
