export type NavItem = {
  label: string;
  href: string;
  isSecondary?: boolean;
};

export const PRIMARY_NAV_ITEMS: readonly NavItem[] = [
  { label: 'Film Systems', href: '/products' },
  { label: 'Clear', href: '/clear-ppf' },
  { label: 'Matte', href: '/matte-ppf' },
  { label: 'Color', href: '/color-ppf' },
  { label: 'Compare', href: '/compare' },
  { label: 'Standard', href: '/standard' },
  { label: 'Dealers', href: '/for-dealers' },
  { label: 'Contact', href: '/contact' },
  { label: 'Dealer Login', href: '/login', isSecondary: true },
] as const;

export const FOOTER_NAV_ITEMS: readonly NavItem[] = [
  { label: 'Clear PPF', href: '/clear-ppf' },
  { label: 'Matte PPF', href: '/matte-ppf' },
  { label: 'Color PPF', href: '/color-ppf' },
  { label: 'Compare', href: '/compare' },
  { label: 'Technology', href: '/technology' },
  { label: 'Standard', href: '/standard' },
  { label: 'About NEXS', href: '/about-nexs' },
  { label: 'FAQ', href: '/faq' },
  { label: 'บัตรรับประกัน', href: '/warranty' },
  { label: 'Support', href: '/support/warranty' },
  { label: 'Inspection', href: '/support/inspection' },
  { label: 'ตัวแทนจำหน่าย', href: '/for-dealers' },
  { label: 'ติดต่อเรา', href: '/contact' },
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Warranty Policy', href: '/warranty-policy' },
  { label: 'Dealer Login', href: '/login' },
] as const;
