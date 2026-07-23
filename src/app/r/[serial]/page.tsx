import Link from "next/link";
import { ArrowLink, Logo, StatusPill } from "../../components";
import { findPublicWarranty, type PublicWarrantyRecord } from "../../../db/public-warranty";

export const dynamic = "force-dynamic";

export default async function WarrantyCardPage({ params }: { params: Promise<{ serial: string }> }) {
  const { serial } = await params;
  const key = decodeURIComponent(serial).toUpperCase();
  let record: PublicWarrantyRecord | undefined;
  try {
    record = await findPublicWarranty(key) ?? undefined;
  } catch {
    return <WarrantyState status="service-unavailable" serial={key} />;
  }
  if (!record) return <WarrantyState status="invalid" serial={key} />;
  if (record.status !== "active") return <WarrantyState status={record.status} serial={record.serial} record={record} />;
  return (
    <div className="card-public-page">
      <header><Link href="/"><Logo /></Link><Link href="/warranty">ตรวจสอบ Serial อื่น</Link></header>
      <main className="digital-card-wrap">
        <section className="digital-card active-card">
          <div className="card-brand"><Logo /><span>DIGITAL WARRANTY</span></div>
          <StatusPill status="active" />
          <h1>{record.product}</h1>
          <p className="serial-label">SERIAL NUMBER</p><strong className="serial-value">{record.serial}</strong>
          <dl><CardRow label="Vehicle" value={record.vehicle} /><CardRow label="Install Date" value={record.install} /><CardRow label="Expiry Date" value={record.expiry} /><CardRow label="Dealer" value={record.dealer} /></dl>
          <div className="maintenance-summary"><span>Maintenance Summary</span><b>{record.maintenance}</b></div>
          <div className="card-actions"><ArrowLink href={`/support/inspection?serial=${encodeURIComponent(record.serial)}`}>Request Inspection</ArrowLink><ArrowLink secondary href={`/support/warranty?serial=${encodeURIComponent(record.serial)}`}>Warranty Support</ArrowLink></div>
          <small>ข้อมูลลูกค้าและทะเบียนรถแสดงแบบปกปิดตามหลัก PDPA</small>
        </section>
        <aside><p className="eyebrow slash">VERIFIED RECORD</p><h2>บัตรรับประกันดิจิทัลของ NEXS</h2><p>QR นี้เชื่อมกับ Serial หลักในระบบ ใช้เพื่อตรวจสอบสถานะและเปิดช่องทางบริการหลังการขาย ไม่ใช่การอนุมัติเคลมอัตโนมัติ</p><ol><li>ตรวจสอบสถานะและข้อมูลผลิตภัณฑ์</li><li>ดูวันที่ติดตั้งและ Dealer</li><li>เปิดคำขอ Support หรือ Inspection</li></ol><Link href="/warranty-policy">อ่านเงื่อนไขรับประกัน →</Link></aside>
      </main>
    </div>
  );
}

function WarrantyState({ status, serial, record }: { status: string; serial: string; record?: PublicWarrantyRecord }) {
  const content: Record<string, [string, string]> = { "not-registered": ["Serial ถูกต้อง แต่ยังไม่ลงทะเบียน", "กรุณาติดต่อ Dealer ที่ติดตั้งหรือทีม NEXS เพื่อดำเนินการลงทะเบียนงานติดตั้ง"], expired: ["บัตรรับประกันหมดอายุ", "คุณยังสามารถส่งคำขอตรวจสอบหรือสอบถามช่องทางบริการหลังการขายได้"], "under-review": ["ข้อมูลอยู่ระหว่างตรวจสอบ", "ระบบจะยังไม่แสดงผลการพิจารณาอัตโนมัติ กรุณารอ Dealer/Admin อัปเดตสถานะ"], "service-unavailable": ["ระบบตรวจสอบยังไม่พร้อมใช้งาน", "ไม่มีการแสดงข้อมูลตัวอย่างแทนข้อมูลจริง กรุณาลองใหม่อีกครั้งหรือติดต่อ NEXS หากยังพบปัญหา"], invalid: ["ไม่พบ Serial นี้ในระบบ", "ตรวจสอบตัวอักษรและตัวเลขอีกครั้ง หรือส่งคำขอ Support โดยระบบจะไม่เปิดเผยข้อมูล Serial อื่น"] };
  const [title, copy] = content[status] ?? content.invalid;
  return <div className="card-public-page"><header><Link href="/"><Logo /></Link><Link href="/warranty">ตรวจสอบ Serial อื่น</Link></header><main className="state-card-wrap"><section className={`state-card state-${status}`}><StatusPill status={status} /><p className="eyebrow">SERIAL</p><strong>{serial}</strong><h1>{title}</h1><p>{copy}</p>{record && <dl><CardRow label="Product" value={record.product} /><CardRow label="Status" value={record.expiry} /></dl>}<div><ArrowLink href="/warranty">ค้นหาอีกครั้ง</ArrowLink><ArrowLink secondary href={`/support/warranty?serial=${encodeURIComponent(serial)}`}>ติดต่อ Support</ArrowLink></div></section></main></div>;
}

function CardRow({ label, value }: { label: string; value: string }) { return <div><dt>{label}</dt><dd>{value}</dd></div>; }
