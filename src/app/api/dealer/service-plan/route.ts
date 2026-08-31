import { env } from "@/lib/server-env";
import { parseServicePlan, validateServicePlanUpdate, type ServiceUsage } from "@/lib/after-sales";
import { authorizePartnerRequest, unauthorizedResponse } from "../../../../db/partner-access";
import { enforceSameOrigin, fail, normalizeSerial, PartnerValidationError, requiredText } from "../../_partner-utils";

type OwnedPlan = ServiceUsage & {
  warrantyId: number;
};

export async function POST(request: Request) {
  const originFailure = enforceSameOrigin(request);
  if (originFailure) return originFailure;
  const actor = await authorizePartnerRequest(request, "dealer");
  if (!actor?.dealerId) return unauthorizedResponse();

  try {
    const form = await request.formData();
    const serialCode = normalizeSerial(requiredText(form, "serialCode", " Serial Number", 6, 64));
    let plan;
    try {
      plan = parseServicePlan(form);
    } catch (error) {
      throw new PartnerValidationError(error instanceof Error ? error.message : "กรุณาตรวจสอบสิทธิ์บริการ");
    }

    const current = await env.DB.prepare(`
      SELECT w.id AS "warrantyId",
        (SELECT COUNT(*) FROM maintenance_records m WHERE m.warranty_id = w.id AND m.maintenance_type = 'maintenance') AS "maintenanceUsed",
        (SELECT COALESCE(SUM(m.pieces_count), 0) FROM maintenance_records m WHERE m.warranty_id = w.id AND m.maintenance_type = 'claim') AS "claimUsed",
        (SELECT COALESCE(SUM(m.pieces_count), 0) FROM maintenance_records m WHERE m.warranty_id = w.id AND m.maintenance_type = 'rewrap') AS "rewrapUsed"
      FROM warranties w
      JOIN warranty_service_plans p ON p.warranty_id = w.id
      WHERE w.serial_code = ? AND w.dealer_id = ?
      LIMIT 1
    `).bind(serialCode, actor.dealerId).first<OwnedPlan>();
    if (!current) return fail("ไม่พบบัตรรับประกันหรือสิทธิ์บริการของร้านนี้", 404);

    try {
      validateServicePlanUpdate(plan, {
        maintenanceUsed: Number(current.maintenanceUsed),
        claimUsed: Number(current.claimUsed),
        rewrapUsed: Number(current.rewrapUsed),
      });
    } catch (error) {
      throw new PartnerValidationError(error instanceof Error ? error.message : "สิทธิ์ใหม่ขัดกับประวัติการใช้สิทธิ์");
    }

    const results = await env.DB.batch([
      env.DB.prepare(`
        UPDATE warranty_service_plans
        SET maintenance_included = ?, maintenance_interval_months = ?, maintenance_visit_limit = ?,
          claim_included = ?, claim_piece_limit = ?, rewrap_included = ?, rewrap_piece_limit = ?,
          plan_note = ?, installation_warranty_terms = ?, removal_warranty_terms = ?,
          next_recommended_date_override = ?::date, updated_at = CURRENT_TIMESTAMP
        WHERE warranty_id = ?
      `).bind(
        plan.maintenanceIncluded, plan.maintenanceIntervalMonths, plan.maintenanceVisitLimit,
        plan.claimIncluded, plan.claimPieceLimit, plan.rewrapIncluded, plan.rewrapPieceLimit,
        plan.planNote, plan.installationWarrantyTerms, plan.removalWarrantyTerms,
        plan.nextRecommendedDateOverride, current.warrantyId,
      ),
      env.DB.prepare(`
        INSERT INTO audit_logs (actor_email, actor_role, action, entity_type, entity_id, detail)
        VALUES (?, 'dealer', 'warranty.service_plan.update', 'warranty', ?, ?)
      `).bind(actor.email, serialCode, JSON.stringify({
        dealerId: actor.dealerId,
        maintenanceIncluded: plan.maintenanceIncluded,
        maintenanceIntervalMonths: plan.maintenanceIntervalMonths,
        maintenanceVisitLimit: plan.maintenanceVisitLimit,
        claimIncluded: plan.claimIncluded,
        claimPieceLimit: plan.claimPieceLimit,
        rewrapIncluded: plan.rewrapIncluded,
        rewrapPieceLimit: plan.rewrapPieceLimit,
        nextRecommendedDateOverride: plan.nextRecommendedDateOverride,
        installationWarrantyTermsProvided: Boolean(plan.installationWarrantyTerms),
        removalWarrantyTermsProvided: Boolean(plan.removalWarrantyTerms),
      })),
    ]);
    if (Number(results[0]?.meta?.changes ?? 0) !== 1) return fail("ไม่สามารถอัปเดตสิทธิ์บริการได้", 409);
    return Response.json({ ok: true, serialCode, status: "updated" });
  } catch (error) {
    if (error instanceof PartnerValidationError) return fail(error.message, 400);
    return fail("ไม่สามารถบันทึกสิทธิ์บริการได้", 500);
  }
}
