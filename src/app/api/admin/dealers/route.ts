import { env } from "@/lib/server-env";
import { authorizePartnerRequest, unauthorizedResponse } from "../../../../db/partner-access";
import { enforceSameOrigin, fail, formText, PartnerValidationError, requiredText } from "../../_partner-utils";

type DealerRow = { id: number; status: string };
const dealerTransitions: Record<string, Set<string>> = {
  pending: new Set(["active", "suspended"]),
  active: new Set(["suspended"]),
  suspended: new Set(["active"]),
};

export async function POST(request: Request) {
  const originFailure = enforceSameOrigin(request);
  if (originFailure) return originFailure;
  const actor = await authorizePartnerRequest(request, "admin");
  if (!actor) return unauthorizedResponse();

  try {
    const form = await request.formData();
    const action = formText(form, "action");
    if (!['create', 'set_status', 'assign_account'].includes(action)) throw new PartnerValidationError("การดำเนินการไม่ถูกต้อง");
    const dealerCode = requiredText(form, "dealerCode", " Dealer code", 3, 40).toUpperCase();
    if (!/^[A-Z0-9-]+$/.test(dealerCode)) throw new PartnerValidationError("Dealer code มีรูปแบบไม่ถูกต้อง");

    if (action === "create") {
      const name = requiredText(form, "name", "ชื่อร้าน", 2, 160);
      const province = requiredText(form, "province", "จังหวัด", 2, 100);
      const contactName = requiredText(form, "contactName", "ผู้ติดต่อ", 2, 120);
      const phone = requiredText(form, "phone", "เบอร์โทรศัพท์", 8, 40);
      const email = formText(form, "email");
      if (email && !/^\S+@\S+\.\S+$/.test(email)) throw new PartnerValidationError("รูปแบบอีเมลไม่ถูกต้อง");
      const certificationTier = formText(form, "certificationTier").slice(0, 80);
      await env.DB.batch([
        env.DB.prepare(`INSERT INTO dealers (dealer_code, name, province, contact_name, phone, email, certification_tier, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`)
          .bind(dealerCode, name, province, contactName, phone, email || null, certificationTier || null),
        audit(actor.email, "dealer.create", dealerCode, { status: "pending" }),
      ]);
      return Response.json({ ok: true, dealerCode, status: "pending" }, { status: 201 });
    }

    const dealer = await env.DB.prepare("SELECT id, status FROM dealers WHERE dealer_code = ? LIMIT 1").bind(dealerCode).first<DealerRow>();
    if (!dealer) return fail("ไม่พบ Dealer", 404);
    if (action === "set_status") {
      const nextStatus = requiredText(form, "status", "สถานะ", 2, 20);
      if (!dealerTransitions[dealer.status]?.has(nextStatus)) return fail(`ไม่สามารถเปลี่ยนสถานะจาก ${dealer.status} เป็น ${nextStatus}`, 409);
      const results = await env.DB.batch([
        env.DB.prepare("UPDATE dealers SET status = ? WHERE id = ? AND status = ?").bind(nextStatus, dealer.id, dealer.status),
        audit(actor.email, "dealer.status_change", dealerCode, { from: dealer.status, to: nextStatus }),
      ]);
      if (Number(results[0]?.meta?.changes ?? 0) !== 1) return fail("สถานะถูกเปลี่ยนโดยผู้ใช้อื่น กรุณารีเฟรช", 409);
      return Response.json({ ok: true, dealerCode, status: nextStatus });
    }

    if (dealer.status !== "active") return fail("ต้องเปิดใช้งาน Dealer ก่อนผูกบัญชี", 409);
    const accountEmail = requiredText(form, "accountEmail", "อีเมลบัญชี", 5, 254).toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(accountEmail)) throw new PartnerValidationError("รูปแบบอีเมลบัญชีไม่ถูกต้อง");
    await env.DB.batch([
      env.DB.prepare(`INSERT INTO account_roles (email, role, dealer_id, status, updated_at) VALUES (?, 'dealer', ?, 'active', CURRENT_TIMESTAMP)
        ON CONFLICT(email, role) DO UPDATE SET dealer_id = excluded.dealer_id, status = 'active', updated_at = CURRENT_TIMESTAMP`).bind(accountEmail, dealer.id),
      audit(actor.email, "dealer.account_assign", dealerCode, { accountEmail }),
    ]);
    return Response.json({ ok: true, dealerCode, status: dealer.status });
  } catch (error) {
    if (error instanceof PartnerValidationError) return fail(error.message, 400);
    const message = error instanceof Error ? error.message : "";
    if (message.includes("UNIQUE constraint failed")) return fail("Dealer code หรือบัญชีนี้มีอยู่แล้ว", 409);
    return fail("ไม่สามารถจัดการ Dealer ได้", 500);
  }
}

function audit(email: string, action: string, dealerCode: string, detail: Record<string, unknown>) {
  return env.DB.prepare(`INSERT INTO audit_logs (actor_email, actor_role, action, entity_type, entity_id, detail) VALUES (?, 'admin', ?, 'dealer', ?, ?)`)
    .bind(email, action, dealerCode, JSON.stringify(detail));
}
