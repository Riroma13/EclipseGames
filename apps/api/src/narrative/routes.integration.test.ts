import { afterEach, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createServer } from '../server.js';

const password = 'correct horse battery staple';
const key = () => randomUUID();

describe('SPEC-0042 T4 authenticated narrative API', () => {
  const apps: Array<Awaited<ReturnType<typeof createServer>>> = [];
  afterEach(async () => { for (const app of apps.splice(0)) await app.close(); });

  async function fixture(email = 'narrative-api@example.test') {
    const app = createServer(':memory:', { logger: false, bootstrapTeacher: { email, password } });
    apps.push(app);
    const login = await app.inject({ method: 'POST', url: '/api/v1/auth/session', payload: { email, password } });
    const headers = { cookie: String(login.headers['set-cookie']).split(';')[0] };
    const year = await app.inject({ method: 'POST', url: '/api/v1/academic-years', headers, payload: { label: 'Narrative year', startsOn: '2026-01-01', endsOn: '2026-12-31' } });
    const group = await app.inject({ method: 'POST', url: `/api/v1/academic-years/${year.json().id}/groups`, headers, payload: { name: 'Narrative group' } });
    return { app, headers, yearId: year.json().id as string, groupId: group.json().id as string };
  }

  it('requires authentication, resolves complete owned lineage, and returns a closed teacher DTO', async () => {
    const unauthenticated = createServer(':memory:', { logger: false });
    apps.push(unauthenticated);
    expect((await unauthenticated.inject({ method: 'GET', url: `/api/v1/groups/${randomUUID()}/narrative?academicYearId=${randomUUID()}` })).statusCode).toBe(401);

    const { app, headers, groupId, yearId } = await fixture();
    const state = await app.inject({ method: 'GET', url: `/api/v1/groups/${groupId}/narrative?academicYearId=${yearId}`, headers });
    expect(state.statusCode).toBe(200);
    expect(state.headers['cache-control']).toBe('no-store');
    expect(state.json()).toMatchObject({ revision: 0, completedCount: 0, archived: false });
    expect(Object.keys(state.json())).toEqual(['revision', 'currentTerm', 'completedCount', 'archived', 'events']);
    expect(state.json().events).toHaveLength(9);
    expect(state.body).not.toContain('narrative_command_requests');
    expect(state.body).not.toContain('fingerprint');

    const foreign = await app.inject({ method: 'GET', url: `/api/v1/groups/${groupId}/narrative?academicYearId=${randomUUID()}`, headers });
    expect(foreign.statusCode).toBe(404);
  });

  it('validates command shapes, supports valid start/reveal/link/complete flow, and observes source state without mutating it', async () => {
    const { app, headers, groupId, yearId } = await fixture('narrative-flow@example.test');
    const base = `/api/v1/groups/${groupId}/narrative/events/t1_el_apagon`;
    const suffix = `?academicYearId=${yearId}`;
    const invalid = await app.inject({ method: 'POST', url: `${base}/start${suffix}`, headers: { ...headers, 'idempotency-key': key() }, payload: { expectedRevision: 0, extra: true } });
    expect(invalid.statusCode).toBe(422);

    const started = await app.inject({ method: 'POST', url: `${base}/start${suffix}`, headers: { ...headers, 'idempotency-key': key() }, payload: { expectedRevision: 0 } });
    expect(started.statusCode).toBe(200);
    const revealed = await app.inject({ method: 'POST', url: `${base}/reveal-next-clue${suffix}`, headers: { ...headers, 'idempotency-key': key() }, payload: { expectedRevision: 1 } });
    expect(revealed.statusCode).toBe(200);

    const challenge = await app.inject({ method: 'POST', url: `/api/v1/groups/${groupId}/challenges`, headers, payload: { title: 'Signal', description: 'Collective', target: 1, showOnProjection: false } });
    const challengeId = challenge.json().id as string;
    const before = await app.inject({ method: 'GET', url: `/api/v1/groups/${groupId}/challenges`, headers });
    const linked = await app.inject({ method: 'POST', url: `${base}/link${suffix}`, headers: { ...headers, 'idempotency-key': key() }, payload: { expectedRevision: 2, link: { kind: 'CHALLENGE', id: challengeId } } });
    expect(linked.statusCode).toBe(200);
    expect((await app.inject({ method: 'GET', url: `/api/v1/groups/${groupId}/challenges`, headers })).json()).toEqual(before.json());

    const notTerminal = await app.inject({ method: 'POST', url: `${base}/complete${suffix}`, headers: { ...headers, 'idempotency-key': key() }, payload: { expectedRevision: 3 } });
    expect(notTerminal.statusCode).toBe(409);
    await app.inject({ method: 'POST', url: `/api/v1/challenges/${challengeId}/activate`, headers });
    await app.inject({ method: 'POST', url: `/api/v1/challenges/${challengeId}/progress`, headers, payload: { delta: 1 } });
    const completed = await app.inject({ method: 'POST', url: `${base}/complete${suffix}`, headers: { ...headers, 'idempotency-key': key() }, payload: { expectedRevision: 3 } });
    expect(completed.statusCode).toBe(200);
    expect(completed.json().events[0].state).toBe('COMPLETED');
    expect(completed.body).not.toContain('requestFingerprint');

    const event2 = `/api/v1/groups/${groupId}/narrative/events/t1_el_mensaje`;
    expect((await app.inject({ method: 'POST', url: `${event2}/start${suffix}`, headers: { ...headers, 'idempotency-key': key() }, payload: { expectedRevision: 4 } })).statusCode).toBe(200);
    expect((await app.inject({ method: 'POST', url: `${event2}/link${suffix}`, headers: { ...headers, 'idempotency-key': key() }, payload: { expectedRevision: 5, link: { kind: 'MINIGAME', id: key() } } })).statusCode).toBe(409);
    expect((await app.inject({ method: 'POST', url: `${event2}/complete${suffix}`, headers: { ...headers, 'idempotency-key': key() }, payload: { expectedRevision: 5 } })).statusCode).toBe(200);

    const event3 = `/api/v1/groups/${groupId}/narrative/events/t1_eclipse`;
    expect((await app.inject({ method: 'POST', url: `${event3}/start${suffix}`, headers: { ...headers, 'idempotency-key': key() }, payload: { expectedRevision: 6 } })).statusCode).toBe(200);
    expect((await app.inject({ method: 'POST', url: `${event3}/link${suffix}`, headers: { ...headers, 'idempotency-key': key() }, payload: { expectedRevision: 7, link: { kind: 'CHALLENGE', id: challengeId } } })).statusCode).toBe(409);
  });

  it('preserves replay semantics, rejects stale/conflicting keys, and keeps archived writes read-only', async () => {
    const { app, headers, groupId, yearId } = await fixture('narrative-replay@example.test');
    const url = `/api/v1/groups/${groupId}/narrative/events/t1_el_apagon/start?academicYearId=${yearId}`;
    const requestKey = key();
    const first = await app.inject({ method: 'POST', url, headers: { ...headers, 'idempotency-key': requestKey }, payload: { expectedRevision: 0 } });
    const replay = await app.inject({ method: 'POST', url, headers: { ...headers, 'idempotency-key': requestKey }, payload: { expectedRevision: 0 } });
    expect(replay.statusCode).toBe(200);
    expect(replay.json()).toEqual(first.json());
    const changedReuse = await app.inject({ method: 'POST', url, headers: { ...headers, 'idempotency-key': requestKey }, payload: { expectedRevision: 1 } });
    expect(changedReuse.statusCode).toBe(409);

    const stale = await app.inject({ method: 'POST', url, headers: { ...headers, 'idempotency-key': key() }, payload: { expectedRevision: 0 } });
    expect(stale.statusCode).toBe(409);
    const archived = await app.inject({ method: 'POST', url: `/api/v1/academic-years/${yearId}/archive`, headers });
    expect(archived.statusCode).toBe(204);
    const blocked = await app.inject({ method: 'POST', url: `/api/v1/groups/${groupId}/narrative/events/t1_el_apagon/reveal-next-clue?academicYearId=${yearId}`, headers: { ...headers, 'idempotency-key': key() }, payload: { expectedRevision: 1 } });
    expect(blocked.statusCode).toBe(409);
    expect(blocked.json()).toMatchObject({ code: 'CONFLICT' });
    expect(blocked.body).not.toContain('requestFingerprint');
  });
});
