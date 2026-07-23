import { env } from "@/lib/server-env";
import { enforceSameOrigin } from "../_partner-utils";
import { enforcePublicRequestRateLimit } from "../_public-rate-limit";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_FILES = 3;
const MAX_REQUEST_BYTES = 18 * 1024 * 1024;
const acceptedTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

type RequestKind = "contact" | "support" | "inspection";

export async function POST(request: Request) {
  const originFailure = enforceSameOrigin(request);
  if (originFailure) return originFailure;
  try {
    const rateLimitFailure = await enforcePublicRequestRateLimit(request);
    if (rateLimitFailure) return rateLimitFailure;
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > MAX_REQUEST_BYTES) return fail("ไฟล์แนบมีขนาดรวมเกินกำหนด", 413);
    const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
    if (!contentType.includes("multipart/form-data") && !contentType.includes("application/x-www-form-urlencoded")) {
      return fail("รูปแบบข้อมูลคำขอไม่ถูกต้อง", 415);
    }

    const form = await request.formData();
    const kind = text(form, "kind") as RequestKind;
    if (!(["contact", "support", "inspection"] as string[]).includes(kind)) return fail("ประเภทคำขอไม่ถูกต้อง", 400);

    // A filled honeypot is treated as accepted so automated spam gets no useful signal.
    if (text(form, "company")) return Response.json({ ok: true, referenceCode: "RECEIVED" });
    if (text(form, "consent") !== "on") return fail("กรุณายืนยันความยินยอมก่อนส่งข้อมูล", 400);

    const contactName = required(form, "contactName", "กรุณากรอกชื่อผู้ติดต่อ", 2, 120);
    const contactPhone = required(form, "contactPhone", "กรุณากรอกเบอร์โทรศัพท์", 8, 40);
    const detail = required(form, "detail", "กรุณากรอกรายละเอียด", 5, 3000);
    const referenceCode = createReference(kind);
    const uploadedKeys: string[] = [];

    try {
      if (kind === "contact") {
        const subject = required(form, "subject", "กรุณาเลือกหัวข้อ", 2, 120);
        const email = text(form, "contactEmail");
        if (email && !/^\S+@\S+\.\S+$/.test(email)) return fail("รูปแบบอีเมลไม่ถูกต้อง", 400);

        await env.DB.prepare(`
          INSERT INTO contact_requests
            (reference_code, contact_name, contact_phone, contact_email, subject, detail, status)
          VALUES (?, ?, ?, ?, ?, ?, 'new')
        `).bind(referenceCode, contactName, contactPhone, email || null, subject, detail).run();
      } else {
        const serialCode = normalizeSerial(required(form, "serialCode", "กรุณากรอก Serial Number", 6, 64));
        const requestType = required(form, "requestType", "กรุณาเลือกประเภทคำขอ", 2, 120);
        const photos = form.getAll("photos").filter((value): value is File => value instanceof File && value.size > 0);
        if (photos.length > MAX_FILES) return fail(`แนบภาพได้ไม่เกิน ${MAX_FILES} ไฟล์`, 400);
        for (const photo of photos) {
          if (!acceptedTypes.has(photo.type)) return fail("รองรับไฟล์ JPG, PNG และ WEBP เท่านั้น", 400);
          if (photo.size > MAX_FILE_BYTES) return fail("ภาพแต่ละไฟล์ต้องมีขนาดไม่เกิน 5 MB", 400);
        }

        for (const photo of photos) {
          const extension = acceptedTypes.get(photo.type)!;
          const objectKey = `requests/${kind}/${referenceCode}/${crypto.randomUUID()}.${extension}`;
          await env.FILES.put(objectKey, photo.stream(), {
            httpMetadata: { contentType: photo.type },
            customMetadata: { referenceCode, originalName: photo.name.slice(0, 160) },
          });
          uploadedKeys.push(objectKey);
        }

        if (kind === "support") {
          await env.DB.prepare(`
            INSERT INTO support_requests
              (reference_code, serial_code, request_type, contact_name, contact_phone, detail, status)
            VALUES (?, ?, ?, ?, ?, ?, 'under_review')
          `).bind(referenceCode, serialCode, requestType, contactName, contactPhone, detail).run();
        } else {
          await env.DB.prepare(`
            INSERT INTO inspection_requests
              (reference_code, serial_code, contact_name, contact_phone, detail, status)
            VALUES (?, ?, ?, ?, ?, 'under_review')
          `).bind(referenceCode, serialCode, contactName, contactPhone, detail).run();
        }

        if (photos.length) {
          await env.DB.batch(photos.map((photo, index) => env.DB.prepare(`
            INSERT INTO media_assets
              (owner_type, owner_reference, object_key, original_name, content_type, size_bytes)
            VALUES (?, ?, ?, ?, ?, ?)
          `).bind(kind, referenceCode, uploadedKeys[index], photo.name.slice(0, 160), photo.type, photo.size)));
        }
      }
    } catch (error) {
      await Promise.allSettled(uploadedKeys.map((key) => env.FILES.delete(key)));
      throw error;
    }

    return Response.json({ ok: true, referenceCode }, { status: 201 });
  } catch (error) {
    if (error instanceof RequestValidationError) return fail(error.message, 400);
    const message = error instanceof Error ? error.message : "Unexpected error";
    if (message.includes("no such table")) return fail("ระบบรับคำขอกำลังปรับปรุง กรุณาลองใหม่อีกครั้ง", 503);
    return fail("ไม่สามารถส่งคำขอได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง", 500);
  }
}

function text(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function required(form: FormData, key: string, message: string, min: number, max: number): string {
  const value = text(form, key);
  if (value.length < min || value.length > max) throw new RequestValidationError(message);
  return value;
}

function normalizeSerial(value: string): string {
  const serial = value.toUpperCase().replace(/\s+/g, "");
  if (!/^[A-Z0-9-]+$/.test(serial)) throw new RequestValidationError("Serial Number มีรูปแบบไม่ถูกต้อง");
  return serial;
}

function createReference(kind: RequestKind): string {
  const prefix = kind === "contact" ? "CNT" : kind === "support" ? "SUP" : "INS";
  const parts = new Intl.DateTimeFormat("en", { year: "2-digit", month: "2-digit", day: "2-digit", timeZone: "Asia/Bangkok" }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const bytes = crypto.getRandomValues(new Uint8Array(2));
  const suffix = ((bytes[0] << 8 | bytes[1]) % 10000).toString().padStart(4, "0");
  return `${prefix}-${values.year}${values.month}${values.day}-${suffix}`;
}

function fail(error: string, status: number) {
  return Response.json({ ok: false, error }, { status });
}

class RequestValidationError extends Error {}
