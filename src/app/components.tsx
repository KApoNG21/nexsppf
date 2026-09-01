import Link from "next/link";
import type { ReactNode } from "react";
import type { AdminPermission } from "../db/admin-permissions";
import { navItems, type ProductTier } from "./content";

export function Logo({ inverse = false, lockup = false }: { inverse?: boolean; lockup?: boolean }) {
  return (
    <span className={`logo ${inverse ? "logo-inverse" : ""} ${lockup ? "logo-lockup" : ""}`} aria-label="NEXS">
      <span aria-hidden="true" />
    </span>
  );
}

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link className="brand" href="/" aria-label="NEXS หน้าแรก">
        <Logo lockup />
      </Link>
      <nav className="desktop-nav" aria-label="เมนูหลัก">
        {navItems.map(([label, href]) => <Link href={href} key={href}>{label}</Link>)}
      </nav>
      <div className="header-actions">
        <Link className="location-link" href="/dealers">⌖ <span>ค้นหาศูนย์ติดตั้ง</span></Link>
        <span className="lang-link" aria-label="ภาษาปัจจุบัน ภาษาไทย">TH</span>
      </div>
      <details className="mobile-menu">
        <summary aria-label="เปิดเมนู">เมนู</summary>
        <nav>
          {navItems.map(([label, href]) => <Link href={href} key={href}>{label}</Link>)}
          <Link href="/dealers">ค้นหาศูนย์ติดตั้ง</Link>
          <Link href="/contact">ติดต่อ NEXS</Link>
          <Link href="/warranty">ตรวจสอบบัตรรับประกัน</Link>
          <Link href="/login">Dealer Login</Link>
        </nav>
      </details>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-grid">
        <div className="footer-brand">
          <Logo inverse />
          <p>ฟิล์มกันรอยรถยนต์ระดับพรีเมียม<br />พร้อมระบบบัตรรับประกันดิจิทัล</p>
          <small>Think New. Think NEXS.</small>
        </div>
        <FooterColumn title="ผลิตภัณฑ์" links={[["Clear PPF", "/clear-ppf"], ["Matte PPF", "/matte-ppf"], ["Color PPF", "/color-ppf"], ["เปรียบเทียบ", "/compare"]]} />
        <FooterColumn title="บริการ" links={[["ตรวจสอบรับประกัน", "/warranty"], ["แจ้งตรวจสภาพ", "/support/inspection"], ["คำถามที่พบบ่อย", "/faq"], ["ติดต่อเรา", "/contact"]]} />
        <FooterColumn title="ตัวแทนจำหน่าย" links={[["ค้นหาศูนย์ติดตั้ง", "/dealers"], ["สำหรับ Dealer", "/for-dealers"], ["Dealer Login", "/login"], ["คู่มือการติดตั้ง", "/standard"]]} />
        <div className="footer-contact">
          <h3>ติดต่อเรา</h3>
          <p>โทร <a href="tel:0965964639"><b>096-596-4639</b></a><br />LINE Official <b>@nexslabs</b></p>
          <p>Nexs PPF Co., Ltd.<br />ประเทศไทย</p>
        </div>
      </div>
      <div className="footer-legal">
        <span>© 2026 NEXS. All rights reserved.</span>
        <span><Link href="/privacy">Privacy Policy</Link><Link href="/terms">Terms & Conditions</Link><Link href="/warranty-policy">Warranty Policy</Link></span>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: string[][] }) {
  return <div className="footer-column"><h3>{title}</h3>{links.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}</div>;
}

export function PageShell({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`page-shell ${className}`}><a className="skip-link" href="#main-content">ข้ามไปยังเนื้อหาหลัก</a><SiteHeader /><main id="main-content">{children}</main><SiteFooter /></div>;
}

export function SectionTitle({ eyebrow, title, copy, center = true }: { eyebrow?: string; title: string; copy?: string; center?: boolean }) {
  return (
    <div className={`section-title ${center ? "center" : ""}`}>
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h2>{title}</h2>
      {copy && <p>{copy}</p>}
    </div>
  );
}

export function ArrowLink({ href, children, secondary = false }: { href: string; children: ReactNode; secondary?: boolean }) {
  return <Link className={`button ${secondary ? "button-secondary" : "button-primary"}`} href={href}>{children}<span aria-hidden="true">→</span></Link>;
}

export function ProductCard({ product, compact = false }: { product: ProductTier; compact?: boolean }) {
  return (
    <article className={`product-card tone-${product.tone} ${compact ? "compact" : ""}`}>
      <div className="product-card-top">
        <div><p className="product-code">{product.code}</p><h3>{product.name}</h3><b>{product.role}</b></div>
        <div className="film-roll" aria-hidden="true"><span /></div>
      </div>
      <p>{product.summary}</p>
      <dl>
        <div><dt>การรับประกัน</dt><dd>{product.warranty}</dd></div>
        <div><dt>ผิวสัมผัส</dt><dd>{product.finish}</dd></div>
        <div><dt>เหมาะกับ</dt><dd>{product.bestFor}</dd></div>
      </dl>
      {!compact && <ul>{product.features.map((feature) => <li key={feature}>✓ {feature}</li>)}</ul>}
      <Link className="card-link" href={`/products/${product.code.toLowerCase()}`}>ดูรายละเอียด <span>→</span></Link>
    </article>
  );
}

export function TrustStrip() {
  return (
    <section className="trust-strip" aria-label="มาตรฐาน NEXS">
      <div><b>◇</b><span><strong>Premium Finish</strong><small>ออกแบบเพื่อผิวรถระดับพรีเมียม</small></span></div>
      <div><b>↻</b><span><strong>After-sales Flow</strong><small>บันทึกการดูแลและตรวจสภาพ</small></span></div>
      <div><b>◉</b><span><strong>QR Warranty</strong><small>ตรวจสอบบัตรดิจิทัลได้ทันที</small></span></div>
      <div><b>⌖</b><span><strong>Dealer Network</strong><small>ติดตั้งโดยผู้เชี่ยวชาญ</small></span></div>
    </section>
  );
}

export function DashboardShell({ role, title, children, active = "dashboard", adminPermissions = [] }: { role: "Dealer" | "Admin"; title: string; children: ReactNode; active?: string; adminPermissions?: readonly AdminPermission[] }) {
  type DashboardLink = { key: string; label: string; href: string; permission?: AdminPermission };
  const dealerLinks: DashboardLink[] = [
    { key: "dashboard", label: "ภาพรวม", href: "/dealer" },
    { key: "register", label: "เปิดใช้งาน QR", href: "/dealer/register-warranty" },
    { key: "customer-registration", label: "ช่วยกรอกข้อมูลลูกค้า", href: "/dealer/customer-registration" },
    { key: "warranties", label: "บัตรรับประกัน", href: "/dealer/warranties" },
    { key: "maintenance", label: "Maintenance", href: "/dealer/maintenance" },
    { key: "profile", label: "ข้อมูลร้าน", href: "/dealer/profile" },
    { key: "password", label: "เปลี่ยนรหัสผ่าน", href: "/change-password?return_to=/dealer" },
  ];
  const adminLinks: DashboardLink[] = [
    { key: "dashboard", label: "ภาพรวม", href: "/admin" },
    { key: "stock", label: "ระบบสต็อกฟิล์ม", href: "/admin/stock", permission: "stock.view" },
    { key: "serials", label: "Serial / Batch", href: "/admin/serials", permission: "serial.manage" },
    { key: "warranties", label: "บัตรรับประกัน", href: "/admin/warranties", permission: "warranty.view" },
    { key: "exceptions", label: "Registration Exceptions", href: "/admin/registration-exceptions", permission: "warranty.manage" },
    { key: "dealers", label: "Dealer", href: "/admin/dealers", permission: "dealer.manage" },
    { key: "products", label: "สินค้า / Policy", href: "/admin/products", permission: "catalog.manage" },
    { key: "maintenance", label: "Maintenance", href: "/admin/maintenance", permission: "warranty.view" },
    { key: "media", label: "Private Media", href: "/admin/media", permission: "warranty.view" },
    { key: "contact", label: "Contact Requests", href: "/admin/contact-requests", permission: "requests.manage" },
    { key: "support", label: "Support Requests", href: "/admin/support-requests", permission: "requests.manage" },
    { key: "inspection", label: "Inspection", href: "/admin/inspection-requests", permission: "requests.manage" },
    { key: "users", label: "ผู้ใช้และสิทธิ์", href: "/admin/users", permission: "access.manage" },
    { key: "audit", label: "Audit Log", href: "/admin/audit-log", permission: "audit.view" },
    { key: "reports", label: "Reports", href: "/admin/reports", permission: "reports.export" },
    { key: "policy", label: "Policy", href: "/admin/policy", permission: "catalog.manage" },
    { key: "password", label: "เปลี่ยนรหัสผ่าน", href: "/change-password?return_to=/admin" },
  ];
  const links = role === "Dealer" ? dealerLinks : adminLinks.filter((link) => !link.permission || adminPermissions.includes(link.permission));
  return (
    <div className="dashboard-page">
      <aside className="dashboard-sidebar">
        <Link href="/" className="dashboard-logo"><Logo inverse /></Link>
        <p className="dashboard-role">{role} Workspace</p>
        <nav>{links.map(({ key, label, href }) => <Link className={active === key ? "active" : ""} key={href} href={href}>{label}</Link>)}</nav>
        <Link className="dashboard-exit" href="/">← กลับเว็บไซต์</Link>
      </aside>
      <main className="dashboard-main">
        <header className="dashboard-header"><div><p>{role === "Admin" ? "NEXS Operations" : "NEXS Digital Warranty"}</p><h1>{title}</h1></div><span className="demo-badge">ระบบปลอดภัย · จำกัดข้อมูลตามบัญชีและสิทธิ์</span></header>
        {children}
      </main>
    </div>
  );
}

export function StatCard({ label, value, note }: { label: string; value: string; note: string }) {
  return <article className="stat-card"><span>{label}</span><strong>{value}</strong><small>{note}</small></article>;
}

export function StatusPill({ status }: { status: string }) {
  const labels: Record<string, string> = { active: "พร้อมใช้งาน", pending: "รอตรวจสอบ", "pending-customer": "รอลูกค้ากรอกข้อมูล", "profile-required": "รอลูกค้ากรอกข้อมูล", expired: "หมดอายุ", "under-review": "อยู่ระหว่างตรวจสอบ", "not-registered": "ยังไม่เปิดใช้งาน", "no-account": "ยังไม่มีบัญชี", "password-change": "รอเปลี่ยนรหัส", "account-suspended": "บัญชีถูกระงับ", "service-unavailable": "ระบบไม่พร้อม", invalid: "ไม่พบข้อมูล" };
  return <span className={`status-pill status-${status}`}>{labels[status] ?? status}</span>;
}

export function WarrantyJourney({ current }: { current: "dealer" | "customer" | "active" }) {
  const steps = [
    ["dealer", "01", "ศูนย์เปิดงาน Wrap", "บันทึกขอบเขตและหลักฐาน"],
    ["customer", "02", "ลูกค้ายืนยันรถ", "ทำครั้งเดียว"],
    ["active", "03", "บัตรพร้อมใช้งาน", "ดูสิทธิ์และประวัติบริการ"],
  ] as const;
  const currentIndex = steps.findIndex(([key]) => key === current);
  return (
    <section className="warranty-journey" aria-label="ขั้นตอนเปิดบัตรรับประกัน">
      {steps.map(([key, number, title, copy], index) => (
        <div className={index < currentIndex ? "done" : index === currentIndex ? "current" : ""} key={key}>
          <span>{index < currentIndex ? "✓" : number}</span>
          <p><b>{title}</b><small>{copy}</small></p>
        </div>
      ))}
    </section>
  );
}
