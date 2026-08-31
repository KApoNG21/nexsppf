import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workspace = readFileSync(new URL("../src/app/stock/stock-workspace.tsx", import.meta.url), "utf8");

describe("stock worker safety", () => {
  it("keeps the complete audit history instead of truncating recent activity", () => {
    expect(workspace).toContain("setActivity((current) => [next, ...current])");
    expect(workspace).not.toContain("[next, ...current].slice(0, 14)");
    expect(workspace).toContain("ประวัติการทำรายการทั้งหมด");
  });

  it("requires an explicit unit for returns, transfers, and damage", () => {
    expect(workspace).toContain('setSerial("")');
    expect(workspace).toContain('option value="">เลือก Serial ที่ต้องการทำรายการ</option>');
    expect(workspace).toContain("scanForTransaction");
  });

  it("records notes for operational movements and requires damage details", () => {
    expect(workspace).toContain("กรุณาระบุลักษณะความเสียหายก่อนบันทึก");
    expect(workspace).toContain("transactionNote.trim()");
    expect(workspace).toContain("ยืนยันแจ้งเสียและย้ายเข้าจุดกักแยก");
  });

  it("turns the cycle-count scanner into a working verification control", () => {
    expect(workspace).toContain("function confirmScannedUnit()");
    expect(workspace).toContain("ตรวจพบแล้ว ไม่ได้นับซ้ำ");
    expect(workspace).toContain("ไม่พบ Serial นี้ในตำแหน่ง");
  });

  it("prevents usage submission when no open roll is available", () => {
    expect(workspace).toContain("ยังไม่มีม้วนเปิด");
    expect(workspace).toContain("disabled={!unit || used <= 0 || used > (unit?.metres ?? 0)}");
  });

  it("keeps count and reports reachable from the mobile navigation", () => {
    expect(workspace).toContain("งานสต็อกเพิ่มเติม");
    expect(workspace).toContain("visibleNavItems.slice(4).map");
    expect(workspace).toContain("<b>เพิ่มเติม</b>");
  });
});
