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
});
