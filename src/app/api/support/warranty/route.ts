import { NextResponse } from 'next/server';
import { createSupportRequest } from '@/lib/support-request-store';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const record = await createSupportRequest(await request.formData());
    return NextResponse.json({
      referenceNumber: record.referenceNumber,
      status: record.status,
      message: 'รับคำขอตรวจสอบแล้ว ทีม NEXS จะตรวจข้อมูลก่อนดำเนินการต่อ',
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unable to create support request',
    }, { status: 400 });
  }
}
