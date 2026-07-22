'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

export function WarrantySearchForm() {
  const router = useRouter();
  const [error, setError] = useState('');

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const serial = String(formData.get('serial') ?? '').trim().toUpperCase();

    if (!/^[A-Z0-9]+-[A-Z0-9-]{6,}$/.test(serial)) {
      setError('กรุณากรอก Serial Number ให้ถูกต้อง เช่น PRO-1196MXY0401178Q');
      return;
    }

    setError('');
    router.push(`/r/${encodeURIComponent(serial)}`);
  }

  return (
    <form className="form-shell" onSubmit={submit}>
      <label htmlFor="serial">กรอกหมายเลข Serial Number</label>
      <div className="input-row">
        <input id="serial" name="serial" className="mono" required placeholder="เช่น PRO-1196MXY0401178Q" />
        <button className="button primary" type="submit">ตรวจสอบสถานะ</button>
      </div>
      {error && <p role="alert">{error}</p>}
      <p>ลูกค้าไม่สามารถเปิดใช้งานบัตรรับประกันเอง การลงทะเบียนต้องให้ Dealer/Admin ลงทะเบียนหลังติดตั้ง</p>
    </form>
  );
}
