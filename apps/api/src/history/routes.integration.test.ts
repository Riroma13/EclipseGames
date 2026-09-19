import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createServer } from '../server.js';
import { adapters } from './adapters.js';

const credentials = { email: 'history@example.test', password: 'correct horse battery staple' };
const apps: Array<Awaited<ReturnType<typeof createServer>>> = [];

afterEach(async () => { for (const app of apps.splice(0)) await app.close(); });

async function fixture(logger = false) {
  const app = createServer(':memory:', { logger, bootstrapTeacher: credentials });
  apps.push(app);
  const login = await app.inject({ method: 'POST', url: '/api/v1/auth/session', payload: credentials });
  const headers = { cookie: String(login.headers['set-cookie']).split(';')[0] };
  const year = await app.inject({ method: 'POST', url: '/api/v1/academic-years', headers, payload: { label: 'History year', startsOn: '2026-01-01', endsOn: '2026-12-31' } });
  const yearId = year.json().id as string;
  const group = await app.inject({ method: 'POST', url: `/api/v1/academic-years/${yearId}/groups`, headers, payload: { name: 'History group' } });
  const groupId = group.json().id as string;
  const students = await app.inject({ method: 'POST', url: `/api/v1/groups/${groupId}/students`, headers, payload: { students: [{ realName: 'Private history name', alias: 'Private history alias' }, { realName: 'Second history name', alias: 'Second history alias' }, { realName: 'Third history name', alias: 'Third history alias' }] } });
  const studentId = students.json()[0].id as string;
  const weekday = new Date().getUTCDay() || 7;
  await app.inject({ method: 'PUT', url: `/api/v1/academic-years/${yearId}/calendar`, headers, payload: { timezone: 'UTC', terms: [{ code: 'T1', startsOn: '2026-01-01', endsOn: '2026-12-31' }], holidays: [], slots: [{ groupId, weekday, startsAt: '00:00', endsAt: '23:59' }] } });
  const otherYear = await app.inject({ method: 'POST', url: '/api/v1/academic-years', headers, payload: { label: 'Other history year', startsOn: '2027-01-01', endsOn: '2027-12-31' } });
  const otherGroup = await app.inject({ method: 'POST', url: `/api/v1/academic-years/${otherYear.json().id}/groups`, headers, payload: { name: 'Other history group' } });
  return { app, headers, yearId, groupId, studentId, otherYearId: otherYear.json().id as string, otherGroupId: otherGroup.json().id as string,
    privateValues: ['Private history name', 'Private history alias', 'Second history name', 'Second history alias', 'Third history name', 'Third history alias'] };
}

describe('history private API integration', () => {
  it('requires authentication and returns an owned empty page with the closed DTO headers', async () => {
    const { app, headers, yearId, groupId, otherYearId, otherGroupId } = await fixture();
    expect((await app.inject({ method: 'GET', url: `/api/v1/groups/${groupId}/history?academicYearId=${yearId}` })).statusCode).toBe(401);
    const response = await app.inject({ method: 'GET', url: `/api/v1/groups/${groupId}/history?academicYearId=${yearId}`, headers });
    expect(response.statusCode).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.json().items.length).toBeGreaterThan(0);
    expect(response.json().nextCursor).toBeNull();
    expect(Object.keys(response.json().items[0]).sort()).toEqual(['correction', 'facts', 'family', 'id', 'kind', 'occurredAt', 'sessionId', 'student', 'summary', 'termId', 'title']);
    expect((await app.inject({ method: 'GET', url: `/api/v1/groups/${otherGroupId}/history?academicYearId=${yearId}`, headers })).statusCode).toBe(404);
    expect((await app.inject({ method: 'GET', url: `/api/v1/groups/${groupId}/history?academicYearId=${otherYearId}`, headers })).statusCode).toBe(404);
  });

  it('checks group, student, and term ownership before any adapter read', async () => {
    const { app, headers, yearId, groupId, studentId } = await fixture();
    const original = adapters.XP;
    let reads = 0;
    (adapters as Record<string, typeof original>).XP = ((...args) => { reads++; return original(...args); }) as typeof original;
    try {
      const invalidStudent = await app.inject({ method: 'GET', url: `/api/v1/groups/${groupId}/history?academicYearId=${yearId}&studentId=${randomUUID()}`, headers });
      expect(invalidStudent.statusCode).toBe(404);
      expect(reads).toBe(0);
      const invalidTerm = await app.inject({ method: 'GET', url: `/api/v1/groups/${groupId}/history?academicYearId=${yearId}&termId=${randomUUID()}`, headers });
      expect(invalidTerm.statusCode).toBe(404);
      expect(reads).toBe(0);
      expect(studentId).toMatch(/[0-9a-f-]{36}/);
    } finally { (adapters as Record<string, typeof original>).XP = original; }
  });

  it('binds cursors to the requested scope and filters', async () => {
    const { app, headers, yearId, groupId } = await fixture();
    const first = await app.inject({ method: 'GET', url: `/api/v1/groups/${groupId}/history?academicYearId=${yearId}&limit=1`, headers });
    expect(first.statusCode).toBe(200);
    const cursor = first.json().nextCursor;
    if (cursor) {
      const changed = await app.inject({ method: 'GET', url: `/api/v1/groups/${groupId}/history?academicYearId=${yearId}&family=XP&limit=1&cursor=${encodeURIComponent(cursor)}`, headers });
      expect(changed.statusCode).toBe(422);
    }
  });

  it('keeps limited pages duplicate-free and continuous', async () => {
    const { app, headers, yearId, groupId } = await fixture();
    const seen: string[] = [];
    let cursor: string | undefined;
    do {
      const query = new URLSearchParams({ academicYearId: yearId, limit: '1' });
      if (cursor) query.set('cursor', cursor);
      const response = await app.inject({ method: 'GET', url: `/api/v1/groups/${groupId}/history?${query}`, headers });
      expect(response.statusCode).toBe(200);
      const page = response.json() as { items: Array<{ id: string }>; nextCursor: string | null };
      seen.push(...page.items.map(item => item.id));
      cursor = page.nextCursor ?? undefined;
    } while (cursor);
    expect(seen.length).toBeGreaterThan(1);
    expect(new Set(seen).size).toBe(seen.length);
  });

  it('fails closed when a later adapter fails, without partial history or source details', async () => {
    const { app, headers, yearId, groupId } = await fixture();
    const original = adapters.XP;
    (adapters as Record<string, typeof original>).XP = (() => { throw new Error('private SQL source detail'); }) as typeof original;
    try {
      const response = await app.inject({ method: 'GET', url: `/api/v1/groups/${groupId}/history?academicYearId=${yearId}`, headers });
      expect(response.statusCode).toBe(503);
      expect(response.json()).toEqual(expect.objectContaining({ code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' }));
      expect(response.body).not.toContain('private SQL source detail');
      expect(response.body).not.toContain('items');
    } finally { (adapters as Record<string, typeof original>).XP = original; }
  });

  it('keeps successful and failing history request logs payload-free', async () => {
    const { app, headers, yearId, groupId, studentId, privateValues } = await fixture(true);
    const info = vi.spyOn(app.log, 'info');
    const error = vi.spyOn(app.log, 'error');
    info.mockClear();
    error.mockClear();

    const successfulRequest = await app.inject({ method: 'GET', url: `/api/v1/groups/${groupId}/history?academicYearId=${yearId}`, headers });
    expect(successfulRequest.statusCode).toBe(200);
    const historyPayload = successfulRequest.body;
    const original = adapters.XP;
    (adapters as Record<string, typeof original>).XP = (() => { throw new Error('private adapter database detail; private comment; source-record content'); }) as typeof original;
    try {
      const failedRequest = await app.inject({ method: 'GET', url: `/api/v1/groups/${groupId}/history?academicYearId=${yearId}`, headers });
      expect(failedRequest.statusCode).toBe(503);
      const logs = [...info.mock.calls, ...error.mock.calls].map(call => JSON.stringify(call)).join('\n');
      for (const forbidden of [...privateValues, historyPayload, 'private adapter database detail', 'private comment', 'source-record content', `academicYearId=${yearId}`, `studentId=${studentId}`]) {
        expect(logs).not.toContain(forbidden);
      }
      expect(logs).toContain('http.request.incoming');
      expect(logs).toContain('http.request.completed');
      expect(logs).toContain('http.request.error');
      expect(logs).toContain('responseTimeMs');
      expect(logs).toContain('statusCode');
    } finally { (adapters as Record<string, typeof original>).XP = original; }
  });

  it('does not expose history through projection or Show Student payloads', async () => {
    const { app, headers, groupId, studentId } = await fixture();
    expect((await app.inject({ method: 'GET', url: `/api/v1/projection/groups/${groupId}/students`, headers })).statusCode).toBe(404);
    const created = await app.inject({ method: 'POST', url: `/api/v1/teacher/groups/${groupId}/show-student`, headers: { ...headers, 'idempotency-key': randomUUID() }, payload: { studentId } });
    const exchanged = await app.inject({ method: 'POST', url: '/api/v1/show-student/exchange', payload: { code: created.json().accessCode } });
    const viewer = await app.inject({ method: 'GET', url: '/api/v1/show-student', headers: { cookie: exchanged.headers['set-cookie'] } });
    expect(viewer.statusCode).toBe(200);
    expect(viewer.body).not.toContain('occurredAt');
    expect(viewer.body).not.toContain('Private history name');
  });
});
