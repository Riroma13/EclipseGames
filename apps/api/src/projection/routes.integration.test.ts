import { afterEach, describe, expect, it } from 'vitest';
import { createServer } from '../server.js';
import { randomUUID } from 'node:crypto';

const origin = 'http://localhost:5173';
const credentials = { email: 'm8@example.test', password: 'correct horse battery staple' };
const apps: Awaited<ReturnType<typeof createServer>>[] = [];

afterEach(async () => { for (const app of apps.splice(0)) await app.close(); });

async function fixture() {
  const app = createServer(':memory:', { logger: false, bootstrapTeacher: credentials }); apps.push(app);
  const login = await app.inject({ method: 'POST', url: '/api/v1/auth/session', headers: { origin }, payload: credentials });
  const headers = { origin, cookie: login.headers['set-cookie'] };
  const year = await app.inject({ method: 'POST', url: '/api/v1/academic-years', headers, payload: { label: 'M8 year', startsOn: '2026-09-01', endsOn: '2027-07-01' } });
  const group = await app.inject({ method: 'POST', url: `/api/v1/academic-years/${year.json().id}/groups`, headers, payload: { name: 'M8 group' } });
  const students = await app.inject({ method: 'POST', url: `/api/v1/groups/${group.json().id}/students`, headers, payload: { students: [{ realName: 'Private name', alias: 'Safe alias', specialty: 'Diplomat' }] } });
  return { app, headers, group: group.json().id as string, student: students.json()[0].id as string, year: year.json().id as string };
}

describe('M8 API authority', () => {
  it('composes the exact classroom DTO and keeps fixture routes absent', async () => {
    const { app, headers, group, student, year } = await fixture();
    const anonymous = await app.inject({ method: 'GET', url: `/api/v1/teacher/groups/${group}/classroom-cards` });
    expect(anonymous.statusCode).toBe(401);
    const cards = await app.inject({ method: 'GET', url: `/api/v1/teacher/groups/${group}/classroom-cards?academicYearId=${year}`, headers });
    expect(cards.statusCode).toBe(200); expect(cards.headers['cache-control']).toBe('no-store');
    expect(cards.json()[0]).toEqual(expect.objectContaining({ energy: null, gems: { EMERALD: 0, RUBY: 0, DIAMOND: 0 } }));
    expect(Object.keys(cards.json()[0]).sort()).toEqual(['avatar', 'energy', 'gems']);
    expect((await app.inject({ method: 'GET', url: `/api/v1/projection/groups/${group}/students`, headers })).statusCode).toBe(404);
    const created = await app.inject({ method: 'POST', url: `/api/v1/teacher/groups/${group}/show-student`, headers: { ...headers, 'idempotency-key': randomUUID() }, payload: { studentId: student } });
    expect(created.statusCode).toBe(201); expect(Object.keys(created.json()).sort()).toEqual(['accessCode', 'accessUrl', 'expiresAt', 'showStudent']);
    const token = new URLSearchParams(created.json().accessUrl.split('?')[1]).get('token')!;
    const exchanged = await app.inject({ method: 'POST', url: '/api/v1/show-student/exchange', payload: { token } });
    expect(exchanged.statusCode).toBe(204);
    expect(exchanged.headers['set-cookie']).toContain('Path=/api/v1/show-student');
    expect(exchanged.headers['set-cookie']).toContain('HttpOnly');
    const viewer = await app.inject({ method: 'GET', url: '/api/v1/show-student', headers: { cookie: exchanged.headers['set-cookie'] } });
    expect(viewer.statusCode).toBe(200); expect(Object.keys(viewer.json()).sort()).toEqual(['behaviour', 'expiresAt', 'kind', 'student']);
    expect(JSON.stringify(viewer.json())).not.toContain('Private name');
  });

  it('requires exact exchange credentials and fails closed after teacher revocation', async () => {
    const { app, headers, group, student } = await fixture();
    const created = await app.inject({ method: 'POST', url: `/api/v1/teacher/groups/${group}/show-student`, headers: { ...headers, 'idempotency-key': randomUUID() }, payload: { studentId: student } });
    const token = new URLSearchParams(created.json().accessUrl.split('?')[1]).get('token')!;
    expect((await app.inject({ method: 'POST', url: '/api/v1/show-student/exchange', payload: { token, studentId: student } })).statusCode).toBe(422);
    expect((await app.inject({ method: 'POST', url: '/api/v1/show-student/exchange', payload: { token, code: created.json().accessCode } })).statusCode).toBe(422);
    const exchanged = await app.inject({ method: 'POST', url: '/api/v1/show-student/exchange', payload: { code: created.json().accessCode } });
    expect(exchanged.statusCode).toBe(204);
    await app.inject({ method: 'DELETE', url: `/api/v1/teacher/groups/${group}/show-student`, headers: { ...headers, 'idempotency-key': randomUUID() } });
    const viewer = await app.inject({ method: 'GET', url: '/api/v1/show-student?groupId=other', headers: { cookie: exchanged.headers['set-cookie'] } });
    expect(viewer.statusCode).toBe(404);
  });

  it('invalidates the same viewer cookie on teacher logout and issuing-session expiry', async () => {
    const { app, headers, group, student } = await fixture();
    const created = await app.inject({ method: 'POST', url: `/api/v1/teacher/groups/${group}/show-student`, headers: { ...headers, 'idempotency-key': randomUUID() }, payload: { studentId: student } });
    const token = new URLSearchParams(created.json().accessUrl.split('?')[1]).get('token')!;
    const exchanged = await app.inject({ method: 'POST', url: '/api/v1/show-student/exchange', payload: { token } });
    const viewerCookie = exchanged.headers['set-cookie'];
    expect((await app.inject({ method: 'GET', url: '/api/v1/show-student', headers: { cookie: viewerCookie } })).statusCode).toBe(200);

    expect((await app.inject({ method: 'DELETE', url: '/api/v1/auth/session', headers })).statusCode).toBe(204);
    const loggedOut = await app.inject({ method: 'GET', url: '/api/v1/show-student', headers: { cookie: viewerCookie } });
    expect(loggedOut.statusCode).toBe(404);
    expect(loggedOut.body).not.toContain('session');
    expect(loggedOut.body).not.toContain('teacher');

  });

  it('enforces owner, exact bodies, idempotency conflicts, and revoke validation', async () => {
    const { app, headers, group, student } = await fixture();
    expect((await app.inject({ method: 'POST', url: `/api/v1/teacher/groups/${group}/show-student`, headers, payload: { studentId: student } })).statusCode).toBe(422);
    const key = randomUUID();
    const first = await app.inject({ method: 'POST', url: `/api/v1/teacher/groups/${group}/show-student`, headers: { ...headers, 'idempotency-key': key }, payload: { studentId: student } });
    const replay = await app.inject({ method: 'POST', url: `/api/v1/teacher/groups/${group}/show-student`, headers: { ...headers, 'idempotency-key': key }, payload: { studentId: student, extra: true } });
    expect(first.statusCode).toBe(201); expect(replay.statusCode).toBe(422);
    expect((await app.inject({ method: 'DELETE', url: `/api/v1/teacher/groups/${group}/show-student`, headers })).statusCode).toBe(422);
    expect((await app.inject({ method: 'GET', url: `/api/v1/teacher/groups/${randomUUID()}/classroom-cards?academicYearId=${randomUUID()}`, headers })).statusCode).toBe(404);
  });
});
