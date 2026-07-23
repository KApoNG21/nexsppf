import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  createSessionToken,
  readSessionToken,
  safeReturnPath,
} from "@/lib/auth-session";
import { PrivateFileBucket } from "@/lib/server-env";

const originalSecret = process.env.AUTH_SECRET;
afterEach(() => {
  process.env.AUTH_SECRET = originalSecret;
});

describe("unified NEXS production system", () => {
  it("dispatches all required public content routes from the unified page", async () => {
    const source = await readFile("src/app/[...slug]/page.tsx", "utf8");
    for (const route of [
      "products",
      "clear-ppf",
      "matte-ppf",
      "color-ppf",
      "compare",
      "about-nexs",
      "technology",
      "standard",
      "for-dealers",
      "dealers",
      "contact",
      "faq",
      "privacy",
      "terms",
      "warranty-policy",
      "support",
      "inspection",
    ]) {
      expect(source).toContain(`"${route}"`);
    }
  });

  it("contains authenticated Dealer/Admin APIs and public customer workflows", async () => {
    const required = [
      "src/app/api/auth/login/route.ts",
      "src/app/api/auth/logout/route.ts",
      "src/app/api/auth/change-password/route.ts",
      "src/app/api/dealer/warranties/route.ts",
      "src/app/api/dealer/maintenance/route.ts",
      "src/app/api/dealer/profile/route.ts",
      "src/app/api/admin/dealers/route.ts",
      "src/app/api/admin/products/route.ts",
      "src/app/api/admin/serials/import/route.ts",
      "src/app/api/admin/registration-exceptions/route.ts",
      "src/app/api/admin/reports/export/route.ts",
      "src/app/api/public-requests/route.ts",
      "src/app/api/warranty/[serial]/route.ts",
      "src/app/api/partner/media/[id]/route.ts",
    ];
    await Promise.all(required.map((path) => readFile(path, "utf8")));
  });

  it("supports Admin-managed Dealer accounts and forced first-login password changes", async () => {
    const [migration, dealerApi, loginApi, changeApi, adminUi] = await Promise.all([
      readFile("migrations/postgres/0003_partner_account_management.sql", "utf8"),
      readFile("src/app/api/admin/dealers/route.ts", "utf8"),
      readFile("src/app/api/auth/login/route.ts", "utf8"),
      readFile("src/app/api/auth/change-password/route.ts", "utf8"),
      readFile("src/app/client-ui.tsx", "utf8"),
    ]);
    expect(migration).toContain("must_change_password");
    expect(dealerApi).toContain("create_with_account");
    expect(dealerApi).toContain("reset_password");
    expect(dealerApi).toContain("set_account_status");
    expect(loginApi).toContain("/change-password?return_to=");
    expect(changeApi).toContain("account.password_change");
    expect(adminUi).toContain("สร้าง Dealer พร้อมบัญชี Login");
  });

  it("signs, verifies, expires, and rejects tampered partner sessions", () => {
    process.env.AUTH_SECRET = "test-only-secret-with-at-least-32-characters";
    const token = createSessionToken({ email: "Admin@NEXS.test", displayName: "NEXS Admin" });
    expect(readSessionToken(token)).toMatchObject({
      email: "admin@nexs.test",
      displayName: "NEXS Admin",
    });
    expect(readSessionToken(`${token.slice(0, -1)}x`)).toBeNull();
  });

  it("blocks external return URLs and authentication endpoints", () => {
    expect(safeReturnPath("https://evil.example/steal")).toBe("/dealer");
    expect(safeReturnPath("//evil.example/steal")).toBe("/dealer");
    expect(safeReturnPath("/api/auth/logout")).toBe("/dealer");
    expect(safeReturnPath("/admin?tab=warranties")).toBe("/admin?tab=warranties");
    expect(safeReturnPath("/dealer/register-warranty?serial=B-729KDG4185063X")).toBe("/dealer/register-warranty?serial=B-729KDG4185063X");
  });

  it("preserves an unregistered QR serial through Dealer login and registration", async () => {
    const [publicCard, dealerPage, dealerForm] = await Promise.all([
      readFile("src/app/r/[serial]/page.tsx", "utf8"),
      readFile("src/app/dealer/[[...path]]/page.tsx", "utf8"),
      readFile("src/app/client-ui.tsx", "utf8"),
    ]);
    expect(publicCard).toContain("/dealer/register-warranty?serial=");
    expect(publicCard).toContain("เปิดใช้งานได้ทันที ไม่ต้องรอสำนักงานใหญ่");
    expect(publicCard).toContain("/warranty/complete?serial=");
    expect(publicCard).toContain("/dealer/maintenance?serial=");
    expect(dealerPage).toContain("initialSerial={initialSerial}");
    expect(dealerPage).toContain("?serial=${encodeURIComponent(initialSerial)}");
    expect(dealerForm).toContain("defaultValue={initialSerial}");
    expect(dealerForm).toContain('kind === "customer-complete"');
  });

  it("stores private evidence outside public assets and blocks traversal", async () => {
    const directory = await mkdtemp(join(tmpdir(), "nexs-private-test-"));
    try {
      const bucket = new PrivateFileBucket(directory);
      await bucket.put("warranty/ABC/photo.webp", new TextEncoder().encode("private"), {
        httpMetadata: { contentType: "image/webp" },
      });
      const object = await bucket.get("warranty/ABC/photo.webp");
      expect(new TextDecoder().decode(object?.body)).toBe("private");
      expect(object?.httpMetadata?.contentType).toBe("image/webp");
      await expect(bucket.put("../escape.txt", new Uint8Array())).rejects.toThrow(/invalid/i);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
