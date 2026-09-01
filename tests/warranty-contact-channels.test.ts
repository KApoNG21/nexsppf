import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createWarrantyWorkOrderReference } from "@/lib/warranty-reference";

describe("warranty automatic reference and contact channels", () => {
  it("creates a stable NEXS job number from installation date and Serial", () => {
    expect(createWarrantyWorkOrderReference("b-954got4035925z", "2026-09-01"))
      .toBe("NXS-20260901-B-954GOT4035925Z");
  });

  it("does not require a Dealer to invent a work-order number", () => {
    const ui = readFileSync("src/app/client-ui.tsx", "utf8");
    const api = readFileSync("src/app/api/dealer/warranties/route.ts", "utf8");
    expect(ui).toContain("ระบบออกเลขที่งานให้อัตโนมัติ");
    expect(ui).not.toContain('name="workOrderRef"');
    expect(api).toContain("createWarrantyWorkOrderReference(serialCode, installDate)");
  });

  it("stores separate LINE contact IDs for Dealer and customer", () => {
    const migration = readFileSync("migrations/postgres/0010_contact_channels.sql", "utf8");
    const customer = readFileSync("src/app/warranty-client.tsx", "utf8");
    expect(migration).toContain("line_id text");
    expect(migration).toContain("customer_line_id text");
    expect(customer).toContain("LINE ID สำหรับติดต่อ");
  });
});
