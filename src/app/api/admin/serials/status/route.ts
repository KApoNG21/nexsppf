import { env } from "@/lib/server-env";
import { authorizePartnerRequest, unauthorizedResponse } from "../../../../../db/partner-access";
import { enforceSameOrigin, fail, formText, PartnerValidationError, requiredText } from "../../../_partner-utils";

const transitions: Record<string, Set<string>> = {
  available: new Set(["suspended", "invalid"]),
  suspended: new Set(["available", "invalid"]),
  invalid: new Set(["available", "suspended"]),
};

type SerialRow = { id: number; status: string; model_code: string; batch_code: string };

export async function POST(request: Request) {
  const originFailure = enforceSameOrigin(request);
  if (originFailure) return originFailure;
  const actor = await authorizePartnerRequest(request, "admin");
  if (!actor) return unauthorizedResponse();

  try {
    const form = await request.formData();
    const serialCode = requiredText(form, "serialCode", " Serial Number", 6, 64).toUpperCase().replace(/\s+/g, "");
    if (!/^[A-Z0-9-]+$/.test(serialCode)) throw new PartnerValidationError("Serial Number มีรูปแบบไม่ถูกต้อง");
    const nextStatus = requiredText(form, "status", "สถานะ", 2, 20);
    const note = formText(form, "note").slice(0, 1000);
    if (note.length < 3) throw new PartnerValidationError("กรุณาระบุเหตุผลการเปลี่ยนสถานะ");

    const current = await env.DB.prepare(
      "SELECT id, status, model_code, batch_code FROM serials WHERE serial_code = ? LIMIT 1",
    ).bind(serialCode).first<SerialRow>();
    if (!current) return fail("ไม่พบ Serial", 404);
    if (current.status === "active") {
      return fail("Serial ที่ลงทะเบียนแล้วต้องเปลี่ยนสถานะผ่าน Warranty Records", 409);
    }
    if (!transitions[current.status]?.has(nextStatus)) {
      return fail(`ไม่สามารถเปลี่ยนสถานะจาก ${current.status} เป็น ${nextStatus}`, 409);
    }

    const results = await env.DB.batch([
      env.DB.prepare(
        "UPDATE serials SET status = ? WHERE id = ? AND status = ?",
      ).bind(nextStatus, current.id, current.status),
      env.DB.prepare(`
        INSERT INTO audit_logs
          (actor_email, actor_role, action, entity_type, entity_id, detail)
        VALUES (?, 'admin', 'serial.status_change', 'serial', ?, ?)
      `).bind(actor.email, serialCode, JSON.stringify({
        from: current.status,
        to: nextStatus,
        modelCode: current.model_code,
        batchCode: current.batch_code,
        note,
      })),
    ]);
    if (Number(results[0]?.meta?.changes ?? 0) !== 1) {
      return fail("สถานะถูกเปลี่ยนโดยผู้ใช้อื่น กรุณารีเฟรช", 409);
    }
    return Response.json({ ok: true, serialCode, status: nextStatus });
  } catch (error) {
    if (error instanceof PartnerValidationError) return fail(error.message, 400);
    return fail("ไม่สามารถอัปเดต Serial ได้", 500);
  }
}
