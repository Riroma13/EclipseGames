import { expect, test } from '@playwright/test';

test('SPEC-0004 private XP flow registers authoritative bonus and exposes correction only in teacher workspace', async ({ page }) => {
  const login = await page.request.post('/api/v1/auth/session', { data: { email: 'teacher@example.test', password: 'change-me-in-development' } });
  expect(login.status()).toBe(204);
  const cookie = login.headers()['set-cookie']?.split(';')[0]; const headers = cookie ? { cookie } : undefined;
  const year = await page.request.post('/api/v1/academic-years', { headers, data: { label: `XP ${Date.now()}`, startsOn: '1900-09-01', endsOn: '1901-07-01' } }); const yearId = (await year.json()).id;
  const group = await page.request.post(`/api/v1/academic-years/${yearId}/groups`, { headers, data: { name: 'XP group' } }); const groupId = (await group.json()).id;
  const roster = await page.request.post(`/api/v1/groups/${groupId}/students`, { headers, data: { students: [{ realName: 'XP Student', alias: 'XP', avatar: 'default', specialty: 'Leader' }] } }); const studentId = (await roster.json())[0].id;
  await page.goto('/#/workspace'); if (await page.getByLabel('Email').count()) { await page.getByLabel('Email').fill('teacher@example.test'); await page.getByLabel('Password').fill('change-me-in-development'); await page.getByRole('button', { name: 'Sign in' }).click(); }
  await page.goto(`/#/workspace?year=${yearId}&group=${groupId}`); await page.getByLabel('Academic year').selectOption(yearId); await page.getByRole('button', { name: /XP Student/ }).click();
  await page.getByRole('button', { name: 'COMMUNICATION' }).click(); await page.getByRole('button', { name: '+3' }).click();
  await expect(page.getByText(/Base XP \+3 · Specialty bonus \+1 · Effective XP \+4/)).toBeVisible();
  await expect(page.getByText('Annual XP: 4 · Level 1')).toBeVisible(); await expect(page.getByRole('button', { name: 'Undo' })).toBeVisible();
  await expect(page.locator('body')).not.toContainText('XP category breakdown');
  expect(studentId).toBeTruthy();
});
