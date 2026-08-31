import { env } from "@/lib/server-env";
import { authorizeAdminRequest, unauthorizedResponse } from "../../../../db/partner-access";
import { enforceSameOrigin, fail, formText, PartnerValidationError, requiredText } from "../../_partner-utils";

const transitions: Record<string, Set<string>> = {
  under_review: new Set(["need_inspection", "more_info_required", "approved", "rejected", "closed"]),
  need_inspection: new Set(["under_review", "more_info_required", "approved", "rejected", "closed"]),
  more_info_required: new Set(["under_review", "need_inspection", "rejected", "closed"]),
  approved: new Set(["closed"]),
  rejected: new Set(["closed"]),
  closed: new Set(),
};

type RequestRow = { id: number; status: string; assigned_dealer_id: number | null };
type DealerRow = { id: number; status: string };

export async function POST(request: Request) {
  const originFailure = enforceSameOrigin(request);
  if (originFailure) return originFailure;
  const actor = await authorizeAdminRequest(request, "requests.manage");
  if (!actor) return unauthorizedResponse();

  try {
    const form = await request.formData();
    const kind = formText(form, "kind");
    if (!['support', 'inspection'].includes(kind)) throw new PartnerValidationError("ประเภทคำขอไม่ถูกต้อง");
    const referenceCode = requiredText(form, "referenceCode", "เลขอ้างอิง", 6, 80).toUpperCase();
    const nextStatus = requiredText(form, "status", "สถานะ", 2, 40);
    const dealerCode = formText(form, "dealerCode").toUpperCase();
    const note = formText(form, "note").slice(0, 1000);
    const table = kind === "support" ? "support_requests" : "inspection_requests";
    const current = await env.DB.prepare(`SELECT id, status, assigned_dealer_id FROM ${table} WHERE reference_code = ? LIMIT 1`).bind(referenceCode).first<RequestRow>();
    if (!current) return fail("ไม่พบคำขอ", 404);
    if (!transitions[current.status]?.has(nextStatus)) return fail(`ไม่สามารถเปลี่ยนสถานะจาก ${current.status} เป็น ${nextStatus}`, 409);

    let dealerId = current.assigned_dealer_id;
    if (dealerCode) {
      const dealer = await env.DB.prepare("SELECT id, status FROM dealers WHERE dealer_code = ? LIMIT 1").bind(dealerCode).first<DealerRow>();
      if (!dealer || dealer.status !== "active") return fail("ไม่พบ Dealer ที่เปิดใช้งาน", 400);
      dealerId = dealer.id;
    }
    if (nextStatus === "need_inspection" && !dealerId) return fail("ต้องมอบหมาย Dealer ก่อนเปลี่ยนเป็น need_inspection", 409);

    const results = await env.DB.batch([
      env.DB.prepare(`UPDATE ${table} SET status = ?, assigned_dealer_id = ? WHERE id = ? AND status = ?`).bind(nextStatus, dealerId, current.id, current.status),
      env.DB.prepare(`INSERT INTO audit_logs (actor_email, actor_role, action, entity_type, entity_id, detail) VALUES (?, 'admin', ?, ?, ?, ?)`)
        .bind(actor.email, `${kind}.status_change`, kind, referenceCode, JSON.stringify({ from: current.status, to: nextStatus, dealerId, note: note || undefined })),
    ]);
    if (Number(results[0]?.meta?.changes ?? 0) !== 1) return fail("สถานะถูกเปลี่ยนโดยผู้ใช้อื่น กรุณารีเฟรชและลองใหม่", 409);
    return Response.json({ ok: true, referenceCode, status: nextStatus, dealerId });
  } catch (error) {
    if (error instanceof PartnerValidationError) return fail(error.message, 400);
    return fail("ไม่สามารถอัปเดตคำขอได้", 500);
  }
}
