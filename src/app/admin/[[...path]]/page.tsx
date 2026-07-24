import Link from "next/link";
import { notFound } from "next/navigation";
import { DashboardShell, StatCard, StatusPill } from "../../components";
import { AdminContactRequestForm, AdminDealerForm, AdminMaintenanceForm, AdminProductForm, AdminRegistrationExceptionForm, AdminRequestForm, AdminSerialStatusForm, AdminWarrantyForm, DemoForm } from "../../client-ui";
import { AccessDenied, PermissionDenied, requirePartnerAccess } from "../../partner-auth";
import { StockWorkspace, type StockViewKey } from "../../stock/stock-workspace";
import { type AdminPermission } from "../../../db/admin-permissions";
import { hasAdminPermission } from "../../../db/partner-access";
import { getAdminAuditLogs, getAdminMedia, getAdminProducts, getAdminQueues, getAdminRecords, getAdminSerials, getAdminStats, type PortalRecord } from "../../../db/portal-data";
import { AccessControlPanel } from "../access-control-panel";

export const dynamic = "force-dynamic";

const STOCK_VIEWS = {
  "": "today",
  receive: "scan",
  inventory: "inventory",
  movements: "movement",
  "open-rolls": "rolls",
  count: "count",
  reports: "reports",
} as const;

const STOCK_VIEW_PERMISSIONS: Record<StockViewKey, AdminPermission> = {
  today: "stock.view",
  scan: "stock.receive",
  inventory: "stock.view",
  movement: "stock.issue",
  rolls: "stock.view",
  count: "stock.count",
  reports: "stock.reports",
};

const ADMIN_SECTION_PERMISSIONS: Partial<Record<string, AdminPermission>> = {
  serials: "serial.manage",
  products: "catalog.manage",
  policy: "catalog.manage",
  dealers: "dealer.manage",
  warranties: "warranty.view",
  "registration-exceptions": "warranty.manage",
  maintenance: "warranty.view",
  media: "warranty.view",
  "contact-requests": "requests.manage",
  "support-requests": "requests.manage",
  "inspection-requests": "requests.manage",
  users: "access.manage",
  "audit-log": "audit.view",
  reports: "reports.export",
};

export default async function AdminPage({ params }: { params: Promise<{ path?: string[] }> }) {
  const { path } = await params;
  const section = path?.[0] ?? "dashboard";
  const access = await requirePartnerAccess("admin", `/admin${path?.length ? `/${path.join("/")}` : ""}`);
  if (!access) return <AccessDenied role="admin" />;
  if (section === "stock") {
    const stockPath = path?.[1] ?? "";
    const initialView = STOCK_VIEWS[stockPath as keyof typeof STOCK_VIEWS];
    if (!initialView || (path?.length ?? 0) > 2) notFound();
    if (!hasAdminPermission(access, STOCK_VIEW_PERMISSIONS[initialView])) return <PermissionDenied />;
    const allowedViews = (Object.keys(STOCK_VIEW_PERMISSIONS) as StockViewKey[]).filter((view) => hasAdminPermission(access, STOCK_VIEW_PERMISSIONS[view]));
    return <StockWorkspace adminMode persisted initialView={initialView} allowedViews={allowedViews} adminAccessLabel={access.isOwner ? "Owner · สิทธิ์ทั้งหมด" : "สิทธิ์ตามที่กำหนด"} />;
  }
  const requiredPermission = ADMIN_SECTION_PERMISSIONS[section];
  if (requiredPermission && !hasAdminPermission(access, requiredPermission)) return <PermissionDenied />;
  if (section === "serials") return <DashboardShell role="Admin" adminPermissions={access.permissions} title="Serial & Batch Management" active="serials"><div className="admin-stack"><AdminTable records={await getAdminSerials()} title="Serial inventory" copy="Serial, Product, Batch และสถานะล่าสุดจากระบบ" showDate /><AdminPanel title="Import Serial CSV" copy="ตรวจ duplicate, model code, batch และสถานะก่อน approve สำหรับพิมพ์จริง"><DemoForm kind="serial-import" /></AdminPanel><AdminPanel title="Serial status control" copy="ระงับหรือยกเลิก Serial ที่ยังไม่ถูกลงทะเบียน พร้อมเก็บเหตุผลใน Audit Log"><AdminSerialStatusForm /></AdminPanel></div></DashboardShell>;
  if (section === "products") return <DashboardShell role="Admin" adminPermissions={access.permissions} title="Product Series" active="products"><div className="admin-stack"><AdminTable records={await getAdminProducts()} /><AdminPanel title="Product management" copy="ผลิตภัณฑ์ใหม่เริ่มที่ Draft และต้องมี Public-copy Policy ที่เผยแพร่แล้วก่อน Active"><AdminProductForm /></AdminPanel></div></DashboardShell>;
  if (section === "policy") return <DashboardShell role="Admin" adminPermissions={access.permissions} title="Warranty & Public-copy Policy" active="policy"><AdminPanel title="Policy approval workflow" copy="บันทึกร่าง อนุมัติ และเผยแพร่เป็นคนละขั้น การเผยแพร่ Product public-copy จะอัปเดตข้อความที่อนุมัติสู่ Product Series"><DemoForm kind="policy" /></AdminPanel></DashboardShell>;
  if (section === "dealers") return <DashboardShell role="Admin" adminPermissions={access.permissions} title="Dealer & Account Management" active="dealers"><div className="admin-stack"><AdminTable records={await getAdminRecords("dealers")} title="Dealer accounts" copy="สถานะร้าน บัญชี Login และการบังคับเปลี่ยนรหัสผ่าน" /><AdminPanel title="สร้างร้านและจัดการบัญชี Dealer" copy="สร้าง Dealer พร้อม Username/รหัสชั่วคราว, Reset Password, Suspend หรือ Reactivate ได้จากหน้าเดียว"><AdminDealerForm /></AdminPanel></div></DashboardShell>;
  if (section === "warranties") return <DashboardShell role="Admin" adminPermissions={access.permissions} title="Warranty Records" active="warranties"><div className="admin-stack"><AdminTable records={await getAdminRecords("warranties")} /><AdminPanel title="Warranty status control" copy="ระบบตรวจ transition, synchronize Serial และบันทึกเหตุผลใน Audit Log"><AdminWarrantyForm /></AdminPanel></div></DashboardShell>;
  if (section === "registration-exceptions") return <DashboardShell role="Admin" adminPermissions={access.permissions} title="Registration Exceptions" active="exceptions"><div className="admin-stack"><AdminTable records={await getAdminRecords("exceptions")} /><AdminPanel title="Review failed registration" copy="ตรวจ Serial ที่ไม่พบ ซ้ำ ถูกระงับ หรือผูกกับ Product ที่ยังไม่พร้อม พร้อมบันทึกผลใน Audit Log"><AdminRegistrationExceptionForm /></AdminPanel></div></DashboardShell>;
  if (section === "maintenance") return <DashboardShell role="Admin" adminPermissions={access.permissions} title="Maintenance Records" active="maintenance"><div className="admin-stack"><AdminTable records={await getAdminRecords("maintenance")} /><AdminPanel title="Add verified maintenance record" copy="Admin สามารถเพิ่มระเบียนที่ตรวจสอบแล้วโดยระบบอ้างอิง Dealer เจ้าของ Warranty"><AdminMaintenanceForm /></AdminPanel></div></DashboardShell>;
  if (section === "media") return <DashboardShell role="Admin" adminPermissions={access.permissions} title="Private Media Inventory" active="media"><MediaTable records={await getAdminMedia()} /></DashboardShell>;
  if (section === "contact-requests") return <DashboardShell role="Admin" adminPermissions={access.permissions} title="Contact Requests" active="contact"><div className="admin-stack"><AdminTable records={await getAdminRecords("contact")} showDate /><AdminPanel title="Update contact workflow" copy="ติดตามคำขอติดต่อจากหน้าเว็บไซต์และบันทึกทุกการเปลี่ยนสถานะใน Audit Log"><AdminContactRequestForm /></AdminPanel></div></DashboardShell>;
  if (section === "support-requests") return <DashboardShell role="Admin" adminPermissions={access.permissions} title="Support Requests" active="support"><div className="admin-stack"><AdminTable records={await getAdminRecords("support")} showDate /><AdminPanel title="Assign and update request" copy="ระบบตรวจ transition และบันทึก Audit Log ทุกครั้ง"><AdminRequestForm kind="support" /></AdminPanel></div></DashboardShell>;
  if (section === "inspection-requests") return <DashboardShell role="Admin" adminPermissions={access.permissions} title="Inspection Requests" active="inspection"><div className="admin-stack"><AdminTable records={await getAdminRecords("inspection")} showDate /><AdminPanel title="Assign and update inspection" copy="สถานะ need_inspection ต้องมี Dealer ที่เปิดใช้งาน"><AdminRequestForm kind="inspection" /></AdminPanel></div></DashboardShell>;
  if (section === "users") return <DashboardShell role="Admin" adminPermissions={access.permissions} title="ผู้ใช้และสิทธิ์" active="users"><AccessControlPanel access={access} /></DashboardShell>;
  if (section === "audit-log") return <DashboardShell role="Admin" adminPermissions={access.permissions} title="Audit Log" active="audit"><AdminTable records={await getAdminAuditLogs()} title="Audit trail" copy="ผู้ดำเนินการ การกระทำ รายการที่เกี่ยวข้อง และเวลาที่บันทึก" showDate /></DashboardShell>;
  if (section === "reports") return <DashboardShell role="Admin" adminPermissions={access.permissions} title="Operational Reports" active="reports"><ReportsPanel /></DashboardShell>;
  const [stats, warranties, queues] = await Promise.all([getAdminStats(), getAdminRecords("warranties", 8), getAdminQueues()]);
  return <DashboardShell role="Admin" adminPermissions={access.permissions} title="Operations Overview"><div className="stat-grid"><StatCard label="Serial inventory" value={String(stats.primary)} note="รายการในฐานข้อมูลกลาง" /><StatCard label="Active warranties" value={String(stats.secondary)} note="สถานะ active" /><StatCard label="Authorized dealers" value={String(stats.tertiary)} note="ร้านที่เปิดใช้งาน" /><StatCard label="Open requests" value={String(stats.quaternary)} note="Support และ Inspection" /></div><div className="dashboard-columns"><AdminTable records={warranties} /><aside className="task-panel"><h2>Queues</h2>{queues.length ? queues.map((item) => <article key={item.reference}><span>{item.reference}</span><b>{item.subject}</b><small>{formatPortalDate(item.date)}</small></article>) : <p className="empty-records">ไม่มีรายการรอตรวจสอบ</p>}</aside></div></DashboardShell>;
}

function AdminPanel({ title, copy, children }: { title: string; copy: string; children: React.ReactNode }) { return <section className="dashboard-panel"><header><h2>{title}</h2><p>{copy}</p></header>{children}</section>; }
function AdminTable({ records, title = "Operational records", copy = "ข้อมูลล่าสุดจากฐานข้อมูลกลาง", showDate = false }: { records: PortalRecord[]; title?: string; copy?: string; showDate?: boolean }) {
  const rowClass = `admin-row${showDate ? " admin-row-date" : ""}`;
  return <section className="dashboard-panel records-panel"><header><h2>{title}</h2><p>{copy}</p></header><div className="data-table"><div className={`data-head ${rowClass}`}><b>Reference</b><b>Product / Action</b><b>Owner / Detail</b>{showDate && <b>Date</b>}<b>Status</b></div>{records.length ? records.map((row) => <div className={`data-row ${rowClass}`} key={row.reference}><b>{row.reference}</b><span>{row.subject}</span><span>{row.detail}</span>{showDate && <span>{formatPortalDate(row.date)}</span>}<StatusPill status={row.status.replaceAll("_", "-")} /></div>) : <p className="empty-records">ยังไม่มีข้อมูลในหมวดนี้</p>}</div></section>;
}

function MediaTable({ records }: { records: PortalRecord[] }) { return <section className="dashboard-panel records-panel"><header><h2>Authorized media access</h2><p>ไฟล์ไม่เปิด public และทุกลิงก์ตรวจสิทธิ์ Admin/Dealer ก่อนอ่านจาก R2</p></header><div className="data-table"><div className="data-head"><b>ID</b><b>Filename</b><b>Owner</b><b>Date</b><b>Access</b></div>{records.length ? records.map((row) => <div className="data-row" key={row.reference}><b>{row.reference}</b><span>{row.subject}</span><span>{row.detail}</span><span>{formatPortalDate(row.date)}</span><Link className="media-open-link" href={`/api/partner/media/${row.reference}`} target="_blank">เปิดไฟล์ ↗</Link></div>) : <p className="empty-records">ยังไม่มีไฟล์ private</p>}</div></section>; }

function ReportsPanel() {
  const reports = [
    ["Serial inventory", "Serial, model, batch และสถานะ", "serials"],
    ["Warranty records", "บัตรรับประกันและ Dealer โดยไม่ส่งออกข้อมูลติดต่อลูกค้า", "warranties"],
    ["Maintenance", "ประวัติบริการ ผลตรวจ และวันแนะนำครั้งถัดไป", "maintenance"],
    ["Support & Inspection", "คิวคำขอ สถานะ และ Dealer ที่ได้รับมอบหมาย", "requests"],
    ["Dealers", "รายชื่อร้าน จังหวัด ระดับการรับรอง และสถานะ", "dealers"],
    ["Audit log", "ประวัติการดำเนินการ ผู้กระทำ และเวลา", "audit"],
  ];
  return <section className="dashboard-panel report-panel"><header><h2>Export CSV</h2><p>รายงานทุกไฟล์ต้องผ่านสิทธิ์ Admin, ไม่ถูก cache และการดาวน์โหลดจะถูกบันทึกใน Audit Log</p></header><div className="report-grid">{reports.map(([title, copy, key]) => <article key={key}><div><h3>{title}</h3><p>{copy}</p></div><Link className="button button-secondary" href={`/api/admin/reports/export?report=${key}`}>ดาวน์โหลด CSV <span>↓</span></Link></article>)}</div></section>;
}

function formatPortalDate(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Bangkok" }).format(date); }
