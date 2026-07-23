export type ProductTier = {
  code: string;
  name: string;
  role: string;
  warranty: string;
  finish: string;
  tone: "blue" | "green" | "red" | "gold" | "graphite" | "violet";
  summary: string;
  bestFor: string;
  features: string[];
};

export const clearTiers: ProductTier[] = [
  {
    code: "BEGIN",
    name: "Begin",
    role: "Entry / Value Protection",
    warranty: "สินค้า 4 ปี · ลอก 3 ปี",
    finish: "High Gloss",
    tone: "blue",
    summary: "จุดเริ่มต้นของการปกป้องผิวรถ สำหรับการใช้งานประจำวัน",
    bestFor: "Daily protection",
    features: ["Digital warranty", "Professional installation", "After-sales support"],
  },
  {
    code: "PRIME",
    name: "Prime",
    role: "Core / Hero SKU",
    warranty: "สินค้า 7 ปี · ลอก 4 ปี",
    finish: "High Gloss",
    tone: "blue",
    summary: "รุ่นแนะนำหลักที่สมดุลภาพลักษณ์ การใช้งาน และความมั่นใจ",
    bestFor: "Daily & weekend use",
    features: ["Digital warranty", "Professional installation", "Maintenance record"],
  },
  {
    code: "PRO",
    name: "Pro",
    role: "Premium Performance",
    warranty: "สินค้า 8 ปี · ลอก 5 ปี",
    finish: "Premium Gloss",
    tone: "blue",
    summary: "รุ่นอัปเกรดสำหรับผู้ใช้ที่ต้องการระดับพรีเมียมมากขึ้น",
    bestFor: "Performance enthusiast",
    features: ["Digital warranty", "Professional installation", "Inspection support"],
  },
  {
    code: "ULTIMATE",
    name: "Ultimate",
    role: "Flagship / Top-tier",
    warranty: "สินค้า 9 ปี · ลอก 7 ปี",
    finish: "Flagship Finish",
    tone: "gold",
    summary: "รุ่นเรือธงสำหรับรถพรีเมียมและเจ้าของที่ต้องการความมั่นใจสูงสุด",
    bestFor: "Premium ownership",
    features: ["Digital warranty", "Professional installation", "Priority after-sales flow"],
  },
];

export const matteTiers: ProductTier[] = [
  {
    code: "MATTE-PRIME",
    name: "Matte Prime",
    role: "Signature Matte",
    warranty: "ตามเงื่อนไขรุ่น",
    finish: "Smooth Matte",
    tone: "graphite",
    summary: "ผิวด้านสุขุม เรียบเนียน และคงบุคลิกเดิมของรถ",
    bestFor: "Factory matte finish",
    features: ["Digital warranty", "Professional installation", "After-sales support"],
  },
  {
    code: "MATTE-ULTIMATE",
    name: "Matte Ultimate",
    role: "Premium Matte",
    warranty: "ตามเงื่อนไขรุ่น",
    finish: "Premium Matte",
    tone: "graphite",
    summary: "ผิวด้านระดับเรือธงสำหรับงานติดตั้งที่ต้องการรายละเอียดสูง",
    bestFor: "Premium matte builds",
    features: ["Digital warranty", "Professional installation", "Inspection support"],
  },
];

export const colorTiers: ProductTier[] = [
  {
    code: "COLOR-BEGIN",
    name: "Color Begin",
    role: "Bold & Vibrant",
    warranty: "ตามเงื่อนไขรุ่น",
    finish: "Color PPF",
    tone: "red",
    summary: "เริ่มต้นความโดดเด่นในโทนสีคุณภาพคุ้มค่า",
    bestFor: "Distinct everyday color",
    features: ["Digital warranty", "Curated finish", "Dealer support"],
  },
  {
    code: "COLOR-PRIME",
    name: "Color Prime",
    role: "Refined & Sophisticated",
    warranty: "ตามเงื่อนไขรุ่น",
    finish: "Satin Color",
    tone: "blue",
    summary: "สีสวยคม เงางาม และมีมิติสำหรับงานออกแบบที่ดูสะอาด",
    bestFor: "Refined restyle",
    features: ["Digital warranty", "Curated finish", "Maintenance record"],
  },
  {
    code: "COLOR-PRO",
    name: "Color Pro",
    role: "Distinct & Premium",
    warranty: "ตามเงื่อนไขรุ่น",
    finish: "Premium Color",
    tone: "violet",
    summary: "เฉดพิเศษ บุคลิกชัด และโดดเด่นสำหรับรถที่มีคาแรกเตอร์",
    bestFor: "Premium statement",
    features: ["Digital warranty", "Curated finish", "Inspection support"],
  },
  {
    code: "COLOR-ULTIMATE",
    name: "Color Ultimate",
    role: "Exclusive & Luxurious",
    warranty: "ตามเงื่อนไขรุ่น",
    finish: "Flagship Color",
    tone: "green",
    summary: "กลุ่มสีเรือธงสำหรับงานที่ต้องการความพิเศษเฉพาะคัน",
    bestFor: "Exclusive customization",
    features: ["Digital warranty", "Curated finish", "Priority support"],
  },
];

export const warrantyExamples = {
  "P-TH-000124": {
    status: "active",
    product: "PRIME",
    serial: "P-TH-000124",
    vehicle: "Porsche 911 · กข •• 91",
    install: "12 ก.ค. 2026",
    expiry: "11 ก.ค. 2032",
    dealer: "NEXS Authorized Dealer · Bangkok",
    maintenance: "ใช้สิทธิ์แล้ว 1 ครั้ง · คงเหลือ 1 ครั้ง",
  },
  "PRO-1196MXY0401178Q": {
    status: "active",
    product: "PRO",
    serial: "PRO-1196MXY0401178Q",
    vehicle: "Sports Coupe · ทะเบียนปกปิด",
    install: "18 พ.ค. 2026",
    expiry: "17 พ.ค. 2034",
    dealer: "NEXS Authorized Dealer · Bangkok",
    maintenance: "ยังไม่มีรายการบำรุงรักษา",
  },
  "NEW-TH-000001": {
    status: "not-registered",
    product: "BEGIN",
    serial: "NEW-TH-000001",
    vehicle: "ยังไม่ลงทะเบียน",
    install: "-",
    expiry: "-",
    dealer: "-",
    maintenance: "-",
  },
  "EXP-TH-000123": {
    status: "expired",
    product: "PRIME",
    serial: "EXP-TH-000123",
    vehicle: "Sedan · ทะเบียนปกปิด",
    install: "10 ม.ค. 2019",
    expiry: "9 ม.ค. 2025",
    dealer: "NEXS Authorized Dealer",
    maintenance: "หมดระยะรับประกัน",
  },
  "HOLD-TH-000099": {
    status: "under-review",
    product: "PRO",
    serial: "HOLD-TH-000099",
    vehicle: "SUV · ทะเบียนปกปิด",
    install: "4 มิ.ย. 2026",
    expiry: "อยู่ระหว่างตรวจสอบ",
    dealer: "NEXS Authorized Dealer",
    maintenance: "รอผลการตรวจสอบข้อมูล",
  },
} as const;

export type WarrantyExample = (typeof warrantyExamples)[keyof typeof warrantyExamples];

export const navItems = [
  ["Clear PPF", "/clear-ppf"],
  ["Matte PPF", "/matte-ppf"],
  ["Color PPF", "/color-ppf"],
  ["Technology", "/technology"],
  ["Compare", "/compare"],
  ["Warranty", "/warranty"],
  ["For Dealers", "/for-dealers"],
  ["About NEXS", "/about-nexs"],
  ["FAQ", "/faq"],
] as const;
