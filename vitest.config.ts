import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    setupFiles: ['./test/vitest.setup.ts'],
    include: ['apps/api/test/**/*.test.ts', 'apps/api/src/**/*.test.ts', 'packages/domain/test/**/*.test.ts', 'apps/web/src/**/*.test.ts', 'apps/web/src/**/*.test.tsx'],
    exclude: ['apps/web/e2e/**'],
  },
});
