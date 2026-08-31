import { env } from "@/lib/server-env";
import { resolveProductFromSerial } from "@/lib/serial";
import { parseServicePlan } from "@/lib/after-sales";
import { authorizePartnerRequest, unauthorizedResponse } from "../../../../db/partner-access";
import { enforceSameOrigin, fail, formText, normalizeSerial, PartnerValidationError, requiredText, validIsoDate } from "../../_partner-utils";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_FILES = 5;
const acceptedTypes = new Map([["image/jpeg", "jpg"], ["image/png", "png"], ["image/webp", "webp"], ["image/heic", "heic"], ["image/heif", "heif"]]);
type SerialEligibility = { serial_code: string; model_code: string; serial_status: string; product_status: string | null; warranty_years: number | null; existing_warranty: number };
type ProductRow = { model_code: string; status: string; warranty_years: number | null };

const eligibilityReasons = {
  serial_not_found: "ไม่พบ Serial ในระบบ",
  already_registered: "Serial นี้ถูกลงทะเบียนรับประกันแล้ว",
  serial_suspended: "Serial นี้ถูกระงับและต้องให้ Admin ตรวจสอบ",
  serial_invalid: "Serial นี้ไม่ถูกต้องและต้องให้ Admin ตรวจสอบ",
  serial_not_available: "Serial นี้ยังไม่พร้อมลงทะเบียน",
  product_not_found: "ไม่พบรุ่นสินค้าที่ผูกกับ Serial",
  product_inactive: "รุ่นสินค้านี้ยังไม่เปิดใช้งาน",
} as const;

type EligibilityReason = keyof typeof eligibilityReasons;

export async function POST(request: Request) {
  const originFailure = enforceSameOrigin(request);
  if (originFailure) return originFailure;
  const actor = await authorizePartnerRequest(request, "dealer");
  if (!actor?.dealerId) return unauthorizedResponse();

  const uploadedKeys: string[] = [];
  try {
    const form = await request.formData();
    const serialCode = normalizeSerial(requiredText(form, "serialCode", " Serial Number", 6, 64));
    const installDate = validIsoDate(requiredText(form, "installDate", "วันที่ติดตั้ง", 10, 10), "วันที่ติดตั้ง");
    const workOrderRef = (formText(form, "workOrderRef") || `AUTO-${serialCode}`).slice(0, 80);
    const installationType = formText(form, "installationType") || "full_body";
    if (!new Set(["full_body", "partial", "color_wrap", "custom"]).has(installationType)) throw new PartnerValidationError("รูปแบบงาน Wrap ไม่ถูกต้อง");
    const coverageArea = (formText(form, "coverageArea") || "ติดตั้งเต็มคัน").slice(0, 500);
    const installationBranch = (formText(form, "installationBranch") || "ศูนย์ติดตั้ง").slice(0, 120);
    const installerName = (formText(form, "installerName") || actor.email).slice(0, 120);
    let servicePlan;
    try {
      servicePlan = parseServicePlan(form);
    } catch (error) {
      throw new PartnerValidationError(error instanceof Error ? error.message : "ข้อมูลแพ็กเกจบริการไม่ถูกต้อง");
    }
    let factoryProduct: ReturnType<typeof resolveProductFromSerial>;
    try {
      factoryProduct = resolveProductFromSerial(serialCode);
    } catch {
      throw new PartnerValidationError("QR หรือ Serial ไม่ตรงกับรูปแบบสินค้าของ NEXS");
    }
    const product = await env.DB.prepare(
      "SELECT model_code, status, warranty_years FROM product_series WHERE model_code = ? LIMIT 1",
    ).bind(factoryProduct.databaseModelCode).first<ProductRow>();
    if (!product || product.status !== "active") {
      throw new PartnerValidationError("รุ่นสินค้าจาก QR ยังไม่พร้อมเปิดรับประกัน");
    }
    await env.DB.prepare(`
      INSERT INTO serials (serial_code, model_code, batch_code, status)
      VALUES (?, ?, 'FACTORY-QR', 'available')
      ON CONFLICT(serial_code) DO NOTHING
    `).bind(serialCode, product.model_code).run();
    const eligibility = await env.DB.prepare(`
      SELECT s.serial_code, s.model_code, s.status AS serial_status, ps.status AS product_status, ps.warranty_years,
        EXISTS(SELECT 1 FROM warranties w WHERE w.serial_code = s.serial_code) AS existing_warranty
      FROM serials s LEFT JOIN product_series ps ON ps.model_code = s.model_code
      WHERE s.serial_code = ? LIMIT 1
    `).bind(serialCode).first<SerialEligibility>();
    const ineligibleReason = eligibility?.model_code !== product.model_code
      ? "product_not_found"
      : getIneligibleReason(eligibility);
    if (ineligibleReason) {
      const referenceCode = createExceptionReference();
      await env.DB.batch([
        env.DB.prepare(`
          INSERT INTO registration_exceptions (reference_code, serial_code, dealer_id, reason_code, detail, status)
          VALUES (?, ?, ?, ?, ?, 'pending')
        `).bind(referenceCode, serialCode, actor.dealerId, ineligibleReason, JSON.stringify({
          modelCode: eligibility?.model_code ?? null,
          serialStatus: eligibility?.serial_status ?? null,
          productStatus: eligibility?.product_status ?? null,
          existingWarranty: Boolean(eligibility?.existing_warranty),
        })),
        env.DB.prepare(`
          INSERT INTO audit_logs (actor_email, actor_role, action, entity_type, entity_id, detail)
          VALUES (?, 'dealer', 'warranty.registration_exception', 'registration_exception', ?, ?)
        `).bind(actor.email, referenceCode, JSON.stringify({ dealerId: actor.dealerId, serialCode, reasonCode: ineligibleReason })),
      ]);
      return Response.json({ ok: false, error: eligibilityReasons[ineligibleReason], referenceCode }, { status: 409 });
    }
    if (!eligibility) throw new Error("Eligible serial lookup returned no record");
    const photos = form.getAll("photos").filter((value): value is File => value instanceof File && value.size > 0);
    if (photos.length < 1) throw new PartnerValidationError("กรุณาแนบภาพหลักฐานงานติดตั้งอย่างน้อย 1 ภาพ");
    if (photos.length > MAX_FILES) throw new PartnerValidationError(`แนบภาพได้ไม่เกิน ${MAX_FILES} ไฟล์`);
    for (const photo of photos) {
      if (!acceptedTypes.has(photo.type) || photo.size > MAX_FILE_BYTES) throw new PartnerValidationError("ภาพต้องเป็น JPG, PNG, WEBP, HEIC หรือ HEIF และไม่เกิน 5 MB ต่อไฟล์");
      const extension = acceptedTypes.get(photo.type)!;
      const key = `warranties/${serialCode}/${crypto.randomUUID()}.${extension}`;
      await env.FILES.put(key, photo.stream(), { httpMetadata: { contentType: photo.type }, customMetadata: { serialCode, dealerId: String(actor.dealerId) } });
      uploadedKeys.push(key);
    }

    const statements = [
      env.DB.prepare(`
        INSERT INTO warranties
          (serial_code, dealer_id, product_model_code, install_date, expiry_date, status,
           work_order_ref, installation_type, coverage_area, installation_branch, installer_name)
        VALUES (?, ?, ?, ?,
          CASE WHEN CAST(? AS integer) IS NULL THEN NULL ELSE (CAST(? AS date) + make_interval(years => CAST(? AS integer)) - INTERVAL '1 day')::date END,
          'pending_customer', ?, ?, ?, ?, ?)
      `).bind(serialCode, actor.dealerId, eligibility.model_code, installDate, eligibility.warranty_years, installDate, eligibility.warranty_years, workOrderRef, installationType, coverageArea, installationBranch, installerName),
      env.DB.prepare(`
        INSERT INTO warranty_service_plans
          (warranty_id, maintenance_included, maintenance_interval_months, maintenance_visit_limit,
           claim_included, claim_piece_limit, rewrap_included, rewrap_piece_limit, plan_note)
        SELECT id, ?, ?, ?, ?, ?, ?, ?, ?
        FROM warranties WHERE serial_code = ? AND dealer_id = ?
      `).bind(
        servicePlan.maintenanceIncluded,
        servicePlan.maintenanceIntervalMonths,
        servicePlan.maintenanceVisitLimit,
        servicePlan.claimIncluded,
        servicePlan.claimPieceLimit,
        servicePlan.rewrapIncluded,
        servicePlan.rewrapPieceLimit,
        servicePlan.planNote,
        serialCode,
        actor.dealerId,
      ),
      env.DB.prepare("UPDATE serials SET status = 'active' WHERE serial_code = ? AND status = 'available' AND EXISTS (SELECT 1 FROM warranties w WHERE w.serial_code = serials.serial_code AND w.dealer_id = ?)").bind(serialCode, actor.dealerId),
      ...photos.map((photo, index) => env.DB.prepare(`
        INSERT INTO media_assets (owner_type, owner_reference, object_key, original_name, content_type, size_bytes)
        VALUES ('warranty', ?, ?, ?, ?, ?)
      `).bind(serialCode, uploadedKeys[index], photo.name.slice(0, 160), photo.type, photo.size)),
      env.DB.prepare(`
        INSERT INTO audit_logs (actor_email, actor_role, action, entity_type, entity_id, detail)
        VALUES (?, 'dealer', 'warranty.create', 'warranty', ?, ?)
      `).bind(actor.email, serialCode, JSON.stringify({ dealerId: actor.dealerId, workOrderRef, installationType, coverageArea, installationBranch, installerName })),
    ];
    const results = await env.DB.batch(statements);
    if (
      Number(results[0]?.meta?.changes ?? 0) !== 1
      || Number(results[1]?.meta?.changes ?? 0) !== 1
      || Number(results[2]?.meta?.changes ?? 0) !== 1
    ) throw new Error("Warranty registration transaction did not update expected rows");
    return Response.json({
      ok: true,
      serialCode,
      status: "pending_customer",
      cardPath: `/r/${encodeURIComponent(serialCode)}`,
      detailPath: `/dealer/warranties/${encodeURIComponent(serialCode)}`,
      prefillPath: `/dealer/customer-registration?serial=${encodeURIComponent(serialCode)}`,
    }, { status: 201 });
  } catch (error) {
    await Promise.allSettled(uploadedKeys.map((key) => env.FILES.delete(key)));
    if (error instanceof PartnerValidationError) return fail(error.message, 400);
    return fail("ไม่สามารถลงทะเบียนบัตรรับประกันได้", 500);
  }
}

function getIneligibleReason(eligibility: SerialEligibility | null): EligibilityReason | null {
  if (!eligibility) return "serial_not_found";
  if (eligibility.existing_warranty) return "already_registered";
  if (eligibility.serial_status === "suspended") return "serial_suspended";
  if (eligibility.serial_status === "invalid") return "serial_invalid";
  if (eligibility.serial_status !== "available") return "serial_not_available";
  if (eligibility.product_status === null) return "product_not_found";
  if (eligibility.product_status !== "active") return "product_inactive";
  return null;
}

function createExceptionReference(): string {
  const parts = new Intl.DateTimeFormat("en", { year: "2-digit", month: "2-digit", day: "2-digit", timeZone: "Asia/Bangkok" }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const bytes = crypto.getRandomValues(new Uint8Array(2));
  const suffix = (((bytes[0] << 8) | bytes[1]) % 10000).toString().padStart(4, "0");
  return `REG-${values.year}${values.month}${values.day}-${suffix}`;
}
