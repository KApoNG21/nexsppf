import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Dealer navigation", () => {
  const shell = readFileSync("src/app/components.tsx", "utf8");
  const dealerPage = readFileSync("src/app/dealer/[[...path]]/page.tsx", "utf8");

  it("uses the correctly spelled Maintenance label", () => {
    expect(shell).toContain('{ key: "maintenance", label: "Maintenance"');
    expect(shell).not.toContain('{ key: "maintenance", label: "บำรุงรักษา"');
  });

  it("temporarily hides assigned work from the Dealer workspace", () => {
    expect(shell).not.toContain('{ key: "requests", label: "งานที่ได้รับมอบหมาย"');
    expect(dealerPage).not.toContain('section === "requests"');
    expect(dealerPage).not.toContain('label="Open requests"');
    expect(dealerPage).not.toContain("งานที่ต้องดำเนินการ");
  });
});
