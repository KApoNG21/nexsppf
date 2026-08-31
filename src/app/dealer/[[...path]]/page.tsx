import Link from "next/link";
import { DashboardShell, StatCard, StatusPill, WarrantyJourney } from "../../components";
import { DealerRequestForm, DealerServicePlanEditor, DemoForm, WarrantyQr } from "../../client-ui";
import { AccessDenied, requirePartnerAccess } from "../../partner-auth";
import { serviceTypeLabel } from "../../../lib/after-sales";
import { DEALER_SERVICE_NOTICE, NEXS_PRODUCT_WARRANTY_COVERAGE, NEXS_PRODUCT_WARRANTY_EXCLUSIONS, productWarrantyTitle } from "../../../lib/warranty-terms";
import { getDealerProfile, getDealerStats, getDealerTasks, getDealerWarranties, getDealerWarrantyDetail, type DealerWarrantyDetail as DealerWarrantyRecord, type DealerMaintenanceItem, type DealerMediaItem, type DealerServicePlan, type PortalRecord } from "../../../db/portal-data";

export const dynamic = "force-dynamic";

type DealerSearchParams = { serial?: string | string[] };

export default async function DealerPage({ params, searchParams }: { params: Promise<{ path?: string[] }>; searchParams: Promise<DealerSearchParams> }) {
  const { path } = await params;
  const query = await searchParams;
  const section = path?.[0] ?? "dashboard";
  const initialSerial = section === "register-warranty" || section === "customer-registration" || section === "maintenance" ? normalizePrefillSerial(query.serial) : "";
  const dealerPath = `/dealer${path?.length ? `/${path.join("/")}` : ""}`;
  const returnTo = initialSerial ? `${dealerPath}?serial=${encodeURIComponent(initialSerial)}` : dealerPath;
  const access = await requirePartnerAccess("dealer", returnTo);
  if (!access) return <AccessDenied role="dealer" />;
  if (section === "register-warranty") return <DashboardShell role="Dealer" title="เปิดงาน Wrap และบัตรรับประกัน" active="register"><Panel title="สแกน QR แล้วบันทึกหลักฐานงาน Wrap" copy="ระบุเลขที่งาน ขอบเขตการติดตั้ง สาขา และผู้รับผิดชอบ ระบบอ่านรุ่นฟิล์มจาก QR และคำนวณวันหมดอายุให้อัตโนมัติ"><WarrantyJourney current="dealer" /><DemoForm kind="dealer-register" initialSerial={initialSerial} /></Panel></DashboardShell>;
  if (section === "customer-registration") {
    const detail = initialSerial ? await getDealerWarrantyDetail(access.dealerId!, initialSerial) : null;
    const warranty = detail?.warranty;
    const customerRegistration = warranty ? { customerName: warranty.customer_name ?? "", customerPhone: warranty.customer_phone ?? "", customerEmail: warranty.customer_email ?? "", vehicleMake: warranty.vehicle_make ?? "", vehicleModel: warranty.vehicle_model ?? "", vehicleYear: warranty.vehicle_year == null ? "" : String(warranty.vehicle_year), vehicleColor: warranty.vehicle_color ?? "", vehiclePlate: warranty.vehicle_plate ?? "", vehicleVinLast6: warranty.vehicle_vin_last6 ?? "", odometerKm: warranty.odometer_km == null ? "" : String(warranty.odometer_km) } : undefined;
    const backPath = initialSerial ? `/dealer/warranties/${encodeURIComponent(initialSerial)}` : "/dealer/warranties";
    return <DashboardShell role="Dealer" title="ช่วยกรอกข้อมูลลูกค้า" active="customer-registration"><Panel title="บันทึกข้อมูลที่มีไว้เป็น Prefill" copy="ขั้นตอนนี้เป็นทางเลือกและแยกจากการเปิดใช้งาน Serial ลูกค้าจะเป็นผู้ตรวจสอบและยืนยันข้อมูลขั้นสุดท้าย"><div className="dealer-workflow-back"><Link href={backPath}>← กลับไปหน้าบัตรรับประกัน</Link><span>หากไม่มีข้อมูลเพิ่มเติม สามารถกลับได้ทันที — Serial เปิดใช้งานแล้ว</span></div><DemoForm kind="dealer-prefill" initialSerial={initialSerial} customerRegistration={customerRegistration} /></Panel></DashboardShell>;
  }
  if (section === "warranties" && path?.[1]) return <DashboardShell role="Dealer" title="รายละเอียดบัตรรับประกัน" active="warranties"><WarrantyDetail detail={await getDealerWarrantyDetail(access.dealerId!, decodeURIComponent(path[1]).toUpperCase())} /></DashboardShell>;
  if (section === "warranties") return <DashboardShell role="Dealer" title="บัตรรับประกันของร้าน" active="warranties"><RecordsTable records={await getDealerWarranties(access.dealerId!)} /></DashboardShell>;
  if (section === "maintenance") return <DashboardShell role="Dealer" title="Maintenance & Inspection" active="maintenance"><Panel title="เพิ่มบันทึกการดูแล" copy="สแกน QR แล้วเลือกประเภทบริการ ระบบจะบันทึกเฉพาะ Warranty ของร้านตนเอง"><div className="maintenance-quick-note"><span>QR</span><p><b>สแกน → เลือกบริการ → บันทึก</b><small>Serial จาก QR จะถูกกรอกให้อัตโนมัติ ตรวจข้อมูลรถแล้วเพิ่มประวัติได้ทันที</small></p></div><DemoForm kind="maintenance" initialSerial={initialSerial} /></Panel></DashboardShell>;
  if (section === "requests") return <DashboardShell role="Dealer" title="งานที่ได้รับมอบหมาย" active="requests"><div className="admin-stack"><TaskRecords records={await getDealerTasks(access.dealerId!, 30)} /><Panel title="อัปเดตขั้นตอนงาน" copy="Dealer ไม่มีสิทธิ์อนุมัติหรือปฏิเสธคำขอสุดท้าย"><DealerRequestForm /></Panel></div></DashboardShell>;
  if (section === "profile") {
    const profile = await getDealerProfile(access.dealerId!);
    return <DashboardShell role="Dealer" title="ข้อมูลร้านและผู้ติดต่อ" active="profile"><Panel title="Dealer Profile" copy="ข้อมูลร้านจริงจากระบบ โดย Dealer แก้ไขได้เฉพาะผู้ติดต่อ โทรศัพท์ และอีเมล"><DemoForm kind="profile" profile={profile ? { dealerCode: profile.dealer_code, name: profile.name, province: profile.province, contactName: profile.contact_name, phone: profile.phone, email: profile.email ?? "", certificationTier: profile.certification_tier ?? "", status: profile.status } : undefined} /></Panel></DashboardShell>;
  }
  const [stats, warranties, tasks] = await Promise.all([getDealerStats(access.dealerId!), getDealerWarranties(access.dealerId!, 8), getDealerTasks(access.dealerId!)]);
  return <DashboardShell role="Dealer" title="ภาพรวมร้านติดตั้ง"><div className="stat-grid"><StatCard label="Active warranties" value={String(stats.primary)} note="ข้อมูลจริงของร้าน" /><StatCard label="Maintenance due" value={String(stats.secondary)} note="ภายใน 30 วัน" /><StatCard label="Open requests" value={String(stats.tertiary)} note="งานที่มอบหมายให้ร้าน" /><StatCard label="Total registrations" value={String(stats.quaternary)} note="รายการทั้งหมดของร้าน" /></div><div className="dashboard-columns"><RecordsTable records={warranties} /><aside className="task-panel"><h2>งานที่ต้องดำเนินการ</h2>{tasks.length ? tasks.map((task) => <article key={task.reference}><span>{task.reference}</span><b>{task.subject}</b><small>{formatPortalDate(task.date)}</small></article>) : <p className="empty-records">ยังไม่มีงานที่ต้องดำเนินการ</p>}</aside></div></DashboardShell>;
}

function Panel({ title, copy, children }: { title: string; copy: string; children: React.ReactNode }) { return <section className="dashboard-panel"><header><h2>{title}</h2><p>{copy}</p></header>{children}</section>; }
function RecordsTable({ records }: { records: PortalRecord[] }) { return <section className="dashboard-panel records-panel"><header><h2>รายการล่าสุด</h2><p>ข้อมูลจากระบบของร้านที่กำลังเข้าใช้งาน</p></header><div className="data-table"><div className="data-head"><b>Serial</b><b>Product</b><b>Vehicle</b><b>Install</b><b>Status</b></div>{records.length ? records.map((row) => <div className="data-row" key={row.reference}><b><Link href={`/dealer/warranties/${encodeURIComponent(row.reference)}`}>{row.reference}</Link></b><span>{row.subject}</span><span>{row.detail}</span><span>{formatPortalDate(row.date)}</span><StatusPill status={row.status.replaceAll("_", "-")} /></div>) : <p className="empty-records">ยังไม่มีบัตรรับประกันของร้าน</p>}</div></section>; }

function TaskRecords({ records }: { records: PortalRecord[] }) { return <section className="dashboard-panel records-panel"><header><h2>Assigned requests</h2><p>เฉพาะงานที่ Admin มอบหมายให้ร้านนี้</p></header><div className="data-table"><div className="data-head"><b>Reference</b><b>Type</b><b>Detail</b><b>Date</b><b>Status</b></div>{records.length ? records.map((row) => <div className="data-row" key={row.reference}><b>{row.reference}</b><span>{row.subject}</span><span>{row.detail}</span><span>{formatPortalDate(row.date)}</span><StatusPill status={row.status.replaceAll("_", "-")} /></div>) : <p className="empty-records">ยังไม่มีงานที่มอบหมาย</p>}</div></section>; }

function WarrantyDetail({ detail }: { detail: { warranty: DealerWarrantyRecord; plan: DealerServicePlan | null; maintenance: DealerMaintenanceItem[]; media: DealerMediaItem[] } | null }) {
  if (!detail) return <section className="dashboard-panel"><div className="record-not-found"><h2>ไม่พบบัตรรับประกันของร้านนี้</h2><p>ตรวจสอบ Serial หรือกลับไปยังรายการบัตรรับประกัน</p><Link className="button button-secondary" href="/dealer/warranties">กลับไปยังรายการ <span>→</span></Link></div></section>;
  const { warranty, plan, maintenance, media } = detail;
  return <div className="warranty-detail-stack">
    <section className="dashboard-panel warranty-detail-panel">
      <header><div><p className="eyebrow">{warranty.product_model_code}</p><h2>{warranty.serial_code}</h2></div><StatusPill status={warranty.status.replaceAll("_", "-")} /></header>
      <dl><div><dt>เลขที่งาน</dt><dd>{warranty.work_order_ref || "-"}</dd></div><div><dt>รูปแบบงาน</dt><dd>{wrapTypeLabel(warranty.installation_type)}</dd></div><div><dt>พื้นที่ติดตั้ง</dt><dd>{warranty.coverage_area}</dd></div><div><dt>สาขา / ช่าง</dt><dd>{[warranty.installation_branch, warranty.installer_name].filter(Boolean).join(" · ") || "-"}</dd></div><div><dt>ลูกค้า</dt><dd>{warranty.customer_name || "รอลูกค้ากรอกข้อมูล"}</dd></div><div><dt>โทรศัพท์</dt><dd>{warranty.customer_phone || "-"}</dd></div><div><dt>อีเมล</dt><dd>{warranty.customer_email || "-"}</dd></div><div><dt>รถ</dt><dd>{[warranty.vehicle_make, warranty.vehicle_model, warranty.vehicle_year].filter(Boolean).join(" ") || "รอลูกค้ากรอกข้อมูล"}</dd></div><div><dt>สีเดิม / ทะเบียน</dt><dd>{[warranty.vehicle_color, warranty.vehicle_plate].filter(Boolean).join(" · ") || "-"}</dd></div><div><dt>ยืนยันรถ</dt><dd>{warranty.vehicle_vin_last6 ? `เลขตัวถังท้าย ${warranty.vehicle_vin_last6}` : "-"}{warranty.odometer_km != null ? ` · ${Number(warranty.odometer_km).toLocaleString("th-TH")} กม.` : ""}</dd></div><div><dt>ติดตั้ง</dt><dd>{formatPortalDate(warranty.install_date)}</dd></div><div><dt>หมดอายุ</dt><dd>{warranty.expiry_date ? formatPortalDate(warranty.expiry_date) : "ตาม Policy"}</dd></div><div><dt>ดูแลครั้งถัดไป</dt><dd>{plan?.next_recommended_date ? formatPortalDate(plan.next_recommended_date) : "-"}</dd></div></dl>
      <div className="dealer-detail-warranty-terms">
        <section className="nexs-product-warranty"><p className="eyebrow">NEXS PRODUCT WARRANTY</p><h2>{productWarrantyTitle(warranty.product_model_code, warranty.warranty_years)}</h2><article><b>คุ้มครอง</b><p>{NEXS_PRODUCT_WARRANTY_COVERAGE}</p></article><article className="warranty-exclusion"><b>ไม่ครอบคลุม</b><p>{NEXS_PRODUCT_WARRANTY_EXCLUSIONS}</p></article></section>
        <section className="dealer-warranty-terms"><p className="eyebrow">DEALER SERVICE TERMS</p><h2>ข้อความที่ร้านแจ้งลูกค้า</h2><article><span>งานติดตั้ง</span><b>{plan?.installation_warranty_terms || "ไม่ได้ระบุ"}</b></article><article><span>งานลอกฟิล์ม</span><b>{plan?.removal_warranty_terms || "ไม่ได้ระบุ"}</b></article><p className="dealer-service-notice">{DEALER_SERVICE_NOTICE}</p></section>
      </div>
      <DealerServicePlanEditor serial={warranty.serial_code} plan={plan} />
      <div className="detail-actions"><Link className="button button-primary" href={`/r/${encodeURIComponent(warranty.serial_code)}`}>เปิดบัตรสาธารณะ <span>→</span></Link>{warranty.status === "pending_customer" && <Link className="button button-secondary" href={`/dealer/customer-registration?serial=${encodeURIComponent(warranty.serial_code)}`}>ช่วยกรอกข้อมูลลูกค้า <span>→</span></Link>}<Link className="button button-secondary" href={`/dealer/maintenance?serial=${encodeURIComponent(warranty.serial_code)}`}>เพิ่มบริการ / ใช้สิทธิ์ <span>→</span></Link></div>
      <WarrantyQr cardPath={`/r/${encodeURIComponent(warranty.serial_code)}`} serial={warranty.serial_code} />
    </section>
    <section className="detail-subgrid"><div className="dashboard-panel"><header><h2>ประวัติบริการทั้งหมด</h2></header>{maintenance.length ? maintenance.map((item) => <article className="detail-list-item" key={item.id}><b>{serviceTypeLabel(item.maintenance_type)}{item.pieces_count ? ` · ${item.pieces_count} ชิ้น` : ""}</b><span>{formatPortalDate(item.maintenance_date)} · {item.result_status}{item.performed_by ? ` · ${item.performed_by}` : ""}</span>{item.service_scope && <p>บริเวณ: {item.service_scope}</p>}{item.note && <p>{item.note}</p>}{item.next_recommended_date && <small>ครั้งถัดไป {formatPortalDate(item.next_recommended_date)}</small>}</article>) : <p className="empty-records">ยังไม่มีประวัติการดูแล</p>}</div><div className="dashboard-panel"><header><h2>Private work images</h2></header>{media.length ? media.map((item) => <article className="detail-list-item" key={item.id}><Link href={`/api/partner/media/${item.id}`} target="_blank">{item.original_name}</Link><span>{item.content_type} · {Math.ceil(item.size_bytes / 1024)} KB</span></article>) : <p className="empty-records">ไม่มีภาพงานติดตั้ง</p>}</div></section>
  </div>;
}

function wrapTypeLabel(value: string) {
  return { full_body: "Wrap เต็มคัน", partial: "Wrap บางส่วน", color_wrap: "เปลี่ยนสีรถ", custom: "งานออกแบบพิเศษ" }[value] ?? "งาน Wrap";
}

function formatPortalDate(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Bangkok" }).format(date); }

function normalizePrefillSerial(value: string | string[] | undefined) {
  const serial = (Array.isArray(value) ? value[0] : value)?.trim().toUpperCase().replace(/\s+/g, "") ?? "";
  return /^[A-Z0-9-]{6,64}$/.test(serial) ? serial : "";
}
