import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { env } from "@/lib/server-env";
import {
  createSessionToken,
  safeReturnPath,
  SESSION_COOKIE,
  sessionMaxAge,
} from "@/lib/auth-session";
import { enforceSameOrigin, publicRequestUrl } from "../../_partner-utils";
import { resolvePartnerLoginIdentifier } from "@/lib/partner-login";

type AccountRow = {
  email: string;
  display_name: string;
  password_hash: string;
  status: string;
  must_change_password: boolean;
};

export async function POST(request: Request) {
  const originError = enforceSameOrigin(request);
  if (originError) return originError;

  const form = await request.formData();
  const email = resolvePartnerLoginIdentifier(String(form.get("email") ?? ""));
  const password = String(form.get("password") ?? "");
  const requestedReturnTo = String(form.get("return_to") ?? "");
  if (!email || password.length < 8) return redirectWithError(request, requestedReturnTo);
  if (!await allowLoginAttempt(request, email)) return redirectWithError(request, requestedReturnTo);

  const account = await env.DB.prepare(`
    SELECT email, display_name, password_hash, status, must_change_password
    FROM auth_accounts
    WHERE lower(email) = ?
    LIMIT 1
  `).bind(email).first<AccountRow>();

  const valid = account?.status === "active" && await bcrypt.compare(password, account.password_hash);
  if (!valid) return redirectWithError(request, requestedReturnTo);
  await env.DB.prepare("UPDATE auth_accounts SET last_login_at = CURRENT_TIMESTAMP WHERE lower(email) = ?")
    .bind(email)
    .run();
  const intendedReturnTo = requestedReturnTo
    ? safeReturnPath(requestedReturnTo, "/dealer")
    : await defaultPartnerPath(email);
  const returnTo = account.must_change_password
    ? `/change-password?return_to=${encodeURIComponent(intendedReturnTo)}`
    : intendedReturnTo;

  const response = NextResponse.redirect(publicRequestUrl(request, returnTo), 303);
  response.cookies.set({
    name: SESSION_COOKIE,
    value: createSessionToken({ email: account.email, displayName: account.display_name }),
    httpOnly: true,
    secure: isSecureRequest(request),
    sameSite: "lax",
    path: "/",
    maxAge: sessionMaxAge(),
  });
  return response;
}

async function defaultPartnerPath(email: string) {
  const role = await env.DB.prepare(`
    SELECT ar.role
    FROM account_roles ar
    LEFT JOIN dealers d ON d.id = ar.dealer_id
    WHERE lower(ar.email) = ?
      AND ar.status = 'active'
      AND (ar.role = 'admin' OR (ar.role = 'dealer' AND d.status = 'active'))
    ORDER BY CASE WHEN ar.role = 'admin' THEN 0 ELSE 1 END
    LIMIT 1
  `).bind(email).first<{ role: "admin" | "dealer" }>();
  return role?.role === "admin" ? "/admin" : "/dealer";
}

function isSecureRequest(request: Request) {
  const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  return forwardedProtocol === "https" || new URL(request.url).protocol === "https:";
}

async function allowLoginAttempt(request: Request, email: string) {
  const address = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const windowNumber = Math.floor(Date.now() / (15 * 60 * 1000));
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${address}|${email}|${windowNumber}`),
  );
  const limitKey = [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  await env.DB.prepare(`
    INSERT INTO auth_login_limits (limit_key, request_count, window_started_at)
    VALUES (?, 1, CURRENT_TIMESTAMP)
    ON CONFLICT(limit_key) DO UPDATE SET request_count = auth_login_limits.request_count + 1
  `).bind(limitKey).run();
  const row = await env.DB.prepare(
    "SELECT request_count FROM auth_login_limits WHERE limit_key = ? LIMIT 1",
  ).bind(limitKey).first<{ request_count: number }>();
  return Number(row?.request_count ?? 0) <= 10;
}

function redirectWithError(request: Request, returnTo: string) {
  const url = publicRequestUrl(request, "/login");
  url.searchParams.set("error", "invalid");
  if (returnTo) url.searchParams.set("return_to", safeReturnPath(returnTo, "/dealer"));
  return NextResponse.redirect(url, 303);
}
