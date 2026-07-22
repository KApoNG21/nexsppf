import { WarrantySearchForm } from '@/components/forms/WarrantySearchForm';
import { getImageSlot } from '@/content/image-assets';
import { SITE_COPY } from '@/content/site-content';

export default function WarrantyPage() {
  const visual = getImageSlot('warranty_qr_visual');
  return (
    <main className="site-shell">
      <section className="hero premium-warranty-hero">
        <div className="hero-copy">
          <p className="eyebrow">{SITE_COPY.warranty.title}</p>
          <h1>Digital Warranty เป็นส่วนหนึ่งของประสบการณ์หลังการติดตั้ง</h1>
          <p className="lead">{SITE_COPY.warranty.description}</p>
          <div aria-label="Serial Number warranty search: กรอกหมายเลข Serial Number; Dealer/Admin ลงทะเบียน; ลูกค้าไม่สามารถเปิดใช้งานบัตรรับประกันเอง">
            <WarrantySearchForm />
          </div>
        </div>
        <div className={`hero-visual ${visual.layoutClass}`}>{visual.path && <img src={visual.path} alt={visual.alt} />}</div>
      </section>
      <section className="section"><div className="section-head"><h2>Warranty-backed after-sales support</h2><p>บัตรรับประกันดิจิทัลช่วยให้ Serial, QR Code, รุ่นสินค้า และสถานะการลงทะเบียนเชื่อมกันอย่างเป็นระบบ โดย public page ยังปกป้องข้อมูลส่วนบุคคล</p></div><div className="grid three">{SITE_COPY.trustProof.map((proof) => <article className="card" key={proof.title}><h3>{proof.title}</h3><p>{proof.body}</p></article>)}</div></section>
      <section className="section inspection-process"><div className="section-head"><h2>ขั้นตอนตรวจสอบปัญหา</h2><p>หากพบปัญหาหลังติดตั้ง สามารถส่งคำขอตรวจสอบเพื่อให้ Dealer/Admin ตรวจข้อมูลและประสานงานต่อได้</p></div><div className="grid three">{SITE_COPY.claimProcess.map((step) => <article className="card" key={step.title}><h3>{step.title}</h3><p>{step.body}</p></article>)}</div><div className="actions"><a className="button primary" href="/support/inspection">ส่งคำขอตรวจสอบ</a><span className="safe-note">ไม่ใช่การอนุมัติเคลมอัตโนมัติ</span></div></section>
    </main>
  );
}
