export class PartnerValidationError extends Error {}

export function enforceSameOrigin(request: Request): Response | null {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && !["same-origin", "same-site", "none"].includes(fetchSite)) return fail("คำขอไม่ได้มาจากเว็บไซต์ NEXS", 403);
  if (!origin || !host) return fail("ไม่สามารถยืนยันต้นทางของคำขอได้", 403);
  try {
    if (new URL(origin).host !== host) return fail("คำขอไม่ได้มาจากเว็บไซต์ NEXS", 403);
  } catch {
    return fail("ต้นทางของคำขอไม่ถูกต้อง", 403);
  }
  return null;
}

export function publicRequestUrl(request: Request, path: string): URL {
  const configuredBase = process.env.NEXT_PUBLIC_BASE_URL;
  if (configuredBase) {
    try {
      return new URL(path, configuredBase);
    } catch {
      // Fall through to the request headers when the optional base URL is malformed.
    }
  }
  const protocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim()
    || new URL(request.url).protocol.replace(":", "");
  const host = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim()
    || request.headers.get("host")
    || new URL(request.url).host;
  return new URL(path, `${protocol}://${host}`);
}

export function formText(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export function requiredText(form: FormData, key: string, label: string, min = 1, max = 200): string {
  const value = formText(form, key);
  if (value.length < min || value.length > max) throw new PartnerValidationError(`กรุณาตรวจสอบ${label}`);
  return value;
}

export function normalizeSerial(value: string): string {
  const serial = value.toUpperCase().replace(/\s+/g, "");
  if (serial.length < 6 || serial.length > 64 || !/^[A-Z0-9-]+$/.test(serial)) throw new PartnerValidationError("Serial Number มีรูปแบบไม่ถูกต้อง");
  return serial;
}

export function validIsoDate(value: string, label: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(new Date(`${value}T12:00:00Z`).getTime())) throw new PartnerValidationError(`กรุณาตรวจสอบ${label}`);
  return value;
}

export function fail(error: string, status: number) {
  return Response.json({ ok: false, error }, { status });
}
