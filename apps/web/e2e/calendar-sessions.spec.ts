import { expect, test } from '@playwright/test';

test('SPEC-0018 keeps calendar setup and real-session controls in the private workspace', async ({ page }) => {
  const login = await page.request.post('/api/v1/auth/session', { data: { email: 'teacher@example.test', password: 'change-me-in-development' } });
  expect(login.status()).toBe(204);
  const cookie = login.headers()['set-cookie']?.split(';')[0]; const headers = cookie ? { cookie } : undefined;
  const today = new Date(); const yearNumber = today.getUTCFullYear();
  const year = await page.request.post('/api/v1/academic-years', { headers, data: { label: `Calendar ${Date.now()}`, startsOn: `${yearNumber}-01-01`, endsOn: `${yearNumber}-12-31` } });
  expect(year.status()).toBe(200); const yearId = (await year.json()).id as string;
  const group = await page.request.post(`/api/v1/academic-years/${yearId}/groups`, { headers, data: { name: 'Calendar group' } });
  expect(group.status()).toBe(200); const groupId = (await group.json()).id as string;

  await page.goto(`/#/workspace?year=${yearId}&group=${groupId}`);
  if (await page.getByLabel('Email').count()) { await page.getByLabel('Email').fill('teacher@example.test'); await page.getByLabel('Password').fill('change-me-in-development'); await page.getByRole('button', { name: 'Sign in' }).click(); }
  await expect(page.getByRole('heading', { name: 'Classroom workspace' })).toBeVisible();
  await expect(page.getByLabel('T1 starts')).toBeVisible(); await expect(page.getByLabel('T2 starts')).toBeVisible(); await expect(page.getByLabel('T3 starts')).toBeVisible();
  await page.getByRole('button', { name: 'Save calendar' }).click();
  await expect(page.getByText('Calendar saved.')).toBeVisible();

  const weekday = today.getUTCDay() || 7;
  const configured = await page.request.put(`/api/v1/academic-years/${yearId}/calendar`, { headers, data: { timezone: 'UTC', terms: [{ code: 'T1', startsOn: `${yearNumber}-01-01`, endsOn: `${yearNumber}-04-30` }, { code: 'T2', startsOn: `${yearNumber}-05-01`, endsOn: `${yearNumber}-08-31` }, { code: 'T3', startsOn: `${yearNumber}-09-01`, endsOn: `${yearNumber}-12-31` }], holidays: [], slots: [{ groupId, weekday, startsAt: '00:00', endsAt: '23:59' }] } });
  expect(configured.status()).toBe(200);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Comenzar clase' })).toBeEnabled();
  await page.getByRole('button', { name: 'Comenzar clase' }).click();
  await expect(page.getByRole('button', { name: 'Finalizar clase' })).toBeVisible();
  await page.getByRole('button', { name: 'Finalizar clase' }).click();
  await expect(page.getByRole('button', { name: 'Comenzar clase' })).toBeDisabled();
  await expect(page.locator('body')).not.toContainText(/real name|rubric|RT average/i);
});
