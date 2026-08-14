import { env } from "@/lib/server-env";
import { enforcePublicRequestRateLimit } from "../../_public-rate-limit";
import { enforceSameOrigin, fail, formText, normalizeSerial, PartnerValidationError, requiredText } from "../../_partner-utils";

type WarrantyRow = { id: number; status: string };
type UpdatedRow = { id: number };

export async function POST(request: Request) {
  const originFailure = enforceSameOrigin(request);
  if (originFailure) return originFailure;
  const rateFailure = await enforcePublicRequestRateLimit(request);
  if (rateFailure) return rateFailure;

  try {
    const form = await request.formData();
    if (formText(form, "company")) return Response.json({ ok: true });
    if (formText(form, "consent") !== "on") throw new PartnerValidationError("กรุณายอมรับการใช้ข้อมูลเพื่อออกบัตรรับประกัน");

    const serialCode = normalizeSerial(requiredText(form, "serialCode", "Serial Number", 6, 64));
    const customerName = requiredText(form, "customerName", "ชื่อ-นามสกุล", 2, 120);
    const rawPhone = requiredText(form, "customerPhone", "เบอร์โทรศัพท์", 8, 40).replace(/\D/g, "");
    const customerPhone = rawPhone.startsWith("66") && rawPhone.length === 11 ? `0${rawPhone.slice(2)}` : rawPhone;
    if (customerPhone.length < 9 || customerPhone.length > 10) throw new PartnerValidationError("กรุณากรอกเบอร์โทรศัพท์ 9–10 หลัก");
    const customerEmail = formText(form, "customerEmail");
    if (customerEmail && !/^\S+@\S+\.\S+$/.test(customerEmail)) throw new PartnerValidationError("รูปแบบอีเมลไม่ถูกต้อง");
    const vehicleMake = requiredText(form, "vehicleMake", "ยี่ห้อรถ", 2, 80);
    const vehicleModel = requiredText(form, "vehicleModel", "รุ่นรถ", 1, 120);
    const vehiclePlate = requiredText(form, "vehiclePlate", "ทะเบียนรถ", 2, 40);

    const current = await env.DB.prepare(
      "SELECT id, status FROM warranties WHERE serial_code = ? LIMIT 1",
    ).bind(serialCode).first<WarrantyRow>();
    if (!current) return fail("Dealer ยังไม่ได้เปิดใช้งาน QR นี้", 404);
    if (current.status !== "pending_customer") {
      return fail(current.status === "active" ? "บัตรนี้ลงทะเบียนข้อมูลลูกค้าเรียบร้อยแล้ว" : "บัตรนี้ยังไม่พร้อมแก้ไขข้อมูล", 409);
    }

    const updated = await env.DB.prepare(`
      WITH updated AS (
        UPDATE warranties
        SET customer_name = ?, customer_phone = ?, customer_email = ?,
          vehicle_make = ?, vehicle_model = ?, vehicle_plate = ?,
          customer_completed_at = CURRENT_TIMESTAMP, status = 'active'
        WHERE id = ? AND status = 'pending_customer'
        RETURNING id
      ), logged AS (
        INSERT INTO audit_logs (actor_email, actor_role, action, entity_type, entity_id, detail)
        SELECT 'customer-self-service', 'public', 'warranty.customer_complete', 'warranty', ?, ?
        FROM updated
      )
      SELECT id FROM updated
    `).bind(
      customerName,
      customerPhone,
      customerEmail || null,
      vehicleMake,
      vehicleModel,
      vehiclePlate,
      current.id,
      serialCode,
      JSON.stringify({ source: "qr-self-service" }),
    ).first<UpdatedRow>();
    if (!updated) return fail("มีการลงทะเบียนบัตรนี้ไปแล้ว กรุณาสแกน QR เพื่อตรวจสอบ", 409);

    return Response.json({
      ok: true,
      serialCode,
      status: "active",
      cardPath: `/r/${encodeURIComponent(serialCode)}`,
    }, { status: 200 });
  } catch (error) {
    if (error instanceof PartnerValidationError) return fail(error.message, 400);
    return fail("ไม่สามารถบันทึกข้อมูลบัตรรับประกันได้", 500);
  }
}
