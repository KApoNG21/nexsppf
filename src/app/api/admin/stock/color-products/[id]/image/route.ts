import { authorizeAdminRequest, unauthorizedResponse } from "@/db/partner-access";
import { env } from "@/lib/server-env";

type ImageRow = {
  image_object_key: string;
  image_content_type: string | null;
};

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const actor = await authorizeAdminRequest(request, "stock.view");
  if (!actor) return unauthorizedResponse();

  const { id } = await context.params;
  const productId = Number(id);
  if (!Number.isInteger(productId) || productId < 1) {
    return Response.json({ error: "รหัสรูปไม่ถูกต้อง" }, { status: 400 });
  }

  const product = await env.DB.prepare(`
    SELECT image_object_key, image_content_type
    FROM stock_color_products
    WHERE id = ? AND image_object_key IS NOT NULL
    LIMIT 1
  `).bind(productId).first<ImageRow>();
  if (!product) return Response.json({ error: "ไม่พบรูปสินค้า" }, { status: 404 });

  const object = await env.FILES.get(product.image_object_key);
  if (!object) return Response.json({ error: "ไม่พบไฟล์รูปสินค้า" }, { status: 404 });

  return new Response(Uint8Array.from(object.body).buffer, {
    headers: {
      "content-type": object.httpMetadata?.contentType ?? product.image_content_type ?? "image/webp",
      "cache-control": "private, max-age=300",
      "content-disposition": "inline",
      "x-content-type-options": "nosniff",
    },
  });
}
