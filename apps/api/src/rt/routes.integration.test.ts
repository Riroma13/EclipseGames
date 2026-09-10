import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import { createServer } from '../server.js';

describe('RT private API', () => {
  const apps: Array<Awaited<ReturnType<typeof createServer>>> = [];
  afterEach(async () => { for (const app of apps.splice(0)) await app.close(); });

  it('requires authentication, accepts replay-safe private entry writes, and never returns real names', async () => {
    const app = createServer(':memory:', { logger: false, bootstrapTeacher: { email: 'rt@example.test', password: 'correct horse battery staple' } }); apps.push(app);
    expect((await app.inject({ method: 'GET', url: `/api/v1/real-class-sessions/${randomUUID()}/rt-entries` })).statusCode).toBe(401);
    const login = await app.inject({ method: 'POST', url: '/api/v1/auth/session', payload: { email: 'rt@example.test', password: 'correct horse battery staple' } });
    const cookie = String(login.headers['set-cookie']).split(';')[0];
    const headers = { cookie };
    const year = await app.inject({ method: 'POST', url: '/api/v1/academic-years', headers, payload: { label: 'RT private API', startsOn: '2026-01-01', endsOn: '2026-12-31' } });
    const group = await app.inject({ method: 'POST', url: `/api/v1/academic-years/${year.json().id}/groups`, headers, payload: { name: 'Private RT group' } });
    const student = await app.inject({ method: 'POST', url: `/api/v1/groups/${group.json().id}/students`, headers, payload: { students: [{ realName: 'Private RT Name', alias: 'RT Alias' }] } });
    const weekday = new Date().getUTCDay() || 7;
    await app.inject({ method: 'PUT', url: `/api/v1/academic-years/${year.json().id}/calendar`, headers, payload: { timezone: 'UTC', terms: [{ code: 'T1', startsOn: '2026-01-01', endsOn: '2026-04-30' }, { code: 'T2', startsOn: '2026-05-01', endsOn: '2026-08-31' }, { code: 'T3', startsOn: '2026-09-01', endsOn: '2026-12-31' }], holidays: [], slots: [{ groupId: group.json().id, weekday, startsAt: '00:00', endsAt: '23:59' }] } });
    const started = await app.inject({ method: 'POST', url: `/api/v1/groups/${group.json().id}/real-class-sessions/start`, headers: { ...headers, 'idempotency-key': randomUUID() }, payload: { academicYearId: year.json().id } });
    const sessionId = started.json().id as string;
    const initial = await app.inject({ method: 'GET', url: `/api/v1/real-class-sessions/${sessionId}/rt-entries`, headers });
    expect(initial.statusCode).toBe(200); expect(initial.json()).toMatchObject({ students: [{ studentId: student.json()[0].id }], entries: [] }); expect(initial.body).not.toContain('Private RT Name');
    const key = randomUUID();
    const created = await app.inject({ method: 'POST', url: `/api/v1/real-class-sessions/${sessionId}/rt-entries`, headers: { ...headers, 'idempotency-key': key }, payload: { entries: [{ studentId: student.json()[0].id, value: 'ABSENT' }] } });
    const replay = await app.inject({ method: 'POST', url: `/api/v1/real-class-sessions/${sessionId}/rt-entries`, headers: { ...headers, 'idempotency-key': key }, payload: { entries: [{ studentId: student.json()[0].id, value: 'ABSENT' }] } });
    const mismatch = await app.inject({ method: 'POST', url: `/api/v1/real-class-sessions/${sessionId}/rt-entries`, headers: { ...headers, 'idempotency-key': key }, payload: { entries: [{ studentId: student.json()[0].id, value: 10 }] } });
    expect(created.statusCode).toBe(201); expect(replay.statusCode).toBe(200); expect(mismatch.statusCode).toBe(409); expect(created.body).not.toContain('Private RT Name');
  });
});
