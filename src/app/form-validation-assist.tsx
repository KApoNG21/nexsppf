"use client";

import { useEffect } from "react";

type ValidatableControl = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

let messageSequence = 0;

function validationMessage(control: ValidatableControl) {
  const validity = control.validity;
  if (validity.valueMissing) return control.type === "checkbox" ? "กรุณายืนยันช่องนี้ก่อนดำเนินการต่อ" : "กรุณากรอกข้อมูลในช่องนี้";
  if (validity.typeMismatch) return "รูปแบบข้อมูลไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง";
  if (validity.patternMismatch) return "รูปแบบข้อมูลไม่ตรงตามที่กำหนด";
  if (validity.tooShort && (control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement)) return `กรุณากรอกอย่างน้อย ${control.minLength} ตัวอักษร`;
  if (validity.tooLong && (control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement)) return `ข้อมูลยาวเกินกำหนด (${control.maxLength} ตัวอักษร)`;
  if (validity.rangeUnderflow && control instanceof HTMLInputElement) return `ค่าต้องไม่น้อยกว่า ${control.min}`;
  if (validity.rangeOverflow && control instanceof HTMLInputElement) return `ค่าต้องไม่เกิน ${control.max}`;
  if (validity.stepMismatch || validity.badInput) return "กรุณากรอกค่าให้ถูกต้อง";
  return "กรุณาตรวจสอบข้อมูลในช่องนี้";
}

function clearValidation(control: ValidatableControl) {
  const id = control.dataset.validationMessageId;
  if (!id) return;
  control.classList.remove("field-validation-error");
  control.removeAttribute("aria-invalid");
  document.getElementById(id)?.remove();
  const describedBy = (control.getAttribute("aria-describedby") ?? "").split(/\s+/).filter((value) => value && value !== id);
  if (describedBy.length) control.setAttribute("aria-describedby", describedBy.join(" "));
  else control.removeAttribute("aria-describedby");
  delete control.dataset.validationMessageId;
}

function showValidation(control: ValidatableControl) {
  clearValidation(control);
  const message = document.createElement("small");
  const id = `field-validation-${++messageSequence}`;
  message.id = id;
  message.className = "field-validation-message";
  message.setAttribute("role", "alert");
  message.textContent = validationMessage(control);
  const label = control.closest("label");
  (label ?? control.parentElement)?.append(message);
  control.dataset.validationMessageId = id;
  control.classList.add("field-validation-error");
  control.setAttribute("aria-invalid", "true");
  const describedBy = [control.getAttribute("aria-describedby"), id].filter(Boolean).join(" ");
  control.setAttribute("aria-describedby", describedBy);
}

function isValidatable(target: EventTarget | null): target is ValidatableControl {
  return target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement;
}

export function FormValidationAssist() {
  useEffect(() => {
    const onInvalid = (event: Event) => {
      if (isValidatable(event.target)) showValidation(event.target);
    };
    const onChange = (event: Event) => {
      if (isValidatable(event.target) && event.target.validity.valid) clearValidation(event.target);
    };
    document.addEventListener("invalid", onInvalid, true);
    document.addEventListener("input", onChange, true);
    document.addEventListener("change", onChange, true);
    return () => {
      document.removeEventListener("invalid", onInvalid, true);
      document.removeEventListener("input", onChange, true);
      document.removeEventListener("change", onChange, true);
    };
  }, []);
  return null;
}
