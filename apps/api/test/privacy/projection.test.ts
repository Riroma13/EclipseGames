import { afterEach, describe, expect, it } from 'vitest';
import { createServer } from '../../src/server.js';

const credentials = { email: 'teacher@example.test', password: 'correct horse battery staple' };
const origin = 'http://localhost:5173';
const groupId = '00000000-0000-4000-8000-000000000001';
const apps: Awaited<ReturnType<typeof createServer>>[] = [];

afterEach(async () => { for (const app of apps.splice(0)) await app.close(); });

async function authenticatedApp() {
  const app = createServer(':memory:', { logger: false, bootstrapTeacher: credentials });
  apps.push(app);
  const login = await app.inject({ method: 'POST', url: '/api/v1/auth/session', headers: { origin }, payload: credentials });
  return { app, cookie: login.headers['set-cookie'] };
}

describe('projection privacy boundary', () => {
  it('keeps obsolete fixture routes absent', async () => {
    const app = createServer(':memory:', { logger: false }); apps.push(app);
    const response = await app.inject({ method: 'GET', url: `/api/v1/projection/groups/${groupId}/students` });
    expect(response.statusCode).toBe(404);
  });

  it('rejects anonymous gameplay display access with no-store headers', async () => {
    const app = createServer(':memory:', { logger: false }); apps.push(app);
    const response = await app.inject({ method: 'GET', url: `/api/v1/projection/groups/${groupId}/display` });
    expect(response.statusCode).toBe(401);
    expect(response.headers['cache-control']).toBe('no-store');
  });

  it('returns only allowlisted student fields from gameplay display', async () => {
    const { app, cookie } = await authenticatedApp();
    const year = await app.inject({ method: 'POST', url: '/api/v1/academic-years', headers: { origin, cookie }, payload: { label: 'Display year', startsOn: '2026-09-01', endsOn: '2027-07-01' } });
    const group = await app.inject({ method: 'POST', url: `/api/v1/academic-years/${year.json().id}/groups`, headers: { origin, cookie }, payload: { name: 'Display group' } });
    const created = await app.inject({ method: 'POST', url: `/api/v1/groups/${group.json().id}/students`, headers: { origin, cookie }, payload: { students: [{ realName: 'Private Display Name', alias: 'Visible Alias', specialty: 'Diplomat' }] } });
    expect(created.statusCode).toBe(200);
    const response = await app.inject({ method: 'GET', url: `/api/v1/projection/groups/${group.json().id}/display?fields=realName,rtAverage,comments`, headers: { origin, cookie } });
    expect(response.statusCode).toBe(200);
    expect(Object.keys(response.json().students[0]).sort()).toEqual(['alias', 'avatar', 'progressToNextLevel', 'specialty', 'unlockedBadge', 'xpLevel'].sort());
    expect(JSON.stringify(response.json())).not.toMatch(/Private Display Name|realName|rtAverage|rubric|grade|comments|incidents|history|redCode|disciplinary/i);
  });

  it('keeps an unrevealed Prompt Deck prompt out of the classroom display', async () => {
    const { app, cookie } = await authenticatedApp(); const headers = { origin, cookie };
    const year = await app.inject({ method: 'POST', url: '/api/v1/academic-years', headers, payload: { label: 'Prompt privacy year', startsOn: '2026-09-01', endsOn: '2027-07-01' } });
    const group = await app.inject({ method: 'POST', url: `/api/v1/academic-years/${year.json().id}/groups`, headers, payload: { name: 'Prompt privacy group' } });
    const deck = await app.inject({ method: 'POST', url: '/api/v1/prompt-decks', headers, payload: { title: 'Private prompt deck', prompts: ['Private classroom question.', 'Follow-up question.'] } });
    await app.inject({ method: 'POST', url: `/api/v1/groups/${group.json().id}/minigames/prompt-deck`, headers, payload: { deckId: deck.json().id } });
    const hidden = await app.inject({ method: 'GET', url: `/api/v1/projection/groups/${group.json().id}/display`, headers });
    expect(hidden.json()).toMatchObject({ scene: 'MINIGAME', minigame: { prompt: 'Prompt ready.', promptRevealed: false } });
    expect(JSON.stringify(hidden.json())).not.toContain('Private classroom question.');
  });
});
