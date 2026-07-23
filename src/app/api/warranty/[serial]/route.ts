import { findPublicWarranty } from "../../../../db/public-warranty";

export async function GET(_request: Request, context: { params: Promise<{ serial: string }> }) {
  const { serial } = await context.params;
  const normalized = decodeURIComponent(serial).trim().toUpperCase();
  if (!normalized || normalized.length > 64 || !/^[A-Z0-9-]+$/.test(normalized)) {
    return Response.json({ status: "invalid" }, { status: 400 });
  }

  try {
    const record = await findPublicWarranty(normalized);
    return Response.json(record ?? { status: "invalid", serial: normalized }, {
      status: record ? 200 : 404,
      headers: { "cache-control": "public, max-age=60, s-maxage=300" },
    });
  } catch {
    return Response.json({ status: "unavailable" }, { status: 503 });
  }
}
