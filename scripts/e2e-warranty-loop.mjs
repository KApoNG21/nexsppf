const baseUrl = (process.env.E2E_BASE_URL || "http://127.0.0.1:3011").replace(/\/$/, "");
const password = required("E2E_PASSWORD");
const serialCode = process.env.E2E_SERIAL || "P-QA20260723001";
const dealerEmail = process.env.E2E_DEALER_EMAIL || "qa-dealer@nexs.local";
const otherDealerEmail = process.env.E2E_OTHER_DEALER_EMAIL || "qa-dealer2@nexs.local";
const adminEmail = process.env.E2E_ADMIN_EMAIL || "qa-admin@nexs.local";
const originHeaders = { origin: baseUrl, "sec-fetch-site": "same-origin" };
const tinyPng = new Blob([
  Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64"),
], { type: "image/png" });

const checks = [];
let dealerCookie = "";
let otherDealerCookie = "";
let adminCookie = "";
let supportReference = "";
let inspectionReference = "";
let mediaId = "";

await check("Protected dealer API rejects anonymous requests", async () => {
  const form = new FormData();
  form.set("serialCode", serialCode);
  const response = await fetch(`${baseUrl}/api/dealer/warranties`, {
    method: "POST",
    headers: originHeaders,
    body: form,
  });
  equal(response.status, 403);
});

await check("Cross-origin request is rejected", async () => {
  const form = new FormData();
  form.set("email", dealerEmail);
  form.set("password", password);
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { origin: "https://attacker.invalid", "sec-fetch-site": "cross-site" },
    body: form,
    redirect: "manual",
  });
  equal(response.status, 403);
});

await check("Invalid login does not create a session", async () => {
  const result = await login(dealerEmail, `${password}-wrong`, "/dealer");
  equal(result.response.status, 303);
  assert(!result.cookie, "Invalid login unexpectedly returned a session cookie");
  assert(result.response.headers.get("location")?.includes("error=invalid"), "Invalid login did not redirect with an error");
});

await check("Dealer login and dashboard access", async () => {
  const result = await login(dealerEmail, password, "");
  dealerCookie = result.cookie;
  assert(dealerCookie, "Dealer session cookie was not issued");
  equal(new URL(result.response.headers.get("location")).pathname, "/dealer");
  const response = await get("/dealer", dealerCookie);
  equal(response.status, 200);
  assert((await response.text()).includes("ภาพรวมร้านติดตั้ง"), "Dealer dashboard did not render");
});

await check("Dealer cannot access Admin portal", async () => {
  const response = await get("/admin", dealerCookie);
  equal(response.status, 200);
  const html = await response.text();
  assert(!html.includes("Operations Overview"), "Dealer reached the Admin dashboard");
});

await check("Dealer opens a Wrap job with installation evidence", async () => {
  const form = new FormData();
  form.set("serialCode", serialCode);
  form.set("installDate", "2026-07-23");
  form.set("workOrderRef", "WRAP-QA-20260814-01");
  form.set("installationType", "full_body");
  form.set("coverageArea", "ติดตั้งเต็มคัน ยกเว้นหลังคา");
  form.set("installationBranch", "พระราม 2");
  form.set("installerName", "QA Lead Installer");
  form.set("maintenanceIncluded", "on");
  form.set("maintenanceIntervalMonths", "6");
  form.set("maintenanceVisitLimit", "4");
  form.set("claimIncluded", "on");
  form.set("claimPieceLimit", "3");
  form.set("rewrapIncluded", "on");
  form.set("rewrapPieceLimit", "2");
  form.set("planNote", "QA after-sales plan");
  form.append("photos", tinyPng, "qa-installation.png");
  const response = await post("/api/dealer/warranties", form, dealerCookie);
  equal(response.status, 201, await response.clone().text());
  const body = await response.json();
  equal(body.serialCode, serialCode);
  equal(body.cardPath, `/r/${serialCode}`);
  equal(body.profilePath, `/warranty/complete?serial=${serialCode}`);
  const pending = await (await get(`/api/warranty/${serialCode}`)).json();
  equal(pending.status, "profile-required");
});

await check("Customer completes the warranty profile from the same QR", async () => {
  const form = new FormData();
  form.set("serialCode", serialCode);
  form.set("customerName", "QA Customer Fullname");
  form.set("customerPhone", "0891234567");
  form.set("customerEmail", "qa-customer@nexs.local");
  form.set("vehicleMake", "Porsche");
  form.set("vehicleModel", "911 Carrera");
  form.set("vehiclePlate", "กข 1234");
  form.set("vehicleYear", "2025");
  form.set("vehicleColor", "Black");
  form.set("vehicleVinLast6", "QA1234");
  form.set("odometerKm", "12500");
  form.set("consent", "on");
  form.set("company", "");
  const response = await post("/api/warranty/complete", form);
  equal(response.status, 200, await response.clone().text());
  const body = await response.json();
  equal(body.status, "active");
});

await check("Duplicate registration becomes an exception", async () => {
  const form = new FormData();
  form.set("serialCode", serialCode);
  form.set("installDate", "2026-07-23");
  const response = await post("/api/dealer/warranties", form, dealerCookie);
  equal(response.status, 409, await response.clone().text());
  const body = await response.json();
  assert(body.referenceCode?.startsWith("REG-"), "Registration exception reference was not created");
});

await check("Dealer adds maintenance with a private image", async () => {
  const form = new FormData();
  form.set("serialCode", serialCode);
  form.set("maintenanceDate", "2026-08-23");
  form.set("maintenanceType", "maintenance");
  form.set("performedBy", "QA Installer");
  form.set("resultStatus", "passed");
  form.set("note", "QA full-loop maintenance record");
  form.set("nextRecommendedDate", "2027-02-23");
  form.append("photos", tinyPng, "qa-maintenance.png");
  const response = await post("/api/dealer/maintenance", form, dealerCookie);
  equal(response.status, 201, await response.clone().text());
  const body = await response.json();
  assert(body.referenceCode?.startsWith("MNT-"), "Maintenance reference was not created");
});

await check("Dealer records claim and re-wrap usage against the configured limits", async () => {
  for (const [maintenanceType, piecesCount, serviceScope] of [
    ["claim", "2", "Front bumper and left door"],
    ["rewrap", "1", "Right mirror"],
  ]) {
    const form = new FormData();
    form.set("serialCode", serialCode);
    form.set("maintenanceDate", maintenanceType === "claim" ? "2027-01-10" : "2027-03-15");
    form.set("maintenanceType", maintenanceType);
    form.set("piecesCount", piecesCount);
    form.set("serviceScope", serviceScope);
    form.set("performedBy", "QA Installer");
    form.set("resultStatus", "normal");
    form.set("note", `QA ${maintenanceType} record`);
    const response = await post("/api/dealer/maintenance", form, dealerCookie);
    equal(response.status, 201, await response.clone().text());
  }
});

await check("Dealer cannot use more claim pieces than the plan allows", async () => {
  const form = new FormData();
  form.set("serialCode", serialCode);
  form.set("maintenanceDate", "2027-04-01");
  form.set("maintenanceType", "claim");
  form.set("piecesCount", "2");
  form.set("serviceScope", "Over-limit test");
  form.set("performedBy", "QA Installer");
  form.set("resultStatus", "normal");
  const response = await post("/api/dealer/maintenance", form, dealerCookie);
  equal(response.status, 400, await response.clone().text());
});

await check("Public warranty card is active and hides customer PII", async () => {
  const apiResponse = await get(`/api/warranty/${serialCode}`);
  equal(apiResponse.status, 200);
  const record = await apiResponse.json();
  equal(record.status, "active");
  equal(record.serial, serialCode);
  equal(record.workOrder, "WRAP-QA-20260814-01");
  equal(record.wrapType, "Wrap เต็มคัน");
  equal(record.coverage, "ติดตั้งเต็มคัน ยกเว้นหลังคา");
  equal(record.branch, "พระราม 2");
  assert(record.vehicle.includes("••••"), "Vehicle plate is not masked");
  equal(record.benefits.maintenance.used, 1);
  equal(record.benefits.maintenance.limit, 4);
  equal(record.benefits.claim.used, 2);
  equal(record.benefits.rewrap.used, 1);
  assert(record.serviceHistory.length === 3, "Complete after-sales history is not public");
  assert(record.nextMaintenance !== "-", "Next maintenance date is missing");
  const cardResponse = await get(`/r/${serialCode}`);
  equal(cardResponse.status, 200);
  const html = await cardResponse.text();
  assert(!html.includes("QA Customer Fullname"), "Public card exposed customer name");
  assert(!html.includes("0891234567"), "Public card exposed customer phone");
  assert(!html.includes("qa-customer@nexs.local"), "Public card exposed customer email");
});

await check("Customer submits support and inspection requests with evidence", async () => {
  supportReference = await createPublicRequest("support", "film_issue", "Customer requests help with an edge.");
  inspectionReference = await createPublicRequest("inspection", "annual_inspection", "Customer requests a scheduled inspection.");
  assert(supportReference.startsWith("SUP-"), "Support reference was not created");
  assert(inspectionReference.startsWith("INS-"), "Inspection reference was not created");
});

await check("Second dealer is isolated from warranty data and private media", async () => {
  const result = await login(otherDealerEmail, password, "");
  otherDealerCookie = result.cookie;
  assert(otherDealerCookie, "Second dealer session cookie was not issued");
  const detailResponse = await get(`/dealer/warranties/${serialCode}`, otherDealerCookie);
  equal(detailResponse.status, 200);
  const detailHtml = await detailResponse.text();
  assert(!detailHtml.includes("QA Customer Fullname"), "Second dealer can see another dealer's customer");
  const mediaPage = await get("/dealer/warranties", dealerCookie);
  equal(mediaPage.status, 200);
});

await check("Admin login, dashboard, and request assignment", async () => {
  const result = await login(adminEmail, password, "");
  adminCookie = result.cookie;
  assert(adminCookie, "Admin session cookie was not issued");
  equal(new URL(result.response.headers.get("location")).pathname, "/admin");
  const dashboard = await get("/admin", adminCookie);
  equal(dashboard.status, 200);
  assert((await dashboard.text()).includes("Operations Overview"), "Admin dashboard did not render");
  await assignRequest("support", supportReference);
  await assignRequest("inspection", inspectionReference);
});

await check("Assigned dealer sees and advances an inspection task", async () => {
  const tasks = await get("/dealer/requests", dealerCookie);
  equal(tasks.status, 200);
  const html = await tasks.text();
  assert(html.includes(supportReference), "Assigned support request is absent from dealer queue");
  assert(html.includes(inspectionReference), "Assigned inspection request is absent from dealer queue");
  const form = new FormData();
  form.set("kind", "inspection");
  form.set("referenceCode", inspectionReference);
  form.set("status", "under_review");
  form.set("note", "Dealer acknowledged the assigned inspection");
  const response = await post("/api/dealer/requests", form, dealerCookie);
  equal(response.status, 200, await response.clone().text());
});

await check("Private media requires ownership or Admin role", async () => {
  const mediaPage = await get("/admin/media", adminCookie);
  equal(mediaPage.status, 200);
  const html = await mediaPage.text();
  const ids = [...html.matchAll(/\/api\/partner\/media\/(\d+)/g)].map((match) => match[1]);
  assert(ids.length >= 4, "Expected warranty, maintenance, support, and inspection media");
  mediaId = ids[0];
  equal((await get(`/api/partner/media/${mediaId}`)).status, 403);
  equal((await get(`/api/partner/media/${mediaId}`, otherDealerCookie)).status, 403);
  equal((await get(`/api/partner/media/${mediaId}`, adminCookie)).status, 200);
});

await check("Admin warranty status control is reflected publicly", async () => {
  await updateWarrantyStatus("suspended", "QA status transition");
  const suspended = await (await get(`/api/warranty/${serialCode}`)).json();
  equal(suspended.status, "under-review");
  await updateWarrantyStatus("active", "QA restore after verification");
  const active = await (await get(`/api/warranty/${serialCode}`)).json();
  equal(active.status, "active");
});

await check("Admin exports operational reports", async () => {
  for (const report of ["serials", "warranties", "maintenance", "requests", "dealers", "audit"]) {
    const response = await get(`/api/admin/reports/export?report=${report}`, adminCookie);
    equal(response.status, 200);
    assert(response.headers.get("content-type")?.includes("text/csv"), `${report} export is not CSV`);
    assert((await response.text()).length > 20, `${report} export is empty`);
  }
});

console.log(JSON.stringify({
  ok: true,
  serialCode,
  supportReference,
  inspectionReference,
  checks,
}, null, 2));

async function createPublicRequest(kind, requestType, detail) {
  const form = new FormData();
  form.set("kind", kind);
  form.set("company", "");
  form.set("consent", "on");
  form.set("contactName", "QA Customer");
  form.set("contactPhone", "0891234567");
  form.set("serialCode", serialCode);
  form.set("requestType", requestType);
  form.set("detail", detail);
  form.append("photos", tinyPng, `qa-${kind}.png`);
  const response = await post("/api/public-requests", form);
  equal(response.status, 201, await response.clone().text());
  return (await response.json()).referenceCode;
}

async function assignRequest(kind, referenceCode) {
  const form = new FormData();
  form.set("kind", kind);
  form.set("referenceCode", referenceCode);
  form.set("status", "need_inspection");
  form.set("dealerCode", "DLR-001");
  form.set("note", "QA assignment");
  const response = await post("/api/admin/requests", form, adminCookie);
  equal(response.status, 200, await response.clone().text());
}

async function updateWarrantyStatus(status, note) {
  const form = new FormData();
  form.set("serialCode", serialCode);
  form.set("status", status);
  form.set("note", note);
  const response = await post("/api/admin/warranties", form, adminCookie);
  equal(response.status, 200, await response.clone().text());
}

async function login(email, loginPassword, returnTo) {
  const form = new FormData();
  form.set("email", email);
  form.set("password", loginPassword);
  form.set("return_to", returnTo);
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: originHeaders,
    body: form,
    redirect: "manual",
  });
  const setCookie = response.headers.get("set-cookie") || "";
  const cookie = setCookie.match(/(?:^|,\s*)(nexs_partner_session=[^;]+)/)?.[1] || "";
  return { response, cookie };
}

function get(path, cookie = "") {
  return fetch(`${baseUrl}${path}`, {
    headers: cookie ? { cookie } : {},
    redirect: "manual",
  });
}

function post(path, body, cookie = "") {
  return fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: cookie ? { ...originHeaders, cookie } : originHeaders,
    body,
    redirect: "manual",
  });
}

async function check(name, operation) {
  try {
    await operation();
    checks.push({ name, status: "passed" });
    console.error(`PASS ${name}`);
  } catch (error) {
    checks.push({ name, status: "failed", error: error instanceof Error ? error.message : String(error) });
    console.error(`FAIL ${name}`);
    throw error;
  }
}

function equal(actual, expected, detail = "") {
  if (actual !== expected) throw new Error(`Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}${detail ? `: ${detail}` : ""}`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}
