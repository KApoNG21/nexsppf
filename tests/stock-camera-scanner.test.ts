import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workspace = readFileSync(new URL("../src/app/stock/stock-workspace.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/app/stock/stock-workspace.module.css", import.meta.url), "utf8");

describe("mobile stock camera scanner", () => {
  it("opens a real rear-camera scanner instead of inserting demo data", () => {
    expect(workspace).toContain("decodeFromConstraints");
    expect(workspace).toContain('facingMode: { ideal: "environment" }');
    expect(workspace).toContain("เปิดกล้องสแกน QR");
    expect(workspace).not.toContain("เปิด Scanner (ทดลอง)");
  });

  it("provides a photo fallback and clear permission guidance", () => {
    expect(workspace).toContain('capture="environment"');
    expect(workspace).toContain("ยังไม่ได้อนุญาตให้ใช้กล้อง");
    expect(workspace).toContain("เปิดใน Safari/Chrome");
  });

  it("normalizes serials scanned from QR URLs", () => {
    expect(workspace).toContain("function normalizeScannedValue");
    expect(workspace).toContain('url.searchParams.get(key)');
    expect(workspace).toContain('url.pathname.split("/")');
  });

  it("keeps the camera UI usable on a phone screen", () => {
    expect(styles).toContain(".scannerBackdrop");
    expect(styles).toContain("max-height: 100dvh");
    expect(styles).toContain("grid-template-columns: 1fr;");
  });
});
