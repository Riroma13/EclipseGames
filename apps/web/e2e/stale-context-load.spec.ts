import { expect, test, type Page } from '@playwright/test';

const credentials = { email: 'teacher@example.test', password: 'change-me-in-development' };

type StudentInput = { realName: string; alias: string; avatar: string; specialty?: string };

async function teacherHeaders(page: Page) {
  const login = await page.request.post('/api/v1/auth/session', { data: credentials });
  expect(login.status()).toBe(204);
  const cookie = login.headers()['set-cookie']?.split(';')[0];
  return cookie ? { cookie } : undefined;
}

async function seedTwoGroups(page: Page, suffix: string, secondStudents: StudentInput[]) {
  const headers = await teacherHeaders(page);
  const year = await page.request.post('/api/v1/academic-years', { headers, data: { label: `Stale state ${suffix}`, startsOn: '1900-09-01', endsOn: '1901-07-01' } });
  expect(year.status()).toBe(200);
  const yearId = (await year.json()).id as string;
  const firstGroup = await page.request.post(`/api/v1/academic-years/${yearId}/groups`, { headers, data: { name: `First group ${suffix}` } });
  expect(firstGroup.status()).toBe(200);
  const firstGroupId = (await firstGroup.json()).id as string;
  const secondGroup = await page.request.post(`/api/v1/academic-years/${yearId}/groups`, { headers, data: { name: `Second group ${suffix}` } });
  expect(secondGroup.status()).toBe(200);
  const secondGroupId = (await secondGroup.json()).id as string;
  const firstStudents = await page.request.post(`/api/v1/groups/${firstGroupId}/students`, { headers, data: { students: [{ realName: 'First Group Student', alias: 'First', avatar: 'default', specialty: 'Leader' }, { realName: 'Another First Student', alias: 'Another', avatar: 'fox', specialty: 'Analyst' }] } });
  expect(firstStudents.status()).toBe(200);
  if (secondStudents.length) {
    const students = await page.request.post(`/api/v1/groups/${secondGroupId}/students`, { headers, data: { students: secondStudents } });
    expect(students.status()).toBe(200);
  }
  return { headers, yearId, firstGroupId, secondGroupId };
}

async function signIn(page: Page, target: string) {
  await page.goto(target);
  if (await page.getByLabel('Email').count()) {
    await page.getByLabel('Email').fill(credentials.email);
    await page.getByLabel('Password').fill(credentials.password);
    await page.getByRole('button', { name: 'Sign in' }).click();
  }
}

test('failed Workspace group refresh removes the previous roster and retries cleanly', async ({ page }) => {
  const { yearId, firstGroupId, secondGroupId } = await seedTwoGroups(page, `${Date.now()}-workspace`, [{ realName: 'Second Group Student', alias: 'Second', avatar: 'default', specialty: 'Helper' }]);
  let secondGroupReads = 0;
  await page.route(`**/api/v1/groups/${secondGroupId}/students*`, async route => {
    secondGroupReads += 1;
    if (secondGroupReads === 1) {
      await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Temporary roster failure.' }) });
      return;
    }
    await route.continue();
  });

  await signIn(page, `/#/workspace?year=${yearId}&group=${firstGroupId}`);
  await expect(page.getByRole('button', { name: /First Group Student/ })).toBeVisible();
  await page.getByRole('combobox', { name: 'Group' }).selectOption(secondGroupId);
  await expect(page.getByRole('alert')).toContainText('Could not load students. Try again.');
  await expect(page.getByRole('button', { name: /First Group Student/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Second Group Student/ })).toHaveCount(0);

  await page.getByRole('alert').getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.getByRole('button', { name: /Second Group Student/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /First Group Student/ })).toHaveCount(0);
  expect(secondGroupReads).toBeGreaterThan(1);
});

test('failed Minigames group refresh removes the previous session and library without stale display status', async ({ page }) => {
  const { headers, yearId, firstGroupId, secondGroupId } = await seedTwoGroups(page, `${Date.now()}-minigames`, []);
  const presetTitle = `Old group preset ${Date.now()}`;
  const deckTitle = `Old group deck ${Date.now()}`;
  const sessionTitle = `Old group session ${Date.now()}`;
  const preset = await page.request.post('/api/v1/minigame-presets', { headers, data: { title: presetTitle, prompt: 'Use the old prompt.', durationSeconds: 30 } });
  expect(preset.status()).toBe(201);
  const deck = await page.request.post('/api/v1/prompt-decks', { headers, data: { title: deckTitle, prompts: ['Use the first old prompt.', 'Use the second old prompt.'] } });
  expect(deck.status()).toBe(201);
  const session = await page.request.post(`/api/v1/groups/${firstGroupId}/minigames/random-draw`, { headers, data: { title: sessionTitle } });
  expect(session.status()).toBe(201);

  let secondGroupReads = 0;
  await page.route(`**/api/v1/groups/${secondGroupId}/minigames/current`, async route => {
    secondGroupReads += 1;
    if (secondGroupReads === 1) {
      await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Temporary activity failure.' }) });
      return;
    }
    await route.continue();
  });

  await signIn(page, `/#/minigames?year=${yearId}&group=${firstGroupId}`);
  await expect(page.getByRole('heading', { name: sessionTitle, exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: presetTitle, exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: deckTitle, exact: true })).toBeVisible();

  await page.getByRole('combobox', { name: 'Group' }).selectOption(secondGroupId);
  await expect(page.getByRole('alert')).toContainText('Could not load the activity desk.');
  await expect(page.getByRole('heading', { name: sessionTitle, exact: true })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: presetTitle, exact: true })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: deckTitle, exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Choose Team Draw', exact: true }).click();
  await expect(page.getByText('Needs 2 students', { exact: true })).toBeVisible();
  await expect(page.locator('.context-display-control')).toContainText('Idle');
  await expect(page.locator('.context-display-control')).not.toContainText(sessionTitle);
  await expect(page.getByRole('button', { name: 'Clear display', exact: true })).toHaveCount(0);

  await page.getByRole('alert').getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.getByRole('heading', { name: sessionTitle, exact: true })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: presetTitle, exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: deckTitle, exact: true })).toBeVisible();
  expect(secondGroupReads).toBeGreaterThan(1);
});

test('rapid year switching ignores a delayed old group and keeps the canonical classroom context', async ({ page }) => {
  const oldYearId = '00000000-0000-4000-8000-000000000401';
  const newYearId = '00000000-0000-4000-8000-000000000402';
  const oldGroupId = '00000000-0000-4000-8000-000000000403';
  const newGroupId = '00000000-0000-4000-8000-000000000404';
  let releaseOldGroups!: () => void;
  const oldGroupsReleased = new Promise<void>(resolve => { releaseOldGroups = resolve; });

  await page.route('**/api/v1/academic-years*', async route => {
    if (!new URL(route.request().url()).pathname.endsWith('/academic-years')) return route.continue();
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([
      { id: oldYearId, label: 'Old year', startsOn: '1900-09-01', endsOn: '1901-07-01', archivedAt: null },
      { id: newYearId, label: 'New year', startsOn: '1901-09-01', endsOn: '1902-07-01', archivedAt: null },
    ]) });
  });
  await page.route(`**/api/v1/academic-years/${oldYearId}/groups`, async route => {
    await oldGroupsReleased;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: oldGroupId, academicYearId: oldYearId, name: 'Old classroom' }]) });
  });
  await page.route(`**/api/v1/academic-years/${newYearId}/groups`, async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: newGroupId, academicYearId: newYearId, name: 'New classroom' }]) });
  });
  await page.route(`**/api/v1/groups/${newGroupId}/students*`, async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: '00000000-0000-4000-8000-000000000405', groupId: newGroupId, realName: 'New Student', alias: 'New', avatar: 'default', specialty: null, archivedAt: null }]) });
  });

  await signIn(page, `/#/workspace?year=${oldYearId}&group=${oldGroupId}`);
  await page.getByRole('combobox', { name: 'Academic year' }).selectOption(newYearId);
  await expect(page.getByText('New Student')).toBeVisible();
  await expect(page.getByText('New year · New classroom')).toBeVisible();
  expect(new URL(page.url()).hash).toBe(`#/workspace?year=${newYearId}&group=${newGroupId}`);

  releaseOldGroups();
  await expect(page.getByText('New year · New classroom')).toBeVisible();
  await expect(page.getByText('Old classroom')).toHaveCount(0);
  await page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: /^Events\b/ }).click();
  await expect(page.getByRole('heading', { name: 'Events', exact: true })).toBeVisible();
  expect(new URL(page.url()).hash).toBe(`#/events?year=${newYearId}&group=${newGroupId}`);
});

test('delayed old academic-year response cannot overwrite a later hash destination', async ({ page }) => {
  const oldYearId = '00000000-0000-4000-8000-000000000411';
  const newYearId = '00000000-0000-4000-8000-000000000412';
  const newGroupId = '00000000-0000-4000-8000-000000000413';
  let releaseOldYears!: () => void;
  const oldYearsReleased = new Promise<void>(resolve => { releaseOldYears = resolve; });
  let yearReads = 0;

  await page.route('**/api/v1/academic-years*', async route => {
    if (!new URL(route.request().url()).pathname.endsWith('/academic-years')) return route.continue();
    yearReads += 1;
    if (yearReads === 1) await oldYearsReleased;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: yearReads === 1 ? oldYearId : newYearId, label: yearReads === 1 ? 'Old year' : 'New year', startsOn: '1900-09-01', endsOn: '1901-07-01', archivedAt: null }]) });
  });
  await page.route(`**/api/v1/academic-years/${newYearId}/groups`, async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: newGroupId, academicYearId: newYearId, name: 'Destination classroom' }]) });
  });

  await signIn(page, `/#/workspace?year=${oldYearId}`);
  await page.goto(`/#/events?year=${newYearId}&group=${newGroupId}`);
  await expect(page.getByRole('heading', { name: 'Events', exact: true })).toBeVisible();
  releaseOldYears();
  await expect(page.getByRole('combobox', { name: 'Academic year' })).toHaveValue(newYearId);
  expect(new URL(page.url()).hash).toBe(`#/events?year=${newYearId}&group=${newGroupId}`);
});
