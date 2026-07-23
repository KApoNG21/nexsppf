import { env } from "@/lib/server-env";
import { authorizePartnerRequest, unauthorizedResponse } from "../../../../../db/partner-access";
import { enforceSameOrigin, fail, formText, PartnerValidationError } from "../../../_partner-utils";

const MAX_CSV_BYTES = 1024 * 1024;
const MAX_ROWS = 500;
const requiredHeaders = ["serial_code", "model_code", "batch_code", "status"] as const;
const validStatuses = new Set(["available", "suspended", "invalid"]);

type CsvRecord = { serialCode: string; modelCode: string; batchCode: string; status: string; row: number };
type RowError = { row: number; field: string; message: string };
type StringRow = { value: string };

export async function POST(request: Request) {
  const originFailure = enforceSameOrigin(request);
  if (originFailure) return originFailure;
  const actor = await authorizePartnerRequest(request, "admin");
  if (!actor) return unauthorizedResponse();

  try {
    const form = await request.formData();
    const file = form.get("csv");
    const mode = formText(form, "mode");
    if (!(file instanceof File) || !file.size || file.size > MAX_CSV_BYTES) throw new PartnerValidationError("กรุณาเลือกไฟล์ CSV ขนาดไม่เกิน 1 MB");
    if (!['validate', 'import'].includes(mode)) throw new PartnerValidationError("โหมดนำเข้าไม่ถูกต้อง");
    if (mode === "import" && formText(form, "confirmImport") !== "on") throw new PartnerValidationError("กรุณายืนยันการนำเข้าหลังตรวจสอบผลลัพธ์");

    const rows = parseCsv(await file.text());
    if (rows.length < 2) throw new PartnerValidationError("ไฟล์ CSV ไม่มีข้อมูล Serial");
    if (rows.length - 1 > MAX_ROWS) throw new PartnerValidationError(`นำเข้าได้สูงสุด ${MAX_ROWS} รายการต่อครั้ง`);
    const headers = rows[0].map((cell) => cell.trim().toLowerCase());
    const headerIndex = Object.fromEntries(headers.map((header, index) => [header, index]));
    const missing = requiredHeaders.filter((header) => headerIndex[header] === undefined);
    if (missing.length) throw new PartnerValidationError(`ไม่พบคอลัมน์: ${missing.join(", ")}`);

    const records: CsvRecord[] = [];
    const errors: RowError[] = [];
    const seen = new Set<string>();
    for (let index = 1; index < rows.length; index++) {
      const cells = rows[index];
      if (cells.every((cell) => !cell.trim())) continue;
      const row = index + 1;
      const serialCode = (cells[headerIndex.serial_code] ?? "").trim().toUpperCase().replace(/\s+/g, "");
      const modelCode = (cells[headerIndex.model_code] ?? "").trim().toUpperCase();
      const batchCode = (cells[headerIndex.batch_code] ?? "").trim().toUpperCase();
      const status = (cells[headerIndex.status] ?? "").trim().toLowerCase();
      if (!/^[A-Z0-9-]{6,64}$/.test(serialCode)) errors.push({ row, field: "serial_code", message: "รูปแบบ Serial ไม่ถูกต้อง" });
      if (!/^[A-Z0-9-]{2,40}$/.test(modelCode)) errors.push({ row, field: "model_code", message: "Model code ไม่ถูกต้อง" });
      if (!/^[A-Z0-9-]{2,80}$/.test(batchCode)) errors.push({ row, field: "batch_code", message: "Batch code ไม่ถูกต้อง" });
      if (!validStatuses.has(status)) errors.push({ row, field: "status", message: "สถานะต้องเป็น available, suspended หรือ invalid" });
      if (seen.has(serialCode)) errors.push({ row, field: "serial_code", message: "Serial ซ้ำภายในไฟล์" });
      seen.add(serialCode);
      records.push({ serialCode, modelCode, batchCode, status, row });
    }

    const activeModels = await env.DB.prepare("SELECT model_code AS value FROM product_series WHERE status = 'active'").all<StringRow>();
    const modelSet = new Set((activeModels.results ?? []).map((item) => item.value));
    for (const record of records) if (!modelSet.has(record.modelCode)) errors.push({ row: record.row, field: "model_code", message: "ไม่พบรุ่นที่เปิดใช้งาน" });
    if (records.length) {
      const placeholders = records.map(() => "?").join(",");
      const duplicates = await env.DB.prepare(`SELECT serial_code AS value FROM serials WHERE serial_code IN (${placeholders})`).bind(...records.map((record) => record.serialCode)).all<StringRow>();
      const duplicateSet = new Set((duplicates.results ?? []).map((item) => item.value));
      for (const record of records) if (duplicateSet.has(record.serialCode)) errors.push({ row: record.row, field: "serial_code", message: "Serial มีอยู่ในระบบแล้ว" });
    }

    if (mode === "validate" || errors.length) return Response.json({ ok: errors.length === 0, valid: records.length - new Set(errors.map((error) => error.row)).size, total: records.length, errors }, { status: errors.length ? 422 : 200 });

    await env.DB.batch([
      ...records.map((record) => env.DB.prepare("INSERT INTO serials (serial_code, model_code, batch_code, status) VALUES (?, ?, ?, ?)").bind(record.serialCode, record.modelCode, record.batchCode, record.status)),
      env.DB.prepare(`INSERT INTO audit_logs (actor_email, actor_role, action, entity_type, entity_id, detail) VALUES (?, 'admin', 'serial.import', 'serial_batch', ?, ?)`)
        .bind(actor.email, crypto.randomUUID(), JSON.stringify({ filename: file.name.slice(0, 120), rowCount: records.length })),
    ]);
    return Response.json({ ok: true, imported: records.length, errors: [] }, { status: 201 });
  } catch (error) {
    if (error instanceof PartnerValidationError) return fail(error.message, 400);
    return fail("ไม่สามารถตรวจสอบหรือนำเข้าไฟล์ Serial ได้", 500);
  }
}

function parseCsv(source: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < source.length; index++) {
    const char = source[index];
    if (char === '"') {
      if (quoted && source[index + 1] === '"') { cell += '"'; index++; }
      else quoted = !quoted;
    } else if (char === "," && !quoted) { row.push(cell); cell = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && source[index + 1] === "\n") index++;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += char;
  }
  if (quoted) throw new PartnerValidationError("รูปแบบเครื่องหมายคำพูดใน CSV ไม่สมบูรณ์");
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}
