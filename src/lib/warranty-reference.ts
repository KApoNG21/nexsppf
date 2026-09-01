export function createWarrantyWorkOrderReference(serialCode: string, installDate: string) {
  const serial = serialCode.trim().toUpperCase().replace(/[^A-Z0-9-]/g, "");
  const date = installDate.replace(/[^0-9]/g, "");
  if (!serial || date.length !== 8) throw new Error("Cannot create warranty work order reference");
  return `NXS-${date}-${serial}`.slice(0, 80);
}
