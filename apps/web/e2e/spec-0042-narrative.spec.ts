import { expect, test, type APIRequestContext } from '@playwright/test';
import { randomUUID } from 'node:crypto';

const credentials = { email: 'teacher@example.test', password: 'change-me-in-development' };
const keys = () => randomUUID();

type NarrativeState = {
  revision: number;
  currentTerm: 'T1' | 'T2' | 'T3';
  completedCount: number;
  archived: boolean;
  events: Array<{ key: string; state: 'BLOCKED' | 'AVAILABLE' | 'COMPLETED'; startedAt: string | null; mechanicId: string | null; clues: Array<{ text: string; revealed: boolean }> }>;
};

async function post(request: APIRequestContext, url: string, data: unknown, expected: number | number[] = 200) {
  const response = await request.post(url, { data });
  expect(Array.isArray(expected) ? expected : [expected]).toContain(response.status());
  return response;
}

async function narrative(request: APIRequestContext, groupId: string, yearId: string) {
  const response = await request.get(`/api/v1/groups/${groupId}/narrative?academicYearId=${yearId}`);
  expect(response.status()).toBe(200);
  return response.json() as Promise<NarrativeState>;
}

async function command(request: APIRequestContext, groupId: string, yearId: string, eventKey: string, action: string, state: NarrativeState, link?: { kind: 'CHALLENGE' | 'MINIGAME'; id: string }, idempotencyKey = keys()) {
  const response = await request.post(`/api/v1/groups/${groupId}/narrative/events/${eventKey}/${action}?academicYearId=${yearId}`, {
    headers: { 'Idempotency-Key': idempotencyKey },
    data: { expectedRevision: state.revision, ...(link ? { link } : {}) },
  });
  expect(response.status()).toBe(200);
  return { response, state: await response.json() as NarrativeState, idempotencyKey };
}

async function calendar(request: APIRequestContext, yearId: string, terms: Array<{ code: 'T1' | 'T2' | 'T3'; startsOn: string; endsOn: string }>) {
  const response = await request.put(`/api/v1/academic-years/${yearId}/calendar`, { data: { timezone: 'UTC', terms, holidays: [], slots: [] } });
  expect(response.status()).toBe(200);
}

async function createChallenge(request: APIRequestContext, groupId: string) {
  const created = await post(request, `/api/v1/groups/${groupId}/challenges`, { title: `Narrative challenge ${randomUUID()}`, description: 'Reconstruct the signal.', target: 1, showOnProjection: false }, 201);
  const challenge = await created.json() as { id: string };
  await post(request, `/api/v1/challenges/${challenge.id}/activate`, {});
  await post(request, `/api/v1/challenges/${challenge.id}/progress`, { delta: 1 });
  return challenge.id;
}

async function createEndedMinigame(request: APIRequestContext, groupId: string) {
  const created = await post(request, `/api/v1/groups/${groupId}/minigames/random-draw`, { title: `Narrative minigame ${randomUUID()}` }, 201);
  const minigame = await created.json() as { id: string };
  await post(request, `/api/v1/minigames/${minigame.id}/end`, {});
  return minigame.id;
}

test('SPEC-0042 T7 built artifact proves the complete teacher narrative journey', async ({ page }) => {
  const login = await page.request.post('/api/v1/auth/session', { data: credentials });
  expect(login.status()).toBe(204);

  const today = new Date().toISOString().slice(0, 10);
  const day = (offset: number) => new Date(Date.parse(`${today}T12:00:00Z`) + offset * 86_400_000).toISOString().slice(0, 10);
  const year = await post(page.request, '/api/v1/academic-years', { label: `Narrative ${randomUUID()}`, startsOn: day(-2), endsOn: day(30) });
  const yearId = (await year.json()).id as string;
  const group = await post(page.request, `/api/v1/academic-years/${yearId}/groups`, { name: `Narrative group ${randomUUID()}` });
  const groupId = (await group.json()).id as string;
  await post(page.request, `/api/v1/groups/${groupId}/students`, { students: [{ realName: 'Narrative private student', alias: 'Narrative student', specialty: 'Analyst' }] });
  await calendar(page.request, yearId, [
    { code: 'T1', startsOn: day(-2), endsOn: day(0) },
    { code: 'T2', startsOn: day(1), endsOn: day(10) },
    { code: 'T3', startsOn: day(11), endsOn: day(30) },
  ]);

  const route = `/#/narrative?year=${yearId}&group=${groupId}`;
  await page.goto(route);
  await expect(page.getByRole('heading', { name: 'Narrativa', exact: true })).toBeVisible();
  await expect(page.locator('.narrative-event.is-available')).toHaveCount(1);
  await expect(page.locator('.narrative-current').getByRole('heading', { name: 'El apagón', exact: true })).toBeVisible();
  await expect(page.locator('.narrative-event').nth(1)).toContainText('Bloqueado');

  const challengeId = await createChallenge(page.request, groupId);
  let state = await narrative(page.request, groupId, yearId);
  const started = await command(page.request, groupId, yearId, 't1_el_apagon', 'start', state);
  state = started.state;
  const firstReplay = await page.request.post(`/api/v1/groups/${groupId}/narrative/events/t1_el_apagon/start?academicYearId=${yearId}`, { headers: { 'Idempotency-Key': started.idempotencyKey }, data: { expectedRevision: 0 } });
  expect(firstReplay.status()).toBe(200);
  expect((await firstReplay.json()).revision).toBe(1);
  state = (await command(page.request, groupId, yearId, 't1_el_apagon', 'reveal-next-clue', state)).state;
  await page.goto(`/#/projection?year=${yearId}&group=${groupId}`);
  await expect(page.getByText('El apagón')).toBeVisible();
  const availableProjection = await (await page.request.get(`/api/v1/projection/groups/${groupId}/display`)).json() as { narrative: Record<string, unknown> | null };
  expect(availableProjection.narrative).toBeTruthy();
  expect(JSON.stringify(availableProjection.narrative)).not.toContain('La señal no llegó desde fuera');
  expect(JSON.stringify(availableProjection.narrative)).not.toContain('La coordenada apunta');

  await page.goto(route);
  state = await narrative(page.request, groupId, yearId);
  const blockedRequired = await page.request.post(`/api/v1/groups/${groupId}/narrative/events/t1_el_apagon/complete?academicYearId=${yearId}`, { headers: { 'Idempotency-Key': keys() }, data: { expectedRevision: state.revision } });
  expect(blockedRequired.status()).toBe(409);
  state = (await command(page.request, groupId, yearId, 't1_el_apagon', 'link', state, { kind: 'CHALLENGE', id: challengeId })).state;
  state = (await command(page.request, groupId, yearId, 't1_el_apagon', 'complete', state)).state;
  const completedProjection = await (await page.request.get(`/api/v1/projection/groups/${groupId}/display`)).json() as { narrative: Record<string, unknown> | null };
  expect(completedProjection.narrative).toEqual({ title: 'El mensaje', term: 'T1', ordinal: 2, completedCount: 1, totalCount: 9 });
  expect(JSON.stringify(completedProjection.narrative)).not.toContain('La coordenada apunta');

  state = (await command(page.request, groupId, yearId, 't1_el_mensaje', 'start', state)).state;
  state = (await command(page.request, groupId, yearId, 't1_el_mensaje', 'complete', state)).state;
  state = (await command(page.request, groupId, yearId, 't1_eclipse', 'start', state)).state;
  const noneLink = await page.request.post(`/api/v1/groups/${groupId}/narrative/events/t1_eclipse/link?academicYearId=${yearId}`, { headers: { 'Idempotency-Key': keys() }, data: { expectedRevision: state.revision, link: { kind: 'CHALLENGE', id: challengeId } } });
  expect(noneLink.status()).toBe(409);
  state = (await command(page.request, groupId, yearId, 't1_eclipse', 'complete', state)).state;
  expect(state.completedCount).toBe(3);

  let blockedTerm = await narrative(page.request, groupId, yearId);
  expect(blockedTerm.events[3].state).toBe('BLOCKED');
  await calendar(page.request, yearId, [
    { code: 'T1', startsOn: day(-2), endsOn: day(-1) },
    { code: 'T2', startsOn: day(0), endsOn: day(10) },
    { code: 'T3', startsOn: day(11), endsOn: day(30) },
  ]);
  state = await narrative(page.request, groupId, yearId);
  expect(state.currentTerm).toBe('T2');
  expect(state.events[3].state).toBe('AVAILABLE');
  state = (await command(page.request, groupId, yearId, 't2_el_expediente', 'start', state)).state;
  state = (await command(page.request, groupId, yearId, 't2_el_expediente', 'complete', state)).state;
  const minigameId = await createEndedMinigame(page.request, groupId);
  state = (await command(page.request, groupId, yearId, 't2_la_anomalia', 'start', state)).state;
  const missingLink = await page.request.post(`/api/v1/groups/${groupId}/narrative/events/t2_la_anomalia/complete?academicYearId=${yearId}`, { headers: { 'Idempotency-Key': keys() }, data: { expectedRevision: state.revision } });
  expect(missingLink.status()).toBe(409);
  state = (await command(page.request, groupId, yearId, 't2_la_anomalia', 'link', state, { kind: 'MINIGAME', id: minigameId })).state;
  state = (await command(page.request, groupId, yearId, 't2_la_anomalia', 'complete', state)).state;
  state = (await command(page.request, groupId, yearId, 't2_la_reunion', 'start', state)).state;
  state = (await command(page.request, groupId, yearId, 't2_la_reunion', 'complete', state)).state;

  await calendar(page.request, yearId, [
    { code: 'T1', startsOn: day(-2), endsOn: day(-2) },
    { code: 'T2', startsOn: day(-1), endsOn: day(-1) },
    { code: 'T3', startsOn: day(0), endsOn: day(30) },
  ]);
  state = await narrative(page.request, groupId, yearId);
  expect(state.currentTerm).toBe('T3');
  state = (await command(page.request, groupId, yearId, 't3_la_prueba', 'start', state)).state;
  state = (await command(page.request, groupId, yearId, 't3_la_prueba', 'complete', state)).state;
  const archiveMinigameId = await createEndedMinigame(page.request, groupId);
  state = (await command(page.request, groupId, yearId, 't3_el_archivo_eclipse', 'start', state)).state;
  state = (await command(page.request, groupId, yearId, 't3_el_archivo_eclipse', 'link', state, { kind: 'MINIGAME', id: archiveMinigameId })).state;
  state = (await command(page.request, groupId, yearId, 't3_el_archivo_eclipse', 'complete', state)).state;
  state = (await command(page.request, groupId, yearId, 't3_la_llamada', 'start', state)).state;
  state = (await command(page.request, groupId, yearId, 't3_la_llamada', 'complete', state)).state;
  expect(state.completedCount).toBe(9);

  const refreshedNarrativeResponse = page.waitForResponse(response => response.request().method() === 'GET' && response.url().endsWith(`/api/v1/groups/${groupId}/narrative?academicYearId=${yearId}`));
  await page.reload();
  const refreshedNarrative = await refreshedNarrativeResponse;
  expect(refreshedNarrative.status()).toBe(200);
  expect(await refreshedNarrative.json()).toMatchObject({ revision: 22, completedCount: 9 });
  await expect(page.getByText('9 de 9 escenas completadas')).toBeVisible();
  await page.reload();
  await expect(page.getByText('9 de 9 escenas completadas')).toBeVisible();
  await expect(page.locator('.narrative-event.is-completed')).toHaveCount(9);

  const archive = await page.request.post(`/api/v1/academic-years/${yearId}/archive`);
  expect(archive.status()).toBe(204);
  const archivedNarrativeResponse = page.waitForResponse(response => response.request().method() === 'GET' && response.url().endsWith(`/api/v1/groups/${groupId}/narrative?academicYearId=${yearId}`));
  await page.reload();
  const archivedNarrative = await archivedNarrativeResponse;
  expect(archivedNarrative.status()).toBe(200);
  expect(await archivedNarrative.json()).toMatchObject({ archived: true });
  await expect(page.getByText('9 de 9 escenas completadas')).toBeVisible();
  await expect(page.getByText('Año archivado — la narrativa es de solo lectura.')).toBeVisible();
  await expect(page.locator('.narrative-current button')).toHaveCount(0);
  await expect(page.locator('.narrative-controls')).toHaveCount(0);
});
