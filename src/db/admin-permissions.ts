export const ADMIN_PERMISSION_DEFINITIONS = [
  { key: "stock.view", group: "ระบบสต๊อก", label: "ดูสต๊อกและตำแหน่ง", description: "ดูยอดคงเหลือ รายการม้วน และตำแหน่งจัดเก็บ" },
  { key: "stock.receive", group: "ระบบสต๊อก", label: "รับสินค้าเข้า", description: "สแกน QR หรือสร้าง Internal Serial เพื่อรับเข้าคลัง" },
  { key: "stock.issue", group: "ระบบสต๊อก", label: "เบิก คืน ย้าย และแจ้งเสีย", description: "ทำรายการเคลื่อนไหวที่กระทบยอดและสถานะสินค้า" },
  { key: "stock.count", group: "ระบบสต๊อก", label: "ตรวจนับสต๊อก", description: "บันทึกผลตรวจนับและส่วนต่าง" },
  { key: "stock.adjust", group: "ระบบสต๊อก", label: "ปรับยอดสต๊อก", description: "แก้ไขยอดโดยต้องระบุเหตุผลและเก็บ Audit Log" },
  { key: "stock.reports", group: "ระบบสต๊อก", label: "รายงานสต๊อก", description: "ดูและส่งออกรายงานคงเหลือและความเคลื่อนไหว" },
  { key: "warranty.view", group: "ระบบรับประกัน", label: "ดู Warranty และ Maintenance", description: "ดูข้อมูลบัตรรับประกันและประวัติบริการ" },
  { key: "warranty.manage", group: "ระบบรับประกัน", label: "จัดการ Warranty", description: "เปลี่ยนสถานะ แก้ข้อยกเว้น และบันทึก Maintenance" },
  { key: "serial.manage", group: "ข้อมูลสินค้า", label: "จัดการ Serial / Batch", description: "นำเข้า ตรวจสอบ ระงับ และแก้สถานะ Serial" },
  { key: "catalog.manage", group: "ข้อมูลสินค้า", label: "จัดการสินค้าและ Policy", description: "ดูแล Product Config และข้อความ Policy ที่เผยแพร่" },
  { key: "dealer.manage", group: "Dealer และงานบริการ", label: "จัดการ Dealer", description: "สร้าง อนุมัติ ระงับ และผูกบัญชี Dealer" },
  { key: "requests.manage", group: "Dealer และงานบริการ", label: "จัดการคำขอ", description: "ดูแล Contact, Support และ Inspection Request" },
  { key: "reports.export", group: "การควบคุมระบบ", label: "ส่งออกรายงาน", description: "ดาวน์โหลดรายงานจากระบบ Admin" },
  { key: "audit.view", group: "การควบคุมระบบ", label: "ดู Audit Log", description: "ตรวจว่าใครทำอะไร กับรายการใด และเมื่อไร" },
  { key: "access.manage", group: "การควบคุมระบบ", label: "จัดการผู้ใช้และสิทธิ์", description: "เพิ่ม ระงับ และกำหนดสิทธิ์ให้บัญชีอื่น" },
] as const;

export type AdminPermission = (typeof ADMIN_PERMISSION_DEFINITIONS)[number]["key"];

export const ALL_ADMIN_PERMISSIONS: AdminPermission[] = ADMIN_PERMISSION_DEFINITIONS.map((item) => item.key);

const VALID_ADMIN_PERMISSIONS = new Set<string>(ALL_ADMIN_PERMISSIONS);

export function parseAdminPermissions(value: string | null | undefined): AdminPermission[] {
  if (!value) return [];
  return [...new Set(value.split(",").map((permission) => permission.trim()).filter((permission): permission is AdminPermission => VALID_ADMIN_PERMISSIONS.has(permission)))];
}

export const ADMIN_ROLE_PRESETS: Array<{
  key: string;
  label: string;
  description: string;
  permissions: AdminPermission[];
}> = [
  {
    key: "owner",
    label: "Owner / Super Admin",
    description: "ควบคุมทุกส่วน รวมถึงผู้ใช้ สิทธิ์ และ Audit Log",
    permissions: ALL_ADMIN_PERMISSIONS,
  },
  {
    key: "stock-operator",
    label: "ผู้ดูแลสต๊อก",
    description: "รับเข้า เบิกจ่าย ตรวจนับ และดูรายงานสต๊อก",
    permissions: ["stock.view", "stock.receive", "stock.issue", "stock.count", "stock.reports"],
  },
  {
    key: "warranty-operator",
    label: "ผู้ดูแล Warranty",
    description: "ดูแล Serial, Dealer, Warranty และคำขอที่เกี่ยวข้อง",
    permissions: ["warranty.view", "warranty.manage", "serial.manage", "dealer.manage", "requests.manage", "reports.export"],
  },
  {
    key: "auditor",
    label: "ผู้ตรวจสอบ / ดูอย่างเดียว",
    description: "ดูข้อมูล รายงาน และ Audit Log โดยไม่เปลี่ยนแปลงรายการ",
    permissions: ["stock.view", "stock.reports", "warranty.view", "reports.export", "audit.view"],
  },
];
