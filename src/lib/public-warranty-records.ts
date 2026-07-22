import { resolveProductFromSerial } from './serial';

export type PublicWarrantyState = 'active' | 'not-registered' | 'not-found' | 'expired' | 'under-review';

export type PublicWarrantyRecord = {
  readonly state: PublicWarrantyState;
  readonly serial: string;
  readonly productName?: string;
  readonly warrantyYears?: number;
  readonly vehicleMasked?: string;
  readonly licensePlateMasked?: string;
  readonly dealerName?: string;
  readonly installDate?: string;
  readonly expiryDate?: string;
  readonly maintenanceSummary?: string;
  readonly reviewMessage?: string;
};

const VERIFIED_SAMPLE_RECORDS: Record<string, Omit<PublicWarrantyRecord, 'serial'>> = {
  'PRO-1196MXY0401178Q': {
    state: 'active',
    productName: 'NEXS PRO',
    warrantyYears: 8,
    vehicleMasked: 'Sedan · Pearl White',
    licensePlateMasked: '1กก ··3456',
    dealerName: 'NEXS Authorized · Bangkok',
    installDate: '12 มี.ค. 2026',
    expiryDate: '12 มี.ค. 2034',
    maintenanceSummary: 'ลงทะเบียนการติดตั้งแล้ว · มีประวัติการดูแลหลังติดตั้ง 1 รายการ',
  },
  'EXP-1196MXY0401178Q': {
    state: 'expired',
    productName: 'NEXS PRO',
    warrantyYears: 8,
    vehicleMasked: 'Vehicle data masked',
    licensePlateMasked: 'xx ··1234',
    dealerName: 'NEXS Authorized Dealer',
    installDate: '01 ม.ค. 2018',
    expiryDate: '01 ม.ค. 2026',
    maintenanceSummary: 'หมดอายุตามวันที่ในระบบ',
  },
  'SUS-1196MXY0401178Q': {
    state: 'under-review',
    productName: 'NEXS PRO',
    warrantyYears: 8,
    reviewMessage: 'บัตรนี้อยู่ระหว่างตรวจสอบโดยทีม NEXS กรุณาติดต่อทีมงานพร้อม Reference หรือรูปบัตร/QR',
  },
};

export function lookupPublicWarrantyRecord(serialInput: string): PublicWarrantyRecord {
  const serial = serialInput.trim().toUpperCase();
  const sample = VERIFIED_SAMPLE_RECORDS[serial];
  if (sample) return { serial, ...sample };

  try {
    const product = resolveProductFromSerial(serial);
    if (serial.startsWith('B-')) {
      return {
        state: 'not-registered',
        serial,
        productName: `NEXS ${product.productName}`,
        warrantyYears: product.warrantyYears,
      };
    }
  } catch {
    return { state: 'not-found', serial };
  }

  return { state: 'not-found', serial };
}
