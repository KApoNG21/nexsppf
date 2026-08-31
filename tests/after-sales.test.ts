import { describe, expect, it } from "vitest";
import { parsePiecesCount, parseServicePlan, parseServiceType } from "@/lib/after-sales";

describe("after-sales plan validation", () => {
  it("accepts an optional dealer plan with maintenance, claim, and re-wrap limits", () => {
    const form = new FormData();
    form.set("maintenanceIncluded", "on");
    form.set("maintenanceIntervalMonths", "6");
    form.set("maintenanceVisitLimit", "4");
    form.set("claimIncluded", "on");
    form.set("claimPieceLimit", "3");
    form.set("rewrapIncluded", "on");
    form.set("rewrapPieceLimit", "2");
    form.set("planNote", "ตามเงื่อนไขของร้าน");
    form.set("installationWarrantyTerms", "รับประกันขอบฟิล์ม 12 เดือน");
    form.set("removalWarrantyTerms", "บริการลอกตามราคาที่ร้านแจ้ง");
    expect(parseServicePlan(form)).toEqual({
      maintenanceIncluded: true,
      maintenanceIntervalMonths: 6,
      maintenanceVisitLimit: 4,
      claimIncluded: true,
      claimPieceLimit: 3,
      rewrapIncluded: true,
      rewrapPieceLimit: 2,
      planNote: "ตามเงื่อนไขของร้าน",
      installationWarrantyTerms: "รับประกันขอบฟิล์ม 12 เดือน",
      removalWarrantyTerms: "บริการลอกตามราคาที่ร้านแจ้ง",
    });
  });

  it("stores omitted benefits as not included without inventing limits", () => {
    expect(parseServicePlan(new FormData())).toMatchObject({
      maintenanceIncluded: false,
      maintenanceIntervalMonths: null,
      maintenanceVisitLimit: null,
      claimIncluded: false,
      claimPieceLimit: null,
      rewrapIncluded: false,
      rewrapPieceLimit: null,
      installationWarrantyTerms: null,
      removalWarrantyTerms: null,
    });
  });

  it("requires valid limits only for selected benefits", () => {
    const form = new FormData();
    form.set("claimIncluded", "on");
    form.set("claimPieceLimit", "0");
    expect(() => parseServicePlan(form)).toThrow("จำนวนชิ้นเคลม");
  });

  it("requires piece counts for claim and re-wrap events", () => {
    const form = new FormData();
    form.set("piecesCount", "2");
    expect(parseServiceType("claim")).toBe("claim");
    expect(parsePiecesCount(form, "claim")).toBe(2);
    expect(parsePiecesCount(new FormData(), "maintenance")).toBe(0);
    expect(() => parseServiceType("unknown")).toThrow("ประเภทบริการ");
  });
});
