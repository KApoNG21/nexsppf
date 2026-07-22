import { appendFile, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

export type IntakeKind = 'contact' | 'support_warranty' | 'inspection';
export type IntakeStatus = 'pending_review';

export type StoredAttachment = {
  readonly fieldName: string;
  readonly originalName: string;
  readonly mimeType: string;
  readonly byteSize: number;
  readonly privatePath: string;
};

export type StoredRequest = {
  readonly referenceNumber: string;
  readonly kind: IntakeKind;
  readonly status: IntakeStatus;
  readonly createdAt: string;
  readonly fields: Record<string, string>;
  readonly attachments: readonly StoredAttachment[];
  readonly privacy: 'private';
};

const DEFAULT_STORE_DIR = join(process.cwd(), '.data', 'nexs-requests');
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);

function getStoreDir() {
  return process.env.NEXS_REQUEST_STORE_DIR || DEFAULT_STORE_DIR;
}

function prefixForKind(kind: IntakeKind) {
  if (kind === 'inspection') return 'INS';
  if (kind === 'contact') return 'LEAD';
  return 'SUP';
}

function makeReferenceNumber(kind: IntakeKind, createdAt = new Date()) {
  const stamp = createdAt.toISOString().slice(0, 10).replace(/-/g, '');
  const token = randomBytes(3).toString('hex').toUpperCase();
  return `NEXS-${prefixForKind(kind)}-${stamp}-${token}`;
}

function sanitizeFieldValue(value: FormDataEntryValue) {
  return Array.from(String(value))
    .map((char) => {
      const code = char.charCodeAt(0);
      return code < 32 || code === 127 ? ' ' : char;
    })
    .join('')
    .trim()
    .slice(0, 2000);
}

function isUpload(value: FormDataEntryValue): value is File {
  return typeof File !== 'undefined' && value instanceof File && value.size > 0;
}

function safeFileName(name: string) {
  const normalized = name.normalize('NFKC').replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-');
  return normalized.slice(0, 120) || 'attachment';
}

function assertRequired(fields: Record<string, string>, requiredFields: readonly string[]) {
  const missing = requiredFields.filter((field) => !fields[field]);
  if (missing.length > 0) {
    throw new Error(`Missing required field: ${missing.join(', ')}`);
  }
}

async function persistAttachments(referenceNumber: string, entries: IterableIterator<[string, FormDataEntryValue]>) {
  const attachments: StoredAttachment[] = [];
  const attachmentDir = join(getStoreDir(), 'private', referenceNumber);

  for (const [fieldName, value] of entries) {
    if (!isUpload(value)) continue;
    if (!ALLOWED_IMAGE_TYPES.has(value.type)) {
      throw new Error(`Unsupported image type: ${value.type || 'unknown'}`);
    }
    if (value.size > MAX_ATTACHMENT_BYTES) {
      throw new Error('Attachment exceeds maximum size');
    }

    await mkdir(attachmentDir, { recursive: true, mode: 0o700 });
    const fileName = `${attachments.length + 1}-${safeFileName(value.name)}`;
    const privatePath = join(attachmentDir, fileName);
    const buffer = Buffer.from(await value.arrayBuffer());
    await writeFile(privatePath, buffer, { mode: 0o600 });
    attachments.push({
      fieldName,
      originalName: value.name,
      mimeType: value.type,
      byteSize: value.size,
      privatePath,
    });
  }

  return attachments;
}

export async function persistIntakeRequest({
  formData,
  kind,
  requiredFields,
}: {
  readonly formData: FormData;
  readonly kind: IntakeKind;
  readonly requiredFields: readonly string[];
}): Promise<StoredRequest> {
  const createdAt = new Date();
  const referenceNumber = makeReferenceNumber(kind, createdAt);
  const fields: Record<string, string> = {};

  for (const [key, value] of formData.entries()) {
    if (!isUpload(value)) {
      fields[key] = sanitizeFieldValue(value);
    }
  }

  assertRequired(fields, requiredFields);

  const attachments = await persistAttachments(referenceNumber, formData.entries());
  const record: StoredRequest = {
    referenceNumber,
    kind,
    status: 'pending_review',
    createdAt: createdAt.toISOString(),
    fields,
    attachments,
    privacy: 'private',
  };

  await mkdir(getStoreDir(), { recursive: true, mode: 0o700 });
  await appendFile(join(getStoreDir(), `${kind}.jsonl`), `${JSON.stringify(record)}\n`, { mode: 0o600 });

  return record;
}

export async function createSupportRequest(formData: FormData) {
  return persistIntakeRequest({
    formData,
    kind: 'support_warranty',
    requiredFields: ['name', 'phone', 'pdpaConsent'],
  });
}

export async function createInspectionRequest(formData: FormData) {
  return persistIntakeRequest({
    formData,
    kind: 'inspection',
    requiredFields: ['serialCode', 'productModel', 'description', 'pdpaConsent'],
  });
}

export async function createContactRequest(formData: FormData) {
  return persistIntakeRequest({
    formData,
    kind: 'contact',
    requiredFields: ['name', 'phone', 'province', 'contactType', 'pdpaConsent'],
  });
}
