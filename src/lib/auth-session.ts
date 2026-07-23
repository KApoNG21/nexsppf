import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

export const SESSION_COOKIE = "nexs_partner_session";
const SESSION_SECONDS = 60 * 60 * 12;

export type PartnerSession = {
  email: string;
  displayName: string;
  issuedAt: number;
  expiresAt: number;
};

export function createSessionToken(input: { email: string; displayName: string }) {
  const now = Math.floor(Date.now() / 1000);
  const payload: PartnerSession = {
    email: input.email.trim().toLowerCase(),
    displayName: input.displayName.trim() || input.email.trim().toLowerCase(),
    issuedAt: now,
    expiresAt: now + SESSION_SECONDS,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

export function readSessionToken(token: string | undefined | null): PartnerSession | null {
  if (!token) return null;
  const [encodedPayload, signature, extra] = token.split(".");
  if (!encodedPayload || !signature || extra) return null;
  const expected = sign(encodedPayload);
  const actualBytes = Buffer.from(signature);
  const expectedBytes = Buffer.from(expected);
  if (actualBytes.length !== expectedBytes.length || !timingSafeEqual(actualBytes, expectedBytes)) return null;

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as PartnerSession;
    if (
      typeof payload.email !== "string" ||
      typeof payload.displayName !== "string" ||
      !Number.isInteger(payload.issuedAt) ||
      !Number.isInteger(payload.expiresAt) ||
      payload.expiresAt <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function sessionFromRequest(request: Request | NextRequest) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const token = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE}=`))
    ?.slice(SESSION_COOKIE.length + 1);
  return readSessionToken(token ? decodeURIComponent(token) : null);
}

export function sessionMaxAge() {
  return SESSION_SECONDS;
}

export function safeReturnPath(value: string | null | undefined, fallback = "/dealer") {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;
  try {
    const url = new URL(value, "https://nexs.local");
    if (url.origin !== "https://nexs.local") return fallback;
    if (url.pathname.startsWith("/api/auth/")) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

function sign(payload: string) {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET must contain at least 32 characters");
  }
  return createHmac("sha256", secret).update(payload).digest("base64url");
}
