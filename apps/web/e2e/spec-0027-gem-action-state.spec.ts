import { expect, test } from '@playwright/test';

const credentials = { email: 'teacher@example.test', password: 'change-me-in-development' };

test('SPEC-0027 real built Fastify journey rehydrates ACTIVE and REVERSED gem state', async ({ page }) => {
  const login = await page.request.post('/api/v1/auth/session', { data: credentials });
  expect(login.status()).toBe(204);
  const cookie = login.headers()['set-cookie']?.split(';')[0];
  const headers = cookie ? { cookie } : undefined;
  const years = await page.request.get('/api/v1/academic-years', { headers });
  const year = (await years.json())[0] as { id: string };
  const groups = await page.request.get(`/api/v1/academic-years/${year.id}/groups`, { headers });
  const group = (await groups.json())[0] as { id: string };
  const students = await page.request.get(`/api/v1/groups/${group.id}/students`, { headers });
  const student = (await students.json())[2] as { id: string; realName: string };
  const contextResponse = await page.request.post('/api/v1/assessment-contexts', { headers, data: { groupId: group.id, name: `Action state ${Date.now()}` } });
  expect(contextResponse.status()).toBe(201);
  const context = await contextResponse.json() as { id: string };

  for (let index = 0; index < 4; index += 1) {
    const response = await page.request.post(`/api/v1/students/${student.id}/xp-evidence`, { headers: { ...headers, 'Idempotency-Key': `00000000-0000-4000-8000-${String(700 + index).padStart(12, '0')}` }, data: { category: 'COMMUNICATION', baseXp: 3 } });
    expect([200, 201]).toContain(response.status());
  }
  const balance = await page.request.get(`/api/v1/students/${student.id}/gems?academicYearId=${year.id}`, { headers });
  expect((await balance.json()).balances.EMERALD).toBeGreaterThanOrEqual(2);

  const url = `/#/workspace?year=${year.id}&group=${group.id}`;
  await page.goto(url);
  await page.getByRole('button', { name: new RegExp(student.realName) }).click();
  await expect.poll(() => page.url()).toContain(`student=${student.id}`);
  await expect(page.getByRole('heading', { name: student.realName })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Gemas' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Historial de monedas (solo lectura)' })).toBeVisible();
  await page.getByLabel('Puntuación').fill('8');
  await page.getByRole('button', { name: 'Otorgar recompensa' }).click();
  await expect(page.getByText('Guardado')).toBeVisible();
  await page.getByRole('button', { name: 'EMERALD · 2' }).click();
  await expect(page.getByText('Ya utilizada')).toBeVisible();
  await page.getByLabel('Motivo de reversión').fill('Teacher reversal');
  await page.getByRole('button', { name: 'Revertir' }).click();
  await expect(page.getByRole('region', { name: 'Gemas' }).getByText('Recompensa revertida')).toBeVisible();
  const activeState = await page.request.get(`/api/v1/students/${student.id}/gem-action-state?academicYearId=${year.id}&assessmentContextId=${context.id}`, { headers });
  const active = await activeState.json();
  expect(active.resultReward.state).toBe('ACTIVE');
  expect(active.advantageRedemption.state).toBe('REVERSED');

  await page.reload();
  await expect(page.getByText('Recompensa activa')).toBeVisible();
  const correctionReason = page.getByLabel('Motivo de corrección');
  await correctionReason.fill('Teacher correction');
  await page.getByRole('button', { name: 'Corregir recompensa' }).click();
  await expect(page.getByRole('region', { name: 'Gemas' }).getByText('Corrección aplicada')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('region', { name: 'Gemas' }).getByText('Corrección aplicada')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Gemas' }).getByText('Recompensa revertida')).toBeVisible();

  await page.route('**/api/v1/students/*/gem-action-state*', async route => { await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'temporary' }) }); });
  await page.reload();
  await expect(page.getByText('No se pudo cargar el estado. Reintentar')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Otorgar recompensa' })).toHaveCount(0);
  await page.unrouteAll();
  await page.getByRole('button', { name: /Reintentar/ }).first().click();
  await expect(page.getByText('Corrección aplicada')).toBeVisible();

  const archive = await page.request.post(`/api/v1/students/${student.id}/archive`, { headers });
  expect(archive.status()).toBe(204);
  const archivedRoster = await page.request.get(`/api/v1/groups/${group.id}/students?includeArchived=true`, { headers });
  expect((await archivedRoster.json()).find((value: { id: string }) => value.id === student.id).archivedAt).toBeTruthy();
  expect((await page.request.get(`/api/v1/students/${student.id}/gem-action-state?academicYearId=${year.id}&assessmentContextId=${context.id}`, { headers })).status()).toBe(200);
  expect((await page.request.post(`/api/v1/academic-years/${year.id}/archive`, { headers })).status()).toBe(204);
  await page.reload();
  await expect(page.getByText('Historical year — records are read-only.')).toBeVisible();
  await page.getByRole('button', { name: new RegExp(student.realName) }).click();
  await expect(page.getByRole('region', { name: 'Gemas' }).getByText('Este registro es de solo lectura.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Corregir recompensa' })).toHaveCount(0);
  await page.setViewportSize({ width: 800, height: 800 });
  await page.getByRole('button', { name: 'Cerrar ficha del estudiante' }).focus();
  await expect(page.getByRole('button', { name: 'Cerrar ficha del estudiante' })).toBeFocused();
});
