'use client';

import { useState, type FormEvent } from 'react';
import { SITE_COPY } from '@/content/site-content';

const PRODUCT_INTEREST_OPTIONS = [
  'Not sure / Need recommendation',
  'Clear PPF',
  'Matte PPF',
  'Color PPF',
  'Ultimate Carbon Fiber',
  'Dealer / Installer inquiry',
  'Digital Warranty inquiry',
] as const;

type SubmitState =
  | { status: 'idle' }
  | { status: 'submitting' }
  | { status: 'success'; referenceNumber: string; message: string }
  | { status: 'error'; message: string };

async function submitContact(event: FormEvent<HTMLFormElement>, setState: (state: SubmitState) => void) {
  event.preventDefault();
  setState({ status: 'submitting' });

  const response = await fetch('/api/contact', {
    method: 'POST',
    body: new FormData(event.currentTarget),
  });
  const payload = await response.json() as { referenceNumber?: string; message?: string; error?: string };

  if (!response.ok || !payload.referenceNumber) {
    setState({ status: 'error', message: payload.error ?? 'ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่อีกครั้ง' });
    return;
  }

  event.currentTarget.reset();
  setState({ status: 'success', referenceNumber: payload.referenceNumber, message: payload.message ?? 'บันทึกข้อมูลแล้ว' });
}

export function ContactLeadForm() {
  const [state, setState] = useState<SubmitState>({ status: 'idle' });

  return (
    <form className="form-shell premium-form-shell" onSubmit={(event) => void submitContact(event, setState)}>
      <label htmlFor="contact-name">Name <span className="required-mark">*</span></label>
      <input id="contact-name" name="name" required autoComplete="name" placeholder="Your name" />

      <label htmlFor="contact-phone">Phone <span className="required-mark">*</span></label>
      <input id="contact-phone" name="phone" required autoComplete="tel" placeholder="08x-xxx-xxxx" />

      <label htmlFor="contact-line">LINE ID</label>
      <input id="contact-line" name="lineId" placeholder="nexsppf or your LINE ID" />

      <label htmlFor="contact-province">Province <span className="required-mark">*</span></label>
      <input id="contact-province" name="province" required placeholder="Province" />

      <label htmlFor="contact-car">Vehicle model</label>
      <input id="contact-car" name="vehicleModel" placeholder="Porsche 911 / Tesla Model Y / etc." />

      <label htmlFor="contact-product">Product interest</label>
      <select id="contact-product" name="productInterest">
        {PRODUCT_INTEREST_OPTIONS.map((option) => <option key={option}>{option}</option>)}
      </select>

      <label htmlFor="contact-type">Contact type <span className="required-mark">*</span></label>
      <select id="contact-type" name="contactType" required>
        {SITE_COPY.leadForm.customerTypes.map((type) => <option key={type}>{type}</option>)}
      </select>

      <label htmlFor="contact-message">Message</label>
      <textarea id="contact-message" name="message" placeholder="Tell us about your vehicle, preferred finish, city, or dealer inquiry" />

      <label className="checkbox-row" htmlFor="contact-pdpa">
        <input id="contact-pdpa" name="pdpaConsent" type="checkbox" required value="accepted" />
        <span>{SITE_COPY.leadForm.pdpaConsentLabel} <a href={SITE_COPY.leadForm.privacyPolicyHref}>Privacy Policy</a></span>
      </label>

      <p className="form-note">Required: name, phone, province, contact type, and contact consent.</p>
      <button className="button primary" type="submit" disabled={state.status === 'submitting'}>
        {state.status === 'submitting' ? 'กำลังบันทึกข้อมูล...' : SITE_COPY.leadForm.submitCta}
      </button>
      <div role="status" aria-live="polite">
        {state.status === 'success' && <p className="form-note">Reference: <strong>{state.referenceNumber}</strong> — {state.message}</p>}
        {state.status === 'error' && <p className="form-note">{state.message}</p>}
      </div>
    </form>
  );
}
