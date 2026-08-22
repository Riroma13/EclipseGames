import { afterEach, describe, expect, it } from 'vitest';
import { createServer } from '../../src/server.js';

const credentials = { email: 'teacher@example.test', password: 'correct horse battery staple' };
const origin = 'http://localhost:5173';
const groupId = '00000000-0000-4000-8000-000000000001';
const studentId = '00000000-0000-4000-8000-000000000002';
const apps: Awaited<ReturnType<typeof createServer>>[] = [];

afterEach(async () => {
  for (const app of apps.splice(0)) await app.close();
});

async function authenticatedApp() {
  const app = createServer(':memory:', { logger: false, bootstrapTeacher: credentials });
  apps.push(app);
  const login = await app.inject({ method: 'POST', url: '/api/v1/auth/session', headers: { origin }, payload: credentials });
  return { app, cookie: login.headers['set-cookie'] };
}

describe('projection privacy boundary', () => {
  it('rejects anonymous projection access', async () => {
    const app = createServer(':memory:', { logger: false });
    apps.push(app);
    const response = await app.inject({ method: 'GET', url: `/api/v1/projection/groups/${groupId}/students` });
    expect(response.statusCode).toBe(401);
    expect(response.json().code).toBe('AUTH_REQUIRED');
  });

  it('keeps projection rejection audit payload-free', async () => {
    const audit: Record<string, unknown>[] = [];
    const app = createServer(':memory:', { logger: false, audit: (entry) => audit.push(entry) });
    apps.push(app);
    await app.inject({ method: 'GET', url: `/api/v1/projection/groups/${groupId}/students?realName=private-student-name`, headers: { origin } });
    expect(JSON.stringify(audit)).not.toContain('private-student-name');
    expect(audit[0]).toEqual(expect.objectContaining({ code: 'AUTH_REQUIRED', requestId: expect.any(String) }));
  });

  it('returns only the projection allowlist and never query-selectable private fields', async () => {
    const { app, cookie } = await authenticatedApp();
    const response = await app.inject({ method: 'GET', url: `/api/v1/projection/groups/${groupId}/students?fields=realName,rtAverage,comments`, headers: { origin, cookie } });
    expect(response.statusCode).toBe(200);
    expect(response.json()[0]).toEqual({
      avatar: 'default',
      alias: 'Demo Student',
      specialty: 'Communication',
      unlockedBadge: null,
      xpLevel: 1,
      progressToNextLevel: 0,
      energyVisualState: 'stable',
      coinBalance: 0,
      narrativeProgress: 0,
    });
    expect(JSON.stringify(response.json())).not.toMatch(/realName|rtAverage|rubric|grade|comments|incidents|history|redCode|disciplinary/i);
  });

  it('allows Show Student to add behaviourState but no private fields', async () => {
    const { app, cookie } = await authenticatedApp();
    const response = await app.inject({ method: 'GET', url: `/api/v1/projection/groups/${groupId}/students/${studentId}?showStudent=true`, headers: { origin, cookie } });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      avatar: 'default',
      alias: 'Demo Student',
      specialty: 'Communication',
      unlockedBadge: null,
      xpLevel: 1,
      progressToNextLevel: 0,
      energyVisualState: 'stable',
      coinBalance: 0,
      narrativeProgress: 0,
      behaviourState: 'NORMAL',
    });
  });

  it('validates group and student identifiers without exposing records', async () => {
    const { app, cookie } = await authenticatedApp();
    const invalid = await app.inject({ method: 'GET', url: '/api/v1/projection/groups/not-a-uuid/students', headers: { origin, cookie } });
    expect(invalid.statusCode).toBe(400);
    const absent = await app.inject({ method: 'GET', url: '/api/v1/projection/groups/00000000-0000-4000-8000-000000000099/students', headers: { origin, cookie } });
    expect(absent.statusCode).toBe(404);
  });
});
