import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { defineConfig, devices } from '@playwright/test';

const databasePath = join(tmpdir(), `eclipse-playwright-${randomUUID()}.sqlite`);

export default defineConfig({
  testDir: './apps/web/e2e',
  use: { baseURL: 'http://127.0.0.1:3304', trace: 'retain-on-failure' },
  webServer: [
    { command: `DATABASE_URL=${databasePath} pnpm bootstrap && DATABASE_URL=${databasePath} pnpm seed:demo && VITE_WORKSPACE_RUNTIME_TEST=true pnpm build && DATABASE_URL=${databasePath} APP_ORIGIN=http://127.0.0.1:3304 API_PORT=3304 apps/api/node_modules/.bin/tsx apps/api/src/server.ts`, url: 'http://127.0.0.1:3304/health', reuseExistingServer: false },
  ],
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
