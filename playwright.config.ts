import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './apps/web/e2e',
  use: { baseURL: 'http://127.0.0.1:5173', trace: 'retain-on-failure' },
  webServer: [
    { command: 'DATABASE_URL=/tmp/eclipse-playwright.sqlite pnpm bootstrap && DATABASE_URL=/tmp/eclipse-playwright.sqlite APP_ORIGIN=http://127.0.0.1:5173 API_PORT=3304 pnpm --filter @eclipse/api dev', url: 'http://127.0.0.1:3304/health', reuseExistingServer: true },
    { command: 'API_ORIGIN=http://127.0.0.1:3304 pnpm --filter @eclipse/web dev --host 127.0.0.1', url: 'http://127.0.0.1:5173', reuseExistingServer: true },
  ],
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
