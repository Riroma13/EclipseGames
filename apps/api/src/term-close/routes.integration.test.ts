import { afterEach, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createServer } from '../server.js';

describe('term-close private API', () => {
  const apps: Array<Awaited<ReturnType<typeof createServer>>> = [];
  afterEach(async () => { for (const app of apps.splice(0)) await app.close(); });

  it('requires authentication and keeps ownership/version misses private', async () => {
    const groupId = randomUUID(); const termId = randomUUID(); const yearId = randomUUID();
    const app = createServer(':memory:', { logger: false, bootstrapTeacher: { email: 'close@example.test', password: 'correct horse battery staple' } }); apps.push(app);
    const unauthenticated = await app.inject({ method: 'GET', url: `/api/v1/groups/${groupId}/terms/${termId}/term-close?academicYearId=${yearId}` });
    expect(unauthenticated.statusCode).toBe(401);
    const login = await app.inject({ method: 'POST', url: '/api/v1/auth/session', payload: { email: 'close@example.test', password: 'correct horse battery staple' } });
    const cookie = String(login.headers['set-cookie']).split(';')[0];
    const headers = { cookie };
    const readiness = await app.inject({ method: 'GET', url: `/api/v1/groups/${groupId}/terms/${termId}/term-close?academicYearId=${yearId}`, headers });
    const download = await app.inject({ method: 'GET', url: `/api/v1/groups/${groupId}/terms/${termId}/term-close/exports/1.xlsx?academicYearId=${yearId}`, headers });
    expect(readiness.statusCode).toBe(404);
    expect(download.statusCode).toBe(404);
    expect(download.body).not.toContain('xlsx_bytes');
  });
});
