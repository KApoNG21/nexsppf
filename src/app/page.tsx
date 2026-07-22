import { CategoryOverview, FaqBlock, LeadPanel, MarketingHero } from '@/components/marketing/NexsMarketing';

const pillars = [
  ['Precision Surface Engineering', 'วิศวกรรมพื้นผิวรถที่แม่นยำทุกชั้น'],
  ['Advanced Film Technology', 'ออกแบบระบบฟิล์มให้สอดคล้องกับการใช้งานจริง'],
  ['Premium Finish Quality', 'ความใส เงา และเรียบเนียนระดับพรีเมียม'],
  ['Complete Film System', 'ระบบฟิล์มครบทุกความต้องการ เพื่อการปกป้องและสไตล์ที่ลงตัว'],
] as const;

export default function HomePage() {
  return (
    <>
      <MarketingHero
        eyebrow="THINK NEW. THINK NEXS."
        title="Engineered to Be Invisible. Better Than Day One."
        thaiTitle="ยิ่งมองไม่เห็นฟิล์ม ยิ่งเห็นความสมบูรณ์แบบ"
        subcopy="วิศวกรรมฟิล์มระดับพรีเมียมที่ออกแบบให้แนบเนียนไปกับผิวรถ พร้อมยกระดับความใส ความเงา ความเรียบเนียน และการปกป้องในทุกการใช้งาน"
        primaryHref="/products"
        primaryLabel="Explore Film Systems"
        secondaryHref="/contact"
        secondaryLabel="Find an Installer"
        tone="clear"
        heroImage="/media/nexs-home-hero-v2.png"
        heroImageAlt="White premium sports car in a white black and red NEXS studio composition"
      />

      <CategoryOverview />

      <section className="section section-tight">
        <div className="nexs-stat-strip hero-trust-bar">
          <span>ENGINEERED FOR PERFECT SURFACES</span>
          <span>12 Film Options</span>
          <span>Lifetime up to 10 Years</span>
          <span>ฟิล์มรถยนต์ระดับพรีเมียม 3 กลุ่ม 12 ทางเลือก</span>
        </div>
      </section>

      <section className="section section-tight">
        <div className="section-head">
          <div>
            <p className="eyebrow">NEXS Standard</p>
            <h2>A Higher Standard for Invisible Surfaces.</h2>
          </div>
          <p>ผิวรถที่สมบูรณ์แบบเริ่มจากรายละเอียดที่มองแทบไม่เห็น NEXS จึงออกแบบทุกหน้าให้สว่าง สะอาด อ่านง่าย และเน้นข้อมูลที่ลูกค้าใช้ตัดสินใจจริง</p>
        </div>
        <div className="premium-pillar-grid">
          {pillars.map(([title, body]) => (
            <article className="premium-pillar" key={title}>
              <span />
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section section-tight split-feature">
        <div>
          <p className="eyebrow">Digital Warranty</p>
          <h2>ตรวจสอบสินค้าและบัตรรับประกันผ่าน QR Code</h2>
          <p>QR Code และ Serial Number ช่วยให้ลูกค้าตรวจสอบสถานะสินค้าและบัตรรับประกันได้อย่างชัดเจน เมื่อ Dealer/Admin ลงทะเบียนงานติดตั้งแล้ว ลูกค้าจะสามารถสแกนเพื่อดู Digital Warranty Card ได้ทันที</p>
          <div className="flow-steps refined">
            <span>1. ติดตั้งกับตัวแทนจำหน่าย</span>
            <span>2. Dealer ลงทะเบียน Serial</span>
            <span>3. ลูกค้าสแกน QR Code</span>
            <span>4. ดู Digital Warranty Card และประวัติการดูแลได้</span>
          </div>
        </div>
        <div className="warranty-glass-card">
          <p className="eyebrow">NEXS Digital Warranty</p>
          <h3>Active</h3>
          <dl>
            <div><dt>Product</dt><dd>NEXS PRO</dd></div>
            <div><dt>Serial</dt><dd>PRO-1196MXY0401178Q</dd></div>
            <div><dt>Dealer</dt><dd>NEXS Authorized Dealer</dd></div>
          </dl>
        </div>
      </section>

      <section className="section section-tight premium-section">
        <div className="section-head centered-head">
          <div>
            <p className="eyebrow red-dot">FAQ Preview</p>
            <h2>คำถามที่ต้องตอบให้ชัดก่อนลูกค้าตัดสินใจ</h2>
          </div>
        </div>
      </section>
      <FaqBlock limit={3} />

      <LeadPanel title="Ready to think new?" />
    </>
  );
}
