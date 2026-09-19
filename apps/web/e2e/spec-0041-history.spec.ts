import { expect, test, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import type { HistoryPageDto } from '@eclipse/contracts';

const credentials = { email: 'teacher@example.test', password: 'change-me-in-development' };

async function closeActiveClassSessions(page: Page) {
  const login = await page.request.post('/api/v1/auth/session', { data: credentials });
  expect(login.status()).toBe(204);
  const cookie = login.headers()['set-cookie']?.split(';')[0];
  const headers = cookie ? { cookie } : undefined;
  const years = await page.request.get('/api/v1/academic-years?includeArchived=true', { headers });
  expect(years.status()).toBe(200);
  for (const year of await years.json() as Array<{ id: string }>) {
    const groups = await page.request.get(`/api/v1/academic-years/${year.id}/groups?includeArchived=true`, { headers });
    expect(groups.status()).toBe(200);
    for (const group of await groups.json() as Array<{ id: string }>) {
      const status = await page.request.get(`/api/v1/groups/${group.id}/real-class-session-status?academicYearId=${year.id}`, { headers });
      expect(status.status()).toBe(200);
      const active = (await status.json()).active as { id: string } | null;
      if (active) {
        const ended = await page.request.post(`/api/v1/real-class-sessions/${active.id}/end`, { headers: { ...headers, 'Idempotency-Key': randomUUID() }, data: {} });
        expect([200, 201]).toContain(ended.status());
      }
    }
  }
  return headers;
}

async function seedHistoryFixture(page: Page) {
  const login = await page.request.post('/api/v1/auth/session', { data: credentials });
  expect(login.status()).toBe(204);
  const cookie = login.headers()['set-cookie']?.split(';')[0];
  const headers = cookie ? { cookie } : undefined;
  const runtimeDate = new Date();
  const yearNumber = runtimeDate.getUTCFullYear();
  const yearResponse = await page.request.post('/api/v1/academic-years', { headers, data: { label: `History E2E ${Date.now()}`, startsOn: `${yearNumber}-01-01`, endsOn: `${yearNumber}-12-31` } });
  expect(yearResponse.status()).toBe(200);
  const year = await yearResponse.json() as { id: string };
  const groupResponse = await page.request.post(`/api/v1/academic-years/${year.id}/groups`, { headers, data: { name: 'Private history group' } });
  expect(groupResponse.status()).toBe(200);
  const group = await groupResponse.json() as { id: string };
  const studentsResponse = await page.request.post(`/api/v1/groups/${group.id}/students`, { headers, data: { students: [{ realName: 'History Private One', alias: 'History One' }, { realName: 'History Private Two', alias: 'History Two' }] } });
  expect(studentsResponse.status()).toBe(200);
  const students = await studentsResponse.json() as Array<{ id: string; alias: string }>;
  const weekday = runtimeDate.getUTCDay() || 7;
  const dateOnly = (month: number, day: number) => `${yearNumber}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const calendarResponse = await page.request.put(`/api/v1/academic-years/${year.id}/calendar`, { headers, data: { timezone: 'UTC', terms: [{ code: 'T1', startsOn: dateOnly(1, 1), endsOn: dateOnly(4, 30) }, { code: 'T2', startsOn: dateOnly(5, 1), endsOn: dateOnly(8, 31) }, { code: 'T3', startsOn: dateOnly(9, 1), endsOn: dateOnly(12, 31) }], holidays: [], slots: [{ groupId: group.id, weekday, startsAt: '00:00', endsAt: '23:59' }] } });
  expect(calendarResponse.status()).toBe(200);
  const term = (await calendarResponse.json() as { terms: Array<{ id: string }> }).terms[2];
  const persistedCalendar = await page.request.get(`/api/v1/academic-years/${year.id}/calendar`, { headers });
  expect(persistedCalendar.status()).toBe(200);
  expect((await persistedCalendar.json() as { slots: Array<{ groupId: string; weekday: number }> }).slots).toEqual([
    expect.objectContaining({ groupId: group.id, weekday }),
  ]);
  const sessionHeaders = await closeActiveClassSessions(page);
  const sessionStatus = await page.request.get(`/api/v1/groups/${group.id}/real-class-session-status?academicYearId=${year.id}`, { headers: sessionHeaders });
  expect(sessionStatus.status()).toBe(200);
  expect((await sessionStatus.json()).active, 'Inconsistent session cleanup: the SPEC-0041 group still has an active session.').toBeNull();
  const startSession = await page.request.post(`/api/v1/groups/${group.id}/real-class-sessions/start`, { headers: { ...sessionHeaders, 'Idempotency-Key': randomUUID() }, data: { academicYearId: year.id } });
  expect([200, 201]).toContain(startSession.status());
  const session = await startSession.json() as { id: string };
  const xpIds: string[] = [];
  for (let index = 0; index < 28; index += 1) {
    const response = await page.request.post(`/api/v1/students/${students[0].id}/xp-evidence`, { headers: { ...headers, 'Idempotency-Key': randomUUID() }, data: { category: 'COMMUNICATION', baseXp: 1 } });
    expect([200, 201]).toContain(response.status());
    xpIds.push((await response.json() as { event: { id: string } }).event.id);
  }
  const reversal = await page.request.post(`/api/v1/xp-evidence/${xpIds[xpIds.length - 1]}/reversal`, { headers: { ...headers, 'Idempotency-Key': randomUUID() }, data: {} });
  expect([200, 201]).toContain(reversal.status());
  const rt = await page.request.post(`/api/v1/real-class-sessions/${session.id}/rt-entries`, { headers: { ...headers, 'Idempotency-Key': randomUUID() }, data: { entries: [{ studentId: students[0].id, value: 'ABSENT' }, { studentId: students[1].id, value: 5 }] } });
  expect([200, 201]).toContain(rt.status());
  const endSession = await page.request.post(`/api/v1/real-class-sessions/${session.id}/end`, { headers: { ...headers, 'Idempotency-Key': randomUUID() }, data: {} });
  expect([200, 201]).toContain(endSession.status());
  return { headers, yearId: year.id, groupId: group.id, studentId: students[0].id, termId: term.id };
}

async function signInIfNeeded(page: Page, url: string) {
  await page.goto(url);
  if (await page.getByLabel('Email').count()) {
    await page.getByLabel('Email').fill(credentials.email);
    await page.getByLabel('Password').fill(credentials.password);
    await page.getByRole('button', { name: 'Sign in' }).click();
  }
  await expect(page.getByRole('heading', { name: 'Classroom workspace' })).toBeVisible();
}

function expectNoHistoryFields(payload: unknown) {
  const leaked: string[] = [];
  const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  const isHistoryPage = (value: unknown) => isRecord(value)
    && Array.isArray(value.items)
    && ('nextCursor' in value)
    && (value.nextCursor === null || typeof value.nextCursor === 'string');
  const isHistoryItem = (value: unknown) => isRecord(value)
    && ['id', 'family', 'kind', 'occurredAt', 'student', 'termId', 'sessionId', 'title', 'summary', 'facts', 'correction'].every(key => key in value);
  const visit = (value: unknown, path: string) => {
    if (Array.isArray(value)) {
      value.forEach((item, index) => visit(item, `${path}[${index}]`));
      return;
    }
    if (!isRecord(value)) return;
    if (isHistoryPage(value) || isHistoryItem(value)) leaked.push(path);
    for (const [key, child] of Object.entries(value)) {
      visit(child, `${path}.${key}`);
    }
  };
  visit(payload, 'payload');
  expect(leaked, 'Projection/Show Student payload exposed History fields.').toEqual([]);
}

test('SPEC-0041 teacher-private history journey uses server filters, current corrections, cursor pages, deep links, and archived read-only records', async ({ page }) => {
  const fixture = await seedHistoryFixture(page);
  const baseUrl = `/#/workspace?year=${fixture.yearId}&group=${fixture.groupId}`;
  await signInIfNeeded(page, baseUrl);
  const history = page.locator('.history-panel');
  await expect(history.getByRole('heading', { name: 'Historial' })).toBeVisible();
  const initialItems = history.locator('.history-item');
  await expect(initialItems.first()).toBeVisible();

  const xpFilterResponse = page.waitForResponse(response => response.url().includes(`/api/v1/groups/${fixture.groupId}/history`) && response.url().includes('family=XP') && response.status() === 200);
  await history.getByLabel('Familia').selectOption('XP');
  const xpPage = await (await xpFilterResponse).json() as HistoryPageDto;
  await expect(history.locator('.history-family')).toHaveText(Array.from({ length: xpPage.items.length }, () => 'XP'));
  expect(xpPage.items.some(item => item.kind === 'REVERSED' && item.correction?.state === 'REVERSED')).toBe(true);
  expect(xpPage.items.filter(item => item.kind === 'REVERSED')).toHaveLength(1);
  expect(xpPage.items.every(item => item.family === 'XP')).toBe(true);

  const termFilterResponse = page.waitForResponse(response => response.url().includes(`/api/v1/groups/${fixture.groupId}/history`) && response.url().includes(`termId=${fixture.termId}`) && response.status() === 200);
  await history.getByRole('button', { name: 'Restablecer' }).click();
  await history.getByLabel('Curso').selectOption(fixture.termId);
  const termPage = await (await termFilterResponse).json() as { items: Array<{ family: string }> };
  expect(termPage.items.length).toBeGreaterThan(0);
  await expect(history.locator('.history-family')).not.toHaveText(Array.from({ length: termPage.items.length }, () => 'XP'));
  await history.getByLabel('Estudiante').selectOption(fixture.studentId);

  await history.getByRole('button', { name: 'Restablecer' }).click();
  const firstPage = page.waitForResponse(response => response.url().includes(`/api/v1/groups/${fixture.groupId}/history`) && response.url().includes('limit=25') && !response.url().includes('cursor=') && response.status() === 200).then(async response => {
    expect(response.status()).toBe(200);
    return await response.json() as { items: Array<{ id: string }>; nextCursor: string | null };
  });
  await Promise.all([page.reload(), firstPage]);
  const firstPageResult = await firstPage;
  expect(firstPageResult.nextCursor).toBeTruthy();
  await expect(history.getByRole('button', { name: 'Cargar más' })).toBeVisible();
  const moreResponse = page.waitForResponse(response => response.url().includes(`/api/v1/groups/${fixture.groupId}/history`) && response.url().includes('cursor=') && response.status() === 200);
  await history.getByRole('button', { name: 'Cargar más' }).click();
  const morePage = await (await moreResponse).json() as { items: Array<{ id: string }>; nextCursor: string | null };
  const firstIds = new Set(firstPageResult.items.map(item => item.id));
  expect(morePage.items.every(item => !firstIds.has(item.id))).toBe(true);
  await expect(history.locator('.history-item')).toHaveCount(firstPageResult.items.length + morePage.items.length);

  const deepLinkResponse = page.waitForResponse(response => response.url().includes(`/api/v1/groups/${fixture.groupId}/history`) && response.url().includes('family=XP') && response.status() === 200);
  await history.getByLabel('Familia').selectOption('XP');
  await deepLinkResponse;
  await history.getByLabel('Estudiante').selectOption(fixture.studentId);
  const deepLink = page.url();
  expect(deepLink).toContain('historyFamily=XP');
  expect(deepLink).toContain(`historyStudent=${fixture.studentId}`);
  await page.reload();
  await expect(history.getByLabel('Familia')).toHaveValue('XP');
  await expect(history.getByLabel('Estudiante')).toHaveValue(fixture.studentId);

  const cards = await page.request.get(`/api/v1/teacher/groups/${fixture.groupId}/classroom-cards?academicYearId=${fixture.yearId}`);
  expect(cards.status()).toBe(200);
  expectNoHistoryFields(await cards.json());
  const showStudent = await page.request.post(`/api/v1/teacher/groups/${fixture.groupId}/show-student`, { headers: { ...fixture.headers, 'Idempotency-Key': randomUUID() }, data: { studentId: fixture.studentId } });
  expect(showStudent.status()).toBe(201);
  expectNoHistoryFields(await showStudent.json());

  const archive = await page.request.post(`/api/v1/academic-years/${fixture.yearId}/archive`, { headers: fixture.headers });
  expect(archive.status()).toBe(204);
  await signInIfNeeded(page, baseUrl);
  const archivedHistory = page.locator('.history-panel');
  await expect(archivedHistory.getByText('El historial es de solo lectura. Los registros archivados permanecen visibles.')).toBeVisible();
  await expect(archivedHistory.locator('.history-item').first()).toBeVisible();
  await expect(archivedHistory.getByRole('button').filter({ hasText: /guardar|corregir|revertir|eliminar|archivar/i })).toHaveCount(0);
});
