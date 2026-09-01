import { expect, test, type Page } from '@playwright/test';

const credentials = { email: 'teacher@example.test', password: 'change-me-in-development' };

async function seedClassroom(page: Page, suffix: string) {
  const login = await page.request.post('/api/v1/auth/session', { data: credentials });
  expect(login.status()).toBe(204);
  const cookie = login.headers()['set-cookie']?.split(';')[0];
  const headers = cookie ? { cookie } : undefined;
  const year = await page.request.post('/api/v1/academic-years', { headers, data: { label: `Gameplay ${suffix}`, startsOn: '1900-09-01', endsOn: '1901-07-01' } });
  expect(year.status()).toBe(200);
  const yearId = (await year.json()).id as string;
  const group = await page.request.post(`/api/v1/academic-years/${yearId}/groups`, { headers, data: { name: `Gameplay group ${suffix}` } });
  expect(group.status()).toBe(200);
  const groupId = (await group.json()).id as string;
  const students = await page.request.post(`/api/v1/groups/${groupId}/students`, { headers, data: { students: [{ realName: 'Smoke Student One', alias: 'One', avatar: 'default', specialty: 'Leader' }, { realName: 'Smoke Student Two', alias: 'Two', avatar: 'fox', specialty: 'Analyst' }] } });
  expect(students.status()).toBe(200);
  return { yearId, groupId };
}

function route(path: string, yearId: string, groupId: string) {
  return `/#/${path}?year=${encodeURIComponent(yearId)}&group=${encodeURIComponent(groupId)}`;
}

test('teacher can lead visible event, challenge, and minigame flows', async ({ page }) => {
  const { yearId, groupId } = await seedClassroom(page, `${Date.now()}`);

  await page.goto(route('events', yearId, groupId));
  await expect(page.getByRole('heading', { name: 'Events', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'New Event' }).click();
  await page.locator('#event-title').fill('Smoke Event');
  await page.locator('#event-description').fill('Use one complete sentence.');
  await page.getByRole('button', { name: 'Save & activate' }).click();
  await expect(page.getByText('Event saved and activated.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Smoke Event' })).toBeVisible();
  await page.getByRole('button', { name: 'Show on Classroom Preview' }).click();
  await expect(page.getByText('Visible on Classroom Preview')).toBeVisible();

  await page.goto(route('challenges', yearId, groupId));
  await expect(page.getByRole('heading', { name: 'Challenges' })).toBeVisible();
  await page.getByRole('button', { name: 'New Challenge' }).click();
  await page.locator('#challenge-title').fill('Smoke Challenge');
  await page.locator('#challenge-description').fill('Reach the shared target.');
  await page.locator('#challenge-target').fill('2');
  await page.getByRole('button', { name: 'Save challenge' }).click();
  await expect(page.getByText('Challenge saved as a draft.')).toBeVisible();
  await page.getByRole('button', { name: 'Start challenge' }).click();
  await expect(page.getByText('Challenge activated.')).toBeVisible();
  await page.getByRole('button', { name: '+1 Progress' }).click();
  await expect(page.getByText('Challenge progress: 1 / 2.')).toBeVisible();
  await page.getByRole('button', { name: /Correct/ }).click();
  await expect(page.getByText('Challenge progress corrected.')).toBeVisible();
  await page.getByRole('button', { name: '+1 Progress' }).click();
  await expect(page.getByText('Challenge progress: 1 / 2.')).toBeVisible();
  await page.getByRole('button', { name: '+1 Progress' }).click();
  await expect(page.getByText(/Challenge complete.*objective reached\./)).toBeVisible();
  await expect(page.getByText('2 / 2')).toBeVisible();

  await page.goto(route('minigames', yearId, groupId));
  await expect(page.getByRole('heading', { name: 'Minigames' })).toBeVisible();
  await page.locator('#draw-title').fill('Smoke Draw');
  await page.getByRole('button', { name: 'Launch Random Draw' }).click();
  await expect(page.getByText('Random Student Draw launched.')).toBeVisible();
  await page.getByRole('button', { name: 'Draw student' }).click();
  await expect(page.getByText('Student drawn.')).toBeVisible();
  await page.getByRole('button', { name: 'End game' }).click();
  await expect(page.getByText('Minigame ended.')).toBeVisible();

  await page.locator('#sprint-title').fill('Smoke Sprint');
  await page.locator('#sprint-prompt').fill('Describe the image.');
  await page.getByRole('button', { name: 'Launch French Sprint' }).click();
  await expect(page.getByText('French Sprint launched.')).toBeVisible();
  await page.getByRole('button', { name: 'Start' }).click();
  await expect(page.getByText('French Sprint started.')).toBeVisible();
  await page.getByRole('button', { name: 'Pause' }).click();
  await expect(page.getByText('French Sprint paused.')).toBeVisible();
  await page.getByRole('button', { name: 'End game' }).click();
  await expect(page.getByText('Minigame ended.')).toBeVisible();
});
