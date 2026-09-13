import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { defineConfig, devices } from '@playwright/test';

const databasePath = join(tmpdir(), `eclipse-playwright-${randomUUID()}.sqlite`);
const port = process.env.PLAYWRIGHT_PORT ?? '3304';

export default defineConfig({
  testDir: './apps/web/e2e',
  use: { baseURL: `http://127.0.0.1:${port}`, trace: 'retain-on-failure' },
  webServer: [
    { command: `DATABASE_URL=${databasePath} pnpm bootstrap && DATABASE_URL=${databasePath} pnpm seed:demo && VITE_WORKSPACE_RUNTIME_TEST=true pnpm build && DATABASE_URL=${databasePath} APP_ORIGIN=http://127.0.0.1:${port} API_PORT=${port} apps/api/node_modules/.bin/tsx apps/api/src/server.ts`, env: { GEM_CURSOR_KEYS: 'test-key-A:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' }, url: `http://127.0.0.1:${port}/health`, reuseExistingServer: false },
  ],
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
