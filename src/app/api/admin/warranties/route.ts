import { env } from "@/lib/server-env";
import { authorizeAdminRequest, unauthorizedResponse } from "../../../../db/partner-access";
import { enforceSameOrigin, fail, formText, PartnerValidationError, requiredText } from "../../_partner-utils";

const transitions: Record<string, Set<string>> = {
  active: new Set(["under_review", "suspended", "expired"]),
  under_review: new Set(["active", "suspended", "expired"]),
  suspended: new Set(["under_review", "active", "expired"]),
  expired: new Set(["under_review"]),
};
type WarrantyRow = { id: number; status: string };

export async function POST(request: Request) {
  const originFailure = enforceSameOrigin(request);
  if (originFailure) return originFailure;
  const actor = await authorizeAdminRequest(request, "warranty.manage");
  if (!actor) return unauthorizedResponse();
  try {
    const form = await request.formData();
    const serialCode = requiredText(form, "serialCode", " Serial Number", 6, 64).toUpperCase().replace(/\s+/g, "");
    if (!/^[A-Z0-9-]+$/.test(serialCode)) throw new PartnerValidationError("Serial Number มีรูปแบบไม่ถูกต้อง");
    const nextStatus = requiredText(form, "status", "สถานะ", 2, 30);
    const note = formText(form, "note").slice(0, 1000);
    const current = await env.DB.prepare("SELECT id, status FROM warranties WHERE serial_code = ? LIMIT 1").bind(serialCode).first<WarrantyRow>();
    if (!current) return fail("ไม่พบบัตรรับประกัน", 404);
    if (!transitions[current.status]?.has(nextStatus)) return fail(`ไม่สามารถเปลี่ยนสถานะจาก ${current.status} เป็น ${nextStatus}`, 409);
    const serialStatus = nextStatus === "suspended" ? "suspended" : "active";
    const results = await env.DB.batch([
      env.DB.prepare("UPDATE warranties SET status = ? WHERE id = ? AND status = ?").bind(nextStatus, current.id, current.status),
      env.DB.prepare("UPDATE serials SET status = ? WHERE serial_code = ? AND status IN ('active','suspended')").bind(serialStatus, serialCode),
      env.DB.prepare(`INSERT INTO audit_logs (actor_email, actor_role, action, entity_type, entity_id, detail) VALUES (?, 'admin', 'warranty.status_change', 'warranty', ?, ?)`)
        .bind(actor.email, serialCode, JSON.stringify({ from: current.status, to: nextStatus, note: note || undefined })),
    ]);
    if (Number(results[0]?.meta?.changes ?? 0) !== 1) return fail("สถานะถูกเปลี่ยนโดยผู้ใช้อื่น กรุณารีเฟรช", 409);
    return Response.json({ ok: true, serialCode, status: nextStatus });
  } catch (error) {
    if (error instanceof PartnerValidationError) return fail(error.message, 400);
    return fail("ไม่สามารถอัปเดตบัตรรับประกันได้", 500);
  }
}
