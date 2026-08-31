import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { normalizeWarrantySerial } from "../src/app/warranty-client";

describe("customer warranty QR normalization", () => {
  it.each([
    ["p-th-000124", "P-TH-000124"],
    ["  P-TH-000124  ", "P-TH-000124"],
    ["https://nexsppf.com/r/P-TH-000124", "P-TH-000124"],
    ["https://nexsppf.com/warranty?serial=p-th-000124", "P-TH-000124"],
    ["https://nexsppf.com/warranty?code=P-TH-000124", "P-TH-000124"],
  ])("reads %s", (input, expected) => {
    expect(normalizeWarrantySerial(input)).toBe(expected);
  });
});

describe("customer warranty safety and UX contracts", () => {
  const client = readFileSync("src/app/warranty-client.tsx", "utf8");
  const publicCard = readFileSync("src/app/r/[serial]/page.tsx", "utf8");
  const route = readFileSync("src/app/api/warranty/complete/route.ts", "utf8");

  it("offers camera, photo fallback, manual entry, and LINE guidance", () => {
    expect(client).toContain("สแกน QR ด้วยกล้อง");
    expect(client).toContain("ถ่ายรูป QR เพื่อสแกน");
    expect(client).toContain("กรอก Serial เอง");
    expect(client).toContain("เปิดใน Safari/Chrome");
  });

  it("checks eligibility before collecting personal data", () => {
    expect(client).toContain("กำลังตรวจสอบ Serial");
    expect(client).toContain('result.status === "profile-required"');
    expect(client).toContain("ไม่ต้องกรอกข้อมูลซ้ำ");
  });

  it("separates customer actions from dealer-only actions", () => {
    expect(publicCard).toContain("สำหรับศูนย์ติดตั้งเท่านั้น");
    expect(publicCard).toContain("ติดต่อศูนย์ติดตั้ง / NEXS");
    expect(publicCard).not.toContain("ลูกค้า: กรอกข้อมูลให้สมบูรณ์");
  });

  it("validates phone and vehicle data on the server", () => {
    expect(route).toContain("customerPhone.length < 9");
    expect(route).toContain('requiredText(form, "vehicleMake", "ยี่ห้อรถ", 2, 80)');
    expect(route).toContain('requiredText(form, "vehiclePlate", "ทะเบียนรถ", 2, 40)');
  });
});
