import { afterEach, describe, expect, it } from 'vitest';
import { createServer } from '../../src/server.js';

const apps: Awaited<ReturnType<typeof createServer>>[] = [];
afterEach(async () => { for (const app of apps.splice(0)) await app.close(); });

describe('private XP API contracts', () => {
  it('enforces auth, ownership-as-404, validation, replay/conflict, and opaque cursors', async () => {
    const app = createServer(':memory:', { logger: false, bootstrapTeacher: { email: 'teacher@example.test', password: 'correct horse battery staple' } }); apps.push(app);
    const origin = 'http://localhost:5173';
    expect((await app.inject({ method: 'GET', url: '/api/v1/students/00000000-0000-4000-8000-000000000001/xp-summary?academicYearId=00000000-0000-4000-8000-000000000002', headers: { origin } })).statusCode).toBe(401);
    const login = await app.inject({ method: 'POST', url: '/api/v1/auth/session', headers: { origin }, payload: { email: 'teacher@example.test', password: 'correct horse battery staple' } }); const cookie = login.headers['set-cookie'];
    const year = await app.inject({ method: 'POST', url: '/api/v1/academic-years', headers: { origin, cookie }, payload: { label: '2026-2027', startsOn: '2026-09-01', endsOn: '2027-07-01' } });
    const group = await app.inject({ method: 'POST', url: `/api/v1/academic-years/${year.json().id}/groups`, headers: { origin, cookie }, payload: { name: 'A' } });
    const student = await app.inject({ method: 'POST', url: `/api/v1/groups/${group.json().id}/students`, headers: { origin, cookie }, payload: { students: [{ realName: 'Ada', alias: 'A' }] } }); const studentId = student.json()[0].id; const key = '00000000-0000-4000-8000-000000000001';
    expect((await app.inject({ method: 'POST', url: `/api/v1/students/${studentId}/xp-evidence`, headers: { origin, cookie, 'idempotency-key': key }, payload: { category: 'PRECISION', baseXp: 1 } })).statusCode).toBe(201);
    expect((await app.inject({ method: 'POST', url: `/api/v1/students/${studentId}/xp-evidence`, headers: { origin, cookie, 'idempotency-key': key }, payload: { category: 'PRECISION', baseXp: 1 } })).statusCode).toBe(200);
    expect((await app.inject({ method: 'POST', url: `/api/v1/students/${studentId}/xp-evidence`, headers: { origin, cookie, 'idempotency-key': key }, payload: { category: 'PRECISION', baseXp: 2 } })).statusCode).toBe(409);
    expect((await app.inject({ method: 'POST', url: `/api/v1/students/${studentId}/xp-evidence`, headers: { origin, cookie, 'idempotency-key': '00000000-0000-4000-8000-000000000002' }, payload: { category: 'PRECISION', baseXp: 4 } })).statusCode).toBe(422);
    expect((await app.inject({ method: 'GET', url: `/api/v1/students/${studentId}/xp-evidence?academicYearId=${year.json().id}&cursor=bad`, headers: { origin, cookie } })).statusCode).toBe(422);
    expect((await app.inject({ method: 'GET', url: `/api/v1/students/${studentId}/xp-summary?academicYearId=00000000-0000-4000-8000-000000000099`, headers: { origin, cookie } })).statusCode).toBe(404);
  });
});
