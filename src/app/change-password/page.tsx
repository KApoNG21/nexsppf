import Link from "next/link";
import { Logo } from "../components";
import { requireChatGPTUser } from "../chatgpt-auth";
import { safeReturnPath } from "@/lib/auth-session";
import { ChangePasswordForm } from "./ChangePasswordForm";

export default async function ChangePasswordPage({ searchParams }: { searchParams: Promise<{ return_to?: string }> }) {
  const params = await searchParams;
  const returnTo = safeReturnPath(params.return_to, "/dealer");
  const user = await requireChatGPTUser(`/change-password?return_to=${encodeURIComponent(returnTo)}`);

  return (
    <div className="login-page">
      <section className="login-visual">
        <Link href="/"><Logo inverse /></Link>
        <div><p className="eyebrow slash">ACCOUNT SECURITY</p><h1>Secure access,<br />from day one.</h1><p>ตั้งรหัสผ่านส่วนตัวสำหรับระบบ Partner ของ NEXS</p></div>
        <small>บัญชี {user.email}</small>
      </section>
      <main className="login-panel">
        <div>
          <p className="eyebrow">ACCOUNT SECURITY</p>
          <h2>เปลี่ยนรหัสผ่าน</h2>
          <p>หากเป็นการเข้าสู่ระบบครั้งแรก ให้ใช้รหัสผ่านชั่วคราวที่ได้รับจาก Admin หลังบันทึกแล้วระบบจะพาไปยังหน้าที่คุณต้องการ</p>
          <ChangePasswordForm returnTo={returnTo} />
        </div>
      </main>
    </div>
  );
}
