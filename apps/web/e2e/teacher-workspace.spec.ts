import { expect, test, type Page } from '@playwright/test';

async function signIn(page: Page, target = '/#/workspace') {
  await page.goto(target);
  if (await page.getByLabel('Email').count()) {
    await page.getByLabel('Email').fill('teacher@example.test');
    await page.getByLabel('Password').fill('change-me-in-development');
    await page.getByRole('button', { name: 'Sign in' }).click();
  }
  await expect(page.getByRole('heading', { name: 'Classroom workspace' })).toBeVisible();
}

async function seedRoster(page: Page, suffix: string) {
  const login = await page.request.post('/api/v1/auth/session', { data: { email: 'teacher@example.test', password: 'change-me-in-development' } });
  expect(login.status()).toBe(204);
  const cookie = login.headers()['set-cookie']?.split(';')[0];
  const headers = cookie ? { cookie } : undefined;
  const year = await page.request.post('/api/v1/academic-years', { headers, data: { label: `E2E ${suffix}`, startsOn: '1900-09-01', endsOn: '1901-07-01' } });
  expect(year.status()).toBe(200);
  const yearId = (await year.json()).id as string;
  const group = await page.request.post(`/api/v1/academic-years/${yearId}/groups`, { headers, data: { name: `Group ${suffix}` } });
  expect(group.status()).toBe(200);
  const groupId = (await group.json()).id as string;
  const students = await page.request.post(`/api/v1/groups/${groupId}/students`, { headers, data: { students: [{ realName: 'Zoë Durand', alias: 'Zoe', avatar: 'default', specialty: 'Analyst' }, { realName: 'Ada Lovelace', alias: 'Calculus', avatar: 'default' }] } });
  expect(students.status()).toBe(200);
  return { yearId, groupId };
}
test('canonical hash route boots from the Fastify root document and renders the canonical roster', async ({ page }) => {
  const login = await page.request.post('/api/v1/auth/session', { data: { email: 'teacher@example.test', password: 'change-me-in-development' } });
  expect(login.status()).toBe(204);
  const cookie = login.headers()['set-cookie']?.split(';')[0];
  const headers = cookie ? { cookie } : undefined;
  const year = await page.request.post('/api/v1/academic-years', { headers, data: { label: `Workspace year ${Date.now()}`, startsOn: '1800-09-01', endsOn: '1801-07-01' } });
  expect(year.status()).toBe(200);
  const yearId = (await year.json()).id;
  const group = await page.request.post(`/api/v1/academic-years/${yearId}/groups`, { headers, data: { name: 'Workspace group' } });
  expect(group.status()).toBe(200);
  const groupId = (await group.json()).id;
  const students = await page.request.post(`/api/v1/groups/${groupId}/students`, { headers, data: { students: [{ realName: 'Ada Lovelace', alias: 'Ada', avatar: 'default', specialty: 'Strategist' }, { realName: 'Grace Hopper', alias: 'Grace', avatar: 'default' }] } });
  expect(students.status()).toBe(200);
  await signIn(page);
  await page.goto(`/#/workspace?year=${yearId}&group=${groupId}`);
  await expect(page.getByRole('heading', { name: 'Classroom workspace' })).toBeVisible();
  await expect(page.getByText('Ada Lovelace')).toBeVisible();
  await page.getByLabel('Search students').fill('grace');
  await expect(page.getByText('Grace Hopper')).toBeVisible();
  await page.getByRole('button', { name: /Grace Hopper/ }).click();
  await expect(page.getByRole('heading', { name: 'Grace Hopper' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Classroom workspace' })).toBeVisible();
  const copiedUrl = page.url();
  const documentRequests: string[] = [];
  page.on('request', (request) => { if (request.resourceType() === 'document') documentRequests.push(request.url()); });
  await page.goto('about:blank');
  await page.goto(copiedUrl);
  await expect(page.getByRole('heading', { name: 'Classroom workspace' })).toBeVisible();
  expect(documentRequests.length).toBeGreaterThan(0);
  expect(new URL(documentRequests.at(-1)!).pathname).toBe('/');
});

test('canonical roster runtime matrix covers no years and an empty group', async ({ page }) => {
  await page.route('**/api/v1/academic-years*', async (route) => { await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }); });
  await page.goto('/#/workspace');
  await expect(page.getByText('No academic years available')).toBeVisible();

  await page.unroute('**/api/v1/academic-years*');
  await page.goto('about:blank');
  const yearId = '00000000-0000-4000-8000-000000000101'; const groupId = '00000000-0000-4000-8000-000000000102';
  await page.route('**/api/v1/academic-years*', async (route) => { if (!new URL(route.request().url()).pathname.endsWith('/academic-years')) return route.continue(); await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: yearId, label: 'Fixture year', startsOn: '1900-09-01', endsOn: '1901-07-01', archivedAt: null }]) }); });
  await page.route(`**/api/v1/academic-years/${yearId}/groups`, async (route) => { await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: groupId, academicYearId: yearId, name: 'Empty group' }]) }); });
  await page.route(`**/api/v1/groups/${groupId}/students*`, async (route) => { await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }); });
  await page.goto('/#/workspace');
  await expect(page.getByRole('heading', { name: 'Classroom workspace' })).toBeVisible();
  await signIn(page);
  await page.goto('about:blank');
  await page.goto(`/#/workspace?year=${yearId}&group=${groupId}`);
  await expect(page.getByText(/No (students in this group|groups in this year)\./)).toBeVisible();
  await page.unrouteAll();
  const zeroYearId = '00000000-0000-4000-8000-000000000103';
  await page.route('**/api/v1/academic-years*', async (route) => { if (!new URL(route.request().url()).pathname.endsWith('/academic-years')) return route.continue(); await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: zeroYearId, label: 'Zero-group year', startsOn: '1902-09-01', endsOn: '1903-07-01', archivedAt: null }]) }); });
  await page.route(`**/api/v1/academic-years/${zeroYearId}/groups`, async (route) => { await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }); });
  await page.goto('about:blank');
  await page.goto(`/#/workspace?year=${zeroYearId}`);
  await expect(page.getByText('No groups in this year.')).toBeVisible();
});

test('historical-only and group cardinality states are read-only and selectable', async ({ page }) => {
  const login = await page.request.post('/api/v1/auth/session', { data: { email: 'teacher@example.test', password: 'change-me-in-development' } });
  expect(login.status()).toBe(204);
  const cookie = login.headers()['set-cookie']?.split(';')[0]; const headers = cookie ? { cookie } : undefined;
  const year = await page.request.post('/api/v1/academic-years', { headers, data: { label: `Historical ${Date.now()}`, startsOn: '1700-09-01', endsOn: '1701-07-01' } }); const yearId = (await year.json()).id;
  const group = await page.request.post(`/api/v1/academic-years/${yearId}/groups`, { headers, data: { name: 'Historical group' } }); const groupId = (await group.json()).id;
  const students = await page.request.post(`/api/v1/groups/${groupId}/students`, { headers, data: { students: [{ realName: 'Archived Student', alias: 'Archive', avatar: 'default' }] } }); const studentId = (await students.json())[0].id;
  expect((await page.request.post(`/api/v1/students/${studentId}/archive`, { headers })).status()).toBe(204);
  expect((await page.request.post(`/api/v1/academic-years/${yearId}/archive`, { headers })).status()).toBe(204);
  const archivedResponse = await page.request.get('/api/v1/academic-years?includeArchived=true', { headers });
  const archivedYears = (await archivedResponse.json()).filter((value: { id: string }) => value.id === yearId);
  await page.route('**/api/v1/academic-years*', async (route) => { await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(route.request().url().includes('includeArchived=true') ? archivedYears : []) }); });
  await signIn(page); await page.goto('/#/workspace');
  await expect(page.getByText('Historical year — records are read-only.')).toBeVisible();
  await expect(page.getByText('Archived', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /Archived Student/ }).click();
  await expect(page.getByText('Historical record · read-only')).toBeVisible();
  await expect(page.getByText('Actions will appear here when a classroom tool is available.')).toHaveCount(0);
});

test('authenticated canonical roster exposes many groups through the group selector', async ({ page }) => {
  const { yearId } = await seedRoster(page, `${Date.now()}-many`);
  const login = await page.request.post('/api/v1/auth/session', { data: { email: 'teacher@example.test', password: 'change-me-in-development' } });
  const cookie = login.headers()['set-cookie']?.split(';')[0];
  const groups = await page.request.post(`/api/v1/academic-years/${yearId}/groups`, { headers: cookie ? { cookie } : undefined, data: { name: 'Second group' } });
  expect(groups.status()).toBe(200);
  await signIn(page); await page.goto('about:blank'); await page.goto(`/#/workspace?year=${yearId}`);
  await expect(page.getByRole('combobox', { name: 'Group' }).locator('option')).toHaveCount(2);
});

test('root without a hash remains the fixture-backed projection route', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Email').fill('teacher@example.test');
  await page.getByLabel('Password').fill('change-me-in-development');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: 'Classroom signal' })).toBeVisible();
  await expect(page.locator('[data-testid="projection-card"]')).toBeVisible();
});

test('search clear, no-match, ordered cards, keyboard selection, and panel focus work on canonical roster data', async ({ page }) => {
  const { yearId, groupId } = await seedRoster(page, `${Date.now()}`);
  await signIn(page, `/#/workspace?year=${yearId}&group=${groupId}`);
  const cards = page.locator('.workspace-student-card');
  await expect(cards).toHaveCount(2);
  await expect(cards.nth(0)).toBeVisible();
  await expect(cards.nth(1)).toBeVisible();
  await page.getByLabel('Search students').fill('nobody');
  await expect(page.getByText('No matching students.')).toBeVisible();
  await page.getByRole('button', { name: 'Clear student search' }).click();
  await expect(page.getByLabel('Search students')).toBeFocused();
  await page.setViewportSize({ width: 800, height: 800 });
  await cards.nth(0).press('Enter');
  await expect(page.locator('.student-panel h2')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Close student panel' })).toBeFocused();
  await page.getByRole('button', { name: 'Close student panel' }).click();
  await expect(page.getByText('Select a student to inspect their classroom context.')).toBeVisible();
  await expect(cards.nth(0)).toBeFocused();
});

test('AC-11 tablet dialog traps Tab focus in both directions', async ({ page }) => {
  const { yearId, groupId } = await seedRoster(page, `${Date.now()}-focus-trap`);
  await page.setViewportSize({ width: 800, height: 800 });
  await signIn(page, `/#/workspace?year=${yearId}&group=${groupId}`);
  await page.getByRole('button', { name: /Ada Lovelace/ }).click();
  await page.getByRole('button', { name: 'COMMUNICATION' }).click();
  const close = page.getByRole('button', { name: 'Close student panel' });
  await close.focus();
  await expect(close).toBeFocused();
  const firstValue = page.getByRole('button', { name: '+1' });
  await firstValue.focus();
  await page.keyboard.press('Shift+Tab');
  await expect(close).toBeFocused();
  await page.locator('summary').focus();
  await expect(page.locator('summary')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(close).toBeFocused();
});

test('AC-06 real Register XP path exposes pending, failure, retry, and authoritative success', async ({ page }) => {
  const { yearId, groupId } = await seedRoster(page, `${Date.now()}-xp-retry`);
  const xpUrl = `**/api/v1/students/*/xp-evidence`;
  let attempts = 0;
  await page.route(xpUrl, async route => {
    attempts += 1;
    if (attempts === 1) {
      await new Promise(resolve => setTimeout(resolve, 250));
      await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Temporary XP failure.' }) });
      return;
    }
    await route.continue();
  });
  await signIn(page, `/#/workspace?year=${yearId}&group=${groupId}`);
  await page.getByRole('button', { name: /Ada Lovelace/ }).click();
  await page.getByRole('button', { name: 'COMMUNICATION' }).click();
  await page.getByRole('button', { name: '+3' }).click();
  await expect(page.getByRole('button', { name: '+3' })).toBeDisabled();
  await expect(page.getByText('Could not register XP. Try again.')).toBeVisible();
  await page.getByRole('button', { name: '+3' }).click();
  await expect(page.getByText(/Base XP \+3 · No specialty bonus · Effective XP \+3/)).toBeVisible();
  await expect(page.getByText('Annual XP: 3 · Level 1')).toBeVisible();
  expect(attempts).toBe(2);
});

test('AC-14 proves the contiguous teacher journey through real XP and reversal', async ({ page }) => {
  const { yearId, groupId } = await seedRoster(page, `${Date.now()}-journey`);
  const login = await page.request.post('/api/v1/auth/session', { data: { email: 'teacher@example.test', password: 'change-me-in-development' } });
  expect(login.status()).toBe(204);
  const cookie = login.headers()['set-cookie']?.split(';')[0];
  const secondGroup = await page.request.post(`/api/v1/academic-years/${yearId}/groups`, { headers: cookie ? { cookie } : undefined, data: { name: 'Continue teaching group' } });
  expect(secondGroup.status()).toBe(200);
  const secondGroupId = (await secondGroup.json()).id as string;

  await signIn(page, `/#/workspace?year=${yearId}&group=${groupId}`);
  await expect(page.getByText(/E2E .*journey · Group .*journey/)).toBeVisible();
  await page.getByLabel('Search students').fill('zoe');
  await page.getByRole('button', { name: /Zoë Durand/ }).click();
  await expect(page.getByRole('heading', { name: 'Zoë Durand' })).toBeVisible();
  await expect(page.getByText('Analyst', { exact: true })).toBeVisible();
  for (let index = 0; index < 4; index += 1) {
    await page.getByRole('button', { name: 'PRECISION' }).click();
    await page.getByRole('button', { name: '+3' }).click();
    await expect(page.getByText(/Base XP \+3 · Specialty bonus \+1 · Effective XP \+4/)).toBeVisible();
  }
  await expect(page.getByText('Annual XP: 16 · Level 2')).toBeVisible();
  await expect(page.getByText('Badge unlocked: Ojo clínico')).toBeVisible();
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByText('XP registration undone.')).toBeVisible();
  await expect(page.getByText('Annual XP: 12 · Level 2')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Zoë Durand' })).toBeVisible();
  await page.getByRole('combobox', { name: 'Group' }).selectOption({ label: 'Continue teaching group' });
  await expect(page.getByRole('combobox', { name: 'Group' })).toHaveValue(secondGroupId);
  await expect(page.locator('.context-line')).toContainText('Continue teaching group');
  await expect(page.getByText('No students in this group.')).toBeVisible();
});

test('group authentication expiry clears the private workspace and shows recovery', async ({ page }) => {
  const { yearId } = await seedRoster(page, `${Date.now()}-auth`);
  await page.route('**/api/v1/academic-years/*/groups', async (route) => { await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ code: 'AUTH_REQUIRED', message: 'Sign-in required.' }) }); });
  await signIn(page);
  await page.goto(`/#/workspace?year=${yearId}`);
  await expect(page.getByRole('heading', { name: 'Open the classroom workspace' })).toBeVisible();
  await expect(page.getByText('Ada Lovelace')).toHaveCount(0);
});

test('stale opaque student context reconciles without exposing private values in the URL', async ({ page }) => {
  const { yearId, groupId } = await seedRoster(page, `${Date.now()}`);
  await signIn(page, `/#/workspace?year=${yearId}&group=${groupId}&student=not-a-uuid`);
  await expect(page.getByText('Ada Lovelace')).toBeVisible();
  await expect.poll(() => new URL(page.url()).hash).not.toContain('student=');
  const hash = new URL(page.url()).hash;
  const context = new URLSearchParams(hash.split('?')[1] ?? '');
  expect([...context.keys()]).toEqual(['year', 'group']);
  for (const value of context.values()) expect(value).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
});

test('valid stale year and group contexts reconcile and one group auto-selects', async ({ page }) => {
  const yearId = '00000000-0000-4000-8000-000000000201';
  const groupId = '00000000-0000-4000-8000-000000000202';
  const staleYear = '00000000-0000-4000-8000-000000000203';
  const staleGroup = '00000000-0000-4000-8000-000000000204';
  await page.route('**/api/v1/academic-years*', async (route) => {
    if (!new URL(route.request().url()).pathname.endsWith('/academic-years')) return route.continue();
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: yearId, label: 'Reconciled year', startsOn: '1900-09-01', endsOn: '1901-07-01', archivedAt: null }]) });
  });
  await page.route(`**/api/v1/academic-years/${yearId}/groups`, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: groupId, academicYearId: yearId, name: 'Only group' }]) });
  });
  await page.route(`**/api/v1/groups/${groupId}/students*`, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: '00000000-0000-4000-8000-000000000205', groupId, realName: 'Reconciled Student', alias: 'Reconciled', avatar: 'default', specialty: null, archivedAt: null }]) });
  });
  await signIn(page);
  await page.goto('about:blank');
  await page.goto(`/#/workspace?year=${staleYear}&group=${staleGroup}`);
  await expect(page.getByText('Reconciled Student')).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Group' })).toHaveCount(0);
  await expect.poll(() => new URL(page.url()).hash).toContain(`year=${yearId}`);
  await expect.poll(() => new URL(page.url()).hash).toContain(`group=${groupId}`);
});

test('selected student removed by refresh clears the panel, URL selection, and announces removal', async ({ page }) => {
  const yearId = '00000000-0000-4000-8000-000000000211';
  const groupId = '00000000-0000-4000-8000-000000000212';
  const studentId = '00000000-0000-4000-8000-000000000213';
  let rosterReads = 0;
  await page.route('**/api/v1/academic-years*', async (route) => {
    if (!new URL(route.request().url()).pathname.endsWith('/academic-years')) return route.continue();
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: yearId, label: 'Refresh year', startsOn: '1900-09-01', endsOn: '1901-07-01', archivedAt: null }]) });
  });
  await page.route(`**/api/v1/academic-years/${yearId}/groups`, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: groupId, academicYearId: yearId, name: 'Refresh group' }]) });
  });
  await page.route(`**/api/v1/groups/${groupId}/students*`, async (route) => {
    rosterReads += 1;
    const body = rosterReads <= 2 ? [{ id: studentId, groupId, realName: 'Refresh Student', alias: 'Refresh', avatar: 'default', specialty: null, archivedAt: null }] : [];
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  await signIn(page);
  await page.goto('about:blank');
  await page.goto(`/#/workspace?year=${yearId}&group=${groupId}`);
  await page.getByRole('button', { name: /Refresh Student/ }).click();
  await expect(page.getByRole('heading', { name: 'Refresh Student' })).toBeVisible();
  await expect.poll(() => new URL(page.url()).hash).toContain('student=');
  await page.reload();
  await expect(page.getByText('The selected student is no longer available.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Refresh Student' })).toHaveCount(0);
  expect(new URL(page.url()).hash).not.toContain('student=');
});

test('AC-03 approved 30-record scan fixture stays scannable without changing the demo seed', async ({ page }) => {
  const yearId = '00000000-0000-4000-8000-000000000301'; const groupId = '00000000-0000-4000-8000-000000000302';
  const fixture = Array.from({ length: 30 }, (_, index) => ({ id: `00000000-0000-4000-8000-${String(index + 303).padStart(12, '0')}`, groupId, realName: `Fixture Student ${index + 1}`, alias: `Student ${index + 1}`, avatar: 'default', specialty: index % 2 ? 'Analyst' : 'Leader', archivedAt: null }));
  await page.route('**/api/v1/academic-years*', async route => { if (!new URL(route.request().url()).pathname.endsWith('/academic-years')) return route.continue(); await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: yearId, label: 'Approved scan fixture', startsOn: '1900-09-01', endsOn: '1901-07-01', archivedAt: null }]) }); });
  await page.route(`**/api/v1/academic-years/${yearId}/groups`, async route => { await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: groupId, academicYearId: yearId, name: '30 students' }]) }); });
  await page.route(`**/api/v1/groups/${groupId}/students*`, async route => { await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fixture) }); });
  await signIn(page, `/#/workspace?year=${yearId}&group=${groupId}`);
  await expect(page.locator('.workspace-student-card')).toHaveCount(30);
  await page.getByLabel('Search students').fill('Student 30');
  await expect(page.getByRole('button', { name: /Fixture Student 30/ })).toBeVisible();
  await page.getByRole('button', { name: /Fixture Student 30/ }).click();
  await expect(page.getByRole('heading', { name: 'Fixture Student 30' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

test('post-401 sign-in recovery reloads context without stale private cards', async ({ page }) => {
  const { yearId, groupId } = await seedRoster(page, `${Date.now()}-recovery`);
  let groupReads = 0;
  await page.route(`**/api/v1/academic-years/${yearId}/groups`, async (route) => {
    groupReads += 1;
    if (groupReads === 1) { await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ code: 'AUTH_REQUIRED', message: 'Sign-in required.' }) }); return; }
    await route.continue();
  });
  await page.goto('about:blank');
  await page.goto(`/#/workspace?year=${yearId}&group=${groupId}`);
  await expect(page.getByRole('heading', { name: 'Open the classroom workspace' })).toBeVisible();
  await expect(page.getByText('Ada Lovelace')).toHaveCount(0);
  await page.getByLabel('Email').fill('teacher@example.test');
  await page.getByLabel('Password').fill('change-me-in-development');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: 'Classroom workspace' })).toBeVisible();
  await expect(page.getByText('Ada Lovelace')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Classroom workspace' })).toBeVisible();
  await expect(page.getByText('Ada Lovelace')).toBeVisible();
});

test('actual FastActionShell and UndoBanner runtime harness proves controlled presentation lifecycles', async ({ page }) => {
  await page.goto('/#/workspace-runtime-test');
  await expect(page.getByTestId('runtime-presentation-harness')).toBeVisible();

  const action = page.locator('[aria-label="Fast actions"] button');
  await action.evaluate((button) => button.dispatchEvent(new MouseEvent('click', { bubbles: true })));
  await expect(page.getByRole('status', { name: '' }).filter({ hasText: 'Working on Record classroom signal' })).toBeVisible();
  await action.evaluate((button) => button.dispatchEvent(new MouseEvent('click', { bubbles: true })));
  await expect(page.getByTestId('action-calls')).toHaveText('1');
  await page.getByRole('button', { name: 'Resolve action' }).click();
  await expect(page.getByTestId('action-result')).toHaveText('Signal recorded.');
  await action.click();
  await page.getByRole('button', { name: 'Change context' }).click();
  await page.getByRole('button', { name: 'Resolve action' }).click();
  await expect(page.getByTestId('action-result')).toHaveText('Signal recorded.');

  await page.getByRole('button', { name: 'Create expiring opportunity' }).click();
  await expect(page.getByText('Expired signal')).toBeVisible();
  await expect(page.getByTestId('undo-result')).toHaveText('Undo period ended.', { timeout: 3_000 });
  await expect(page.getByText('Expired signal')).toHaveCount(0);
  await page.getByRole('button', { name: 'Create undo opportunity' }).click();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.locator('.undo-banner')).toContainText('Signal undone.');
  await page.getByRole('button', { name: 'Create invalid opportunity' }).click();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.locator('.undo-banner')).toContainText('Signal is no longer valid.');
  await page.getByRole('button', { name: 'Create failing opportunity' }).click();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.locator('.undo-banner')).toContainText('Could not undo Runtime signal.');
  await page.getByRole('button', { name: 'Create pending opportunity' }).click();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Undoing…' })).toBeDisabled();
  await page.getByRole('button', { name: 'Resolve pending undo' }).click();
  await expect(page.locator('.undo-banner')).toContainText('Signal undone.');
  await page.getByRole('button', { name: 'Create undo opportunity' }).click();
  await page.getByRole('button', { name: 'Replace opportunity' }).click();
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toHaveCount(0);
});
