import { NextResponse } from "next/server";
import { safeReturnPath, SESSION_COOKIE } from "@/lib/auth-session";
import { publicRequestUrl } from "../../_partner-utils";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const returnTo = safeReturnPath(url.searchParams.get("return_to"), "/");
  const response = NextResponse.redirect(publicRequestUrl(request, returnTo), 303);
  response.cookies.set({
    name: SESSION_COOKIE,
    value: "",
    httpOnly: true,
    secure: request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() === "https"
      || new URL(request.url).protocol === "https:",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
