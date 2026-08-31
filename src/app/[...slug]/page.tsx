import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLink, PageShell, ProductCard, SectionTitle, TrustStrip } from "../components";
import { DemoForm } from "../client-ui";
import { clearTiers, colorTiers, matteTiers } from "../content";

export default async function PublicRoute({ params, searchParams }: { params: Promise<{ slug: string[] }>; searchParams: Promise<{ serial?: string }> }) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const path = slug.join("/");
  if (path === "products") return <Products />;
  if (path === "clear-ppf") return <Collection type="clear" />;
  if (path === "matte-ppf") return <MatteColorCollection focus="matte" />;
  if (path === "color-ppf") return <MatteColorCollection focus="color" />;
  if (path === "compare") return <Compare />;
  if (path === "about" || path === "about-nexs") return <About />;
  if (path === "technology") return <Technology />;
  if (path === "standard") return <Standard />;
  if (path === "for-dealers") return <ForDealers />;
  if (path === "dealers") return <DealerDirectory />;
  if (path === "contact") return <Contact />;
  if (path === "faq") return <Faq />;
  if (path === "privacy") return <PolicyPage type="privacy" />;
  if (path === "terms") return <PolicyPage type="terms" />;
  if (path === "warranty-policy") return <PolicyPage type="warranty" />;
  if (path === "support") return <Support type="support" initialSerial={query.serial} />;
  if (path === "support/warranty") return <Support type="support" initialSerial={query.serial} />;
  if (path === "support/inspection") return <Support type="inspection" initialSerial={query.serial} />;
  if (path === "inspection") return <Support type="inspection" initialSerial={query.serial} />;
  if (slug[0] === "products" && slug[1]) return <ProductDetail code={slug[1]} />;
  notFound();
}

function Products() {
  return <PageShell><CollectionHero type="all" /><TrustStrip /><section className="section"><SectionTitle eyebrow="CLEAR PPF" title="Clear Film Collection" copy="4 ระดับผลิตภัณฑ์ ตั้งแต่จุดเริ่มต้นจนถึงรุ่นเรือธง" /><div className="product-grid product-grid-four">{clearTiers.map((p) => <ProductCard product={p} key={p.code} />)}</div></section><section className="section split-collection"><CollectionSummary title="Matte PPF" copy="ผิวด้านเรียบเนียนและบุคลิกสุขุม" href="/matte-ppf" tone="dark" /><CollectionSummary title="Color PPF" copy="เฉดสีที่คัดสรรเพื่อคาแรกเตอร์เฉพาะคัน" href="/color-ppf" tone="color" /></section></PageShell>;
}

function Collection({ type }: { type: "clear" | "matte" | "color" }) {
  const products = type === "clear" ? clearTiers : type === "matte" ? matteTiers : colorTiers;
  const title = type === "clear" ? "Clear PPF Collection" : type === "matte" ? "Matte Film Collection" : "Color Film Collection";
  const why = type === "clear" ? ["Invisible Protection", "Premium Finish", "Stone-chip Defense", "Easy Maintenance", "Digital Confidence"] : type === "matte" ? ["Smooth Matte", "Distinct Character", "Professional Install", "Care Record", "Digital Confidence"] : ["Curated Color", "Premium Visual Impact", "Professional Install", "Care Record", "Digital Confidence"];
  return (
    <PageShell className={`collection-page ${type}`}>
      <CollectionHero type={type} />
      <section className="section"><SectionTitle eyebrow={type.toUpperCase()} title={title} copy="เลือกผลิตภัณฑ์ตามบทบาทและรูปแบบการใช้งาน โดยเงื่อนไขรับประกันยึดตาม Policy ที่อนุมัติ" /><div className={`product-grid ${products.length > 4 ? "product-grid-five" : "product-grid-four"}`}>{products.map((p) => <ProductCard product={p} key={p.code} />)}</div></section>
      {type === "clear" && <section className="section comparison-wrap"><SectionTitle title="Find Your Best Match" /><ComparisonTable /></section>}
      <section className="section why-grid"><SectionTitle title={`Why ${type === "clear" ? "Clear" : type === "matte" ? "Matte" : "Color"} PPF`} /> <div>{why.map((x, i) => <article key={x}><b>{["◇", "✦", "▰", "◉", "⌁"][i]}</b><h3>{x}</h3><p>ออกแบบให้เชื่อมกับมาตรฐานการติดตั้งและระบบบริการหลังการขายของ NEXS</p></article>)}</div></section>
      <section className="section gallery-section"><SectionTitle title="Precision Installation. Flawless Finish." /><div>{["Front Bumper", "Hood & Edge", "Full Body", "Mirror Finish"].map((x, i) => <article key={x}><span className={`gallery-art art-${i + 1}`} /><h3>{x}</h3><p>รายละเอียดงานติดตั้งที่เน้นความเรียบเนียนและการตรวจสอบได้</p></article>)}</div></section>
      <section className="section help-banner"><div><h2>ต้องการคำแนะนำในการเลือก?</h2><p>ให้ผู้เชี่ยวชาญของ NEXS แนะนำผลิตภัณฑ์ที่เหมาะกับรถและการใช้งาน</p></div><ArrowLink href="/contact">Talk to an Expert</ArrowLink><ArrowLink secondary href="/dealers">Find an Installer</ArrowLink></section>
    </PageShell>
  );
}

function MatteColorCollection({ focus }: { focus: "matte" | "color" }) {
  const finishes = [
    ["gloss-red", "Gloss Red"], ["satin-silver", "Satin Silver"], ["midnight-blue", "Midnight Blue"], ["pearl-white", "Pearl White"],
    ["matte-black", "Matte Black"], ["satin-titanium", "Satin Titanium"], ["silk-purple", "Silk Purple"], ["forest-green", "Forest Green"],
  ];
  const benefits = [["◇", "Durable Surface", "พื้นผิวสำหรับการใช้งานจริงและการดูแลต่อเนื่อง"], ["◌", "Easy Cleaning", "ช่วยให้ขั้นตอนทำความสะอาดประจำวันง่ายขึ้น"], ["☼", "Finish Stability", "ออกแบบเพื่อรักษาบุคลิกของผิวและเฉดสี"], ["✦", "Premium Visual Impact", "คาแรกเตอร์เฉพาะคันพร้อมบัตรรับประกันดิจิทัล"]];
  return <PageShell className={`matte-color-page focus-${focus}`}>
    <section className="matte-color-hero"><div><p className="eyebrow slash">NEXS FILM COLLECTION</p><h1>Matte &amp; Color<br />Film Collection.</h1><p>ทุกเฉดอย่างที่ใช่ แรงปกป้องเต็มสไตล์—ผิวด้านสุขุมหรือสีที่โดดเด่น พร้อมระบบบันทึกงานและ Digital Warranty</p><div className="about-hero-actions"><ArrowLink href={focus === "matte" ? "#matte-collection" : "#color-collection"}>View All Finishes</ArrowLink><ArrowLink secondary href="/dealers">Find an Installer</ArrowLink></div></div><div /></section>
    <section className="section finish-product-section" id="matte-collection"><SectionTitle eyebrow="MATTE PPF" title="Quiet surface. Strong character." copy="ผิวด้านพรีเมียม เนียนตา และออกแบบให้ดูแลได้ภายใต้เงื่อนไขของผลิตภัณฑ์" center={false} /><div className="product-grid product-grid-four matte-product-grid">{matteTiers.map((product) => <ProductCard product={product} key={product.code} />)}<article className="finish-feature-image matte-roll-feature"><div><b>MATTE FINISH</b><span>Subtle texture · premium presence</span></div></article><article className="finish-feature-image matte-car-feature"><div><b>ON THE CAR</b><span>Factory-inspired matte character</span></div></article></div></section>
    <section className="section finish-product-section" id="color-collection"><SectionTitle eyebrow="COLOR PPF" title="Color, curated with purpose." copy="เฉดสีที่คัดสรรเพื่อเปลี่ยนคาแรกเตอร์รถ โดยข้อมูลรุ่นและงานติดตั้งยังตรวจสอบได้ในระบบเดียว" center={false} /><div className="product-grid product-grid-four">{colorTiers.map((product) => <ProductCard product={product} key={product.code} />)}</div></section>
    <section className="section finish-explorer"><SectionTitle title="Explore Finishes" copy="เลือกโทนและผิวสัมผัสเพื่อค้นหาทิศทางที่เข้ากับรถของคุณ" center={false} /><div>{finishes.map(([tone, label]) => <article key={tone}><span className={`finish-swatch swatch-${tone}`} /><b>{label}</b></article>)}</div></section>
    <section className="section on-car-gallery"><SectionTitle title="See It on the Car" copy="ตัวอย่างภาพรวมของคาแรกเตอร์เมื่ออยู่บนตัวรถจริง" center={false} /><div>{finishes.slice(0, 6).map(([tone, label], index) => <article className={`on-car-card on-car-${index + 1}`} key={tone}><span>{label}</span></article>)}</div></section>
    <section className="section matte-color-benefits"><SectionTitle title="Care & Benefits" copy="ปกป้องอย่างมั่นใจด้วยระบบผลิตภัณฑ์ งานติดตั้ง และบริการหลังการขาย" center={false} /><div>{benefits.map(([icon, title, copy]) => <article key={title}><b>{icon}</b><div><h3>{title}</h3><p>{copy}</p></div></article>)}</div></section>
    <section className="section help-banner"><div><h2>Looking for a custom look?</h2><p>ให้ผู้เชี่ยวชาญช่วยเลือกผิวและเฉดสีที่เหมาะกับรถและสไตล์ของคุณ</p></div><ArrowLink href="/contact">Consult a Specialist</ArrowLink><ArrowLink secondary href="/warranty">Digital Warranty</ArrowLink></section>
  </PageShell>;
}

function CollectionHero({ type }: { type: "all" | "clear" | "matte" | "color" }) {
  const data = type === "all" ? ["Complete Film System", "Protection and style, precisely organized.", "ผลิตภัณฑ์ NEXS แบ่งเป็น Clear, Matte และ Color เพื่อให้เลือกตามบทบาทได้ง่าย"] : type === "clear" ? ["Clear PPF Collection", "Invisible protection. Visible confidence.", "ฟิล์มใส 4 ระดับตามบทบาทและระยะรับประกันในระบบ"] : type === "matte" ? ["Matte Film Collection", "Quiet surface. Strong character.", "ผิวด้านพรีเมียมสำหรับรถที่ต้องการคาแรกเตอร์สุขุม"] : ["Color Film Collection", "Color, curated with purpose.", "เปลี่ยนคาแรกเตอร์รถด้วยเฉดสีที่คัดสรรและบันทึกได้ใน Digital Warranty"];
  return <section className={`collection-hero hero-${type}`}><div><p className="eyebrow slash">NEXS FILM SYSTEMS</p><h1>{data[0]}</h1><h2>{data[1]}</h2><p>{data[2]}</p><div><ArrowLink href="#collection">View Collection</ArrowLink><ArrowLink secondary href="/dealers">Find an Installer</ArrowLink></div></div><div className="collection-car" /></section>;
}

function ComparisonTable() {
  return <div className="comparison-table"><div className="table-head"><span /><b>Begin<small>Entry</small></b><b>Prime<small>Core</small></b><b>Pro<small>Performance</small></b><b>Ultimate<small>Flagship</small></b></div>{[["ระยะรับประกัน", "5 ปี", "6 ปี", "8 ปี", "9 ปี"], ["Finish", "High Gloss", "High Gloss", "Premium Gloss", "Flagship Finish"], ["Best for", "Daily", "Everyday+", "Enthusiast", "Premium"], ["Digital Card", "Included", "Included", "Included", "Included"]].map((row) => <div className="table-row" key={row[0]}>{row.map((cell, i) => i === 0 ? <b key={cell}>{cell}</b> : <span key={`${cell}-${i}`}>{cell}</span>)}</div>)}</div>;
}

function CollectionSummary({ title, copy, href, tone }: { title: string; copy: string; href: string; tone: string }) {
  return <Link className={`collection-summary ${tone}`} href={href}><p className="eyebrow">NEXS COLLECTION</p><h2>{title}</h2><p>{copy}</p><span>View Collection →</span></Link>;
}

function Compare() {
  return <PageShell><section className="simple-hero"><p className="eyebrow slash">COMPARE</p><h1>Find Your NEXS.</h1><p>เปรียบเทียบบทบาทผลิตภัณฑ์โดยไม่แสดงราคา ต้นทุน หรือข้อมูลภายใน</p></section><section className="section comparison-wrap"><ComparisonTable /><div className="compare-notice"><b>หมายเหตุสำคัญ</b><p>สมรรถนะและเงื่อนไขการรับประกันต้องยึดเอกสาร Warranty Policy ฉบับอนุมัติ การเปรียบเทียบนี้ใช้เพื่อช่วยเลือกบทบาทผลิตภัณฑ์เท่านั้น</p></div></section></PageShell>;
}

function About() {
  const technology = [
    ["◇", "Advanced TPU", "โครงสร้างวัสดุที่ออกแบบเพื่อความใส ความยืดหยุ่น และการใช้งานจริง"],
    ["◉", "Optical Clarity", "งานผิวที่เน้นความคมชัดและรักษาบุคลิกเดิมของสีรถ"],
    ["↻", "Self-Healing Topcoat", "ชั้นผิวที่ช่วยดูแลรอยละเอียดภายใต้เงื่อนไขของผลิตภัณฑ์"],
    ["◌", "Hydrophobic Surface", "พื้นผิวดูแลง่ายและช่วยลดการเกาะตัวของน้ำและสิ่งสกปรก"],
    ["☼", "Finish Stability", "ออกแบบให้ความสวยของผิวและการปกป้องทำงานไปด้วยกัน"],
    ["⌁", "Installer-Friendly", "ระบบผลิตภัณฑ์ที่เชื่อมกับมาตรฐานช่างและการตรวจสอบงาน"],
  ];
  const reasons = [
    ["material", "Premium Material Selection", "คัดเลือกวัสดุตามบทบาทผลิตภัณฑ์และมาตรฐานที่อนุมัติ"],
    ["architecture", "Complete Product Architecture", "Clear, Matte และ Color จัดระบบให้เลือกและเปรียบเทียบได้ง่าย"],
    ["realworld", "Real-World Usability", "ออกแบบประสบการณ์ตั้งแต่เลือกฟิล์ม ติดตั้ง ไปจนถึงบริการหลังการขาย"],
    ["support", "Support for Dealers", "เครื่องมือสำหรับลงทะเบียน ตรวจสอบ และติดตามงานจากจุดเดียว"],
  ];
  const faq = [
    ["NEXS เชื่อมผลิตภัณฑ์กับบัตรรับประกันอย่างไร?", "ข้อมูลรุ่น Serial ร้านติดตั้ง รถ และวันที่ติดตั้งถูกจัดเก็บเป็นระเบียนเดียวกัน เพื่อให้ตรวจสอบผ่าน Digital Warranty ได้"],
    ["ลูกค้าตรวจสอบสถานะได้จากที่ใด?", "สแกน QR บนบัตรหรือกรอก Serial Number ในหน้าตรวจสอบรับประกัน โดยข้อมูลส่วนบุคคลจะแสดงเฉพาะส่วนที่จำเป็น"],
    ["NEXS รองรับงานหลังการขายแบบใด?", "ระบบรองรับคำขอช่วยเหลือ การนัดตรวจสภาพ และประวัติการดูแล โดยผลทุกกรณีต้องผ่านการตรวจสอบ"],
  ];
  return <PageShell>
    <section className="editorial-hero about-hero"><div><p className="eyebrow slash">ABOUT NEXS</p><h1>About NEXS</h1><p>แบรนด์ฟิล์มที่เกิดจากคนที่เข้าใจทั้งการปกป้องและความงามของผิวรถจริง</p><div className="about-hero-actions"><ArrowLink href="#our-story">Our Story</ArrowLink><ArrowLink secondary href="/for-dealers">Become a Dealer</ArrowLink></div></div><div /></section>
    <section className="section about-story" id="our-story"><div className="dark-panel"><p>NEXS</p><span>ENGINEERED FOR REAL-WORLD PROTECTION</span></div><div><p className="eyebrow">OUR STORY</p><h2>Built by People Who Care About the Finish.</h2><p>NEXS วางระบบผลิตภัณฑ์ งานติดตั้ง และบัตรรับประกันให้ทำงานร่วมกัน เพื่อให้ลูกค้าและตัวแทนจำหน่ายติดตามข้อมูลสำคัญได้อย่างเป็นระบบ</p><p>เราเชื่อว่าประสบการณ์ระดับพรีเมียมไม่ได้จบเมื่อรถออกจากศูนย์ติดตั้ง แต่ต้องตรวจสอบได้ ดูแลต่อได้ และมีช่องทางช่วยเหลือที่ชัดเจนตลอดอายุการใช้งาน</p></div></section>
    <section className="section about-technology"><SectionTitle title="The Technology Behind the Film" copy="รายละเอียดที่ดีเกิดจากวัสดุ งานติดตั้ง และระบบดูแลที่ทำงานร่วมกัน" /><div>{technology.map(([icon, title, copy]) => <article key={title}><b>{icon}</b><h3>{title}</h3><p>{copy}</p></article>)}</div></section>
    <section className="section about-reasons"><SectionTitle title="Why Choose NEXS" /><div>{reasons.map(([tone, title, copy]) => <article className={`about-reason reason-${tone}`} key={title}><div><h3>{title}</h3><p>{copy}</p></div></article>)}</div></section>
    <TrustStrip />
    <section className="section about-dealer-panel"><div className="about-dealer-image" /><div><p className="eyebrow">FOR DEALERS</p><h2>Grow with a system built for professional work.</h2><p>ตั้งแต่มาตรฐานผลิตภัณฑ์ การลงทะเบียนงาน ไปจนถึง Digital Warranty และบริการหลังการขาย—ทุกส่วนถูกออกแบบให้ Dealer ทำงานง่ายขึ้นและลูกค้าได้รับข้อมูลที่ชัดเจน</p><div className="about-dealer-points"><span><b>01</b> Product workflow</span><span><b>02</b> Digital records</span><span><b>03</b> After-sales support</span></div><div className="about-hero-actions"><ArrowLink href="/for-dealers">Explore Dealer System</ArrowLink><ArrowLink secondary href="/contact">Contact NEXS</ArrowLink></div></div></section>
    <section className="section about-faq"><SectionTitle title="Frequently Asked Questions" copy="คำตอบสั้น ๆ เกี่ยวกับผลิตภัณฑ์ ระบบรับประกัน และบริการหลังการขาย" />{faq.map(([q, a]) => <details key={q}><summary>{q}<span>+</span></summary><p>{a}</p></details>)}<div className="about-faq-action"><ArrowLink secondary href="/faq">ดูคำถามทั้งหมด</ArrowLink></div></section>
  </PageShell>;
}

function Technology() {
  const features = [
    ["01", "Clarity", "ความใสและงานผิวต้องรักษาบุคลิกเดิมของรถ"],
    ["02", "Surface Recovery", "ชั้นผิวออกแบบให้ดูแลรอยละเอียดตามเงื่อนไขผลิตภัณฑ์"],
    ["03", "Hydrophobic Care", "ช่วยให้การทำความสะอาดและดูแลประจำวันง่ายขึ้น"],
    ["04", "Finish Stability", "ความสวยและการปกป้องถูกวางให้ทำงานร่วมกัน"],
  ];
  return <PageShell>
    <section className="editorial-hero technology-hero"><div><p className="eyebrow slash">NEXS TECHNOLOGY</p><h1>Protection engineered as a complete surface system.</h1><p>เทคโนโลยีที่ดีไม่ได้อยู่เฉพาะในเนื้อฟิล์ม แต่ต้องเชื่อมกับงานติดตั้ง การตรวจสอบ และการดูแลหลังส่งมอบ</p><div className="about-hero-actions"><ArrowLink href="/compare">Compare Films</ArrowLink><ArrowLink secondary href="/contact">Talk to an Expert</ArrowLink></div></div><div /></section>
    <section className="section editorial-grid">{features.map(([n, t, c]) => <article key={t}><span>{n}</span><h2>{t}</h2><p>{c}</p></article>)}</section>
    <section className="section technology-detail"><div className="technology-detail-image" /><div><p className="eyebrow">MATERIAL ARCHITECTURE</p><h2>Every layer has a job.</h2><p>แนวคิดของ NEXS คือการจัดระบบชั้นวัสดุให้แต่ละส่วนมีบทบาทชัดเจน ตั้งแต่ชั้นผิว ชั้น TPU ชั้นกาว ไปจนถึงแผ่นรองก่อนติดตั้ง</p><ol><li><b>Topcoat</b><span>ผิวสัมผัสและการดูแลรอยละเอียด</span></li><li><b>Performance TPU</b><span>แกนหลักของความยืดหยุ่นและการปกป้อง</span></li><li><b>Adhesive</b><span>สมดุลการยึดเกาะกับงานติดตั้งมืออาชีพ</span></li><li><b>Release Liner</b><span>ปกป้องระบบกาวก่อนการติดตั้ง</span></li></ol></div></section>
    <section className="section layer-section"><div><p className="eyebrow">CONNECTED PROTECTION</p><h2>Technology continues after installation.</h2><p>ข้อมูลผลิตภัณฑ์และงานติดตั้งเชื่อมต่อกับ Digital Warranty เพื่อให้ลูกค้าตรวจสอบสถานะและเข้าถึงบริการหลังการขายได้ง่าย</p></div><ol><li>Product Series</li><li>Serial / Batch</li><li>Installation Record</li><li>Digital Warranty</li><li>Support & Inspection</li></ol></section>
  </PageShell>;
}

function Standard() {
  const steps = [
    ["01", "Verify", "ตรวจสอบรุ่น Serial และสถานะก่อนเริ่มงาน"],
    ["02", "Prepare", "เตรียมพื้นผิวและข้อมูลงานให้พร้อมตามมาตรฐาน"],
    ["03", "Install", "ติดตั้งโดยช่างและกระบวนการที่ได้รับการกำหนด"],
    ["04", "Inspect", "ตรวจคุณภาพ บันทึกภาพ และยืนยันรายละเอียดรถ"],
    ["05", "Register", "ลงทะเบียนข้อมูลเพื่อสร้าง Digital Warranty"],
  ];
  return <PageShell>
    <section className="editorial-hero standard-hero"><div><p className="eyebrow slash">INSTALLATION STANDARD</p><h1>Precision at every handoff.</h1><p>มาตรฐานงานติดตั้งที่เชื่อม Serial, Dealer, Vehicle, Install Date และหลักฐานสำคัญไว้ในระบบเดียว</p><div className="about-hero-actions"><ArrowLink href="/for-dealers">For Dealers</ArrowLink><ArrowLink secondary href="/warranty">Check Warranty</ArrowLink></div></div><div /></section>
    <section className="section standard-flow"><SectionTitle eyebrow="NEXS WORKFLOW" title="From sealed roll to verified record" copy="ทุกขั้นมีผู้รับผิดชอบและข้อมูลที่ตรวจย้อนกลับได้" /><div>{steps.map(([n, t, c]) => <article key={n}><b>{n}</b><h2>{t}</h2><p>{c}</p></article>)}</div></section>
    <section className="section standard-evidence"><div><p className="eyebrow">QUALITY EVIDENCE</p><h2>Record what matters.</h2><p>ระบบจัดเก็บข้อมูลเท่าที่จำเป็นต่อการตรวจสอบงานและบริการหลังการขาย โดยรูปและเอกสารที่เป็นข้อมูลส่วนบุคคลไม่เปิดเผยบนหน้าสาธารณะ</p></div><div className="evidence-grid"><span>Serial & Batch</span><span>Vehicle Details</span><span>Install Date</span><span>Dealer Record</span><span>Work Images</span><span>Customer Consent</span></div></section>
  </PageShell>;
}

function ForDealers() {
  return <PageShell><section className="simple-hero dealer-hero"><p className="eyebrow slash">FOR DEALERS</p><h1>Built for professional installation.</h1><p>ระบบที่ช่วยให้ Dealer ลงทะเบียนงาน ติดตามบัตรรับประกัน และบันทึกบริการหลังการขายได้จากจุดเดียว</p><div><ArrowLink href="/login">Dealer Login</ArrowLink><ArrowLink secondary href="/contact">สมัครเป็นตัวแทน</ArrowLink></div></section><section className="section workflow-cards">{[["01", "Scan Serial", "สแกนหรือกรอก Serial และให้ระบบตรวจสอบรุ่น"], ["02", "Register", "กรอกลูกค้า รถ วันที่ติดตั้ง และภาพประกอบ"], ["03", "Digital Card", "ส่ง QR ให้ลูกค้าตรวจสอบบัตรดิจิทัล"], ["04", "After-sales", "บันทึก Maintenance และส่งคำขอตรวจสภาพ"]].map(([n, t, c]) => <article key={n}><b>{n}</b><h2>{t}</h2><p>{c}</p></article>)}</section><section className="section help-banner"><div><h2>พร้อมเติบโตไปกับ NEXS?</h2><p>ส่งข้อมูลร้านและพื้นที่ให้ทีมงานตรวจสอบช่องทางที่เหมาะสม</p></div><ArrowLink href="/contact">Apply Now</ArrowLink></section></PageShell>;
}

function DealerDirectory() {
  const regions = [
    {
      name: "กรุงเทพฯ และปริมณฑล",
      dealers: [
        ["Wash A Matter (HQ)", "ห้วยขวาง กรุงเทพฯ", "094-229-3949"],
        ["Wash A Matter — CDC พระรามอินทรา", "บางกะปิ กรุงเทพฯ", "095-579-2209"],
        ["Wash A Matter — พระราม 2", "จอมทอง กรุงเทพฯ", "095-556-3366"],
        ["55 Wash — เอกมัย (HQ)", "กรุงเทพฯ", "081-278-8959"],
        ["55 Wash — พุทธมณฑลสาย 4", "นครปฐม", "062-535-5878"],
        ["55 Wash — สมุทรสาคร", "สมุทรสาคร", "099-491-1611"],
        ["55 Wash — หนองแขม", "กรุงเทพฯ", "098-256-4799"],
        ["55 Wash — บางใหญ่", "นนทบุรี", "092-583-9923"],
        ["Posh up Car Detailing", "ธนบุรี กรุงเทพฯ", "081-551-1582"],
        ["@Wash Station", "สมุทรสาคร", "061-329-1046"],
      ],
    },
    {
      name: "ภาคกลางและภาคตะวันออก",
      dealers: [
        ["Cream Car Spa", "พระนครศรีอยุธยา", "085-191-0101"],
        ["Spirit Car Wash", "นครปฐม", "086-565-5516"],
        ["DD Car Wash", "สระบุรี", "061-329-1046"],
        ["PM Carcare", "ศรีราชา ชลบุรี", "084-402-4001"],
        ["วัฒนา Premium Wash", "เพชรบูรณ์", "062-662-9932"],
      ],
    },
    {
      name: "ภาคเหนือ",
      dealers: [
        ["Asia Car Spa — เชียงราย", "เชียงราย", "062-293-9993"],
        ["Asia Car Spa — เชียงใหม่", "เชียงใหม่", "080-161-9655"],
        ["Aqua Wash", "เชียงใหม่", "092-954-2322"],
      ],
    },
    {
      name: "ภาคใต้และภาคตะวันออกเฉียงเหนือ",
      dealers: [
        ["Wash Tech Automotive", "ภูเก็ต", "086-595-9697"],
        ["Haad Yai Ferrari", "สงขลา", "088-784-1598"],
        ["Top One Car Wash & Spa", "อุดรธานี", "091-860-8899"],
        ["RC Studio", "ขอนแก่น", "084-402-4001"],
      ],
    },
  ];
  return <PageShell>
    <section className="simple-hero dealer-directory-hero"><p className="eyebrow slash">AUTHORIZED NETWORK</p><h1>ค้นหาศูนย์ติดตั้ง NEXS</h1><p>เลือกศูนย์ติดตั้งที่ได้รับการรับรองใกล้คุณ แล้วติดต่อร้านโดยตรงเพื่อสอบถามคิว รุ่นสินค้า และรายละเอียดการติดตั้ง</p><div><ArrowLink href="/contact">ติดต่อทีม NEXS</ArrowLink><ArrowLink secondary href="/warranty">ตรวจสอบบัตรรับประกัน</ArrowLink></div></section>
    <section className="section dealer-directory">
      <div className="directory-note"><b>ก่อนเข้ารับบริการ</b><p>กรุณายืนยันรุ่นสินค้า ราคา คิวติดตั้ง และสถานะการรับรองกับร้านอีกครั้ง รายชื่ออาจมีการเปลี่ยนแปลงตามรอบการรับรองของ NEXS</p></div>
      {regions.map((region) => <section key={region.name}><header><h2>{region.name}</h2><span>{region.dealers.length} ศูนย์</span></header><div>{region.dealers.map(([name, location, phone]) => <article key={`${name}-${phone}`}><span className="dealer-certified">CERTIFIED</span><h3>{name}</h3><p>⌖ {location}</p><a href={`tel:${phone.replaceAll("-", "")}`}>โทร {phone} <span aria-hidden="true">→</span></a></article>)}</div></section>)}
    </section>
  </PageShell>;
}

function Contact() {
  return <PageShell><section className="simple-hero"><p className="eyebrow slash">CONTACT NEXS</p><h1>Let’s build something premium.</h1><p>ติดต่อทีมงานเพื่อแนะนำผลิตภัณฑ์ ค้นหาตัวแทนจำหน่าย หรือสอบถามระบบบัตรรับประกัน</p></section><section className="section contact-layout"><DemoForm kind="contact" /><aside><h2>Contact Information</h2><p><b>บริษัท</b><span>Nexs PPF Co., Ltd.</span></p><p><b>โทรศัพท์</b><span><a href="tel:0965964639">096-596-4639</a><br />จันทร์–เสาร์ 09:00–18:00</span></p><p><b>LINE</b><span><a href="https://line.me/R/ti/p/%40nexslabs" target="_blank" rel="noreferrer">@nexslabs</a></span></p><p><b>ศูนย์ติดตั้ง</b><span><Link href="/dealers">ดูรายชื่อศูนย์ที่ได้รับการรับรอง →</Link></span></p><div className="map-panel"><span>⌖</span><b>NEXS Thailand</b><small>เครือข่ายตัวแทนจำหน่ายทั่วประเทศไทย</small></div></aside></section></PageShell>;
}

function Faq() {
  const items = [["ตรวจสอบบัตรรับประกันอย่างไร?", "สแกน QR บนบัตรหรือกรอก Serial Number ที่หน้า Warranty Search"], ["ทำไมข้อมูลลูกค้าบางส่วนถูกปกปิด?", "หน้าสาธารณะจะแสดงเฉพาะข้อมูลที่จำเป็นตามหลัก PDPA"], ["Digital Warranty Card ใช้แทน QR ได้หรือไม่?", "QR เป็นช่องทางเปิดบัตร ส่วนข้อมูลหลักอ้างอิงจาก Serial ในระบบ"], ["ต้องการตรวจสภาพต้องทำอย่างไร?", "เปิดคำขอจาก Digital Card หรือหน้า Inspection แล้วรอ Dealer/Admin นัดหมาย"], ["Dealer เห็นข้อมูลของร้านอื่นหรือไม่?", "ไม่เห็น Dealer ถูกออกแบบให้เข้าถึงเฉพาะรายการของตนเอง"], ["ข้อเรียกร้องรับประกันอนุมัติอัตโนมัติหรือไม่?", "ไม่อัตโนมัติ ทุกคำขอต้องผ่านการตรวจสอบเงื่อนไข งานติดตั้ง และสภาพการใช้งาน"]];
  return <PageShell><section className="simple-hero"><p className="eyebrow slash">FAQ</p><h1>Questions, answered clearly.</h1><p>คำตอบที่ยึด flow ระบบและไม่สื่อสารเกินเงื่อนไขที่อนุมัติ</p></section><section className="section faq-page">{items.map(([q, a]) => <details key={q}><summary>{q}<span>+</span></summary><p>{a}</p></details>)}</section></PageShell>;
}

function Support({ type, initialSerial = "" }: { type: "support" | "inspection"; initialSerial?: string }) {
  const isInspection = type === "inspection";
  return <PageShell><section className="simple-hero"><p className="eyebrow slash">AFTER-SALES SUPPORT</p><h1>{isInspection ? "Request an Inspection" : "Warranty Support"}</h1><p>{isInspection ? "ส่งข้อมูลเพื่อขอนัดตรวจสภาพ โดยผลการพิจารณาจะไม่อนุมัติอัตโนมัติ" : "แจ้งปัญหาเกี่ยวกับบัตร QR, Serial หรือเงื่อนไขการรับประกัน"}</p></section><section className="section support-layout"><div><h2>ขั้นตอนการส่งคำขอ</h2><ol><li>กรอก Serial และข้อมูลติดต่อ</li><li>แนบภาพประกอบได้โดยไม่บังคับ</li><li>ระบบสร้างเลขอ้างอิงและปกปิดข้อมูลบน public</li><li>Dealer/Admin ตรวจสอบและอัปเดตสถานะ</li></ol><div className="guardrail-box"><b>ไม่รับรองผลอัตโนมัติ</b><p>ทุกคำขอต้องตรวจสอบเงื่อนไข การติดตั้ง อุบัติเหตุ สีเดิม และการใช้งานจริง</p></div></div><DemoForm kind={isInspection ? "inspection" : "support"} initialSerial={initialSerial} /></section></PageShell>;
}

function PolicyPage({ type }: { type: "privacy" | "warranty" | "terms" }) {
  const title = type === "privacy" ? "Privacy Policy" : type === "warranty" ? "Warranty Policy" : "Terms & Conditions";
  const privacy = [
    ["ผู้ควบคุมข้อมูลและขอบเขต", "Nexs PPF Co., Ltd. เป็นผู้ดูแลข้อมูลที่ได้รับผ่านเว็บไซต์ ระบบบัตรรับประกัน และเครือข่ายตัวแทนจำหน่าย ข้อมูลบนหน้าสาธารณะถูกจำกัดและปกปิดเพื่อไม่เปิดเผยชื่อ เบอร์โทร อีเมล หรือทะเบียนรถเต็มรูปแบบ"],
    ["ข้อมูลที่เก็บ", "ระบบอาจเก็บชื่อและช่องทางติดต่อ ข้อมูลรถ Serial รุ่นสินค้า วันที่และศูนย์ติดตั้ง รูปประกอบงาน ประวัติการดูแล คำขอบริการ ข้อมูลความยินยอม และบันทึกความปลอดภัยของระบบ เท่าที่จำเป็นต่อการให้บริการ"],
    ["วัตถุประสงค์และฐานการใช้ข้อมูล", "ใช้เพื่อลงทะเบียนและตรวจสอบบัตร ให้บริการหลังการขาย ติดต่อกลับ ตรวจสอบสิทธิ์ ป้องกันการทุจริต รักษาความปลอดภัย และปฏิบัติตามกฎหมาย โดยอาศัยการปฏิบัติตามสัญญา ความยินยอม ประโยชน์โดยชอบด้วยกฎหมาย หรือหน้าที่ตามกฎหมายตามแต่กรณี"],
    ["การเปิดเผยและการรักษาความปลอดภัย", "ข้อมูลอาจเข้าถึงโดย NEXS ตัวแทนจำหน่ายที่รับผิดชอบงาน และผู้ให้บริการโครงสร้างพื้นฐานที่จำเป็น ภายใต้สิทธิ์ตามบทบาท การบันทึก Audit Log และมาตรการป้องกันที่เหมาะสม ไฟล์งานไม่เปิดเป็นสาธารณะ"],
    ["ระยะเวลาการเก็บ", "เก็บข้อมูลตลอดช่วงที่จำเป็นต่อบัตรรับประกัน การบริการหลังการขาย การระงับข้อพิพาท และหน้าที่ตามกฎหมาย เมื่อหมดความจำเป็นจะลบ ทำลาย หรือทำให้ไม่สามารถระบุตัวบุคคลได้ตามกระบวนการของ NEXS"],
    ["สิทธิของเจ้าของข้อมูล", "ท่านอาจขอเข้าถึง แก้ไข ลบ ระงับ คัดค้าน ขอรับหรือโอนข้อมูล และถอนความยินยอมได้ตามเงื่อนไขของกฎหมาย การถอนความยินยอมไม่กระทบการประมวลผลที่ชอบด้วยกฎหมายก่อนถอน"],
    ["ติดต่อเรื่องข้อมูลส่วนบุคคล", "ส่งคำขอผ่านหน้า Contact ระบุหัวข้อ “Privacy / PDPA” หรือติดต่อโทร 096-596-4639 และ LINE Official @nexslabs ทีมงานอาจขอข้อมูลเพิ่มเติมเพื่อยืนยันตัวตนก่อนดำเนินการ"],
  ];
  const warranty = [
    ["เงื่อนไขเบื้องต้น", "สิทธิ์ใช้ได้กับผลิตภัณฑ์แท้ที่มี Serial ถูกต้อง ติดตั้งโดยศูนย์ที่ได้รับการรับรอง และลงทะเบียน Digital Warranty สำเร็จ ระยะเวลาเริ่มจากวันที่ติดตั้งและยึดข้อมูลบนบัตรดิจิทัลของ Serial นั้น"],
    ["ระยะรับประกัน Clear PPF", "BEGIN 5 ปี · PRIME 6 ปี · PRO 8 ปี · ULTIMATE 9 ปี โดยวันเริ่มและวันหมดอายุจะแสดงบนบัตรรับประกันดิจิทัลหลัง Dealer เปิดใช้งาน รุ่น Matte, Color และสินค้าเฉพาะให้ยึดเงื่อนไขบนบัตรและเอกสารรุ่นที่ได้รับขณะติดตั้ง"],
    ["สิ่งที่ครอบคลุม", "ครอบคลุมความผิดปกติของวัสดุจากกระบวนการผลิต เช่น การเหลืองผิดปกติ การแตกร้าวหรือกรอบ และการแยกชั้น รวมถึงการลอกตามระยะของรุ่น ทั้งนี้ต้องผ่านการตรวจสอบสภาพและประวัติการติดตั้ง"],
    ["ข้อยกเว้น", "ไม่ครอบคลุมความเสียหายจากอุบัติเหตุ หินกระเด็น รอยขีดข่วนลึก การชน ไฟไหม้ น้ำท่วม สารเคมีหรือการดูแลที่ไม่เหมาะสม การดัดแปลง/ซ่อมโดยไม่ได้รับอนุญาต สีเดิมหรือสีซ่อมที่มีปัญหา การติดตั้งโดยร้านที่ไม่ได้รับรอง และการสึกหรอตามปกติ"],
    ["การแจ้งและตรวจสอบ", "แจ้งผ่าน Warranty Support พร้อม Serial ช่องทางติดต่อ รายละเอียด และภาพประกอบ จากนั้นนำรถเข้าตรวจที่ศูนย์ที่ได้รับการรับรองเมื่อมีการนัดหมาย NEXS จะตรวจข้อมูลผลิตภัณฑ์ งานติดตั้ง สภาพรถ และข้อยกเว้นก่อนแจ้งผล"],
    ["ผลการพิจารณา", "การส่งคำขอหรือสถานะ Under Review ไม่ถือเป็นการอนุมัติอัตโนมัติ แนวทางแก้ไขอาจเป็นการซ่อม เปลี่ยนเฉพาะส่วน หรือวิธีที่เหมาะสมตามสภาพและเงื่อนไขของรุ่น โดย NEXS จะแจ้งผลและขั้นตอนผ่านช่องทางที่ผู้ขอให้ไว้"],
    ["ข้อกำหนดเพิ่มเติม", "สิทธิ์ผูกกับรถ Serial และเจ้าของงานที่ลงทะเบียน ไม่สามารถโอนสิทธิ์โดยอัตโนมัติ โปรดเก็บหลักฐานการติดตั้งและปฏิบัติตามคำแนะนำการดูแล เงื่อนไขนี้ไม่ตัดสิทธิ์ที่ผู้บริโภคมีตามกฎหมาย"],
  ];
  const terms = [
    ["การยอมรับเงื่อนไข", "เมื่อใช้เว็บไซต์ ตรวจสอบ Serial ส่งแบบฟอร์ม หรือเข้าใช้งานพื้นที่ Dealer/Admin ถือว่าท่านยอมรับเงื่อนไขฉบับนี้ หากไม่ยอมรับ โปรดหยุดใช้บริการและติดต่อ NEXS เพื่อขอช่องทางอื่น"],
    ["ข้อมูล Serial และ Digital Warranty", "QR เป็นทางลัดไปยังข้อมูลของ Serial ส่วนฐานข้อมูล NEXS เป็นแหล่งอ้างอิงหลัก ผู้ใช้ต้องให้ข้อมูลถูกต้องและไม่ใช้ Serial ของผู้อื่น บัตรดิจิทัลช่วยตรวจสอบสถานะ แต่ไม่ใช่หลักฐานการอนุมัติเคลมอัตโนมัติ"],
    ["บัญชี Dealer และ Admin", "บัญชีเป็นสิทธิ์เฉพาะบุคคลหรือองค์กร ห้ามแบ่งปันการเข้าถึง ผู้ใช้ต้องแจ้งเมื่อสงสัยว่าบัญชีถูกใช้โดยไม่ได้รับอนุญาต NEXS อาจระงับสิทธิ์เพื่อรักษาความปลอดภัย ตรวจสอบข้อมูล หรือเมื่อสถานะ Dealer ไม่เป็น Active"],
    ["การใช้งานที่ห้าม", "ห้ามพยายามเข้าถึงข้อมูลที่ไม่มีสิทธิ์ รบกวนระบบ ปลอมแปลง Serial อัปโหลดไฟล์อันตราย เก็บข้อมูลจำนวนมากโดยอัตโนมัติ หรือใช้เนื้อหาและเครื่องหมายการค้าในทางที่ทำให้เกิดความเข้าใจผิด"],
    ["เนื้อหาและทรัพย์สินทางปัญญา", "ชื่อ NEXS โลโก้ ภาพ ข้อความ และองค์ประกอบเว็บไซต์เป็นทรัพย์สินของเจ้าของสิทธิ์ การดูข้อมูลเพื่อเลือกซื้อหรือรับบริการไม่ให้สิทธิ์นำไปผลิตซ้ำ ดัดแปลง หรือใช้เชิงพาณิชย์โดยไม่ได้รับอนุญาต"],
    ["ความพร้อมของบริการ", "NEXS พยายามรักษาความถูกต้องและความต่อเนื่องของระบบ แต่อาจหยุดชั่วคราวเพื่อบำรุงรักษา ความปลอดภัย หรือเหตุที่อยู่นอกการควบคุม หากข้อมูลบนเว็บไซต์ขัดกับบัตรที่ออกให้ เอกสารรุ่น หรือกฎหมาย ให้ติดต่อ NEXS เพื่อตรวจสอบก่อนดำเนินการ"],
    ["กฎหมายและการติดต่อ", "เงื่อนไขนี้อยู่ภายใต้กฎหมายไทย NEXS อาจปรับปรุงเงื่อนไขเมื่อบริการหรือกฎหมายเปลี่ยนแปลง โดยจะแสดงวันที่ปรับปรุงบนหน้านี้ ติดต่อได้ผ่านหน้า Contact โทร 096-596-4639 หรือ LINE Official @nexslabs"],
  ];
  const topics = type === "privacy" ? privacy : type === "warranty" ? warranty : terms;
  const intro = type === "privacy" ? "ประกาศนี้อธิบายการเก็บ ใช้ เปิดเผย และคุ้มครองข้อมูลในระบบเว็บไซต์และบัตรรับประกันดิจิทัล" : type === "warranty" ? "เงื่อนไขสำหรับการตรวจสอบสิทธิ์และบริการหลังการขายของผลิตภัณฑ์ NEXS" : "ข้อกำหนดสำหรับเว็บไซต์ บัตรรับประกันดิจิทัล และพื้นที่ผู้ใช้งานที่ได้รับอนุญาต";
  return <PageShell><section className="simple-hero policy-hero"><p className="eyebrow slash">NEXS POLICY</p><h1>{title}</h1><p>{intro}</p><small>ปรับปรุงล่าสุด 23 กรกฎาคม 2569</small></section><section className="section policy-content"><div className="policy-summary"><b>สรุปสำคัญ</b><p>ระบบสาธารณะปกปิดข้อมูลส่วนบุคคล การเคลมทุกกรณีต้องผ่านการตรวจสอบ และรายละเอียดของ Serial บน Digital Warranty เป็นข้อมูลอ้างอิงของงานติดตั้งนั้น</p></div>{topics.map(([heading, copy], i) => <article key={heading}><span>{String(i + 1).padStart(2, "0")}</span><h2>{heading}</h2><p>{copy}</p></article>)}<div className="policy-contact"><h2>ต้องการความช่วยเหลือ?</h2><p>ติดต่อ Nexs PPF Co., Ltd. ผ่านหน้า Contact โทร 096-596-4639 หรือ LINE Official @nexslabs</p><div><ArrowLink href="/contact">ติดต่อ NEXS</ArrowLink>{type === "warranty" && <ArrowLink secondary href="/support/warranty">แจ้ง Warranty Support</ArrowLink>}</div></div></section></PageShell>;
}

function ProductDetail({ code }: { code: string }) {
  const all = [...clearTiers, ...matteTiers, ...colorTiers];
  const product = all.find((p) => p.code.toLowerCase() === code.toLowerCase());
  if (!product) notFound();
  return <PageShell><section className={`product-detail-hero tone-${product.tone}`}><div><p className="eyebrow">NEXS {product.code}</p><h1>{product.name}</h1><h2>{product.role}</h2><p>{product.summary}</p><div><ArrowLink href="/contact">ขอคำแนะนำ</ArrowLink><ArrowLink secondary href="/warranty-policy">ดูเงื่อนไข</ArrowLink></div></div><div className="product-detail-roll"><span /></div></section><section className="section detail-facts"><article><span>Warranty</span><b>{product.warranty}</b></article><article><span>Finish</span><b>{product.finish}</b></article><article><span>Ideal Use</span><b>{product.bestFor}</b></article><article><span>Digital Card</span><b>Included</b></article></section><section className="section help-banner"><div><h2>เลือกให้เหมาะกับรถของคุณ</h2><p>Dealer จะช่วยยืนยันรุ่น เงื่อนไข และรูปแบบงานติดตั้งก่อนดำเนินการ</p></div><ArrowLink href="/dealers">Find an Installer</ArrowLink></section></PageShell>;
}
