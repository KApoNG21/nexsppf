import { PageShell, SectionTitle } from "../components";
import { WarrantyLookup } from "../client-ui";

export default function WarrantySearchPage() {
  return (
    <PageShell className="warranty-search-page">
      <section className="warranty-search-hero">
        <div><p className="eyebrow slash">NEXS DIGITAL WARRANTY</p><h1>ตรวจสอบบัตรรับประกัน</h1><p>สแกน QR จากบัตรหรือกรอก Serial Number เพื่อดูสถานะสินค้า งานติดตั้ง และบริการหลังการขาย</p></div>
        <WarrantyLookup />
      </section>
      <section className="section warranty-how"><SectionTitle title="ข้อมูลที่คุณจะตรวจสอบได้" /><div>{[["01", "Warranty Status", "Active, Not Registered, Expired หรือ Under Review"], ["02", "Product & Serial", "รุ่นสินค้าและ Serial หลักในระบบ"], ["03", "Installation", "วันที่ติดตั้งและ Dealer ที่รับผิดชอบ"], ["04", "After-sales", "สรุป Maintenance และช่องทาง Support / Inspection"]].map(([n, t, c]) => <article key={n}><b>{n}</b><h2>{t}</h2><p>{c}</p></article>)}</div></section>
      <section className="section privacy-note"><b>Privacy by design</b><p>หน้าสาธารณะแสดงข้อมูลรถและลูกค้าแบบปกปิด ไม่รองรับการค้นหาด้วยเบอร์โทร ทะเบียนรถ หมายเลขตัวถัง หรืออีเมล</p></section>
    </PageShell>
  );
}
