import { env } from "@/lib/server-env";
import { authorizePartnerRequest, unauthorizedResponse } from "../../../../db/partner-access";
import { enforceSameOrigin, fail, formText, PartnerValidationError, requiredText } from "../../_partner-utils";

export async function POST(request: Request) {
  const originFailure = enforceSameOrigin(request);
  if (originFailure) return originFailure;
  const actor = await authorizePartnerRequest(request, "dealer");
  if (!actor?.dealerId) return unauthorizedResponse();
  try {
    const form = await request.formData();
    const contactName = requiredText(form, "contactName", "ชื่อผู้ติดต่อ", 2, 120);
    const phone = requiredText(form, "phone", "เบอร์โทรศัพท์", 8, 40);
    const email = formText(form, "email");
    if (email && !/^\S+@\S+\.\S+$/.test(email)) throw new PartnerValidationError("รูปแบบอีเมลไม่ถูกต้อง");
    const results = await env.DB.batch([
      env.DB.prepare("UPDATE dealers SET contact_name = ?, phone = ?, email = ? WHERE id = ? AND status = 'active'").bind(contactName, phone, email || null, actor.dealerId),
      env.DB.prepare(`INSERT INTO audit_logs (actor_email, actor_role, action, entity_type, entity_id, detail) VALUES (?, 'dealer', 'dealer.profile_update', 'dealer', ?, NULL)`).bind(actor.email, String(actor.dealerId)),
    ]);
    if (Number(results[0]?.meta?.changes ?? 0) !== 1) return fail("ไม่สามารถอัปเดต Dealer ที่ไม่ได้เปิดใช้งาน", 409);
    return Response.json({ ok: true, dealerId: actor.dealerId });
  } catch (error) {
    if (error instanceof PartnerValidationError) return fail(error.message, 400);
    return fail("ไม่สามารถบันทึกข้อมูลร้านได้", 500);
  }
}
