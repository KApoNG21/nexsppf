import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function read(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

describe("stock color-film workflow", () => {
  it("creates a reusable color catalog with private product images", () => {
    const migration = read("migrations/postgres/0006_stock_color_film_catalog.sql");
    const route = read("src/app/api/admin/stock/color-products/route.ts");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS stock_color_products");
    expect(migration).toContain("image_object_key text");
    expect(route).toContain('authorizeAdminRequest(request, "stock.receive")');
    expect(route).toContain("sharp(input)");
    expect(route).toContain("env.FILES.put");
    expect(route).toContain("stock.color_product.upsert");
  });

  it("serves color photos only to stock users", () => {
    const imageRoute = read("src/app/api/admin/stock/color-products/[id]/image/route.ts");
    expect(imageRoute).toContain('authorizeAdminRequest(request, "stock.view")');
    expect(imageRoute).toContain("env.FILES.get");
    expect(imageRoute).toContain('"cache-control": "private, max-age=300"');
  });

  it("shows color photos during receiving, inventory, issuing, and unit review", () => {
    const workspace = read("src/app/stock/stock-workspace.tsx");
    expect(workspace).toContain(">ฟิล์มสี<");
    expect(workspace).toContain("ถ่ายรูป / เลือกรูป");
    expect(workspace).toContain("ColorFilmVisual");
    expect(workspace).toContain('productKind: "color" as const');
    expect(workspace).toContain("colorProductId");
    expect(workspace).toContain("รูปและสีที่พนักงานจะเห็น");
  });

  it("validates color metadata when the stock snapshot is saved", () => {
    const stockRoute = read("src/app/api/admin/stock/route.ts");
    expect(stockRoute).toContain('type ProductKind = "standard" | "color"');
    expect(stockRoute).toContain("safeColorHex");
    expect(stockRoute).toContain("colorProductId");
    expect(stockRoute).toContain("colorName");
  });
});
