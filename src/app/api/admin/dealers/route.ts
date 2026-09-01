import bcrypt from "bcryptjs";
import { env } from "@/lib/server-env";
import { authorizeAdminRequest, unauthorizedResponse } from "../../../../db/partner-access";
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
  const actor = await authorizeAdminRequest(request, "dealer.manage");
  if (!actor) return unauthorizedResponse();

  try {
    const form = await request.formData();
    const action = formText(form, "action");
    if (!['create', 'create_with_account', 'set_status', 'assign_account', 'reset_password', 'set_account_status'].includes(action)) {
      throw new PartnerValidationError("การดำเนินการไม่ถูกต้อง");
    }
    const dealerCode = requiredText(form, "dealerCode", " Dealer code", 3, 40).toUpperCase();
    if (!/^[A-Z0-9-]+$/.test(dealerCode)) throw new PartnerValidationError("Dealer code มีรูปแบบไม่ถูกต้อง");

    if (action === "create" || action === "create_with_account") {
      const name = requiredText(form, "name", "ชื่อร้าน", 2, 160);
      const province = requiredText(form, "province", "จังหวัด", 2, 100);
      const contactName = requiredText(form, "contactName", "ผู้ติดต่อ", 2, 120);
      const phone = requiredText(form, "phone", "เบอร์โทรศัพท์", 8, 40);
      const lineId = requiredText(form, "lineId", "LINE ID", 2, 80);
      if (/\s/.test(lineId)) throw new PartnerValidationError("LINE ID ต้องไม่มีช่องว่าง");
      const email = formText(form, "email");
      if (email && !/^\S+@\S+\.\S+$/.test(email)) throw new PartnerValidationError("รูปแบบอีเมลไม่ถูกต้อง");
      const certificationTier = formText(form, "certificationTier").slice(0, 80);
      if (action === "create_with_account") {
        const accountEmail = accountEmailFrom(form);
        const displayName = requiredText(form, "displayName", "ชื่อผู้ใช้งาน", 2, 120);
        const temporaryPassword = passwordFrom(form);
        const passwordHash = await bcrypt.hash(temporaryPassword, 12);
        await env.DB.batch([
          env.DB.prepare(`INSERT INTO dealers (dealer_code, name, province, contact_name, phone, line_id, email, certification_tier, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')`)
            .bind(dealerCode, name, province, contactName, phone, lineId, email || accountEmail, certificationTier || null),
          env.DB.prepare(`INSERT INTO auth_accounts (email, display_name, password_hash, status, must_change_password)
            VALUES (?, ?, ?, 'active', true)`)
            .bind(accountEmail, displayName, passwordHash),
          env.DB.prepare(`INSERT INTO account_roles (email, role, dealer_id, status)
            VALUES (?, 'dealer', (SELECT id FROM dealers WHERE dealer_code = ?), 'active')`)
            .bind(accountEmail, dealerCode),
          audit(actor.email, "dealer.create_with_account", dealerCode, { accountEmail, status: "active", mustChangePassword: true }),
        ]);
        return Response.json({ ok: true, dealerCode, status: "active", accountEmail }, { status: 201 });
      }
      await env.DB.batch([
        env.DB.prepare(`INSERT INTO dealers (dealer_code, name, province, contact_name, phone, line_id, email, certification_tier, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`)
          .bind(dealerCode, name, province, contactName, phone, lineId, email || null, certificationTier || null),
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
    const accountEmail = accountEmailFrom(form);

    if (action === "assign_account") {
      const account = await env.DB.prepare("SELECT email FROM auth_accounts WHERE lower(email) = ? LIMIT 1").bind(accountEmail).first<{ email: string }>();
      if (!account) return fail("ยังไม่มีบัญชีอีเมลนี้ กรุณาเลือกสร้าง Dealer พร้อมบัญชี", 409);
      await env.DB.batch([
        env.DB.prepare(`INSERT INTO account_roles (email, role, dealer_id, status, updated_at) VALUES (?, 'dealer', ?, 'active', CURRENT_TIMESTAMP)
          ON CONFLICT(email, role) DO UPDATE SET dealer_id = excluded.dealer_id, status = 'active', updated_at = CURRENT_TIMESTAMP`).bind(accountEmail, dealer.id),
        audit(actor.email, "dealer.account_assign", dealerCode, { accountEmail }),
      ]);
      return Response.json({ ok: true, dealerCode, status: dealer.status, accountEmail });
    }

    const role = await env.DB.prepare(`SELECT ar.email
      FROM account_roles ar
      INNER JOIN auth_accounts aa ON lower(aa.email) = lower(ar.email)
      WHERE lower(ar.email) = ? AND ar.role = 'dealer' AND ar.dealer_id = ?
      LIMIT 1`).bind(accountEmail, dealer.id).first<{ email: string }>();
    if (!role) return fail("บัญชีนี้ไม่ได้ผูกกับ Dealer ที่ระบุ", 404);

    if (action === "reset_password") {
      const temporaryPassword = passwordFrom(form);
      const passwordHash = await bcrypt.hash(temporaryPassword, 12);
      const results = await env.DB.batch([
        env.DB.prepare(`UPDATE auth_accounts
          SET password_hash = ?, must_change_password = true, password_changed_at = NULL, updated_at = CURRENT_TIMESTAMP
          WHERE lower(email) = ?`)
          .bind(passwordHash, accountEmail),
        audit(actor.email, "dealer.account_password_reset", dealerCode, { accountEmail, mustChangePassword: true }),
      ]);
      if (Number(results[0]?.meta?.changes ?? 0) !== 1) return fail("ไม่พบบัญชีผู้ใช้", 404);
      return Response.json({ ok: true, dealerCode, status: "password-reset", accountEmail });
    }

    const accountStatus = requiredText(form, "accountStatus", "สถานะบัญชี", 2, 20);
    if (!["active", "suspended"].includes(accountStatus)) throw new PartnerValidationError("สถานะบัญชีไม่ถูกต้อง");
    await env.DB.batch([
      env.DB.prepare("UPDATE auth_accounts SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE lower(email) = ?")
        .bind(accountStatus, accountEmail),
      env.DB.prepare("UPDATE account_roles SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE lower(email) = ? AND role = 'dealer' AND dealer_id = ?")
        .bind(accountStatus, accountEmail, dealer.id),
      audit(actor.email, "dealer.account_status_change", dealerCode, { accountEmail, status: accountStatus }),
    ]);
    return Response.json({ ok: true, dealerCode, status: accountStatus, accountEmail });
  } catch (error) {
    if (error instanceof PartnerValidationError) return fail(error.message, 400);
    const message = error instanceof Error ? error.message : "";
    if ((error as { code?: string }).code === "23505" || message.includes("UNIQUE constraint failed")) {
      return fail("Dealer code หรือบัญชีนี้มีอยู่แล้ว", 409);
    }
    return fail("ไม่สามารถจัดการ Dealer ได้", 500);
  }
}

function accountEmailFrom(form: FormData) {
  const accountEmail = requiredText(form, "accountEmail", "อีเมลบัญชี", 5, 254).toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(accountEmail)) throw new PartnerValidationError("รูปแบบอีเมลบัญชีไม่ถูกต้อง");
  return accountEmail;
}

function passwordFrom(form: FormData) {
  const password = String(form.get("temporaryPassword") ?? "");
  if (password.length < 8 || password.length > 128 || !/[A-Za-zก-๙]/.test(password) || !/\d/.test(password)) {
    throw new PartnerValidationError("รหัสผ่านชั่วคราวต้องมีอย่างน้อย 8 ตัว และมีตัวอักษรกับตัวเลข");
  }
  return password;
}

function audit(email: string, action: string, dealerCode: string, detail: Record<string, unknown>) {
  return env.DB.prepare(`INSERT INTO audit_logs (actor_email, actor_role, action, entity_type, entity_id, detail) VALUES (?, 'admin', ?, 'dealer', ?, ?)`)
    .bind(email, action, dealerCode, JSON.stringify(detail));
}
