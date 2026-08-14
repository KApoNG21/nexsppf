"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function normalizeWarrantySerial(value: string) {
  const raw = value.trim();
  if (!raw) return "";
  try {
    const url = new URL(raw, "https://nexsppf.com");
    const query = url.searchParams.get("serial") || url.searchParams.get("code") || url.searchParams.get("qr");
    const route = url.pathname.match(/\/r\/([^/?#]+)/i);
    return (query || (route ? decodeURIComponent(route[1]) : raw)).trim().toUpperCase().replace(/\s+/g, "");
  } catch {
    return raw.toUpperCase().replace(/\s+/g, "");
  }
}

function validSerial(value: string) { return /^[A-Z0-9-]{6,64}$/.test(value); }

export function WarrantyLookup({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [serial, setSerial] = useState("");
  const [error, setError] = useState("");
  const [scanning, setScanning] = useState(false);
  const [navigating, setNavigating] = useState(false);

  const openSerial = useCallback((raw: string) => {
    const value = normalizeWarrantySerial(raw);
    if (!validSerial(value)) { setError("ไม่พบ Serial ที่ถูกต้อง กรุณาสแกนใหม่หรือกรอกเฉพาะตัวอักษร ตัวเลข และขีด -"); return false; }
    setError(""); setSerial(value); setNavigating(true);
    router.push(`/r/${encodeURIComponent(value)}`);
    return true;
  }, [router]);
  const closeScanner = useCallback(() => setScanning(false), []);

  return <>
    <form className={`lookup-form warranty-lookup ${compact ? "lookup-compact" : ""}`} onSubmit={(event) => { event.preventDefault(); openSerial(serial); }} noValidate>
      <label htmlFor={compact ? "serial-compact" : "serial"}>Serial Number</label>
      <div className="lookup-entry"><input id={compact ? "serial-compact" : "serial"} value={serial} onChange={(event) => { setSerial(event.target.value); setError(""); }} placeholder="เช่น P-TH-000124" autoCapitalize="characters" autoComplete="off" inputMode="text" maxLength={160} spellCheck={false} aria-invalid={Boolean(error)} aria-describedby={compact ? undefined : "serial-help"} /><button type="submit" disabled={navigating}>{navigating ? "กำลังตรวจสอบ…" : "ตรวจสอบ"} <span>→</span></button></div>
      {!compact && <button className="warranty-scan-button" type="button" onClick={() => setScanning(true)}><span aria-hidden="true">▣</span> สแกน QR ด้วยกล้อง</button>}
      {error && <p className="form-error" role="alert">{error}</p>}
      {!compact && <small id="serial-help">สแกน QR บนบัตร หรือกรอก Serial ใต้ QR ระบบรองรับทั้งรหัสและลิงก์จาก QR</small>}
    </form>
    {scanning && <WarrantyScanner onDetected={openSerial} onClose={closeScanner} />}
  </>;
}

function WarrantyScanner({ onDetected, onClose }: { onDetected: (value: string) => boolean; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<"requesting" | "active" | "error">("requesting");
  const [message, setMessage] = useState("กำลังขออนุญาตใช้กล้องหลัง…");
  useEffect(() => {
    const previousOverflow = document.body.style.overflow; document.body.style.overflow = "hidden";
    let cancelled = false; let controls: { stop: () => void } | null = null;
    async function start() {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) { setStatus("error"); setMessage("เบราว์เซอร์นี้เปิดกล้องสดไม่ได้ กรุณาถ่ายรูป QR หรือกรอก Serial แทน"); return; }
      try {
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        if (!videoRef.current || cancelled) return;
        controls = await new BrowserMultiFormatReader().decodeFromConstraints({ audio: false, video: { facingMode: { ideal: "environment" } } }, videoRef.current, (result) => {
          if (!result) return;
          if (onDetected(result.getText())) { navigator.vibrate?.(80); controls?.stop(); onClose(); }
          else setMessage("อ่าน QR ได้ แต่ไม่พบ Serial ที่ถูกต้อง กรุณาลอง QR บนบัตร NEXS");
        });
        if (!cancelled) { setStatus("active"); setMessage("จ่อ QR ให้อยู่ในกรอบ ระบบจะอ่านให้อัตโนมัติ"); }
      } catch (error) {
        if (cancelled) return;
        setStatus("error");
        setMessage(error instanceof DOMException && error.name === "NotAllowedError" ? "ยังไม่ได้อนุญาตใช้กล้อง กรุณาอนุญาต Camera หรือถ่ายรูป QR แทน" : "เปิดกล้องไม่สำเร็จ กรุณาถ่ายรูป QR หรือกรอก Serial แทน");
      }
    }
    void start();
    return () => { cancelled = true; controls?.stop(); if (videoRef.current?.srcObject instanceof MediaStream) videoRef.current.srcObject.getTracks().forEach((track) => track.stop()); document.body.style.overflow = previousOverflow; };
  }, [onClose, onDetected]);

  async function scanPhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const photo = event.target.files?.[0]; event.target.value = ""; if (!photo) return;
    setMessage("กำลังอ่าน QR จากรูป…"); const url = URL.createObjectURL(photo);
    try { const { BrowserMultiFormatReader } = await import("@zxing/browser"); const result = await new BrowserMultiFormatReader().decodeFromImageUrl(url); if (!onDetected(result.getText())) throw new Error("invalid"); onClose(); }
    catch { setStatus("error"); setMessage("อ่าน QR จากรูปไม่สำเร็จ กรุณาถ่ายให้ชัด เต็มกรอบ และไม่มีแสงสะท้อน"); }
    finally { URL.revokeObjectURL(url); }
  }

  return <div className="warranty-scanner-backdrop" role="dialog" aria-modal="true" aria-label="สแกน QR บัตรรับประกัน"><section className="warranty-scanner-modal"><header><div><span>QR SCANNER</span><h2>สแกนบัตรรับประกัน</h2></div><button type="button" onClick={onClose} aria-label="ปิดกล้อง">×</button></header><div className="warranty-scanner-view"><video ref={videoRef} muted playsInline /><div className="warranty-scanner-frame" />{status !== "active" && <b>กำลังเตรียมกล้อง…</b>}</div><p className={status === "error" ? "scanner-error" : ""} aria-live="polite">{message}</p><div className="warranty-scanner-actions"><label><input type="file" accept="image/*" capture="environment" onChange={scanPhoto} /><span>ถ่ายรูป QR เพื่อสแกน</span></label><button type="button" onClick={onClose}>กรอก Serial เอง</button></div><small>หากเปิดจาก LINE แล้วกล้องไม่ขึ้น ให้เลือก “เปิดใน Safari/Chrome” หรือใช้ปุ่มถ่ายรูป</small></section></div>;
}

type CustomerData = { customerName: string; customerPhone: string; customerEmail: string; vehicleMake: string; vehicleModel: string; vehiclePlate: string };
const emptyCustomer: CustomerData = { customerName: "", customerPhone: "", customerEmail: "", vehicleMake: "", vehicleModel: "", vehiclePlate: "" };

export function CustomerWarrantyForm({ serial }: { serial: string }) {
  const [checking, setChecking] = useState(true);
  const [eligibility, setEligibility] = useState<"ready" | "active" | "not-ready" | "unavailable">("unavailable");
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [data, setData] = useState(emptyCustomer);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!validSerial(serial)) { setChecking(false); setEligibility("not-ready"); return; }
    let active = true;
    fetch(`/api/warranty/${encodeURIComponent(serial)}`, { cache: "no-store" }).then(async (response) => ({ response, result: await response.json() as { status?: string } })).then(({ response, result }) => {
      if (!active) return;
      setEligibility(result.status === "profile-required" ? "ready" : result.status === "active" || result.status === "expired" ? "active" : response.status === 503 ? "unavailable" : "not-ready");
    }).catch(() => active && setEligibility("unavailable")).finally(() => active && setChecking(false));
    return () => { active = false; };
  }, [serial]);

  function update(name: keyof CustomerData, value: string) { setData((current) => ({ ...current, [name]: value })); setError(""); }
  function next(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step === 1) {
      const digits = data.customerPhone.replace(/\D/g, "");
      if (data.customerName.trim().length < 2) return setError("กรุณากรอกชื่อ-นามสกุลให้ครบ");
      if (digits.length < 9 || digits.length > 10) return setError("กรุณากรอกเบอร์โทรศัพท์ 9–10 หลัก");
      if (data.customerEmail && !/^\S+@\S+\.\S+$/.test(data.customerEmail)) return setError("รูปแบบอีเมลไม่ถูกต้อง");
      setStep(2); setError(""); return;
    }
    if (step === 2) {
      if (data.vehicleMake.trim().length < 2 || data.vehicleModel.trim().length < 1 || data.vehiclePlate.trim().length < 2) return setError("กรุณากรอกยี่ห้อ รุ่น และทะเบียนรถให้ครบ");
      setStep(3); setError(""); return;
    }
    if (!consent) return setError("กรุณายืนยันความยินยอมก่อนเปิดบัตรรับประกัน");
    void submit();
  }
  async function submit() {
    setSubmitting(true); setError(""); const form = new FormData(); form.set("serialCode", serial);
    Object.entries(data).forEach(([key, value]) => form.set(key, value.trim())); form.set("customerPhone", data.customerPhone.replace(/\D/g, "")); form.set("consent", "on");
    try { const response = await fetch("/api/warranty/complete", { method: "POST", body: form }); const result = await response.json() as { error?: string }; if (!response.ok) throw new Error(result.error || "ไม่สามารถเปิดบัตรรับประกันได้"); setDone(true); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "ไม่สามารถเปิดบัตรรับประกันได้"); }
    finally { setSubmitting(false); }
  }

  if (checking) return <div className="warranty-precheck" aria-live="polite"><b>กำลังตรวจสอบ Serial…</b><p>รอสักครู่ ระบบกำลังยืนยันว่าบัตรพร้อมให้กรอกข้อมูล</p></div>;
  if (eligibility === "active") return <div className="warranty-precheck precheck-success"><b>บัตรนี้เปิดใช้งานสมบูรณ์แล้ว</b><p>ไม่ต้องกรอกข้อมูลซ้ำ คุณสามารถเปิดดูบัตรได้ทันที</p><a className="button button-primary" href={`/r/${encodeURIComponent(serial)}`}>ดูบัตรรับประกัน →</a></div>;
  if (eligibility !== "ready") return <div className="warranty-precheck"><b>{eligibility === "unavailable" ? "ยังตรวจสอบสถานะไม่ได้" : "บัตรนี้ยังไม่พร้อมให้กรอกข้อมูล"}</b><p>{eligibility === "unavailable" ? "กรุณาลองอีกครั้งในภายหลัง หรือติดต่อ NEXS หากยังพบปัญหา" : "โปรดให้ศูนย์ติดตั้งเปิดใช้งาน Serial ก่อน หรือกลับไปตรวจสอบรหัสอีกครั้ง"}</p><a className="button button-secondary" href={`/r/${encodeURIComponent(serial)}`}>ดูสถานะบัตร →</a></div>;
  if (done) return <div className="warranty-precheck precheck-success"><b>เปิดบัตรรับประกันเรียบร้อยแล้ว</b><p>ข้อมูลถูกบันทึกแล้ว ใช้ QR เดิมตรวจสอบบัตรและประวัติบริการได้ตลอด</p><a className="button button-primary" href={`/r/${encodeURIComponent(serial)}`}>ดูบัตรรับประกัน →</a></div>;

  return <form className="customer-step-form" onSubmit={next} noValidate>
    <div className="customer-form-progress" aria-label={`ขั้นตอน ${step} จาก 3`}>{["ข้อมูลเจ้าของรถ", "ข้อมูลรถ", "ตรวจสอบและยืนยัน"].map((label, index) => <span key={label} className={index + 1 <= step ? "active" : ""}><b>{index + 1}</b><small>{label}</small></span>)}</div>
    <p className="serial-confirmed"><span>✓ Serial พร้อมลงทะเบียน</span><strong>{serial}</strong></p>
    {step === 1 && <fieldset><legend>ข้อมูลเจ้าของรถ</legend><p>ใช้สำหรับติดต่อเรื่องสิทธิ์รับประกันเท่านั้น ข้อมูลจะไม่แสดงต่อสาธารณะ</p><label>ชื่อ-นามสกุล<input autoComplete="name" maxLength={120} value={data.customerName} onChange={(e) => update("customerName", e.target.value)} placeholder="ชื่อเจ้าของรถ" required /></label><label>เบอร์โทรศัพท์<input autoComplete="tel" inputMode="tel" maxLength={14} value={data.customerPhone} onChange={(e) => update("customerPhone", e.target.value)} placeholder="08x xxx xxxx" required /></label><label>อีเมล <small>(ไม่บังคับ)</small><input autoComplete="email" inputMode="email" type="email" maxLength={160} value={data.customerEmail} onChange={(e) => update("customerEmail", e.target.value)} placeholder="customer@example.com" /></label></fieldset>}
    {step === 2 && <fieldset><legend>ข้อมูลรถ</legend><p>ทะเบียนรถที่แสดงบนบัตรสาธารณะจะถูกปกปิดบางส่วน</p><label>ยี่ห้อรถ<input autoComplete="off" maxLength={80} value={data.vehicleMake} onChange={(e) => update("vehicleMake", e.target.value)} placeholder="เช่น Porsche" required /></label><label>รุ่นรถ<input autoComplete="off" maxLength={120} value={data.vehicleModel} onChange={(e) => update("vehicleModel", e.target.value)} placeholder="เช่น 911 Carrera" required /></label><label>ทะเบียนรถ<input autoComplete="off" maxLength={40} value={data.vehiclePlate} onChange={(e) => update("vehiclePlate", e.target.value)} placeholder="เช่น 1กก 1234 กรุงเทพฯ" required /></label></fieldset>}
    {step === 3 && <fieldset><legend>ตรวจสอบก่อนยืนยัน</legend><dl className="customer-review"><div><dt>เจ้าของรถ</dt><dd>{data.customerName}</dd></div><div><dt>เบอร์โทร</dt><dd>{data.customerPhone}</dd></div><div><dt>อีเมล</dt><dd>{data.customerEmail || "ไม่ได้ระบุ"}</dd></div><div><dt>รถ</dt><dd>{data.vehicleMake} {data.vehicleModel}</dd></div><div><dt>ทะเบียน</dt><dd>{data.vehiclePlate}</dd></div></dl><label className="customer-consent"><input type="checkbox" checked={consent} onChange={(e) => { setConsent(e.target.checked); setError(""); }} /><span>ยินยอมให้ NEXS และศูนย์ติดตั้งใช้ข้อมูลนี้เพื่อออกบัตรและให้บริการรับประกัน ตามนโยบายความเป็นส่วนตัว</span></label></fieldset>}
    {error && <p className="submit-error" role="alert">{error}</p>}
    <div className="customer-form-actions">{step > 1 && <button className="button button-secondary" type="button" onClick={() => { setStep((step - 1) as 1 | 2); setError(""); }}>ย้อนกลับ</button>}<button className="button button-primary" type="submit" disabled={submitting}>{submitting ? "กำลังบันทึก…" : step < 3 ? "ถัดไป →" : "ยืนยันและเปิดบัตร →"}</button></div>
  </form>;
}
