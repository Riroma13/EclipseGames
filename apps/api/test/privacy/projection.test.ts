import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createServer } from '../../src/server.js';

const credentials = { email: 'teacher@example.test', password: 'correct horse battery staple' };
const origin = 'http://localhost:5173';
const groupId = '00000000-0000-4000-8000-000000000001';
const studentId = '00000000-0000-4000-8000-000000000002';
const apps: Awaited<ReturnType<typeof createServer>>[] = [];
const databaseDirectories: string[] = [];

afterEach(async () => {
  for (const app of apps.splice(0)) await app.close();
  for (const directory of databaseDirectories.splice(0)) rmSync(directory, { recursive: true, force: true });
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

  it('rejects anonymous gameplay display access', async () => {
    const app = createServer(':memory:', { logger: false });
    apps.push(app);
    const response = await app.inject({ method: 'GET', url: `/api/v1/projection/groups/${groupId}/display` });
    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({ code: 'AUTH_REQUIRED' });
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

  it('isolates gameplay display data by teacher ownership', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'eclipsegames-gameplay-projection-'));
    databaseDirectories.push(directory);
    const databasePath = join(directory, 'api.sqlite');
    const ownerCredentials = { email: 'owner@example.test', password: 'owner password' };
    const otherCredentials = { email: 'other@example.test', password: 'other password' };
    const ownerApp = createServer(databasePath, { logger: false, bootstrapTeacher: ownerCredentials });
    apps.push(ownerApp);
    const ownerLogin = await ownerApp.inject({ method: 'POST', url: '/api/v1/auth/session', headers: { origin }, payload: ownerCredentials });
    const ownerHeaders = { origin, cookie: ownerLogin.headers['set-cookie'] };
    const year = await ownerApp.inject({ method: 'POST', url: '/api/v1/academic-years', headers: ownerHeaders, payload: { label: 'Owned year', startsOn: '2026-09-01', endsOn: '2027-07-01' } });
    const group = await ownerApp.inject({ method: 'POST', url: `/api/v1/academic-years/${year.json().id}/groups`, headers: ownerHeaders, payload: { name: 'Owned group' } });
    const otherApp = createServer(databasePath, { logger: false, bootstrapTeacher: otherCredentials });
    apps.push(otherApp);
    const otherLogin = await otherApp.inject({ method: 'POST', url: '/api/v1/auth/session', headers: { origin }, payload: otherCredentials });
    const response = await otherApp.inject({ method: 'GET', url: `/api/v1/projection/groups/${group.json().id}/display`, headers: { origin, cookie: otherLogin.headers['set-cookie'] } });
    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({ code: 'NOT_FOUND' });
  });

  it('returns only allowlisted student fields from gameplay display', async () => {
    const app = createServer(':memory:', { logger: false, bootstrapTeacher: credentials });
    apps.push(app);
    const login = await app.inject({ method: 'POST', url: '/api/v1/auth/session', headers: { origin }, payload: credentials });
    const headers = { origin, cookie: login.headers['set-cookie'] };
    const year = await app.inject({ method: 'POST', url: '/api/v1/academic-years', headers, payload: { label: 'Display year', startsOn: '2026-09-01', endsOn: '2027-07-01' } });
    const group = await app.inject({ method: 'POST', url: `/api/v1/academic-years/${year.json().id}/groups`, headers, payload: { name: 'Display group' } });
    const created = await app.inject({ method: 'POST', url: `/api/v1/groups/${group.json().id}/students`, headers, payload: { students: [{ realName: 'Private Display Name', alias: 'Visible Alias', avatar: 'owl', specialty: 'Diplomat' }] } });
    expect(created.statusCode).toBe(200);

    const response = await app.inject({ method: 'GET', url: `/api/v1/projection/groups/${group.json().id}/display?fields=realName,rtAverage,comments`, headers });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      group: { id: group.json().id, name: 'Display group' },
      activeEvent: null,
      activeChallenge: null,
      minigame: null,
      students: [{ avatar: 'owl', alias: 'Visible Alias', specialty: 'Diplomat', xpLevel: 1, progressToNextLevel: 0, unlockedBadge: null }],
    });
    expect(Object.keys(response.json().students[0]).sort()).toEqual(['alias', 'avatar', 'progressToNextLevel', 'specialty', 'unlockedBadge', 'xpLevel'].sort());
    expect(JSON.stringify(response.json())).not.toMatch(/Private Display Name|realName|rtAverage|rubric|grade|comments|incidents|history|redCode|disciplinary/i);
  });
});
