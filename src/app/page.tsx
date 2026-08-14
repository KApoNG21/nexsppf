import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLink, Logo, PageShell, ProductCard, SectionTitle, TrustStrip } from "./components";
import { WarrantyLookup } from "./warranty-client";
import { clearTiers } from "./content";

export const metadata: Metadata = {
  title: "NEXS PPF | Engineered to Be Invisible",
  description: "NEXS Paint Protection Film และระบบตรวจสอบบัตรรับประกันดิจิทัลผ่าน QR Code",
};

export default function Home() {
  return (
    <PageShell className="home-page">
      <section className="hero hero-home">
        <div className="hero-copy">
          <p className="eyebrow slash">THINK NEW. THINK NEXS.</p>
          <h1>Engineered<br />to Be <em>Invisible.</em><br />Better Than<br />Day One.</h1>
          <h2>ยิ่งมองไม่เห็นฟิล์ม ยิ่งเห็นความสมบูรณ์แบบ</h2>
          <p>วิศวกรรมฟิล์มปกป้องรถยนต์ระดับพรีเมียม พร้อมระบบบัตรรับประกันดิจิทัลที่ตรวจสอบได้จากทุกอุปกรณ์</p>
          <div className="hero-actions"><ArrowLink href="/products">Explore Film Systems</ArrowLink><ArrowLink secondary href="/warranty">ตรวจสอบรับประกัน</ArrowLink></div>
        </div>
        <div className="hero-image" role="img" aria-label="รถสปอร์ตสีเงินในสตูดิโอสีขาวพร้อมแสงแดง" />
        <div className="hero-tabs"><span className="active">01</span><span>02</span><span>03</span></div>
      </section>

      <TrustStrip />

      <section className="section system-section">
        <div className="section-head-inline">
          <SectionTitle center={false} eyebrow="FILM SYSTEMS" title="Choose Your Film System" copy="เลือกคาแรกเตอร์ผิวรถที่เหมาะกับการใช้งานและสไตล์ของคุณ" />
          <ArrowLink secondary href="/products">ดูสินค้าทั้งหมด</ArrowLink>
        </div>
        <div className="system-grid">
          <Link className="system-card system-clear" href="/clear-ppf"><span>01</span><div><h3>Clear PPF</h3><p>ใส เงางาม ปกป้องพร้อมคงสีเดิมของรถ</p><b>Begin · Prime · Pro · Ultimate</b></div></Link>
          <Link className="system-card system-matte" href="/matte-ppf"><span>02</span><div><h3>Matte PPF</h3><p>ผิวด้านเรียบเนียน บุคลิกสุขุมเหนือระดับ</p><b>Matte Prime · Matte Ultimate</b></div></Link>
          <Link className="system-card system-color" href="/color-ppf"><span>03</span><div><h3>Color PPF</h3><p>เปลี่ยนคาแรกเตอร์รถด้วยเฉดสีที่คัดสรร</p><b>Gloss · Satin · Signature Colors</b></div></Link>
        </div>
      </section>

      <section className="section light-section">
        <SectionTitle eyebrow="CLEAR PPF LINEUP" title="Protection, precisely matched." copy="4 ระดับผลิตภัณฑ์ตามบทบาทและระยะรับประกันที่กำหนดในสเปกระบบ" />
        <div className="product-grid product-grid-four">{clearTiers.map((product) => <ProductCard product={product} compact key={product.code} />)}</div>
      </section>

      <section className="section dual-banner-section">
        <Link className="finish-banner finish-matte" href="/matte-ppf"><p className="eyebrow">MATTE PPF</p><h2>ความเรียบด้าน<br />ที่ไม่ลดทอนรายละเอียด</h2><span>ดู Matte Collection →</span></Link>
        <Link className="finish-banner finish-color" href="/color-ppf"><p className="eyebrow">COLOR PPF</p><h2>สีที่สะท้อน<br />ตัวตนของคุณ</h2><span>ดู Color Collection →</span></Link>
      </section>

      <section className="section technology-strip">
        {[["◇", "Clarity", "ผิวงานสะอาด คงรายละเอียดของสีรถ"], ["↻", "Care Workflow", "บันทึกการดูแลและตรวจสภาพ"], ["◉", "QR Verification", "ตรวจสอบ Serial และสถานะบัตร"], ["☼", "Authorized Network", "ติดตั้งผ่านตัวแทนจำหน่าย"], ["▤", "Digital Record", "ประวัติบริการเชื่อมต่อเป็นระบบ"], ["⌁", "Claim-safe", "ใช้ข้อความตามเงื่อนไขที่อนุมัติ"]].map(([icon, title, copy]) => <article key={title}><b>{icon}</b><h3>{title}</h3><p>{copy}</p></article>)}
      </section>

      <section className="section on-car-gallery home-finish-gallery">
        <SectionTitle eyebrow="FINISH GALLERY" title="See the Finish" copy="รายละเอียดผิวงานที่คัดสรร ตั้งแต่ความใส งานด้าน ไปจนถึงเฉดสีที่มีคาแรกเตอร์" />
        <div>
          {["Clear Gloss", "Satin Blue", "Signature Red", "Matte Black", "Forest Green", "Color Shift"].map((label, index) => <article className={`on-car-card on-car-${index + 1}`} key={label}><span>{label}</span></article>)}
        </div>
      </section>

      <section className="section philosophy-section">
        <div>
          <p className="eyebrow slash">NEXS PHILOSOPHY</p>
          <h2>เราเชื่อว่า ฟิล์มที่ดี<br />ต้องทำให้รถยิ่งดูสวย เสมอ</h2>
          <p>การปกป้องที่ดีควรอยู่เบื้องหลังความสมบูรณ์แบบของผิวรถ ระบบของ NEXS จึงเชื่อมผลิตภัณฑ์ การติดตั้ง บัตรรับประกัน และบริการหลังการขายเข้าด้วยกัน</p>
          <ArrowLink href="/technology">Discover Technology</ArrowLink>
        </div>
        <div className="film-layers" aria-label="ภาพจำลองชั้นฟิล์ม"><span /><span /><span /><span /></div>
        <ul><li><b>PRODUCT TIER</b><span>กำหนดบทบาทและเงื่อนไขตามรุ่น</span></li><li><b>INSTALLATION RECORD</b><span>บันทึกผู้ติดตั้ง รถ และวันที่ติดตั้ง</span></li><li><b>DIGITAL WARRANTY</b><span>QR เชื่อมไปยังบัตรดิจิทัลโดยตรง</span></li><li><b>AFTER-SALES</b><span>Maintenance, Support และ Inspection</span></li></ul>
      </section>

      <section className="section connected-warranty-section">
        <SectionTitle eyebrow="CONNECTED WARRANTY" title="QR เดียว เชื่อม Dealer ลูกค้า และ NEXS" copy="หนึ่ง Serial เชื่อมวันที่ติดตั้ง บัตรรับประกัน การดูแล และคำขอหลังการขาย โดยไม่ต้องรอสำนักงานใหญ่เปิดบัตรให้" />
        <div className="connected-warranty-flow">
          <article><span>01</span><p className="eyebrow">DEALER</p><h3>สแกนและเปิด Serial</h3><p>ล็อกอิน สแกน QR แล้วบันทึกวันที่ติดตั้ง ระบบสร้าง Serial และคำนวณวันหมดอายุให้อัตโนมัติ</p><ArrowLink secondary href="/login">Dealer Login</ArrowLink></article>
          <b aria-hidden="true">→</b>
          <article><span>02</span><p className="eyebrow">CUSTOMER</p><h3>กรอกข้อมูลครั้งเดียว</h3><p>ใช้ QR เดิมเติมข้อมูลเจ้าของและรถ จากนั้นตรวจวันติดตั้ง วันหมดอายุ และสถานะบัตรได้ตลอด</p><ArrowLink secondary href="/warranty">ตรวจสอบบัตร</ArrowLink></article>
          <b aria-hidden="true">→</b>
          <article><span>03</span><p className="eyebrow">AFTER-SALES</p><h3>ดูแลต่อจาก QR เดิม</h3><p>Dealer เพิ่ม Maintenance ได้ทันที ส่วน NEXS ดูแล Policy, ข้อยกเว้น และตรวจสอบย้อนหลังเมื่อจำเป็น</p><ArrowLink secondary href="/support/inspection">นัดตรวจสภาพ</ArrowLink></article>
        </div>
      </section>

      <section className="section warranty-cta-section">
        <div><p className="eyebrow">NEXS DIGITAL WARRANTY</p><h2>สแกน QR หรือกรอก Serial<br />เพื่อดูบัตรรับประกันของคุณ</h2><p>ข้อมูลส่วนบุคคลบนหน้าสาธารณะจะแสดงแบบปกปิด และไม่รองรับการค้นหาด้วยเบอร์โทรหรือทะเบียนรถ</p></div>
        <Link className="home-warranty-preview" href="/r/P-TH-000124" aria-label="เปิดตัวอย่างบัตรรับประกันดิจิทัล">
          <div><Logo /><span className="status-pill status-active">ACTIVE</span></div>
          <p>DIGITAL WARRANTY · SAMPLE</p>
          <strong>P-TH-000124</strong>
          <dl><div><dt>Product</dt><dd>NEXS PRO</dd></div><div><dt>Vehicle</dt><dd>Porsche 911 · กข ••••</dd></div><div><dt>Dealer</dt><dd>NEXS Bangkok</dd></div></dl>
          <span>เปิดบัตรตัวอย่าง →</span>
        </Link>
        <WarrantyLookup compact />
      </section>

      <section className="section business-section">
        <article><span>FOR INSTALLERS</span><h2>Designed for Growth.</h2><p>ลงทะเบียนงานติดตั้ง บันทึกการดูแล และติดตามเฉพาะลูกค้าของร้าน</p><ArrowLink href="/for-dealers">Become a Dealer</ArrowLink></article>
        <article><span>FOR DEALERS</span><h2>Grow Your Business with NEXS</h2><p>ระบบ Warranty, Maintenance และ Support ที่เชื่อมต่อกับบริการหลังการขาย</p><ArrowLink href="/login">Dealer Login</ArrowLink></article>
        <div className="business-points"><p>↗ <b>Operational workflow</b><small>Factory → Dealer → Customer → After-sales</small></p><p>▤ <b>Training & support</b><small>โครงสร้างข้อมูลพร้อมขยายระบบ</small></p><p>◎ <b>Digital warranty</b><small>ตรวจสอบจาก Serial และ QR</small></p></div>
      </section>

      <section className="section home-faq-section">
        <SectionTitle eyebrow="FAQ" title="คำถามที่พบบ่อย" copy="คำตอบสั้น ๆ ก่อนเลือกผลิตภัณฑ์ ตรวจสอบบัตร หรือส่งคำขอหลังการขาย" />
        <div className="faq-page">
          {[
            ["ตรวจสอบบัตรรับประกันอย่างไร?", "สแกน QR บนบัตรหรือกรอก Serial Number ที่หน้า Warranty ระบบจะแสดงข้อมูลที่ปกปิดตามหลัก PDPA"],
            ["ควรเลือก Clear, Matte หรือ Color PPF?", "เลือกตามผิวงานและรูปแบบการใช้งาน โดย Dealer จะช่วยยืนยันรุ่นและเงื่อนไขที่อนุมัติก่อนติดตั้ง"],
            ["ถ้าบัตร QR สูญหายต้องทำอย่างไร?", "ส่งคำขอ Warranty Support พร้อม Serial Number เพื่อให้ Dealer หรือ Admin ตรวจสอบก่อนดำเนินการ"],
            ["การขอตรวจสภาพอนุมัติผลอัตโนมัติหรือไม่?", "ไม่อัตโนมัติ ทุกคำขอต้องผ่านการตรวจเงื่อนไข งานติดตั้ง และสภาพการใช้งานจริง"],
          ].map(([question, answer]) => <details key={question}><summary>{question}<span aria-hidden="true">+</span></summary><p>{answer}</p></details>)}
        </div>
        <div className="home-faq-actions"><ArrowLink href="/faq">ดูคำถามทั้งหมด</ArrowLink><ArrowLink secondary href="/contact">ติดต่อทีมงาน</ArrowLink></div>
      </section>
    </PageShell>
  );
}
