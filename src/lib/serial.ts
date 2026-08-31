export type ProductConfig = {
  modelCode: string;
  databaseModelCode: string;
  productName: string;
  warrantyYears: number;
  publicMvp: boolean;
  parentModelCode?: string;
};

export type ParsedSerial = {
  serialCode: string;
  modelCode: string;
};

export const PRODUCT_CONFIG: Record<string, ProductConfig> = {
  B: { modelCode: 'B', databaseModelCode: 'BEGIN', productName: 'BEGIN', warrantyYears: 5, publicMvp: true },
  P: { modelCode: 'P', databaseModelCode: 'PRIME', productName: 'PRIME', warrantyYears: 6, publicMvp: true },
  PRO: { modelCode: 'PRO', databaseModelCode: 'PRO', productName: 'PRO', warrantyYears: 8, publicMvp: true },
  R75: { modelCode: 'R75', databaseModelCode: 'PRO', productName: 'PRO 7.5', warrantyYears: 8, publicMvp: false, parentModelCode: 'PRO' },
  R85: { modelCode: 'R85', databaseModelCode: 'PRO', productName: 'PRO 8.5', warrantyYears: 8, publicMvp: false, parentModelCode: 'PRO' },
  U: { modelCode: 'U', databaseModelCode: 'ULTIMATE', productName: 'ULTIMATE', warrantyYears: 9, publicMvp: true },
};

const SERIAL_PATTERN = /^([A-Z0-9]+)-[A-Z0-9]+$/;

export function parseSerialCode(input: string): ParsedSerial {
  const value = input.trim();
  const serialCode = extractSerialIdentity(value);
  const match = serialCode.match(SERIAL_PATTERN);

  if (!match) {
    throw new Error(`Invalid serial code: ${input}`);
  }

  return { serialCode, modelCode: match[1] };
}

export function resolveProductFromSerial(input: string): ProductConfig {
  const { modelCode } = parseSerialCode(input);
  const product = PRODUCT_CONFIG[modelCode];

  if (!product) {
    throw new Error(`Unsupported product model code: ${modelCode}`);
  }

  return product;
}

function extractSerialIdentity(input: string): string {
  try {
    const url = new URL(input);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const serial = pathParts[pathParts.length - 1];
    if (!serial) {
      throw new Error('Missing serial path segment');
    }
    return decodeURIComponent(serial).toUpperCase();
  } catch {
    return input.toUpperCase();
  }
}
