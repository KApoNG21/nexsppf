import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function read(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

describe("production stock workspace", () => {
  it("mounts inside Admin with persisted storage and permission-scoped views", () => {
    const adminPage = read("src/app/admin/[[...path]]/page.tsx");
    expect(adminPage).toContain("<StockWorkspace adminMode persisted");
    expect(adminPage).toContain('stockPath = path?.[1] ?? ""');
    expect(adminPage).toContain("STOCK_VIEW_PERMISSIONS");
    expect(adminPage).toContain("hasAdminPermission");
  });

  it("persists stock in PostgreSQL with optimistic locking and an audit record", () => {
    const route = read("src/app/api/admin/stock/route.ts");
    expect(route).toContain("stock_workspace_state");
    expect(route).toContain("WHERE workspace_key = $1 AND version = $5");
    expect(route).toContain("RETURNING version");
    expect(route).toContain("stock.workspace_sync");
    expect(route).toContain('authorizeAdminRequest(request, "stock.view")');
  });

  it("migrates current Admin accounts as owners and creates the stock store", () => {
    const migration = read("migrations/postgres/0005_admin_permissions_and_stock.sql");
    expect(migration).toContain("SET is_owner = true");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS account_role_permissions");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS stock_workspace_state");
    expect(migration).toContain("units_json jsonb NOT NULL");
  });

  it("keeps the supplied opening balance at 80 rolls and bundles the Thai font", () => {
    const workspace = read("src/app/stock/stock-workspace.tsx");
    const quantities = [...workspace.matchAll(/quantity:\s*(\d+)/g)].map((match) => Number(match[1]));
    expect(quantities.reduce((sum, value) => sum + value, 0)).toBe(80);
    expect(workspace).toContain("ตั้งยอดสต๊อกเริ่มต้น 80 ม้วน");
    expect(read("src/app/layout.tsx")).toContain('@fontsource-variable/noto-sans-thai');
  });
});
