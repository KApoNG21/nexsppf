import Link from "next/link";
import { findPartnerAccess, type PartnerAccess, type PartnerRole } from "../db/partner-access";
import { chatGPTSignOutPath, requireChatGPTUser } from "./chatgpt-auth";

export async function requirePartnerAccess(role: PartnerRole, returnTo: string): Promise<PartnerAccess | null> {
  const user = await requireChatGPTUser(returnTo);
  const access = await findPartnerAccess(user.email, role);
  if (!access) return null;
  return { ...access, displayName: user.displayName };
}

export function AccessDenied({ role }: { role: PartnerRole }) {
  return <main className="access-denied"><div><p className="eyebrow slash">SECURE NEXS WORKSPACE</p><h1>บัญชีนี้ยังไม่มีสิทธิ์เข้าใช้งาน</h1><p>การลงชื่อเข้าใช้สำเร็จแล้ว แต่บัญชียังไม่ได้รับบทบาท {role === "admin" ? "Admin" : "Dealer ที่เปิดใช้งาน"} จาก NEXS กรุณาติดต่อผู้ดูแลระบบเพื่อผูกบัญชีก่อนใช้งาน</p><div><Link className="button button-primary" href="/contact">ติดต่อ NEXS <span>→</span></Link><Link className="button button-secondary" href={chatGPTSignOutPath("/login")}>ออกจากระบบ <span>→</span></Link></div></div></main>;
}
