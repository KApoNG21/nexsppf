import { ADMIN_PERMISSION_DEFINITIONS, ADMIN_ROLE_PRESETS } from "../../db/admin-permissions";
import type { PartnerAccess } from "../../db/partner-access";

export function AccessControlPanel({ access, prototype = false }: { access: PartnerAccess; prototype?: boolean }) {
  const permissionGroups = [...new Set(ADMIN_PERMISSION_DEFINITIONS.map((item) => item.group))];
  return (
    <div className="access-control-stack">
      <section className="owner-access-card">
        <div className="owner-access-mark">A</div>
        <div>
          <p>บัญชีที่กำลังใช้งาน</p>
          <h2>{access.displayName || access.email}</h2>
          <span>{access.email}</span>
        </div>
        <div className="owner-access-status">
          <b>{access.isOwner ? "OWNER / SUPER ADMIN" : "CUSTOM ADMIN"}</b>
          <small>{access.isOwner ? "ทำได้ทุกอย่างและจัดการสิทธิ์ของผู้อื่นได้" : `${access.permissions.length} สิทธิ์ที่ได้รับ`}</small>
        </div>
      </section>

      <section className="dashboard-panel access-intro-panel">
        <header><h2>หลักการกำหนดสิทธิ์</h2><p>หนึ่งคนใช้หนึ่งบัญชี และบัญชีเดียวสามารถทำงานได้หลายส่วนตามที่ Owner เลือก</p></header>
        <div>
          <article><span>01</span><b>เพิ่มผู้ใช้ด้วยอีเมล</b><p>พนักงานลงชื่อเข้าใช้ด้วยบัญชีของตนเอง ไม่แชร์ Username</p></article>
          <article><span>02</span><b>เลือกชุดสิทธิ์เริ่มต้น</b><p>เลือกผู้ดูแลสต๊อก ผู้ดูแล Warranty หรือผู้ตรวจสอบ</p></article>
          <article><span>03</span><b>ปรับสิทธิ์รายงานได้</b><p>เพิ่มหรือตัดงานเฉพาะ เช่น รับเข้าได้ แต่ปรับยอดไม่ได้</p></article>
          <article><span>04</span><b>บันทึกใน Audit Log</b><p>การเพิ่ม ระงับ และแก้สิทธิ์ต้องตรวจย้อนหลังได้เสมอ</p></article>
        </div>
      </section>

      <section className="access-role-section">
        <header><div><p>ROLE PRESETS</p><h2>ชุดสิทธิ์ที่แนะนำ</h2></div><span>ใช้เป็นจุดเริ่มต้น แล้วปรับรายคนได้</span></header>
        <div className="access-role-grid">
          {ADMIN_ROLE_PRESETS.map((preset) => (
            <article className={preset.key === "owner" ? "featured" : ""} key={preset.key}>
              <div><span>{preset.key === "owner" ? "A" : preset.label.slice(0, 1)}</span><small>{preset.permissions.length} สิทธิ์</small></div>
              <h3>{preset.label}</h3>
              <p>{preset.description}</p>
              <ul>{preset.permissions.slice(0, 5).map((permission) => <li key={permission}>✓ {ADMIN_PERMISSION_DEFINITIONS.find((item) => item.key === permission)?.label}</li>)}</ul>
              {preset.permissions.length > 5 && <small>และอีก {preset.permissions.length - 5} สิทธิ์</small>}
            </article>
          ))}
        </div>
      </section>

      <section className="dashboard-panel permission-matrix">
        <header><h2>รายการสิทธิ์แบบละเอียด</h2><p>เมนู หน้าเว็บ และคำสั่งฝั่งระบบต้องตรวจสิทธิ์เดียวกัน ไม่ใช่แค่ซ่อนปุ่ม</p></header>
        <div>
          {permissionGroups.map((group) => (
            <article key={group}>
              <h3>{group}</h3>
              {ADMIN_PERMISSION_DEFINITIONS.filter((item) => item.group === group).map((item) => (
                <div key={item.key}><span>✓</span><p><b>{item.label}</b><small>{item.description}</small></p><code>{item.key}</code></div>
              ))}
            </article>
          ))}
        </div>
      </section>

      <p className="access-future-note"><b>สถานะ{prototype ? "ตัวทดลอง" : "ระบบ"}:</b> บัญชี Owner ปัจจุบันเปิดทุกสิทธิ์แล้ว โครงฐานข้อมูลและการตรวจสิทธิ์แยกตามงานถูกเตรียมไว้สำหรับการเพิ่มผู้ใช้ในระยะถัดไป โดยยังใช้ระบบ Login เดิม</p>
    </div>
  );
}
