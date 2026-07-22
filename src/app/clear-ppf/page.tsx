import { LeadPanel, MarketingHero, ProductTierGrid } from '@/components/marketing/NexsMarketing';
import { getFilmCategory } from '@/content/final-product-content';

export default function ClearPpfPage() {
  const category = getFilmCategory('clear');
  return (
    <>
      <MarketingHero
        eyebrow={category.label}
        title={category.heroTitle}
        thaiTitle={category.heroThai}
        subcopy={category.heroSubcopy}
        primaryHref="/compare"
        primaryLabel="Compare All Models"
        secondaryHref="/contact"
        secondaryLabel="Book Consultation"
        tone="clear"
        heroImage="/media/nexs-clear-ppf-hero-v2.png"
        heroImageAlt="Silver front three-quarter car for the NEXS Clear PPF Collection hero"
      />
      <ProductTierGrid category={category} />
      <LeadPanel title="Book a Clear PPF consultation" />
    </>
  );
}
