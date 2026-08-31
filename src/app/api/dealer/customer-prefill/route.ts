import { env } from "@/lib/server-env";
import { authorizePartnerRequest, unauthorizedResponse } from "../../../../db/partner-access";
import { enforceSameOrigin, fail, formText, normalizeSerial, PartnerValidationError, requiredText } from "../../_partner-utils";

type WarrantyRow = { id: number; status: string };

export async function POST(request: Request) {
  const originFailure = enforceSameOrigin(request);
  if (originFailure) return originFailure;
  const actor = await authorizePartnerRequest(request, "dealer");
  if (!actor?.dealerId) return unauthorizedResponse();

  try {
    const form = await request.formData();
    const serialCode = normalizeSerial(requiredText(form, "serialCode", "Serial Number", 6, 64));
    const customerName = optionalText(form, "customerName", "ชื่อ-นามสกุล", 2, 120);
    const customerPhone = optionalPhone(formText(form, "customerPhone"));
    const customerEmail = optionalText(form, "customerEmail", "อีเมล", 3, 160);
    if (customerEmail && !/^\S+@\S+\.\S+$/.test(customerEmail)) throw new PartnerValidationError("รูปแบบอีเมลไม่ถูกต้อง");
    const vehicleMake = optionalText(form, "vehicleMake", "ยี่ห้อรถ", 2, 80);
    const vehicleModel = optionalText(form, "vehicleModel", "รุ่นรถ", 1, 120);
    const vehicleYearText = formText(form, "vehicleYear");
    const vehicleYear = vehicleYearText ? Number(vehicleYearText) : null;
    if (vehicleYear !== null && (!Number.isInteger(vehicleYear) || vehicleYear < 1950 || vehicleYear > new Date().getFullYear() + 1)) throw new PartnerValidationError("ปีรถไม่ถูกต้อง กรุณากรอกเป็น ค.ศ.");
    const vehicleColor = optionalText(form, "vehicleColor", "สีรถก่อน Wrap", 2, 60);
    const vehiclePlate = optionalText(form, "vehiclePlate", "ทะเบียนรถ", 2, 40);
    const vehicleVinLast6 = formText(form, "vehicleVinLast6").toUpperCase();
    if (vehicleVinLast6 && !/^[A-Z0-9]{4,6}$/.test(vehicleVinLast6)) throw new PartnerValidationError("เลขตัวถัง 6 ตัวท้ายไม่ถูกต้อง");
    const odometerText = formText(form, "odometerKm");
    const odometerKm = odometerText ? Number(odometerText) : null;
    if (odometerKm !== null && (!Number.isInteger(odometerKm) || odometerKm < 0 || odometerKm > 5000000)) throw new PartnerValidationError("เลขไมล์ไม่ถูกต้อง");
    const values = { customerName, customerPhone, customerEmail, vehicleMake, vehicleModel, vehicleYear: vehicleYearText, vehicleColor, vehiclePlate, vehicleVinLast6, odometerKm: odometerText };
    if (!Object.values(values).some(Boolean)) throw new PartnerValidationError("กรอกข้อมูลที่ทราบอย่างน้อย 1 รายการ หรือกลับไปให้ลูกค้ากรอกเอง");

    const current = await env.DB.prepare("SELECT id, status FROM warranties WHERE serial_code = ? AND dealer_id = ? LIMIT 1")
      .bind(serialCode, actor.dealerId).first<WarrantyRow>();
    if (!current) return fail("ไม่พบบัตรรับประกันนี้ในร้านของคุณ", 404);
    if (current.status !== "pending_customer") return fail(current.status === "active" ? "ลูกค้ายืนยันข้อมูลบัตรนี้เรียบร้อยแล้ว" : "บัตรนี้ยังไม่พร้อมบันทึกข้อมูลลูกค้า", 409);

    const results = await env.DB.batch([
      env.DB.prepare(`
        UPDATE warranties
        SET customer_name = ?, customer_phone = ?, customer_email = ?, vehicle_make = ?, vehicle_model = ?,
          vehicle_year = ?, vehicle_color = ?, vehicle_plate = ?, vehicle_vin_last6 = ?, odometer_km = ?
        WHERE id = ? AND dealer_id = ? AND status = 'pending_customer'
      `).bind(customerName || null, customerPhone || null, customerEmail || null, vehicleMake || null, vehicleModel || null, vehicleYear, vehicleColor || null, vehiclePlate || null, vehicleVinLast6 || null, odometerKm, current.id, actor.dealerId),
      env.DB.prepare(`INSERT INTO audit_logs (actor_email, actor_role, action, entity_type, entity_id, detail)
        VALUES (?, 'dealer', 'warranty.customer_prefill', 'warranty', ?, ?)`)
        .bind(actor.email, serialCode, JSON.stringify({ dealerId: actor.dealerId, fields: Object.entries(values).filter(([, value]) => Boolean(value)).map(([key]) => key) })),
    ]);
    if (Number(results[0]?.meta?.changes ?? 0) !== 1) return fail("ไม่สามารถบันทึกร่างข้อมูลลูกค้าได้", 409);

    return Response.json({ ok: true, serialCode, status: "pending_customer", cardPath: `/r/${encodeURIComponent(serialCode)}`, detailPath: `/dealer/warranties/${encodeURIComponent(serialCode)}` });
  } catch (error) {
    if (error instanceof PartnerValidationError) return fail(error.message, 400);
    return fail("ไม่สามารถบันทึกร่างข้อมูลลูกค้าได้", 500);
  }
}

function optionalText(form: FormData, key: string, label: string, min: number, max: number): string {
  const value = formText(form, key);
  if (value && (value.length < min || value.length > max)) throw new PartnerValidationError(`กรุณาตรวจสอบ${label}`);
  return value;
}

function optionalPhone(value: string): string {
  if (!value) return "";
  const digits = value.replace(/\D/g, "");
  const phone = digits.startsWith("66") && digits.length === 11 ? `0${digits.slice(2)}` : digits;
  if (phone.length < 9 || phone.length > 10) throw new PartnerValidationError("กรุณากรอกเบอร์โทรศัพท์ 9–10 หลัก");
  return phone;
}
