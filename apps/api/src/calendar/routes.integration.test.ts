import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, afterEach } from 'vitest';
import { createServer } from '../server.js';

describe('calendar private API', () => {
  const files: string[] = []; const apps: Array<{ close: () => Promise<void> }> = [];
  afterEach(async () => { for (const app of apps.splice(0)) await app.close(); });
  it('requires auth, keeps unconfigured status honest, and supports atomic start/end replay', async () => {
    const file = join(tmpdir(), `eclipse-calendar-${randomUUID()}.sqlite`); files.push(file);
    const app = createServer(file, { logger: false, bootstrapTeacher: { email: 'calendar@example.test', password: 'correct horse battery staple' } }); apps.push(app);
    const unauthenticated = await app.inject({ method: 'GET', url: `/api/v1/academic-years/${randomUUID()}/calendar` }); expect(unauthenticated.statusCode).toBe(401);
    const login = await app.inject({ method: 'POST', url: '/api/v1/auth/session', payload: { email: 'calendar@example.test', password: 'correct horse battery staple' } }); expect(login.statusCode).toBe(204);
    const cookie = String(login.headers['set-cookie']).split(';')[0];
    const year = await app.inject({ method: 'POST', url: '/api/v1/academic-years', headers: { cookie }, payload: { label: `Calendar ${randomUUID()}`, startsOn: '2026-01-01', endsOn: '2026-12-31' } }); expect(year.statusCode).toBe(200);
    const yearId = year.json().id as string;
    const group = await app.inject({ method: 'POST', url: `/api/v1/academic-years/${yearId}/groups`, headers: { cookie }, payload: { name: 'Private group' } }); expect(group.statusCode).toBe(200);
    const groupId = group.json().id as string;
    const absent = await app.inject({ method: 'GET', url: `/api/v1/groups/${groupId}/real-class-session-status?academicYearId=${yearId}`, headers: { cookie } }); expect(absent.statusCode).toBe(200); expect(absent.json()).toMatchObject({ configured: false, eligible: false, active: null });
    const day = new Date().getUTCDay() || 7;
    const calendar = await app.inject({ method: 'PUT', url: `/api/v1/academic-years/${yearId}/calendar`, headers: { cookie }, payload: { timezone: 'UTC', terms: [{ code: 'T1', startsOn: '2026-01-01', endsOn: '2026-04-30' }, { code: 'T2', startsOn: '2026-05-01', endsOn: '2026-08-31' }, { code: 'T3', startsOn: '2026-09-01', endsOn: '2026-12-31' }], holidays: [], slots: [{ groupId, weekday: day, startsAt: '00:00', endsAt: '23:59' }] } }); expect(calendar.statusCode).toBe(200);
    const key = randomUUID(); const starts = await Promise.all([app.inject({ method: 'POST', url: `/api/v1/groups/${groupId}/real-class-sessions/start`, headers: { cookie, 'idempotency-key': key }, payload: { academicYearId: yearId } }), app.inject({ method: 'POST', url: `/api/v1/groups/${groupId}/real-class-sessions/start`, headers: { cookie, 'idempotency-key': key }, payload: { academicYearId: yearId } })]); const started = starts.find(result=>result.statusCode===201)!; expect(starts.map(result=>result.statusCode).sort()).toEqual([200,201]); expect(started.json()).not.toHaveProperty('realName');
    const shrinkingPatch = await app.inject({ method: 'PATCH', url: `/api/v1/academic-years/${yearId}`, headers: { cookie }, payload: { startsOn: '2026-02-01' } }); expect(shrinkingPatch.statusCode).toBe(422);
    const activeArchive = await app.inject({ method: 'POST', url: `/api/v1/academic-years/${yearId}/archive`, headers: { cookie } }); expect(activeArchive.statusCode).toBe(409);
    const endKey = randomUUID(); const ends = await Promise.all([app.inject({ method: 'POST', url: `/api/v1/real-class-sessions/${started.json().id}/end`, headers: { cookie, 'idempotency-key': endKey }, payload: {} }), app.inject({ method: 'POST', url: `/api/v1/real-class-sessions/${started.json().id}/end`, headers: { cookie, 'idempotency-key': endKey }, payload: {} })]); expect(ends.map(result=>result.statusCode).sort()).toEqual([200,201]);
    const closedArchive = await app.inject({ method: 'POST', url: `/api/v1/academic-years/${yearId}/archive`, headers: { cookie } }); expect(closedArchive.statusCode).toBe(204);
    const history = await app.inject({ method: 'GET', url: `/api/v1/academic-years/${yearId}/calendar`, headers: { cookie } }); expect(history.statusCode).toBe(200);
  });
});
