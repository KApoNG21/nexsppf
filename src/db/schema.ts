import { sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const productSeries = sqliteTable("product_series", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  modelCode: text("model_code").notNull(),
  name: text("name").notNull(),
  category: text("category", { enum: ["clear", "matte", "color"] }).notNull(),
  warrantyYears: integer("warranty_years"),
  publicCopy: text("public_copy").notNull().default(""),
  status: text("status", { enum: ["draft", "active", "archived"] }).notNull().default("draft"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("product_series_model_code_uq").on(table.modelCode)]);

export const serials = sqliteTable("serials", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  serialCode: text("serial_code").notNull(),
  modelCode: text("model_code").notNull(),
  batchCode: text("batch_code").notNull(),
  status: text("status", { enum: ["available", "active", "suspended", "invalid"] }).notNull().default("available"),
  importedAt: text("imported_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("serials_serial_code_uq").on(table.serialCode)]);

export const dealers = sqliteTable("dealers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  dealerCode: text("dealer_code").notNull(),
  name: text("name").notNull(),
  province: text("province").notNull(),
  contactName: text("contact_name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  certificationTier: text("certification_tier"),
  status: text("status", { enum: ["pending", "active", "suspended"] }).notNull().default("pending"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("dealers_dealer_code_uq").on(table.dealerCode)]);

export const accountRoles = sqliteTable("account_roles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull(),
  role: text("role", { enum: ["dealer", "admin"] }).notNull(),
  dealerId: integer("dealer_id"),
  status: text("status", { enum: ["active", "suspended"] }).notNull().default("active"),
  isOwner: integer("is_owner", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("account_roles_email_role_uq").on(table.email, table.role)]);

export const accountRolePermissions = sqliteTable("account_role_permissions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  accountRoleId: integer("account_role_id").notNull().references(() => accountRoles.id, { onDelete: "cascade" }),
  permission: text("permission").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("account_role_permissions_role_permission_uq").on(table.accountRoleId, table.permission),
  index("account_role_permissions_role_idx").on(table.accountRoleId),
]);

export const warranties = sqliteTable("warranties", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  serialCode: text("serial_code").notNull(),
  dealerId: integer("dealer_id").notNull(),
  productModelCode: text("product_model_code").notNull(),
  customerName: text("customer_name"),
  customerPhone: text("customer_phone"),
  customerEmail: text("customer_email"),
  vehicleMake: text("vehicle_make"),
  vehicleModel: text("vehicle_model"),
  vehiclePlate: text("vehicle_plate"),
  vehicleYear: integer("vehicle_year"),
  vehicleColor: text("vehicle_color"),
  vehicleVinLast6: text("vehicle_vin_last6"),
  odometerKm: integer("odometer_km"),
  installDate: text("install_date").notNull(),
  expiryDate: text("expiry_date"),
  workOrderRef: text("work_order_ref"),
  installationType: text("installation_type", { enum: ["full_body", "partial", "color_wrap", "custom"] }).notNull().default("full_body"),
  coverageArea: text("coverage_area").notNull().default("ติดตั้งเต็มคัน"),
  installationBranch: text("installation_branch"),
  installerName: text("installer_name"),
  status: text("status", { enum: ["pending_customer", "active", "expired", "under_review", "suspended"] }).notNull().default("pending_customer"),
  customerCompletedAt: text("customer_completed_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("warranties_serial_code_uq").on(table.serialCode)]);

export const maintenanceRecords = sqliteTable("maintenance_records", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  referenceCode: text("reference_code").notNull(),
  warrantyId: integer("warranty_id").notNull(),
  dealerId: integer("dealer_id").notNull(),
  maintenanceDate: text("maintenance_date").notNull(),
  maintenanceType: text("maintenance_type").notNull(),
  performedBy: text("performed_by"),
  resultStatus: text("result_status").notNull(),
  note: text("note"),
  nextRecommendedDate: text("next_recommended_date"),
  piecesCount: integer("pieces_count").notNull().default(0),
  serviceScope: text("service_scope"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("maintenance_records_reference_uq").on(table.referenceCode)]);

export const warrantyServicePlans = sqliteTable("warranty_service_plans", {
  warrantyId: integer("warranty_id").primaryKey(),
  maintenanceIncluded: integer("maintenance_included", { mode: "boolean" }).notNull().default(false),
  maintenanceIntervalMonths: integer("maintenance_interval_months"),
  maintenanceVisitLimit: integer("maintenance_visit_limit"),
  claimIncluded: integer("claim_included", { mode: "boolean" }).notNull().default(false),
  claimPieceLimit: integer("claim_piece_limit"),
  rewrapIncluded: integer("rewrap_included", { mode: "boolean" }).notNull().default(false),
  rewrapPieceLimit: integer("rewrap_piece_limit"),
  planNote: text("plan_note"),
  installationWarrantyTerms: text("installation_warranty_terms"),
  removalWarrantyTerms: text("removal_warranty_terms"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const registrationExceptions = sqliteTable("registration_exceptions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  referenceCode: text("reference_code").notNull(),
  serialCode: text("serial_code").notNull(),
  dealerId: integer("dealer_id").notNull(),
  reasonCode: text("reason_code", { enum: ["serial_not_found", "already_registered", "serial_suspended", "serial_invalid", "serial_not_available", "product_not_found", "product_inactive"] }).notNull(),
  detail: text("detail"),
  status: text("status", { enum: ["pending", "resolved", "rejected"] }).notNull().default("pending"),
  reviewNote: text("review_note"),
  reviewedBy: text("reviewed_by"),
  reviewedAt: text("reviewed_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("registration_exceptions_reference_uq").on(table.referenceCode)]);

export const supportRequests = sqliteTable("support_requests", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  referenceCode: text("reference_code").notNull(),
  serialCode: text("serial_code").notNull(),
  requestType: text("request_type").notNull(),
  contactName: text("contact_name").notNull(),
  contactPhone: text("contact_phone").notNull(),
  detail: text("detail").notNull(),
  status: text("status", { enum: ["under_review", "need_inspection", "more_info_required", "approved", "rejected", "closed"] }).notNull().default("under_review"),
  assignedDealerId: integer("assigned_dealer_id"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("support_requests_reference_uq").on(table.referenceCode)]);

export const inspectionRequests = sqliteTable("inspection_requests", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  referenceCode: text("reference_code").notNull(),
  serialCode: text("serial_code").notNull(),
  contactName: text("contact_name").notNull(),
  contactPhone: text("contact_phone").notNull(),
  detail: text("detail").notNull(),
  status: text("status", { enum: ["under_review", "need_inspection", "more_info_required", "approved", "rejected", "closed"] }).notNull().default("under_review"),
  assignedDealerId: integer("assigned_dealer_id"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("inspection_requests_reference_uq").on(table.referenceCode)]);

export const contactRequests = sqliteTable("contact_requests", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  referenceCode: text("reference_code").notNull(),
  contactName: text("contact_name").notNull(),
  contactPhone: text("contact_phone").notNull(),
  contactEmail: text("contact_email"),
  subject: text("subject").notNull(),
  detail: text("detail").notNull(),
  status: text("status", { enum: ["new", "in_progress", "closed"] }).notNull().default("new"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("contact_requests_reference_uq").on(table.referenceCode)]);

export const mediaAssets = sqliteTable("media_assets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ownerType: text("owner_type", { enum: ["support", "inspection", "warranty", "maintenance"] }).notNull(),
  ownerReference: text("owner_reference").notNull(),
  objectKey: text("object_key").notNull(),
  originalName: text("original_name").notNull(),
  contentType: text("content_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("media_assets_object_key_uq").on(table.objectKey)]);

export const adminPolicies = sqliteTable("admin_policies", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  policyKey: text("policy_key").notNull(),
  draftValue: text("draft_value").notNull(),
  approvedValue: text("approved_value"),
  status: text("status", { enum: ["draft", "approved", "published"] }).notNull().default("draft"),
  updatedBy: text("updated_by").notNull(),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("admin_policies_key_uq").on(table.policyKey)]);

export const auditLogs = sqliteTable("audit_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  actorEmail: text("actor_email").notNull(),
  actorRole: text("actor_role").notNull(),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  detail: text("detail"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const stockWorkspaceState = sqliteTable("stock_workspace_state", {
  workspaceKey: text("workspace_key").primaryKey(),
  version: integer("version").notNull().default(1),
  unitsJson: text("units_json").notNull(),
  activityJson: text("activity_json").notNull(),
  updatedBy: text("updated_by").notNull(),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const stockColorProducts = sqliteTable("stock_color_products", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  skuCode: text("sku_code").notNull(),
  seriesName: text("series_name").notNull(),
  productName: text("product_name").notNull(),
  colorName: text("color_name").notNull(),
  colorCode: text("color_code").notNull().default(""),
  colorHex: text("color_hex").notNull(),
  sizeLabel: text("size_label").notNull(),
  metres: real("metres").notNull(),
  imageObjectKey: text("image_object_key"),
  imageOriginalName: text("image_original_name"),
  imageContentType: text("image_content_type"),
  imageSizeBytes: integer("image_size_bytes"),
  createdBy: text("created_by").notNull(),
  updatedBy: text("updated_by").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("stock_color_products_sku_code_uq").on(table.skuCode),
  index("stock_color_products_updated_at_idx").on(table.updatedAt),
]);

export const publicRequestLimits = sqliteTable("public_request_limits", {
  limitKey: text("limit_key").primaryKey(),
  requestCount: integer("request_count").notNull().default(1),
  windowStartedAt: text("window_started_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
