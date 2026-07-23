import { env } from "@/lib/server-env";
import { authorizePartnerRequest, unauthorizedResponse } from "../../../../db/partner-access";
import { enforceSameOrigin, fail, formText, PartnerValidationError, requiredText } from "../../_partner-utils";

type PolicyRow = { id: number; status: "draft" | "approved" | "published"; draft_value: string };

export async function POST(request: Request) {
  const originFailure = enforceSameOrigin(request);
  if (originFailure) return originFailure;
  const actor = await authorizePartnerRequest(request, "admin");
  if (!actor) return unauthorizedResponse();

  try {
    const form = await request.formData();
    const policyKey = requiredText(form, "policyKey", " Policy key", 2, 80).toLowerCase().replace(/[^a-z0-9_-]/g, "-");
    const action = formText(form, "action");
    if (!['save_draft', 'approve', 'publish'].includes(action)) throw new PartnerValidationError("ขั้นตอน Policy ไม่ถูกต้อง");
    const current = await env.DB.prepare("SELECT id, status, draft_value FROM admin_policies WHERE policy_key = ? LIMIT 1").bind(policyKey).first<PolicyRow>();

    if (action === "save_draft") {
      const draftValue = requiredText(form, "draftValue", "ข้อความ Policy", 10, 20000);
      await env.DB.batch([
        env.DB.prepare(`INSERT INTO admin_policies (policy_key, draft_value, approved_value, status, updated_by, updated_at)
          VALUES (?, ?, NULL, 'draft', ?, CURRENT_TIMESTAMP)
          ON CONFLICT(policy_key) DO UPDATE SET draft_value = excluded.draft_value, approved_value = NULL, status = 'draft', updated_by = excluded.updated_by, updated_at = CURRENT_TIMESTAMP`)
          .bind(policyKey, draftValue, actor.email),
        audit(actor.email, "policy.save_draft", policyKey),
      ]);
      return Response.json({ ok: true, policyKey, status: "draft" });
    }
    if (!current) return fail("ไม่พบ Policy draft", 404);
    if (action === "approve") {
      if (current.status !== "draft") return fail("Policy ต้องอยู่ในสถานะ draft ก่อนอนุมัติ", 409);
      await env.DB.batch([
        env.DB.prepare("UPDATE admin_policies SET approved_value = draft_value, status = 'approved', updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'draft'").bind(actor.email, current.id),
        audit(actor.email, "policy.approve", policyKey),
      ]);
      return Response.json({ ok: true, policyKey, status: "approved" });
    }
    if (current.status !== "approved") return fail("Policy ต้องผ่านการอนุมัติก่อนเผยแพร่", 409);
    const publishStatements = [
      env.DB.prepare("UPDATE admin_policies SET status = 'published', updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'approved'").bind(actor.email, current.id),
      audit(actor.email, "policy.publish", policyKey),
    ];
    const productMatch = policyKey.match(/^product-([a-z0-9-]+)-public-copy$/);
    if (productMatch) publishStatements.splice(1, 0, env.DB.prepare("UPDATE product_series SET public_copy = ? WHERE model_code = ?").bind(current.draft_value, productMatch[1].toUpperCase()));
    await env.DB.batch(publishStatements);
    return Response.json({ ok: true, policyKey, status: "published" });
  } catch (error) {
    if (error instanceof PartnerValidationError) return fail(error.message, 400);
    return fail("ไม่สามารถอัปเดต Policy ได้", 500);
  }
}

function audit(email: string, action: string, policyKey: string) {
  return env.DB.prepare(`INSERT INTO audit_logs (actor_email, actor_role, action, entity_type, entity_id, detail) VALUES (?, 'admin', ?, 'policy', ?, NULL)`).bind(email, action, policyKey);
}
