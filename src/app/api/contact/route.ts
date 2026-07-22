import { NextResponse } from 'next/server';
import { createContactRequest } from '@/lib/support-request-store';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const record = await createContactRequest(await request.formData());
    return NextResponse.json({
      referenceNumber: record.referenceNumber,
      status: record.status,
      message: 'รับข้อมูลแล้ว ทีมงานจะติดต่อกลับตามช่องทางที่ให้ไว้',
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unable to create contact request',
    }, { status: 400 });
  }
}
