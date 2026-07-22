'use client';

import { useState, type FormEvent } from 'react';

type SubmitState =
  | { status: 'idle' }
  | { status: 'submitting' }
  | { status: 'success'; referenceNumber: string; message: string }
  | { status: 'error'; message: string };

async function submitSupportForm(event: FormEvent<HTMLFormElement>, setState: (state: SubmitState) => void) {
  event.preventDefault();
  setState({ status: 'submitting' });

  const response = await fetch('/api/support/warranty', {
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

export default function LostWarrantySupportPage() {
  const [state, setState] = useState<SubmitState>({ status: 'idle' });

  return (
    <main className="variant-b-shell variant-b-support-shell">
      <section className="variant-b-support-hero">
        <p className="variant-b-eyebrow">Support · Lost Warranty</p>
        <h1>แจ้งบัตรรับประกันหรือ QR สูญหาย</h1>
        <p>
          กรอกข้อมูลเบื้องต้น ทีมงาน NEXS หรือตัวแทนจำหน่ายจะตรวจสอบสิทธิ์ของคุณ
          ก่อนแสดง record และดำเนินการออกบัตร / QR ใหม่
        </p>
      </section>

      <section className="variant-b-support-body">
        <form className="variant-b-support-form" onSubmit={(event) => void submitSupportForm(event, setState)}>
          <label className="wide">
            Serial Code <span className="opt">(ถ้ามี)</span>
            <input name="serialCode" className="mono" placeholder="เช่น PRO-1196MXY0401178Q" />
          </label>
          <label>
            ชื่อ–นามสกุล
            <input name="name" required autoComplete="name" />
          </label>
          <label>
            เบอร์ติดต่อ
            <input name="phone" required autoComplete="tel" placeholder="ใช้สำหรับยืนยันสิทธิ์" />
          </label>
          <label>
            วันที่ติดตั้ง <span className="opt">(โดยประมาณ)</span>
            <input name="installDateApprox" placeholder="เดือน / ปี" />
          </label>
          <label>
            ตัวแทนจำหน่ายที่ติดตั้ง <span className="opt">(ถ้าจำได้)</span>
            <input name="dealerName" />
          </label>
          <label className="wide">
            รายละเอียดเบื้องต้น
            <textarea name="description" placeholder="แจ้งสาเหตุการสูญหาย / รายละเอียดที่จำได้" />
          </label>
          <p className="variant-b-support-note wide">
            ข้อมูลจริงจะต้องตรวจสอบสิทธิ์ก่อนแสดง record และรูปที่เกี่ยวข้อง
            ระบบจะไม่เปิดเผยข้อมูลของบัตรทันทีเพื่อความปลอดภัย
          </p>
          <label className="variant-b-checkbox wide">
            <input name="pdpaConsent" type="checkbox" required value="accepted" /> ยินยอมตาม PDPA และเข้าใจว่าเป็นคำขอตรวจสอบ ไม่ใช่การออกบัตรอัตโนมัติ
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
