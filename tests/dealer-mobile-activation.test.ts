import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Dealer mobile QR activation UX", () => {
  const dealerUi = readFileSync("src/app/client-ui.tsx", "utf8");
  const scanner = readFileSync("src/app/warranty-client.tsx", "utf8");
  const login = readFileSync("src/app/login/page.tsx", "utf8");
  const loginApi = readFileSync("src/app/api/auth/login/route.ts", "utf8");
  const layout = readFileSync("src/app/layout.tsx", "utf8");
  const validation = readFileSync("src/app/form-validation-assist.tsx", "utf8");
  const styles = readFileSync("src/app/globals.css", "utf8");

  it("supports camera scan, QR photo fallback, and manual serial entry", () => {
    expect(dealerUi).toContain("สแกน QR ด้วยกล้อง");
    expect(dealerUi).toContain("สแกน QR หรือกรอก Serial ใต้ QR");
    expect(dealerUi).toContain("WarrantyScanner");
    expect(dealerUi).toContain("normalizeWarrantySerial");
    expect(scanner).toContain('facingMode: { ideal: "environment" }');
    expect(scanner).toContain('capture="environment"');
    expect(scanner).toContain("เปิดใน Safari/Chrome");
  });

  it("uses browser password management and an optional secure remembered session", () => {
    expect(login).toContain('autoComplete="username"');
    expect(login).toContain('autoComplete="current-password"');
    expect(login).toContain('name="remember_me"');
    expect(loginApi).toContain('form.get("remember_me") === "on"');
    expect(loginApi).toContain("maxAgeSeconds: maxAge");
  });

  it("marks required controls and gives inline validation errors across the app", () => {
    expect(layout).toContain("<FormValidationAssist />");
    expect(validation).toContain('document.addEventListener("invalid"');
    expect(validation).toContain("กรุณากรอกข้อมูลในช่องนี้");
    expect(styles).toContain('content: "*"');
    expect(styles).toContain(".field-validation-error");
    expect(styles).toContain(".field-validation-message");
  });
});
