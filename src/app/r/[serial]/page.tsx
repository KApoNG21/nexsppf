import Link from "next/link";
import { ArrowLink, Logo, StatusPill, WarrantyJourney } from "../../components";
import { findPublicWarranty, type PublicWarrantyRecord } from "../../../db/public-warranty";
import { resolveProductFromSerial } from "../../../lib/serial";
import { DEALER_SERVICE_NOTICE, NEXS_PRODUCT_WARRANTY_COVERAGE, NEXS_PRODUCT_WARRANTY_EXCLUSIONS, productWarrantyTitle } from "../../../lib/warranty-terms";

export const dynamic = "force-dynamic";

export default async function WarrantyCardPage({ params }: { params: Promise<{ serial: string }> }) {
  const { serial } = await params;
  const key = serial.trim().toUpperCase().replace(/\s+/g, "");
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
  if (record.status !== "active" && record.status !== "expired") return <WarrantyState status={record.status} serial={record.serial} record={record} />;
  const expired = record.status === "expired";
  return (
    <div className="card-public-page">
      <header><Link href="/"><Logo /></Link><Link href="/warranty">ตรวจสอบ Serial อื่น</Link></header>
      <main className="digital-card-wrap">
        <section className={`digital-card ${expired ? "expired-card" : "active-card"}`}>
          <div className="card-brand"><Logo /><span>DIGITAL WARRANTY</span></div>
          <StatusPill status={record.status} />
          {expired && <p className="expired-card-note">บัตรหมดอายุแล้ว แต่ประวัติบริการยังตรวจสอบได้ตามปกติ</p>}
          <h1>{record.product}</h1>
          <p className="serial-label">SERIAL NUMBER</p><strong className="serial-value">{record.serial}</strong>
          <dl><CardRow label="เลขที่งาน" value={record.workOrder} /><CardRow label="รูปแบบงาน" value={record.wrapType} /><CardRow label="พื้นที่ติดตั้ง" value={record.coverage} /><CardRow label="รถ" value={record.vehicle} /><CardRow label="วันที่ติดตั้ง" value={record.install} /><CardRow label="หมดอายุ" value={record.expiry} /><CardRow label="ดูแลครั้งถัดไป" value={record.nextMaintenance} /><CardRow label="สาขา" value={record.branch} /><CardRow label="ศูนย์ติดตั้ง" value={record.dealer} /></dl>
          <section className="nexs-product-warranty">
            <p className="eyebrow">NEXS PRODUCT WARRANTY</p>
            <h2>{productWarrantyTitle(record.product, record.productWarrantyYears)}</h2>
            <article><b>คุ้มครอง</b><p>{NEXS_PRODUCT_WARRANTY_COVERAGE}</p></article>
            <article className="warranty-exclusion"><b>ไม่ครอบคลุม</b><p>{NEXS_PRODUCT_WARRANTY_EXCLUSIONS}</p></article>
          </section>
          <section className="dealer-warranty-terms">
            <p className="eyebrow">DEALER SERVICE TERMS</p>
            <h2>งานติดตั้งและบริการลอกฟิล์ม</h2>
            <article><span>รับประกันงานติดตั้ง</span><b>{record.installationWarrantyTerms || "Dealer ไม่ได้ระบุการรับประกันงานติดตั้ง"}</b></article>
            <article><span>บริการ/รับประกันงานลอก</span><b>{record.removalWarrantyTerms || "Dealer ไม่ได้ระบุบริการหรือการรับประกันงานลอก"}</b></article>
            <p className="dealer-service-notice">{DEALER_SERVICE_NOTICE}</p>
          </section>
          <h2 className="dealer-benefit-title">สิทธิ์บริการหลังการขายจาก Dealer</h2>
          <div className="service-benefit-grid">
            <BenefitCard label="Maintenance" unit="ครั้ง" benefit={record.benefits.maintenance} detail={record.benefits.maintenance.intervalMonths ? `ทุก ${record.benefits.maintenance.intervalMonths} เดือน` : undefined} />
            <BenefitCard label="เคลม" unit="ชิ้น" benefit={record.benefits.claim} />
            <BenefitCard label="Re-wrap" unit="ชิ้น" benefit={record.benefits.rewrap} />
          </div>
          {record.planNote && <p className="service-plan-note"><b>เงื่อนไขจากร้าน</b>{record.planNote}</p>}
          <section className="public-service-history">
            <header><div><p className="eyebrow">AFTER-SALES HISTORY</p><h2>ประวัติการดูแลทั้งหมด</h2></div><span>{record.serviceHistory.length} รายการ</span></header>
            {record.serviceHistory.length ? record.serviceHistory.map((item) => (
              <article key={item.reference}>
                <span className={`service-type service-type-${item.type}`}>{item.label}</span>
                <div><b>{item.date}{item.pieces ? ` · ${item.pieces} ชิ้น` : ""}</b><p>{item.scope || item.result}</p>{item.nextDate !== "-" && <small>นัดครั้งถัดไป {item.nextDate}</small>}</div>
              </article>
            )) : <p className="empty-service-history">ยังไม่มีประวัติการเข้ารับบริการ</p>}
          </section>
          <div className="card-actions"><ArrowLink href={`/support/inspection?serial=${encodeURIComponent(record.serial)}`}>นัดตรวจสภาพงาน Wrap</ArrowLink><ArrowLink secondary href={`/support/warranty?serial=${encodeURIComponent(record.serial)}`}>แจ้งปัญหา / ขอเคลม</ArrowLink></div>
          {!expired && <p className="dealer-only-action">สำหรับศูนย์ติดตั้ง: <Link href={`/dealer/maintenance?serial=${encodeURIComponent(record.serial)}`}>บันทึกประวัติการดูแล</Link></p>}
          <small>ข้อมูลลูกค้าและทะเบียนรถแสดงแบบปกปิดตามหลัก PDPA</small>
        </section>
        <aside><p className="eyebrow slash">VERIFIED RECORD</p><h2>บัตรรับประกันดิจิทัลของ NEXS</h2><p>QR ใบเดียวใช้ตรวจสอบวันติดตั้ง วันหมดอายุ และประวัติบริการหลังการขายได้ตลอดอายุการใช้งาน</p><WarrantyJourney current="active" /><ol><li>ข้อมูลส่วนตัวไม่แสดงต่อสาธารณะ</li><li>Dealer บันทึก Maintenance จาก QR เดิม</li><li>ส่งคำขอตรวจสภาพหรือรับประกันได้ทันที</li></ol><Link href="/warranty-policy">อ่านเงื่อนไขรับประกัน →</Link></aside>
      </main>
    </div>
  );
}

function WarrantyState({ status, serial, record }: { status: string; serial: string; record?: PublicWarrantyRecord }) {
  const content: Record<string, [string, string]> = { "not-registered": ["บัตรนี้ยังไม่ถูกเปิดใช้งาน", "หากเพิ่งติดตั้ง กรุณาติดต่อศูนย์ติดตั้งให้เปิดบัตรก่อน แล้วสแกน QR เดิมอีกครั้ง"], "profile-required": ["บัตรพร้อมแล้ว กรุณาเติมข้อมูล", "ศูนย์ติดตั้งบันทึกวันที่ติดตั้งแล้ว เหลือเพียงข้อมูลเจ้าของและรถอีกครั้งเดียวเพื่อเปิดบัตรให้สมบูรณ์"], expired: ["บัตรรับประกันหมดอายุ", "คุณยังสามารถส่งคำขอตรวจสอบหรือสอบถามช่องทางบริการหลังการขายได้"], "under-review": ["ข้อมูลอยู่ระหว่างตรวจสอบ", "ระบบจะยังไม่แสดงผลการพิจารณาอัตโนมัติ กรุณารอศูนย์ติดตั้งหรือ NEXS อัปเดตสถานะ"], "service-unavailable": ["ระบบตรวจสอบยังไม่พร้อมใช้งาน", "ไม่มีการแสดงข้อมูลตัวอย่างแทนข้อมูลจริง กรุณาลองใหม่อีกครั้งหรือติดต่อ NEXS หากยังพบปัญหา"], invalid: ["QR หรือ Serial ไม่ถูกต้อง", "ตรวจสอบตัวอักษรและตัวเลขอีกครั้ง หรือส่งคำขอช่วยเหลือ โดยระบบจะไม่เปิดเผยข้อมูล Serial อื่น"] };
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
          {record && <dl><CardRow label="ผลิตภัณฑ์" value={record.product} /><CardRow label="เลขที่งาน" value={record.workOrder} /><CardRow label="รูปแบบงาน" value={record.wrapType} /><CardRow label="พื้นที่ติดตั้ง" value={record.coverage} /><CardRow label="วันที่ติดตั้ง" value={record.install} /><CardRow label="หมดอายุ" value={record.expiry} /><CardRow label="สาขา" value={record.branch} /></dl>}
          {isNotRegistered && <div className="registration-audience-note"><b>สำหรับลูกค้า</b><p>นำ Serial นี้แจ้งศูนย์ที่ติดตั้งให้เปิดใช้งานบัตร เมื่อเสร็จแล้วใช้ QR ใบเดิมได้ทันที</p></div>}
          <div className="state-actions">
            {isNotRegistered ? <><ArrowLink href={`/support/warranty?serial=${encodedSerial}`}>ติดต่อศูนย์ติดตั้ง / NEXS</ArrowLink><ArrowLink secondary href="/warranty">ตรวจสอบรหัสอีกครั้ง</ArrowLink></> : needsProfile ? <><ArrowLink href={`/warranty/complete?serial=${encodedSerial}`}>กรอกข้อมูลและเปิดบัตร</ArrowLink><ArrowLink secondary href={`/support/warranty?serial=${encodedSerial}`}>พบปัญหา ติดต่อ NEXS</ArrowLink></> : <><ArrowLink href="/warranty">ค้นหาอีกครั้ง</ArrowLink><ArrowLink secondary href={`/support/warranty?serial=${encodedSerial}`}>ติดต่อ NEXS</ArrowLink></>}
          </div>
          {isNotRegistered && <p className="dealer-only-action">สำหรับศูนย์ติดตั้งเท่านั้น: <Link href={`/dealer/register-warranty?serial=${encodedSerial}`}>เข้าสู่ระบบเพื่อเปิด Serial</Link></p>}
        </section>
      </main>
    </div>
  );
}

function CardRow({ label, value }: { label: string; value: string }) { return <div><dt>{label}</dt><dd>{value}</dd></div>; }

function BenefitCard({ label, unit, benefit, detail }: { label: string; unit: string; benefit: PublicWarrantyRecord["benefits"]["maintenance"]; detail?: string }) {
  return <article className={benefit.included ? "benefit-included" : "benefit-not-included"}><span>{label}</span>{benefit.included ? <><b>{benefit.used}/{benefit.limit} {unit}</b><small>คงเหลือ {benefit.remaining} {unit}{detail ? ` · ${detail}` : ""}</small></> : <><b>ไม่รวม</b><small>ร้านไม่ได้ระบุสิทธิ์นี้</small></>}</article>;
}
