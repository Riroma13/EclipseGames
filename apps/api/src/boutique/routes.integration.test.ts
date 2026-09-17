import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import { createServer } from '../server.js';

describe('boutique purchase/read API', () => {
  const apps: Array<Awaited<ReturnType<typeof createServer>>> = [];
  afterEach(async () => { for (const app of apps.splice(0)) await app.close(); });

  it('keeps the private read model exact and validates purchase keys', async () => {
    const app = createServer(':memory:', { logger: false, bootstrapTeacher: { email: 'boutique@example.test', password: 'correct horse battery staple' } }); apps.push(app);
    const login = await app.inject({ method: 'POST', url: '/api/v1/auth/session', payload: { email: 'boutique@example.test', password: 'correct horse battery staple' } });
    const headers = { cookie: String(login.headers['set-cookie']).split(';')[0] };
    const year = await app.inject({ method: 'POST', url: '/api/v1/academic-years', headers, payload: { label: 'Boutique year', startsOn: '2026-01-01', endsOn: '2026-12-31' } });
    const group = await app.inject({ method: 'POST', url: `/api/v1/academic-years/${year.json().id}/groups`, headers, payload: { name: 'Boutique group' } });
    const student = await app.inject({ method: 'POST', url: `/api/v1/groups/${group.json().id}/students`, headers, payload: { students: [{ realName: 'Private', alias: 'A', specialty: 'Leader' }] } });
    const studentId = student.json()[0].id;
    const url = `/api/v1/students/${studentId}/boutique?academicYearId=${year.json().id}`;
    const read = await app.inject({ method: 'GET', url, headers });
    expect(read.statusCode).toBe(200);
    expect(Object.keys(read.json()).sort()).toEqual(['academicYearId', 'catalogueVersion', 'currentTerm', 'editable', 'emeraldBalance', 'items', 'studentId'].sort());
    expect(read.json().items.map((item: { id: string }) => item.id)).toEqual(['hair-braids', 'feature-eclipse-mark', 'clothing-orbit', 'accessory-comet', 'accessory-signal', 'accessory-compass', 'accessory-anchor', 'accessory-alliance', 'frame-emerald', 'background-dawn']);
    const purchase = await app.inject({ method: 'POST', url: `/api/v1/students/${studentId}/boutique-purchases?academicYearId=${year.json().id}`, headers, payload: { itemId: 'hair-braids', sessionId: null } });
    expect(purchase.statusCode).toBe(422);
    const unknown = await app.inject({ method: 'POST', url: `/api/v1/students/${studentId}/boutique-purchases?academicYearId=${year.json().id}`, headers: { ...headers, 'idempotency-key': randomUUID() }, payload: { itemId: 'unknown', sessionId: null } });
    expect(unknown.statusCode).toBe(422);
  });
});
