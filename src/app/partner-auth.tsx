import Link from "next/link";
import { redirect } from "next/navigation";
import { findPartnerAccess, type PartnerAccess, type PartnerRole } from "../db/partner-access";
import { chatGPTSignOutPath, requireChatGPTUser } from "./chatgpt-auth";

export async function requirePartnerAccess(role: PartnerRole, returnTo: string): Promise<PartnerAccess | null> {
  const user = await requireChatGPTUser(returnTo);
  const access = await findPartnerAccess(user.email, role);
  if (!access) return null;
  if (access.mustChangePassword) {
    redirect(`/change-password?return_to=${encodeURIComponent(returnTo)}`);
  }
  return { ...access, displayName: user.displayName };
}

export function AccessDenied({ role }: { role: PartnerRole }) {
  return <main className="access-denied"><div><p className="eyebrow slash">SECURE NEXS WORKSPACE</p><h1>บัญชีนี้ยังไม่มีสิทธิ์เข้าใช้งาน</h1><p>การลงชื่อเข้าใช้สำเร็จแล้ว แต่บัญชียังไม่ได้รับบทบาท {role === "admin" ? "Admin" : "Dealer ที่เปิดใช้งาน"} จาก NEXS กรุณาติดต่อผู้ดูแลระบบเพื่อผูกบัญชีก่อนใช้งาน</p><div><Link className="button button-primary" href="/contact">ติดต่อ NEXS <span>→</span></Link><Link className="button button-secondary" href={chatGPTSignOutPath("/login")}>ออกจากระบบ <span>→</span></Link></div></div></main>;
}

export function PermissionDenied() {
  return <main className="access-denied"><div><p className="eyebrow slash">NEXS ACCESS CONTROL</p><h1>บัญชีนี้ไม่มีสิทธิ์ควบคุมส่วนนี้</h1><p>บัญชีของคุณเข้า Admin ได้ แต่ยังไม่ได้รับสิทธิ์สำหรับงานที่เลือก เมนูและการดำเนินการจะเปิดตามสิทธิ์ที่ Owner กำหนด</p><div><Link className="button button-primary" href="/admin">กลับหน้า Admin <span>→</span></Link><Link className="button button-secondary" href={chatGPTSignOutPath("/login")}>เปลี่ยนบัญชี <span>→</span></Link></div></div></main>;
}
