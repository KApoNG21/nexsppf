import { env } from "@/lib/server-env";
import { authorizeAdminRequest, authorizePartnerRequest } from "../../../../../db/partner-access";

type MediaRow = { id: number; owner_type: string; owner_reference: string; object_key: string; original_name: string; content_type: string };
type OwnershipRow = { allowed: number };

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!/^\d+$/.test(id)) return Response.json({ error: "ไม่พบไฟล์" }, { status: 404 });
  const media = await env.DB.prepare("SELECT id, owner_type, owner_reference, object_key, original_name, content_type FROM media_assets WHERE id = ? LIMIT 1").bind(Number(id)).first<MediaRow>();
  if (!media) return Response.json({ error: "ไม่พบไฟล์" }, { status: 404 });

  const admin = await authorizeAdminRequest(request, "warranty.view");
  let allowed = Boolean(admin);
  if (!allowed) {
    const dealer = await authorizePartnerRequest(request, "dealer");
    if (dealer?.dealerId) allowed = await dealerOwnsMedia(dealer.dealerId, media);
  }
  if (!allowed) return Response.json({ error: "ไม่มีสิทธิ์ดูไฟล์" }, { status: 403 });

  const object = await env.FILES.get(media.object_key);
  if (!object?.body) return Response.json({ error: "ไม่พบไฟล์" }, { status: 404 });
  const safeName = media.original_name.replace(/[\r\n"\\]/g, "_").slice(0, 160) || `nexs-media-${media.id}`;
  return new Response(Uint8Array.from(object.body).buffer, {
    headers: {
      "content-type": object.httpMetadata?.contentType ?? media.content_type,
      "content-disposition": `inline; filename="${safeName}"`,
      "cache-control": "private, no-store, max-age=0",
      "x-content-type-options": "nosniff",
      "content-security-policy": "default-src 'none'; sandbox",
    },
  });
}

async function dealerOwnsMedia(dealerId: number, media: MediaRow): Promise<boolean> {
  let query: string;
  if (media.owner_type === "warranty") query = "SELECT EXISTS(SELECT 1 FROM warranties WHERE serial_code = ? AND dealer_id = ?) AS allowed";
  else if (media.owner_type === "maintenance") query = "SELECT EXISTS(SELECT 1 FROM maintenance_records WHERE reference_code = ? AND dealer_id = ?) AS allowed";
  else if (media.owner_type === "support") query = "SELECT EXISTS(SELECT 1 FROM support_requests WHERE reference_code = ? AND assigned_dealer_id = ?) AS allowed";
  else if (media.owner_type === "inspection") query = "SELECT EXISTS(SELECT 1 FROM inspection_requests WHERE reference_code = ? AND assigned_dealer_id = ?) AS allowed";
  else return false;
  const result = await env.DB.prepare(query).bind(media.owner_reference, dealerId).first<OwnershipRow>();
  return Boolean(result?.allowed);
}
