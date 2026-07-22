import { NextResponse } from 'next/server';
import { createInspectionRequest } from '@/lib/support-request-store';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const record = await createInspectionRequest(await request.formData());
    return NextResponse.json({
      referenceNumber: record.referenceNumber,
      status: record.status,
      message: 'รับคำขอตรวจสอบแล้ว สถานะเริ่มต้นคือ pending_review และไม่มีการอนุมัติผลอัตโนมัติ',
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unable to create inspection request',
    }, { status: 400 });
  }
}
