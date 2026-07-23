"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

type DealerProfileInput = {
  dealerCode: string;
  name: string;
  province: string;
  contactName: string;
  phone: string;
  email: string;
  certificationTier: string;
  status: string;
};

export function WarrantyLookup({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [serial, setSerial] = useState("");
  const [error, setError] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = serial.trim().toUpperCase();
    if (!value || value.length < 6) {
      setError("กรุณากรอก Serial Number ให้ครบ");
      return;
    }
    setError("");
    router.push(`/r/${encodeURIComponent(value)}`);
  }

  return (
    <form className={`lookup-form ${compact ? "lookup-compact" : ""}`} onSubmit={submit}>
      <label htmlFor={compact ? "serial-compact" : "serial"}>Serial Number</label>
      <div>
        <input id={compact ? "serial-compact" : "serial"} value={serial} onChange={(e) => setSerial(e.target.value)} placeholder="กรอก Serial Number" autoCapitalize="characters" autoComplete="off" inputMode="text" maxLength={64} pattern="[A-Za-z0-9-]+" aria-describedby={compact ? undefined : "serial-help"} />
        <button type="submit">ตรวจสอบ <span>→</span></button>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      {!compact && <small id="serial-help">Serial อยู่บนบัตรรับประกันหรือใต้ QR Code ใช้ตัวอักษร ตัวเลข และเครื่องหมายขีดเท่านั้น</small>}
    </form>
  );
}

export function DemoForm({ kind, initialSerial = "", profile }: { kind: "contact" | "support" | "inspection" | "dealer-register" | "maintenance" | "serial-import" | "policy" | "profile"; initialSerial?: string; profile?: DealerProfileInput }) {
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [referenceCode, setReferenceCode] = useState("");
  const [cardPath, setCardPath] = useState("");
  const labels = {
    contact: ["ส่งข้อความ", "เราได้รับข้อมูลแล้ว ทีมงานจะติดต่อกลับตามช่องทางที่ระบุ"],
    support: ["ส่งคำขอช่วยเหลือ", "สร้างคำขอแล้ว เลขอ้างอิง SUP-260722-014"],
    inspection: ["ส่งคำขอตรวจสภาพ", "สร้างคำขอแล้ว เลขอ้างอิง INS-260722-008"],
    "dealer-register": ["ลงทะเบียนบัตรรับประกัน", "ตรวจสอบข้อมูลครบแล้ว สร้างบัตรรับประกันตัวอย่างเรียบร้อย"],
    maintenance: ["บันทึกการดูแล", "บันทึก Maintenance Record แล้ว"],
    "serial-import": ["ตรวจสอบไฟล์นำเข้า", "อ่านไฟล์ตัวอย่างแล้ว: 48 รายการพร้อมใช้, 2 รายการต้องตรวจสอบ"],
    policy: ["บันทึกร่าง Policy", "บันทึกร่างแล้ว (ยังไม่เผยแพร่สู่เว็บไซต์สาธารณะ)"],
    profile: ["บันทึกข้อมูลร้าน", "บันทึกข้อมูลตัวอย่างแล้ว"],
  } as const;
  const [button, success] = labels[kind];

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (kind === "contact" || kind === "support" || kind === "inspection" || kind === "dealer-register" || kind === "maintenance" || kind === "serial-import" || kind === "policy" || kind === "profile") {
      setSubmitting(true);
      setSubmitError("");
      const form = new FormData(event.currentTarget);
      if (kind === "contact" || kind === "support" || kind === "inspection") form.set("kind", kind);
      const endpoint = kind === "dealer-register" ? "/api/dealer/warranties" : kind === "maintenance" ? "/api/dealer/maintenance" : kind === "serial-import" ? "/api/admin/serials/import" : kind === "policy" ? "/api/admin/policies" : kind === "profile" ? "/api/dealer/profile" : "/api/public-requests";
      try {
        const response = await fetch(endpoint, { method: "POST", body: form });
        const result = await response.json() as { error?: string; referenceCode?: string; serialCode?: string; cardPath?: string; recordId?: number; dealerId?: number; imported?: number; valid?: number; total?: number; policyKey?: string; status?: string; errors?: { row: number; message: string }[] };
        const successfulReference = result.referenceCode ?? result.serialCode ?? result.policyKey ?? (result.recordId ? String(result.recordId) : result.dealerId ? `Dealer ${result.dealerId}` : result.imported !== undefined ? `${result.imported} serials` : result.total !== undefined ? `${result.valid ?? 0}/${result.total} rows valid` : "");
        const rowErrors = result.errors?.slice(0, 5).map((item) => `แถว ${item.row}: ${item.message}`).join(" · ");
        if (!response.ok || !successfulReference) {
          const errorMessage = result.error || rowErrors || "ไม่สามารถบันทึกข้อมูลได้";
          throw new Error(result.referenceCode ? `${errorMessage} · ส่งให้ Admin ตรวจสอบแล้ว (${result.referenceCode})` : errorMessage);
        }
        setReferenceCode(successfulReference);
        setCardPath(result.cardPath ?? "");
        setSent(true);
      } catch (error) {
        setSubmitError(error instanceof Error ? error.message : "ไม่สามารถส่งคำขอได้ กรุณาลองใหม่อีกครั้ง");
      } finally {
        setSubmitting(false);
      }
      return;
    }
    setSent(true);
  }

  if (sent) return <div className={`success-panel ${cardPath ? "success-panel-card" : ""}`}><b>✓</b><div><h3>{referenceCode ? "บันทึกข้อมูลเรียบร้อยแล้ว" : "ดำเนินการสำเร็จในโหมดตัวอย่าง"}</h3><p>{referenceCode ? <>เลขอ้างอิง <strong>{referenceCode}</strong><br />ข้อมูลถูกบันทึกแล้วและพร้อมสำหรับขั้นตอนถัดไป</> : success}</p>{cardPath && <WarrantyQr cardPath={cardPath} serial={referenceCode} compact />}<button type="button" onClick={() => { setSent(false); setReferenceCode(""); setCardPath(""); }}>กรอกข้อมูลใหม่</button></div></div>;

  if (kind === "contact") return (
    <form className="form-grid" onSubmit={submit}>
      <Field name="contactName" label="ชื่อ-นามสกุล" placeholder="ชื่อของคุณ" required />
      <Field name="contactPhone" label="เบอร์โทรศัพท์" placeholder="08x xxx xxxx" required />
      <Field name="contactEmail" label="อีเมล" placeholder="you@example.com" type="email" />
      <label>เรื่องที่ต้องการติดต่อ<select name="subject" required defaultValue=""><option value="" disabled>เลือกหัวข้อ</option><option>แนะนำสินค้า</option><option>ค้นหาศูนย์ติดตั้ง</option><option>ตัวแทนจำหน่าย</option><option>อื่น ๆ</option></select></label>
      <label className="field-wide">ข้อความ<textarea name="detail" rows={5} placeholder="รายละเอียดที่ต้องการให้ทีมงานช่วยเหลือ" required /></label>
      <Honeypot />
      <Consent />
      {submitError && <p className="field-wide submit-error" role="alert">{submitError}</p>}
      <button className="button button-primary submit-button" type="submit" disabled={submitting}>{submitting ? "กำลังส่ง..." : `${button} →`}</button>
    </form>
  );

  if (kind === "support" || kind === "inspection") return (
    <form className="form-grid" onSubmit={submit}>
      <Field name="serialCode" label="Serial Number" placeholder="P-TH-000124" defaultValue={initialSerial} required />
      <Field name="contactName" label="ชื่อผู้ติดต่อ" placeholder="ชื่อ-นามสกุล" required />
      <Field name="contactPhone" label="เบอร์โทรศัพท์" placeholder="08x xxx xxxx" required />
      <label>ประเภทคำขอ<select name="requestType" required defaultValue=""><option value="" disabled>เลือกประเภท</option><option>{kind === "inspection" ? "นัดตรวจสภาพ" : "สอบถามการรับประกัน"}</option><option>บัตร QR สูญหาย</option><option>ต้องการข้อมูลเพิ่มเติม</option></select></label>
      <label className="field-wide">รายละเอียด<textarea name="detail" rows={5} placeholder="อธิบายอาการหรือรายละเอียดที่ต้องการให้ตรวจสอบ" required /></label>
      <label className="field-wide file-field">ภาพประกอบ (ไม่บังคับ)<input name="photos" type="file" accept="image/jpeg,image/png,image/webp" multiple /><small>แนบได้สูงสุด 3 ภาพ ไฟล์ละไม่เกิน 5 MB และจัดเก็บแบบ private</small></label>
      <Honeypot />
      <Consent />
      {submitError && <p className="field-wide submit-error" role="alert">{submitError}</p>}
      <button className="button button-primary submit-button" type="submit" disabled={submitting}>{submitting ? "กำลังส่ง..." : `${button} →`}</button>
    </form>
  );

  if (kind === "dealer-register") return (
    <form className="form-grid" onSubmit={submit}>
      <Field name="serialCode" label="Serial Number" placeholder="สแกนหรือกรอก Serial" defaultValue={initialSerial} required />
      <Field name="installDate" label="วันที่ติดตั้ง" type="date" required />
      <Field name="customerName" label="ชื่อลูกค้า" placeholder="ชื่อ-นามสกุล" required />
      <Field name="customerPhone" label="เบอร์โทรศัพท์" placeholder="08x xxx xxxx" required />
      <Field name="customerEmail" label="อีเมล (ไม่บังคับ)" placeholder="customer@example.com" type="email" />
      <Field name="vehicleMake" label="ยี่ห้อรถ" placeholder="เช่น Porsche" required />
      <Field name="vehicleModel" label="รุ่นรถ" placeholder="เช่น 911" required />
      <Field name="vehiclePlate" label="ทะเบียนรถ" placeholder="ข้อมูลนี้จะแสดงแบบปกปิดบน public card" required />
      <label className="field-wide file-field">ภาพงานติดตั้ง (ไม่บังคับ)<input name="photos" type="file" accept="image/jpeg,image/png,image/webp" multiple /><small>สูงสุด 5 ภาพ ไฟล์ละไม่เกิน 5 MB และจัดเก็บแบบ private</small></label>
      {submitError && <p className="field-wide submit-error" role="alert">{submitError}</p>}
      <button className="button button-primary submit-button" type="submit" disabled={submitting}>{submitting ? "กำลังลงทะเบียน..." : `${button} →`}</button>
    </form>
  );

  if (kind === "maintenance") return (
    <form className="form-grid" onSubmit={submit}>
      <Field name="serialCode" label="Serial Number" placeholder="ค้นหาบัตรรับประกัน" required />
      <Field name="maintenanceDate" label="วันที่เข้ารับบริการ" type="date" required />
      <label>ประเภทบริการ<select name="maintenanceType" required defaultValue=""><option value="" disabled>เลือกประเภท</option><option value="maintenance">Maintenance</option><option value="inspection">Inspection</option><option value="after_sales">After-sales support</option></select></label>
      <Field name="performedBy" label="ผู้ดำเนินการ" placeholder="ชื่อช่างหรือผู้ตรวจสภาพ" required />
      <label>ผลการตรวจ<select name="resultStatus" required defaultValue=""><option value="" disabled>เลือกผลการตรวจ</option><option value="normal">ปกติ</option><option value="follow_up">ต้องติดตามผล</option><option value="admin_review">ส่ง Admin ตรวจสอบ</option></select></label>
      <Field name="nextRecommendedDate" label="วันที่แนะนำครั้งถัดไป (ไม่บังคับ)" type="date" />
      <label className="field-wide">บันทึก<textarea name="note" rows={4} placeholder="รายละเอียดการดูแล" /></label>
      <label className="field-wide file-field">ภาพ Maintenance (ไม่บังคับ)<input name="photos" type="file" accept="image/jpeg,image/png,image/webp" multiple /><small>สูงสุด 5 ภาพ ไฟล์ละไม่เกิน 5 MB และจัดเก็บแบบ private</small></label>
      {submitError && <p className="field-wide submit-error" role="alert">{submitError}</p>}
      <button className="button button-primary submit-button" type="submit" disabled={submitting}>{submitting ? "กำลังบันทึก..." : `${button} →`}</button>
    </form>
  );

  if (kind === "serial-import") return (
    <form className="form-grid" onSubmit={submit}>
      <label className="field-wide file-field">ไฟล์ Serial CSV<input name="csv" type="file" accept=".csv,text/csv" required /><small>คอลัมน์ที่จำเป็น: serial_code, model_code, batch_code, status · สูงสุด 500 แถว / 1 MB</small></label>
      <label>โหมดนำเข้า<select name="mode" defaultValue="validate"><option value="validate">ตรวจสอบเท่านั้น</option><option value="import">ตรวจสอบและนำเข้า</option></select></label>
      <label className="field-wide consent"><input name="confirmImport" type="checkbox" /> ยืนยันว่าตรวจไฟล์และต้องการนำเข้าจริง (ใช้เฉพาะโหมดนำเข้า)</label>
      {submitError && <p className="field-wide submit-error" role="alert">{submitError}</p>}
      <button className="button button-primary submit-button" type="submit" disabled={submitting}>{submitting ? "กำลังตรวจสอบไฟล์..." : `${button} →`}</button>
    </form>
  );

  if (kind === "policy") return (
    <form className="form-grid" onSubmit={submit}>
      <Field name="policyKey" label="Policy key" placeholder="clear-prime-warranty" required />
      <label>ขั้นตอน<select name="action" defaultValue="save_draft"><option value="save_draft">บันทึกร่าง</option><option value="approve">อนุมัติร่างล่าสุด</option><option value="publish">เผยแพร่ร่างที่อนุมัติแล้ว</option></select></label>
      <label className="field-wide">ข้อความเงื่อนไข (จำเป็นเมื่อบันทึกร่าง)<textarea name="draftValue" rows={8} placeholder="ข้อความต้องผ่านการตรวจสอบก่อนเลือกอนุมัติและเผยแพร่" /></label>
      {submitError && <p className="field-wide submit-error" role="alert">{submitError}</p>}
      <button className="button button-primary submit-button" type="submit" disabled={submitting}>{submitting ? "กำลังบันทึก..." : `${button} →`}</button>
    </form>
  );

  return <div className="dealer-profile-form">
    {profile && <dl className="dealer-profile-summary">
      <div><dt>Dealer code</dt><dd>{profile.dealerCode}</dd></div>
      <div><dt>ชื่อร้าน</dt><dd>{profile.name}</dd></div>
      <div><dt>จังหวัด</dt><dd>{profile.province}</dd></div>
      <div><dt>ระดับการรับรอง</dt><dd>{profile.certificationTier || "รอ NEXS กำหนด"}</dd></div>
      <div><dt>สถานะ</dt><dd>{profile.status}</dd></div>
    </dl>}
    <form className="form-grid" onSubmit={submit}>
      <p className="field-wide form-note">ชื่อร้าน จังหวัด สถานะ และระดับการรับรองแก้ไขได้โดย NEXS Admin เท่านั้น</p>
      <Field name="contactName" label="ผู้ติดต่อ" placeholder="ชื่อผู้ดูแลร้าน" defaultValue={profile?.contactName} required />
      <Field name="phone" label="เบอร์โทรศัพท์" placeholder="02 xxx xxxx" defaultValue={profile?.phone} required />
      <Field name="email" label="อีเมล" placeholder="dealer@example.com" type="email" defaultValue={profile?.email} />
      {submitError && <p className="field-wide submit-error" role="alert">{submitError}</p>}
      <button className="button button-primary submit-button" type="submit" disabled={submitting}>{submitting ? "กำลังบันทึก..." : `${button} →`}</button>
    </form>
  </div>;
}

function Field({ label, placeholder, type = "text", required = false, name, defaultValue }: { label: string; placeholder?: string; type?: string; required?: boolean; name?: string; defaultValue?: string }) {
  return <label>{label}<input name={name} type={type} placeholder={placeholder} defaultValue={defaultValue} required={required} /></label>;
}

function Consent() {
  return <label className="field-wide consent"><input name="consent" type="checkbox" required /> ยินยอมให้ใช้ข้อมูลเพื่อดำเนินการตามคำขอ โดยข้อมูลที่แสดงต่อสาธารณะจะถูกปกปิดตามหลัก PDPA</label>;
}

function Honeypot() {
  return <label className="form-honeypot" aria-hidden="true">Company<input name="company" type="text" tabIndex={-1} autoComplete="off" /></label>;
}

export function WarrantyQr({ cardPath, serial, compact = false }: { cardPath: string; serial: string; compact?: boolean }) {
  const [dataUrl, setDataUrl] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const cardUrl = new URL(cardPath, window.location.origin).toString();
    import("qrcode").then(({ default: QRCode }) => QRCode.toDataURL(cardUrl, {
        width: compact ? 220 : 300,
        margin: 2,
        errorCorrectionLevel: "M",
        color: { dark: "#111111", light: "#ffffff" },
      })).then((value) => {
        if (active) setDataUrl(value);
      }).catch(() => {
        if (active) setError("ไม่สามารถสร้าง QR ได้ กรุณาใช้ลิงก์บัตรโดยตรง");
      });
    return () => { active = false; };
  }, [cardPath, compact]);

  return <section className={`warranty-qr ${compact ? "warranty-qr-compact" : ""}`} aria-label="QR สำหรับบัตรรับประกันดิจิทัล">
    <div>{dataUrl ? <Image src={dataUrl} alt={`QR บัตรรับประกัน ${serial}`} width={compact ? 220 : 300} height={compact ? 220 : 300} unoptimized /> : <span className="qr-loading">กำลังสร้าง QR…</span>}</div>
    <div><b>QR Digital Warranty</b><p>สแกนเพื่อเปิดบัตรที่ยืนยันด้วย Serial {serial}</p><div className="warranty-qr-actions"><a className="button button-primary" href={cardPath} target="_blank" rel="noreferrer">เปิดบัตร <span>↗</span></a>{dataUrl && <a className="button button-secondary" href={dataUrl} download={`NEXS-${serial}.png`}>ดาวน์โหลด QR <span>↓</span></a>}</div>{error && <small role="alert">{error}</small>}</div>
  </section>;
}

export function AdminRequestForm({ kind }: { kind: "support" | "inspection" }) {
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true); setMessage(""); setError("");
    const form = new FormData(event.currentTarget);
    form.set("kind", kind);
    try {
      const response = await fetch("/api/admin/requests", { method: "POST", body: form });
      const result = await response.json() as { error?: string; referenceCode?: string; status?: string };
      if (!response.ok || !result.referenceCode) throw new Error(result.error || "ไม่สามารถอัปเดตคำขอได้");
      setMessage(`${result.referenceCode} เปลี่ยนเป็น ${result.status}`);
      event.currentTarget.reset();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "ไม่สามารถอัปเดตคำขอได้"); }
    finally { setSubmitting(false); }
  }

  return <form className="form-grid" onSubmit={submit}>
    <Field name="referenceCode" label="เลขอ้างอิง" placeholder={kind === "support" ? "SUP-..." : "INS-..."} required />
    <Field name="dealerCode" label="Dealer code (เมื่อมอบหมาย)" placeholder="DLR-001" />
    <label>สถานะใหม่<select name="status" required defaultValue=""><option value="" disabled>เลือกสถานะ</option><option value="under_review">Under review</option><option value="need_inspection">Need inspection</option><option value="more_info_required">More info required</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="closed">Closed</option></select></label>
    <label className="field-wide">บันทึกภายใน<textarea name="note" rows={3} placeholder="เหตุผลหรือข้อมูลสำหรับ Audit Log" /></label>
    {error && <p className="field-wide submit-error" role="alert">{error}</p>}
    {message && <p className="field-wide submit-success" role="status">{message}</p>}
    <button className="button button-primary submit-button" type="submit" disabled={submitting}>{submitting ? "กำลังอัปเดต..." : "อัปเดตคำขอ →"}</button>
  </form>;
}

export function AdminContactRequestForm() {
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSubmitting(true); setMessage(""); setError("");
    try {
      const response = await fetch("/api/admin/contact-requests", { method: "POST", body: new FormData(event.currentTarget) });
      const result = await response.json() as { error?: string; referenceCode?: string; status?: string };
      if (!response.ok || !result.referenceCode) throw new Error(result.error || "ไม่สามารถอัปเดตคำขอติดต่อได้");
      setMessage(`${result.referenceCode} · ${result.status}`); event.currentTarget.reset();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "ไม่สามารถอัปเดตคำขอติดต่อได้"); }
    finally { setSubmitting(false); }
  }

  return <form className="form-grid" onSubmit={submit}>
    <Field name="referenceCode" label="เลขอ้างอิง" placeholder="CNT-..." required />
    <label>สถานะใหม่<select name="status" required defaultValue=""><option value="" disabled>เลือกสถานะ</option><option value="new">New</option><option value="in_progress">In progress</option><option value="closed">Closed</option></select></label>
    <label className="field-wide">บันทึกภายใน<textarea name="note" rows={3} placeholder="การติดต่อกลับหรือขั้นตอนถัดไป" /></label>
    {error && <p className="field-wide submit-error" role="alert">{error}</p>}{message && <p className="field-wide submit-success" role="status">{message}</p>}
    <button className="button button-primary submit-button" type="submit" disabled={submitting}>{submitting ? "กำลังอัปเดต..." : "บันทึกสถานะ →"}</button>
  </form>;
}

export function AdminSerialStatusForm() {
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSubmitting(true); setMessage(""); setError("");
    try {
      const response = await fetch("/api/admin/serials/status", { method: "POST", body: new FormData(event.currentTarget) });
      const result = await response.json() as { error?: string; serialCode?: string; status?: string };
      if (!response.ok || !result.serialCode) throw new Error(result.error || "ไม่สามารถอัปเดต Serial ได้");
      setMessage(`${result.serialCode} · ${result.status}`); event.currentTarget.reset();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "ไม่สามารถอัปเดต Serial ได้"); }
    finally { setSubmitting(false); }
  }

  return <form className="form-grid" onSubmit={submit}>
    <Field name="serialCode" label="Serial Number" placeholder="NEW-TH-000001" required />
    <label>สถานะใหม่<select name="status" required defaultValue=""><option value="" disabled>เลือกสถานะ</option><option value="available">Available</option><option value="suspended">Suspended</option><option value="invalid">Invalid</option></select></label>
    <label className="field-wide">เหตุผล<textarea name="note" rows={3} placeholder="เหตุผลจะถูกบันทึกใน Audit Log" required /></label>
    <p className="field-wide form-note">Serial ที่มี Warranty แล้วต้องจัดการผ่านหน้า Warranty Records เพื่อให้สถานะทั้งสองส่วนตรงกัน</p>
    {error && <p className="field-wide submit-error" role="alert">{error}</p>}{message && <p className="field-wide submit-success" role="status">{message}</p>}
    <button className="button button-primary submit-button" type="submit" disabled={submitting}>{submitting ? "กำลังอัปเดต..." : "อัปเดต Serial →"}</button>
  </form>;
}

export function AdminDealerForm() {
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSubmitting(true); setMessage(""); setError("");
    try {
      const response = await fetch("/api/admin/dealers", { method: "POST", body: new FormData(event.currentTarget) });
      const result = await response.json() as { error?: string; dealerCode?: string; status?: string };
      if (!response.ok || !result.dealerCode) throw new Error(result.error || "ไม่สามารถจัดการ Dealer ได้");
      setMessage(`${result.dealerCode} · ${result.status}`); event.currentTarget.reset();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "ไม่สามารถจัดการ Dealer ได้"); }
    finally { setSubmitting(false); }
  }

  return <form className="form-grid" onSubmit={submit}>
    <label>การดำเนินการ<select name="action" required defaultValue="create"><option value="create">สร้าง Dealer (สถานะ pending)</option><option value="set_status">เปลี่ยนสถานะ</option><option value="assign_account">ผูกบัญชีผู้ใช้</option></select></label>
    <Field name="dealerCode" label="Dealer code" placeholder="DLR-001" required />
    <Field name="name" label="ชื่อร้าน (เมื่อสร้าง)" placeholder="NEXS Authorized Dealer" />
    <Field name="province" label="จังหวัด (เมื่อสร้าง)" placeholder="Bangkok" />
    <Field name="contactName" label="ผู้ติดต่อ (เมื่อสร้าง)" placeholder="ชื่อผู้ดูแลร้าน" />
    <Field name="phone" label="เบอร์โทรศัพท์ (เมื่อสร้าง)" placeholder="02 xxx xxxx" />
    <Field name="email" label="อีเมลร้าน (ไม่บังคับ)" placeholder="dealer@example.com" type="email" />
    <Field name="certificationTier" label="ระดับการรับรอง (ไม่บังคับ)" placeholder="authorized" />
    <label>สถานะใหม่<select name="status" defaultValue="active"><option value="active">Active</option><option value="suspended">Suspended</option></select></label>
    <Field name="accountEmail" label="อีเมลบัญชี (เมื่อผูกบัญชี)" placeholder="user@example.com" type="email" />
    {error && <p className="field-wide submit-error" role="alert">{error}</p>}{message && <p className="field-wide submit-success" role="status">{message}</p>}
    <button className="button button-primary submit-button" type="submit" disabled={submitting}>{submitting ? "กำลังบันทึก..." : "บันทึก Dealer →"}</button>
  </form>;
}

export function AdminProductForm() {
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSubmitting(true); setMessage(""); setError("");
    try {
      const response = await fetch("/api/admin/products", { method: "POST", body: new FormData(event.currentTarget) });
      const result = await response.json() as { error?: string; modelCode?: string; status?: string };
      if (!response.ok || !result.modelCode) throw new Error(result.error || "ไม่สามารถจัดการผลิตภัณฑ์ได้");
      setMessage(`${result.modelCode} · ${result.status}`); event.currentTarget.reset();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "ไม่สามารถจัดการผลิตภัณฑ์ได้"); }
    finally { setSubmitting(false); }
  }
  return <form className="form-grid" onSubmit={submit}>
    <label>การดำเนินการ<select name="action" defaultValue="create"><option value="create">สร้างผลิตภัณฑ์ (Draft)</option><option value="set_status">เปลี่ยนสถานะ</option></select></label>
    <Field name="modelCode" label="Model code" placeholder="MATTE-PRIME" required />
    <Field name="name" label="ชื่อผลิตภัณฑ์ (เมื่อสร้าง)" placeholder="Matte Prime" />
    <label>หมวดผลิตภัณฑ์<select name="category" defaultValue="clear"><option value="clear">Clear</option><option value="matte">Matte</option><option value="color">Color</option></select></label>
    <Field name="warrantyYears" label="ปีรับประกัน (ไม่บังคับ)" type="number" placeholder="6" />
    <label>สถานะใหม่<select name="status" defaultValue="active"><option value="active">Active</option><option value="archived">Archived</option><option value="draft">Draft</option></select></label>
    <p className="field-wide form-note">ก่อนเปิด Active ต้องเผยแพร่ Policy key รูปแบบ product-model-code-public-copy ให้สำเร็จก่อน</p>
    {error && <p className="field-wide submit-error" role="alert">{error}</p>}{message && <p className="field-wide submit-success" role="status">{message}</p>}
    <button className="button button-primary submit-button" type="submit" disabled={submitting}>{submitting ? "กำลังบันทึก..." : "บันทึกผลิตภัณฑ์ →"}</button>
  </form>;
}

export function DealerRequestForm() {
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSubmitting(true); setMessage(""); setError("");
    try {
      const response = await fetch("/api/dealer/requests", { method: "POST", body: new FormData(event.currentTarget) });
      const result = await response.json() as { error?: string; referenceCode?: string; status?: string };
      if (!response.ok || !result.referenceCode) throw new Error(result.error || "ไม่สามารถอัปเดตคำขอได้");
      setMessage(`${result.referenceCode} · ${result.status}`); event.currentTarget.reset();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "ไม่สามารถอัปเดตคำขอได้"); }
    finally { setSubmitting(false); }
  }
  return <form className="form-grid" onSubmit={submit}>
    <label>ประเภทคำขอ<select name="kind" defaultValue="inspection"><option value="inspection">Inspection</option><option value="support">Support</option></select></label>
    <Field name="referenceCode" label="เลขอ้างอิง" placeholder="INS-... / SUP-..." required />
    <label>สถานะใหม่<select name="status" required defaultValue=""><option value="" disabled>เลือกสถานะ</option><option value="under_review">Under review</option><option value="need_inspection">Need inspection</option><option value="more_info_required">More info required</option></select></label>
    <label className="field-wide">บันทึกภายใน<textarea name="note" rows={3} placeholder="ผลการตรวจหรือข้อมูลที่ต้องติดตาม" /></label>
    <p className="field-wide form-note">Dealer อัปเดตได้เฉพาะคำขอที่ Admin มอบหมายให้ร้าน และไม่มีสิทธิ์อนุมัติหรือปฏิเสธผลสุดท้าย</p>
    {error && <p className="field-wide submit-error" role="alert">{error}</p>}{message && <p className="field-wide submit-success" role="status">{message}</p>}
    <button className="button button-primary submit-button" type="submit" disabled={submitting}>{submitting ? "กำลังอัปเดต..." : "บันทึกสถานะ →"}</button>
  </form>;
}

export function AdminWarrantyForm() {
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSubmitting(true); setMessage(""); setError("");
    try {
      const response = await fetch("/api/admin/warranties", { method: "POST", body: new FormData(event.currentTarget) });
      const result = await response.json() as { error?: string; serialCode?: string; status?: string };
      if (!response.ok || !result.serialCode) throw new Error(result.error || "ไม่สามารถอัปเดตบัตรรับประกันได้");
      setMessage(`${result.serialCode} · ${result.status}`); event.currentTarget.reset();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "ไม่สามารถอัปเดตบัตรรับประกันได้"); }
    finally { setSubmitting(false); }
  }
  return <form className="form-grid" onSubmit={submit}>
    <Field name="serialCode" label="Serial Number" placeholder="P-TH-000124" required />
    <label>สถานะใหม่<select name="status" required defaultValue=""><option value="" disabled>เลือกสถานะ</option><option value="active">Active</option><option value="under_review">Under review</option><option value="suspended">Suspended</option><option value="expired">Expired</option></select></label>
    <label className="field-wide">เหตุผล / บันทึกภายใน<textarea name="note" rows={3} placeholder="เหตุผลจะถูกเก็บใน Audit Log และไม่แสดงต่อสาธารณะ" /></label>
    {error && <p className="field-wide submit-error" role="alert">{error}</p>}{message && <p className="field-wide submit-success" role="status">{message}</p>}
    <button className="button button-primary submit-button" type="submit" disabled={submitting}>{submitting ? "กำลังอัปเดต..." : "อัปเดต Warranty →"}</button>
  </form>;
}

export function AdminMaintenanceForm() {
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSubmitting(true); setMessage(""); setError("");
    try {
      const response = await fetch("/api/admin/maintenance", { method: "POST", body: new FormData(event.currentTarget) });
      const result = await response.json() as { error?: string; serialCode?: string; recordId?: number };
      if (!response.ok || !result.serialCode) throw new Error(result.error || "ไม่สามารถบันทึก Maintenance ได้");
      setMessage(`${result.serialCode} · Record ${result.recordId}`); event.currentTarget.reset();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "ไม่สามารถบันทึก Maintenance ได้"); }
    finally { setSubmitting(false); }
  }
  return <form className="form-grid" onSubmit={submit}>
    <Field name="serialCode" label="Serial Number" placeholder="P-TH-000124" required />
    <Field name="maintenanceDate" label="วันที่บริการ" type="date" required />
    <label>ประเภทบริการ<select name="maintenanceType" required defaultValue=""><option value="" disabled>เลือกประเภท</option><option value="maintenance">Maintenance</option><option value="inspection">Inspection</option><option value="admin_correction">Admin correction</option></select></label>
    <Field name="performedBy" label="ผู้ดำเนินการ" placeholder="ชื่อช่าง ผู้ตรวจ หรือผู้บันทึก" required />
    <label>ผลการตรวจ<select name="resultStatus" required defaultValue=""><option value="" disabled>เลือกผล</option><option value="normal">Normal</option><option value="follow_up">Follow up</option><option value="under_review">Under review</option></select></label>
    <Field name="nextRecommendedDate" label="วันที่แนะนำครั้งถัดไป" type="date" />
    <label className="field-wide">บันทึก<textarea name="note" rows={3} placeholder="รายละเอียดภายใน" /></label>
    <label className="field-wide file-field">ภาพ Maintenance (ไม่บังคับ)<input name="photos" type="file" accept="image/jpeg,image/png,image/webp" multiple /><small>สูงสุด 5 ภาพ ไฟล์ละไม่เกิน 5 MB และจัดเก็บแบบ private</small></label>
    {error && <p className="field-wide submit-error" role="alert">{error}</p>}{message && <p className="field-wide submit-success" role="status">{message}</p>}
    <button className="button button-primary submit-button" type="submit" disabled={submitting}>{submitting ? "กำลังบันทึก..." : "เพิ่ม Maintenance →"}</button>
  </form>;
}

export function AdminRegistrationExceptionForm() {
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSubmitting(true); setMessage(""); setError("");
    try {
      const response = await fetch("/api/admin/registration-exceptions", { method: "POST", body: new FormData(event.currentTarget) });
      const result = await response.json() as { error?: string; referenceCode?: string; status?: string };
      if (!response.ok || !result.referenceCode) throw new Error(result.error || "ไม่สามารถบันทึกผลตรวจสอบได้");
      setMessage(`${result.referenceCode} · ${result.status}`); event.currentTarget.reset();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "ไม่สามารถบันทึกผลตรวจสอบได้"); }
    finally { setSubmitting(false); }
  }
  return <form className="form-grid" onSubmit={submit}>
    <Field name="referenceCode" label="เลขอ้างอิง Exception" placeholder="REG-260723-0001" required />
    <label>ผลการตรวจสอบ<select name="status" required defaultValue=""><option value="" disabled>เลือกผล</option><option value="resolved">Resolved</option><option value="rejected">Rejected</option></select></label>
    <label className="field-wide">บันทึกผลตรวจสอบ<textarea name="reviewNote" rows={4} placeholder="ระบุสิ่งที่ตรวจพบและขั้นตอนถัดไปสำหรับ Dealer" required /></label>
    {error && <p className="field-wide submit-error" role="alert">{error}</p>}{message && <p className="field-wide submit-success" role="status">{message}</p>}
    <button className="button button-primary submit-button" type="submit" disabled={submitting}>{submitting ? "กำลังบันทึก..." : "บันทึกผลตรวจสอบ →"}</button>
  </form>;
}
