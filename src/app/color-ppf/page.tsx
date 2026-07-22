import { LeadPanel, MarketingHero, ProductTierGrid } from '@/components/marketing/NexsMarketing';
import { getFilmCategory } from '@/content/final-product-content';

export default function ColorPpfPage() {
  const category = getFilmCategory('color');
  return (
    <>
      <MarketingHero
        eyebrow={category.label}
        title={category.heroTitle}
        thaiTitle={category.heroThai}
        subcopy={category.heroSubcopy}
        primaryHref="/contact"
        primaryLabel="Explore Colors"
        secondaryHref="/compare"
        secondaryLabel="Compare Systems"
        tone="color"
        heroImage="/media/nexs-matte-color-hero-v2.png"
        heroImageAlt="Split matte black and purple blue color-shift cars for the NEXS Matte and Color Film Collection hero"
      />
      <ProductTierGrid category={category} />
      <LeadPanel title="Book a Color PPF consultation" />
    </>
  );
}
