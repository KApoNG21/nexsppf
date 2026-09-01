import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("wrap warranty production readiness", () => {
  const migration = readFileSync("migrations/postgres/0007_wrap_installation_profile.sql", "utf8");
  const dealerForm = readFileSync("src/app/client-ui.tsx", "utf8");
  const dealerApi = readFileSync("src/app/api/dealer/warranties/route.ts", "utf8");
  const customerForm = readFileSync("src/app/warranty-client.tsx", "utf8");
  const customerApi = readFileSync("src/app/api/warranty/complete/route.ts", "utf8");
  const publicCard = readFileSync("src/app/r/[serial]/page.tsx", "utf8");

  it("stores the installation evidence needed to identify a wrap job", () => {
    for (const field of ["work_order_ref", "installation_type", "coverage_area", "installation_branch", "installer_name", "vehicle_year", "vehicle_color", "vehicle_vin_last6", "odometer_km"]) {
      expect(migration).toContain(field);
    }
  });

  it("generates the job number and requires the dealer to describe and photograph the wrap work", () => {
    expect(dealerForm).toContain("ระบบออกเลขที่งานให้อัตโนมัติ");
    expect(dealerApi).toContain("createWarrantyWorkOrderReference");
    expect(dealerForm).toContain("รูปแบบงาน Wrap");
    expect(dealerForm).toContain("พื้นที่ที่ติดตั้ง");
    expect(dealerForm).toContain("multiple required");
    expect(dealerApi).toContain("กรุณาแนบภาพหลักฐานงานติดตั้งอย่างน้อย 1 ภาพ");
    expect(dealerApi).toContain('"image/heic"');
  });

  it("validates the vehicle before activation without exposing VIN publicly", () => {
    expect(customerForm).toContain("ข้อมูลรถที่นำมา Wrap");
    expect(customerForm).toContain("เลขตัวถัง 6 ตัวท้าย");
    expect(customerApi).toContain("vehicle_vin_last6 = ?");
    expect(publicCard).not.toContain("vehicleVinLast6");
    expect(publicCard).toContain("พื้นที่ติดตั้ง");
  });

  it("provides concrete wrap inspection and claim reasons", () => {
    expect(dealerForm).toContain("ฟิล์มยกตัว / ขอบหลุด");
    expect(dealerForm).toContain("ฟองอากาศ / รอยผิดปกติ");
    expect(dealerForm).toContain("ขอ Re-wrap");
    expect(publicCard).toContain("แจ้งปัญหา / ขอเคลม");
  });
});
