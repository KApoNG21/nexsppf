import { LeadPanel, MarketingHero } from '@/components/marketing/NexsMarketing';

const STANDARD_POINTS = [
  {
    title: 'Product tier clarity',
    body: 'BEGIN, PRIME, PRO และ ULTIMATE ถูกจัดวางให้ลูกค้าและ Dealer เข้าใจระดับสินค้า อายุรับประกัน และขั้นตอนหลังติดตั้งอย่างเป็นระบบ',
  },
  {
    title: 'Dealer registration workflow',
    body: 'บัตรรับประกันดิจิทัลจะพร้อมใช้งานหลัง Dealer/Admin ลงทะเบียน Serial และข้อมูลงานติดตั้งเท่านั้น ลูกค้าไม่สามารถเปิดใช้งานเอง',
  },
  {
    title: 'PDPA-safe verification',
    body: 'หน้า QR แสดงเฉพาะข้อมูลที่จำเป็นและปิดบังข้อมูลส่วนบุคคล เช่น เบอร์ติดต่อ ทะเบียน และข้อมูลที่ต้องตรวจสอบสิทธิ์ก่อน',
  },
  {
    title: 'After-sales review path',
    body: 'คำขอ Support และ Inspection เริ่มต้นเป็น pending review เสมอ เพื่อให้ทีมที่เกี่ยวข้องตรวจสอบก่อนสรุปผลหรือดำเนินการต่อ',
  },
] as const;

export default function StandardPage() {
  return (
    <>
      <MarketingHero
        eyebrow="NEXS Standard"
        title="A clearer standard for film, warranty and after-sales care."
        thaiTitle="มาตรฐาน NEXS สำหรับสินค้า การลงทะเบียน และการดูแลหลังติดตั้ง"
        subcopy="NEXS Standard คือแนวทางการทำงานที่เชื่อมสินค้า Serial, Dealer workflow, Digital Warranty และการตรวจสอบหลังการติดตั้งเข้าด้วยกัน โดยไม่เปิดเผยข้อมูลส่วนบุคคลใน public page"
        primaryHref="/warranty"
        primaryLabel="ตรวจสอบบัตรรับประกัน"
        secondaryHref="/for-dealers"
        secondaryLabel="สำหรับตัวแทนจำหน่าย"
        tone="dealer"
      />

      <section className="section section-tight premium-section">
        <div className="section-head centered-head">
          <div>
            <p className="eyebrow red-dot">Operational Standard</p>
            <h2>Designed for customers, dealers and NEXS operations.</h2>
          </div>
          <p>ทุกขั้นตอนต้องช่วยให้ลูกค้าเชื่อมั่นมากขึ้น โดยยังคงปลอดภัย ตรวจสอบได้ และไม่สื่อสารเกินกว่านโยบายที่ได้รับอนุมัติ</p>
        </div>
        <div className="grid two">
          {STANDARD_POINTS.map((item) => (
            <article className="card premium-card" key={item.title}>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section section-tight premium-section inspection-process">
        <div className="section-head centered-head">
          <div>
            <p className="eyebrow red-dot">Review before outcome</p>
            <h2>Support and Inspection are request workflows.</h2>
          </div>
          <p>การส่งข้อมูลคือการเปิดคำขอตรวจสอบ ไม่ใช่การอนุมัติผลใด ๆ โดยอัตโนมัติ และต้องมี reference number เพื่อให้ติดตามงานได้</p>
        </div>
      </section>

      <LeadPanel title="Talk to NEXS about the right installation workflow" />
    </>
  );
}
