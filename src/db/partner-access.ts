import { env } from "@/lib/server-env";
import { sessionFromRequest } from "@/lib/auth-session";
import { ALL_ADMIN_PERMISSIONS, parseAdminPermissions, type AdminPermission } from "./admin-permissions";

export type PartnerRole = "dealer" | "admin";

export type PartnerAccess = {
  email: string;
  displayName: string;
  role: PartnerRole;
  dealerId: number | null;
  dealerName: string | null;
  mustChangePassword: boolean;
  isOwner: boolean;
  permissions: AdminPermission[];
};

type AccessRow = {
  email: string;
  role: PartnerRole;
  dealer_id: number | null;
  account_status: string;
  role_status: string;
  dealer_name: string | null;
  dealer_status: string | null;
  must_change_password: boolean;
  is_owner: boolean;
  permission_list: string | null;
};

export async function findPartnerAccess(email: string, requiredRole: PartnerRole): Promise<PartnerAccess | null> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return null;

  const row = await env.DB.prepare(`
    SELECT
      ar.email,
      ar.role,
      ar.dealer_id,
      aa.status AS account_status,
      aa.must_change_password,
      ar.status AS role_status,
      d.name AS dealer_name,
      d.status AS dealer_status,
      ar.is_owner,
      string_agg(arp.permission, ',') AS permission_list
    FROM account_roles ar
    JOIN auth_accounts aa ON lower(aa.email) = lower(ar.email)
    LEFT JOIN dealers d ON d.id = ar.dealer_id
    LEFT JOIN account_role_permissions arp ON arp.account_role_id = ar.id
    WHERE lower(ar.email) = ? AND ar.role = ?
    GROUP BY ar.id, ar.email, ar.role, ar.dealer_id, aa.status, aa.must_change_password,
      ar.status, d.name, d.status, ar.is_owner
    LIMIT 1
  `).bind(normalizedEmail, requiredRole).first<AccessRow>();

  if (!row || row.account_status !== "active" || row.role_status !== "active") return null;
  if (requiredRole === "dealer" && (!row.dealer_id || row.dealer_status !== "active")) return null;
  const isOwner = requiredRole === "admin" && Boolean(row.is_owner);

  return {
    email: normalizedEmail,
    displayName: normalizedEmail,
    role: requiredRole,
    dealerId: row.dealer_id,
    dealerName: row.dealer_name,
    mustChangePassword: Boolean(row.must_change_password),
    isOwner,
    permissions: requiredRole === "admin" ? (isOwner ? ALL_ADMIN_PERMISSIONS : parseAdminPermissions(row.permission_list)) : [],
  };
}

export async function authorizePartnerRequest(request: Request, requiredRole: PartnerRole): Promise<PartnerAccess | null> {
  const session = sessionFromRequest(request);
  if (!session) return null;
  const access = await findPartnerAccess(session.email, requiredRole);
  return access && !access.mustChangePassword ? { ...access, displayName: session.displayName } : null;
}

export function hasAdminPermission(access: PartnerAccess, permission: AdminPermission): boolean {
  return access.role === "admin" && (access.isOwner || access.permissions.includes(permission));
}

export async function authorizeAdminRequest(request: Request, permission: AdminPermission): Promise<PartnerAccess | null> {
  const access = await authorizePartnerRequest(request, "admin");
  return access && hasAdminPermission(access, permission) ? access : null;
}

export function unauthorizedResponse() {
  return Response.json({ ok: false, error: "ไม่มีสิทธิ์ดำเนินการ" }, { status: 403 });
}
