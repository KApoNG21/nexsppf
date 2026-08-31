import { PageShell, SectionTitle } from "../components";
import { WarrantyLookup } from "../warranty-client";

export default function WarrantySearchPage() {
  return (
    <PageShell className="warranty-search-page">
      <section className="warranty-search-hero">
        <div><p className="eyebrow slash">NEXS DIGITAL WARRANTY</p><h1>ตรวจสอบบัตรรับประกัน</h1><p>สแกน QR บนบัตรด้วยกล้อง หรือกรอก Serial เพื่อดูสถานะสินค้า วันรับประกัน และบริการหลังการขาย</p></div>
        <WarrantyLookup />
      </section>
      <section className="section warranty-how"><SectionTitle title="สแกนครั้งเดียว แล้วรู้ว่าต้องทำอะไรต่อ" /><div>{[["01", "สถานะบัตร", "พร้อมใช้งาน รอกรอกข้อมูล หมดอายุ หรืออยู่ระหว่างตรวจสอบ"], ["02", "สินค้าและ Serial", "ตรวจสอบรุ่นฟิล์มและ Serial ว่าตรงกับสินค้าของคุณ"], ["03", "งานติดตั้ง", "ดูวันที่ติดตั้ง วันหมดอายุ และศูนย์ติดตั้งที่รับผิดชอบ"], ["04", "บริการหลังการขาย", "ดูประวัติการดูแล นัดตรวจสภาพ หรือติดต่อเรื่องรับประกัน"]].map(([n, t, c]) => <article key={n}><b>{n}</b><h2>{t}</h2><p>{c}</p></article>)}</div></section>
      <section className="section privacy-note"><b>ข้อมูลของคุณได้รับการปกป้อง</b><p>หน้าบัตรสาธารณะปกปิดข้อมูลส่วนตัวและทะเบียนรถ ไม่สามารถค้นหาบัตรด้วยชื่อ เบอร์โทร ทะเบียนรถ หมายเลขตัวถัง หรืออีเมล</p></section>
    </PageShell>
  );
}
