import { expect, test } from '@playwright/test';

const demoYearId = '9b6f3b9e-3d0f-4b1e-9b1e-202620270001';
const demoGroupId = '9b6f3b9e-3d0f-4b1e-9b1e-202620270002';

test('teacher can sign in and open the Home command center without private data', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Email').fill('teacher@example.test');
  await page.getByLabel('Password').fill('change-me-in-development');
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page.getByRole('heading', { name: 'Home / Command Center' })).toBeVisible();
  await expect(page.locator('.home-header').getByRole('link', { name: 'Open Classroom Preview' })).toBeVisible();
  await expect(page.locator('[data-testid="projection-card"]')).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText(/Private Name|RT average|rubric|comments|incidents|history/i);
  expect(new URL(page.url()).pathname).toBe('/');
  expect(new URL(page.url()).search).toBe('');
  expect(new URL(page.url()).hash).toMatch(/^#\/\?year=[0-9a-f-]+&group=[0-9a-f-]+$/i);
  await expect.poll(() => page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length }))).toEqual({ local: 0, session: 0 });
});

test('projection remains a separately labelled fixture handoff without private route state', async ({ page }) => {
  await page.goto(`/#/workspace?year=${demoYearId}&group=${demoGroupId}`);
  await page.getByLabel('Email').fill('teacher@example.test');
  await page.getByLabel('Password').fill('change-me-in-development');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: 'Classroom workspace' })).toBeVisible();
  await expect(page.getByLabel('Search students')).toBeVisible();

  const handoff = page.getByRole('link', { name: 'Open Classroom Preview' });
  await expect(handoff).toHaveAttribute('href', /^\/#\/projection(?:\?group=.*)?$/);
  await handoff.click();

  await expect(page.getByRole('heading', { name: 'French Only' })).toBeVisible();
  expect(new URL(page.url()).pathname).toBe('/');
  expect(new URL(page.url()).search).toBe('');
  expect(new URL(page.url()).hash).toMatch(/^#\/projection(?:\?group=.*)?$/);
  await expect(page.locator('body')).toContainText('12 / 20');
  await expect(page.locator('body')).not.toContainText(/teacher@example|Private Name|Ada Lovelace|RT average|rubric|comments|incidents|history/i);
  expect(await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length }))).toEqual({ local: 0, session: 0 });
});

test('failed explicit Projection shows safe recovery without teacher fallback', async ({ page }) => {
  let projectionRequests = 0;
  await page.route('**/api/v1/projection/groups/*/display', async (route) => {
    projectionRequests += 1;
    await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'unavailable' }) });
  });

  await page.goto('/#/projection');
  await expect(page.getByRole('alert')).toHaveText('Classroom display is unavailable.');
  await expect(page.locator('[data-testid="projection-card"]')).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText(/Private Name|Ada Lovelace|RT average|rubric|comments|incidents|history/i);
  await expect.poll(() => projectionRequests).toBeGreaterThan(0);
});
