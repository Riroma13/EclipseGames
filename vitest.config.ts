import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['apps/api/test/**/*.test.ts', 'packages/domain/test/**/*.test.ts', 'apps/web/src/**/*.test.ts'],
    exclude: ['apps/web/e2e/**'],
  },
});
