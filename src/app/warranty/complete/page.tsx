import Link from "next/link";
import { Logo, WarrantyJourney } from "../../components";
import { CustomerWarrantyForm } from "../../warranty-client";
import { findCustomerRegistrationDraft } from "../../../db/public-warranty";

export const dynamic = "force-dynamic";

export default async function CustomerWarrantyCompletePage({
  searchParams,
}: {
  searchParams: Promise<{ serial?: string | string[] }>;
}) {
  const query = await searchParams;
  const rawSerial = Array.isArray(query.serial) ? query.serial[0] : query.serial;
  const serial = rawSerial?.trim().toUpperCase().replace(/\s+/g, "") ?? "";
  const safeSerial = /^[A-Z0-9-]{6,64}$/.test(serial) ? serial : "";
  const initialData = safeSerial ? await findCustomerRegistrationDraft(safeSerial).catch(() => null) : null;
  const backPath = safeSerial ? `/r/${encodeURIComponent(safeSerial)}` : "/warranty";

  return (
    <div className="card-public-page customer-complete-page">
      <header><Link href="/"><Logo /></Link><Link href="/warranty">ตรวจสอบบัตรรับประกัน</Link></header>
      <main className="state-card-wrap">
        <section className="state-card customer-complete-card">
          <Link className="registration-back" href={backPath}>← กลับไปหน้าบัตรรับประกัน</Link>
          <p className="eyebrow slash">CUSTOMER REGISTRATION</p>
          <h1>ยืนยันรถและเปิดบัตรงาน Wrap</h1>
          <p>ศูนย์ติดตั้งบันทึกงาน Wrap แล้ว หากร้านช่วยกรอกข้อมูลไว้ ระบบจะแสดงเป็นข้อมูลตั้งต้น กรุณาตรวจสอบ แก้ไขส่วนที่ขาด และยืนยันด้วยตนเอง</p>
          <WarrantyJourney current="customer" />
          <CustomerWarrantyForm serial={safeSerial} initialData={initialData ?? undefined} />
        </section>
      </main>
    </div>
  );
}
