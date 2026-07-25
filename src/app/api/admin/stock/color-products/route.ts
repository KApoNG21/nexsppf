import sharp from "sharp";
import { authorizeAdminRequest, unauthorizedResponse } from "@/db/partner-access";
import { env } from "@/lib/server-env";
import { enforceSameOrigin, fail } from "../../../_partner-utils";

const MAX_FILE_BYTES = 8 * 1024 * 1024;
const acceptedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

type ColorProductRow = {
  id: number;
  sku_code: string;
  series_name: string;
  product_name: string;
  color_name: string;
  color_code: string;
  color_hex: string;
  size_label: string;
  metres: string | number;
  image_object_key: string | null;
  updated_at: Date | string;
};

export async function GET(request: Request) {
  const actor = await authorizeAdminRequest(request, "stock.view");
  if (!actor) return unauthorizedResponse();

  const result = await env.DB.pool.query<ColorProductRow>(`
    SELECT id, sku_code, series_name, product_name, color_name, color_code,
           color_hex, size_label, metres, image_object_key, updated_at
    FROM stock_color_products
    ORDER BY lower(series_name), lower(color_name), id
  `);

  return Response.json(
    { ok: true, products: result.rows.map(toColorProduct) },
    { headers: { "cache-control": "private, no-store" } },
  );
}

export async function POST(request: Request) {
  const originFailure = enforceSameOrigin(request);
  if (originFailure) return originFailure;
  const actor = await authorizeAdminRequest(request, "stock.receive");
  if (!actor) return unauthorizedResponse();

  let uploadedKey: string | null = null;
  try {
    const form = await request.formData();
    const seriesName = formText(form, "seriesName", "ชื่อรุ่น", 2, 100);
    const colorName = formText(form, "colorName", "ชื่อสี", 2, 100);
    const colorCode = optionalText(form, "colorCode", 50).toUpperCase();
    const skuCode = normalizeSku(optionalText(form, "skuCode", 50) || `CLR-${randomCode()}`);
    const colorHex = normalizeHex(optionalText(form, "colorHex", 20) || "#73777F");
    const sizeLabel = formText(form, "sizeLabel", "ขนาด", 2, 80);
    const metres = Number(form.get("metres"));
    if (!Number.isFinite(metres) || metres <= 0 || metres > 10000) {
      throw new ColorProductValidationError("จำนวนเมตรต่อม้วนไม่ถูกต้อง");
    }

    const productName = `${seriesName} · ${colorName}`;
    const photoValue = form.get("photo");
    const photo = photoValue instanceof File && photoValue.size > 0 ? photoValue : null;
    if (photo && (!acceptedTypes.has(photo.type) || photo.size > MAX_FILE_BYTES)) {
      throw new ColorProductValidationError("รูปต้องเป็น JPG, PNG หรือ WEBP และมีขนาดไม่เกิน 8 MB");
    }

    const existing = await env.DB.pool.query<{ image_object_key: string | null }>(
      "SELECT image_object_key FROM stock_color_products WHERE sku_code = $1 LIMIT 1",
      [skuCode],
    );
    const previousImageKey = existing.rows[0]?.image_object_key ?? null;

    let imageOriginalName: string | null = null;
    let imageContentType: string | null = null;
    let imageSizeBytes: number | null = null;
    if (photo) {
      const input = Buffer.from(await photo.arrayBuffer());
      const compressed = await sharp(input)
        .rotate()
        .resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();
      uploadedKey = `stock/color-products/${skuCode.toLowerCase()}-${crypto.randomUUID()}.webp`;
      await env.FILES.put(uploadedKey, compressed, {
        httpMetadata: { contentType: "image/webp" },
        customMetadata: { skuCode, colorName, uploadedBy: actor.email },
      });
      imageOriginalName = photo.name.slice(0, 160);
      imageContentType = "image/webp";
      imageSizeBytes = compressed.byteLength;
    }

    const client = await env.DB.pool.connect();
    let row: ColorProductRow;
    try {
      await client.query("BEGIN");
      const result = await client.query<ColorProductRow>(
        `INSERT INTO stock_color_products
          (sku_code, series_name, product_name, color_name, color_code, color_hex,
           size_label, metres, image_object_key, image_original_name, image_content_type,
           image_size_bytes, created_by, updated_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $13)
         ON CONFLICT (sku_code) DO UPDATE SET
           series_name = EXCLUDED.series_name,
           product_name = EXCLUDED.product_name,
           color_name = EXCLUDED.color_name,
           color_code = EXCLUDED.color_code,
           color_hex = EXCLUDED.color_hex,
           size_label = EXCLUDED.size_label,
           metres = EXCLUDED.metres,
           image_object_key = COALESCE(EXCLUDED.image_object_key, stock_color_products.image_object_key),
           image_original_name = COALESCE(EXCLUDED.image_original_name, stock_color_products.image_original_name),
           image_content_type = COALESCE(EXCLUDED.image_content_type, stock_color_products.image_content_type),
           image_size_bytes = COALESCE(EXCLUDED.image_size_bytes, stock_color_products.image_size_bytes),
           updated_by = EXCLUDED.updated_by,
           updated_at = CURRENT_TIMESTAMP
         RETURNING id, sku_code, series_name, product_name, color_name, color_code,
                   color_hex, size_label, metres, image_object_key, updated_at`,
        [
          skuCode,
          seriesName,
          productName,
          colorName,
          colorCode,
          colorHex,
          sizeLabel,
          Math.round(metres * 1000) / 1000,
          uploadedKey,
          imageOriginalName,
          imageContentType,
          imageSizeBytes,
          actor.email,
        ],
      );
      row = result.rows[0];
      await client.query(
        `INSERT INTO audit_logs
          (actor_email, actor_role, action, entity_type, entity_id, detail)
         VALUES ($1, 'admin', 'stock.color_product.upsert', 'stock_color_product', $2, $3)`,
        [actor.email, skuCode, JSON.stringify({
          productName,
          colorName,
          colorCode,
          hasImage: Boolean(row.image_object_key),
        })],
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }

    if (uploadedKey && previousImageKey && previousImageKey !== uploadedKey) {
      await env.FILES.delete(previousImageKey).catch(() => undefined);
    }

    return Response.json(
      { ok: true, product: toColorProduct(row) },
      { status: existing.rows[0] ? 200 : 201, headers: { "cache-control": "private, no-store" } },
    );
  } catch (error) {
    if (uploadedKey) await env.FILES.delete(uploadedKey).catch(() => undefined);
    if (error instanceof ColorProductValidationError) return fail(error.message, 400);
    if ((error as { code?: string }).code === "23505") return fail("รหัส SKU นี้มีอยู่แล้ว", 409);
    console.error("stock color product save failed", error);
    return fail("ไม่สามารถบันทึกข้อมูลฟิล์มสีได้", 500);
  }
}

function toColorProduct(row: ColorProductRow) {
  return {
    id: Number(row.id),
    skuCode: row.sku_code,
    seriesName: row.series_name,
    productName: row.product_name,
    colorName: row.color_name,
    colorCode: row.color_code,
    colorHex: row.color_hex,
    sizeLabel: row.size_label,
    metres: Number(row.metres),
    hasImage: Boolean(row.image_object_key),
    imageUrl: row.image_object_key ? `/api/admin/stock/color-products/${row.id}/image` : null,
    updatedAt: row.updated_at,
  };
}

class ColorProductValidationError extends Error {}

function formText(form: FormData, key: string, label: string, min: number, max: number) {
  const value = optionalText(form, key, max);
  if (value.length < min) throw new ColorProductValidationError(`กรุณากรอก${label}`);
  return value;
}

function optionalText(form: FormData, key: string, max: number) {
  const value = String(form.get(key) ?? "").trim();
  if (value.length > max) throw new ColorProductValidationError(`ข้อมูล ${key} ยาวเกินไป`);
  return value;
}

function normalizeSku(value: string) {
  const sku = value.trim().toUpperCase().replaceAll(" ", "-");
  if (!/^[A-Z0-9][A-Z0-9._-]{1,49}$/.test(sku)) {
    throw new ColorProductValidationError("SKU ใช้ได้เฉพาะตัวอักษรอังกฤษ ตัวเลข จุด ขีดกลาง และขีดล่าง");
  }
  return sku;
}

function normalizeHex(value: string) {
  const color = value.trim().toUpperCase();
  if (!/^#[0-9A-F]{6}$/.test(color)) throw new ColorProductValidationError("ค่าสีตัวอย่างไม่ถูกต้อง");
  return color;
}

function randomCode() {
  return [...crypto.getRandomValues(new Uint8Array(4))]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}
