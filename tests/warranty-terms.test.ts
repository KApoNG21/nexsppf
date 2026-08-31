import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  DEALER_SERVICE_NOTICE,
  NEXS_PRODUCT_WARRANTY_COVERAGE,
  NEXS_PRODUCT_WARRANTY_EXCLUSIONS,
  productWarrantyTitle,
} from "@/lib/warranty-terms";

describe("customer-facing warranty terms", () => {
  it("names the NEXS model and configured warranty duration", () => {
    expect(productWarrantyTitle("BEGIN", 5)).toBe("ประกันผลิตภัณฑ์ฟิล์ม NEXS รุ่น BEGIN รับประกัน 5 ปี");
  });

  it("separates manufacturing coverage, exclusions, and dealer services", () => {
    expect(NEXS_PRODUCT_WARRANTY_COVERAGE).toContain("ความบกพร่องของเนื้อฟิล์มจากการผลิต");
    expect(NEXS_PRODUCT_WARRANTY_EXCLUSIONS).toContain("ฉีดน้ำแรงดันสูง");
    expect(DEALER_SERVICE_NOTICE).toContain("Dealer ผู้ติดตั้งกำหนดและรับผิดชอบโดยตรง");
    expect(DEALER_SERVICE_NOTICE).toContain("ไม่รวมอยู่ในการรับประกันผลิตภัณฑ์ฟิล์มของ NEXS");
  });

  it("persists separate dealer terms and exposes both fields in the activation form", () => {
    const migration = readFileSync("migrations/postgres/0008_dealer_installation_removal_terms.sql", "utf8");
    const form = readFileSync("src/app/client-ui.tsx", "utf8");
    expect(migration).toContain("installation_warranty_terms");
    expect(migration).toContain("removal_warranty_terms");
    expect(form).toContain('name="installationWarrantyTerms"');
    expect(form).toContain('name="removalWarrantyTerms"');
  });
});
