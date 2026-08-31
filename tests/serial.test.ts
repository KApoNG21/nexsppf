import { describe, expect, it } from 'vitest';
import { parseSerialCode, resolveProductFromSerial } from '@/lib/serial';

describe('serial parser', () => {
  it('maps B prefix to BEGIN without storing full URL as identity', () => {
    const parsed = parseSerialCode('https://nexsppf.com/r/B-1196MXY0401175Q');
    expect(parsed).toEqual({ serialCode: 'B-1196MXY0401175Q', modelCode: 'B' });
    expect(resolveProductFromSerial(parsed.serialCode)).toEqual({ modelCode: 'B', databaseModelCode: 'BEGIN', productName: 'BEGIN', warrantyYears: 5, publicMvp: true });
  });

  it('maps P prefix to PRIME', () => {
    expect(resolveProductFromSerial('P-1196MXY0401176Q')).toMatchObject({ productName: 'PRIME', warrantyYears: 6 });
  });

  it('maps U prefix to ULTIMATE', () => {
    expect(resolveProductFromSerial('U-1196MXY0401177Q')).toMatchObject({ productName: 'ULTIMATE', warrantyYears: 9 });
  });

  it('maps PRO as a public product group', () => {
    expect(resolveProductFromSerial('PRO-1196MXY0401178Q')).toEqual({
      modelCode: 'PRO',
      databaseModelCode: 'PRO',
      productName: 'PRO',
      warrantyYears: 8,
      publicMvp: true,
    });
  });

  it('supports optional PRO internal variants grouped under PRO', () => {
    expect(resolveProductFromSerial('R75-1196MXY0401178Q')).toEqual({
      modelCode: 'R75',
      databaseModelCode: 'PRO',
      productName: 'PRO 7.5',
      warrantyYears: 8,
      publicMvp: false,
      parentModelCode: 'PRO',
    });
    expect(resolveProductFromSerial('R85-1196MXY0401179Q')).toEqual({
      modelCode: 'R85',
      databaseModelCode: 'PRO',
      productName: 'PRO 8.5',
      warrantyYears: 8,
      publicMvp: false,
      parentModelCode: 'PRO',
    });
  });

  it('rejects malformed serial codes', () => {
    expect(() => parseSerialCode('BADVALUE')).toThrow(/Invalid serial/i);
    expect(() => resolveProductFromSerial('X-1196MXY0401179Q')).toThrow(/Unsupported product/i);
  });
});
