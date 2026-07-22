import Link from 'next/link';

import { FAQ_ITEMS, FILM_CATEGORIES, type FilmCategory } from '@/content/final-product-content';
import { BRAND_STRINGS } from '@/lib/design-tokens';

export function VisualStage({ tone = 'clear' }: { tone?: 'clear' | 'matte' | 'color' | 'carbon' | 'dealer' }) {
  return (
    <div className={`nexs-visual-stage ${tone}`} aria-label="Premium automotive film visual">
      <div className="render-label">NEXS SURFACE VISUAL</div>
      <div className="studio-floor" />
      <div className="light-bar one" />
      <div className="light-bar two" />
      <div className="vehicle-silhouette">
        <span className="roof" />
        <span className="body" />
        <span className="highlight" />
        <span className="wheel left" />
        <span className="wheel right" />
      </div>
      <div className="film-sheet" />
      <div className="red-detail" />
    </div>
  );
}

export function MarketingHero({
  eyebrow,
  title,
  thaiTitle,
  subcopy,
  primaryHref = '/contact',
  primaryLabel = 'Contact NEXS',
  secondaryHref = '/products',
  secondaryLabel = 'Explore Film Systems',
  tone = 'clear',
  heroImage,
  heroImageAlt,
}: {
  eyebrow: string;
  title: string;
  thaiTitle: string;
  subcopy: string;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  tone?: 'clear' | 'matte' | 'color' | 'carbon' | 'dealer';
  heroImage?: string;
  heroImageAlt?: string;
}) {
  return (
    <section className={`nexs-hero premium-hero ${heroImage ? 'asset-hero' : ''}`}>
      {heroImage && (
        <img
          className="nexs-hero-image"
          src={heroImage}
          alt={heroImageAlt ?? 'NEXS premium automotive film hero'}
        />
      )}
      <div className="nexs-hero-copy">
        <p className="eyebrow red-dot">{eyebrow}</p>
        <h1>{title}</h1>
        <h2>{thaiTitle}</h2>
        <p className="lead">{subcopy}</p>
        <div className="actions">
          <Link className="button primary" href={primaryHref}>{primaryLabel}</Link>
          <Link className="button secondary" href={secondaryHref}>{secondaryLabel}</Link>
        </div>
        <div className="nexs-stat-strip hero-trust-bar" aria-label="NEXS highlights">
          <span>{BRAND_STRINGS.tagline}</span>
          <span>Think New. Think NEXS.</span>
          <span>12 Film Options</span>
        </div>
      </div>
      {!heroImage && <VisualStage tone={tone} />}
    </section>
  );
}

export function CategoryOverview() {
  return (
    <section className="section section-tight premium-section">
      <div className="section-head centered-head">
        <div>
          <p className="eyebrow red-dot">12 Film Options</p>
          <h2>Three systems. One NEXS standard.</h2>
        </div>
        <p>Clear, Matte และ Color PPF ถูกจัดวางให้เลือกง่ายขึ้นด้วยพื้นขาว พื้นเงิน และจังหวะข้อมูลแบบ premium automotive technology</p>
      </div>
      <div className="category-system-grid premium-category-grid">
        {FILM_CATEGORIES.map((category) => (
          <Link className={`category-system-card ${category.key}`} href={category.route} key={category.key}>
            <span>{category.options.length} options</span>
            <h3>{category.label}</h3>
            <p>{category.thaiLabel}</p>
            <small>{category.options.map((item) => item.name).join(' / ')}</small>
            <b>Explore system →</b>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function ProductTierGrid({ category }: { category: FilmCategory }) {
  return (
    <section className="section section-tight premium-section">
      <div className="section-head centered-head">
        <div>
          <p className="eyebrow red-dot">{category.label}</p>
          <h2>{category.options.length} Film Options</h2>
        </div>
        <p>{category.heroThai}</p>
      </div>
      <div className={`tier-grid premium-tier-grid count-${category.options.length}`}>
        {category.options.map((option) => (
          <article className={`tier-card premium-tier-card ${option.category}`} key={option.name}>
            <p className="product-badge">{option.badge}</p>
            <h3>{option.name}</h3>
            <p className="tier-position">{option.position}</p>
            <div className="tier-visual-mini" aria-hidden><span /></div>
            <dl>
              {option.thickness && <div><dt>Film</dt><dd>{option.thickness}</dd></div>}
              {option.peelingSupport && <div><dt>Peeling support</dt><dd>{option.peelingSupport}</dd></div>}
              {option.productWarranty && <div><dt>Product warranty</dt><dd>{option.productWarranty}</dd></div>}
              {option.lifetime && <div><dt>Lifetime</dt><dd>{option.lifetime}</dd></div>}
            </dl>
            <p className="tier-note">{option.note}</p>
            <Link className="button secondary" href="/contact">Book Consultation</Link>
          </article>
        ))}
      </div>
    </section>
  );
}

export function ComparisonMatrix() {
  const rows = FILM_CATEGORIES.flatMap((category) => category.options.map((option) => ({ category, option })));
  return (
    <section className="section section-tight premium-section compare-section">
      <div className="section-head centered-head">
        <div>
          <p className="eyebrow red-dot">Compare</p>
          <h2>12 Film Options. No public pricing.</h2>
        </div>
        <p>เปรียบเทียบเฉพาะข้อมูล public-safe เพื่อช่วยเลือกกลุ่มฟิล์มและคุยกับทีม NEXS ได้ชัดเจนขึ้น</p>
      </div>
      <div className="product-comparison-table final-table premium-table">
        <table>
          <thead><tr><th>Product</th><th>System</th><th>Position</th><th>Product Warranty</th><th>Lifetime</th></tr></thead>
          <tbody>
            {rows.map(({ category, option }) => (
              <tr key={`${category.key}-${option.name}`}>
                <th scope="row"><strong>{option.name}</strong><small>{option.badge}</small></th>
                <td>{category.label}</td>
                <td>{option.position}</td>
                <td>{option.productWarranty ?? 'ตามเงื่อนไขรุ่นพิเศษ'}</td>
                <td>{option.lifetime ?? 'ตามเงื่อนไขรุ่นพิเศษ'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function FaqBlock({ limit }: { limit?: number }) {
  const items = typeof limit === 'number' ? FAQ_ITEMS.slice(0, limit) : FAQ_ITEMS;
  return (
    <section className="section section-tight premium-section">
      <div className="faq-list-preview full premium-faq-list">
        {items.map((item) => (
          <article className="faq-row premium-faq-row" key={item.question}>
            <h3>{item.question}</h3>
            <p>{item.answer}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function LeadPanel({ title = 'Talk to NEXS' }: { title?: string }) {
  return (
    <section className="section section-tight premium-section">
      <div className="lead-panel premium-lead-panel">
        <div>
          <p className="eyebrow red-dot">LINE / Facebook / Instagram / TikTok / YouTube: nexsppf</p>
          <h2>{title}</h2>
          <p>ส่งข้อมูลให้ทีมงานติดต่อกลับ เพื่อแนะนำรุ่น ฟิล์มที่เหมาะกับรถ และตัวแทนจำหน่ายที่เหมาะสม</p>
        </div>
        <Link className="button primary" href="/contact">Contact NEXS</Link>
      </div>
    </section>
  );
}
