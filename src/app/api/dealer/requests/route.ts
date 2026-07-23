import { env } from "@/lib/server-env";
import { authorizePartnerRequest, unauthorizedResponse } from "../../../../db/partner-access";
import { enforceSameOrigin, fail, formText, PartnerValidationError, requiredText } from "../../_partner-utils";

const transitions: Record<string, Set<string>> = {
  under_review: new Set(["need_inspection", "more_info_required"]),
  need_inspection: new Set(["under_review", "more_info_required"]),
  more_info_required: new Set(["under_review", "need_inspection"]),
};
type RequestRow = { id: number; status: string };

export async function POST(request: Request) {
  const originFailure = enforceSameOrigin(request);
  if (originFailure) return originFailure;
  const actor = await authorizePartnerRequest(request, "dealer");
  if (!actor?.dealerId) return unauthorizedResponse();
  try {
    const form = await request.formData();
    const kind = formText(form, "kind");
    if (!['support', 'inspection'].includes(kind)) throw new PartnerValidationError("ประเภทคำขอไม่ถูกต้อง");
    const referenceCode = requiredText(form, "referenceCode", "เลขอ้างอิง", 6, 80).toUpperCase();
    const nextStatus = requiredText(form, "status", "สถานะ", 2, 40);
    const note = formText(form, "note").slice(0, 1000);
    const table = kind === "support" ? "support_requests" : "inspection_requests";
    const current = await env.DB.prepare(`SELECT id, status FROM ${table} WHERE reference_code = ? AND assigned_dealer_id = ? LIMIT 1`).bind(referenceCode, actor.dealerId).first<RequestRow>();
    if (!current) return fail("ไม่พบคำขอที่มอบหมายให้ร้านนี้", 404);
    if (!transitions[current.status]?.has(nextStatus)) return fail(`Dealer ไม่สามารถเปลี่ยนสถานะจาก ${current.status} เป็น ${nextStatus}`, 409);
    const results = await env.DB.batch([
      env.DB.prepare(`UPDATE ${table} SET status = ? WHERE id = ? AND assigned_dealer_id = ? AND status = ?`).bind(nextStatus, current.id, actor.dealerId, current.status),
      env.DB.prepare(`INSERT INTO audit_logs (actor_email, actor_role, action, entity_type, entity_id, detail) VALUES (?, 'dealer', ?, ?, ?, ?)`)
        .bind(actor.email, `${kind}.dealer_status_change`, kind, referenceCode, JSON.stringify({ from: current.status, to: nextStatus, dealerId: actor.dealerId, note: note || undefined })),
    ]);
    if (Number(results[0]?.meta?.changes ?? 0) !== 1) return fail("สถานะถูกเปลี่ยนโดยผู้ใช้อื่น กรุณารีเฟรช", 409);
    return Response.json({ ok: true, referenceCode, status: nextStatus });
  } catch (error) {
    if (error instanceof PartnerValidationError) return fail(error.message, 400);
    return fail("ไม่สามารถอัปเดตคำขอได้", 500);
  }
}
