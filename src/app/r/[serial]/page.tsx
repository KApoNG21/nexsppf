import Link from "next/link";
import { ArrowLink, Logo, StatusPill, WarrantyJourney } from "../../components";
import { findPublicWarranty, type PublicWarrantyRecord } from "../../../db/public-warranty";
import { resolveProductFromSerial } from "../../../lib/serial";

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
  if (!record) {
    try {
      resolveProductFromSerial(key);
      return <WarrantyState status="not-registered" serial={key} />;
    } catch {
      return <WarrantyState status="invalid" serial={key} />;
    }
  }
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
          <dl><CardRow label="รถ" value={record.vehicle} /><CardRow label="วันที่ติดตั้ง" value={record.install} /><CardRow label="หมดอายุ" value={record.expiry} /><CardRow label="ศูนย์ติดตั้ง" value={record.dealer} /></dl>
          <div className="maintenance-summary"><span>Maintenance Summary</span><b>{record.maintenance}</b></div>
          <div className="card-actions"><ArrowLink href={`/support/inspection?serial=${encodeURIComponent(record.serial)}`}>นัดตรวจสภาพ</ArrowLink><ArrowLink secondary href={`/support/warranty?serial=${encodeURIComponent(record.serial)}`}>ติดต่อเรื่องรับประกัน</ArrowLink><ArrowLink secondary href={`/dealer/maintenance?serial=${encodeURIComponent(record.serial)}`}>Dealer บันทึก Maintenance</ArrowLink></div>
          <small>ข้อมูลลูกค้าและทะเบียนรถแสดงแบบปกปิดตามหลัก PDPA</small>
        </section>
        <aside><p className="eyebrow slash">VERIFIED RECORD</p><h2>บัตรรับประกันดิจิทัลของ NEXS</h2><p>QR ใบเดียวใช้ตรวจสอบวันติดตั้ง วันหมดอายุ และประวัติบริการหลังการขายได้ตลอดอายุการใช้งาน</p><WarrantyJourney current="active" /><ol><li>ข้อมูลส่วนตัวไม่แสดงต่อสาธารณะ</li><li>Dealer บันทึก Maintenance จาก QR เดิม</li><li>ส่งคำขอตรวจสภาพหรือรับประกันได้ทันที</li></ol><Link href="/warranty-policy">อ่านเงื่อนไขรับประกัน →</Link></aside>
      </main>
    </div>
  );
}

function WarrantyState({ status, serial, record }: { status: string; serial: string; record?: PublicWarrantyRecord }) {
  const content: Record<string, [string, string]> = { "not-registered": ["QR นี้ยังไม่ถูกเปิดใช้งาน", "ให้ Dealer ล็อกอินและสแกน QR นี้เพื่อบันทึกวันที่ติดตั้ง ระบบจะสร้าง Serial ให้อัตโนมัติ ไม่ต้องรอสำนักงานใหญ่"], "profile-required": ["Dealer เปิดบัตรแล้ว กรุณาเติมข้อมูล", "วันที่ติดตั้งและวันหมดอายุถูกบันทึกแล้ว ลูกค้ากรอกข้อมูลเจ้าของรถอีกครั้งเดียวเพื่อให้บัตรสมบูรณ์"], expired: ["บัตรรับประกันหมดอายุ", "คุณยังสามารถส่งคำขอตรวจสอบหรือสอบถามช่องทางบริการหลังการขายได้"], "under-review": ["ข้อมูลอยู่ระหว่างตรวจสอบ", "ระบบจะยังไม่แสดงผลการพิจารณาอัตโนมัติ กรุณารอ Dealer/Admin อัปเดตสถานะ"], "service-unavailable": ["ระบบตรวจสอบยังไม่พร้อมใช้งาน", "ไม่มีการแสดงข้อมูลตัวอย่างแทนข้อมูลจริง กรุณาลองใหม่อีกครั้งหรือติดต่อ NEXS หากยังพบปัญหา"], invalid: ["QR หรือ Serial ไม่ถูกต้อง", "ตรวจสอบตัวอักษรและตัวเลขอีกครั้ง หรือส่งคำขอ Support โดยระบบจะไม่เปิดเผยข้อมูล Serial อื่น"] };
  const [title, copy] = content[status] ?? content.invalid;
  const encodedSerial = encodeURIComponent(serial);
  const isNotRegistered = status === "not-registered";
  const needsProfile = status === "profile-required";
  return (
    <div className="card-public-page">
      <header><Link href="/"><Logo /></Link><Link href="/warranty">ตรวจสอบ Serial อื่น</Link></header>
      <main className="state-card-wrap">
        <section className={`state-card state-${status}`}>
          <div className="state-card-brand"><Logo /><span>NEXS DIGITAL WARRANTY</span></div>
          <StatusPill status={status} />
          <p className="eyebrow">SERIAL NUMBER</p>
          <strong>{serial}</strong>
          <h1>{title}</h1>
          <p>{copy}</p>
          {(isNotRegistered || needsProfile) && <WarrantyJourney current={isNotRegistered ? "dealer" : "customer"} />}
          {record && <dl><CardRow label="ผลิตภัณฑ์" value={record.product} /><CardRow label="วันที่ติดตั้ง" value={record.install} /><CardRow label="หมดอายุ" value={record.expiry} /></dl>}
          {isNotRegistered && <div className="registration-audience-note"><b>เปิดใช้งานได้ทันที ไม่ต้องรอสำนักงานใหญ่</b><p>Dealer สแกน QR และบันทึกวันที่ติดตั้ง ระบบอ่านรุ่นจาก Prefix ของ Serial และคำนวณวันหมดอายุให้อัตโนมัติ</p></div>}
          <div className="state-actions">
            {isNotRegistered ? <><ArrowLink href={`/dealer/register-warranty?serial=${encodedSerial}`}>Dealer: เปิดใช้งาน Serial</ArrowLink><ArrowLink secondary href={`/support/warranty?serial=${encodedSerial}`}>ลูกค้า: ติดต่อ Dealer</ArrowLink></> : needsProfile ? <><ArrowLink href={`/warranty/complete?serial=${encodedSerial}`}>ลูกค้า: กรอกข้อมูลให้สมบูรณ์</ArrowLink><ArrowLink secondary href={`/dealer/maintenance?serial=${encodedSerial}`}>Dealer: เพิ่ม Maintenance</ArrowLink></> : <><ArrowLink href="/warranty">ค้นหาอีกครั้ง</ArrowLink><ArrowLink secondary href={`/support/warranty?serial=${encodedSerial}`}>ติดต่อ Support</ArrowLink></>}
          </div>
        </section>
      </main>
    </div>
  );
}

function CardRow({ label, value }: { label: string; value: string }) { return <div><dt>{label}</dt><dd>{value}</dd></div>; }
