import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FOOTER_NAV_ITEMS, PRIMARY_NAV_ITEMS } from '../src/content/navigation';

const repoRoot = process.cwd();
const readRepoFile = (relativePath: string) => readFileSync(join(repoRoot, relativePath), 'utf8');

describe('NEXS master brief production-readiness guardrails', () => {
  it('implements the required Standard page and makes it discoverable', () => {
    expect(existsSync(join(repoRoot, 'src/app/standard/page.tsx'))).toBe(true);
    expect(PRIMARY_NAV_ITEMS.map((item) => item.href)).toContain('/standard');
    expect(FOOTER_NAV_ITEMS.map((item) => item.href)).toContain('/standard');
  });

  it('uses the exact approved hero assets for home and product collection heroes', () => {
    const requiredAssets = [
      'public/media/nexs-home-hero-v2.png',
      'public/media/nexs-clear-ppf-hero-v2.png',
      'public/media/nexs-matte-color-hero-v2.png',
      'public/media/nexs-about-hero-v2.png',
    ];

    for (const relativePath of requiredAssets) {
      expect(existsSync(join(repoRoot, relativePath)), `${relativePath} must exist`).toBe(true);
    }

    expect(readRepoFile('src/app/page.tsx')).toContain('/media/nexs-home-hero-v2.png');
    expect(readRepoFile('src/app/clear-ppf/page.tsx')).toContain('/media/nexs-clear-ppf-hero-v2.png');
    expect(readRepoFile('src/app/matte-ppf/page.tsx')).toContain('/media/nexs-matte-color-hero-v2.png');
    expect(readRepoFile('src/app/color-ppf/page.tsx')).toContain('/media/nexs-matte-color-hero-v2.png');
    expect(readRepoFile('src/app/about-nexs/page.tsx')).toContain('/media/nexs-about-hero-v2.png');

    const heroComponent = readRepoFile('src/components/marketing/NexsMarketing.tsx');
    expect(heroComponent).toContain('nexs-hero-image');
    expect(heroComponent).toContain('{!heroImage && <VisualStage');
  });

  it('does not expose fake success, demo-only warranty search, or placeholder visual copy on public source routes', () => {
    const publicSources = [
      'src/app/warranty/page.tsx',
      'src/app/r/[serial]/page.tsx',
      'src/app/support/warranty/page.tsx',
      'src/app/support/inspection/page.tsx',
      'src/app/contact/page.tsx',
      'src/components/marketing/NexsMarketing.tsx',
    ];

    const blocked = [
      'ดูตัวอย่าง',
      'setSubmitted(true)',
      'Authentication will be wired up by the back-end team',
      'AI RENDER PLACEHOLDER',
      'แนบในขั้นตอนต่อไป',
    ];

    for (const relativePath of publicSources) {
      const content = readRepoFile(relativePath);
      for (const term of blocked) {
        expect(content, `${relativePath} must not expose ${term}`).not.toContain(term);
      }
    }
  });

  it('adds real support and inspection API routes with durable request references', () => {
    const supportRoute = readRepoFile('src/app/api/support/warranty/route.ts');
    const inspectionRoute = readRepoFile('src/app/api/support/inspection/route.ts');
    const requestStore = readRepoFile('src/lib/support-request-store.ts');

    expect(supportRoute).toContain('createSupportRequest');
    expect(inspectionRoute).toContain('createInspectionRequest');
    expect(requestStore).toContain('referenceNumber');
    expect(requestStore).toContain('appendFile');
    expect(requestStore).toContain('private');
    expect(requestStore).toContain('pending_review');
    expect(requestStore).not.toContain('localStorage');
  });

  it('does not mark arbitrary QR serials active by prefix-only classification', () => {
    const cardPage = readRepoFile('src/app/r/[serial]/page.tsx');

    expect(cardPage).not.toContain("return 'active';");
    expect(cardPage).toContain('expired');
    expect(cardPage).toContain('under-review');
    expect(cardPage).toContain('not-found');
  });
});
