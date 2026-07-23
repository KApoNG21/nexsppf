"use client";

import { useState, type FormEvent } from "react";

export function ChangePasswordForm({ returnTo }: { returnTo: string }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        body: new FormData(event.currentTarget),
      });
      const result = await response.json() as { error?: string; returnTo?: string };
      if (!response.ok || !result.returnTo) throw new Error(result.error || "ไม่สามารถเปลี่ยนรหัสผ่านได้");
      window.location.assign(result.returnTo);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "ไม่สามารถเปลี่ยนรหัสผ่านได้");
      setSubmitting(false);
    }
  }

  return (
    <form className="partner-login-form password-change-form" onSubmit={submit}>
      <input type="hidden" name="returnTo" value={returnTo} />
      <label>รหัสผ่านปัจจุบันหรือรหัสชั่วคราว<input name="currentPassword" type="password" autoComplete="current-password" required /></label>
      <label>รหัสผ่านใหม่<input name="newPassword" type="password" autoComplete="new-password" minLength={12} maxLength={128} required /></label>
      <label>ยืนยันรหัสผ่านใหม่<input name="confirmPassword" type="password" autoComplete="new-password" minLength={12} maxLength={128} required /></label>
      <p className="form-note">อย่างน้อย 12 ตัว และต้องมีตัวอักษรกับตัวเลข</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="button button-primary" type="submit" disabled={submitting}>{submitting ? "กำลังบันทึก..." : "ตั้งรหัสผ่านใหม่ →"}</button>
    </form>
  );
}
