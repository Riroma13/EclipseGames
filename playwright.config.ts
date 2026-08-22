import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './apps/web/e2e',
  use: { baseURL: 'http://127.0.0.1:3304', trace: 'retain-on-failure' },
  webServer: [
    { command: 'DATABASE_URL=/tmp/eclipse-playwright.sqlite pnpm bootstrap && VITE_WORKSPACE_RUNTIME_TEST=true pnpm build && DATABASE_URL=/tmp/eclipse-playwright.sqlite APP_ORIGIN=http://127.0.0.1:3304 API_PORT=3304 apps/api/node_modules/.bin/tsx apps/api/src/server.ts', url: 'http://127.0.0.1:3304/health', reuseExistingServer: true },
  ],
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
