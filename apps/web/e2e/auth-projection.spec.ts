import { expect, test } from '@playwright/test';

test('teacher can sign in and view only classroom-safe projection data', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Email').fill('teacher@example.test');
  await page.getByLabel('Password').fill('change-me-in-development');
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page.getByRole('heading', { name: 'Classroom signal' })).toBeVisible();
  await expect(page.getByText('Demo Student')).toBeVisible();
  await expect(page.locator('[data-testid="projection-card"]')).toContainText('Communication');
  await expect(page.locator('body')).not.toContainText(/Private Name|RT average|rubric|comments|incidents|history/i);
  expect(new URL(page.url()).pathname).toBe('/');
  expect(new URL(page.url()).search).toBe('');
  expect(new URL(page.url()).hash).toBe('');
  await expect.poll(() => page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length }))).toEqual({ local: 0, session: 0 });
});

test('projection remains a separately labelled fixture handoff without private route state', async ({ page }) => {
  await page.goto('/#/workspace');
  await page.getByLabel('Email').fill('teacher@example.test');
  await page.getByLabel('Password').fill('change-me-in-development');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: 'Classroom workspace' })).toBeVisible();
  await expect(page.getByLabel('Search students')).toBeVisible();

  const handoff = page.getByRole('link', { name: 'Open separate fixture Projection' });
  await expect(handoff).toHaveAttribute('href', '/');
  await handoff.click();

  await expect(page.getByRole('heading', { name: 'Classroom signal' })).toBeVisible();
  expect(new URL(page.url()).pathname).toBe('/');
  expect(new URL(page.url()).search).toBe('');
  expect(new URL(page.url()).hash).toBe('');
  await expect(page.locator('body')).toContainText('Demo Student');
  await expect(page.locator('body')).not.toContainText(/teacher@example|Private Name|Ada Lovelace|RT average|rubric|comments|incidents|history/i);
  expect(await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length }))).toEqual({ local: 0, session: 0 });
});

test('failed root Projection shows safe recovery without teacher fallback', async ({ page }) => {
  let projectionRequests = 0;
  await page.route('**/api/v1/projection/groups/*/students', async (route) => {
    projectionRequests += 1;
    if (projectionRequests === 1) {
      await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'unavailable' }) });
      return;
    }
    await route.continue();
  });

  await page.goto('/');
  await expect(page.getByRole('alert')).toHaveText('Projection unavailable.');
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  await expect(page.locator('[data-testid="projection-card"]')).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText(/Private Name|Ada Lovelace|RT average|rubric|comments|incidents|history/i);
  await expect.poll(() => projectionRequests).toBeGreaterThan(0);
});
