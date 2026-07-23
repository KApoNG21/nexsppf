import bcrypt from "bcryptjs";
import { env } from "@/lib/server-env";
import { safeReturnPath, sessionFromRequest } from "@/lib/auth-session";
import { enforceSameOrigin, fail } from "../../_partner-utils";

type AccountRow = {
  email: string;
  password_hash: string;
  status: string;
  role: "admin" | "dealer" | null;
};

export async function POST(request: Request) {
  const originFailure = enforceSameOrigin(request);
  if (originFailure) return originFailure;

  const session = sessionFromRequest(request);
  if (!session) return fail("กรุณาเข้าสู่ระบบใหม่", 401);

  const form = await request.formData();
  const currentPassword = String(form.get("currentPassword") ?? "");
  const newPassword = String(form.get("newPassword") ?? "");
  const confirmPassword = String(form.get("confirmPassword") ?? "");
  const returnTo = safeReturnPath(String(form.get("returnTo") ?? ""), "/dealer");

  if (!isStrongPassword(newPassword)) {
    return fail("รหัสผ่านใหม่ต้องมีอย่างน้อย 12 ตัว และมีตัวอักษรกับตัวเลข", 400);
  }
  if (newPassword !== confirmPassword) return fail("ยืนยันรหัสผ่านใหม่ไม่ตรงกัน", 400);
  if (currentPassword === newPassword) return fail("รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านเดิม", 400);

  const account = await env.DB.prepare(`
    SELECT aa.email, aa.password_hash, aa.status,
      (SELECT ar.role FROM account_roles ar WHERE lower(ar.email) = lower(aa.email) AND ar.status = 'active' ORDER BY CASE WHEN ar.role = 'admin' THEN 0 ELSE 1 END LIMIT 1) AS role
    FROM auth_accounts aa
    WHERE lower(aa.email) = ?
    LIMIT 1
  `).bind(session.email).first<AccountRow>();

  if (!account || account.status !== "active" || !await bcrypt.compare(currentPassword, account.password_hash)) {
    return fail("รหัสผ่านปัจจุบันไม่ถูกต้อง", 403);
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await env.DB.batch([
    env.DB.prepare(`UPDATE auth_accounts
      SET password_hash = ?, must_change_password = false, password_changed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE lower(email) = ? AND status = 'active'`)
      .bind(passwordHash, session.email),
    env.DB.prepare(`INSERT INTO audit_logs (actor_email, actor_role, action, entity_type, entity_id, detail)
      VALUES (?, ?, 'account.password_change', 'account', ?, ?)`)
      .bind(session.email, account.role ?? "dealer", session.email, JSON.stringify({ forcedChangeCompleted: true })),
  ]);

  return Response.json({ ok: true, returnTo });
}

function isStrongPassword(value: string) {
  return value.length >= 12 && value.length <= 128 && /[A-Za-zก-๙]/.test(value) && /\d/.test(value);
}
