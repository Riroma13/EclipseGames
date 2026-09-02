import { expect, test } from '@playwright/test';

test('SPEC-0004 private XP flow registers authoritative bonus and exposes correction only in teacher workspace', async ({ page }) => {
  const login = await page.request.post('/api/v1/auth/session', { data: { email: 'teacher@example.test', password: 'change-me-in-development' } });
  expect(login.status()).toBe(204);
  const cookie = login.headers()['set-cookie']?.split(';')[0]; const headers = cookie ? { cookie } : undefined;
  const year = await page.request.post('/api/v1/academic-years', { headers, data: { label: `XP ${Date.now()}`, startsOn: '1900-09-01', endsOn: '1901-07-01' } }); expect(year.status()).toBe(200); const yearId = (await year.json()).id;
  const group = await page.request.post(`/api/v1/academic-years/${yearId}/groups`, { headers, data: { name: 'XP group' } }); expect(group.status()).toBe(200); const groupId = (await group.json()).id;
  const roster = await page.request.post(`/api/v1/groups/${groupId}/students`, { headers, data: { students: [{ realName: 'XP Student', alias: 'XP', avatar: 'default', specialty: 'Leader' }] } }); expect(roster.status()).toBe(200); const studentId = (await roster.json())[0].id;
  await page.goto(`/#/workspace?year=${yearId}&group=${groupId}`); if (await page.getByLabel('Email').count()) { await page.getByLabel('Email').fill('teacher@example.test'); await page.getByLabel('Password').fill('change-me-in-development'); await page.getByRole('button', { name: 'Sign in' }).click(); } await page.getByRole('button', { name: /XP Student/ }).click();
  await page.getByRole('button', { name: /^COMMUNICATION/ }).click(); await page.getByRole('button', { name: '+4 Spontaneous or developed French' }).click();
  await expect(page.getByText(/Base XP \+3 · Specialty bonus \+1 · Effective XP \+4/)).toBeVisible();
  await expect(page.getByText('Annual XP: 4 · Level 1')).toBeVisible(); await expect(page.getByRole('button', { name: 'Undo' })).toBeVisible();
  await expect(page.locator('body')).not.toContainText('XP category breakdown');
  expect(studentId).toBeTruthy();
});

test('XP quick actions show specialty totals while preserving canonical base requests and Undo', async ({ page }) => {
  const login = await page.request.post('/api/v1/auth/session', { data: { email: 'teacher@example.test', password: 'change-me-in-development' } });
  expect(login.status()).toBe(204);
  const cookie = login.headers()['set-cookie']?.split(';')[0];
  const headers = cookie ? { cookie } : undefined;
  const year = await page.request.post('/api/v1/academic-years', { headers, data: { label: `XP presentation ${Date.now()}`, startsOn: '1900-09-01', endsOn: '1901-07-01' } });
  expect(year.status()).toBe(200);
  const yearId = (await year.json()).id as string;
  const group = await page.request.post(`/api/v1/academic-years/${yearId}/groups`, { headers, data: { name: 'XP presentation group' } });
  expect(group.status()).toBe(200);
  const groupId = (await group.json()).id as string;
  const roster = await page.request.post(`/api/v1/groups/${groupId}/students`, { headers, data: { students: [
    { realName: 'Communication Specialist', alias: 'Voice', avatar: 'default', specialty: 'Leader' },
    { realName: 'Precision Specialist', alias: 'Focus', avatar: 'default', specialty: 'Analyst' },
  ] } });
  expect(roster.status()).toBe(200);

  const xpRequests: Array<{ category: string; baseXp: number }> = [];
  page.on('request', request => {
    if (request.method() !== 'POST' || !new URL(request.url()).pathname.endsWith('/xp-evidence')) return;
    const body = request.postData();
    if (body) xpRequests.push(JSON.parse(body) as { category: string; baseXp: number });
  });

  await page.goto(`/#/workspace?year=${yearId}&group=${groupId}`);
  if (await page.getByLabel('Email').count()) {
    await page.getByLabel('Email').fill('teacher@example.test');
    await page.getByLabel('Password').fill('change-me-in-development');
    await page.getByRole('button', { name: 'Sign in' }).click();
  }
  await expect(page.getByRole('heading', { name: 'Classroom workspace' })).toBeVisible();

  const options = page.locator('#xp-options .xp-value');
  await page.getByRole('button', { name: /Communication Specialist/ }).click();
  const communicationCategory = page.locator('button.discipline-communication');
  const precisionCategory = page.locator('button.discipline-precision');
  await expect(communicationCategory).toContainText('Specialty bonus +1');
  await expect(communicationCategory).toHaveAccessibleName('COMMUNICATION, Specialty bonus +1');
  await expect(precisionCategory).not.toContainText('Specialty bonus +1');
  await communicationCategory.click();
  await expect(options).toHaveText(['+2', '+3', '+4']);
  await expect(page.locator('#xp-options button').nth(0)).toHaveAccessibleName('+2 Participation');
  await expect(page.getByText('Specialty bonus +1', { exact: true })).toHaveCount(1);
  await page.getByRole('button', { name: 'Choose another category' }).click();
  await precisionCategory.click();
  await expect(options).toHaveText(['+1', '+2', '+3']);
  await expect(page.getByText('Specialty bonus +1', { exact: true })).toHaveCount(0);

  await page.getByRole('button', { name: /Precision Specialist/ }).click();
  await expect(page.getByRole('heading', { name: 'Precision Specialist' })).toBeVisible();
  await expect(precisionCategory).toContainText('Specialty bonus +1');
  await expect(precisionCategory).toHaveAccessibleName('PRECISION, Specialty bonus +1');
  await expect(page.getByRole('button', { name: 'COMMUNICATION', exact: true })).not.toContainText('Specialty bonus +1');
  await communicationCategory.click();
  await expect(options).toHaveText(['+1', '+2', '+3']);
  await expect(page.locator('#xp-options button').nth(0)).toHaveAccessibleName('+1 Participation');
  await expect(page.getByText('Specialty bonus +1', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Choose another category' }).click();
  await precisionCategory.click();
  await expect(options).toHaveText(['+2', '+3', '+4']);
  await expect(page.getByText('Specialty bonus +1', { exact: true })).toHaveCount(1);

  await options.nth(0).click();
  await expect(page.locator('.feedback')).toHaveText('Base XP +1 · Specialty bonus +1 · Effective XP +2');
  await expect(page.getByText('Annual XP: 2 · Level 1')).toBeVisible();
  await precisionCategory.click();
  await options.nth(1).click();
  await expect(page.locator('.feedback')).toHaveText('Base XP +2 · Specialty bonus +1 · Effective XP +3');
  await expect(page.getByText('Annual XP: 5 · Level 1')).toBeVisible();
  await precisionCategory.click();
  await options.nth(2).click();
  await expect(page.locator('.feedback')).toHaveText('Base XP +3 · Specialty bonus +1 · Effective XP +4');
  await expect(page.getByText('Annual XP: 9 · Level 1')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Recent XP activity' })).toContainText('Base +3 · Bonus +1 · Effective +4');
  expect(xpRequests).toEqual([
    { category: 'PRECISION', baseXp: 1 },
    { category: 'PRECISION', baseXp: 2 },
    { category: 'PRECISION', baseXp: 3 },
  ]);

  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByText('XP registration undone.')).toBeVisible();
  await expect(page.getByText('Annual XP: 5 · Level 1')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Recent XP activity' })).toContainText('Reversed');
});

test('specialty sheets share discipline glyphs and matching Quick XP treatment', async ({ page }) => {
  const specialties = [
    { realName: 'Leader Student', alias: 'Leader', specialty: 'Leader', discipline: 'COMMUNICATION', glyph: '◒', effectiveValues: ['+2', '+3', '+4'] },
    { realName: 'Strategist Student', alias: 'Strategist', specialty: 'Strategist', discipline: 'PRECISION', glyph: '⌖', effectiveValues: ['+2', '+3', '+4'] },
    { realName: 'Disciplined Student', alias: 'Disciplined', specialty: 'Disciplined', discipline: 'CONSISTENCY', glyph: '↗︎', effectiveValues: ['+2', '+3', '+4'] },
    { realName: 'Helper Student', alias: 'Helper', specialty: 'Helper', discipline: 'COLLABORATION', glyph: '∞', effectiveValues: ['+2', '+3', '+4'] },
  ];
  const login = await page.request.post('/api/v1/auth/session', { data: { email: 'teacher@example.test', password: 'change-me-in-development' } });
  expect(login.status()).toBe(204);
  const cookie = login.headers()['set-cookie']?.split(';')[0];
  const headers = cookie ? { cookie } : undefined;
  const year = await page.request.post('/api/v1/academic-years', { headers, data: { label: `XP iconography ${Date.now()}`, startsOn: '1900-09-01', endsOn: '1901-07-01' } });
  expect(year.status()).toBe(200);
  const yearId = (await year.json()).id as string;
  const group = await page.request.post(`/api/v1/academic-years/${yearId}/groups`, { headers, data: { name: 'XP iconography group' } });
  expect(group.status()).toBe(200);
  const groupId = (await group.json()).id as string;
  const roster = await page.request.post(`/api/v1/groups/${groupId}/students`, { headers, data: { students: specialties.map(({ realName, alias, specialty }) => ({ realName, alias, avatar: 'default', specialty })) } });
  expect(roster.status()).toBe(200);

  await page.goto(`/#/workspace?year=${yearId}&group=${groupId}`);
  if (await page.getByLabel('Email').count()) {
    await page.getByLabel('Email').fill('teacher@example.test');
    await page.getByLabel('Password').fill('change-me-in-development');
    await page.getByRole('button', { name: 'Sign in' }).click();
  }
  await expect(page.getByRole('heading', { name: 'Classroom workspace' })).toBeVisible();

  const panel = page.locator('.student-panel');
  const disciplines = ['COMMUNICATION', 'PRECISION', 'CONSISTENCY', 'COLLABORATION'];
  for (const entry of specialties) {
    await page.getByRole('button', { name: new RegExp(entry.realName) }).click();
    await expect(panel.getByRole('heading', { name: entry.realName })).toBeVisible();
    await expect(panel.locator('.sheet-specialty strong')).toHaveText(entry.specialty);

    const matching = panel.locator(`button.discipline-${entry.discipline.toLowerCase()}`);
    await expect(panel.locator('.specialty-glyph')).toHaveText(entry.glyph);
    await expect(matching.locator('.discipline-glyph')).toHaveText(entry.glyph);
    expect(await panel.locator('.specialty-glyph').innerText()).toBe(await matching.locator('.discipline-glyph').innerText());
    await expect(panel.locator('.discipline-choice.is-specialty-match')).toHaveCount(1);
    await expect(panel.locator('.discipline-choice.is-specialty-match')).toHaveClass(new RegExp(`discipline-${entry.discipline.toLowerCase()}`));
    for (const discipline of disciplines) {
      const choice = panel.locator(`button.discipline-${discipline.toLowerCase()}`);
      if (discipline === entry.discipline) await expect(choice).toContainText('Specialty bonus +1');
      else await expect(choice).not.toContainText('Specialty bonus +1');
    }
    await expect(panel.locator('.discipline-choice').filter({ hasText: 'Specialty bonus +1' })).toHaveCount(1);

    await matching.click();
    await expect(panel.locator('.selected-category .discipline-glyph')).toHaveText(entry.glyph);
    await expect(panel.locator('.selected-category')).toHaveClass(/is-specialty-match/);
    await expect(panel.locator('#xp-options .xp-value')).toHaveText(entry.effectiveValues);
    await expect(panel.getByText('Specialty bonus +1', { exact: true })).toHaveCount(1);
  }
});

test('stale XP completion cannot publish into a newly selected student or clear its pending request', async ({ page }) => {
  const login = await page.request.post('/api/v1/auth/session', { data: { email: 'teacher@example.test', password: 'change-me-in-development' } });
  expect(login.status()).toBe(204);
  const cookie = login.headers()['set-cookie']?.split(';')[0];
  const headers = cookie ? { cookie } : undefined;
  const year = await page.request.post('/api/v1/academic-years', { headers, data: { label: `XP stale ${Date.now()}`, startsOn: '1900-09-01', endsOn: '1901-07-01' } });
  expect(year.status()).toBe(200);
  const yearId = (await year.json()).id as string;
  const group = await page.request.post(`/api/v1/academic-years/${yearId}/groups`, { headers, data: { name: 'XP stale group' } });
  expect(group.status()).toBe(200);
  const groupId = (await group.json()).id as string;
  const roster = await page.request.post(`/api/v1/groups/${groupId}/students`, { headers, data: { students: [
    { realName: 'Slow Student', alias: 'Slow', avatar: 'default', specialty: 'Leader' },
    { realName: 'New Student', alias: 'New', avatar: 'default', specialty: 'Analyst' },
  ] } });
  expect(roster.status()).toBe(200);

  let postCount = 0;
  let releaseFirst: (() => void) | undefined;
  let releaseSecond: (() => void) | undefined;
  let firstPostUrl = '';
  let secondPostUrl = '';
  await page.route('**/api/v1/students/*/xp-evidence', async route => {
    if (route.request().method() !== 'POST') {
      await route.continue();
      return;
    }
    const requestNumber = ++postCount;
    if (requestNumber === 1) firstPostUrl = route.request().url();
    if (requestNumber === 2) secondPostUrl = route.request().url();
    if (requestNumber === 1) await new Promise<void>(resolve => { releaseFirst = resolve; });
    if (requestNumber === 2) await new Promise<void>(resolve => { releaseSecond = resolve; });
    await route.continue();
  });

  await page.goto(`/#/workspace?year=${yearId}&group=${groupId}`);
  if (await page.getByLabel('Email').count()) {
    await page.getByLabel('Email').fill('teacher@example.test');
    await page.getByLabel('Password').fill('change-me-in-development');
    await page.getByRole('button', { name: 'Sign in' }).click();
  }
  await page.getByRole('button', { name: /Slow Student/ }).click();
  await page.getByRole('button', { name: /^COMMUNICATION/ }).click();
  await page.getByRole('button', { name: '+2 Participation' }).click();
  await expect.poll(() => postCount).toBe(1);
  await expect(page.getByRole('status', { name: 'Action feedback' })).toContainText('Saving XP');

  await page.getByRole('button', { name: /New Student/ }).click();
  await expect(page.getByRole('heading', { name: 'New Student' })).toBeVisible();
  const newCommunicationCategory = page.getByRole('button', { name: 'COMMUNICATION', exact: true });
  await expect(newCommunicationCategory).toBeEnabled();
  await newCommunicationCategory.click();
  await page.getByRole('button', { name: '+1 Participation' }).click();
  await expect.poll(() => postCount).toBe(2);
  await expect(page.getByRole('status', { name: 'Action feedback' })).toContainText('Saving XP');
  expect(releaseFirst).toBeTruthy();
  expect(releaseSecond).toBeTruthy();

  const firstResponse = page.waitForResponse(response => {
    return response.request().method() === 'POST' && response.url() === firstPostUrl;
  });
  releaseFirst?.();
  expect((await firstResponse).status()).toBe(201);
  await expect(page.getByRole('status', { name: 'Action feedback' })).toContainText('Saving XP');
  await expect(page.locator('.feedback')).toHaveCount(0);
  await expect(page.locator('.xp-award')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toHaveCount(0);

  const secondResponse = page.waitForResponse(response => {
    return response.request().method() === 'POST' && response.url() === secondPostUrl;
  });
  releaseSecond?.();
  expect((await secondResponse).status()).toBe(201);
  await expect(page.locator('.feedback')).toHaveText('Base XP +1 · No specialty bonus · Effective XP +1');
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeVisible();
});

test('stale Undo completion cannot publish into a newly selected student', async ({ page }) => {
  const login = await page.request.post('/api/v1/auth/session', { data: { email: 'teacher@example.test', password: 'change-me-in-development' } });
  expect(login.status()).toBe(204);
  const cookie = login.headers()['set-cookie']?.split(';')[0];
  const headers = cookie ? { cookie } : undefined;
  const year = await page.request.post('/api/v1/academic-years', { headers, data: { label: `Undo stale ${Date.now()}`, startsOn: '1900-09-01', endsOn: '1901-07-01' } });
  expect(year.status()).toBe(200);
  const yearId = (await year.json()).id as string;
  const group = await page.request.post(`/api/v1/academic-years/${yearId}/groups`, { headers, data: { name: 'Undo stale group' } });
  expect(group.status()).toBe(200);
  const groupId = (await group.json()).id as string;
  const rosterResponse = await page.request.post(`/api/v1/groups/${groupId}/students`, { headers, data: { students: [
    { realName: 'Student A', alias: 'A', avatar: 'default', specialty: 'Leader' },
    { realName: 'Student B', alias: 'B', avatar: 'default', specialty: 'Analyst' },
  ] } });
  expect(rosterResponse.status()).toBe(200);

  let reversalResponseHeld = false;
  let releaseReversal: (() => void) | undefined;
  let reversalRequestUrl = '';
  await page.route('**/api/v1/xp-evidence/*/reversal', async route => {
    if (route.request().method() !== 'POST') {
      await route.continue();
      return;
    }
    const response = await route.fetch();
    reversalRequestUrl = route.request().url();
    reversalResponseHeld = true;
    await new Promise<void>(resolve => { releaseReversal = resolve; });
    await route.fulfill({ response });
  });

  await page.goto(`/#/workspace?year=${yearId}&group=${groupId}`);
  if (await page.getByLabel('Email').count()) {
    await page.getByLabel('Email').fill('teacher@example.test');
    await page.getByLabel('Password').fill('change-me-in-development');
    await page.getByRole('button', { name: 'Sign in' }).click();
  }
  await expect(page.getByRole('heading', { name: 'Classroom workspace' })).toBeVisible();
  await page.getByRole('button', { name: /Student A/ }).click();
  await expect(page.getByRole('heading', { name: 'Student A' })).toBeVisible();
  await page.getByRole('button', { name: 'PRECISION' }).click();
  const xpResponse = page.waitForResponse(response => response.request().method() === 'POST' && response.url().endsWith('/xp-evidence'));
  await page.getByRole('button', { name: '+1 Corrects / improves' }).click();
  const xpResult = await xpResponse;
  expect(xpResult.status()).toBe(201);
  const studentAEventId = ((await xpResult.json()) as { event: { id: string } }).event.id;
  await expect(page.getByText('Base XP +1 · No specialty bonus · Effective XP +1')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect.poll(() => reversalResponseHeld).toBe(true);
  await expect(page.getByRole('button', { name: 'Undoing…' })).toBeDisabled();
  await page.getByRole('button', { name: /Student B/ }).click();
  await expect(page.getByRole('heading', { name: 'Student B' })).toBeVisible();

  const studentBPanel = page.locator('.student-panel');
  await expect(studentBPanel.locator('.student-facts')).toContainText('Annual XP: 0 · Level 1');
  const studentBActivity = page.getByRole('region', { name: 'Recent XP activity' });
  await expect(studentBActivity).toContainText('No XP activity yet.');
  const studentBSummary = await studentBPanel.locator('.student-facts').innerText();
  const studentBHistory = await studentBActivity.innerText();
  const studentBFeedbackCount = await studentBPanel.locator('.feedback').count();
  const studentBUndoCount = await studentBPanel.getByRole('button', { name: 'Undo', exact: true }).count();

  const reversalResponse = page.waitForResponse(response => response.request().method() === 'POST' && response.url().includes('/xp-evidence/') && response.url().endsWith('/reversal'));
  releaseReversal?.();
  expect((await reversalResponse).status()).toBe(201);
  expect(new URL(reversalRequestUrl).pathname).toBe(`/api/v1/xp-evidence/${studentAEventId}/reversal`);
  await expect.poll(() => studentBPanel.locator('.student-facts').innerText()).toBe(studentBSummary);
  await expect.poll(() => studentBActivity.innerText()).toBe(studentBHistory);
  expect(await studentBPanel.locator('.feedback').count()).toBe(studentBFeedbackCount);
  expect(await studentBPanel.getByRole('button', { name: 'Undo', exact: true }).count()).toBe(studentBUndoCount);
  await expect(page.getByText('XP registration undone.', { exact: true })).toHaveCount(0);
  await expect(page.getByText('The XP correction could not be applied.', { exact: true })).toHaveCount(0);

  await page.getByRole('button', { name: /Student A/ }).click();
  await expect(page.getByRole('heading', { name: 'Student A' })).toBeVisible();
  await expect(page.locator('.student-panel .student-facts')).toContainText('Annual XP: 0 · Level 1');
  await expect(page.getByRole('region', { name: 'Recent XP activity' })).toContainText('Reversed');
});
