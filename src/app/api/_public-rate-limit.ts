import { env } from "@/lib/server-env";

const WINDOW_SECONDS = 10 * 60;
const MAX_REQUESTS_PER_WINDOW = 12;

type LimitRow = { request_count: number };

export async function enforcePublicRequestRateLimit(request: Request): Promise<Response | null> {
  const clientAddress = request.headers.get("cf-connecting-ip")
    ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? "unknown";
  const windowNumber = Math.floor(Date.now() / (WINDOW_SECONDS * 1000));
  const limitKey = await sha256(`${clientAddress}|public-request|${windowNumber}`);

  await env.DB.prepare(`
    INSERT INTO public_request_limits (limit_key, request_count, window_started_at)
    VALUES (?, 1, CURRENT_TIMESTAMP)
    ON CONFLICT(limit_key) DO UPDATE SET request_count = public_request_limits.request_count + 1
  `).bind(limitKey).run();
  const row = await env.DB.prepare(
    "SELECT request_count FROM public_request_limits WHERE limit_key = ? LIMIT 1",
  ).bind(limitKey).first<LimitRow>();

  if (Math.random() < 0.02) {
    await env.DB.prepare(
      "DELETE FROM public_request_limits WHERE window_started_at < datetime('now', '-1 day')",
    ).run();
  }

  if (Number(row?.request_count ?? 0) <= MAX_REQUESTS_PER_WINDOW) return null;
  return Response.json(
    { ok: false, error: "ส่งคำขอถี่เกินไป กรุณารอประมาณ 10 นาทีแล้วลองใหม่" },
    { status: 429, headers: { "retry-after": String(WINDOW_SECONDS) } },
  );
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
