import { afterEach, describe, expect, it, vi } from 'vitest';
import { createServer } from '../../src/server.js';

const credentials = { email: 'teacher@example.test', password: 'correct horse battery staple' };
const origin = 'http://localhost:5173';
const apps: Awaited<ReturnType<typeof createServer>>[] = [];

afterEach(async () => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  for (const app of apps.splice(0)) await app.close();
});

async function authenticatedApp() {
  const app = createServer(':memory:', { logger: false, bootstrapTeacher: credentials });
  apps.push(app);
  const login = await app.inject({ method: 'POST', url: '/api/v1/auth/session', headers: { origin }, payload: credentials });
  expect(login.statusCode).toBe(204);
  return { app, headers: { origin, cookie: login.headers['set-cookie'] } };
}

async function classroom(app: Awaited<ReturnType<typeof createServer>>, headers: Record<string, unknown>, label: string) {
  const year = await app.inject({ method: 'POST', url: '/api/v1/academic-years', headers, payload: { label, startsOn: '2026-09-01', endsOn: '2027-07-01' } });
  expect(year.statusCode).toBe(200);
  const yearId = year.json().id as string;
  const group = await app.inject({ method: 'POST', url: `/api/v1/academic-years/${yearId}/groups`, headers, payload: { name: `${label} group` } });
  expect(group.statusCode).toBe(200);
  const groupId = group.json().id as string;
  const students = await app.inject({ method: 'POST', url: `/api/v1/groups/${groupId}/students`, headers, payload: { students: [{ realName: `${label} Student One`, alias: 'One', avatar: 'default', specialty: 'Leader' }, { realName: `${label} Student Two`, alias: 'Two', avatar: 'fox', specialty: 'Analyst' }] } });
  expect(students.statusCode).toBe(200);
  return { yearId, groupId, studentIds: students.json().map((student: { id: string }) => student.id) as string[] };
}

describe('classroom gameplay API lifecycle', () => {
  it('runs an event through draft, active, display, and completion states', async () => {
    const { app, headers } = await authenticatedApp();
    const { groupId } = await classroom(app, headers, 'Event lifecycle');
    const created = await app.inject({ method: 'POST', url: `/api/v1/groups/${groupId}/events`, headers: { ...headers, 'idempotency-key': '00000000-0000-4000-8000-000000000301' }, payload: { title: 'Speak French', description: 'Use one full sentence.', theme: 'MISSION', showOnProjection: false } });
    expect(created.statusCode).toBe(201);
    const eventId = created.json().id as string;
    expect(created.json()).toMatchObject({ status: 'DRAFT', showOnProjection: false, activatedAt: null, completedAt: null });

    const draftCompletion = await app.inject({ method: 'POST', url: `/api/v1/events/${eventId}/complete`, headers });
    expect(draftCompletion.statusCode).toBe(422);
    expect(draftCompletion.json()).toMatchObject({ code: 'VALIDATION_FAILED' });

    const activated = await app.inject({ method: 'POST', url: `/api/v1/events/${eventId}/activate`, headers });
    expect(activated.statusCode).toBe(200);
    expect(activated.json()).toMatchObject({ status: 'ACTIVE', activatedAt: expect.any(String) });
    const displayed = await app.inject({ method: 'POST', url: `/api/v1/events/${eventId}/display`, headers, payload: { visible: true } });
    expect(displayed.statusCode).toBe(200);
    expect(displayed.json()).toMatchObject({ status: 'ACTIVE', showOnProjection: true });

    const completed = await app.inject({ method: 'POST', url: `/api/v1/events/${eventId}/complete`, headers });
    expect(completed.statusCode).toBe(200);
    expect(completed.json()).toMatchObject({ status: 'COMPLETED', showOnProjection: false, completedAt: expect.any(String) });
    const repeatedCompletion = await app.inject({ method: 'POST', url: `/api/v1/events/${eventId}/complete`, headers });
    expect(repeatedCompletion.statusCode).toBe(422);
    const repeatedActivation = await app.inject({ method: 'POST', url: `/api/v1/events/${eventId}/activate`, headers });
    expect(repeatedActivation.statusCode).toBe(422);
  });

  it('tracks collective challenge progress, correction, and coherent completion', async () => {
    const { app, headers } = await authenticatedApp();
    const { groupId } = await classroom(app, headers, 'Challenge lifecycle');
    const created = await app.inject({ method: 'POST', url: `/api/v1/groups/${groupId}/challenges`, headers, payload: { title: 'French Only', description: 'Build a collective streak.', target: 3, showOnProjection: true } });
    expect(created.statusCode).toBe(201);
    const challengeId = created.json().id as string;

    const draftCompletion = await app.inject({ method: 'POST', url: `/api/v1/challenges/${challengeId}/complete`, headers });
    expect(draftCompletion.statusCode).toBe(422);
    const activated = await app.inject({ method: 'POST', url: `/api/v1/challenges/${challengeId}/activate`, headers });
    expect(activated.statusCode).toBe(200);
    expect(activated.json()).toMatchObject({ status: 'ACTIVE', progress: 0 });

    const incremented = await app.inject({ method: 'POST', url: `/api/v1/challenges/${challengeId}/progress`, headers, payload: { delta: 1 } });
    expect(incremented.json()).toMatchObject({ status: 'ACTIVE', progress: 1, target: 3 });
    const corrected = await app.inject({ method: 'POST', url: `/api/v1/challenges/${challengeId}/progress`, headers, payload: { delta: -1 } });
    expect(corrected.json()).toMatchObject({ status: 'ACTIVE', progress: 0, completedAt: null });
    const progressBeforeTargetCorrection = await app.inject({ method: 'POST', url: `/api/v1/challenges/${challengeId}/progress`, headers, payload: { delta: 1 } });
    expect(progressBeforeTargetCorrection.json()).toMatchObject({ status: 'ACTIVE', progress: 1 });

    const loweredTarget = await app.inject({ method: 'PATCH', url: `/api/v1/challenges/${challengeId}`, headers, payload: { title: 'French Only', description: 'Build a collective streak.', target: 1, showOnProjection: true } });
    expect(loweredTarget.statusCode).toBe(200);
    expect(loweredTarget.json()).toMatchObject({ status: 'COMPLETED', progress: 1, target: 1, completedAt: expect.any(String) });

    const reopened = await app.inject({ method: 'POST', url: `/api/v1/challenges/${challengeId}/progress`, headers, payload: { delta: -1 } });
    expect(reopened.json()).toMatchObject({ status: 'ACTIVE', progress: 0, completedAt: null });
    const reached = await app.inject({ method: 'POST', url: `/api/v1/challenges/${challengeId}/progress`, headers, payload: { delta: 1 } });
    expect(reached.json()).toMatchObject({ status: 'COMPLETED', progress: 1, target: 1, completedAt: expect.any(String) });
    const repeatedCompletion = await app.inject({ method: 'POST', url: `/api/v1/challenges/${challengeId}/complete`, headers });
    expect(repeatedCompletion.statusCode).toBe(422);
  });

  it('runs Random Student Draw and rejects every mutation after ending it', async () => {
    const { app, headers } = await authenticatedApp();
    const { groupId, studentIds } = await classroom(app, headers, 'Random draw lifecycle');
    const launched = await app.inject({ method: 'POST', url: `/api/v1/groups/${groupId}/minigames/random-draw`, headers, payload: { title: 'Next Voice' } });
    expect(launched.statusCode).toBe(201);
    const minigameId = launched.json().id as string;
    expect(launched.json()).toMatchObject({ kind: 'RANDOM_DRAW', status: 'READY', drawCount: 0, drawTotal: studentIds.length, selectedStudent: null });

    const drawn = await app.inject({ method: 'POST', url: `/api/v1/minigames/${minigameId}/draw`, headers });
    expect(drawn.statusCode).toBe(200);
    expect(studentIds).toContain(drawn.json().selectedStudent.id);
    expect(drawn.json()).toMatchObject({ status: 'READY', drawCount: 1 });
    const reset = await app.inject({ method: 'POST', url: `/api/v1/minigames/${minigameId}/reset`, headers });
    expect(reset.json()).toMatchObject({ status: 'READY', drawCount: 0, selectedStudent: null });

    const ended = await app.inject({ method: 'POST', url: `/api/v1/minigames/${minigameId}/end`, headers });
    expect(ended.statusCode).toBe(200);
    expect(ended.json()).toMatchObject({ status: 'ENDED', startedAt: null, pausedAt: null });
    expect((await app.inject({ method: 'GET', url: `/api/v1/groups/${groupId}/minigames/current`, headers })).json()).toBeNull();
    for (const action of ['draw', 'reset', 'start']) {
      const response = await app.inject({ method: 'POST', url: `/api/v1/minigames/${minigameId}/${action}`, headers });
      expect(response.statusCode).toBe(422);
      expect(response.json()).toMatchObject({ code: 'VALIDATION_FAILED' });
    }
  });

  it('advances concurrent Random Student Draw requests without duplicate selections', async () => {
    const { app, headers } = await authenticatedApp();
    const { groupId, studentIds } = await classroom(app, headers, 'Concurrent random draw');
    const launched = await app.inject({ method: 'POST', url: `/api/v1/groups/${groupId}/minigames/random-draw`, headers, payload: {} });
    const minigameId = launched.json().id as string;
    const draws = await Promise.all(studentIds.map(() => app.inject({ method: 'POST', url: `/api/v1/minigames/${minigameId}/draw`, headers })));
    expect(draws.every(response => response.statusCode === 200)).toBe(true);
    const selectedIds = draws.map(response => response.json().selectedStudent.id as string);
    expect(new Set(selectedIds)).toEqual(new Set(studentIds));
    expect((await app.inject({ method: 'GET', url: `/api/v1/groups/${groupId}/minigames/current`, headers })).json()).toMatchObject({ drawCount: studentIds.length, drawTotal: studentIds.length });
  });

  it('runs French Sprint, replaces the active session, and preserves terminal state', async () => {
    const { app, headers } = await authenticatedApp();
    const { groupId } = await classroom(app, headers, 'French sprint lifecycle');
    const launched = await app.inject({ method: 'POST', url: `/api/v1/groups/${groupId}/minigames/french-sprint`, headers, payload: { title: 'Sprint One', prompt: 'Describe the picture.', durationSeconds: 10 } });
    const minigameId = launched.json().id as string;
    const started = await app.inject({ method: 'POST', url: `/api/v1/minigames/${minigameId}/start`, headers });
    expect(started.json()).toMatchObject({ status: 'RUNNING', startedAt: expect.any(String) });
    const paused = await app.inject({ method: 'POST', url: `/api/v1/minigames/${minigameId}/pause`, headers });
    expect(paused.json()).toMatchObject({ status: 'PAUSED', startedAt: null, pausedAt: expect.any(String) });
    const resumed = await app.inject({ method: 'POST', url: `/api/v1/minigames/${minigameId}/resume`, headers });
    expect(resumed.json()).toMatchObject({ status: 'RUNNING', startedAt: expect.any(String), pausedAt: null });
    const reset = await app.inject({ method: 'POST', url: `/api/v1/minigames/${minigameId}/reset`, headers });
    expect(reset.json()).toMatchObject({ status: 'READY', remainingSeconds: 10, startedAt: null, pausedAt: null });
    await app.inject({ method: 'POST', url: `/api/v1/minigames/${minigameId}/start`, headers });
    const ended = await app.inject({ method: 'POST', url: `/api/v1/minigames/${minigameId}/end`, headers });
    expect(ended.json()).toMatchObject({ status: 'ENDED', startedAt: null, pausedAt: null });

    const replacement = await app.inject({ method: 'POST', url: `/api/v1/groups/${groupId}/minigames/french-sprint`, headers, payload: { title: 'Sprint Two', prompt: 'Answer quickly.', durationSeconds: 10 } });
    expect(replacement.statusCode).toBe(201);
    const random = await app.inject({ method: 'POST', url: `/api/v1/groups/${groupId}/minigames/random-draw`, headers, payload: {} });
    expect(random.statusCode).toBe(201);
    expect((await app.inject({ method: 'GET', url: `/api/v1/groups/${groupId}/minigames/current`, headers })).json()).toMatchObject({ id: random.json().id, kind: 'RANDOM_DRAW' });
    for (const action of ['start', 'reset']) {
      expect((await app.inject({ method: 'POST', url: `/api/v1/minigames/${replacement.json().id}/${action}`, headers })).statusCode).toBe(422);
    }
    await app.inject({ method: 'POST', url: `/api/v1/minigames/${random.json().id}/end`, headers });
  });

  it('expires a running sprint before current and projection reads can return it', async () => {
    const { app, headers } = await authenticatedApp();
    const { groupId } = await classroom(app, headers, 'Sprint expiry');
    const startTime = Date.now();
    const clock = vi.spyOn(Date, 'now').mockReturnValue(startTime);
    const launched = await app.inject({ method: 'POST', url: `/api/v1/groups/${groupId}/minigames/french-sprint`, headers, payload: { title: 'Expiring Sprint', prompt: 'Speak now.', durationSeconds: 10 } });
    const minigameId = launched.json().id as string;
    expect((await app.inject({ method: 'POST', url: `/api/v1/minigames/${minigameId}/start`, headers })).json()).toMatchObject({ status: 'RUNNING', remainingSeconds: 10 });

    clock.mockReturnValue(startTime + 12_000);
    const projection = await app.inject({ method: 'GET', url: `/api/v1/projection/groups/${groupId}/display`, headers });
    expect(projection.statusCode).toBe(200);
    expect(projection.json().minigame).toBeNull();
    const current = await app.inject({ method: 'GET', url: `/api/v1/groups/${groupId}/minigames/current`, headers });
    expect(current.statusCode).toBe(200);
    expect(current.json()).toBeNull();
    for (const action of ['start', 'reset']) {
      const response = await app.inject({ method: 'POST', url: `/api/v1/minigames/${minigameId}/${action}`, headers });
      expect(response.statusCode).toBe(422);
    }
  });
});
