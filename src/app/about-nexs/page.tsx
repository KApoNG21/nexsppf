import { LeadPanel, MarketingHero } from '@/components/marketing/NexsMarketing';

const story = [
  ['เข้าใจผิวรถจากการใช้งานจริง', 'NEXS เริ่มจากปัญหาที่เจ้าของรถเจอจริง แล้วจัดระบบฟิล์มให้เลือกง่าย'],
  ['ออกแบบจากการใช้งานจริง', 'สินค้าถูกเล่าเป็นระบบ Clear, Matte และ Color เพื่อให้ลูกค้าเข้าใจบทบาทของแต่ละกลุ่ม'],
  ['ปกป้องโดยไม่ลดทอนความสวย', 'ทิศทางภาพเน้นความเรียบ สว่าง พรีเมียม และไม่ทำให้เว็บกลายเป็น dashboard'],
  ['หลังการขายที่ตรวจสอบได้', 'Digital Warranty และ QR ช่วยสร้าง trust layer หลังติดตั้งโดยไม่เปิดเผยข้อมูล sensitive'],
] as const;

export default function AboutNexsPage() {
  return (
    <>
      <MarketingHero
        eyebrow="About NEXS"
        title="A Higher Standard for Invisible Surfaces."
        thaiTitle="ผิวรถที่สมบูรณ์แบบเริ่มจากรายละเอียดที่มองแทบไม่เห็น"
        subcopy="NEXS จัดวางสินค้า ภาพลักษณ์ และระบบรับประกันให้ลูกค้าเข้าใจง่ายตั้งแต่ก่อนติดตั้งจนถึงหลังการขาย"
        primaryHref="/products"
        primaryLabel="Explore Products"
        secondaryHref="/contact"
        secondaryLabel="Contact NEXS"
        tone="dealer"
        heroImage="/media/nexs-about-hero-v2.png"
        heroImageAlt="Graphite car close-up with headlight and film reflections for the About NEXS hero"
      />
      <section className="section section-tight">
        <div className="premium-pillar-grid">
          {story.map(([title, body]) => (
            <article className="premium-pillar" key={title}>
              <span />
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>
      <LeadPanel title="Talk to NEXS" />
    </>
  );
}
