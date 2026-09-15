import { expect, test, type Page } from '@playwright/test';
import type { TeacherAvatarDto } from '@eclipse/contracts';

const credentials = { email: 'teacher@example.test', password: 'change-me-in-development' };

async function seedRoster(page: Page) {
  const login = await page.request.post('/api/v1/auth/session', { data: credentials });
  expect(login.status()).toBe(204);
  const cookie = login.headers()['set-cookie']?.split(';')[0];
  const headers = cookie ? { cookie } : undefined;
  const suffix = `${Date.now()}-avatar-core`;
  const year = await page.request.post('/api/v1/academic-years', { headers, data: { label: `Avatar ${suffix}`, startsOn: '1900-09-01', endsOn: '1901-07-01' } });
  expect(year.status()).toBe(200);
  const yearId = (await year.json()).id as string;
  const group = await page.request.post(`/api/v1/academic-years/${yearId}/groups`, { headers, data: { name: `Avatar ${suffix}` } });
  expect(group.status()).toBe(200);
  const groupId = (await group.json()).id as string;
  const students = await page.request.post(`/api/v1/groups/${groupId}/students`, { headers, data: { students: [{ realName: 'Avatar Private Name', alias: 'Avatar Agent', specialty: 'Analyst' }] } });
  expect(students.status()).toBe(200);
  return { yearId, groupId, studentId: (await students.json())[0].id as string, headers };
}

async function signIn(page: Page, url: string) {
  await page.goto(url);
  if (await page.getByLabel('Email').count()) {
    await page.getByLabel('Email').fill(credentials.email);
    await page.getByLabel('Password').fill(credentials.password);
    await page.getByRole('button', { name: 'Sign in' }).click();
  }
  await expect(page.locator('header.workspace-header').getByRole('heading')).toBeVisible();
}

test('M7 teacher avatar journey persists, restores, recovers stale state, and keeps Projection private', async ({ page }) => {
  const { yearId, groupId, studentId, headers } = await seedRoster(page);
  await signIn(page, `/#/workspace?year=${yearId}&group=${groupId}`);

  await page.getByRole('button', { name: /Avatar Private Name/ }).click();
  await expect(page.getByRole('heading', { name: 'Avatar Private Name' })).toBeVisible();
  const avatar = page.locator('.avatar-workflow');
  await expect(avatar).toContainText('Avatar del agente');
  await avatar.getByRole('button', { name: 'Personalizar avatar' }).click();
  await avatar.getByLabel('Rostro').selectOption('face-fox');
  await avatar.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(avatar.locator('.avatar-face-fox')).toBeVisible();

  await page.reload();
  await expect(page.locator('.avatar-workflow .avatar-face-fox')).toBeVisible();

  await page.locator('.avatar-workflow').getByRole('button', { name: 'Personalizar avatar' }).click();
  await page.locator('.avatar-workflow').getByLabel('Rostro').selectOption('face-owl');
  await page.locator('.avatar-workflow').getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(page.locator('.avatar-workflow .avatar-face-owl')).toBeVisible();

  const history = page.locator('.avatar-history');
  await history.getByText('Historial del avatar').click();
  await history.getByRole('combobox', { name: 'Versión a restaurar' }).selectOption('2');
  await page.getByLabel('Motivo').fill('Restaurar la configuración anterior');
  await history.getByRole('button', { name: 'Restaurar esta versión' }).click();
  await expect(page.locator('.avatar-workflow .avatar-face-fox')).toBeVisible();

  const currentResponse = await page.request.get(`/api/v1/students/${studentId}/avatar?academicYearId=${yearId}`, { headers });
  expect(currentResponse.status()).toBe(200);
  const current = (await currentResponse.json()) as TeacherAvatarDto;
  const external = await page.request.put(`/api/v1/students/${studentId}/avatar?academicYearId=${yearId}`, {
    headers: { ...headers, 'content-type': 'application/json', 'Idempotency-Key': crypto.randomUUID() },
    data: { expectedRevision: current.revision, profile: { ...current.profile, faceId: 'face-wolf' } },
  });
  expect(external.status()).toBe(200);

  await page.locator('.avatar-workflow').getByRole('button', { name: 'Personalizar avatar' }).click();
  await page.locator('.avatar-workflow').getByLabel('Rostro').selectOption('face-cat');
  await page.locator('.avatar-workflow').getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(page.locator('.avatar-workflow').getByRole('alert')).toContainText('El avatar cambió en otra sesión. Recarga antes de guardar.');
  await page.reload();
  await expect(page.locator('.avatar-workflow .avatar-face-wolf')).toBeVisible();

  await page.getByRole('link', { name: 'Open Classroom Preview' }).click();
  await expect(page.getByRole('heading', { name: 'The room is ready for its next chapter.' })).toBeVisible();
  await expect(page.locator('body')).not.toContainText(/Avatar Private Name|Historial del avatar|annualEffectiveXp|exact XP|XP exacto/i);
});
