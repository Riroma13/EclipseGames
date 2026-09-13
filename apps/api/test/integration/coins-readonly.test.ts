import { afterEach, describe, expect, it } from 'vitest';
import { createServer } from '../../src/server.js';

const apps: Awaited<ReturnType<typeof createServer>>[] = [];
afterEach(async () => { for (const app of apps.splice(0)) await app.close(); });
const origin = 'http://localhost:5173';

describe('legacy coin evidence is read-only', () => {
  it('keeps authenticated reads and rejects every legacy mutation URL', async () => {
    const app = createServer(':memory:', { logger: false, bootstrapTeacher: { email: 'coin-read@example.test', password: 'correct horse battery staple' } }); apps.push(app);
    const login = await app.inject({ method: 'POST', url: '/api/v1/auth/session', headers: { origin }, payload: { email: 'coin-read@example.test', password: 'correct horse battery staple' } });
    const headers = { origin, cookie: login.headers['set-cookie'] };
    expect((await app.inject({ method: 'GET', url: '/api/v1/coin-rewards', headers })).statusCode).toBe(200);
    expect((await app.inject({ method: 'POST', url: '/api/v1/students/00000000-0000-4000-8000-000000000001/coin-grants', headers, payload: {} })).statusCode).toBe(404);
    expect((await app.inject({ method: 'POST', url: '/api/v1/coin-grants/00000000-0000-4000-8000-000000000001/reversal', headers, payload: {} })).statusCode).toBe(404);
    expect((await app.inject({ method: 'POST', url: '/api/v1/students/00000000-0000-4000-8000-000000000001/advantages', headers: { ...headers, 'idempotency-key': '00000000-0000-4000-8000-000000000010' }, payload: { assessmentContextId: '00000000-0000-4000-8000-000000000002', rewardId: 'standard-assessment-advantage' } })).statusCode).toBe(404);
    expect((await app.inject({ method: 'POST', url: '/api/v1/advantage-redemptions/00000000-0000-4000-8000-000000000001/reversal', headers: { ...headers, 'idempotency-key': '00000000-0000-4000-8000-000000000011' }, payload: { reason: 'legacy' } })).statusCode).toBe(404);
  });
});
