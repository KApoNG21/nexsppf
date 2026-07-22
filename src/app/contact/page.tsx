import { ContactLeadForm } from '@/components/forms/ContactLeadForm';
import { getImageSlot } from '@/content/image-assets';
import { SITE_COPY } from '@/content/site-content';

export default function ContactPage() {
  const visual = getImageSlot('contact_lead_visual');

  return (
    <>
      <section className="nexs-hero premium-hero contact-hero">
        <div className="nexs-hero-copy">
          <p className="eyebrow red-dot">Contact NEXS</p>
          <h1>Let NEXS guide the right film system.</h1>
          <h2>ติดต่อทีมงาน NEXS เพื่อเลือกระบบฟิล์มที่เหมาะกับรถของคุณ</h2>
          <p className="lead">ช่องทางหลักทั้งหมดใช้ handle เดียวกัน: nexsppf เพื่อให้ลูกค้า ร้านติดตั้ง และผู้สนใจ Digital Warranty ติดต่อได้ง่ายขึ้น</p>
          <div className="quick-contact-grid premium-contact-grid">
            {SITE_COPY.quickContact.map((item) => (
              <article className="quick-contact-card" key={item.label}>
                <strong>{item.label}</strong>
                <span>{item.value}</span>
              </article>
            ))}
          </div>
        </div>
        <div className="nexs-visual-stage dealer contact-visual-panel contact-card-visual" aria-label={visual.alt}>
          <div className="render-label">NEXS CONTACT</div>
          <div className="contact-device-card">
            <span>NEXS</span>
            <strong>nexsppf</strong>
            <small>LINE · Facebook · Instagram · TikTok · YouTube</small>
          </div>
        </div>
      </section>

      <section className="section section-tight premium-section contact-form-section">
        <div className="section-head centered-head">
          <div>
            <p className="eyebrow red-dot">Lead Form</p>
            <h2>Tell us what surface you want to protect.</h2>
          </div>
          <p>แบบฟอร์มนี้เป็น public-safe lead capture สำหรับติดต่อกลับและแนะนำรุ่น ไม่แสดงข้อมูลเชิงพาณิชย์ภายใน</p>
        </div>
        <ContactLeadForm />
      </section>
    </>
  );
}
