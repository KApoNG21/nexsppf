import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workspace = readFileSync(new URL("../src/app/stock/stock-workspace.tsx", import.meta.url), "utf8");

describe("stock issue destination tracking", () => {
  it("offers the real branch and issue destinations", () => {
    for (const label of ["สาขาพระราม 2", "สาขารัชดา", "สาขา CDC", "ขายให้ Dealer", "ใช้กับรถลูกค้า", "ใช้ภายในบริษัท", "ปลายทางอื่น"]) {
      expect(workspace).toContain(label);
    }
  });

  it("requires identifying details for dealer, vehicle, and custom destinations", () => {
    expect(workspace).toContain('["dealer", "vehicle", "other"].includes(issueDestination)');
    expect(workspace).toContain("กรุณาระบุชื่อ Dealer หรือผู้รับสินค้า");
    expect(workspace).toContain("กรุณาระบุรถ ทะเบียน ชื่อลูกค้า หรือชื่องาน");
  });

  it("persists the destination and issue note in movement history", () => {
    expect(workspace).toContain("issueDestinationSummary");
    expect(workspace).toContain("หมายเหตุ: ${issueNote.trim()}");
    expect(workspace).toContain("จ่ายออก / ${issueDestinationSummary}");
    expect(workspace).toContain("usageDestinationSummary");
    expect(workspace).toContain("หมายเหตุ: ${usageNote.trim()}");
  });

  it("shows the destination and note in the final confirmation", () => {
    expect(workspace).toContain("<dt>นำไปใช้ที่</dt>");
    expect(workspace).toContain("<dt>หมายเหตุ</dt>");
    expect(workspace).toContain("ข้อมูลที่จะบันทึกในประวัติ");
  });
});
