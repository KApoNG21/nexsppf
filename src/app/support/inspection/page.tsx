'use client';

import { useState, type FormEvent } from 'react';

type SubmitState =
  | { status: 'idle' }
  | { status: 'submitting' }
  | { status: 'success'; referenceNumber: string; message: string }
  | { status: 'error'; message: string };

async function submitInspectionForm(event: FormEvent<HTMLFormElement>, setState: (state: SubmitState) => void) {
  event.preventDefault();
  setState({ status: 'submitting' });

  const response = await fetch('/api/support/inspection', {
    method: 'POST',
    body: new FormData(event.currentTarget),
  });
  const payload = await response.json() as { referenceNumber?: string; message?: string; error?: string };

  if (!response.ok || !payload.referenceNumber) {
    setState({ status: 'error', message: payload.error ?? 'ไม่สามารถบันทึกคำขอได้ กรุณาลองใหม่อีกครั้ง' });
    return;
  }

  event.currentTarget.reset();
  setState({ status: 'success', referenceNumber: payload.referenceNumber, message: payload.message ?? 'บันทึกคำขอแล้ว' });
}

export default function InspectionRequestPage() {
  const [state, setState] = useState<SubmitState>({ status: 'idle' });

  return (
    <main className="variant-b-shell variant-b-support-shell">
      <section className="variant-b-support-hero">
        <p className="variant-b-eyebrow">Support · Inspection</p>
        <h1>แจ้งนัดตรวจสอบฟิล์มและงานหลังการติดตั้ง</h1>
        <p>
          ส่งคำขอตรวจสอบให้ทีม NEXS หรือตัวแทนจำหน่ายในพื้นที่
          ทีมงานจะตรวจสอบ record ตามสิทธิ์ก่อนนัดหมายต่อไป
        </p>
      </section>

      <section className="variant-b-support-body">
        <form className="variant-b-support-form" onSubmit={(event) => void submitInspectionForm(event, setState)}>
          <label>
            Serial Code
            <input name="serialCode" required className="mono" />
          </label>
          <label>
            รุ่นสินค้า
            <select name="productModel" defaultValue="PRIME">
              <option>BEGIN</option>
              <option>PRIME</option>
              <option>PRO</option>
              <option>ULTIMATE</option>
            </select>
          </label>
          <label>
            วันที่ติดตั้ง <span className="opt">(โดยประมาณ)</span>
            <input name="installDateApprox" placeholder="เดือน / ปี" />
          </label>
          <label>
            ตัวแทนจำหน่าย
            <input name="dealerName" placeholder="ชื่อร้าน / สาขา" />
          </label>
          <label className="wide">
            รายละเอียดที่ต้องการให้ตรวจสอบ
            <textarea name="description" required placeholder="ระบุพื้นที่ / อาการ / สิ่งที่สังเกตเห็น" />
          </label>
          <label className="variant-b-support-photo wide">
            <span>รูปประกอบ <span className="opt">(ไม่บังคับ)</span></span>
            <input name="photos" type="file" accept="image/png,image/jpeg,image/webp,image/heic,image/heif" multiple />
            <p>กรุณาเลือกรูปที่ไม่ติดข้อมูลส่วนตัว เช่น ทะเบียนรถ รูปจะถูกเก็บแบบ private เพื่อรอตรวจสอบ</p>
          </label>
          <p className="variant-b-support-note wide">
            การส่งคำขอนี้ ไม่ใช่ การอนุมัติเคลมอัตโนมัติ ทีมงานจะตรวจสอบ record
            ตามสิทธิ์ก่อนนัดหมายหรือเปิดเคสในระบบ
          </p>
          <label className="variant-b-checkbox wide">
            <input name="pdpaConsent" type="checkbox" required value="accepted" /> ยินยอมตาม PDPA และยอมรับว่าเป็นคำขอตรวจสอบ
          </label>
          <button type="submit" disabled={state.status === 'submitting'}>{state.status === 'submitting' ? 'กำลังบันทึกคำขอ...' : 'ส่งคำขอตรวจสอบ'}</button>
          <div className="wide" role="status" aria-live="polite">
            {state.status === 'success' && (
              <p className="variant-b-support-note">บันทึกคำขอแล้ว Reference: <strong>{state.referenceNumber}</strong> — {state.message}</p>
            )}
            {state.status === 'error' && <p className="variant-b-support-note">{state.message}</p>}
          </div>
        </form>
      </section>
    </main>
  );
}
