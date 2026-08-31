import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("separated Dealer and Customer registration workflow", () => {
  it("ends Dealer activation before the optional customer prefill step", async () => {
    const [form, api] = await Promise.all([
      readFile("src/app/client-ui.tsx", "utf8"),
      readFile("src/app/api/dealer/warranties/route.ts", "utf8"),
    ]);
    expect(form).toContain("งานขั้นตอนนี้เสร็จแล้ว");
    expect(form).toContain("ช่วยกรอกข้อมูลลูกค้า (ไม่บังคับ)");
    expect(api).toContain("detailPath: `/dealer/warranties/");
    expect(api).toContain("prefillPath: `/dealer/customer-registration");
    expect(api).not.toContain("profilePath: `/warranty/complete");
  });

  it("lets a Dealer save partial data without completing customer consent", async () => {
    const [dealerPage, prefillApi] = await Promise.all([
      readFile("src/app/dealer/[[...path]]/page.tsx", "utf8"),
      readFile("src/app/api/dealer/customer-prefill/route.ts", "utf8"),
    ]);
    expect(dealerPage).toContain('section === "customer-registration"');
    expect(dealerPage).toContain('kind="dealer-prefill"');
    expect(prefillApi).toContain("warranty.customer_prefill");
    expect(prefillApi).toContain("status = 'pending_customer'");
    expect(prefillApi).not.toContain("customer_completed_at");
    expect(prefillApi).not.toContain("status = 'active'");
  });

  it("shows a back action and dealer prefill for the customer to verify", async () => {
    const [page, customerForm, publicWarranty] = await Promise.all([
      readFile("src/app/warranty/complete/page.tsx", "utf8"),
      readFile("src/app/warranty-client.tsx", "utf8"),
      readFile("src/db/public-warranty.ts", "utf8"),
    ]);
    expect(page).toContain("← กลับไปหน้าบัตรรับประกัน");
    expect(page).toContain("findCustomerRegistrationDraft");
    expect(page).toContain("initialData={initialData ?? undefined}");
    expect(customerForm).toContain("ร้านช่วยกรอกข้อมูลบางส่วนไว้แล้ว");
    expect(customerForm).toContain("{ ...emptyCustomer, ...initialData }");
    expect(publicWarranty).toContain("findCustomerRegistrationDraft");
  });
});
