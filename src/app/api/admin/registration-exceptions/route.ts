import { env } from "@/lib/server-env";
import { authorizePartnerRequest, unauthorizedResponse } from "../../../../db/partner-access";
import { enforceSameOrigin, fail, formText, PartnerValidationError, requiredText } from "../../_partner-utils";

type ExceptionRow = { id: number; status: string; serial_code: string; dealer_id: number };

export async function POST(request: Request) {
  const originFailure = enforceSameOrigin(request);
  if (originFailure) return originFailure;
  const actor = await authorizePartnerRequest(request, "admin");
  if (!actor) return unauthorizedResponse();

  try {
    const form = await request.formData();
    const referenceCode = requiredText(form, "referenceCode", "เลขอ้างอิง", 8, 40).toUpperCase();
    const status = requiredText(form, "status", "สถานะ", 5, 20);
    if (!['resolved', 'rejected'].includes(status)) throw new PartnerValidationError("สถานะการตรวจสอบไม่ถูกต้อง");
    const reviewNote = formText(form, "reviewNote").slice(0, 2000);
    if (reviewNote.length < 3) throw new PartnerValidationError("กรุณาระบุผลการตรวจสอบ");

    const current = await env.DB.prepare("SELECT id, status, serial_code, dealer_id FROM registration_exceptions WHERE reference_code = ? LIMIT 1").bind(referenceCode).first<ExceptionRow>();
    if (!current) return fail("ไม่พบรายการ Registration Exception", 404);
    if (current.status !== "pending") return fail("รายการนี้ผ่านการตรวจสอบแล้ว", 409);

    const results = await env.DB.batch([
      env.DB.prepare(`
        UPDATE registration_exceptions
        SET status = ?, review_note = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP
        WHERE id = ? AND status = 'pending'
      `).bind(status, reviewNote, actor.email, current.id),
      env.DB.prepare(`
        INSERT INTO audit_logs (actor_email, actor_role, action, entity_type, entity_id, detail)
        VALUES (?, 'admin', 'warranty.registration_exception.review', 'registration_exception', ?, ?)
      `).bind(actor.email, referenceCode, JSON.stringify({ status, serialCode: current.serial_code, dealerId: current.dealer_id, reviewNote })),
    ]);
    if (Number(results[0]?.meta?.changes ?? 0) !== 1) return fail("สถานะรายการเปลี่ยนไปแล้ว กรุณาโหลดหน้าใหม่", 409);
    return Response.json({ ok: true, referenceCode, status });
  } catch (error) {
    if (error instanceof PartnerValidationError) return fail(error.message, 400);
    return fail("ไม่สามารถบันทึกผล Registration Exception ได้", 500);
  }
}
