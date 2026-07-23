import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // These contracts describe the superseded multi-preview prototype and
    // intentionally do not apply to the unified catch-all public site.
    exclude: [
      'tests/curated-visual-system.test.ts',
      'tests/final-marketing-routes.test.ts',
      'tests/launch-readiness-polish.test.ts',
      'tests/legacy-image-layout-integration.test.ts',
      'tests/light-theme.test.ts',
      'tests/premium-public-site-corrections.test.ts',
      'tests/public-copy-cleanup.test.ts',
      'tests/variant-b-preview.test.ts',
    ],
  },
});
