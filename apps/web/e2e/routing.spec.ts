import { expect, test, type Page } from '@playwright/test';

const credentials = { email: 'teacher@example.test', password: 'change-me-in-development' };

async function seedRoutingClassroom(page: Page, suffix: string) {
  const login = await page.request.post('/api/v1/auth/session', { data: credentials });
  expect(login.status()).toBe(204);
  const cookie = login.headers()['set-cookie']?.split(';')[0];
  const headers = cookie ? { cookie } : undefined;
  const yearLabel = `Routing year ${suffix}`;
  const groupName = `Routing group ${suffix}`;
  const year = await page.request.post('/api/v1/academic-years', { headers, data: { label: yearLabel, startsOn: '1900-09-01', endsOn: '1901-07-01' } });
  expect(year.status()).toBe(200);
  const yearId = (await year.json()).id as string;
  const group = await page.request.post(`/api/v1/academic-years/${yearId}/groups`, { headers, data: { name: groupName } });
  expect(group.status()).toBe(200);
  const groupId = (await group.json()).id as string;
  const students = await page.request.post(`/api/v1/groups/${groupId}/students`, { headers, data: { students: [{ realName: 'Routing Student One', alias: 'Route One', avatar: 'default', specialty: 'Leader' }, { realName: 'Routing Student Two', alias: 'Route Two', avatar: 'fox', specialty: 'Analyst' }] } });
  expect(students.status()).toBe(200);
  return { yearId, groupId, yearLabel, groupName };
}

function expectedHash(route: string, yearId: string, groupId: string) {
  return `#/${route ? `${route}?` : '?'}year=${encodeURIComponent(yearId)}&group=${encodeURIComponent(groupId)}`;
}

function primaryNav(page: Page, label: string) {
  return page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: new RegExp(`^${label}\\b`) });
}

function unmatchedRouteMessages(messages: Array<{ type: string; text: string }>) {
  return messages.filter(message => message.text.includes('No routes matched location'));
}

async function expectTeacherDestination(page: Page, messages: Array<{ type: string; text: string }>, route: string, heading: string, yearId: string, groupId: string, groupName: string, yearLabel: string) {
  const expected = expectedHash(route, yearId, groupId);
  await expect.poll(async () => ({
    hash: await page.evaluate(() => window.location.hash),
    heading: await page.getByRole('heading', { name: heading, exact: true }).count(),
    unmatchedRouteWarnings: unmatchedRouteMessages(messages).length,
  }), { timeout: 3_000 }).toEqual({ hash: expected, heading: 1, unmatchedRouteWarnings: 0 });
  const context = page.locator('.context-bar-heading, .workspace-context').filter({ hasText: groupName });
  await expect(context).toContainText(yearLabel);
}

test('authenticated classroom navigation keeps canonical routes and context through the teacher journey', async ({ page }) => {
  const consoleMessages: Array<{ type: string; text: string }> = [];
  page.on('console', message => consoleMessages.push({ type: message.type(), text: message.text() }));
  const { yearId, groupId, yearLabel, groupName } = await seedRoutingClassroom(page, `${Date.now()}`);

  await page.goto('/');
  if (await page.getByLabel('Email').count()) {
    await page.getByLabel('Email').fill(credentials.email);
    await page.getByLabel('Password').fill(credentials.password);
    await page.getByRole('button', { name: 'Sign in' }).click();
  }
  await expect(page.getByRole('heading', { name: 'Command Center' })).toBeVisible();

  await page.getByRole('combobox', { name: 'Academic year' }).selectOption(yearId);
  const groupSelect = page.getByRole('combobox', { name: 'Group' });
  await expect(groupSelect.locator('option').filter({ hasText: groupName })).toHaveCount(1);
  await groupSelect.selectOption(groupId);
  await expect(page.locator('.context-bar-heading')).toContainText(groupName);
  await expect.poll(() => new URL(page.url()).hash).toBe(expectedHash('', yearId, groupId));

  const enterClassroom = page.getByRole('link', { name: 'Enter Classroom', exact: true });
  await expect(enterClassroom).toHaveAttribute('href', `/#/workspace?year=${yearId}&group=${groupId}`);
  await enterClassroom.click();
  await expectTeacherDestination(page, consoleMessages, 'workspace', 'Classroom workspace', yearId, groupId, groupName, yearLabel);
  await expect(page.getByRole('button', { name: /Routing Student One/ })).toBeVisible();

  await primaryNav(page, 'Home').click();
  await expectTeacherDestination(page, consoleMessages, '', 'Command Center', yearId, groupId, groupName, yearLabel);

  const newEvent = page.locator('.quick-launch').getByRole('link', { name: /New Event/ });
  await expect(newEvent).toHaveAttribute('href', `/#/events?year=${yearId}&group=${groupId}&new=1`);
  await newEvent.click();
  await expect(page.getByRole('heading', { name: 'Events', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'No events yet', exact: true })).toBeVisible();
  await expect(page.locator('#event-title')).toBeVisible();
  expect(new URL(page.url()).hash).toBe(`#/events?year=${yearId}&group=${groupId}&new=1`);

  await primaryNav(page, 'Events').click();
  await expectTeacherDestination(page, consoleMessages, 'events', 'Events', yearId, groupId, groupName, yearLabel);

  await primaryNav(page, 'Challenges').click();
  await expectTeacherDestination(page, consoleMessages, 'challenges', 'Challenges', yearId, groupId, groupName, yearLabel);

  await primaryNav(page, 'Minigames').click();
  await expectTeacherDestination(page, consoleMessages, 'minigames', 'Minigames', yearId, groupId, groupName, yearLabel);

  const classroomRail = primaryNav(page, 'Classroom');
  await classroomRail.click();
  await expectTeacherDestination(page, consoleMessages, 'workspace', 'Classroom workspace', yearId, groupId, groupName, yearLabel);
  await expect(primaryNav(page, 'Classroom')).toHaveAttribute('href', `/#/workspace?year=${yearId}&group=${groupId}`);
  await expect(page.getByRole('button', { name: /Routing Student One/ })).toBeVisible();

  const preview = page.getByRole('link', { name: 'Open Classroom Preview' });
  await expect(preview).toHaveAttribute('href', `/#/projection?group=${groupId}`);
  await preview.click();
  await expect(page.getByRole('heading', { name: 'The room is ready for its next chapter.' })).toBeVisible();
  await expect(page.locator('.display-context')).toContainText(groupName);
  await expect(page.getByText('Route One', { exact: true })).toBeVisible();
  expect(new URL(page.url()).hash).toBe(`#/projection?group=${groupId}`);

  expect(unmatchedRouteMessages(consoleMessages)).toEqual([]);
});

test('initial event creation is cleared when the requested classroom falls back', async ({ page }) => {
  await page.goto('/#/events?year=00000000-0000-4000-8000-000000000901&group=00000000-0000-4000-8000-000000000902&new=1');
  if (await page.getByLabel('Email').count()) {
    await page.getByLabel('Email').fill(credentials.email);
    await page.getByLabel('Password').fill(credentials.password);
    await page.getByRole('button', { name: 'Sign in' }).click();
  }

  await expect(page.getByRole('heading', { name: 'Events', exact: true })).toBeVisible();
  await expect(page.locator('#event-title')).toHaveCount(0);
});
