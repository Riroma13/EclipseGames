import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import { createServer } from '../server.js';

describe('avatar teacher HTTP boundary', () => {
  const apps: Array<Awaited<ReturnType<typeof createServer>>> = [];
  afterEach(async () => { for (const app of apps.splice(0)) await app.close(); });

  it('requires authentication and returns only the teacher allowlist with server-derived XP', async () => {
    const app = createServer(':memory:', { logger: false, bootstrapTeacher: { email: 'avatar@example.test', password: 'correct horse battery staple' } }); apps.push(app);
    expect((await app.inject({ method: 'GET', url: '/api/v1/avatar-catalog' })).statusCode).toBe(401);
    const login = await app.inject({ method: 'POST', url: '/api/v1/auth/session', payload: { email: 'avatar@example.test', password: 'correct horse battery staple' } });
    const headers = { cookie: String(login.headers['set-cookie']).split(';')[0] };
    const year = await app.inject({ method: 'POST', url: '/api/v1/academic-years', headers, payload: { label: 'Avatar year', startsOn: '2026-01-01', endsOn: '2026-12-31' } });
    const group = await app.inject({ method: 'POST', url: `/api/v1/academic-years/${year.json().id}/groups`, headers, payload: { name: 'Avatar group' } });
    const student = await app.inject({ method: 'POST', url: `/api/v1/groups/${group.json().id}/students`, headers, payload: { students: [{ realName: 'Secret name', alias: 'Agent', specialty: 'Leader' }] } });
    const studentId = student.json()[0].id;
    const avatarUrl = `/api/v1/students/${studentId}/avatar?academicYearId=${year.json().id}`;
    const catalogue = await app.inject({ method: 'GET', url: '/api/v1/avatar-catalog', headers });
    expect(catalogue.statusCode).toBe(200);
    const initial = await app.inject({ method: 'GET', url: avatarUrl, headers });
    expect(initial.statusCode).toBe(200);
    expect(initial.json()).toMatchObject({ alias: 'Agent', annualEffectiveXp: 0, level: 1, editable: true });
    expect(initial.body).not.toContain('Secret name');
    expect(initial.body).not.toContain('realName');
    const beforeProjection = await app.inject({ method: 'GET', url: '/api/v1/projection/groups/00000000-0000-4000-8000-000000000001/students', headers });
    const key = randomUUID();
    const saved = await app.inject({ method: 'PUT', url: avatarUrl, headers: { ...headers, 'idempotency-key': key }, payload: { expectedRevision: 1, profile: { ...initial.json().profile, faceId: 'face-fox' } } });
    expect(saved.statusCode).toBe(200);
    expect(saved.json()).toMatchObject({ revision: 2, profile: { faceId: 'face-fox' }, annualEffectiveXp: 0, level: 1 });
    expect((await app.inject({ method: 'PUT', url: avatarUrl, headers: { ...headers, 'idempotency-key': key }, payload: { expectedRevision: 1, profile: { ...initial.json().profile, faceId: 'face-fox' } } })).statusCode).toBe(200);
    const stale = await app.inject({ method: 'PUT', url: avatarUrl, headers: { ...headers, 'idempotency-key': randomUUID() }, payload: { expectedRevision: 1, profile: { ...initial.json().profile, faceId: 'face-owl' } } });
    expect(stale.statusCode).toBe(409);
    expect((await app.inject({ method: 'PATCH', url: `/api/v1/students/${studentId}`, headers, payload: { avatar: 'wolf' } })).statusCode).toBe(422);
    const history = await app.inject({ method: 'GET', url: `/api/v1/students/${studentId}/avatar/history`, headers });
    expect(history.statusCode).toBe(200);
    expect(history.json().map((entry: { revision: number }) => entry.revision)).toEqual([2, 1]);
    const reverted = await app.inject({ method: 'POST', url: `/api/v1/students/${studentId}/avatar/revert?academicYearId=${year.json().id}`, headers: { ...headers, 'idempotency-key': randomUUID() }, payload: { expectedRevision: 2, targetRevision: 1, reason: 'Restaurar configuración base' } });
    expect(reverted.statusCode).toBe(200);
    expect(reverted.json()).toMatchObject({ revision: 3, profile: { faceId: 'face-human' } });
    const afterProjection = await app.inject({ method: 'GET', url: '/api/v1/projection/groups/00000000-0000-4000-8000-000000000001/students', headers });
    expect(afterProjection.json()).toEqual(beforeProjection.json());
  });

  it('preserves the avatar across a same-year canonical group correction', async () => {
    const app = createServer(':memory:', { logger: false, bootstrapTeacher: { email: 'avatar-correction@example.test', password: 'correct horse battery staple' } }); apps.push(app);
    const login = await app.inject({ method: 'POST', url: '/api/v1/auth/session', payload: { email: 'avatar-correction@example.test', password: 'correct horse battery staple' } });
    const headers = { cookie: String(login.headers['set-cookie']).split(';')[0] };
    const year = await app.inject({ method: 'POST', url: '/api/v1/academic-years', headers, payload: { label: 'Same-year correction', startsOn: '2026-01-01', endsOn: '2026-12-31' } });
    const groupA = await app.inject({ method: 'POST', url: `/api/v1/academic-years/${year.json().id}/groups`, headers, payload: { name: 'Group A' } });
    const groupB = await app.inject({ method: 'POST', url: `/api/v1/academic-years/${year.json().id}/groups`, headers, payload: { name: 'Group B' } });
    const student = await app.inject({ method: 'POST', url: `/api/v1/groups/${groupA.json().id}/students`, headers, payload: { students: [{ realName: 'Private student', alias: 'Agent' }] } });
    const studentId = student.json()[0].id;
    const avatarUrl = `/api/v1/students/${studentId}/avatar?academicYearId=${year.json().id}`;
    const initial = await app.inject({ method: 'GET', url: avatarUrl, headers });
    const saved = await app.inject({ method: 'PUT', url: avatarUrl, headers: { ...headers, 'idempotency-key': randomUUID() }, payload: { expectedRevision: initial.json().revision, profile: { ...initial.json().profile, faceId: 'face-fox' } } });
    expect(saved.statusCode).toBe(200);

    const corrected = await app.inject({ method: 'PATCH', url: `/api/v1/students/${studentId}/group`, headers, payload: { groupId: groupB.json().id } });
    expect(corrected.statusCode).toBe(200);
    expect(corrected.json()).toMatchObject({ id: studentId, groupId: groupB.json().id });

    const afterCorrection = await app.inject({ method: 'GET', url: avatarUrl, headers });
    expect(afterCorrection.statusCode).toBe(200);
    expect(afterCorrection.json()).toMatchObject({ studentId, academicYearId: year.json().id, revision: saved.json().revision, profile: saved.json().profile });
    expect(afterCorrection.body).not.toContain('Private student');
    expect(afterCorrection.body).not.toContain('realName');
    const history = await app.inject({ method: 'GET', url: `/api/v1/students/${studentId}/avatar/history`, headers });
    expect(history.json()).toHaveLength(2);
    expect(history.json().map((entry: { revision: number; operation: string }) => [entry.revision, entry.operation])).toEqual([[2, 'UPDATE'], [1, 'CREATE']]);
  });

  it('validates the requested academic year and hides non-owned students as 404', async () => {
    const app = createServer(':memory:', { logger: false, bootstrapTeacher: { email: 'avatar-owner@example.test', password: 'correct horse battery staple' } }); apps.push(app);
    const login = await app.inject({ method: 'POST', url: '/api/v1/auth/session', payload: { email: 'avatar-owner@example.test', password: 'correct horse battery staple' } });
    const headers = { cookie: String(login.headers['set-cookie']).split(';')[0] };
    const missing = await app.inject({ method: 'GET', url: `/api/v1/students/${randomUUID()}/avatar?academicYearId=${randomUUID()}`, headers });
    expect(missing.statusCode).toBe(404);
    const invalidYear = await app.inject({ method: 'GET', url: `/api/v1/students/${randomUUID()}/avatar?academicYearId=not-a-uuid`, headers });
    expect(invalidYear.statusCode).toBe(422);
  });
});
