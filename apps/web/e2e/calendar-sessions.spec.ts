import { expect, test } from '@playwright/test';

test('SPEC-0021 saves numeric RT during an active session and leaves ended RT read-only', async ({ page }) => {
  const login = await page.request.post('/api/v1/auth/session', { data: { email: 'teacher@example.test', password: 'change-me-in-development' } });
  expect(login.status()).toBe(204);
  const cookie = login.headers()['set-cookie']?.split(';')[0]; const headers = cookie ? { cookie } : undefined;
  const today = new Date(); const yearNumber = today.getUTCFullYear();
  const year = await page.request.post('/api/v1/academic-years', { headers, data: { label: `Calendar ${Date.now()}`, startsOn: `${yearNumber}-01-01`, endsOn: `${yearNumber}-12-31` } });
  expect(year.status()).toBe(200); const yearId = (await year.json()).id as string;
  const group = await page.request.post(`/api/v1/academic-years/${yearId}/groups`, { headers, data: { name: 'Calendar group' } });
  expect(group.status()).toBe(200); const groupId = (await group.json()).id as string;
  const students = await page.request.post(`/api/v1/groups/${groupId}/students`, { headers, data: { students: [{ realName: 'Private One', alias: 'One' }, { realName: 'Private Two', alias: 'Two' }, { realName: 'Private Three', alias: 'Three' }, { realName: 'Private Four', alias: 'Four' }] } });
  expect(students.status()).toBe(200);
  const studentIds = (await students.json()) as Array<{ id: string; alias: string }>;

  await page.goto(`/#/workspace?year=${yearId}&group=${groupId}`);
  if (await page.getByLabel('Email').count()) { await page.getByLabel('Email').fill('teacher@example.test'); await page.getByLabel('Password').fill('change-me-in-development'); await page.getByRole('button', { name: 'Sign in' }).click(); }
  await expect(page.getByRole('heading', { name: 'Classroom workspace' })).toBeVisible();
  const weekday = today.getUTCDay() || 7;
  const start = new Date(today.getTime() - 10 * 60_000); const end = new Date(today.getTime() + 10 * 60_000);
  const hhmm = (date: Date) => `${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}`;
  await page.getByLabel('Timezone').fill('UTC');
  await page.getByLabel('Weekday for period 1').selectOption(String(weekday));
  await page.getByLabel('Starts').last().fill(hhmm(start)); await page.getByLabel('Ends').last().fill(hhmm(end));
  await page.getByRole('button', { name: 'Save calendar' }).click();
  await expect(page.getByText('Calendar saved.')).toBeVisible();
  await page.getByRole('button', { name: 'Comenzar clase' }).click();
  await expect(page.getByRole('button', { name: 'Finalizar clase' })).toBeVisible();
  const activeStatus = await page.request.get(`/api/v1/groups/${groupId}/real-class-session-status?academicYearId=${yearId}`, { headers });
  expect(activeStatus.status()).toBe(200);
  const sessionId = ((await activeStatus.json()).active as { id: string }).id;
  const numericPost = page.waitForRequest(request => request.method() === 'POST' && request.url().includes('/rt-entries'));
  await page.getByLabel('RT for One').selectOption('10');
  const numericRequest = await numericPost;
  expect(JSON.parse(numericRequest.postData() ?? '{}').entries[0].value).toBe(10);
  for (const [alias, value] of [['Two', '5'], ['Three', '0'], ['Four', 'Ausente']] as const) await page.getByLabel(`RT for ${alias}`).selectOption(value === 'Ausente' ? 'ABSENT' : value);
  const persisted = await page.request.get(`/api/v1/real-class-sessions/${sessionId}/rt-entries`, { headers });
  expect(persisted.status()).toBe(200);
  expect((await persisted.json()).entries.find((entry: { studentId: string }) => entry.studentId === studentIds[0].id).value).toBe(10);
  await page.getByRole('button', { name: 'Finalizar clase' }).click();
  await expect(page.getByText('Read-only — class ended')).toBeVisible();
  await expect(page.getByLabel('RT for One')).toHaveValue('10'); await expect(page.getByLabel('RT for Two')).toHaveValue('5'); await expect(page.getByLabel('RT for Three')).toHaveValue('0'); await expect(page.getByLabel('RT for Four')).toHaveValue('ABSENT');
  await expect(page.getByLabel('RT for One')).toBeDisabled(); await expect(page.getByText('Retry RT')).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText(/real name|rubric|RT average/i);
});
