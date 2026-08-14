import Link from "next/link";
import { Logo, WarrantyJourney } from "../../components";
import { CustomerWarrantyForm } from "../../warranty-client";

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

  return (
    <div className="card-public-page customer-complete-page">
      <header><Link href="/"><Logo /></Link><Link href="/warranty">ตรวจสอบบัตรรับประกัน</Link></header>
      <main className="state-card-wrap">
        <section className="state-card customer-complete-card">
          <p className="eyebrow slash">CUSTOMER REGISTRATION</p>
          <h1>เติมข้อมูลเพื่อให้บัตรสมบูรณ์</h1>
          <p>Dealer เปิดใช้งานและบันทึกวันที่ติดตั้งแล้ว กรุณากรอกข้อมูลเจ้าของรถครั้งเดียว หลังจากนั้นใช้ QR เดิมตรวจสอบบัตรและประวัติบริการได้ตลอด</p>
          <WarrantyJourney current="customer" />
          <CustomerWarrantyForm serial={safeSerial} />
        </section>
      </main>
    </div>
  );
}
