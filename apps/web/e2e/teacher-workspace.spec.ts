import { expect, test, type Page } from '@playwright/test';

async function signIn(page: Page, target = '/#/workspace') {
  await page.goto(target);
  const workspace = page.locator('header.workspace-header').getByRole('heading');
  const email = page.getByLabel('Email');
  const screen = await Promise.race([
    email.waitFor({ state: 'visible', timeout: 2_000 }).then(() => 'login' as const),
    workspace.waitFor({ state: 'visible', timeout: 2_000 }).then(() => 'workspace' as const),
  ]).catch(() => 'workspace' as const);
  if (screen === 'login') {
    await email.fill('teacher@example.test');
    await page.getByLabel('Password').fill('change-me-in-development');
    await page.getByRole('button', { name: 'Sign in' }).click();
  }
  await expect(workspace).toBeVisible();
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
  await expect(page.locator('header.workspace-header').getByRole('heading')).toBeVisible();
  await expect(page.getByText('Ada Lovelace')).toBeVisible();
  await page.getByLabel('Search students').fill('grace');
  await expect(page.getByText('Grace Hopper')).toBeVisible();
  await page.getByRole('button', { name: /Grace Hopper/ }).click();
  await expect(page.getByRole('heading', { name: 'Grace Hopper' })).toBeVisible();
  await page.reload();
  await expect(page.locator('header.workspace-header').getByRole('heading')).toBeVisible();
  const copiedUrl = page.url();
  const documentRequests: string[] = [];
  page.on('request', (request) => { if (request.resourceType() === 'document') documentRequests.push(request.url()); });
  await page.goto('about:blank');
  await page.goto(copiedUrl);
  await expect(page.locator('header.workspace-header').getByRole('heading')).toBeVisible();
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
  await expect(page.locator('header.workspace-header').getByRole('heading')).toBeVisible();
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

test('minimal classroom setup creates owned roster data, refreshes visibility, and keeps an invalid rejection visible', async ({ page }) => {
  const login = await page.request.post('/api/v1/auth/session', { data: { email: 'teacher@example.test', password: 'change-me-in-development' } });
  expect(login.status()).toBe(204);
  const cookie = login.headers()['set-cookie']?.split(';')[0];
  const headers = cookie ? { cookie } : undefined;
  const suffix = `${Date.now()}-setup`;
  const year = await page.request.post('/api/v1/academic-years', { headers, data: { label: `A ${suffix}`, startsOn: '1000-09-01', endsOn: '1001-07-01' } });
  expect(year.status()).toBe(200);
  const yearId = (await year.json()).id as string;
  await page.route('**/api/v1/academic-years', async route => {
    if (route.request().method() !== 'GET') return route.continue();
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: yearId, label: `A ${suffix}`, startsOn: '1000-09-01', endsOn: '1001-07-01', archivedAt: null }]) });
  });

  await page.goto(`/#/workspace?year=${yearId}`);
  await expect(page.getByRole('button', { name: 'Set up a classroom' })).toBeVisible();
  await page.getByRole('button', { name: 'Set up a classroom' }).click();
  await page.getByLabel('Group name').fill('Owned setup group');
  await page.locator('#setup-student-name-0').fill('Setup Student');
  await page.locator('#setup-student-alias-0').fill('Setup');
  await page.route('**/api/v1/academic-years/*/groups', async route => {
    if (route.request().method() !== 'POST') return route.continue();
    await route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ message: 'Alias already exists.' }) });
  });
  await page.getByRole('button', { name: 'Create classroom' }).click();
  await expect(page.getByRole('alert')).toContainText('This classroom value already exists');
  await page.unroute('**/api/v1/academic-years/*/groups');
  await page.getByRole('button', { name: 'Create classroom' }).click();
  await expect(page.getByText('Setup Student')).toBeVisible();
  await expect(page.getByText('Owned setup group')).toBeVisible();
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
  await expect(page.locator('p.read-only-note').filter({ hasText: 'Historical year — records are read-only.' })).toBeVisible();
  await expect(page.getByText('Archived', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /Archived Student/ }).click();
  await expect(page.getByRole('region', { name: 'Gemas' }).getByText('Este registro es de solo lectura.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Otorgar recompensa' })).toHaveCount(0);
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

test('root without a hash opens the Home command center', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Email').fill('teacher@example.test');
  await page.getByLabel('Password').fill('change-me-in-development');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: 'Command Center' })).toBeVisible();
  await expect(page.locator('.home-header').getByRole('link', { name: 'Open Classroom Preview' })).toBeVisible();
  await expect(page.locator('[data-testid="projection-card"]')).toHaveCount(0);
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
  await expect(page.getByRole('button', { name: 'Cerrar ficha del estudiante' })).toBeFocused();
  await page.getByRole('button', { name: 'Cerrar ficha del estudiante' }).click();
  await expect(page.getByText('Selecciona un estudiante para consultar su contexto de clase.')).toBeVisible();
  await expect(cards.nth(0)).toBeFocused();
});

test('AC-11 tablet dialog traps Tab focus in both directions', async ({ page }) => {
  const { yearId, groupId } = await seedRoster(page, `${Date.now()}-focus-trap`);
  await page.setViewportSize({ width: 800, height: 800 });
  await signIn(page, `/#/workspace?year=${yearId}&group=${groupId}`);
  await page.getByRole('button', { name: /Ada Lovelace/ }).click();
  await page.getByRole('button', { name: 'COMMUNICATION' }).click();
  const close = page.getByRole('button', { name: 'Cerrar ficha del estudiante' });
  await close.focus();
  await expect(close).toBeFocused();
  const firstValue = page.getByRole('button', { name: '+1' });
  await firstValue.focus();
  await page.keyboard.press('Shift+Tab');
  await expect(close).toBeFocused();
  const cancelCategory = page.getByRole('button', { name: 'Cancelar', exact: true });
  await cancelCategory.focus();
  await expect(cancelCategory).toBeFocused();
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
  await expect(page.getByText('No se pudo registrar el XP. Reintentar.')).toBeVisible();
  await page.getByRole('button', { name: '+3' }).click();
  await expect(page.getByText('XP base +3 · XP efectivo +3')).toBeVisible();
  await expect(page.locator('.student-progress-row')).toContainText('3 XP');
  expect(attempts).toBe(2);
});

test('workspace action feedback announces pending work and restores focus after closing tablet dialog', async ({ page }) => {
  const { yearId, groupId } = await seedRoster(page, `${Date.now()}-feedback`);
  const xpUrl = `**/api/v1/students/*/xp-evidence`;
  let releaseRequest: (() => void) | undefined;
  await page.route(xpUrl, async route => {
    await new Promise<void>(resolve => { releaseRequest = resolve; });
    await route.continue();
  });
  await page.setViewportSize({ width: 800, height: 800 });
  await signIn(page, `/#/workspace?year=${yearId}&group=${groupId}`);
  const student = page.getByRole('button', { name: /Ada Lovelace/ });
  await student.click();
  await page.getByRole('button', { name: 'COMMUNICATION' }).click();
  await page.getByRole('button', { name: '+1' }).click();
  await expect(page.getByRole('status')).toContainText('XP');
  releaseRequest?.();
  await expect(page.getByText('XP base +1')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(student).toBeFocused();
});

test('workspace selection keeps private action state out of URL and browser storage', async ({ page }) => {
  const { yearId, groupId } = await seedRoster(page, `${Date.now()}-storage`);
  await signIn(page, `/#/workspace?year=${yearId}&group=${groupId}`);
  await page.getByRole('button', { name: /Ada Lovelace/ }).click();
  await expect.poll(() => page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length }))).toEqual({ local: 0, session: 0 });
  expect(page.url()).not.toMatch(/(comment|xp|coin|reward|balance|assessment)=/i);
});

test('AC-01–AC-17 canonical teacher journey stays in the workspace', async ({ page }) => {
  const { yearId, groupId } = await seedRoster(page, `${Date.now()}-canonical`);

  await signIn(page, `/#/workspace?year=${yearId}&group=${groupId}`);
  await page.getByLabel('Search students').fill('zoe');
  await page.getByRole('button', { name: /Zoë Durand/ }).click();
  await expect(page.getByRole('heading', { name: 'Zoë Durand' })).toBeVisible();
  await expect(page.getByText('Analyst', { exact: true })).toBeVisible();
   await page.getByRole('button', { name: /^PRECISION/ }).click();
  await page.getByRole('button', { name: '+3' }).click();
  await expect(page.getByText('XP base +3 · XP efectivo +4')).toBeVisible();
  await expect(page.locator('.student-progress-row')).toContainText('4 XP');

  const assessmentName = page.getByLabel('Create/select Assessment');
  await assessmentName.fill('  Unit quiz  ');
  await page.getByRole('button', { name: 'Create/select Assessment' }).click();
  const assessmentSelect = page.getByRole('combobox', { name: 'Assessment' });
  await expect(assessmentSelect.locator('option:checked')).toHaveText('Unit quiz');
  await expect(page.getByText('Unit quiz created and selected.')).toBeVisible();
  await assessmentName.fill('unit QUIZ');
  await page.getByRole('button', { name: 'Create/select Assessment' }).click();
  await expect(assessmentSelect.locator('option:checked')).toHaveText('Unit quiz');
  await expect(page.getByText('Unit quiz selected.')).toBeVisible();

  await page.getByRole('button', { name: 'Cerrar ficha del estudiante' }).click();
  await page.getByLabel('Search students').fill('ada');
  await page.getByRole('button', { name: /Ada Lovelace/ }).click();
  await expect(page.getByRole('heading', { name: 'Ada Lovelace' })).toBeVisible();
  expect(page.url()).not.toMatch(/(Zoë|Ada|Unit quiz|comment|xp|coin|assessment)=/i);
  expect(await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length }))).toEqual({ local: 0, session: 0 });
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
    await page.getByRole('button', { name: /^PRECISION/ }).click();
    await page.getByRole('button', { name: '+3' }).click();
    await expect(page.getByText('XP base +3 · XP efectivo +4')).toBeVisible();
  }
  await expect(page.locator('.student-progress-row')).toContainText('16 XP');
  await expect(page.locator('.student-badge')).toContainText('Ojo clínico');
  await page.locator('.undo-banner').getByRole('button').click();
  await expect(page.locator('.undo-banner')).toContainText('XP registration undone.');
  await expect(page.locator('.student-progress-row')).toContainText('12 XP');
  await expect(page.getByRole('heading', { name: 'Zoë Durand' })).toBeVisible();
  await page.getByRole('combobox', { name: 'Group' }).selectOption({ label: 'Continue teaching group' });
  await expect(page.getByRole('combobox', { name: 'Group' })).toHaveValue(secondGroupId);
  await expect(page.locator('.context-line')).toContainText('Continue teaching group');
  await expect(page.getByText('No students in this group.')).toBeVisible();
});

test('labelled fixture Projection handoff stays separate from the complete teacher journey', async ({ page }) => {
  const { yearId, groupId } = await seedRoster(page, `${Date.now()}-projection-journey`);
  await signIn(page, `/#/workspace?year=${yearId}&group=${groupId}`);
  await page.getByLabel('Search students').fill('zoe');
  await page.getByRole('button', { name: /Zoë Durand/ }).click();
  await expect(page.getByRole('heading', { name: 'Zoë Durand' })).toBeVisible();
    await page.getByRole('button', { name: /^PRECISION/ }).click();
  await page.getByRole('button', { name: '+3' }).click();
  await expect(page.getByText('XP base +3 · XP efectivo +4')).toBeVisible();
  await page.locator('.undo-banner').getByRole('button').click();
  await expect(page.locator('.undo-banner')).toContainText('XP registration undone.');

  const assessmentName = page.getByLabel('Create/select Assessment');
  await assessmentName.fill('Projection journey assessment');
  await page.getByRole('button', { name: 'Create/select Assessment' }).click();
  await expect(page.getByText('Projection journey assessment created and selected.')).toBeVisible();
  expect(await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length }))).toEqual({ local: 0, session: 0 });
  expect(page.url()).not.toMatch(/(Zoë|Projection|comment|xp|coin|assessment)=/i);

  const handoff = page.getByRole('link', { name: 'Open Classroom Preview' });
  await expect(handoff).toHaveAttribute('href', /^\/#\/projection(?:\?group=.*)?$/);
  await handoff.click();
  await expect(page.getByRole('heading', { name: 'The room is ready for its next chapter.' })).toBeVisible();
  expect(new URL(page.url()).pathname).toBe('/');
  expect(new URL(page.url()).search).toBe('');
  expect(new URL(page.url()).hash).toMatch(/^#\/projection(?:\?group=.*)?$/);
  await expect(page.locator('body')).toContainText('Zoe');
  await expect(page.locator('body')).not.toContainText(/Zoë Durand|Ada Lovelace|Projection journey assessment|RT average|rubric|comments|incidents|history/i);
});

test('group authentication expiry clears the private workspace and shows recovery', async ({ page }) => {
  const { yearId } = await seedRoster(page, `${Date.now()}-auth`);
  await signIn(page);
  await page.route('**/api/v1/academic-years/*/groups', async (route) => { await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ code: 'AUTH_REQUIRED', message: 'Sign-in required.' }) }); });
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
  await expect(page.locator('header.workspace-header').getByRole('heading')).toBeVisible();
  await expect(page.getByText('Ada Lovelace')).toBeVisible();
  await page.reload();
  await expect(page.locator('header.workspace-header').getByRole('heading')).toBeVisible();
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

test('SPEC-0039 Slice 5 built artifact proves the teacher, Classroom Mode, and temporary viewer journey', async ({ page, context }) => {
  const suffix = `${Date.now()}-slice-5`;
  const { yearId, groupId } = await seedRoster(page, suffix);
  await signIn(page, `/#/workspace?year=${yearId}&group=${groupId}`);
  await expect(page.locator('.context-line')).toContainText(`Group ${suffix}`);
  await page.getByLabel('Search students').fill('ada');
  await page.getByRole('button', { name: /Ada Lovelace/ }).click();
  await expect(page.getByRole('heading', { name: 'Ada Lovelace' })).toBeVisible();

  await page.getByRole('button', { name: 'Modo aula' }).click();
  const classroom = page.getByRole('dialog', { name: 'Safe classroom cards' });
  await expect(classroom.getByRole('button', { name: /Calculus/ })).toBeVisible();
  await expect(classroom).not.toContainText('Ada Lovelace');
  await classroom.getByRole('button', { name: /Calculus/ }).click();
  await classroom.getByRole('button', { name: 'Mostrar al alumno' }).click();
  const firstUrl = await classroom.getByLabel('Show Student URL').inputValue();
  expect(firstUrl).toMatch(/#\/show-student\?token=/);
  await expect(classroom.getByRole('img', { name: 'QR de acceso temporal del alumno' })).toBeVisible();

  const projection = await context.newPage();
  await projection.goto(`/#/projection?group=${groupId}`);
  await expect(projection.getByText('VISTA TEMPORAL DEL ALUMNO', { exact: true })).toBeVisible();
  await expect(projection.getByRole('heading', { name: 'Calculus' })).toBeVisible();

  const viewer = await context.newPage();
  const viewerPayloads: unknown[] = [];
  const documentRequests: string[] = [];
  viewer.on('request', request => { if (request.resourceType() === 'document') documentRequests.push(request.url()); });
  viewer.on('response', async response => {
    if (!response.url().includes('/api/v1/show-student')) return;
    try { viewerPayloads.push(await response.json()); } catch { /* exchange is intentionally empty */ }
  });
   await viewer.goto(firstUrl);
   await expect(viewer.getByRole('heading', { name: 'Calculus' })).toBeVisible();
  await expect(viewer.getByText(/Level/)).toBeVisible();
  await expect(viewer.getByText(/Gems:/)).toBeVisible();
  await expect(viewer.locator('body')).not.toContainText(/Ada Lovelace|Zoë Durand|realName|xpEvidence|incidents|proposals|history/i);
  expect(new URL(viewer.url()).hash).toBe('#/show-student');
  expect(documentRequests.every(url => !url.includes('token=') && !url.includes('code='))).toBe(true);
  expect(await viewer.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length }))).toEqual({ local: 0, session: 0 });
   const firstViewerPayload = viewerPayloads.find(value => typeof value === 'object' && value !== null && 'kind' in value) as Record<string, unknown> | undefined;
   expect(firstViewerPayload).toBeDefined();
   expect(JSON.stringify(firstViewerPayload)).not.toMatch(/Ada Lovelace|Zoë Durand|realName|xpEvidence|incidents|proposals|history/i);
   expect(Object.keys(firstViewerPayload ?? {}).sort()).toEqual(['behaviour', 'expiresAt', 'kind', 'student']);
  await expect(projection.getByText('VISTA TEMPORAL DEL ALUMNO', { exact: true })).toBeVisible();
  await expect(projection.getByRole('heading', { name: 'Calculus' })).toBeVisible();

  await viewer.reload();
  await expect(viewer.getByRole('heading', { name: 'Calculus' })).toBeVisible();
  const refreshedPayload = viewerPayloads.filter(value => typeof value === 'object' && value !== null && 'kind' in value).at(-1) as Record<string, unknown>;
  expect(refreshedPayload.expiresAt).toBe(firstViewerPayload?.expiresAt);

  await classroom.getByRole('button', { name: 'Close Classroom Mode' }).click();
  await page.getByLabel('Search students').fill('zoe');
  await page.getByRole('button', { name: /Zoë Durand/ }).click();
  await page.getByRole('button', { name: 'Modo aula' }).click();
  const replacement = page.getByRole('dialog', { name: 'Safe classroom cards' });
  await replacement.getByRole('button', { name: /Zoe/ }).click();
  await replacement.getByRole('button', { name: 'Mostrar al alumno' }).click();
   const replacementUrl = await replacement.getByLabel('Show Student URL').inputValue();
   await viewer.reload();
  await expect(viewer.getByRole('heading', { name: 'El acceso ha finalizado' })).toBeVisible();
  await viewer.goto(replacementUrl);
  await expect(viewer.getByRole('heading', { name: 'Zoe' })).toBeVisible();

   await replacement.getByRole('button', { name: 'Finalizar acceso' }).click();
   await expect(page.getByRole('button', { name: 'Modo aula' })).toBeVisible();
  await expect(projection.getByText('VISTA TEMPORAL DEL ALUMNO', { exact: true })).toHaveCount(0);
  await expect(projection.getByRole('heading', { name: 'The room is ready for its next chapter.' })).toBeVisible();
   await expect(projection.locator('.show-student-overlay')).toHaveCount(0);
   await viewer.reload();
  await expect(viewer.getByRole('heading', { name: 'El acceso ha finalizado' })).toBeVisible();
  await projection.reload();
  await expect(projection.getByRole('heading', { name: 'The room is ready for its next chapter.' })).toBeVisible();

  await viewer.route('**/api/v1/show-student', async route => { await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ message: 'Not found.' }) }); });
  await viewer.goto('/#/show-student');
  await expect(viewer.getByRole('heading', { name: 'El acceso ha finalizado' })).toBeVisible();
  await projection.close();
  await viewer.close();
});
