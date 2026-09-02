import { expect, test, type Page } from '@playwright/test';

const credentials = { email: 'teacher@example.test', password: 'change-me-in-development' };

async function seedClassroom(page: Page, suffix: string) {
  const login = await page.request.post('/api/v1/auth/session', { data: credentials });
  expect(login.status()).toBe(204);
  const cookie = login.headers()['set-cookie']?.split(';')[0];
  const headers = cookie ? { cookie } : undefined;
  const year = await page.request.post('/api/v1/academic-years', { headers, data: { label: `Expansion ${suffix}`, startsOn: '1900-09-01', endsOn: '1901-07-01' } });
  expect(year.status()).toBe(200);
  const yearId = (await year.json()).id as string;
  const group = await page.request.post(`/api/v1/academic-years/${yearId}/groups`, { headers, data: { name: `Expansion group ${suffix}` } });
  expect(group.status()).toBe(200);
  const groupId = (await group.json()).id as string;
  const students = await page.request.post(`/api/v1/groups/${groupId}/students`, { headers, data: { students: [{ realName: 'Expansion Student One', alias: 'One', avatar: 'default', specialty: 'Leader' }, { realName: 'Expansion Student Two', alias: 'Two', avatar: 'fox', specialty: 'Analyst' }] } });
  expect(students.status()).toBe(200);
  return { yearId, groupId };
}

function route(path: string, yearId: string, groupId: string) {
  return `/#/${path}?year=${encodeURIComponent(yearId)}&group=${encodeURIComponent(groupId)}`;
}

async function signIn(page: Page, target: string) {
  await page.goto(target);
  if (await page.getByLabel('Email').count()) {
    await page.getByLabel('Email').fill(credentials.email);
    await page.getByLabel('Password').fill(credentials.password);
    await page.getByRole('button', { name: 'Sign in' }).click();
  }
}

test('teacher can grant and correct a manual Eclipse Point', async ({ page }) => {
  const { yearId, groupId } = await seedClassroom(page, `${Date.now()}-manual-point`);

  await signIn(page, route('workspace', yearId, groupId));
  await expect(page.getByRole('heading', { name: 'Classroom workspace', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Expansion Student One, One, Leader', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Expansion Student One', exact: true })).toBeVisible();
  await page.locator('.coin-action-details > summary').click();

  const balance = page.getByLabel('Eclipse Points balance');
  const manualPoints = page.getByRole('region', { name: 'Manual Eclipse Points' });
  await expect(balance).toHaveText('0 points');
  await manualPoints.getByRole('button', { name: /^Personal improvement\b/ }).click();
  await expect(page.getByText('Personal improvement point granted.', { exact: true })).toBeVisible();
  await expect(balance).toHaveText('1 points');

  await manualPoints.locator('summary').filter({ hasText: 'Recent manual points' }).click();
  await expect(manualPoints.getByRole('button', { name: 'Correct', exact: true })).toHaveCount(1);
  await manualPoints.getByRole('button', { name: 'Correct', exact: true }).click();
  await expect(page.getByText('Point correction recorded.', { exact: true })).toBeVisible();
  await expect(balance).toHaveText('0 points');
  await expect(manualPoints.getByText('Corrected', { exact: true })).toBeVisible();
  await expect(manualPoints.getByRole('button', { name: 'Correct', exact: true })).toHaveCount(0);
});

test('teacher can pause a challenge and lead Prompt Deck and Team Draw sessions', async ({ page }) => {
  const { yearId, groupId } = await seedClassroom(page, `${Date.now()}-tools`);

  await signIn(page, route('challenges', yearId, groupId));
  await expect(page.getByRole('heading', { name: 'Challenges', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'New Challenge', exact: true }).click();
  await page.locator('#challenge-title').fill('Expansion Challenge');
  await page.locator('#challenge-description').fill('Build the shared objective.');
  await page.getByLabel('Target preset').selectOption('10');
  await expect(page.locator('#challenge-target')).toHaveValue('10');
  await page.getByRole('button', { name: 'Save challenge', exact: true }).click();
  await page.getByRole('button', { name: 'Start challenge', exact: true }).click();
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Resume challenge', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Resume challenge', exact: true }).click();
  await expect(page.getByText('Challenge resumed.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Clear display', exact: true })).toBeVisible();
  await expect(page.getByText('Clear hides every scene; events and challenges stay live, minigames end.')).toBeVisible();
  await page.getByRole('button', { name: 'Clear display', exact: true }).click();
  await expect(page.locator('.context-display-control')).toContainText('Idle');

  await page.goto(route('minigames', yearId, groupId));
  await expect(page.getByRole('heading', { name: 'Minigames', exact: true })).toBeVisible();
  await page.getByRole('region', { name: 'Decks' }).getByRole('button', { name: 'New deck', exact: true }).click();
  await page.locator('#deck-title').fill('Expansion Prompts');
  await page.locator('#deck-prompts').fill('First prompt.\nSecond prompt.\nThird prompt.');
  await page.getByRole('button', { name: 'Save deck', exact: true }).click();
  await expect(page.getByText('Prompt deck saved.')).toBeVisible();
  await page.getByRole('button', { name: 'Choose Prompt Deck', exact: true }).click();
  await page.locator('.prompt-deck-choice').filter({ hasText: 'Expansion Prompts' }).first().getByRole('button', { name: 'Launch', exact: true }).click();
  await expect(page.getByText('Prompt 1 of 3')).toBeVisible();
  const hiddenProjection = await page.evaluate(async id => {
    const response = await fetch(`/api/v1/projection/groups/${id}/display`);
    return { status: response.status, body: await response.json() };
  }, groupId);
  expect(hiddenProjection.status).toBe(200);
  const hiddenProjectionBody = hiddenProjection.body;
  expect(hiddenProjectionBody.minigame).toMatchObject({ prompt: 'Prompt ready.', promptRevealed: false });
  expect(JSON.stringify(hiddenProjectionBody)).not.toContain('First prompt.');
  await page.getByRole('button', { name: 'Reveal current', exact: true }).click();
  await expect(page.getByText('Current prompt revealed.')).toBeVisible();
  const revealedProjection = await page.evaluate(async id => {
    const response = await fetch(`/api/v1/projection/groups/${id}/display`);
    return response.json();
  }, groupId);
  expect(revealedProjection.minigame).toMatchObject({ prompt: 'First prompt.', promptRevealed: true });
  await page.getByRole('button', { name: 'Next prompt', exact: true }).click();
  await expect(page.getByText('Prompt 2 of 3')).toBeVisible();
  await page.getByRole('button', { name: 'Random prompt', exact: true }).click();
  await expect(page.getByText('Random prompt ready.')).toBeVisible();
  await page.getByRole('button', { name: 'End game', exact: true }).click();
  await expect(page.getByText('Minigame ended.')).toBeVisible();

  await page.getByRole('button', { name: 'Choose Team Draw', exact: true }).click();
  await page.locator('#team-title').fill('Expansion Teams');
  await page.getByLabel('Number of teams').selectOption('2');
  await page.getByRole('button', { name: 'Create teams', exact: true }).click();
  await expect(page.getByText('Team 1', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Shuffle teams', exact: true }).click();
  await expect(page.getByText('Teams shuffled.')).toBeVisible();

  await page.goto(`/#/projection?group=${encodeURIComponent(groupId)}`);
  await expect(page.getByText('TEAM DRAW', { exact: true })).toBeVisible();
  await expect(page.getByText('One', { exact: true })).toBeVisible();
  await expect(page.getByText('Two', { exact: true })).toBeVisible();
  await expect(page.locator('body')).not.toContainText(/Expansion Student One|Expansion Student Two/);

  await page.goto(route('minigames', yearId, groupId));
  await expect(page.getByRole('button', { name: 'Clear display', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Clear display', exact: true }).click();
  await expect(page.locator('.context-display-control')).toContainText('Idle');
});

test('teacher can correct a completed challenge and reopen it', async ({ page }) => {
  const { yearId, groupId } = await seedClassroom(page, `${Date.now()}-challenge-correction`);

  await signIn(page, route('challenges', yearId, groupId));
  await expect(page.getByRole('heading', { name: 'Challenges', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'New Challenge', exact: true }).click();
  await page.locator('#challenge-title').fill('Correctable Challenge');
  await page.locator('#challenge-description').fill('Reach one contribution.');
  await page.locator('#challenge-target').fill('1');
  await page.getByRole('button', { name: 'Save challenge', exact: true }).click();
  await page.getByRole('button', { name: 'Start challenge', exact: true }).click();
  await page.getByRole('button', { name: '+1 Progress', exact: true }).click();
  await expect(page.getByText('Challenge complete — objective reached.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Correct −1 · reopen', exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Correct −1 · reopen', exact: true }).click();
  await expect(page.getByText('Challenge progress corrected.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '+1 Progress', exact: true })).toBeVisible();
});

test('event save and activate retry keeps the created event identity', async ({ page }) => {
  const { yearId, groupId } = await seedClassroom(page, `${Date.now()}-event-retry`);
  await signIn(page, route('events', yearId, groupId));
  await expect(page.getByRole('heading', { name: 'Events', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'New Event', exact: true }).click();
  await page.locator('#event-title').fill('Retry Event');
  await page.locator('#event-description').fill('A saved event with a retryable launch.');
  let activationAttempts = 0;
  await page.route('**/api/v1/events/*/activate', async routeValue => {
    activationAttempts += 1;
    if (activationAttempts === 1) {
      await routeValue.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ code: 'TEMPORARY_FAILURE', message: 'Activation temporarily unavailable.' }) });
      return;
    }
    await routeValue.continue();
  });
  await page.getByRole('button', { name: 'Save & activate', exact: true }).click();
  await expect(page.getByText('Event draft saved. Activation failed; retry activation.')).toBeVisible();
  await expect(page.locator('#event-title')).toHaveValue('Retry Event');
  await expect(page.getByRole('button', { name: 'Save & activate', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Save & activate', exact: true }).click();
  await expect(page.getByText('Event saved and activated.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Retry Event', exact: true })).toHaveCount(1);
});

test('expired French Sprint reconciles to the server terminal state', async ({ page }) => {
  const { yearId, groupId } = await seedClassroom(page, `${Date.now()}-sprint-expiry`);
  await signIn(page, route('minigames', yearId, groupId));
  await expect(page.getByRole('heading', { name: 'Minigames', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Choose French Sprint', exact: true }).click();
  let forceExpired = false;
  await page.route('**/api/v1/groups/*/minigames/current', async routeValue => {
    if (forceExpired) {
      await routeValue.fulfill({ status: 200, contentType: 'application/json', body: 'null' });
      return;
    }
    await routeValue.continue();
  });
  await page.locator('#sprint-title').fill('Expiring Sprint');
  await page.locator('#sprint-prompt').fill('Speak until the timer ends.');
  await page.getByRole('button', { name: 'Launch French Sprint', exact: true }).click();
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await expect(page.getByText('French Sprint started.')).toBeVisible();
  forceExpired = true;
  const browserNow = await page.evaluate(() => Date.now());
  await page.evaluate((value) => { Date.now = () => value + 31_000; }, browserNow);
  await expect(page.getByText('French Sprint ended when the timer reached zero.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Launch French Sprint', exact: true })).toBeEnabled();
});
