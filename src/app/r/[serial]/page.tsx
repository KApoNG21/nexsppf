import { lookupPublicWarrantyRecord, type PublicWarrantyRecord } from '@/lib/public-warranty-records';
import { BrandMark, Pill, QrGlyph } from '../../preview-redesign/variant-b-preview';

type PillTone = 'active' | 'warn' | 'error';

export default async function DigitalWarrantyCardPage({
  params,
}: {
  params: Promise<{ serial: string }>;
}) {
  const { serial } = await params;
  const record = lookupPublicWarrantyRecord(decodeURIComponent(serial));

  return (
    <main className="variant-b-shell variant-b-warranty-card-shell">
      <div className="variant-b-warranty-card-wrap">
        <a href="/warranty" className="variant-b-warranty-card-back">
          ← กลับไปยังหน้าตรวจสอบ
        </a>
        {record.state === 'active' && <ActiveCard record={record} />}
        {record.state === 'not-registered' && <NotRegisteredCard record={record} />}
        {record.state === 'not-found' && <NotFoundCard serial={record.serial} />}
        {record.state === 'expired' && <ExpiredCard record={record} />}
        {record.state === 'under-review' && <UnderReviewCard record={record} />}
      </div>
    </main>
  );
}

function ActiveCard({ record }: { record: PublicWarrantyRecord }) {
  return (
    <>
      <DigitalCard record={record} />
      <div className="variant-b-warranty-card-timeline">
        <p className="variant-b-eyebrow">Care Timeline</p>
        <div className="variant-b-warranty-timeline-rows">
          {[
            [record.installDate ?? '-', 'ลงทะเบียนการติดตั้ง', record.dealerName ?? 'NEXS Authorized Dealer'],
            ['ล่าสุด', record.maintenanceSummary ?? 'ยังไม่มีประวัติการดูแลเพิ่มเติม', 'PDPA-safe summary'],
          ].map(([date, title, by]) => (
            <div key={`${date}-${title}`} className="variant-b-warranty-timeline-row">
              <span className="variant-b-warranty-timeline-date">{date}</span>
              <div>
                <strong>{title}</strong>
                <span>{by}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <SafeActions />
      <PdpaNote />
    </>
  );
}

function DigitalCard({ record }: { record: PublicWarrantyRecord }) {
  return (
    <aside className="variant-b-warranty-phone variant-b-warranty-phone-large" aria-label="Digital Warranty Card">
      <div className="variant-b-phone-bar">
        <BrandMark tone="light" />
        <Pill tone="active">Active</Pill>
      </div>
      <div className="variant-b-warranty-headline">
        <div>
          <p className="variant-b-warranty-product">{record.productName}</p>
          <p className="variant-b-warranty-years">รับประกัน {record.warrantyYears} ปี</p>
        </div>
        <div className="variant-b-warranty-qr" aria-hidden>
          <QrGlyph size={72} />
        </div>
      </div>
      <dl>
        <WarrantyField label="หมายเลข Serial" value={record.serial} />
        <WarrantyField label="รถ" value={record.vehicleMasked ?? 'Masked vehicle'} />
        <WarrantyField label="ตัวแทนจำหน่าย" value={record.dealerName ?? 'NEXS Authorized Dealer'} />
        <WarrantyField label="ทะเบียน" value={record.licensePlateMasked ?? 'Masked'} />
        <WarrantyField label="วันที่ติดตั้ง" value={record.installDate ?? '-'} />
        <WarrantyField label="วันหมดอายุ" value={record.expiryDate ?? '-'} />
      </dl>
      <div className="variant-b-warranty-foot">
        <span>ID · {record.serial.slice(-6)}</span>
        <span>VERIFIED · NEXSPPF.COM</span>
      </div>
    </aside>
  );
}

function WarrantyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function NotRegisteredCard({ record }: { record: PublicWarrantyRecord }) {
  return (
    <StateCard
      tone="warn"
      pill="Serial Found · ยังไม่ลงทะเบียน"
      title="Serial นี้อยู่ในระบบแล้ว แต่ยังไม่ได้ลงทะเบียนการติดตั้ง"
      serial={record.serial}
      body={`${record.productName ?? 'NEXS PPF'} ยังไม่มีตัวแทนจำหน่ายลงทะเบียนการติดตั้งกับลูกค้า`}
    />
  );
}

function NotFoundCard({ serial }: { serial: string }) {
  return (
    <StateCard
      tone="error"
      pill="Invalid · Not Found"
      title="ไม่พบ Serial นี้ในระบบ NEXS"
      serial={serial}
      body="อาจเกิดจากการพิมพ์ผิด หรือข้อมูลยังไม่ได้รับการนำเข้า กรุณาส่งคำขอตรวจสอบเพื่อให้ทีมงานยืนยัน"
    />
  );
}

function ExpiredCard({ record }: { record: PublicWarrantyRecord }) {
  return (
    <StateCard
      tone="warn"
      pill="Expired"
      title="บัตรรับประกันนี้หมดอายุแล้ว"
      serial={record.serial}
      body={`${record.productName ?? 'NEXS PPF'} หมดอายุตามวันที่ในระบบ: ${record.expiryDate ?? '-'}`}
    />
  );
}

function UnderReviewCard({ record }: { record: PublicWarrantyRecord }) {
  return (
    <StateCard
      tone="warn"
      pill="Suspended · Under Review"
      title="บัตรนี้อยู่ระหว่างตรวจสอบ"
      serial={record.serial}
      body={record.reviewMessage ?? 'ทีม NEXS กำลังตรวจสอบสถานะ กรุณาติดต่อทีมงานพร้อมข้อมูลที่เกี่ยวข้อง'}
    />
  );
}

function StateCard({ tone, pill, title, serial, body }: { tone: PillTone; pill: string; title: string; serial: string; body: string }) {
  return (
    <div className="variant-b-warranty-state-card">
      <div className="variant-b-warranty-state-pill">
        <Pill tone={tone}>{pill}</Pill>
      </div>
      <h2>{title}</h2>
      <p>
        <span className="variant-b-warranty-state-mono">{serial}</span> — {body}
      </p>
      <p className="variant-b-warranty-state-fineprint">
        การแสดงผลหน้านี้เป็นแบบ PDPA-safe และไม่ถือเป็นการอนุมัติเคลมหรือผลตรวจสอบโดยอัตโนมัติ
      </p>
      <SafeActions />
    </div>
  );
}

function SafeActions() {
  return (
    <div className="variant-b-warranty-card-actions">
      <a className="variant-b-button primary" href="/support/inspection">
        ขอตรวจสอบปัญหา
      </a>
      <a className="variant-b-button secondary" href="/support/warranty">
        แจ้งบัตร / QR สูญหาย
      </a>
    </div>
  );
}

function PdpaNote() {
  return (
    <p className="variant-b-warranty-card-pdpa">
      ข้อมูลที่แสดงเป็นแบบ PDPA-safe เบอร์โทร ทะเบียนรถ และข้อมูลที่ต้องตรวจสอบสิทธิ์จะถูกซ่อนเพื่อความปลอดภัย
    </p>
  );
}
