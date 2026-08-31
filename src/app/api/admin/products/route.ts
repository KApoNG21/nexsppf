import { env } from "@/lib/server-env";
import { authorizeAdminRequest, unauthorizedResponse } from "../../../../db/partner-access";
import { enforceSameOrigin, fail, formText, PartnerValidationError, requiredText } from "../../_partner-utils";

type ProductRow = { id: number; status: string };
const productTransitions: Record<string, Set<string>> = {
  draft: new Set(["active", "archived"]),
  active: new Set(["archived"]),
  archived: new Set(["draft"]),
};

export async function POST(request: Request) {
  const originFailure = enforceSameOrigin(request);
  if (originFailure) return originFailure;
  const actor = await authorizeAdminRequest(request, "catalog.manage");
  if (!actor) return unauthorizedResponse();
  try {
    const form = await request.formData();
    const action = formText(form, "action");
    if (!['create', 'set_status'].includes(action)) throw new PartnerValidationError("การดำเนินการไม่ถูกต้อง");
    const modelCode = requiredText(form, "modelCode", " Model code", 2, 40).toUpperCase();
    if (!/^[A-Z0-9-]+$/.test(modelCode)) throw new PartnerValidationError("Model code มีรูปแบบไม่ถูกต้อง");
    if (action === "create") {
      const name = requiredText(form, "name", "ชื่อผลิตภัณฑ์", 2, 120);
      const category = requiredText(form, "category", "หมวดผลิตภัณฑ์", 2, 20);
      if (!['clear', 'matte', 'color'].includes(category)) throw new PartnerValidationError("หมวดผลิตภัณฑ์ไม่ถูกต้อง");
      const warrantyRaw = formText(form, "warrantyYears");
      const warrantyYears = warrantyRaw ? Number(warrantyRaw) : null;
      if (warrantyYears !== null && (!Number.isInteger(warrantyYears) || warrantyYears < 1 || warrantyYears > 20)) throw new PartnerValidationError("จำนวนปีรับประกันไม่ถูกต้อง");
      await env.DB.batch([
        env.DB.prepare("INSERT INTO product_series (model_code, name, category, warranty_years, public_copy, status) VALUES (?, ?, ?, ?, '', 'draft')").bind(modelCode, name, category, warrantyYears),
        audit(actor.email, "product.create", modelCode, { category, warrantyYears, status: "draft" }),
      ]);
      return Response.json({ ok: true, modelCode, status: "draft" }, { status: 201 });
    }
    const product = await env.DB.prepare("SELECT id, status FROM product_series WHERE model_code = ? LIMIT 1").bind(modelCode).first<ProductRow>();
    if (!product) return fail("ไม่พบผลิตภัณฑ์", 404);
    const nextStatus = requiredText(form, "status", "สถานะ", 2, 20);
    if (!productTransitions[product.status]?.has(nextStatus)) return fail(`ไม่สามารถเปลี่ยนสถานะจาก ${product.status} เป็น ${nextStatus}`, 409);
    if (nextStatus === "active") {
      const publishedPolicy = await env.DB.prepare("SELECT 1 AS ok FROM admin_policies WHERE policy_key = ? AND status = 'published' LIMIT 1").bind(`product-${modelCode.toLowerCase()}-public-copy`).first();
      if (!publishedPolicy) return fail("ต้องเผยแพร่ Product public-copy Policy ก่อนเปิดใช้งานผลิตภัณฑ์", 409);
    }
    const results = await env.DB.batch([
      env.DB.prepare("UPDATE product_series SET status = ? WHERE id = ? AND status = ?").bind(nextStatus, product.id, product.status),
      audit(actor.email, "product.status_change", modelCode, { from: product.status, to: nextStatus }),
    ]);
    if (Number(results[0]?.meta?.changes ?? 0) !== 1) return fail("สถานะถูกเปลี่ยนโดยผู้ใช้อื่น กรุณารีเฟรช", 409);
    return Response.json({ ok: true, modelCode, status: nextStatus });
  } catch (error) {
    if (error instanceof PartnerValidationError) return fail(error.message, 400);
    const message = error instanceof Error ? error.message : "";
    if (message.includes("UNIQUE constraint failed")) return fail("Model code นี้มีอยู่แล้ว", 409);
    return fail("ไม่สามารถจัดการผลิตภัณฑ์ได้", 500);
  }
}

function audit(email: string, action: string, modelCode: string, detail: Record<string, unknown>) {
  return env.DB.prepare(`INSERT INTO audit_logs (actor_email, actor_role, action, entity_type, entity_id, detail) VALUES (?, 'admin', ?, 'product', ?, ?)`)
    .bind(email, action, modelCode, JSON.stringify(detail));
}
