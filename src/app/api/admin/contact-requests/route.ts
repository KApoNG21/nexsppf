import { env } from "@/lib/server-env";
import { authorizePartnerRequest, unauthorizedResponse } from "../../../../db/partner-access";
import { enforceSameOrigin, fail, formText, PartnerValidationError, requiredText } from "../../_partner-utils";

const transitions: Record<string, Set<string>> = {
  new: new Set(["in_progress", "closed"]),
  in_progress: new Set(["new", "closed"]),
  closed: new Set(["in_progress"]),
};

type ContactRequestRow = { id: number; status: string };

export async function POST(request: Request) {
  const originFailure = enforceSameOrigin(request);
  if (originFailure) return originFailure;
  const actor = await authorizePartnerRequest(request, "admin");
  if (!actor) return unauthorizedResponse();

  try {
    const form = await request.formData();
    const referenceCode = requiredText(form, "referenceCode", "เลขอ้างอิง", 6, 80).toUpperCase();
    const nextStatus = requiredText(form, "status", "สถานะ", 2, 30);
    const note = formText(form, "note").slice(0, 1000);
    const current = await env.DB.prepare(
      "SELECT id, status FROM contact_requests WHERE reference_code = ? LIMIT 1",
    ).bind(referenceCode).first<ContactRequestRow>();
    if (!current) return fail("ไม่พบคำขอติดต่อ", 404);
    if (!transitions[current.status]?.has(nextStatus)) {
      return fail(`ไม่สามารถเปลี่ยนสถานะจาก ${current.status} เป็น ${nextStatus}`, 409);
    }

    const results = await env.DB.batch([
      env.DB.prepare(
        "UPDATE contact_requests SET status = ? WHERE id = ? AND status = ?",
      ).bind(nextStatus, current.id, current.status),
      env.DB.prepare(`
        INSERT INTO audit_logs
          (actor_email, actor_role, action, entity_type, entity_id, detail)
        VALUES (?, 'admin', 'contact.status_change', 'contact_request', ?, ?)
      `).bind(
        actor.email,
        referenceCode,
        JSON.stringify({ from: current.status, to: nextStatus, note: note || undefined }),
      ),
    ]);
    if (Number(results[0]?.meta?.changes ?? 0) !== 1) {
      return fail("สถานะถูกเปลี่ยนโดยผู้ใช้อื่น กรุณารีเฟรช", 409);
    }
    return Response.json({ ok: true, referenceCode, status: nextStatus });
  } catch (error) {
    if (error instanceof PartnerValidationError) return fail(error.message, 400);
    return fail("ไม่สามารถอัปเดตคำขอติดต่อได้", 500);
  }
}
