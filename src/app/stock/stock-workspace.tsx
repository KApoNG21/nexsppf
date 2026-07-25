"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import styles from "./stock-workspace.module.css";

export type StockViewKey = "today" | "scan" | "inventory" | "movement" | "rolls" | "count" | "reports";
type ViewKey = StockViewKey;
type UnitStatus = "available" | "reserved" | "open" | "in-transit" | "issued" | "damaged";
type LabelStatus = "printed" | "unprinted";
type SerialSource = "existing-qr" | "system" | "opening-balance";
type ProductFamily = "NEXS" | "PLAIN BOX" | "COLOR FILM";
type ProductConfigStatus = "confirmed" | "verify";
type ProductKind = "standard" | "color";

type StockUnit = {
  serial: string;
  product: string;
  variant: string;
  lot: string;
  location: string;
  status: UnitStatus;
  labelStatus: LabelStatus;
  source: SerialSource;
  initialMetres: number;
  metres: number;
  updatedAt: string;
  productKind?: ProductKind;
  colorProductId?: number;
  colorName?: string;
  colorCode?: string;
  colorHex?: string;
};

type Activity = {
  id: string;
  type: string;
  title: string;
  detail: string;
  time: string;
  tone: "red" | "green" | "blue" | "gold";
};

type ProductOption = {
  value: string;
  family: ProductFamily;
  qr: boolean;
  variant: string;
  finish: string;
  codes: string[];
  skuCode: string;
  metres: number;
  configStatus: ProductConfigStatus;
};

type ColorProduct = {
  id: number;
  skuCode: string;
  seriesName: string;
  productName: string;
  colorName: string;
  colorCode: string;
  colorHex: string;
  sizeLabel: string;
  metres: number;
  hasImage: boolean;
  imageUrl: string | null;
  updatedAt: string;
};

const STORAGE_KEY = "nexs-stock-workspace-prototype-v3";

const PRODUCT_OPTIONS: ProductOption[] = [
  { value: "NEXS BEGIN", family: "NEXS", qr: true, variant: "1.50 × 15 m", finish: "ฟิล์มใส", codes: ["B", "BGN", "BEGIN"], skuCode: "NEXS-BEGIN", metres: 15, configStatus: "confirmed" },
  { value: "NEXS PRIME", family: "NEXS", qr: true, variant: "1.52 × 15 m", finish: "ฟิล์มใส", codes: ["PRI", "PRIME"], skuCode: "NEXS-PRIME", metres: 15, configStatus: "confirmed" },
  { value: "NEXS PRO", family: "NEXS", qr: true, variant: "1.52 × 15 m", finish: "ฟิล์มใส", codes: ["PRO"], skuCode: "NEXS-PRO", metres: 15, configStatus: "verify" },
  { value: "NEXS ULTIMATE", family: "NEXS", qr: true, variant: "1.52 × 15 m", finish: "ฟิล์มใส", codes: ["ULT", "ULTIMATE"], skuCode: "NEXS-ULTIMATE", metres: 15, configStatus: "verify" },
  { value: "TPU SATIN MATTE (HYDROPHILIC)", family: "PLAIN BOX", qr: false, variant: "1.52 × 15 m", finish: "Satin Matte · Hydrophilic", codes: ["TPU-SMHYD"], skuCode: "TPU-SMHYD", metres: 15, configStatus: "confirmed" },
  { value: "TPU MATTE", family: "PLAIN BOX", qr: false, variant: "1.52 × 15 m", finish: "ฟิล์มด้าน", codes: ["TPU-MATTE"], skuCode: "TPU-MATTE", metres: 15, configStatus: "verify" },
  { value: "TPU MATTE BLACK", family: "PLAIN BOX", qr: false, variant: "1.52 × 15 m", finish: "ฟิล์มดำด้าน", codes: ["TPU-MATBLK"], skuCode: "TPU-MATBLK", metres: 15, configStatus: "confirmed" },
  { value: "TPU BLACK", family: "PLAIN BOX", qr: false, variant: "1.52 × 15 m", finish: "ฟิล์มดำ", codes: ["TPU-BLACK"], skuCode: "TPU-BLACK", metres: 15, configStatus: "confirmed" },
  { value: "EPU-9090", family: "PLAIN BOX", qr: false, variant: "รอยืนยันจากฉลากจริง", finish: "รอยืนยันประเภท", codes: ["EPU-9090"], skuCode: "EPU-9090", metres: 15, configStatus: "verify" },
  { value: "TPU SATIN MATTE (HYDROPHOBIC)", family: "PLAIN BOX", qr: false, variant: "1.52 × 15 m", finish: "Satin Matte · Hydrophobic", codes: ["TPU-SMHYDP"], skuCode: "TPU-SMHYDP", metres: 15, configStatus: "verify" },
  { value: "TPU BACK SUNROOF FILM", family: "PLAIN BOX", qr: false, variant: "รอยืนยันจากฉลากจริง", finish: "ฟิล์มหลังคา / Sunroof", codes: ["TPU-BSUN"], skuCode: "TPU-BSUN", metres: 15, configStatus: "verify" },
];

const OPENING_STOCK_COUNTS = [
  { product: "NEXS BEGIN", quantity: 15, family: "NEXS" },
  { product: "NEXS PRIME", quantity: 30, family: "NEXS" },
  { product: "NEXS PRO", quantity: 0, family: "NEXS" },
  { product: "NEXS ULTIMATE", quantity: 20, family: "NEXS" },
  { product: "TPU SATIN MATTE (HYDROPHILIC)", quantity: 6, family: "PLAIN BOX" },
  { product: "TPU MATTE", quantity: 2, family: "PLAIN BOX" },
  { product: "TPU MATTE BLACK", quantity: 2, family: "PLAIN BOX" },
  { product: "TPU BLACK", quantity: 1, family: "PLAIN BOX" },
  { product: "EPU-9090", quantity: 1, family: "PLAIN BOX" },
  { product: "TPU SATIN MATTE (HYDROPHOBIC)", quantity: 1, family: "PLAIN BOX" },
  { product: "TPU BACK SUNROOF FILM", quantity: 2, family: "PLAIN BOX" },
] as const;

const OPENING_BATCH = "OPENING-260724";
const OPENING_LOCATION = "MAIN / รอกำหนดตำแหน่ง";

function buildOpeningStock(): StockUnit[] {
  return OPENING_STOCK_COUNTS.flatMap((openingItem) => {
    const product = PRODUCT_OPTIONS.find((item) => item.value === openingItem.product);
    if (!product) return [];
    return Array.from({ length: openingItem.quantity }, (_, index): StockUnit => {
      const number = String(index + 1).padStart(3, "0");
      return {
        serial: product.qr
          ? `PENDING-QR-${product.skuCode}-${number}`
          : `NXS-${product.skuCode}-OPEN-${number}`,
        product: product.value,
        variant: product.variant,
        lot: OPENING_BATCH,
        location: OPENING_LOCATION,
        status: "available",
        labelStatus: product.qr ? "printed" : "unprinted",
        source: product.qr ? "opening-balance" : "system",
        initialMetres: product.metres,
        metres: product.metres,
        updatedAt: "ตั้งต้น 24 ก.ค. 2569",
      };
    });
  });
}

const INITIAL_UNITS: StockUnit[] = buildOpeningStock();

const INITIAL_ACTIVITY: Activity[] = [
  { id: "opening-260724", type: "ตั้งต้น", title: "ตั้งยอดสต๊อกเริ่มต้น 80 ม้วน", detail: "NEXS 65 ม้วน · กล่องทั่วไป 15 ม้วน · ตามยอดที่แจ้ง", time: "24 ก.ค.", tone: "green" },
];

const NAV_ITEMS: Array<{ key: ViewKey; label: string; short: string; icon: string }> = [
  { key: "today", label: "งานวันนี้", short: "วันนี้", icon: "⌂" },
  { key: "scan", label: "สแกนและรับเข้า", short: "สแกน", icon: "⌁" },
  { key: "inventory", label: "สินค้าในคลัง", short: "คลัง", icon: "▦" },
  { key: "movement", label: "เบิก คืน ย้าย และแจ้งเสีย", short: "รายการ", icon: "↔" },
  { key: "rolls", label: "ม้วนเปิดและเมตรคงเหลือ", short: "ม้วนเปิด", icon: "◔" },
  { key: "count", label: "ตรวจนับสต็อก", short: "ตรวจนับ", icon: "✓" },
  { key: "reports", label: "รายงานและประวัติ", short: "รายงาน", icon: "▤" },
];

const ADMIN_STOCK_PATHS: Record<ViewKey, string> = {
  today: "/admin/stock",
  scan: "/admin/stock/receive",
  inventory: "/admin/stock/inventory",
  movement: "/admin/stock/movements",
  rolls: "/admin/stock/open-rolls",
  count: "/admin/stock/count",
  reports: "/admin/stock/reports",
};

const STATUS_LABELS: Record<UnitStatus, string> = {
  available: "พร้อมใช้",
  reserved: "จองแล้ว",
  open: "เปิดม้วน",
  "in-transit": "กำลังย้าย",
  issued: "จ่ายออก",
  damaged: "เสียหาย",
};

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function nowLabel() {
  return new Intl.DateTimeFormat("th-TH", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Bangkok",
  }).format(new Date());
}

function serialSourceLabel(source: SerialSource) {
  if (source === "existing-qr") return "QR จริงจากสินค้า";
  if (source === "opening-balance") return "รอผูก QR จริง";
  return "ระบบสร้างให้";
}

function colorProductForUnit(unit: StockUnit, products: ColorProduct[]) {
  if (unit.productKind !== "color" || !unit.colorProductId) return null;
  return products.find((product) => product.id === unit.colorProductId) ?? null;
}

function colorProductLabel(unit: StockUnit) {
  if (unit.productKind !== "color") return "";
  return [unit.colorName, unit.colorCode].filter(Boolean).join(" · ");
}

function findQrProduct(rawValue: string) {
  const tokens = rawValue.trim().toUpperCase().split(/[^A-Z0-9]+/).filter(Boolean);
  return PRODUCT_OPTIONS.find((item) => item.qr && item.codes.some((code) => tokens.includes(code)));
}

function exportStockCsv(units: StockUnit[]) {
  const escapeCsv = (value: string | number) => `"${String(value).replaceAll("\"", "\"\"")}"`;
  const rows = [
    ["Serial", "สินค้า", "ชื่อสี", "รหัสสี", "ขนาด", "Lot", "ตำแหน่ง", "สถานะ", "แหล่ง Serial", "Label", "คงเหลือเมตร"],
    ...units.map((unit) => [
      unit.serial,
      unit.product,
      unit.colorName ?? "",
      unit.colorCode ?? "",
      unit.variant,
      unit.lot,
      unit.location,
      STATUS_LABELS[unit.status],
      serialSourceLabel(unit.source),
      unit.labelStatus === "printed" ? "พิมพ์แล้ว" : "ยังไม่พิมพ์",
      unit.metres,
    ]),
  ];
  const csv = "\uFEFF" + rows.map((row) => row.map(escapeCsv).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `nexs-stock-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function exportProductBalanceCsv(units: StockUnit[]) {
  const escapeCsv = (value: string | number) => `"${String(value).replaceAll("\"", "\"\"")}"`;
  const colorBalances = [...new Map(
    units
      .filter((unit) => unit.productKind === "color")
      .map((unit) => [unit.product, unit]),
  ).values()].map((sample) => {
    const productUnits = units.filter((unit) => unit.product === sample.product);
    const activeUnits = productUnits.filter((unit) => !["issued", "damaged"].includes(unit.status));
    return [
      sample.product,
      `ฟิล์มสี · ${colorProductLabel(sample) || "ยังไม่ระบุสี"}`,
      0,
      activeUnits.length,
      activeUnits.length,
      activeUnits.reduce((sum, unit) => sum + unit.metres, 0).toFixed(1),
      0,
      activeUnits.filter((unit) => unit.labelStatus === "unprinted").length,
    ];
  });
  const rows = [
    ["สินค้า", "กลุ่ม", "ยอดตั้งต้น", "คงเหลือปัจจุบัน", "เปลี่ยนแปลง", "เมตรคงเหลือ", "รอผูก QR", "ยังไม่พิมพ์ Label"],
    ...OPENING_STOCK_COUNTS.map((item) => {
      const productUnits = units.filter((unit) => unit.product === item.product);
      const activeUnits = productUnits.filter((unit) => !["issued", "damaged"].includes(unit.status));
      return [
        item.product,
        item.family === "NEXS" ? "NEXS · มี QR ประจำม้วน" : "กล่องทั่วไป",
        item.quantity,
        activeUnits.length,
        activeUnits.length - item.quantity,
        activeUnits.reduce((sum, unit) => sum + unit.metres, 0).toFixed(1),
        activeUnits.filter((unit) => unit.source === "opening-balance").length,
        activeUnits.filter((unit) => unit.labelStatus === "unprinted").length,
      ];
    }),
    ...colorBalances,
  ];
  const csv = "\uFEFF" + rows.map((row) => row.map(escapeCsv).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `nexs-stock-balance-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function StockWorkspace({ prototype = false, adminMode = false, persisted = false, initialView = "today", allowedViews = NAV_ITEMS.map((item) => item.key), adminAccessLabel = "สิทธิ์ระบบสต๊อก" }: { prototype?: boolean; adminMode?: boolean; persisted?: boolean; initialView?: StockViewKey; allowedViews?: StockViewKey[]; adminAccessLabel?: string }) {
  const router = useRouter();
  const [view, setView] = useState<ViewKey>(initialView);
  const [units, setUnits] = useState<StockUnit[]>(INITIAL_UNITS);
  const [activity, setActivity] = useState<Activity[]>(INITIAL_ACTIVITY);
  const [colorProducts, setColorProducts] = useState<ColorProduct[]>([]);
  const [dataReady, setDataReady] = useState(!persisted);
  const [dataVersion, setDataVersion] = useState(0);
  const [syncStatus, setSyncStatus] = useState<"loading" | "saving" | "saved" | "error">(persisted ? "loading" : "saved");
  const [toast, setToast] = useState("");
  const [globalSearch, setGlobalSearch] = useState("");
  const [selectedUnit, setSelectedUnit] = useState<StockUnit | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const lastSavedPayload = useRef("");
  const visibleNavItems = NAV_ITEMS.filter((item) => allowedViews.includes(item.key));

  useEffect(() => {
    if (persisted) return;
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as { units?: StockUnit[]; activity?: Activity[] };
      if (parsed.units?.length) setUnits(parsed.units);
      if (parsed.activity?.length) setActivity(parsed.activity);
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, [persisted]);

  useEffect(() => {
    if (!persisted) return;
    let active = true;
    const controller = new AbortController();
    setSyncStatus("loading");
    fetch("/api/admin/stock", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const result = await response.json() as {
          ok?: boolean;
          exists?: boolean;
          version?: number;
          units?: StockUnit[] | null;
          activity?: Activity[] | null;
          error?: string;
        };
        if (!response.ok || !result.ok) throw new Error(result.error || "ไม่สามารถโหลดข้อมูลสต็อกได้");
        if (!active) return;
        const nextUnits = result.exists && result.units?.length ? result.units : INITIAL_UNITS;
        const nextActivity = result.exists && result.activity?.length ? result.activity : INITIAL_ACTIVITY;
        lastSavedPayload.current = result.exists ? JSON.stringify({ units: nextUnits, activity: nextActivity }) : "";
        setUnits(nextUnits);
        setActivity(nextActivity);
        setDataVersion(result.version ?? 0);
        setDataReady(true);
        setSyncStatus("saved");
      })
      .catch((error: unknown) => {
        if (!active || controller.signal.aborted) return;
        setSyncStatus("error");
        setToast(error instanceof Error ? error.message : "ไม่สามารถโหลดข้อมูลสต็อกได้");
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [persisted]);

  useEffect(() => {
    if (!persisted) return;
    const controller = new AbortController();
    fetch("/api/admin/stock/color-products", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const result = await response.json() as { ok?: boolean; products?: ColorProduct[]; error?: string };
        if (!response.ok || !result.ok) throw new Error(result.error || "ไม่สามารถโหลดรายการฟิล์มสีได้");
        setColorProducts(result.products ?? []);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setToast(error instanceof Error ? error.message : "ไม่สามารถโหลดรายการฟิล์มสีได้");
      });
    return () => controller.abort();
  }, [persisted]);

  useEffect(() => {
    setView(initialView);
    setSelectedUnit(null);
  }, [initialView]);

  useEffect(() => {
    if (persisted) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ units, activity }));
  }, [persisted, units, activity]);

  useEffect(() => {
    if (!persisted || !dataReady) return;
    const payload = JSON.stringify({ units, activity });
    if (payload === lastSavedPayload.current) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setSyncStatus("saving");
      try {
        const response = await fetch("/api/admin/stock", {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ version: dataVersion, units, activity }),
          signal: controller.signal,
        });
        const result = await response.json() as { ok?: boolean; version?: number; error?: string };
        if (response.status === 409) {
          setSyncStatus("error");
          setToast(result.error || "ข้อมูลถูกอัปเดตจากอีกหน้าต่าง กำลังโหลดข้อมูลล่าสุด");
          window.setTimeout(() => window.location.reload(), 1200);
          return;
        }
        if (!response.ok || !result.ok || typeof result.version !== "number") {
          throw new Error(result.error || "ไม่สามารถบันทึกข้อมูลสต็อกได้");
        }
        lastSavedPayload.current = payload;
        setDataVersion(result.version);
        setSyncStatus("saved");
      } catch (error) {
        if (controller.signal.aborted) return;
        setSyncStatus("error");
        setToast(error instanceof Error ? error.message : "ไม่สามารถบันทึกข้อมูลสต็อกได้");
      }
    }, 450);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [persisted, dataReady, dataVersion, units, activity]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(""), 3200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const summary = useMemo(() => {
    const activeUnits = units.filter((unit) => !["issued", "damaged"].includes(unit.status));
    return {
      active: activeUnits.length,
      available: units.filter((unit) => unit.status === "available").length,
      open: units.filter((unit) => unit.status === "open").length,
      openMetres: units.filter((unit) => unit.status === "open").reduce((sum, unit) => sum + unit.metres, 0),
      unprinted: units.filter((unit) => unit.labelStatus === "unprinted").length,
      damaged: units.filter((unit) => unit.status === "damaged").length,
      low: units.filter((unit) => unit.status === "open" && unit.metres <= 5).length,
      attention: units.filter((unit) => unit.status === "damaged" || (unit.status === "open" && unit.metres <= 5)).length,
      pendingQr: units.filter((unit) => unit.source === "opening-balance" && !["issued", "damaged"].includes(unit.status)).length,
    };
  }, [units]);

  function openView(next: ViewKey) {
    if (!allowedViews.includes(next)) {
      setToast("บัญชีนี้ยังไม่มีสิทธิ์ทำรายการในส่วนที่เลือก");
      return;
    }
    setView(next);
    setSelectedUnit(null);
    if (adminMode) router.push(ADMIN_STOCK_PATHS[next], { scroll: false });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function pushActivity(item: Omit<Activity, "id" | "time">) {
    const next: Activity = {
      ...item,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      time: new Intl.DateTimeFormat("th-TH", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" }).format(new Date()),
    };
    setActivity((current) => [next, ...current].slice(0, 14));
  }

  function resetDemo() {
    setUnits(INITIAL_UNITS);
    setActivity(INITIAL_ACTIVITY);
    window.localStorage.removeItem(STORAGE_KEY);
    setToast("คืนค่าสต๊อกตั้งต้น 80 ม้วนเรียบร้อย");
    openView("today");
  }

  return (
    <div className={styles.workspace}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <img src="/brand/nexs-logo-light.png" alt="NEXS" width="100" height="31" />
          <span>STOCK WORKSPACE</span>
        </div>
        {adminMode && <Link className={styles.adminReturn} href="/admin">← กลับหน้า Admin Overview</Link>}
        <div className={styles.workspaceSwitcher}>
          <span className={styles.liveDot} />
          <div><b>คลังหลัก NEXS</b><small>MAIN WAREHOUSE</small></div>
          <span>⌄</span>
        </div>
        <nav aria-label="เมนูระบบสต็อก">
          <p>การทำงาน</p>
          {visibleNavItems.map((item) => (
            <button className={view === item.key ? styles.activeNav : ""} key={item.key} onClick={() => openView(item.key)}>
              <span>{item.icon}</span>
              <b>{item.label}</b>
              {item.key === "today" && summary.unprinted + summary.pendingQr + summary.attention > 0 && <em>{summary.unprinted + summary.pendingQr + summary.attention}</em>}
              {item.key === "scan" && summary.unprinted > 0 && <em>{summary.unprinted}</em>}
            </button>
          ))}
        </nav>
        <div className={styles.sidebarSupport}>
          <b>ต้องการความช่วยเหลือ?</b>
          <span>ดูขั้นตอนตั้งแต่รับเข้าจนตรวจนับ</span>
          <button onClick={() => setGuideOpen(true)}>เปิดคู่มือ →</button>
        </div>
        <div className={styles.userCard}>
          <span>{adminMode ? "A" : "ม"}</span>
          <div><b>{adminMode ? "Admin · ระบบสต๊อก" : "มุก · ผู้ดูแลสต็อก"}</b><small>{adminMode ? adminAccessLabel : "กำลังใช้งาน"}</small></div>
          <button aria-label="เมนูผู้ใช้" disabled title="กำหนดสิทธิ์จากหน้า ผู้ใช้และสิทธิ์">•••</button>
        </div>
      </aside>

      <div className={styles.shell}>
        <header className={styles.topbar}>
          {adminMode && <Link className={styles.mobileAdminReturn} href="/admin" aria-label="กลับหน้า Admin">← Admin</Link>}
          <button className={styles.mobileBrand} onClick={() => openView("today")} aria-label="กลับหน้างานวันนี้">
            <img src="/brand/nexs-logo-dark.png" alt="NEXS" width="82" height="25" />
          </button>
          <div className={styles.search}>
            <span>⌕</span>
            <input
              aria-label="ค้นหา Serial, SKU หรือ Lot"
              placeholder="ค้นหา Serial, SKU, Lot หรือ Location"
              value={globalSearch}
              onChange={(event) => setGlobalSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") openView("inventory");
              }}
            />
            <kbd>⌘ K</kbd>
          </div>
          <div className={styles.topActions}>
            {prototype && <span className={styles.prototypeBadge}>{adminMode ? "ADMIN STOCK · LOCAL" : "LOCAL PROTOTYPE"}</span>}
            {persisted && <span className={styles.prototypeBadge}>{syncStatus === "saved" ? "LIVE · บันทึกแล้ว" : syncStatus === "saving" ? "LIVE · กำลังบันทึก" : syncStatus === "loading" ? "LIVE · กำลังโหลด" : "LIVE · ต้องตรวจสอบ"}</span>}
            <button className={styles.iconButton} aria-label="การแจ้งเตือน" onClick={() => openView("today")}>♢{summary.unprinted + summary.attention > 0 && <em>{summary.unprinted + summary.attention}</em>}</button>
            <button className={styles.profileButton} disabled title="สิทธิ์ของบัญชีถูกกำหนดจากหน้า ผู้ใช้และสิทธิ์"><span>{adminMode ? "A" : "ม"}</span><b>{adminMode ? "Admin" : "มุก"}</b><small>{adminMode ? adminAccessLabel : "ผู้ดูแลสต็อก"}</small></button>
          </div>
        </header>

        <main className={styles.main}>
          {prototype && (
            <div className={styles.prototypeNotice}>
              <span>{adminMode ? "Admin Preview" : "ทดลองใช้งาน"}</span>
              <p>{adminMode ? "เส้นทางนี้ตรวจสิทธิ์ Admin แล้ว แต่ข้อมูลสต๊อกยังบันทึกเฉพาะ Browser เครื่องนี้และยังไม่เชื่อมฐานข้อมูล Production" : "ยอดตั้งต้น 80 ม้วนมาจากรายการที่คุณแจ้ง และบันทึกเฉพาะใน Browser เครื่องนี้ ยังไม่เชื่อมฐานข้อมูล Production"}</p>
              <div className={styles.prototypeActions}>
                {!adminMode && <Link href="/stock-demo/access">ผู้ใช้และสิทธิ์</Link>}
                <button onClick={resetDemo}>คืนค่าสต๊อกตั้งต้น</button>
              </div>
            </div>
          )}
          {persisted && !dataReady && (
            <div className={styles.prototypeNotice}>
              <span>{syncStatus === "error" ? "เชื่อมต่อไม่สำเร็จ" : "Production Stock"}</span>
              <p>{syncStatus === "error" ? "ยังไม่เปิดให้ทำรายการ เพื่อป้องกันข้อมูลในฐานข้อมูลถูกเขียนทับ กรุณารีเฟรชหน้าอีกครั้ง" : "กำลังโหลดข้อมูลสต็อกจากฐานข้อมูลกลาง กรุณารอสักครู่"}</p>
            </div>
          )}

          {dataReady && view === "today" && (
            <TodayView summary={summary} activity={activity} onOpen={openView} onGuide={() => setGuideOpen(true)} />
          )}
          {dataReady && view === "scan" && (
            <ReceiveView
              units={units}
              setUnits={setUnits}
              colorProducts={colorProducts}
              setColorProducts={setColorProducts}
              onActivity={pushActivity}
              onToast={setToast}
              onOpenInventory={() => openView("inventory")}
            />
          )}
          {dataReady && view === "inventory" && (
            <InventoryView
              units={units}
              colorProducts={colorProducts}
              initialSearch={globalSearch}
              onSelect={setSelectedUnit}
              onOpen={openView}
            />
          )}
          {dataReady && view === "movement" && (
            <MovementView
              units={units}
              setUnits={setUnits}
              colorProducts={colorProducts}
              onActivity={pushActivity}
              onToast={setToast}
            />
          )}
          {dataReady && view === "rolls" && (
            <RollsView
              units={units}
              setUnits={setUnits}
              colorProducts={colorProducts}
              onActivity={pushActivity}
              onToast={setToast}
            />
          )}
          {dataReady && view === "count" && (
            <CountView units={units} onToast={setToast} onActivity={pushActivity} />
          )}
          {dataReady && view === "reports" && <ReportsView activity={activity} units={units} />}
        </main>
      </div>

      <nav className={styles.mobileNav} aria-label="เมนูมือถือ">
        {visibleNavItems.slice(0, 5).map((item) => (
          <button className={view === item.key ? styles.mobileActive : ""} key={item.key} onClick={() => openView(item.key)}>
            <span>{item.icon}</span><b>{item.short}</b>
          </button>
        ))}
      </nav>

      {selectedUnit && (
        <UnitDrawer unit={selectedUnit} colorProducts={colorProducts} onClose={() => setSelectedUnit(null)} onOpen={openView} />
      )}
      {guideOpen && <WorkflowGuide onClose={() => setGuideOpen(false)} />}
      {toast && <div className={styles.toast}><span>✓</span>{toast}</div>}
    </div>
  );
}

function PageHeading({ eyebrow, title, copy, actions }: { eyebrow: string; title: string; copy: string; actions?: React.ReactNode }) {
  return (
    <header className={styles.pageHeading}>
      <div><p>{eyebrow}</p><h1>{title}</h1><span>{copy}</span></div>
      {actions && <div className={styles.headingActions}>{actions}</div>}
    </header>
  );
}

function ColorFilmVisual({ product, unit, compact = false }: { product?: ColorProduct | null; unit?: StockUnit | null; compact?: boolean }) {
  const colorName = product?.colorName ?? unit?.colorName ?? "ฟิล์มสี";
  const colorCode = product?.colorCode ?? unit?.colorCode ?? "";
  const colorHex = product?.colorHex ?? unit?.colorHex ?? "#73777F";
  return (
    <div className={cx(styles.colorFilmVisual, compact && styles.colorFilmVisualCompact)} style={{ backgroundColor: colorHex }} aria-label={`ตัวอย่างสี ${colorName}`}>
      {product?.imageUrl ? <img src={product.imageUrl} alt={`ตัวอย่างฟิล์มสี ${colorName}`} /> : <span style={{ backgroundColor: colorHex }} />}
      <i />
      {!compact && <small>{colorName}{colorCode ? ` · ${colorCode}` : ""}</small>}
    </div>
  );
}

function TodayView({ summary, activity, onOpen, onGuide }: {
  summary: { active: number; available: number; open: number; openMetres: number; unprinted: number; damaged: number; low: number; attention: number; pendingQr: number };
  activity: Activity[];
  onOpen: (view: ViewKey) => void;
  onGuide: () => void;
}) {
  const reminderCount = Number(summary.pendingQr > 0) + Number(summary.unprinted > 0) + Number(summary.low > 0) + Number(summary.damaged > 0);
  return (
    <>
      <PageHeading
        eyebrow={nowLabel()}
        title="วันนี้จะเริ่มงานอะไรดี?"
        copy="คุณเป็นคนเริ่มทุกขั้นตอน ระบบจะแสดงเฉพาะรายการเตือนที่เกิดจากข้อมูลสต็อกจริง"
        actions={<><button className={styles.secondaryButton} onClick={onGuide}>ดูขั้นตอนทั้งหมด</button><button className={styles.primaryButton} onClick={() => onOpen("scan")}>＋ รับสินค้าเข้า</button></>}
      />

      <section className={styles.heroGrid}>
        <article className={styles.priorityCard}>
          <div className={styles.cardEyebrow}><span className={styles.pulseDot} /> จุดเริ่มต้นที่ใช้บ่อย</div>
          <div className={styles.priorityContent}>
            <div>
              <span className={styles.priorityNumber}>01</span>
              <p>เมื่อมีฟิล์มมาถึงคลัง</p>
              <h2>เริ่มรับสินค้าเข้า</h2>
              <small>QR ประจำม้วน: สแกนแล้วรับเข้าได้ทันที<br />กล่องทั่วไป: สแกน Barcode รุ่นหรือเลือก SKU แล้วสร้าง Serial</small>
            </div>
            <div className={styles.priorityMeta}>
              <span>จำง่าย</span>
              <b>1 ม้วน = 1 Serial</b>
            </div>
          </div>
          <footer><span><b>ขั้นแรก</b> จ่อ Scanner ที่ QR บนสินค้า</span><button onClick={() => onOpen("scan")}>เริ่มสแกนรับเข้า <b>→</b></button></footer>
        </article>
        <article className={styles.visualCard}>
          <div><span>NEXS FILM INVENTORY</span><h3>รู้ทุกม้วน<br />รู้ทุกเมตร</h3><p>หนึ่ง Serial ต่อหนึ่งหน่วยสินค้า<br />ติดตามตั้งแต่รับเข้าจนใช้งานหมด</p></div>
          <div className={styles.filmOrb}><span /><span /><span /></div>
          <small>LIVE STOCK CONTROL</small>
        </article>
      </section>

      <section className={styles.kpiGrid} aria-label="สรุปสต็อก">
        <KpiCard label="ม้วนในระบบ" value={String(summary.active)} note={`${summary.available} ม้วนพร้อมใช้`} tone="green" icon="▦" />
        <KpiCard label="ม้วนที่เปิดแล้ว" value={String(summary.open)} note={`เหลือรวม ${summary.openMetres.toFixed(1)} เมตร`} tone="blue" icon="◔" />
        <KpiCard label="ยังไม่ได้พิมพ์ Label" value={String(summary.unprinted)} note="เบิกผ่าน SKU + FIFO" tone="gold" icon="⌁" />
        <KpiCard label="รอผูก QR จริง" value={String(summary.pendingQr)} note="สต๊อกตั้งต้นกลุ่ม NEXS" tone="red" icon="QR" />
      </section>

      <section className={styles.dashboardGrid}>
        <div className={styles.taskSection}>
          <div className={styles.sectionHeader}><div><p>SMART REMINDERS</p><h2>รายการที่ควรตรวจต่อ</h2></div><span>{reminderCount ? `${reminderCount} รายการจากข้อมูลจริง` : "ยังไม่มีรายการเตือน"}</span></div>
          <div className={styles.taskList}>
            {summary.damaged > 0 && <TaskRow priority="ตรวจสภาพ" tone="red" title={`มีสินค้าสถานะเสียหาย ${summary.damaged} ม้วน`} detail="รายการนี้เกิดเมื่อคุณเลือกสถานะ “เสียหาย” ให้สินค้า" meta="จากสถานะสินค้า" action="เปิดดู" onClick={() => onOpen("inventory")} />}
            {summary.low > 0 && <TaskRow priority="ใกล้หมด" tone="gold" title={`มีม้วนเปิดเหลือไม่เกิน 5 เมตร ${summary.low} ม้วน`} detail="ระบบเตือนจากยอดคงเหลือหลังบันทึกการตัดใช้ครั้งล่าสุด" meta="ระบบเตือนอัตโนมัติ" action="ดูม้วนเปิด" onClick={() => onOpen("rolls")} />}
            {summary.pendingQr > 0 && <TaskRow priority="QR ตั้งต้น" tone="red" title={`NEXS รอผูก QR จริง ${summary.pendingQr} ม้วน`} detail="ยอดถูกเพิ่มเข้าคลังแล้ว เมื่อสแกนครั้งแรก ระบบจะเปลี่ยนรหัสตั้งต้นเป็น QR จริงของม้วนนั้น" meta="จากยอดสต๊อกตั้งต้น" action="ดูในคลัง" onClick={() => onOpen("inventory")} />}
            {summary.unprinted > 0 && <TaskRow priority="Label" tone="green" title={`มี Serial ที่ยังไม่พิมพ์ Label ${summary.unprinted} ม้วน`} detail="เกิดจากรายการรับเข้าที่เลือก “ยังไม่พิมพ์” และยังใช้งาน Serial ได้ตามปกติ" meta="จากการรับสินค้าเข้า" action="เปิดดู" onClick={() => onOpen("inventory")} />}
            {reminderCount === 0 && <div className={styles.taskEmpty}><span>✓</span><div><b>ยังไม่มีรายการที่ต้องตรวจต่อ</b><p>เริ่มงานใหม่จากปุ่มด้านล่างได้เลย</p></div></div>}
          </div>
        </div>
        <aside className={styles.activityPanel}>
          <div className={styles.sectionHeader}><div><p>ACTIVITY</p><h2>ความเคลื่อนไหวล่าสุด</h2></div><button onClick={() => onOpen("reports")}>ดูทั้งหมด</button></div>
          <div className={styles.activityList}>
            {activity.slice(0, 5).map((item) => (
              <article key={item.id}><span className={styles[item.tone]}>{item.type.slice(0, 1)}</span><div><b>{item.title}</b><p>{item.detail}</p></div><time>{item.time}</time></article>
            ))}
          </div>
        </aside>
      </section>

      <section className={styles.quickActions}>
        <div><p>QUICK ACTIONS</p><h2>เริ่มงานใหม่</h2></div>
        <button onClick={() => onOpen("scan")}><span>⌁</span><b>สแกน QR</b><small>รับเข้า / ค้นหา</small></button>
        <button onClick={() => onOpen("scan")}><span>＋</span><b>สร้าง Serial</b><small>สำหรับกล่องไม่มี Serial ประจำม้วน</small></button>
        <button onClick={() => onOpen("movement")}><span>↗</span><b>จ่ายสินค้า</b><small>เต็มม้วน / ตัดใช้</small></button>
        <button onClick={() => onOpen("count")}><span>✓</span><b>ตรวจนับ</b><small>เทียบของจริง</small></button>
      </section>
    </>
  );
}

function KpiCard({ label, value, note, tone, icon }: { label: string; value: string; note: string; tone: string; icon: string }) {
  return <article className={styles.kpiCard}><div className={styles[tone]}>{icon}</div><span>{label}</span><strong>{value}</strong><small>{note}</small></article>;
}

function TaskRow({ priority, tone, title, detail, meta, action, onClick }: { priority: string; tone: string; title: string; detail: string; meta: string; action: string; onClick: () => void }) {
  return <article className={styles.taskRow}><span className={cx(styles.taskPriority, styles[tone])}>{priority}</span><div><b>{title}</b><p>{detail}</p></div><small>{meta}</small><button onClick={onClick}>{action} →</button></article>;
}

function ReceiveView({ units, setUnits, colorProducts, setColorProducts, onActivity, onToast, onOpenInventory }: {
  units: StockUnit[];
  setUnits: React.Dispatch<React.SetStateAction<StockUnit[]>>;
  colorProducts: ColorProduct[];
  setColorProducts: React.Dispatch<React.SetStateAction<ColorProduct[]>>;
  onActivity: (item: Omit<Activity, "id" | "time">) => void;
  onToast: (message: string) => void;
  onOpenInventory: () => void;
}) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [receiveRoute, setReceiveRoute] = useState<"scan" | "box" | "color">("scan");
  const [boxMethod, setBoxMethod] = useState<"barcode" | "manual">("barcode");
  const [product, setProduct] = useState("NEXS BEGIN");
  const [lot, setLot] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [location, setLocation] = useState("MAIN / RECEIVING");
  const [qrCode, setQrCode] = useState("");
  const [skuCode, setSkuCode] = useState("");
  const [skuDecoded, setSkuDecoded] = useState(false);
  const [decoded, setDecoded] = useState(false);
  const [printLabel, setPrintLabel] = useState(false);
  const [prepared, setPrepared] = useState<StockUnit[]>([]);
  const [created, setCreated] = useState<StockUnit[]>([]);
  const [colorEntryMode, setColorEntryMode] = useState<"catalog" | "new">("catalog");
  const [selectedColorId, setSelectedColorId] = useState<number | null>(null);
  const [colorSeriesName, setColorSeriesName] = useState("NEXS COLOR PPF");
  const [colorName, setColorName] = useState("");
  const [colorCode, setColorCode] = useState("");
  const [colorSku, setColorSku] = useState("");
  const [colorHex, setColorHex] = useState("#73777F");
  const [colorSize, setColorSize] = useState("1.52 × 15 m");
  const [colorMetres, setColorMetres] = useState(15);
  const [colorPhoto, setColorPhoto] = useState<File | null>(null);
  const [colorPhotoPreview, setColorPhotoPreview] = useState("");
  const [colorSaving, setColorSaving] = useState(false);
  const mode: "existing" | "generate" = receiveRoute === "scan" ? "existing" : "generate";
  const selectedColorProduct = colorProducts.find((item) => item.id === selectedColorId) ?? null;
  const standardOption = PRODUCT_OPTIONS.find((item) => item.value === product) ?? PRODUCT_OPTIONS[0];
  const option: ProductOption = receiveRoute === "color" && selectedColorProduct ? {
    value: selectedColorProduct.productName,
    family: "COLOR FILM",
    qr: false,
    variant: selectedColorProduct.sizeLabel,
    finish: `ฟิล์มสี · ${selectedColorProduct.colorName}${selectedColorProduct.colorCode ? ` · ${selectedColorProduct.colorCode}` : ""}`,
    codes: [selectedColorProduct.skuCode],
    skuCode: selectedColorProduct.skuCode,
    metres: selectedColorProduct.metres,
    configStatus: "confirmed",
  } : standardOption;
  const stepLabels = receiveRoute === "scan"
    ? ["สแกน QR", "ตรวจข้อมูล", "จัดเก็บ", "ยืนยันรับเข้า"]
    : receiveRoute === "color"
      ? ["เลือกสีและรูป", "ตรวจข้อมูล", "สร้าง Serial", "ยืนยันรับเข้า"]
      : ["ระบุสินค้า", "ตรวจข้อมูล", "สร้าง Serial", "ยืนยันรับเข้า"];
  const stepTitles = receiveRoute === "scan"
    ? ["สแกน QR เพื่อเริ่มรับเข้า", "ตรวจข้อมูลจาก Product Config", "ยืนยัน Lot และตำแหน่ง", "ยืนยันรับสินค้าเข้าคลัง"]
    : receiveRoute === "color"
      ? ["เลือกสีจากคลังภาพ หรือเพิ่มสีใหม่", "ตรวจชื่อสี รูป และจำนวน", "สร้าง Serial ให้แต่ละม้วน", "ยืนยันรับฟิล์มสีเข้าคลัง"]
      : ["ระบุ SKU ของกล่องที่ไม่มี Serial", "ตรวจข้อมูลก่อนสร้างรหัส", "สร้างตัวตนให้แต่ละม้วน", "ยืนยันรับสินค้าเข้าคลัง"];

  useEffect(() => {
    if (!colorPhoto) {
      setColorPhotoPreview("");
      return;
    }
    const preview = URL.createObjectURL(colorPhoto);
    setColorPhotoPreview(preview);
    return () => URL.revokeObjectURL(preview);
  }, [colorPhoto]);

  function switchReceiveRoute(nextRoute: "scan" | "box" | "color") {
    setReceiveRoute(nextRoute);
    setStep(1);
    setBoxMethod("barcode");
    const firstColor = colorProducts[0] ?? null;
    setProduct(nextRoute === "scan" ? "NEXS BEGIN" : nextRoute === "color" ? firstColor?.productName ?? "" : "TPU SATIN MATTE (HYDROPHILIC)");
    setSelectedColorId(nextRoute === "color" ? firstColor?.id ?? null : null);
    setColorEntryMode(firstColor ? "catalog" : "new");
    setLot(nextRoute === "scan" ? "" : nextRoute === "color" ? "RCV-COLOR" : "RCV-260723");
    setQuantity(1);
    setLocation("MAIN / RECEIVING");
    setQrCode("");
    setSkuCode("");
    setSkuDecoded(false);
    setDecoded(false);
    setPrintLabel(nextRoute !== "scan");
    setPrepared([]);
    setCreated([]);
  }

  function decodeQr(rawValue = qrCode) {
    const serial = rawValue.trim().toUpperCase();
    if (!serial) {
      onToast("กรุณาสแกน QR บนสินค้า");
      return false;
    }
    if (units.some((unit) => unit.serial.toLowerCase() === serial.toLowerCase())) {
      onToast("QR นี้มีอยู่ในระบบแล้ว กรุณาตรวจสอบสินค้า");
      return false;
    }
    const tokens = serial.split(/[^A-Z0-9]+/).filter(Boolean);
    const matched = findQrProduct(serial);
    if (!matched) {
      onToast("ไม่พบ Product Config ของ QR นี้ กรุณาตรวจสอบรหัสรุ่น");
      return false;
    }
    const lotToken = tokens.find((token) => /^\d{4}$/.test(token));
    setQrCode(serial);
    setProduct(matched.value);
    setLot(lotToken ? `L${lotToken}` : "LOT-FROM-QR");
    setQuantity(1);
    setLocation("MAIN / RECEIVING");
    setDecoded(true);
    setPrepared([]);
    setCreated([]);
    onToast(`อ่าน QR สำเร็จ · ${matched.value} · ${matched.variant}`);
    return true;
  }

  function decodeSkuBarcode(rawValue = skuCode) {
    const normalized = rawValue.trim().toUpperCase();
    if (!normalized) {
      onToast("กรุณาสแกน Barcode ที่ฉลากข้างกล่อง");
      return false;
    }
    const matched = PRODUCT_OPTIONS.find((item) => !item.qr && (item.skuCode === normalized || item.codes.includes(normalized)));
    if (!matched) {
      onToast("Barcode นี้ยังไม่มีใน Product Config ให้เลือกสินค้าแบบไม่พบรหัส");
      setSkuDecoded(false);
      return false;
    }
    setSkuCode(normalized);
    setProduct(matched.value);
    setSkuDecoded(true);
    setPrepared([]);
    onToast(`อ่าน Barcode รุ่นสำเร็จ · ${matched.value}`);
    return true;
  }

  function selectColorProduct(next: ColorProduct) {
    setSelectedColorId(next.id);
    setProduct(next.productName);
    setColorEntryMode("catalog");
    setPrepared([]);
  }

  async function saveColorProduct() {
    if (colorName.trim().length < 2) {
      onToast("กรุณากรอกชื่อสีที่พนักงานใช้เรียก");
      return null;
    }
    if (colorSeriesName.trim().length < 2 || colorSize.trim().length < 2 || colorMetres <= 0) {
      onToast("กรุณาตรวจชื่อรุ่น ขนาด และจำนวนเมตรต่อม้วน");
      return null;
    }
    setColorSaving(true);
    try {
      const form = new FormData();
      form.set("seriesName", colorSeriesName);
      form.set("colorName", colorName);
      form.set("colorCode", colorCode);
      form.set("skuCode", colorSku);
      form.set("colorHex", colorHex);
      form.set("sizeLabel", colorSize);
      form.set("metres", String(colorMetres));
      if (colorPhoto) form.set("photo", colorPhoto);
      const response = await fetch("/api/admin/stock/color-products", { method: "POST", body: form });
      const result = await response.json() as { ok?: boolean; product?: ColorProduct; error?: string };
      if (!response.ok || !result.ok || !result.product) {
        throw new Error(result.error || "ไม่สามารถบันทึกสีใหม่ได้");
      }
      const next = result.product;
      setColorProducts((current) => [...current.filter((item) => item.id !== next.id), next].sort((a, b) => a.colorName.localeCompare(b.colorName, "th")));
      selectColorProduct(next);
      setColorSku(next.skuCode);
      onToast(next.hasImage ? `บันทึก ${next.colorName} พร้อมรูปจริงแล้ว` : `บันทึก ${next.colorName} พร้อมตัวอย่างสีแล้ว`);
      return next;
    } catch (error) {
      onToast(error instanceof Error ? error.message : "ไม่สามารถบันทึกสีใหม่ได้");
      return null;
    } finally {
      setColorSaving(false);
    }
  }

  async function goToReview() {
    if (receiveRoute === "scan") {
      if (!decoded) {
        onToast("สแกน QR ก่อนจึงไปขั้นตรวจข้อมูลได้");
        return;
      }
      setStep(2);
      return;
    }
    if (receiveRoute === "color") {
      if (colorEntryMode === "new") {
        const saved = await saveColorProduct();
        if (!saved) return;
      } else if (!selectedColorProduct) {
        onToast("กรุณาเลือกสีจากคลังภาพ หรือเพิ่มสีใหม่");
        return;
      }
    }
    if (receiveRoute === "box" && boxMethod === "barcode" && !skuDecoded) {
      onToast("สแกน Barcode รุ่นก่อน หรือเลือก “ไม่มีรหัสบนกล่อง”");
      return;
    }
    if (!lot.trim() || !location.trim()) {
      onToast("กรุณากรอก Lot และตำแหน่งจัดเก็บ");
      return;
    }
    if (quantity < 1 || quantity > 20) {
      onToast("จำนวนสินค้าต้องอยู่ระหว่าง 1–20 ม้วน");
      return;
    }
    setStep(2);
  }

  function prepareIdentity() {
    if (mode === "existing" && !qrCode.trim()) {
      onToast("กรุณาสแกนหรือกรอก QR เดิม");
      return false;
    }
    if (mode === "existing" && units.some((unit) => unit.serial.toLowerCase() === qrCode.trim().toLowerCase())) {
      onToast("QR นี้มีอยู่ในระบบแล้ว กรุณาตรวจสอบสินค้า");
      return false;
    }

    const safeQuantity = mode === "existing" ? 1 : Math.min(Math.max(quantity, 1), 20);
    const productCode = option.skuCode.replaceAll("-", "").slice(0, 8);
    const base = 126 + units.filter((unit) => unit.source === "system").length;
    const timestamp = "วันนี้ " + new Intl.DateTimeFormat("th-TH", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" }).format(new Date());
    const next = Array.from({ length: safeQuantity }, (_, index): StockUnit => ({
      serial: mode === "existing" ? qrCode.trim().toUpperCase() : `NXS-${productCode}-2607-${String(base + index).padStart(6, "0")}`,
      product,
      variant: option.variant,
      lot: lot.trim().toUpperCase(),
      location,
      status: "available",
      labelStatus: mode === "existing" || printLabel ? "printed" : "unprinted",
      source: mode === "existing" ? "existing-qr" : "system",
      initialMetres: option.metres,
      metres: option.metres,
      updatedAt: timestamp,
      ...(receiveRoute === "color" && selectedColorProduct ? {
        productKind: "color" as const,
        colorProductId: selectedColorProduct.id,
        colorName: selectedColorProduct.colorName,
        colorCode: selectedColorProduct.colorCode,
        colorHex: selectedColorProduct.colorHex,
      } : {}),
    }));
    setPrepared(next);
    onToast(mode === "existing" ? "ผูก QR กับ Product Config แล้ว" : `สร้าง Serial แล้ว ${next.length} รายการ`);
    return true;
  }

  function goFromReview() {
    if (mode === "existing" && !prepareIdentity()) return;
    setStep(3);
  }

  function completeReceive() {
    if (!prepared.length || created.length) return;
    const finalUnits = prepared.map((unit) => ({ ...unit, labelStatus: mode === "existing" || printLabel ? "printed" as const : "unprinted" as const }));
    setUnits((current) => [...finalUnits, ...current]);
    setCreated(finalUnits);
    onActivity({ type: "รับเข้า", title: `รับ ${product} จำนวน ${finalUnits.length} ม้วน`, detail: `${lot.toUpperCase()} · ${location}`, tone: "green" });
    onToast(`รับสินค้าเข้าแล้ว ${finalUnits.length} ม้วน`);
  }

  function resetReceive() {
    setStep(1);
    setBoxMethod("barcode");
    const firstColor = colorProducts[0] ?? null;
    setProduct(receiveRoute === "scan" ? "NEXS BEGIN" : receiveRoute === "color" ? firstColor?.productName ?? "" : "TPU SATIN MATTE (HYDROPHILIC)");
    setSelectedColorId(receiveRoute === "color" ? firstColor?.id ?? null : null);
    setColorEntryMode(firstColor ? "catalog" : "new");
    setLot(receiveRoute === "scan" ? "" : receiveRoute === "color" ? "RCV-COLOR" : "RCV-260723");
    setQuantity(1);
    setLocation("MAIN / RECEIVING");
    setPrepared([]);
    setCreated([]);
    setQrCode("");
    setSkuCode("");
    setSkuDecoded(false);
    setDecoded(false);
    setPrintLabel(receiveRoute !== "scan");
    setColorName("");
    setColorCode("");
    setColorSku("");
    setColorHex("#73777F");
    setColorPhoto(null);
  }

  return (
    <>
      <PageHeading eyebrow="SCAN + SERIAL CENTER" title="รับสินค้าเข้า เริ่มจากการระบุสินค้า" copy="รองรับ QR ประจำม้วน, กล่องไม่มี Serial และฟิล์มสีที่ต้องดูรูปจริง โดยระบบจะสร้าง Serial เฉพาะสินค้าที่ไม่มี Serial เดิม" />
      <div className={styles.stepRail} aria-label={`ขั้นตอนที่ ${step} จาก 4`}>
        {stepLabels.map((label, index) => {
          const number = index + 1;
          return (
            <div className={styles.stepRailItem} key={label}>
              <span className={step === number ? styles.currentStep : step > number ? styles.doneStep : ""}>
                <b>{step > number ? "✓" : number}</b>{label}
              </span>
              {number < stepLabels.length && <i />}
            </div>
          );
        })}
      </div>
      <section className={styles.receiveLayout}>
        <section className={styles.formCard}>
          <header><div><p>STEP 0{step} OF 04</p><h2>{stepTitles[step - 1]}</h2></div><span className={cx(styles.routePill, mode === "existing" ? styles.green : styles.blue)}>{mode === "existing" ? "UNIT QR" : "NO UNIT SERIAL"}</span></header>
          <div className={styles.formBody}>
            {step === 1 && (
              <>
                <div className={styles.receiveRouteTabs}>
                  <button type="button" className={receiveRoute === "scan" ? styles.routeActive : ""} onClick={() => switchReceiveRoute("scan")}><span>QR</span><div><b>สแกน QR ประจำม้วน</b><small>Begin / Prime / Pro / Ultimate</small></div></button>
                  <button type="button" className={receiveRoute === "box" ? styles.routeActive : ""} onClick={() => switchReceiveRoute("box")}><span>BOX</span><div><b>กล่องไม่มี Serial ประจำม้วน</b><small>สแกน Barcode รุ่น หรือเลือก SKU</small></div></button>
                  <button type="button" className={receiveRoute === "color" ? styles.routeActive : ""} onClick={() => switchReceiveRoute("color")}><span className={styles.colorRouteIcon}>●</span><div><b>ฟิล์มสี</b><small>เลือกจากรูป หรือเพิ่มสีใหม่</small></div></button>
                </div>
                {receiveRoute === "scan" ? (
                  <>
                    <section className={styles.scanFirstPanel}>
                      <div className={styles.scanFirstIcon}>QR</div>
                      <div><p>SCAN TO START</p><h3>จ่อเครื่องสแกนที่ QR บนสินค้า</h3><span>ระบบจะอ่าน Serial แล้วค้นหา Product Config ให้ทันที</span></div>
                      <label>
                        <span>QR / Serial</span>
                        <div><input autoFocus placeholder="รอรับข้อมูลจาก Scanner…" value={qrCode} onChange={(event) => { setQrCode(event.target.value); setDecoded(false); setPrepared([]); }} onKeyDown={(event) => { if (event.key === "Enter") decodeQr(); }} /><button type="button" onClick={() => decodeQr()}>อ่าน QR</button></div>
                      </label>
                      <button type="button" className={styles.scanLaunchButton} onClick={() => decodeQr(`B-2607-${String(units.length + 301).padStart(6, "0")}`)}>▣ เปิด Scanner (ทดลอง)</button>
                      <small>ตัวทดลองจะใช้รหัส B เพื่อแสดง Config: NEXS Begin · 1.50 × 15 m · ฟิล์มใส</small>
                    </section>
                    {decoded && (
                      <div className={styles.decodedProduct}>
                        <header><span>✓</span><div><b>อ่าน Product Config สำเร็จ</b><small>ไม่ต้องเลือกสินค้าและขนาดเอง</small></div></header>
                        <div><span>Serial</span><b>{qrCode}</b></div>
                        <div><span>รหัสรุ่น</span><b>{option.codes[0]}</b></div>
                        <div><span>สินค้า</span><b>{product}</b></div>
                        <div><span>ขนาด</span><b>{option.variant}</b></div>
                        <div><span>ประเภท</span><b>{option.finish}</b></div>
                      </div>
                    )}
                  </>
                ) : receiveRoute === "color" ? (
                  <>
                    <section className={styles.colorReceiveIntro}>
                      <div>
                        <p>COLOR FILM LIBRARY</p>
                        <h3>เลือกรูปสีที่ตรงกับม้วนจริง</h3>
                        <span>รูปและรหัสสีจะติดไปกับ Serial ทำให้พนักงานดูออกทันทีตอนรับเข้าและเบิกจ่าย</span>
                      </div>
                      <div className={styles.colorEntryTabs}>
                        <button type="button" className={colorEntryMode === "catalog" ? styles.colorEntryActive : ""} disabled={!colorProducts.length} onClick={() => setColorEntryMode("catalog")}>เลือกสีที่มีแล้ว</button>
                        <button type="button" className={colorEntryMode === "new" ? styles.colorEntryActive : ""} onClick={() => { setColorEntryMode("new"); setSelectedColorId(null); setProduct(""); }}>＋ เพิ่มสีใหม่</button>
                      </div>
                    </section>

                    {colorEntryMode === "catalog" && colorProducts.length > 0 ? (
                      <>
                        <div className={styles.colorProductGrid}>
                          {colorProducts.map((colorProduct) => (
                            <button
                              type="button"
                              className={selectedColorId === colorProduct.id ? styles.colorProductSelected : ""}
                              key={colorProduct.id}
                              onClick={() => selectColorProduct(colorProduct)}
                            >
                              <ColorFilmVisual product={colorProduct} />
                              <span>{colorProduct.seriesName}</span>
                              <b>{colorProduct.colorName}</b>
                              <small>{colorProduct.colorCode || colorProduct.skuCode} · {colorProduct.sizeLabel}</small>
                              {selectedColorId === colorProduct.id && <i>✓ เลือกแล้ว</i>}
                            </button>
                          ))}
                          <button type="button" className={styles.addColorProduct} onClick={() => { setColorEntryMode("new"); setSelectedColorId(null); setProduct(""); }}>
                            <span>＋</span><b>เพิ่มสีใหม่</b><small>ถ่ายรูปหรือเลือกรูปจากเครื่อง</small>
                          </button>
                        </div>
                        {selectedColorProduct && (
                          <div className={styles.selectedColorStrip}>
                            <ColorFilmVisual product={selectedColorProduct} compact />
                            <div><span>สีที่เลือก</span><b>{selectedColorProduct.productName}</b><small>SKU {selectedColorProduct.skuCode} · {selectedColorProduct.metres} เมตรต่อม้วน</small></div>
                          </div>
                        )}
                      </>
                    ) : (
                      <section className={styles.newColorForm}>
                        <div className={styles.colorPhotoColumn}>
                          <div className={styles.colorPhotoPreview} style={{ backgroundColor: colorHex }}>
                            {colorPhotoPreview ? <img src={colorPhotoPreview} alt="ตัวอย่างฟิล์มสีที่กำลังเพิ่ม" /> : <><span>รูปสีจริง</span><small>ยังไม่ได้เลือกรูป</small></>}
                          </div>
                          <label className={styles.colorUploadButton}>
                            <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={(event) => setColorPhoto(event.target.files?.[0] ?? null)} />
                            <span>▣</span><b>{colorPhoto ? "เปลี่ยนรูป" : "ถ่ายรูป / เลือกรูป"}</b>
                          </label>
                          <small>แนะนำให้ถ่ายชิ้นตัวอย่างกลางแสงธรรมชาติ ระบบจะย่อรูปให้เหมาะกับการใช้งาน</small>
                        </div>
                        <div className={styles.colorFields}>
                          <div className={styles.formColumns}>
                            <label><span>ชื่อรุ่น / Series</span><input value={colorSeriesName} onChange={(event) => setColorSeriesName(event.target.value)} placeholder="เช่น NEXS COLOR PPF" /></label>
                            <label><span>ชื่อสีที่ใช้เรียก *</span><input value={colorName} onChange={(event) => setColorName(event.target.value)} placeholder="เช่น Midnight Purple" /></label>
                          </div>
                          <div className={styles.formColumns}>
                            <label><span>รหัสสี (ถ้ามี)</span><input value={colorCode} onChange={(event) => setColorCode(event.target.value)} placeholder="เช่น MP-07" /></label>
                            <label><span>SKU (เว้นว่างให้ระบบสร้าง)</span><input value={colorSku} onChange={(event) => setColorSku(event.target.value.toUpperCase())} placeholder="เช่น CLR-MP07" /></label>
                          </div>
                          <div className={styles.formColumns}>
                            <label><span>ขนาดม้วน</span><input value={colorSize} onChange={(event) => setColorSize(event.target.value)} /></label>
                            <label><span>เมตรต่อม้วน</span><input type="number" min={1} max={10000} step=".5" value={colorMetres} onChange={(event) => setColorMetres(Number(event.target.value))} /></label>
                          </div>
                          <label className={styles.colorPickerRow}><span>สีตัวอย่างสำรอง</span><div><input type="color" value={colorHex} onChange={(event) => setColorHex(event.target.value.toUpperCase())} /><b style={{ backgroundColor: colorHex }} /><code>{colorHex}</code><small>ใช้แสดงแทนเมื่อยังไม่มีรูปถ่าย</small></div></label>
                        </div>
                      </section>
                    )}

                    <div className={styles.formColumns}>
                      <label><span>รอบรับเข้า / Lot</span><input value={lot} onChange={(event) => setLot(event.target.value)} /><small>ถ้าไม่มี Lot ให้ใช้เลขรอบรับเข้า</small></label>
                      <label><span>จำนวนม้วน</span><input type="number" min={1} max={20} value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} /></label>
                    </div>
                    <label><span>ตำแหน่งจัดเก็บ</span><select value={location} onChange={(event) => setLocation(event.target.value)}><option>MAIN / RECEIVING</option><option>MAIN / COLOR FILM</option><option>MAIN / B01 / C03</option><option>SHOWROOM / S01</option><option>QUARANTINE / Q01</option></select></label>
                    {colorEntryMode === "new" && !colorPhoto && <div className={styles.colorPhotoHint}><span>รูป</span><div><b>ยังไม่มีรูปถ่ายจริง</b><p>รับเข้าได้โดยใช้สีตัวอย่างก่อน และเพิ่มรูปจริงภายหลังได้ แต่การมีรูปจะช่วยลดการหยิบผิดสี</p></div></div>}
                  </>
                ) : (
                  <>
                    <div className={styles.boxMethodTabs}>
                      <button type="button" className={boxMethod === "barcode" ? styles.boxMethodActive : ""} onClick={() => { setBoxMethod("barcode"); setSkuDecoded(false); setSkuCode(""); }}><span>▥</span><div><b>มี Barcode ระบุรุ่น</b><small>Barcode อาจซ้ำกันทุกกล่อง จึงยังไม่ใช่ Serial</small></div></button>
                      <button type="button" className={boxMethod === "manual" ? styles.boxMethodActive : ""} onClick={() => { setBoxMethod("manual"); setSkuDecoded(false); setSkuCode(""); }}><span>□</span><div><b>กล่องเปล่า ไม่มีรหัส</b><small>เลือก SKU จากรายการสินค้าที่รับมา</small></div></button>
                    </div>
                    {boxMethod === "barcode" ? (
                      <>
                        <section className={styles.boxBarcodePanel}>
                          <div className={styles.scanFirstIcon}>SKU</div>
                          <div><p>SCAN PRODUCT BARCODE</p><h3>สแกน Barcode ที่ฉลากข้างกล่อง</h3><span>ใช้เพื่อระบุรุ่นเท่านั้น ระบบจะสร้าง Serial ใหม่ให้แต่ละกล่อง</span></div>
                          <label>
                            <span>Barcode / SKU Code</span>
                            <div><input autoFocus placeholder="รอรับข้อมูลจาก Scanner…" value={skuCode} onChange={(event) => { setSkuCode(event.target.value); setSkuDecoded(false); }} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); decodeSkuBarcode(); } }} /><button type="button" onClick={() => decodeSkuBarcode()}>อ่าน Barcode</button></div>
                          </label>
                          <button type="button" className={styles.scanLaunchButton} onClick={() => decodeSkuBarcode("TPU-SMHYD")}>▣ เปิด Scanner (ทดลอง)</button>
                          <small>ค่าตัวอย่างใช้รหัสภายใน TPU-SMHYD · Barcode ตัวเลขจริงต้องตั้งค่าเพิ่มจากฉลากสินค้า</small>
                        </section>
                        {skuDecoded && (
                          <div className={styles.decodedProduct}>
                            <header><span>✓</span><div><b>พบ SKU จาก Barcode</b><small>ยังต้องสร้าง Serial แยกหนึ่งรหัสต่อหนึ่งกล่อง</small></div></header>
                            <div><span>SKU Code</span><b>{option.skuCode}</b></div>
                            <div><span>สินค้า</span><b>{product}</b></div>
                            <div><span>ขนาด</span><b>{option.variant}</b></div>
                            <div><span>ประเภท</span><b>{option.finish}</b></div>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <label><span>1. เลือก SKU ของสินค้า</span><select value={product} onChange={(event) => { setProduct(event.target.value); setPrepared([]); }}>{PRODUCT_OPTIONS.filter((item) => !item.qr).map((item) => <option key={item.value} value={item.value}>{item.value} · {item.variant}</option>)}</select></label>
                        <div className={styles.routeHint}>
                          <span>□</span>
                          <div><b>กล่องนี้ไม่มีรหัสที่สแกนได้</b><p>ระบบจะใช้ SKU ที่เลือกและสร้าง Serial ภายในให้แต่ละกล่อง</p></div>
                        </div>
                      </>
                    )}
                    {option.configStatus === "verify" && (
                      <div className={styles.configWarning}><span>!</span><div><b>ข้อมูลรุ่นนี้ยังต้องยืนยันจากฉลากจริง</b><p>ตรวจขนาดและประเภทก่อนรับเข้าสต็อก ขณะนี้ระบบใช้ค่าตั้งต้นชั่วคราว</p></div></div>
                    )}
                    <div className={styles.formColumns}>
                      <label><span>2. รอบรับเข้า / Lot</span><input value={lot} onChange={(event) => setLot(event.target.value)} /><small>ถ้ากล่องไม่มี Lot ให้ใช้เลขรอบรับเข้า RCV-YYMMDD</small></label>
                      <label><span>3. จำนวนกล่อง / ม้วน</span><input type="number" min={1} max={20} value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} /></label>
                    </div>
                    <label><span>4. ตำแหน่งจัดเก็บ</span><select value={location} onChange={(event) => setLocation(event.target.value)}><option>MAIN / RECEIVING</option><option>MAIN / B01 / C03</option><option>MAIN / A01 / B02</option><option>MAIN / C02 / A01</option><option>QUARANTINE / Q01</option></select></label>
                  </>
                )}
              </>
            )}

            {step === 2 && (
              <div className={styles.receiveReview}>
                {receiveRoute === "color" && selectedColorProduct && (
                  <div className={styles.colorReviewVisual}>
                    <ColorFilmVisual product={selectedColorProduct} />
                    <span>รูปและสีที่พนักงานจะเห็น</span>
                    <b>{selectedColorProduct.colorName}</b>
                    <small>{selectedColorProduct.colorCode || selectedColorProduct.skuCode} · ใช้รูปนี้กับทุกม้วนในสีเดียวกัน</small>
                  </div>
                )}
                {receiveRoute === "scan" && <div><span>Serial จาก QR</span><b>{qrCode}</b><small>ใช้เป็นรหัสประจำม้วนนี้</small></div>}
                <div><span>สินค้า</span><b>{product}</b><small>{option.finish}</small></div>
                <div><span>ขนาด</span><b>{option.variant}</b></div>
                <div><span>Lot / Batch</span><b>{lot.toUpperCase()}</b><small>{receiveRoute === "scan" ? "อ่านจาก QR" : "ข้อมูลที่กรอก"}</small></div>
                <div><span>จำนวน</span><b>{mode === "existing" ? 1 : quantity} ม้วน</b></div>
                <div><span>ตำแหน่งเริ่มต้น</span><b>{location}</b></div>
                <div className={styles.reviewRoute}><span>ขั้นต่อไป</span><b>{mode === "existing" ? "ยืนยันตำแหน่งจัดเก็บ โดยไม่สร้าง Serial ใหม่" : `กดสร้าง Serial ${quantity} รายการ`}</b><small>{mode === "existing" ? "QR เดิมจะเป็น Serial ของม้วนนี้ทันที" : "หากข้อมูลไม่ถูกต้อง กด “ย้อนกลับ” เพื่อแก้ไขได้ทันที"}</small></div>
              </div>
            )}

            {step === 3 && (
              <>
                {receiveRoute === "scan" ? (
                  <>
                    <div className={styles.identityIntro}>
                      <span>QR</span>
                      <div><b>QR นี้ระบุตัวตนสินค้าเรียบร้อยแล้ว</b><p>{qrCode} · {product} · {option.variant} · {option.finish}</p></div>
                    </div>
                    <div className={styles.storageConfirm}>
                      <label><span>Lot / Batch ที่อ่านได้</span><input value={lot} readOnly /></label>
                      <label><span>ตำแหน่งจัดเก็บ</span><select value={location} onChange={(event) => { const nextLocation = event.target.value; setLocation(nextLocation); setPrepared((current) => current.map((unit) => ({ ...unit, location: nextLocation }))); }}><option>MAIN / RECEIVING</option><option>MAIN / B01 / C03</option><option>MAIN / A01 / B02</option><option>MAIN / C02 / A01</option><option>SHOWROOM / S01</option></select></label>
                    </div>
                    <div className={styles.preparedSerials}>
                      <header><span>✓</span><div><b>พร้อมจัดเก็บโดยใช้ QR เดิม</b><small>ไม่สร้าง Serial ใหม่ซ้ำ</small></div></header>
                      <p>{qrCode}</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className={styles.identityIntro}>
                      <span>ID</span>
                      <div><b>สร้าง Serial สำหรับ {quantity} ม้วน</b><p>ระบบจะสร้างหนึ่ง Serial ต่อหนึ่งม้วน โดยยังไม่บันทึกเข้าคลังจนกว่าจะยืนยันในขั้นที่ 4</p></div>
                    </div>
                    <div className={styles.serialPreview}><span>รูปแบบ Serial ที่จะได้</span><b>NXS-{option.skuCode.replaceAll("-", "").slice(0, 8)}-2607-XXXXXX</b><small>จำนวน {quantity} Serial ต่อเนื่อง</small></div>
                    <button type="button" className={styles.identityButton} onClick={prepareIdentity}>＋ สร้าง Serial {quantity} รายการ</button>
                    {prepared.length > 0 && (
                      <div className={styles.preparedSerials}>
                        <header><span>✓</span><div><b>สร้างตัวตนเรียบร้อย</b><small>{prepared.length} Serial พร้อมไปขั้นที่ 4</small></div></header>
                        {prepared.slice(0, 5).map((unit) => <p key={unit.serial}>{unit.serial}</p>)}
                        {prepared.length > 5 && <small>และอีก {prepared.length - 5} Serial</small>}
                      </div>
                    )}
                    <label className={styles.switchRow}><input type="checkbox" checked={printLabel} onChange={(event) => setPrintLabel(event.target.checked)} /><span /><div><b>ตั้งสถานะว่าจะพิมพ์ QR Label · แนะนำ</b><small>ระบบยังไม่ส่งงานไปเครื่องพิมพ์ ต้องเชื่อมรุ่นเครื่องพิมพ์ก่อนใช้การพิมพ์จริง</small></div></label>
                    {!printLabel && <div className={styles.configWarning}><span>!</span><div><b>หากไม่ติด Label จะระบุกล่องจริงด้วยการสแกนไม่ได้</b><p>ระบบยังสร้าง Serial ภายในและเบิกผ่าน “กล่องไม่มี Label” โดยเลือก FIFO ได้ แต่ควรแยกกล่องไม่ให้ปะปนกัน</p></div></div>}
                  </>
                )}
              </>
            )}

            {step === 4 && (
                <div className={styles.finalReceive}>
                  <span className={styles.finalCheck}>✓</span>
                  <p>พร้อมบันทึกเข้าคลัง</p>
                  <h3>{product} · {prepared.length} ม้วน</h3>
                  {receiveRoute === "color" && selectedColorProduct && <ColorFilmVisual product={selectedColorProduct} />}
                  <dl>
                  <div><dt>Lot</dt><dd>{lot.toUpperCase()}</dd></div>
                  <div><dt>ตำแหน่ง</dt><dd>{location}</dd></div>
                  <div><dt>วิธีสร้างรหัส</dt><dd>{mode === "existing" ? "QR เดิมจากสินค้า" : "ระบบสร้าง Serial ใหม่"}</dd></div>
                  <div><dt>Label</dt><dd>{mode === "existing" ? "QR ติดมากับสินค้า" : printLabel ? "พิมพ์หลังรับเข้า" : "ยังไม่พิมพ์ — ทำภายหลังได้"}</dd></div>
                </dl>
                <div className={styles.finalSerialList}>{prepared.slice(0, 4).map((unit) => <b key={unit.serial}>{unit.serial}</b>)}{prepared.length > 4 && <span>และอีก {prepared.length - 4} Serial</span>}</div>
                <small>เมื่อกดยืนยัน ระบบจะเพิ่มสินค้าในคลังและบันทึกประวัติการรับเข้าทันที</small>
              </div>
            )}
          </div>
          <footer>
            {step === 1 ? <button type="button" className={styles.secondaryButton} onClick={resetReceive}>ล้างข้อมูล</button> : <button type="button" className={styles.secondaryButton} onClick={() => setStep((step - 1) as 1 | 2 | 3)}>← ย้อนกลับ</button>}
            {step === 1 && <button className={styles.primaryButton} type="button" disabled={(receiveRoute === "scan" && !decoded) || (receiveRoute === "box" && boxMethod === "barcode" && !skuDecoded) || colorSaving || (receiveRoute === "color" && colorEntryMode === "catalog" && !selectedColorProduct)} onClick={goToReview}>{receiveRoute === "scan" ? decoded ? "ถัดไป: ตรวจข้อมูลจาก QR →" : "สแกน QR ก่อนจึงไปต่อได้" : receiveRoute === "color" ? colorSaving ? "กำลังบันทึกรูปและข้อมูลสี…" : colorEntryMode === "new" ? "บันทึกสีและตรวจข้อมูล →" : selectedColorProduct ? "ถัดไป: ตรวจรูปและสี →" : "เลือกสีก่อนจึงไปต่อได้" : boxMethod === "barcode" ? skuDecoded ? "ถัดไป: ตรวจข้อมูล SKU →" : "สแกน Barcode รุ่นก่อนจึงไปต่อได้" : "ถัดไป: ตรวจข้อมูล SKU →"}</button>}
            {step === 2 && <button className={styles.primaryButton} type="button" onClick={goFromReview}>{mode === "existing" ? "ข้อมูลถูกต้อง: ยืนยันที่จัดเก็บ →" : "ข้อมูลถูกต้อง: ไปสร้าง Serial →"}</button>}
            {step === 3 && <button className={styles.primaryButton} type="button" disabled={!prepared.length} onClick={() => setStep(4)}>{prepared.length ? "ถัดไป: ยืนยันรับเข้า →" : "สร้าง Serial ก่อนจึงไปต่อได้"}</button>}
            {step === 4 && <button className={styles.primaryButton} type="button" disabled={!prepared.length || created.length > 0} onClick={completeReceive}>{created.length ? "รับเข้าเรียบร้อยแล้ว ✓" : `ยืนยันรับเข้าคลัง ${prepared.length} ม้วน →`}</button>}
          </footer>
        </section>

        <aside className={styles.receiveAside}>
          <article className={styles.guideCard}>
            <p>คุณอยู่ขั้นไหน?</p>
            <ol>
              {(receiveRoute === "scan"
                ? [["สแกน QR", "เริ่มจาก QR บนสินค้า"], ["ตรวจ Product Config", "ระบบเติมรุ่น ขนาด และประเภท"], ["ยืนยันที่จัดเก็บ", "Lot และตำแหน่งของม้วน"], ["ยืนยันรับเข้าคลัง", "เพิ่มสต็อกและบันทึกประวัติ"]]
                : receiveRoute === "color"
                  ? [["เลือกสีและรูป", "เลือกจากคลังภาพ หรือถ่ายรูปสีใหม่"], ["ตรวจรูปและรหัสสี", "ทบทวนสี ขนาด จำนวน และ Lot"], ["สร้าง Serial", "หนึ่งรหัสต่อหนึ่งม้วนสี"], ["ยืนยันรับเข้าคลัง", "รูปสีจะแสดงทุกจุดที่ใช้งาน"]]
                : [[boxMethod === "barcode" ? "สแกน Barcode รุ่น" : "เลือก SKU", boxMethod === "barcode" ? "Barcode ระบุรุ่น ไม่ใช่ Serial" : "สำหรับกล่องเปล่าที่ไม่มีรหัส"], ["ตรวจความถูกต้อง", "ทบทวน SKU รอบรับเข้า จำนวน และตำแหน่ง"], ["สร้าง Serial", "หนึ่งรหัสต่อหนึ่งม้วน"], ["ยืนยันรับเข้าคลัง", "เพิ่มสต็อกและบันทึกประวัติ"]]
              ).map(([title, copy], index) => {
                const number = index + 1;
                const isDone = step > number || (number === 4 && created.length > 0);
                return <li className={isDone ? styles.done : step === number ? styles.activeGuide : ""} key={title}><span>{isDone ? "✓" : number}</span><div><b>{title}</b><small>{step === number ? `กำลังทำ · ${copy}` : copy}</small></div></li>;
              })}
            </ol>
          </article>
          <article className={styles.ruleCard}><span>ตอนนี้ต้องทำอะไร?</span><h3>{step === 1 ? receiveRoute === "scan" ? "จ่อ Scanner ที่ QR ประจำม้วน" : receiveRoute === "color" ? colorEntryMode === "new" ? "ใส่ชื่อสีและถ่ายรูปจริง" : "เลือกสีที่ตรงกับม้วนจริง" : boxMethod === "barcode" ? "สแกน Barcode ระบุรุ่น" : "เลือก SKU ของกล่องจริง" : step === 2 ? receiveRoute === "color" ? "เทียบรูปกับสีของจริงอีกครั้ง" : "ตรวจข้อมูลที่ระบบอ่านได้" : step === 3 ? mode === "existing" ? "ยืนยันตำแหน่งจัดเก็บ" : "กดสร้าง Serial" : "ตรวจครั้งสุดท้ายแล้วกดยืนยัน"}</h3><p>{step === 4 ? "หลังยืนยันจึงจะมียอดสินค้าเพิ่มในคลัง" : receiveRoute === "scan" && step === 1 ? "เมื่อสแกนสำเร็จ รุ่น ขนาด และประเภทจะปรากฏโดยอัตโนมัติ" : receiveRoute === "color" && step === 1 ? "ใช้รูปถ่ายจริงเป็นหลัก และสีตัวอย่างเป็นข้อมูลสำรองเมื่อยังไม่มีรูป" : receiveRoute === "box" && boxMethod === "barcode" && step === 1 ? "Barcode นี้ใช้ระบุ SKU เท่านั้น ระบบจะสร้าง Serial ใหม่ในขั้นที่ 3" : "ปุ่มดำเนินการอยู่ด้านล่างของกล่องด้านซ้ายเสมอ"}</p></article>
        </aside>
      </section>
      {created.length > 0 && (
        <section className={styles.successCard}>
          <span>✓</span><div><p>RECEIVE COMPLETE</p><h2>รับเข้าเรียบร้อย {created.length} ม้วน</h2><small>{created[0].lot} · {created[0].location} · Label {created[0].labelStatus === "printed" ? "พิมพ์แล้ว" : "ยังไม่พิมพ์"}</small></div>
          <div className={styles.serialResult}>{created.slice(0, 3).map((unit) => <b key={unit.serial}>{unit.serial}</b>)}{created.length > 3 && <span>และอีก {created.length - 3} Serial</span>}</div>
          <button onClick={onOpenInventory}>ดูในคลัง →</button>
        </section>
      )}
    </>
  );
}

function InventoryView({ units, colorProducts, initialSearch, onSelect, onOpen }: { units: StockUnit[]; colorProducts: ColorProduct[]; initialSearch: string; onSelect: (unit: StockUnit) => void; onOpen: (view: ViewKey) => void }) {
  const [search, setSearch] = useState(initialSearch);
  const [status, setStatus] = useState<"all" | UnitStatus | "unprinted" | "pending-qr">("all");
  const filtered = units.filter((unit) => {
    const keyword = search.trim().toLowerCase();
    const matchesSearch = !keyword || [unit.serial, unit.product, unit.colorName ?? "", unit.colorCode ?? "", unit.lot, unit.location].some((value) => value.toLowerCase().includes(keyword));
    const matchesStatus = status === "all"
      || (status === "unprinted" ? unit.labelStatus === "unprinted" : status === "pending-qr" ? unit.source === "opening-balance" : unit.status === status);
    return matchesSearch && matchesStatus;
  });

  return (
    <>
      <PageHeading eyebrow="INVENTORY" title="สินค้าในคลัง" copy="ค้นหาด้วย Serial, SKU, Lot, สถานะ หรือตำแหน่งจัดเก็บ" actions={<button className={styles.primaryButton} onClick={() => onOpen("scan")}>＋ รับสินค้าเข้า</button>} />
      <section className={styles.inventorySummary}>
        <button className={status === "all" ? styles.summaryActive : ""} onClick={() => setStatus("all")}><span>ทั้งหมด</span><b>{units.length}</b></button>
        <button className={status === "available" ? styles.summaryActive : ""} onClick={() => setStatus("available")}><span>พร้อมใช้</span><b>{units.filter((unit) => unit.status === "available").length}</b></button>
        <button className={status === "open" ? styles.summaryActive : ""} onClick={() => setStatus("open")}><span>ม้วนเปิด</span><b>{units.filter((unit) => unit.status === "open").length}</b></button>
        <button className={status === "in-transit" ? styles.summaryActive : ""} onClick={() => setStatus("in-transit")}><span>กำลังโอน</span><b>{units.filter((unit) => unit.status === "in-transit").length}</b></button>
        <button className={status === "unprinted" ? styles.summaryActive : ""} onClick={() => setStatus("unprinted")}><span>ยังไม่พิมพ์ Label</span><b>{units.filter((unit) => unit.labelStatus === "unprinted").length}</b></button>
        <button className={status === "pending-qr" ? styles.summaryActive : ""} onClick={() => setStatus("pending-qr")}><span>รอผูก QR จริง</span><b>{units.filter((unit) => unit.source === "opening-balance").length}</b></button>
      </section>
      <section className={styles.productBalancePanel}>
        <header>
          <div><p>STOCK BY PRODUCT</p><h2>ยอดคงเหลือแยกตามสินค้า</h2></div>
          <span>แตะสินค้าเพื่อดู Serial ทั้งหมดของรุ่นนั้น</span>
        </header>
        <div>
          {OPENING_STOCK_COUNTS.map((item) => {
            const current = units.filter((unit) => unit.product === item.product && !["issued", "damaged"].includes(unit.status)).length;
            return (
              <button key={item.product} onClick={() => { setSearch(item.product); setStatus("all"); }}>
                <span>{item.family === "NEXS" ? "NEXS · QR" : "กล่องทั่วไป"}</span>
                <b>{item.product}</b>
                <strong>{current}</strong>
                <small>ม้วนคงเหลือ · ตั้งต้น {item.quantity}</small>
              </button>
            );
          })}
          {colorProducts.map((colorProduct) => {
            const current = units.filter((unit) => unit.colorProductId === colorProduct.id && !["issued", "damaged"].includes(unit.status)).length;
            return (
              <button className={styles.colorBalanceCard} key={`color-${colorProduct.id}`} onClick={() => { setSearch(colorProduct.colorName); setStatus("all"); }}>
                <ColorFilmVisual product={colorProduct} compact />
                <span>ฟิล์มสี · {colorProduct.colorCode || colorProduct.skuCode}</span>
                <b>{colorProduct.colorName}</b>
                <strong>{current}</strong>
                <small>ม้วนคงเหลือ · {colorProduct.sizeLabel}</small>
              </button>
            );
          })}
        </div>
      </section>
      <section className={styles.inventoryPanel}>
        <header>
          <div className={styles.tableSearch}><span>⌕</span><input placeholder="ค้นหา Serial, รุ่น, Lot หรือ Location" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
          <div><select aria-label="กรองสถานะ" value={status} onChange={(event) => setStatus(event.target.value as typeof status)}><option value="all">ทุกสถานะ</option><option value="available">พร้อมใช้</option><option value="reserved">จองแล้ว</option><option value="open">เปิดม้วน</option><option value="in-transit">กำลังโอน</option><option value="damaged">เสียหาย</option><option value="unprinted">ยังไม่พิมพ์ Label</option><option value="pending-qr">รอผูก QR จริง</option></select><button onClick={() => exportStockCsv(filtered)}>Export CSV</button></div>
        </header>
        <div className={styles.inventoryTable}>
          <div className={styles.tableHead}><span>Serial / Unit</span><span>สินค้า</span><span>Lot</span><span>คงเหลือ</span><span>ตำแหน่ง</span><span>สถานะ</span><span>Label</span><span /></div>
          {filtered.map((unit) => {
            const colorProduct = colorProductForUnit(unit, colorProducts);
            return (
              <button className={styles.tableRow} key={unit.serial} onClick={() => onSelect(unit)}>
                <span><b>{unit.serial}</b><small>{serialSourceLabel(unit.source)}</small></span>
                <span className={styles.inventoryProductCell}>
                  {unit.productKind === "color" && <ColorFilmVisual product={colorProduct} unit={unit} compact />}
                  <span><b>{unit.product}</b><small>{unit.productKind === "color" ? colorProductLabel(unit) : unit.variant}</small></span>
                </span>
                <span>{unit.lot}</span>
                <span><b>{unit.metres.toFixed(1)} m</b><small>จาก {unit.initialMetres.toFixed(0)} m</small></span>
                <span>{unit.location}</span>
                <span><i className={styles[`status-${unit.status}`]}>{STATUS_LABELS[unit.status]}</i></span>
                <span><i className={unit.labelStatus === "printed" ? styles.labelPrinted : styles.labelUnprinted}>{unit.labelStatus === "printed" ? "พิมพ์แล้ว" : "ยังไม่พิมพ์"}</i></span>
                <span>›</span>
              </button>
            );
          })}
          {!filtered.length && <div className={styles.emptyState}><span>⌕</span><h3>ไม่พบสินค้าที่ค้นหา</h3><p>ลองเปลี่ยนคำค้นหรือเลือกสถานะ “ทั้งหมด”</p></div>}
        </div>
        <footer><span>แสดง {filtered.length} จาก {units.length} หน่วย</span><div><button disabled>‹</button><button className={styles.pageCurrent} disabled>1</button><button disabled>›</button></div></footer>
      </section>
    </>
  );
}

function MovementView({ units, setUnits, colorProducts, onActivity, onToast }: {
  units: StockUnit[];
  setUnits: React.Dispatch<React.SetStateAction<StockUnit[]>>;
  colorProducts: ColorProduct[];
  onActivity: (item: Omit<Activity, "id" | "time">) => void;
  onToast: (message: string) => void;
}) {
  const [action, setAction] = useState<"issue" | "return" | "transfer" | "damage">("issue");
  const eligible = units.filter((unit) => {
    if (action === "return") return ["issued", "in-transit"].includes(unit.status);
    if (action === "issue") return ["available", "open", "reserved"].includes(unit.status);
    return !["issued", "damaged"].includes(unit.status);
  });
  const [serial, setSerial] = useState("");
  const [scanValue, setScanValue] = useState("");
  const [issueEntry, setIssueEntry] = useState<"scan" | "unlabelled">("scan");
  const [unlabelledProduct, setUnlabelledProduct] = useState("TPU SATIN MATTE (HYDROPHILIC)");
  const [issueStep, setIssueStep] = useState<1 | 2 | 3 | 4>(1);
  const [issueType, setIssueType] = useState<"full" | "partial">("full");
  const [metres, setMetres] = useState(5);
  const [destination, setDestination] = useState("Dealer / Job #2841");
  const selected = eligible.find((unit) => unit.serial === serial);
  const selectedConfig = PRODUCT_OPTIONS.find((product) => product.value === selected?.product);
  const selectedColorProduct = selected ? colorProductForUnit(selected, colorProducts) : null;
  const unlabelledProducts = [...new Set(eligible.filter((unit) => unit.labelStatus === "unprinted").map((unit) => unit.product))];

  useEffect(() => {
    if (action === "issue") {
      setSerial("");
      setScanValue("");
      setIssueEntry("scan");
      setIssueStep(1);
      setIssueType("full");
      setMetres(5);
      setDestination("Dealer / Job #2841");
      setUnlabelledProduct(unlabelledProducts[0] ?? "");
      return;
    }
    const next = units.find((unit) => action === "return" ? ["issued", "in-transit"].includes(unit.status) : !["issued", "damaged"].includes(unit.status));
    setSerial(next?.serial ?? "");
    setDestination(action === "damage" ? "QUARANTINE / Q01" : "MAIN / A01 / B02");
  }, [action]);

  function scanForIssue(rawValue = scanValue) {
    const normalized = rawValue.trim().toUpperCase();
    if (!normalized) {
      onToast("กรุณาสแกน QR หรือกรอก Serial ก่อน");
      return;
    }
    let found = units.find((unit) => {
      const unitSerial = unit.serial.toUpperCase();
      return normalized === unitSerial || normalized.includes(unitSerial);
    });
    if (!found) {
      const matchedProduct = findQrProduct(normalized);
      const pendingOpeningUnit = matchedProduct
        ? eligible.find((unit) => unit.product === matchedProduct.value && unit.source === "opening-balance")
        : undefined;
      if (pendingOpeningUnit) {
        found = { ...pendingOpeningUnit, serial: normalized, source: "existing-qr", updatedAt: "ผูก QR เมื่อสักครู่" };
        setUnits((current) => current.map((unit) => unit.serial === pendingOpeningUnit.serial ? found as StockUnit : unit));
        onActivity({
          type: "ผูก QR",
          title: `ผูก QR จริงให้ ${pendingOpeningUnit.product}`,
          detail: `${pendingOpeningUnit.serial} → ${normalized} · จากสต๊อกตั้งต้น`,
          tone: "blue",
        });
      }
    }
    if (!found) {
      onToast("ไม่พบ Serial นี้ และยังระบุรุ่นจาก QR ไม่ได้ กรุณาตรวจรหัสที่สแกน");
      return;
    }
    if (!["available", "open", "reserved"].includes(found.status)) {
      onToast(`Serial นี้อยู่ในสถานะ “${STATUS_LABELS[found.status]}” จึงยังเบิกจ่ายไม่ได้`);
      return;
    }
    setSerial(found.serial);
    setScanValue(found.serial);
    setIssueType("full");
    setMetres(Math.min(5, found.metres));
    setIssueStep(2);
    onToast(found.source === "existing-qr" && found.updatedAt === "ผูก QR เมื่อสักครู่"
      ? `ผูก QR กับสต๊อกตั้งต้นแล้ว · ${found.product}`
      : `พบ ${found.product} · คงเหลือ ${found.metres.toFixed(1)} เมตร`);
  }

  function demoIssueScan() {
    const demo = units.find((unit) => unit.product === "NEXS BEGIN" && ["available", "open"].includes(unit.status))
      ?? eligible.find((unit) => ["available", "open"].includes(unit.status))
      ?? eligible[0];
    if (!demo) {
      onToast("ไม่มีสินค้าในสถานะที่เบิกจ่ายได้");
      return;
    }
    setScanValue(demo.serial);
    scanForIssue(demo.serial);
  }

  function selectUnlabelledForIssue() {
    const candidates = eligible.filter((unit) => unit.product === unlabelledProduct && unit.labelStatus === "unprinted");
    const selectedByFifo = candidates[candidates.length - 1];
    if (!selectedByFifo) {
      onToast("ไม่พบสินค้ารุ่นนี้ที่ยังไม่มี Label และพร้อมเบิก");
      return;
    }
    setSerial(selectedByFifo.serial);
    setScanValue(selectedByFifo.serial);
    setIssueType("full");
    setMetres(Math.min(5, selectedByFifo.metres));
    setIssueStep(2);
    onToast(`เลือก Serial เก่าสุดตาม FIFO · ${selectedByFifo.serial}`);
  }

  function resetIssue() {
    setSerial("");
    setScanValue("");
    setIssueEntry("scan");
    setIssueStep(1);
    setIssueType("full");
    setMetres(5);
  }

  function goToIssueReview() {
    if (!selected) {
      onToast("กรุณาสแกนสินค้าอีกครั้ง");
      resetIssue();
      return;
    }
    if (issueType === "partial" && (metres <= 0 || metres > selected.metres)) {
      onToast("จำนวนเมตรที่ใช้ต้องมากกว่า 0 และไม่เกินยอดคงเหลือ");
      return;
    }
    setIssueStep(4);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    if (action === "issue" && issueStep !== 4) return;
    if (action === "issue" && issueType === "partial" && (metres <= 0 || metres > selected.metres)) {
      onToast("จำนวนเมตรที่ใช้ต้องไม่เกินคงเหลือ");
      return;
    }
    let title = "";
    let detail = "";
    setUnits((current) => current.map((unit) => {
      if (unit.serial !== selected.serial) return unit;
      if (action === "issue") {
        title = issueType === "full" ? `จ่าย ${unit.product} เต็มม้วน` : `ใช้ ${unit.product} ${metres.toFixed(1)} เมตร`;
        detail = `${unit.serial} · ${destination}`;
        return { ...unit, status: issueType === "full" ? "issued" : "open", metres: issueType === "full" ? 0 : Math.max(0, unit.metres - metres), updatedAt: "เมื่อสักครู่" };
      }
      if (action === "transfer") {
        title = `ย้าย ${unit.product} ไป ${destination}`;
        detail = `${unit.serial} · ย้ายตำแหน่งเรียบร้อย`;
        return { ...unit, status: unit.status === "in-transit" ? "available" : unit.status, location: destination, updatedAt: "เมื่อสักครู่" };
      }
      if (action === "damage") {
        title = `แจ้ง ${unit.product} เสียหาย`;
        detail = `${unit.serial} · พบจากการตรวจของจริงและย้ายไป ${destination}`;
        return { ...unit, status: "damaged", location: destination, updatedAt: "เมื่อสักครู่" };
      }
      title = `คืน ${unit.product} เข้าคลัง`;
      detail = `${unit.serial} · ${destination}`;
      return { ...unit, status: "available", location: destination, updatedAt: "เมื่อสักครู่" };
    }));
    onActivity({
      type: action === "issue" ? "จ่ายออก" : action === "return" ? "คืนคลัง" : action === "damage" ? "แจ้งเสีย" : "ย้ายสินค้า",
      title,
      detail,
      tone: action === "return" ? "green" : action === "transfer" ? "blue" : "red",
    });
    onToast(action === "issue" ? "ยืนยันเบิกจ่ายและอัปเดตสต็อกแล้ว" : "บันทึกรายการและอัปเดตสต็อกแล้ว");
    if (action === "issue") resetIssue();
  }

  return (
    <>
      <PageHeading
        eyebrow={action === "issue" ? "SCAN + ISSUE" : "TRANSACTIONS"}
        title={action === "issue" ? "เบิกจ่ายสินค้า เริ่มจากการสแกน" : "คืน ย้าย และแจ้งเสียหาย"}
        copy={action === "issue"
          ? "สินค้าที่มี Label ให้สแกน Serial ส่วนกล่องไม่มี Label ให้เลือก SKU แล้วระบบหยิบ Serial เก่าสุดตาม FIFO"
          : "คุณเป็นคนเริ่มรายการเองทุกขั้นตอน และระบบจะบันทึกประวัติให้โดยอัตโนมัติ"}
      />
      <div className={styles.actionTabs}>
        <button className={action === "issue" ? styles.actionActive : ""} onClick={() => setAction("issue")}><span>↗</span><div><b>เบิก / จ่ายออก</b><small>สแกน หรือเลือก FIFO</small></div></button>
        <button className={action === "return" ? styles.actionActive : ""} onClick={() => setAction("return")}><span>↙</span><div><b>คืนเข้าคลัง</b><small>ตรวจสภาพและคงเหลือ</small></div></button>
        <button className={action === "transfer" ? styles.actionActive : ""} onClick={() => setAction("transfer")}><span>↔</span><div><b>ย้ายคลัง / ตำแหน่ง</b><small>เลือกปลายทางแล้วบันทึกทันที</small></div></button>
        <button className={action === "damage" ? styles.actionActive : ""} onClick={() => setAction("damage")}><span>!</span><div><b>แจ้งเสียหาย</b><small>เริ่มเมื่อคุณพบของเสียจริง</small></div></button>
      </div>
      <section className={styles.movementLayout}>
        <form className={styles.movementForm} onSubmit={submit}>
          {action === "issue" ? (
            <>
              <div className={styles.issueProgress} aria-label={`ขั้นตอนที่ ${issueStep} จาก 4`}>
                {[
                  ["1", "สแกน Serial"],
                  ["2", "ตรวจสินค้า"],
                  ["3", "ระบุการจ่าย"],
                  ["4", "ยืนยัน"],
                ].map(([number, label], index) => (
                  <div className={index + 1 === issueStep ? styles.issueProgressActive : index + 1 < issueStep ? styles.issueProgressDone : ""} key={number}>
                    <span>{index + 1 < issueStep ? "✓" : number}</span>
                    <b>{label}</b>
                  </div>
                ))}
              </div>

              {issueStep === 1 && (
                <>
                  <div className={styles.movementStep}><span>1</span><div><p>IDENTIFY UNIT</p><h2>ระบุกล่องหรือม้วนที่จะเบิกจ่าย</h2></div></div>
                  <div className={styles.issueEntryTabs}>
                    <button type="button" className={issueEntry === "scan" ? styles.issueEntryActive : ""} onClick={() => setIssueEntry("scan")}><span>QR</span><div><b>มี QR / Label</b><small>สแกน Serial ประจำม้วน</small></div></button>
                    <button type="button" className={issueEntry === "unlabelled" ? styles.issueEntryActive : ""} onClick={() => setIssueEntry("unlabelled")}><span>□</span><div><b>กล่องไม่มี Label</b><small>เลือก SKU แล้วระบบหยิบ FIFO</small></div></button>
                  </div>
                  {issueEntry === "scan" ? (
                    <div className={styles.issueScanner}>
                      <div className={styles.issueScannerIcon}>QR</div>
                      <div>
                        <p>SCAN FIRST</p>
                        <h3>จ่อเครื่องสแกนที่ QR หรือ Label</h3>
                        <span>ระบบจะค้นหา Serial และอ่านข้อมูลจากสต็อกให้อัตโนมัติ</span>
                      </div>
                      <label>
                        <span>QR / Serial</span>
                        <div>
                          <input
                            autoFocus
                            value={scanValue}
                            onChange={(event) => setScanValue(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                scanForIssue();
                              }
                            }}
                            placeholder="รอรับข้อมูลจาก Scanner…"
                          />
                          <button type="button" onClick={() => scanForIssue()}>ค้นหา Serial</button>
                        </div>
                      </label>
                      <button className={styles.issueDemoScan} type="button" onClick={demoIssueScan}>▣ เปิด Scanner (ทดลอง)</button>
                      <small>ตัวทดลองจะสแกน NEXS Begin ที่อยู่ในสต็อก เพื่อแสดง Flow การเบิกจ่าย</small>
                    </div>
                  ) : (
                    <div className={styles.unlabelledIssuePanel}>
                      <span>□</span>
                      <div><p>NO PHYSICAL LABEL</p><h3>เลือก SKU ของกล่องที่หยิบจริง</h3><small>ระบบจะเลือก Serial ภายในที่เก่าที่สุดตาม FIFO ให้หนึ่งกล่อง</small></div>
                      <label><span>สินค้า</span><select value={unlabelledProduct} onChange={(event) => setUnlabelledProduct(event.target.value)}>{unlabelledProducts.map((productName) => <option key={productName}>{productName}</option>)}</select></label>
                      <div className={styles.unlabelledCount}><span>พร้อมเบิกและยังไม่มี Label</span><b>{eligible.filter((unit) => unit.product === unlabelledProduct && unit.labelStatus === "unprinted").length} กล่อง</b></div>
                      <button type="button" className={styles.primaryButton} onClick={selectUnlabelledForIssue}>เลือก Serial เก่าสุดตาม FIFO →</button>
                      <small>ควรแยกสินค้าแต่ละ SKU และ Lot ออกจากกัน เพราะไม่สามารถยืนยันกล่องเฉพาะใบด้วยการสแกนได้</small>
                    </div>
                  )}
                  <footer className={styles.issueFooter}>
                    <button type="button" className={styles.secondaryButton} onClick={() => { setScanValue(""); setSerial(""); }}>ล้างข้อมูล</button>
                    <button type="button" className={styles.primaryButton} disabled>{issueEntry === "scan" ? "สแกนสินค้าก่อนจึงไปต่อได้" : "เลือกสินค้าและกด FIFO ด้านบน"}</button>
                  </footer>
                </>
              )}

              {issueStep === 2 && selected && (
                <>
                  <div className={styles.movementStep}><span>2</span><div><p>PRODUCT FOUND</p><h2>ตรวจข้อมูลที่ระบบอ่านจาก Serial</h2></div></div>
                  <div className={styles.issueScanResult}>
                    {selected.productKind === "color" && <ColorFilmVisual product={selectedColorProduct} unit={selected} />}
                    <header><span>✓</span><div><b>พบสินค้าในสต็อก</b><small>{selected.labelStatus === "unprinted" ? "เลือกจากกลุ่มไม่มี Label ตาม FIFO" : "อ่านจาก Serial ประจำม้วน"}</small></div></header>
                    <div><span>Serial</span><b>{selected.serial}</b></div>
                    <div><span>สินค้า</span><b>{selected.product}</b></div>
                    <div><span>ขนาด</span><b>{selected.variant}</b></div>
                    <div><span>ประเภท</span><b>{selected.productKind === "color" ? colorProductLabel(selected) : selectedConfig?.finish ?? "—"}</b></div>
                    <div><span>คงเหลือ</span><b>{selected.metres.toFixed(1)} เมตร</b></div>
                    <div><span>ตำแหน่ง</span><b>{selected.location}</b></div>
                  </div>
                  {selected.status === "reserved" && <div className={styles.issueWarning}><b>สินค้านี้มีสถานะ “จองแล้ว”</b><span>ตรวจสอบว่าเป็นงานที่จองไว้ก่อนดำเนินการต่อ</span></div>}
                  <footer className={styles.issueFooter}>
                    <button type="button" className={styles.secondaryButton} onClick={resetIssue}>← สแกนใหม่</button>
                    <button type="button" className={styles.primaryButton} onClick={() => setIssueStep(3)}>ข้อมูลถูกต้อง: เลือกวิธีจ่าย →</button>
                  </footer>
                </>
              )}

              {issueStep === 3 && selected && (
                <>
                  <div className={styles.movementStep}><span>3</span><div><p>ISSUE METHOD</p><h2>จ่ายทั้งม้วน หรือตัดใช้บางส่วน?</h2></div></div>
                  <div className={styles.issueUnitStrip}><span>กำลังจ่าย</span><b>{selected.serial}</b><small>{selected.product} · เหลือ {selected.metres.toFixed(1)} m</small></div>
                  <div className={styles.choiceGrid}>
                    <button type="button" className={issueType === "full" ? styles.choiceActive : ""} onClick={() => setIssueType("full")}><span>จ่ายออกทั้งม้วน</span><b>{selected.metres.toFixed(1)} m</b><small>นำหน่วยนี้ออกจากคลังทั้งหมด</small></button>
                    <button type="button" className={issueType === "partial" ? styles.choiceActive : ""} onClick={() => setIssueType("partial")}><span>ตัดใช้บางส่วน</span><b>ระบุจำนวนเมตร</b><small>ระบบคำนวณยอดคงเหลือให้ทันที</small></button>
                  </div>
                  {issueType === "partial" && (
                    <label>
                      <span>ใช้ครั้งนี้ (เมตร)</span>
                      <input type="number" step=".5" min=".5" max={selected.metres} value={metres} onChange={(event) => setMetres(Number(event.target.value))} />
                      <small>คงเหลือหลังทำรายการ: {Math.max(0, selected.metres - metres).toFixed(1)} เมตร</small>
                    </label>
                  )}
                  <label>
                    <span>นำไปใช้ที่ไหน / งานใด</span>
                    <select value={destination} onChange={(event) => setDestination(event.target.value)}>
                      <option>Dealer / Job #2841</option>
                      <option>Sample / Marketing</option>
                      <option>Internal installation</option>
                    </select>
                  </label>
                  <label><span>หมายเหตุ</span><textarea rows={3} placeholder="ใส่รายละเอียดเพิ่มเติม (ถ้ามี)" /></label>
                  <footer className={styles.issueFooter}>
                    <button type="button" className={styles.secondaryButton} onClick={() => setIssueStep(2)}>← ย้อนกลับ</button>
                    <button type="button" className={styles.primaryButton} onClick={goToIssueReview}>ถัดไป: ตรวจรายการ →</button>
                  </footer>
                </>
              )}

              {issueStep === 4 && selected && (
                <>
                  <div className={styles.movementStep}><span>4</span><div><p>FINAL CHECK</p><h2>ตรวจอีกครั้งก่อนยืนยันเบิกจ่าย</h2></div></div>
                  <div className={styles.issueReview}>
                    <header><span>↗</span><div><b>{issueType === "full" ? "จ่ายออกทั้งม้วน" : `ตัดใช้ ${metres.toFixed(1)} เมตร`}</b><small>{selected.serial}</small></div></header>
                    <dl>
                      <div><dt>สินค้า</dt><dd>{selected.product}</dd></div>
                      <div><dt>ขนาด</dt><dd>{selected.variant}</dd></div>
                      <div><dt>ก่อนจ่าย</dt><dd>{selected.metres.toFixed(1)} m</dd></div>
                      <div><dt>คงเหลือหลังจ่าย</dt><dd>{issueType === "full" ? "0.0 m" : `${Math.max(0, selected.metres - metres).toFixed(1)} m`}</dd></div>
                      <div><dt>ปลายทาง / งาน</dt><dd>{destination}</dd></div>
                      <div><dt>สถานะหลังยืนยัน</dt><dd>{issueType === "full" ? "จ่ายออก" : "ม้วนเปิด"}</dd></div>
                    </dl>
                  </div>
                  <div className={styles.issueConfirmNote}><span>✓</span><div><b>ระบบจะบันทึกประวัติและปรับยอดทันที</b><small>ใช้ Serial เดิมติดตามม้วนนี้ต่อ ไม่สร้างรหัสใหม่</small></div></div>
                  <footer className={styles.issueFooter}>
                    <button type="button" className={styles.secondaryButton} onClick={() => setIssueStep(3)}>← แก้ไขรายการ</button>
                    <button className={styles.primaryButton} type="submit">ยืนยันเบิกจ่ายสินค้า →</button>
                  </footer>
                </>
              )}
            </>
          ) : (
            <>
              <div className={styles.movementStep}><span>1</span><div><p>เลือกหน่วยสินค้า</p><h2>{action === "return" ? "สินค้าที่รับคืน" : action === "damage" ? "พบความเสียหายที่สินค้าใด?" : "สินค้าที่ต้องการย้าย"}</h2></div></div>
              <label><span>Serial / Unit</span><select value={serial} onChange={(event) => setSerial(event.target.value)}>{eligible.map((unit) => <option key={unit.serial} value={unit.serial}>{unit.serial} · {unit.product} · {unit.metres.toFixed(1)} m</option>)}</select></label>
              <label><span>{action === "transfer" ? "คลังหรือจุดจัดเก็บปลายทาง" : action === "damage" ? "ย้ายไปจุดกักแยก" : "ตำแหน่งรับคืน"}</span><select value={destination} onChange={(event) => setDestination(event.target.value)}>{action === "damage" ? <option>QUARANTINE / Q01</option> : <><option>MAIN / A01 / B02</option><option>MAIN / C02 / A01</option><option>SHOWROOM / S01</option><option>QUARANTINE / Q01</option></>}</select></label>
              <label><span>{action === "damage" ? "ลักษณะความเสียหาย" : "หมายเหตุ"}</span><textarea rows={3} placeholder={action === "damage" ? "เช่น กล่องบุบ ฟิล์มมีรอย หรือเปียกน้ำ" : "ใส่เหตุผลหรือรายละเอียดเพิ่มเติม (ถ้ามี)"} /></label>
              <button className={styles.primaryButton} disabled={!selected}>บันทึกและยืนยันรายการ →</button>
            </>
          )}
        </form>
        <aside className={styles.unitPreview}>
          <div className={styles.previewTop}><span>{action === "issue" ? "SCAN RESULT" : "UNIT PREVIEW"}</span><i className={selected ? styles[`status-${selected.status}`] : ""}>{selected ? STATUS_LABELS[selected.status] : action === "issue" ? "รอสแกน" : "ไม่พบสินค้า"}</i></div>
          {selected ? <>
            {selected.productKind === "color" && <ColorFilmVisual product={selectedColorProduct} unit={selected} />}
            <h2>{selected.product}</h2><p>{selected.serial}</p>
            <div className={styles.rollGauge}><div style={{ width: `${Math.max(4, (selected.metres / selected.initialMetres) * 100)}%` }} /><span>{selected.metres.toFixed(1)} m</span></div>
            <dl><div><dt>ขนาด</dt><dd>{selected.variant}</dd></div><div><dt>ประเภท</dt><dd>{selected.productKind === "color" ? colorProductLabel(selected) : selectedConfig?.finish ?? "—"}</dd></div><div><dt>Lot</dt><dd>{selected.lot}</dd></div><div><dt>Location</dt><dd>{selected.location}</dd></div><div><dt>Label</dt><dd>{selected.labelStatus === "printed" ? "พิมพ์แล้ว" : "ยังไม่พิมพ์"}</dd></div><div><dt>อัปเดตล่าสุด</dt><dd>{selected.updatedAt}</dd></div></dl>
            <div className={styles.nextState}><span>หลังยืนยัน</span><b>{action === "issue" ? issueType === "full" ? "ISSUED · 0 m" : `OPEN · ${Math.max(0, selected.metres - metres).toFixed(1)} m` : action === "transfer" ? `ย้ายไป ${destination}` : action === "damage" ? "เสียหาย · QUARANTINE" : "AVAILABLE"}</b></div>
          </> : action === "issue" ? (
            <div className={styles.issueAwaiting}>
              <span>QR</span>
              <h3>รอสแกนสินค้า</h3>
              <p>เมื่อสแกนแล้ว ข้อมูลสินค้าจะปรากฏตรงนี้ทันที</p>
              <ol><li>สแกน Serial</li><li>ตรวจรุ่นและยอดคงเหลือ</li><li>เลือกวิธีจ่าย</li><li>ยืนยันรายการ</li></ol>
            </div>
          ) : <div className={styles.emptyState}><h3>ไม่มีหน่วยที่ทำรายการได้</h3></div>}
        </aside>
      </section>
    </>
  );
}

function RollsView({ units, setUnits, colorProducts, onActivity, onToast }: {
  units: StockUnit[];
  setUnits: React.Dispatch<React.SetStateAction<StockUnit[]>>;
  colorProducts: ColorProduct[];
  onActivity: (item: Omit<Activity, "id" | "time">) => void;
  onToast: (message: string) => void;
}) {
  const openRolls = units.filter((unit) => unit.status === "open");
  const [selected, setSelected] = useState(openRolls[0]?.serial ?? "");
  const [used, setUsed] = useState(1.5);
  const unit = units.find((item) => item.serial === selected);

  function recordUsage(event: FormEvent) {
    event.preventDefault();
    if (!unit || used <= 0 || used > unit.metres) {
      onToast("กรุณาตรวจจำนวนเมตรที่ใช้");
      return;
    }
    const left = unit.metres - used;
    setUnits((current) => current.map((item) => item.serial === unit.serial ? { ...item, metres: left, status: left === 0 ? "issued" : "open", updatedAt: "เมื่อสักครู่" } : item));
    onActivity({ type: "เปิดม้วน", title: `ใช้ ${unit.product} ${used.toFixed(1)} เมตร`, detail: `${unit.serial} · คงเหลือ ${left.toFixed(1)} เมตร`, tone: "red" });
    onToast(`บันทึกแล้ว เหลือ ${left.toFixed(1)} เมตร`);
  }

  return (
    <>
      <PageHeading eyebrow="OPEN ROLLS" title="ม้วนเปิดและเมตรคงเหลือ" copy="เห็นม้วนที่ถูกเปิดใช้แล้วทั้งหมด พร้อมบันทึกการตัดใช้ครั้งถัดไป" actions={<button className={styles.secondaryButton} onClick={() => window.print()}>พิมพ์รายงานม้วนเปิด</button>} />
      <section className={styles.rollSummary}>
        <div><span>ม้วนเปิดทั้งหมด</span><b>{openRolls.length}</b><small>หน่วย</small></div>
        <div><span>เมตรคงเหลือรวม</span><b>{openRolls.reduce((sum, item) => sum + item.metres, 0).toFixed(1)}</b><small>เมตร</small></div>
        <div><span>ใกล้หมด</span><b>{openRolls.filter((item) => item.metres <= 5).length}</b><small>ม้วน ≤ 5 m</small></div>
      </section>
      <section className={styles.rollGrid}>
        <div className={styles.rollCards}>
          {openRolls.map((roll) => {
            const percent = (roll.metres / roll.initialMetres) * 100;
            const colorProduct = colorProductForUnit(roll, colorProducts);
            return <button className={cx(styles.rollCard, selected === roll.serial && styles.rollSelected)} onClick={() => setSelected(roll.serial)} key={roll.serial}><header><span className={percent <= 20 ? styles.red : styles.green}>OPEN</span><small>{roll.updatedAt}</small></header>{roll.productKind === "color" && <ColorFilmVisual product={colorProduct} unit={roll} compact />}<h3>{roll.product}</h3><p>{roll.productKind === "color" ? colorProductLabel(roll) : roll.serial}</p><div className={styles.rollVisual}><span style={{ ["--fill" as string]: `${percent}%` }} /><div><b>{roll.metres.toFixed(1)}</b><small>/ {roll.initialMetres.toFixed(0)} m</small></div></div><footer><span>{roll.location}</span><b>{percent <= 20 ? "ใกล้หมด" : "พร้อมใช้งาน"}</b></footer></button>;
          })}
        </div>
        <form className={styles.usageForm} onSubmit={recordUsage}>
          <p>RECORD USAGE</p><h2>บันทึกการใช้ฟิล์ม</h2>
          <label><span>เลือกม้วน</span><select value={selected} onChange={(event) => setSelected(event.target.value)}>{openRolls.map((roll) => <option value={roll.serial} key={roll.serial}>{roll.serial} · {roll.metres.toFixed(1)} m</option>)}</select></label>
          <label><span>จำนวนที่ใช้ครั้งนี้</span><div className={styles.metreInput}><input type="number" min=".5" step=".5" max={unit?.metres ?? 0} value={used} onChange={(event) => setUsed(Number(event.target.value))} /><b>เมตร</b></div></label>
          <div className={styles.usageMath}><div><span>ก่อนใช้</span><b>{unit?.metres.toFixed(1) ?? "0.0"} m</b></div><i>−</i><div><span>ใช้ครั้งนี้</span><b>{used.toFixed(1)} m</b></div><i>=</i><div className={styles.usageResult}><span>คงเหลือ</span><b>{Math.max(0, (unit?.metres ?? 0) - used).toFixed(1)} m</b></div></div>
          <label><span>ปลายทาง / งาน</span><select><option>Dealer / Job #2841</option><option>Internal installation</option><option>Sample / Marketing</option></select></label>
          <button className={styles.primaryButton}>ยืนยันการใช้ {used.toFixed(1)} เมตร →</button>
          <small>ระบบจะบันทึก Movement และปรับเมตรคงเหลือของ Serial นี้โดยอัตโนมัติ</small>
        </form>
      </section>
    </>
  );
}

function CountView({ units, onToast, onActivity }: { units: StockUnit[]; onToast: (message: string) => void; onActivity: (item: Omit<Activity, "id" | "time">) => void }) {
  const locations = useMemo(
    () => Array.from(new Set(units.filter((unit) => !["issued", "damaged"].includes(unit.status)).map((unit) => unit.location))).sort(),
    [units],
  );
  const [countLocation, setCountLocation] = useState(locations[0] ?? "");
  const [started, setStarted] = useState(false);
  const expected = units.filter((unit) => started && unit.location === countLocation && !["issued", "damaged"].includes(unit.status));
  const [actual, setActual] = useState<Record<string, boolean>>({});
  const [confirmed, setConfirmed] = useState(false);
  const found = expected.filter((unit) => actual[unit.serial]).length;
  const openingTotal = OPENING_STOCK_COUNTS.reduce((sum, item) => sum + item.quantity, 0);

  function startCount() {
    const unitsInLocation = units.filter((unit) => unit.location === countLocation && !["issued", "damaged"].includes(unit.status));
    setActual(Object.fromEntries(unitsInLocation.map((unit) => [unit.serial, false])));
    setConfirmed(false);
    setStarted(true);
  }

  function confirmCount() {
    setConfirmed(true);
    const variance = expected.length - found;
    onActivity({ type: "ตรวจนับ", title: `ตรวจนับ ${countLocation} สำเร็จ`, detail: `${expected.length} หน่วย · ส่วนต่าง ${variance} หน่วย`, tone: variance ? "gold" : "green" });
    onToast(variance ? `พบของจริงน้อยกว่าระบบ ${variance} หน่วย กรุณาตรวจรายละเอียดก่อนแก้ยอด` : "ยอดตรงกัน บันทึกผลตรวจนับแล้ว");
  }

  if (!started) {
    return (
      <>
        <PageHeading eyebrow="CYCLE COUNT" title="เริ่มตรวจนับเมื่อคุณต้องการ" copy="ระบบจะไม่สร้างรอบตรวจนับเอง เลือกตำแหน่งที่ต้องการแล้วกดเริ่มเมื่อคุณอยู่หน้าชั้นวาง" />
        <section className={styles.referenceStockPanel}>
          <header>
            <div><p>OPENING STOCK · 24 JUL 2026</p><h2>สต๊อกตั้งต้นตามยอดที่แจ้ง · {openingTotal} ม้วน</h2><span>เพิ่มเป็นยอดคงเหลือเริ่มต้นในระบบแล้ว และพร้อมใช้เป็นฐานสำหรับรับเข้า เบิกจ่าย และตรวจนับ</span></div>
            <b>บันทึกเป็นสต๊อกแล้ว</b>
          </header>
          <div className={styles.referenceStockTable}>
            <div><b>สินค้า</b><b>การระบุตัวตน</b><b>ยอดตั้งต้น</b><b>คงเหลือในระบบ</b></div>
            {OPENING_STOCK_COUNTS.map((item) => {
              const systemCount = units.filter((unit) => unit.product === item.product && !["issued", "damaged"].includes(unit.status)).length;
              return <div key={item.product}><span>{item.product}</span><small>{item.family === "NEXS" ? "รอผูก QR จริงเมื่อสแกนครั้งแรก" : "มี Internal Serial แล้ว"}</small><b>{item.quantity}</b><b>{systemCount}</b></div>;
            })}
          </div>
          <footer><span>กลุ่ม NEXS 65 ม้วน · กลุ่มกล่องทั่วไป 15 ม้วน</span><p>NEXS จะเปลี่ยนรหัสตั้งต้นเป็น QR จริงเมื่อสแกน ส่วนกล่องทั่วไปใช้ Internal Serial และเบิกแบบ SKU + FIFO ได้แม้ยังไม่ติด Label</p></footer>
        </section>
        <section className={styles.countStartCard}>
          <div>
            <p>เริ่มจากตรงนี้</p>
            <h2>เลือกตำแหน่งที่จะตรวจ</h2>
            <span>หลังจากกดเริ่ม ระบบจะแสดง Serial ที่ควรอยู่ในตำแหน่งนั้นให้คุณเช็กกับของจริงทีละม้วน</span>
            <label>
              <b>ตำแหน่งจัดเก็บ</b>
              <select value={countLocation} onChange={(event) => setCountLocation(event.target.value)}>
                {locations.map((location) => <option key={location}>{location}</option>)}
              </select>
            </label>
            <button className={styles.primaryButton} onClick={startCount} disabled={!countLocation}>เริ่มตรวจนับตำแหน่งนี้ →</button>
          </div>
          <aside className={styles.countStartSteps}>
            <p>สิ่งที่จะเกิดขึ้น</p>
            <ol>
              <li><span>1</span><div><b>คุณเลือกตำแหน่ง</b><small>เช่น MAIN / A02 / B04</small></div></li>
              <li><span>2</span><div><b>ตรวจของจริงทีละม้วน</b><small>สแกนหรือแตะเมื่อพบ Serial</small></div></li>
              <li><span>3</span><div><b>บันทึกผลด้วยตัวเอง</b><small>ถ้ายอดต่าง ระบบจะแจ้งให้ตรวจซ้ำ</small></div></li>
            </ol>
          </aside>
        </section>
      </>
    );
  }

  return (
    <>
      <PageHeading eyebrow="CYCLE COUNT" title={`กำลังตรวจนับ ${countLocation}`} copy="รอบนี้เริ่มโดยคุณ แตะรายการเมื่อพบของจริง แล้วบันทึกผลเมื่อเช็กครบ" actions={<button className={styles.secondaryButton} onClick={() => setStarted(false)}>เปลี่ยนตำแหน่ง</button>} />
      <section className={styles.countProgress}><div><span>ความคืบหน้า</span><b>{found} / {expected.length} หน่วย</b></div><div><i style={{ width: `${expected.length ? (found / expected.length) * 100 : 0}%` }} /></div><p>แตะรายการเมื่อพบของจริง หรือใช้ Scanner เพื่อยืนยัน Serial ต่อเนื่อง</p></section>
      <section className={styles.countLayout}>
        <div className={styles.countPanel}>
          <header><div className={styles.tableSearch}><span>⌁</span><input placeholder="สแกน Serial เพื่อยืนยัน" /></div><button onClick={() => setActual(Object.fromEntries(expected.map((unit) => [unit.serial, true])))}>พบทั้งหมด</button></header>
          {expected.map((unit, index) => <label className={styles.countRow} key={unit.serial}><input type="checkbox" checked={Boolean(actual[unit.serial])} onChange={(event) => setActual((current) => ({ ...current, [unit.serial]: event.target.checked }))} /><span>{actual[unit.serial] ? "✓" : index + 1}</span><div><b>{unit.serial}</b><small>{unit.product} · {unit.lot}</small></div><p>{unit.location}</p><i>{actual[unit.serial] ? "พบแล้ว" : "ยังไม่พบ"}</i></label>)}
          {!expected.length && <div className={styles.emptyState}><h3>ไม่มีรายการในจุดจัดเก็บนี้</h3></div>}
        </div>
        <aside className={styles.countAside}>
          <div><p>COUNT SUMMARY</p><h2>สรุปรอบนี้</h2><dl><div><dt>ยอดในระบบ</dt><dd>{expected.length}</dd></div><div><dt>พบของจริง</dt><dd>{found}</dd></div><div><dt>ส่วนต่าง</dt><dd className={found === expected.length ? styles.greenText : styles.redText}>{found - expected.length}</dd></div></dl></div>
          <div className={styles.countRule}><b>ถ้ายอดไม่ตรง</b><p>ระบบจะบันทึกส่วนต่างให้คุณตรวจซ้ำก่อน จากนั้นคุณจึงค่อยเลือกแก้ยอดหรือค้นหาสินค้า</p></div>
          <button className={styles.primaryButton} onClick={confirmCount} disabled={confirmed}>{confirmed ? "บันทึกผลแล้ว ✓" : "บันทึกผลตรวจนับ →"}</button>
        </aside>
      </section>
    </>
  );
}

function ReportsView({ activity, units }: { activity: Activity[]; units: StockUnit[] }) {
  const needsVerification = PRODUCT_OPTIONS.filter((product) => product.configStatus === "verify");
  const activeUnits = units.filter((unit) => !["issued", "damaged"].includes(unit.status));
  const pendingQr = activeUnits.filter((unit) => unit.source === "opening-balance").length;
  const unprinted = activeUnits.filter((unit) => unit.labelStatus === "unprinted").length;
  const unassigned = activeUnits.filter((unit) => unit.location === OPENING_LOCATION).length;
  const lowOpenRolls = activeUnits.filter((unit) => unit.status === "open" && unit.metres <= 5).length;
  const remainingMetres = activeUnits.reduce((sum, unit) => sum + unit.metres, 0);
  const stockRows = OPENING_STOCK_COUNTS.map((item) => {
    const productUnits = units.filter((unit) => unit.product === item.product);
    const currentUnits = productUnits.filter((unit) => !["issued", "damaged"].includes(unit.status));
    return {
      ...item,
      current: currentUnits.length,
      open: currentUnits.filter((unit) => unit.status === "open").length,
      metres: currentUnits.reduce((sum, unit) => sum + unit.metres, 0),
      change: currentUnits.length - item.quantity,
    };
  });
  const movementSummary = [
    { label: "รับเข้า", count: activity.filter((item) => item.type === "รับเข้า").length, tone: "green" },
    { label: "เบิก / ใช้", count: activity.filter((item) => ["จ่ายออก", "เปิดม้วน"].includes(item.type)).length, tone: "red" },
    { label: "คืน / ย้าย", count: activity.filter((item) => ["คืนคลัง", "ย้ายสินค้า"].includes(item.type)).length, tone: "blue" },
    { label: "ตรวจ / ตั้งต้น", count: activity.filter((item) => ["ตรวจนับ", "แจ้งเสีย", "ผูก QR", "ตั้งต้น"].includes(item.type)).length, tone: "gold" },
  ];
  return (
    <>
      <PageHeading
        eyebrow="REPORTS + AUDIT"
        title="รายงานสต๊อกและสิ่งที่ต้องจัดการ"
        copy="ยอดทุกส่วนคำนวณจากข้อมูลปัจจุบันในระบบ และเปลี่ยนทันทีเมื่อมีการรับเข้า เบิกจ่าย หรือแก้สถานะ"
        actions={<><button className={styles.secondaryButton} onClick={() => window.print()}>พิมพ์รายงาน</button><button className={styles.primaryButton} onClick={() => exportProductBalanceCsv(units)}>Export สรุปรายสินค้า</button></>}
      />

      <section className={styles.reportSnapshot} aria-label="สรุปภาพรวมสต๊อก">
        <article><span>สต๊อกคงเหลือ</span><b>{activeUnits.length}</b><small>ม้วน / กล่อง</small></article>
        <article><span>เมตรคงเหลือรวม</span><b>{remainingMetres.toFixed(1)}</b><small>เมตร</small></article>
        <article><span>ม้วนเปิด</span><b>{activeUnits.filter((unit) => unit.status === "open").length}</b><small>{lowOpenRolls} ม้วนใกล้หมด</small></article>
        <article><span>รายการเคลื่อนไหว</span><b>{activity.length}</b><small>รายการที่บันทึกไว้</small></article>
      </section>

      <section className={styles.reportOperationalGrid}>
        <article className={styles.stockBalanceReport}>
          <header>
            <div><p>STOCK BALANCE BY PRODUCT</p><h2>ยอดคงเหลือเทียบสต๊อกตั้งต้น</h2></div>
            <button onClick={() => exportStockCsv(units)}>Export ราย Serial</button>
          </header>
          <div className={styles.stockBalanceTable}>
            <div><b>สินค้า</b><b>ตั้งต้น</b><b>คงเหลือ</b><b>ม้วนเปิด</b><b>เมตรคงเหลือ</b><b>เปลี่ยนแปลง</b></div>
            {stockRows.map((row) => (
              <div key={row.product}>
                <span><b>{row.product}</b><small>{row.family === "NEXS" ? "NEXS · QR ประจำม้วน" : "กล่องทั่วไป · Internal Serial"}</small></span>
                <b>{row.quantity}</b>
                <b>{row.current}</b>
                <b>{row.open}</b>
                <b>{row.metres.toFixed(1)} m</b>
                <i className={row.change < 0 ? styles.stockDeltaDown : row.change > 0 ? styles.stockDeltaUp : styles.stockDeltaEqual}>{row.change > 0 ? `+${row.change}` : row.change}</i>
              </div>
            ))}
          </div>
          <footer><span>ยอดตั้งต้น 80 ม้วน</span><b>คงเหลือปัจจุบัน {activeUnits.length} ม้วน</b></footer>
        </article>

        <aside className={styles.reportAttentionPanel}>
          <header><p>ACTION REQUIRED</p><h2>สิ่งที่ต้องจัดการต่อ</h2><span>เรียงจากงานที่ช่วยให้ระบุตัวสินค้าได้แม่นยำขึ้น</span></header>
          <div>
            <article className={pendingQr ? styles.attentionUrgent : styles.attentionDone}><span>QR</span><div><b>รอผูก QR จริง</b><small>NEXS จากสต๊อกตั้งต้น</small></div><strong>{pendingQr}</strong></article>
            <article className={unprinted ? styles.attentionWarning : styles.attentionDone}><span>LB</span><div><b>ยังไม่พิมพ์ Label</b><small>กล่องทั่วไปยังเบิกแบบ FIFO ได้</small></div><strong>{unprinted}</strong></article>
            <article className={unassigned ? styles.attentionWarning : styles.attentionDone}><span>LOC</span><div><b>ยังไม่ระบุตำแหน่งจริง</b><small>ควรย้ายจาก “รอกำหนดตำแหน่ง”</small></div><strong>{unassigned}</strong></article>
            <article className={lowOpenRolls ? styles.attentionUrgent : styles.attentionDone}><span>LOW</span><div><b>ม้วนเปิดใกล้หมด</b><small>คงเหลือไม่เกิน 5 เมตร</small></div><strong>{lowOpenRolls}</strong></article>
          </div>
          <footer>{pendingQr + unprinted + unassigned + lowOpenRolls > 0 ? "มีรายการที่ควรจัดการต่อเพื่อให้ข้อมูลสมบูรณ์" : "ไม่มีรายการค้างที่ต้องจัดการ"}</footer>
        </aside>
      </section>

      <section className={styles.movementSummaryPanel}>
        <header><div><p>MOVEMENT SUMMARY</p><h2>สรุปประเภทความเคลื่อนไหว</h2></div><span>นับจากประวัติที่บันทึกในระบบ</span></header>
        <div>{movementSummary.map((item) => <article key={item.label}><span className={styles[item.tone]}>{item.label.slice(0, 1)}</span><div><b>{item.label}</b><small>รายการที่บันทึกแล้ว</small></div><strong>{item.count}</strong></article>)}</div>
      </section>

      <section className={styles.dataReadinessPanel}>
        <div><p>PRODUCT DATA READINESS</p><h2>Config ที่ยังต้องยืนยันเพิ่มเติม</h2><span>ระบบเปิดใช้งานด้วยยอดตั้งต้นแล้ว แต่ QR/Barcode และข้อมูลบางรุ่นยังต้องตรวจจากฉลากจริง</span></div>
        <div className={styles.readinessScore}><b>{PRODUCT_OPTIONS.length - needsVerification.length}/{PRODUCT_OPTIONS.length}</b><span>SKU ยืนยันแล้ว</span></div>
        <ul>
          <li><span>✓</span><div><b>ตั้งยอดเริ่มต้นในระบบแล้ว 80 ม้วน</b><small>NEXS 65 ม้วน · กล่องทั่วไป 15 ม้วน · ตามรายการที่คุณแจ้ง</small></div></li>
          <li><span>!</span><div><b>ต้องสแกน QR จริงอย่างน้อยรุ่นละ 1 กล่อง</b><small>เพื่อยืนยันรูปแบบ Serial และรหัสรุ่น Begin / Prime / Pro / Ultimate</small></div></li>
          <li><span>!</span><div><b>ต้องเก็บค่า Barcode ตัวเลขของกล่องทั่วไป</b><small>ขณะนี้ระบบใช้ SKU Code ภายในแทน Barcode ผู้ผลิต</small></div></li>
          <li><span>!</span><div><b>ต้องยืนยันขนาด/ประเภท {needsVerification.length} SKU</b><small>{needsVerification.map((product) => product.value).join(", ")}</small></div></li>
          <li><span>!</span><div><b>ต้องเชื่อม Scanner และเครื่องพิมพ์ Label รุ่นจริง</b><small>ปุ่ม Scanner และสถานะพิมพ์ยังเป็นโหมดทดลองจนกว่าอุปกรณ์จริงจะเชื่อมต่อ</small></div></li>
        </ul>
      </section>
      <section className={styles.auditPanel}>
        <header><div><p>AUDIT TRAIL</p><h2>กิจกรรมล่าสุด</h2></div><div><span>เรียงล่าสุดก่อน</span></div></header>
        <div>{activity.map((item) => <article key={item.id}><span className={styles[item.tone]}>{item.type.slice(0, 1)}</span><time>{item.time}</time><div><b>{item.title}</b><p>{item.detail}</p></div><small>ผู้ใช้งานปัจจุบัน</small><i>บันทึกแล้ว</i></article>)}</div>
      </section>
    </>
  );
}

function UnitDrawer({ unit, colorProducts, onClose, onOpen }: { unit: StockUnit; colorProducts: ColorProduct[]; onClose: () => void; onOpen: (view: ViewKey) => void }) {
  const remaining = (unit.metres / unit.initialMetres) * 100;
  const colorProduct = colorProductForUnit(unit, colorProducts);
  return (
    <div className={styles.drawerBackdrop} onMouseDown={onClose}>
      <aside className={styles.drawer} onMouseDown={(event) => event.stopPropagation()} aria-label={`รายละเอียด ${unit.serial}`}>
        <header><div><p>STOCK UNIT</p><h2>รายละเอียดหน่วยสินค้า</h2></div><button onClick={onClose} aria-label="ปิด">×</button></header>
        <div className={styles.drawerHero}>{unit.productKind === "color" && <ColorFilmVisual product={colorProduct} unit={unit} />}<span className={styles[`status-${unit.status}`]}>{STATUS_LABELS[unit.status]}</span><h3>{unit.product}</h3><p>{unit.serial}</p><div className={styles.bigGauge}><i style={{ width: `${Math.max(3, remaining)}%` }} /><b>{unit.metres.toFixed(1)} m</b><small>จาก {unit.initialMetres.toFixed(0)} เมตร</small></div></div>
        <dl className={styles.drawerFacts}>{unit.productKind === "color" && <><div><dt>ชื่อสี</dt><dd>{unit.colorName || "—"}</dd></div><div><dt>รหัสสี</dt><dd>{unit.colorCode || "—"}</dd></div></>}<div><dt>Variant</dt><dd>{unit.variant}</dd></div><div><dt>Lot / Batch</dt><dd>{unit.lot}</dd></div><div><dt>ตำแหน่ง</dt><dd>{unit.location}</dd></div><div><dt>Serial source</dt><dd>{serialSourceLabel(unit.source)}</dd></div><div><dt>Label status</dt><dd>{unit.labelStatus === "printed" ? "พิมพ์แล้ว" : "ยังไม่พิมพ์"}</dd></div><div><dt>อัปเดตล่าสุด</dt><dd>{unit.updatedAt}</dd></div></dl>
        {unit.source === "opening-balance" && <div className={styles.drawerNotice}><b>รอผูก QR จริงจากสินค้า</b><p>หน่วยนี้อยู่ในยอดตั้งต้นแล้ว เมื่อสแกน QR จริงเพื่อเบิกจ่าย ระบบจะใช้ QR นั้นแทนรหัสชั่วคราวโดยไม่เพิ่มยอดซ้ำ</p></div>}
        {unit.labelStatus === "unprinted" && <div className={styles.drawerNotice}><b>ยังไม่ได้พิมพ์ Label</b><p>เบิกได้ผ่าน SKU + FIFO แต่ระบุกล่องเฉพาะใบด้วยการสแกนไม่ได้ ควรพิมพ์ Label ก่อนนำไปปะปนกับ Lot อื่น</p><button disabled>ยังไม่เชื่อมเครื่องพิมพ์ Label</button></div>}
        <div className={styles.drawerTimeline}><p>ประวัติล่าสุด</p><article><span /><div><b>สถานะปัจจุบัน · {STATUS_LABELS[unit.status]}</b><small>{unit.updatedAt} · ผู้ใช้งานปัจจุบัน</small></div></article><article><span /><div><b>รับสินค้าเข้าคลัง</b><small>{unit.lot} · MAIN WAREHOUSE</small></div></article></div>
        <footer><button className={styles.secondaryButton} onClick={() => { onClose(); onOpen("movement"); }}>ทำรายการ</button><button className={styles.primaryButton} onClick={() => { onClose(); onOpen("rolls"); }}>บันทึกการใช้ →</button></footer>
      </aside>
    </div>
  );
}

function WorkflowGuide({ onClose }: { onClose: () => void }) {
  const steps = [
    ["01", "ระบุสินค้ารับเข้า", "สแกน QR, เลือก SKU หรือเลือกฟิล์มสีจากรูปจริง"],
    ["02", "อ่าน Product Config", "ระบบเติมรุ่น ขนาด ประเภท และรูปสีที่บันทึกไว้"],
    ["03", "สร้างตัวตน", "ใช้ QR เดิม หรือสร้าง Serial ภายในเฉพาะกล่องที่ไม่มี Serial ประจำม้วน"],
    ["04", "จัดเก็บ", "ยืนยัน Lot และตำแหน่งให้ตรงกับของจริง"],
    ["05", "เบิกหรือจ่าย", "เลือกเต็มม้วนหรือตัดใช้พร้อมบันทึกเมตร"],
    ["06", "คืน ย้าย หรือแจ้งเสีย", "คุณเลือกทำรายการเมื่อเกิดเหตุการณ์จริง"],
    ["07", "ตรวจนับ", "คุณเลือกตำแหน่งและเริ่มตรวจเมื่อพร้อม"],
    ["08", "ดูประวัติ", "ระบบบันทึกทุกการเคลื่อนไหวให้ตรวจย้อนหลัง"],
  ];
  return (
    <div className={styles.guideBackdrop} onMouseDown={onClose}>
      <section className={styles.workflowGuide} onMouseDown={(event) => event.stopPropagation()}>
        <header><div><p>NEXS STOCK · SINGLE USER</p><h2>ขั้นตอนการทำงานสำหรับผู้ดูแลสต็อกหนึ่งคน</h2><span>คุณเป็นคนเริ่มทุกงาน ส่วนระบบช่วยจำ Serial คงเหลือ ตำแหน่ง และประวัติให้</span></div><button onClick={onClose} aria-label="ปิด Workflow">×</button></header>
        <div className={styles.workflowSteps}>
          {steps.map(([number, title, copy], index) => <article key={number}><span>{number}</span><div><b>{title}</b><p>{copy}</p></div>{index < steps.length - 1 && <i>→</i>}</article>)}
        </div>
        <div className={styles.workflowLanes}>
          <article className={styles.existingLane}><p>LANE A · UNIT QR</p><h3>NEXS Begin / Prime / Pro / Ultimate</h3><div><span>สแกน QR เดิม</span><i>→</i><span>ตรวจรหัสซ้ำ</span><i>→</i><span>ผูก Lot และคลัง</span><i>→</i><span>พร้อมใช้</span></div><small>QR เดิมเป็น Serial ประจำม้วน · ไม่สร้างรหัสใหม่ซ้ำ</small></article>
          <article className={styles.generateLane}><p>LANE B · NO UNIT SERIAL</p><h3>กล่องทั่วไปที่ Barcode ระบุเพียง SKU หรือไม่มีรหัสเลย</h3><div><span>สแกน SKU / เลือกชื่อ</span><i>→</i><span>Generate Serial</span><i>→</i><b>พิมพ์ Label แนะนำ</b></div><small>ถ้าไม่ติด Label ให้เบิกผ่าน SKU + FIFO และต้องแยกกล่องไม่ให้ปะปน</small></article>
          <article className={styles.colorLane}><p>LANE C · COLOR FILM</p><h3>ฟิล์มสีที่ต้องเทียบจากภาพและรหัสสี</h3><div><span>เลือกรูปสี</span><i>→</i><span>ตรวจชื่อ / รหัสสี</span><i>→</i><span>Generate Serial</span></div><small>เพิ่มสีใหม่ครั้งเดียว จากนั้นใช้รูปเดิมซ้ำตอนรับเข้า เบิกจ่าย และตรวจนับ</small></article>
        </div>
        <div className={styles.workflowStates}><b>สถานะมาตรฐาน</b><span>พร้อมใช้</span><span>จองแล้ว</span><span>เปิดม้วน</span><span>จ่ายออก</span><span>เสียหาย</span></div>
        <footer><div><b>กติกาหลัก</b><span>ทุกงานเริ่มจากการกดของคุณ · ระบบไม่สร้างงานตรวจนับหรือแจ้งเสียขึ้นมาเอง · ถ้ารายการผิดให้ย้อนกลับด้วยประวัติ</span></div><button className={styles.primaryButton} onClick={onClose}>เข้าใจแล้ว เริ่มทำงาน</button></footer>
      </section>
    </div>
  );
}
