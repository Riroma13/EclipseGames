import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createServer } from '../../src/server.js';
import * as coinRepository from '../../src/coins/repository.js';

const origin = 'http://localhost:5173';
const credentials = { email: 'teacher@example.test', password: 'correct horse battery staple' };
const apps: Awaited<ReturnType<typeof createServer>>[] = [];
const directories: string[] = [];

afterEach(async () => {
  vi.restoreAllMocks();
  for (const app of apps.splice(0)) await app.close();
  for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

function key(number: number) {
  return `00000000-0000-4000-8000-${String(number).padStart(12, '0')}`;
}

async function authenticatedApp(options: { database?: string; teacher?: typeof credentials } = {}) {
  const app = createServer(options.database ?? ':memory:', { logger: false, bootstrapTeacher: options.teacher ?? credentials });
  apps.push(app);
  const teacher = options.teacher ?? credentials;
  const login = await app.inject({ method: 'POST', url: '/api/v1/auth/session', headers: { origin }, payload: teacher });
  expect(login.statusCode).toBe(204);
  return { app, headers: { origin, cookie: login.headers['set-cookie'] } };
}

async function classroom(app: Awaited<ReturnType<typeof createServer>>, headers: Record<string, unknown>, label: string, count = 4) {
  const year = await app.inject({ method: 'POST', url: '/api/v1/academic-years', headers, payload: { label, startsOn: '2026-09-01', endsOn: '2027-07-01' } });
  expect(year.statusCode).toBe(200);
  const yearId = year.json().id as string;
  const group = await app.inject({ method: 'POST', url: `/api/v1/academic-years/${yearId}/groups`, headers, payload: { name: `${label} group` } });
  expect(group.statusCode).toBe(200);
  const groupId = group.json().id as string;
  const students = Array.from({ length: count }, (_, index) => ({ realName: `${label} Private ${index + 1}`, alias: `${label} Alias ${index + 1}`, avatar: index % 2 ? 'fox' : 'default', specialty: index % 2 ? 'Analyst' : 'Leader' }));
  const roster = await app.inject({ method: 'POST', url: `/api/v1/groups/${groupId}/students`, headers, payload: { students } });
  expect(roster.statusCode).toBe(200);
  return { yearId, groupId, studentIds: roster.json().map((student: { id: string }) => student.id) as string[] };
}

describe('event creation idempotency', () => {
  it('replays event creation by idempotency key and rejects changed request content', async () => {
    const { app, headers } = await authenticatedApp();
    const { groupId } = await classroom(app, headers, 'Event replay', 2);
    const payload = { title: 'Replayable event', description: 'Create this once.', theme: 'MISSION', showOnProjection: false };
    const requestHeaders = { ...headers, 'idempotency-key': key(60) };
    expect((await app.inject({ method: 'POST', url: `/api/v1/groups/${groupId}/events`, headers, payload })).statusCode).toBe(422);

    const created = await app.inject({ method: 'POST', url: `/api/v1/groups/${groupId}/events`, headers: requestHeaders, payload });
    expect(created.statusCode).toBe(201);
    const replay = await app.inject({ method: 'POST', url: `/api/v1/groups/${groupId}/events`, headers: requestHeaders, payload });
    expect(replay.statusCode).toBe(200);
    expect(replay.json()).toEqual(created.json());

    const conflict = await app.inject({ method: 'POST', url: `/api/v1/groups/${groupId}/events`, headers: requestHeaders, payload: { ...payload, title: 'Changed event' } });
    expect(conflict.statusCode).toBe(409);
    expect(conflict.json()).toMatchObject({ code: 'CONFLICT' });
    expect((await app.inject({ method: 'GET', url: `/api/v1/groups/${groupId}/events`, headers })).json()).toHaveLength(1);
  });
});

describe('manual Eclipse Points API foundation', () => {
  it('keeps manual grants at exactly +1 and corrects an unallocated grant append-only', async () => {
    const { app, headers } = await authenticatedApp();
    const { yearId, groupId, studentIds } = await classroom(app, headers, 'Manual points', 2);
    const studentId = studentIds[0];
    const sources = ['PERSONAL_IMPROVEMENT', 'EXCEPTIONAL_FRENCH', 'EXCEPTIONAL_COLLABORATION', 'SPECIAL_CHALLENGE'] as const;
    const grants = [] as string[];
    for (const [index, source] of sources.entries()) {
      const response = await app.inject({ method: 'POST', url: `/api/v1/students/${studentId}/coin-grants`, headers: { ...headers, 'idempotency-key': key(index + 1) }, payload: { academicYearId: yearId, source } });
      expect(response.statusCode).toBe(201);
      grants.push(response.json().id as string);
      expect(response.json()).toMatchObject({ studentId, academicYearId: yearId, balance: index + 1 });
    }
    const replay = await app.inject({ method: 'POST', url: `/api/v1/students/${studentId}/coin-grants`, headers: { ...headers, 'idempotency-key': key(1) }, payload: { academicYearId: yearId, source: sources[0] } });
    expect(replay.statusCode).toBe(200);
    expect(replay.json().id).toBe(grants[0]);
    const missingKey = await app.inject({ method: 'POST', url: `/api/v1/students/${studentId}/coin-grants`, headers, payload: { academicYearId: yearId, source: sources[0] } });
    expect(missingKey.statusCode).toBe(422);
    const malformedKey = await app.inject({ method: 'POST', url: `/api/v1/students/${studentId}/coin-grants`, headers: { ...headers, 'idempotency-key': 'not-a-uuid' }, payload: { academicYearId: yearId, source: sources[0] } });
    expect(malformedKey.statusCode).toBe(422);

    for (const amount of [2, -1]) {
      const invalid = await app.inject({ method: 'POST', url: `/api/v1/students/${studentId}/coin-grants`, headers, payload: { academicYearId: yearId, source: 'PERSONAL_IMPROVEMENT', amount } });
      expect(invalid.statusCode).toBe(422);
      expect(invalid.json()).toMatchObject({ code: 'VALIDATION_FAILED' });
    }
    const automatic = await app.inject({ method: 'POST', url: `/api/v1/students/${studentId}/coin-grants`, headers, payload: { academicYearId: yearId, source: 'LEVEL_ENTITLEMENT' } });
    expect(automatic.statusCode).toBe(422);

    const correction = await app.inject({ method: 'POST', url: `/api/v1/coin-grants/${grants[0]}/reversal`, headers: { ...headers, 'idempotency-key': key(20) }, payload: {} });
    expect(correction.statusCode).toBe(201);
    expect(correction.json()).toMatchObject({ grantId: grants[0], source: 'MANUAL_CORRECTION', amount: -1, replay: false });
    const correctionReplay = await app.inject({ method: 'POST', url: `/api/v1/coin-grants/${grants[0]}/reversal`, headers: { ...headers, 'idempotency-key': key(20) }, payload: {} });
    expect(correctionReplay.statusCode).toBe(200);
    expect(correctionReplay.json().id).toBe(correction.json().id);
    const missingCorrectionKey = await app.inject({ method: 'POST', url: `/api/v1/coin-grants/${grants[1]}/reversal`, headers, payload: {} });
    expect(missingCorrectionKey.statusCode).toBe(422);
    const duplicate = await app.inject({ method: 'POST', url: `/api/v1/coin-grants/${grants[0]}/reversal`, headers: { ...headers, 'idempotency-key': key(21) }, payload: {} });
    expect(duplicate.statusCode).toBe(409);

    const context = await app.inject({ method: 'POST', url: '/api/v1/assessment-contexts', headers, payload: { groupId, name: 'Uses points' } });
    const invalidAdvantageKey = await app.inject({ method: 'POST', url: `/api/v1/students/${studentId}/advantages`, headers: { ...headers, 'idempotency-key': 'zzzzzzzz-zzzz-4zzz-8zzz-zzzzzzzzzzzz' }, payload: { assessmentContextId: context.json().id, rewardId: 'standard-assessment-advantage' } });
    expect(invalidAdvantageKey.statusCode).toBe(422);
    expect(invalidAdvantageKey.json()).toMatchObject({ code: 'VALIDATION_FAILED' });
    const redemption = await app.inject({ method: 'POST', url: `/api/v1/students/${studentId}/advantages`, headers: { ...headers, 'idempotency-key': key(30) }, payload: { assessmentContextId: context.json().id, rewardId: 'standard-assessment-advantage' } });
    expect(redemption.statusCode).toBe(201);
    const allocatedGrant = (await app.inject({ method: 'GET', url: `/api/v1/students/${studentId}/coin-ledger?academicYearId=${yearId}`, headers })).json().find((entry: { source: string; id: string }) => entry.source === 'EXCEPTIONAL_FRENCH') as { id: string };
    const allocatedCorrection = await app.inject({ method: 'POST', url: `/api/v1/coin-grants/${allocatedGrant.id}/reversal`, headers: { ...headers, 'idempotency-key': key(22) }, payload: {} });
    expect(allocatedCorrection.statusCode).toBe(409);
    expect(allocatedCorrection.json()).toMatchObject({ code: 'CONFLICT', message: 'Allocated assessment coin grants cannot be corrected.' });

    const ledger = (await app.inject({ method: 'GET', url: `/api/v1/students/${studentId}/coin-ledger?academicYearId=${yearId}`, headers })).json() as Array<{ amount: number; source: string; correctionOfId: string | null }>;
    expect(ledger.filter(entry => entry.source === 'PERSONAL_IMPROVEMENT')).toHaveLength(1);
    expect(ledger.filter(entry => entry.source === 'MANUAL_CORRECTION')).toEqual([expect.objectContaining({ amount: -1, correctionOfId: grants[0] })]);
    expect(ledger.filter(entry => entry.source === 'REDEMPTION_DEBIT')).toHaveLength(1);
    expect(ledger.reduce((sum, entry) => sum + entry.amount, 0)).toBe(1);
  });

  it('enforces ownership and archived checks for manual point writes', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'eclipsegames-manual-points-'));
    directories.push(directory);
    const database = join(directory, 'api.sqlite');
    const owner = await authenticatedApp({ database, teacher: { email: 'owner@example.test', password: 'owner password' } });
    const other = await authenticatedApp({ database, teacher: { email: 'other@example.test', password: 'other password' } });
    const owned = await classroom(owner.app, owner.headers, 'Owned points', 1);
    const studentId = owned.studentIds[0];
    const foreign = await other.app.inject({ method: 'POST', url: `/api/v1/students/${studentId}/coin-grants`, headers: { ...other.headers, 'idempotency-key': key(23) }, payload: { academicYearId: owned.yearId, source: 'PERSONAL_IMPROVEMENT' } });
    expect(foreign.statusCode).toBe(404);
    expect((await owner.app.inject({ method: 'POST', url: `/api/v1/students/${studentId}/archive`, headers: owner.headers })).statusCode).toBe(204);
    const archived = await owner.app.inject({ method: 'POST', url: `/api/v1/students/${studentId}/coin-grants`, headers: { ...owner.headers, 'idempotency-key': key(24) }, payload: { academicYearId: owned.yearId, source: 'PERSONAL_IMPROVEMENT' } });
    expect(archived.statusCode).toBe(422);
    expect((await owner.app.inject({ method: 'GET', url: `/api/v1/students/${studentId}/coin-ledger?academicYearId=${owned.yearId}`, headers: owner.headers })).json()).toEqual([]);
  });

  it('maps concurrent manual corrections to one typed conflict', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'eclipsegames-manual-correction-race-'));
    directories.push(directory);
    const database = join(directory, 'api.sqlite');
    const owner = await authenticatedApp({ database });
    const contender = await authenticatedApp({ database });
    const { yearId, studentIds } = await classroom(owner.app, owner.headers, 'Correction race', 1);
    const grant = await owner.app.inject({ method: 'POST', url: `/api/v1/students/${studentIds[0]}/coin-grants`, headers: { ...owner.headers, 'idempotency-key': key(70) }, payload: { academicYearId: yearId, source: 'PERSONAL_IMPROVEMENT' } });
    expect(grant.statusCode).toBe(201);
    const grantId = grant.json().id as string;
    const [first, second] = await Promise.all([
      owner.app.inject({ method: 'POST', url: `/api/v1/coin-grants/${grantId}/reversal`, headers: { ...owner.headers, 'idempotency-key': key(71) }, payload: {} }),
      contender.app.inject({ method: 'POST', url: `/api/v1/coin-grants/${grantId}/reversal`, headers: { ...contender.headers, 'idempotency-key': key(72) }, payload: {} }),
    ]);
    expect([first.statusCode, second.statusCode].sort()).toEqual([201, 409]);
    const conflict = first.statusCode === 409 ? first : second;
    expect(conflict.json()).toMatchObject({ code: 'CONFLICT', message: 'Coin grant is already corrected.' });
    const ledger = (await owner.app.inject({ method: 'GET', url: `/api/v1/students/${studentIds[0]}/coin-ledger?academicYearId=${yearId}`, headers: owner.headers })).json() as Array<{ source: string; correctionOfId: string | null }>;
    expect(ledger.filter(entry => entry.source === 'MANUAL_CORRECTION' && entry.correctionOfId === grantId)).toHaveLength(1);
  });

  it('maps the manual correction target unique race without swallowing other errors', async () => {
    const { app, headers } = await authenticatedApp();
    const { yearId, studentIds } = await classroom(app, headers, 'Correction error', 1);
    const grant = await app.inject({ method: 'POST', url: `/api/v1/students/${studentIds[0]}/coin-grants`, headers: { ...headers, 'idempotency-key': key(73) }, payload: { academicYearId: yearId, source: 'PERSONAL_IMPROVEMENT' } });
    const targetRace = Object.assign(new Error('UNIQUE constraint failed: coin_ledger.correction_of_id'), { code: 'SQLITE_CONSTRAINT_UNIQUE' });
    const correction = vi.spyOn(coinRepository, 'correctManualGrant').mockImplementation(() => { throw targetRace; });
    const response = await app.inject({ method: 'POST', url: `/api/v1/coin-grants/${grant.json().id}/reversal`, headers: { ...headers, 'idempotency-key': key(74) }, payload: {} });
    expect(response.statusCode).toBe(409);
    expect(response.json()).toMatchObject({ code: 'CONFLICT', message: 'Coin grant is already corrected.' });
    expect(correction).toHaveBeenCalled();
    correction.mockImplementation(() => { throw Object.assign(new Error('UNIQUE constraint failed: coin_ledger.id'), { code: 'SQLITE_CONSTRAINT_UNIQUE' }); });
    const unrelated = await app.inject({ method: 'POST', url: `/api/v1/coin-grants/${grant.json().id}/reversal`, headers: { ...headers, 'idempotency-key': key(75) }, payload: {} });
    expect(unrelated.statusCode).toBe(500);
  });

  it('maps the assessment refund unique race without swallowing other errors', async () => {
    const { app, headers } = await authenticatedApp();
    const { yearId, groupId, studentIds } = await classroom(app, headers, 'Assessment reversal race', 1);
    for (const [index, source] of ['PERSONAL_IMPROVEMENT', 'EXCEPTIONAL_FRENCH', 'SPECIAL_CHALLENGE'].entries()) {
      const grant = await app.inject({ method: 'POST', url: `/api/v1/students/${studentIds[0]}/coin-grants`, headers: { ...headers, 'idempotency-key': key(90 + index) }, payload: { academicYearId: yearId, source } });
      expect(grant.statusCode).toBe(201);
    }
    const context = await app.inject({ method: 'POST', url: '/api/v1/assessment-contexts', headers, payload: { groupId, name: 'Assessment reversal' } });
    const redemption = await app.inject({ method: 'POST', url: `/api/v1/students/${studentIds[0]}/advantages`, headers: { ...headers, 'idempotency-key': key(93) }, payload: { assessmentContextId: context.json().id, rewardId: 'standard-assessment-advantage' } });
    expect(redemption.statusCode).toBe(201);
    const targetRace = Object.assign(new Error('UNIQUE constraint failed: coin_ledger.redemption_id'), { code: 'SQLITE_CONSTRAINT_UNIQUE' });
    const refund = vi.spyOn(coinRepository, 'refund').mockImplementation(() => { throw targetRace; });
    const response = await app.inject({ method: 'POST', url: `/api/v1/advantage-redemptions/${redemption.json().id}/reversal`, headers: { ...headers, 'idempotency-key': key(94) }, payload: {} });
    expect(response.statusCode).toBe(409);
    expect(response.json()).toMatchObject({ code: 'CONFLICT', message: 'Redemption is already reversed.' });
    expect(refund).toHaveBeenCalled();
    refund.mockImplementation(() => { throw Object.assign(new Error('UNIQUE constraint failed: coin_ledger.id'), { code: 'SQLITE_CONSTRAINT_UNIQUE' }); });
    const unrelated = await app.inject({ method: 'POST', url: `/api/v1/advantage-redemptions/${redemption.json().id}/reversal`, headers: { ...headers, 'idempotency-key': key(95) }, payload: {} });
    expect(unrelated.statusCode).toBe(500);
  });
});

describe('collective challenge pause workflow', () => {
  it('pauses, resumes, atomically increments, and excludes paused challenges from projection', async () => {
    const { app, headers } = await authenticatedApp();
    const { groupId } = await classroom(app, headers, 'Paused challenge', 2);
    const created = await app.inject({ method: 'POST', url: `/api/v1/groups/${groupId}/challenges`, headers, payload: { title: 'Pause me', description: 'A collective target.', target: 3, showOnProjection: true } });
    const challengeId = created.json().id as string;
    await app.inject({ method: 'POST', url: `/api/v1/challenges/${challengeId}/activate`, headers });
    const paused = await app.inject({ method: 'POST', url: `/api/v1/challenges/${challengeId}/pause`, headers });
    expect(paused.statusCode).toBe(200);
    expect(paused.json()).toMatchObject({ status: 'PAUSED', progress: 0, showOnProjection: true });
    const blockedProgress = await app.inject({ method: 'POST', url: `/api/v1/challenges/${challengeId}/progress`, headers, payload: { delta: 1 } });
    expect(blockedProgress.statusCode).toBe(422);
    expect((await app.inject({ method: 'GET', url: `/api/v1/projection/groups/${groupId}/display`, headers })).json()).toMatchObject({ scene: 'IDLE', activeChallenge: null });

    expect((await app.inject({ method: 'POST', url: `/api/v1/challenges/${challengeId}/resume`, headers })).json()).toMatchObject({ status: 'ACTIVE' });
    const increments = await Promise.all([1, 2].map(() => app.inject({ method: 'POST', url: `/api/v1/challenges/${challengeId}/progress`, headers, payload: { delta: 1 } })));
    expect(increments.every(response => response.statusCode === 200)).toBe(true);
    const afterConcurrent = (await app.inject({ method: 'GET', url: `/api/v1/groups/${groupId}/challenges`, headers })).json().find((challenge: { id: string }) => challenge.id === challengeId);
    expect(afterConcurrent).toMatchObject({ status: 'ACTIVE', progress: 2, target: 3 });
    const completed = await app.inject({ method: 'POST', url: `/api/v1/challenges/${challengeId}/progress`, headers, payload: { delta: 1 } });
    expect(completed.json()).toMatchObject({ status: 'COMPLETED', progress: 3, completedAt: expect.any(String) });
    const reopened = await app.inject({ method: 'POST', url: `/api/v1/challenges/${challengeId}/progress`, headers, payload: { delta: -1 } });
    expect(reopened.json()).toMatchObject({ status: 'ACTIVE', progress: 2, completedAt: null });
    const invalid = await app.inject({ method: 'POST', url: `/api/v1/challenges/${challengeId}/progress`, headers, payload: { delta: 0 } });
    expect(invalid.statusCode).toBe(422);
  });
});

describe('teacher-owned classroom content', () => {
  it('persists, updates, archives, and snapshots French Sprint presets', async () => {
    const { app, headers } = await authenticatedApp();
    const { groupId } = await classroom(app, headers, 'Sprint presets', 2);
    const created = await app.inject({ method: 'POST', url: '/api/v1/minigame-presets', headers, payload: { title: 'Weekend', prompt: 'Describe your weekend.', durationSeconds: 30 } });
    expect(created.statusCode).toBe(201);
    const presetId = created.json().id as string;
    expect((await app.inject({ method: 'GET', url: '/api/v1/minigame-presets', headers })).json()).toEqual([created.json()]);
    const launched = await app.inject({ method: 'POST', url: `/api/v1/groups/${groupId}/minigames/french-sprint/from-preset/${presetId}`, headers });
    expect(launched.statusCode).toBe(201);
    const minigameId = launched.json().id as string;
    expect(launched.json()).toMatchObject({ kind: 'FRENCH_SPRINT', title: 'Weekend', prompt: 'Describe your weekend.', durationSeconds: 30, remainingSeconds: 30 });
    const updated = await app.inject({ method: 'PATCH', url: `/api/v1/minigame-presets/${presetId}`, headers, payload: { title: 'Updated Weekend', prompt: 'Speak about Monday.', durationSeconds: 60 } });
    expect(updated.statusCode).toBe(200);
    expect((await app.inject({ method: 'GET', url: `/api/v1/groups/${groupId}/minigames/current`, headers })).json()).toMatchObject({ id: minigameId, title: 'Weekend', prompt: 'Describe your weekend.', durationSeconds: 30 });
    const archived = await app.inject({ method: 'POST', url: `/api/v1/minigame-presets/${presetId}/archive`, headers });
    expect(archived.statusCode).toBe(200);
    expect((await app.inject({ method: 'GET', url: '/api/v1/minigame-presets', headers })).json()).toEqual([]);
    expect((await app.inject({ method: 'GET', url: '/api/v1/minigame-presets?includeArchived=true', headers })).json()).toEqual([archived.json()]);
    const blockedLaunch = await app.inject({ method: 'POST', url: `/api/v1/groups/${groupId}/minigames/french-sprint/from-preset/${presetId}`, headers });
    expect(blockedLaunch.statusCode).toBe(422);
  });

  it('keeps presets teacher-owned and never crosses a group owner boundary', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'eclipsegames-content-ownership-'));
    directories.push(directory);
    const database = join(directory, 'api.sqlite');
    const owner = await authenticatedApp({ database, teacher: { email: 'owner@example.test', password: 'owner password' } });
    const other = await authenticatedApp({ database, teacher: { email: 'other@example.test', password: 'other password' } });
    const owned = await classroom(owner.app, owner.headers, 'Content owner', 2);
    const preset = await owner.app.inject({ method: 'POST', url: '/api/v1/minigame-presets', headers: owner.headers, payload: { title: 'Private preset', prompt: 'Private prompt.', durationSeconds: 30 } });
    const presetId = preset.json().id as string;
    expect((await other.app.inject({ method: 'GET', url: '/api/v1/minigame-presets', headers: other.headers })).json()).toEqual([]);
    expect((await other.app.inject({ method: 'PATCH', url: `/api/v1/minigame-presets/${presetId}`, headers: other.headers, payload: { title: 'Take it', prompt: 'No.', durationSeconds: 30 } })).statusCode).toBe(404);
    expect((await other.app.inject({ method: 'POST', url: `/api/v1/groups/${owned.groupId}/minigames/french-sprint/from-preset/${presetId}`, headers: other.headers })).statusCode).toBe(404);
    const deck = await owner.app.inject({ method: 'POST', url: '/api/v1/prompt-decks', headers: owner.headers, payload: { title: 'Private deck', prompts: ['Private prompt.'] } });
    const deckId = deck.json().id as string;
    expect((await other.app.inject({ method: 'GET', url: '/api/v1/prompt-decks', headers: other.headers })).json()).toEqual([]);
    expect((await other.app.inject({ method: 'PATCH', url: `/api/v1/prompt-decks/${deckId}`, headers: other.headers, payload: { title: 'Take it', prompts: ['No.'] } })).statusCode).toBe(404);
    expect((await other.app.inject({ method: 'POST', url: `/api/v1/prompt-decks/${deckId}/archive`, headers: other.headers })).statusCode).toBe(404);
  });
});

describe('team draw, prompt decks, and projection controls', () => {
  it('assigns every active student once, shuffles safely, and exposes aliases only to projection', async () => {
    const { app, headers } = await authenticatedApp();
    const { groupId, studentIds } = await classroom(app, headers, 'Team draw', 6);
    const launched = await app.inject({ method: 'POST', url: `/api/v1/groups/${groupId}/minigames/team-draw`, headers, payload: { teamCount: 3 } });
    expect(launched.statusCode).toBe(201);
    const minigameId = launched.json().id as string;
    const assertTeams = (value: any) => {
      expect(value).toMatchObject({ kind: 'TEAM_DRAW', teamCount: 3 });
      const assigned = value.teams.flatMap((team: any) => team.students.map((student: any) => student.id));
      expect(assigned).toHaveLength(studentIds.length);
      expect(new Set(assigned)).toEqual(new Set(studentIds));
      expect(value.teams.every((team: any) => team.students.every((student: any) => typeof student.realName === 'string'))).toBe(true);
    };
    assertTeams(launched.json());
    const shuffled = await app.inject({ method: 'POST', url: `/api/v1/minigames/${minigameId}/shuffle`, headers });
    expect(shuffled.statusCode).toBe(200);
    assertTeams(shuffled.json());
    const projection = await app.inject({ method: 'GET', url: `/api/v1/projection/groups/${groupId}/display`, headers });
    expect(projection.statusCode).toBe(200);
    expect(projection.json()).toMatchObject({ scene: 'MINIGAME', minigame: { kind: 'TEAM_DRAW', teamCount: 3 } });
    expect(JSON.stringify(projection.json().minigame)).not.toMatch(/Private|realName|studentId|ownerTeacherId/);
    expect(projection.json().minigame.teams.every((team: any) => team.students === undefined && team.aliases.length > 0)).toBe(true);

    const cleared = await app.inject({ method: 'POST', url: `/api/v1/teacher/groups/${groupId}/display/clear`, headers });
    expect(cleared.statusCode).toBe(200);
    expect(cleared.json()).toMatchObject({ scene: 'IDLE', resourceId: null });
    expect((await app.inject({ method: 'GET', url: `/api/v1/groups/${groupId}/minigames/current`, headers })).json()).toBeNull();
    expect((await app.inject({ method: 'POST', url: `/api/v1/minigames/${minigameId}/end`, headers })).statusCode).toBe(422);
  });

  it('snapshots prompt deck strings, advances in order, and clears display precedence without private leakage', async () => {
    const { app, headers } = await authenticatedApp();
    const { groupId } = await classroom(app, headers, 'Prompt deck', 2);
    const deck = await app.inject({ method: 'POST', url: '/api/v1/prompt-decks', headers, payload: { title: 'Conversation cards', prompts: ['First question.', 'Second question.', 'Third question.'] } });
    expect(deck.statusCode).toBe(201);
    const deckId = deck.json().id as string;
    expect((await app.inject({ method: 'GET', url: '/api/v1/prompt-decks', headers })).json()).toEqual([deck.json()]);
    const event = await app.inject({ method: 'POST', url: `/api/v1/groups/${groupId}/events`, headers: { ...headers, 'idempotency-key': key(40) }, payload: { title: 'Visible event', description: 'Safe description.', showOnProjection: true, theme: 'MISSION' } });
    await app.inject({ method: 'POST', url: `/api/v1/events/${event.json().id}/activate`, headers });
    const challenge = await app.inject({ method: 'POST', url: `/api/v1/groups/${groupId}/challenges`, headers, payload: { title: 'Visible challenge', description: 'Safe objective.', target: 2, showOnProjection: true } });
    await app.inject({ method: 'POST', url: `/api/v1/challenges/${challenge.json().id}/activate`, headers });
    const launched = await app.inject({ method: 'POST', url: `/api/v1/groups/${groupId}/minigames/prompt-deck`, headers, payload: { deckId } });
    expect(launched.statusCode).toBe(201);
    const sessionId = launched.json().id as string;
    expect(launched.json()).toMatchObject({ kind: 'PROMPT_DECK', title: 'Conversation cards', prompt: 'First question.', promptRevealed: false, promptIndex: 0, promptCount: 3 });
    const updated = await app.inject({ method: 'PATCH', url: `/api/v1/prompt-decks/${deckId}`, headers, payload: { title: 'Changed deck', prompts: ['Changed question.'] } });
    expect(updated.statusCode).toBe(200);
    expect((await app.inject({ method: 'GET', url: `/api/v1/groups/${groupId}/minigames/current`, headers })).json()).toMatchObject({ id: sessionId, title: 'Conversation cards', prompt: 'First question.', promptRevealed: false, promptCount: 3 });
    expect((await app.inject({ method: 'POST', url: `/api/v1/minigames/${sessionId}/draw`, headers })).json()).toMatchObject({ prompt: 'First question.' });
    expect((await app.inject({ method: 'POST', url: `/api/v1/minigames/${sessionId}/next`, headers })).json()).toMatchObject({ prompt: 'Second question.', promptRevealed: false, promptIndex: 1 });
    expect((await app.inject({ method: 'GET', url: `/api/v1/projection/groups/${groupId}/display`, headers })).json()).toMatchObject({ scene: 'MINIGAME', minigame: { kind: 'PROMPT_DECK', title: 'Conversation cards', prompt: 'Prompt ready.', promptRevealed: false } });
    const projectionJson = JSON.stringify((await app.inject({ method: 'GET', url: `/api/v1/projection/groups/${groupId}/display`, headers })).json());
    expect(projectionJson).not.toContain('Changed question.');
    expect(projectionJson).not.toContain('prompts');
    const revealedSecond = await app.inject({ method: 'POST', url: `/api/v1/minigames/${sessionId}/reveal`, headers });
    expect(revealedSecond.json()).toMatchObject({ prompt: 'Second question.', promptRevealed: true });
    expect((await app.inject({ method: 'GET', url: `/api/v1/projection/groups/${groupId}/display`, headers })).json()).toMatchObject({ minigame: { prompt: 'Second question.', promptRevealed: true } });
    const third = await app.inject({ method: 'POST', url: `/api/v1/minigames/${sessionId}/next`, headers });
    expect(third.json()).toMatchObject({ prompt: 'Third question.', promptRevealed: false, promptIndex: 2 });
    expect((await app.inject({ method: 'GET', url: `/api/v1/projection/groups/${groupId}/display`, headers })).json()).toMatchObject({ minigame: { prompt: 'Prompt ready.', promptRevealed: false } });
    expect((await app.inject({ method: 'POST', url: `/api/v1/minigames/${sessionId}/next`, headers })).statusCode).toBe(422);
    const randomPrompt = await app.inject({ method: 'POST', url: `/api/v1/minigames/${sessionId}/random`, headers });
    expect(randomPrompt.statusCode).toBe(200);
    expect(randomPrompt.json().promptRevealed).toBe(false);
    expect(['First question.', 'Second question.', 'Third question.']).toContain(randomPrompt.json().prompt);
    expect((await app.inject({ method: 'GET', url: `/api/v1/projection/groups/${groupId}/display`, headers })).json()).toMatchObject({ minigame: { prompt: 'Prompt ready.', promptRevealed: false } });
    const revealedPrompt = await app.inject({ method: 'POST', url: `/api/v1/minigames/${sessionId}/reveal`, headers });
    expect(revealedPrompt.statusCode).toBe(200);
    expect(revealedPrompt.json()).toMatchObject({ prompt: randomPrompt.json().prompt, promptRevealed: true });
    expect((await app.inject({ method: 'GET', url: `/api/v1/projection/groups/${groupId}/display`, headers })).json()).toMatchObject({ minigame: { prompt: randomPrompt.json().prompt, promptRevealed: true } });
    const control = await app.inject({ method: 'GET', url: `/api/v1/teacher/groups/${groupId}/display`, headers });
    expect(control.json()).toMatchObject({ scene: 'MINIGAME', resourceId: sessionId, display: { scene: 'MINIGAME' } });
    expect(JSON.stringify(control.json())).not.toMatch(/realName|Private|rtAverage|comments|ownerTeacherId/);
    const cleared = await app.inject({ method: 'POST', url: `/api/v1/teacher/groups/${groupId}/display/clear`, headers });
    expect(cleared.json()).toMatchObject({ scene: 'IDLE', resourceId: null, display: { scene: 'IDLE', activeEvent: null, activeChallenge: null, minigame: null } });
    expect((await app.inject({ method: 'GET', url: `/api/v1/projection/groups/${groupId}/display`, headers })).json()).toMatchObject({ scene: 'IDLE', activeEvent: null, activeChallenge: null, minigame: null });
    expect((await app.inject({ method: 'GET', url: `/api/v1/groups/${groupId}/minigames/current`, headers })).json()).toBeNull();
    expect((await app.inject({ method: 'POST', url: `/api/v1/minigames/${sessionId}/end`, headers })).statusCode).toBe(422);
    expect((await app.inject({ method: 'GET', url: `/api/v1/groups/${groupId}/events`, headers })).json()).toEqual([expect.objectContaining({ id: event.json().id, status: 'ACTIVE', showOnProjection: false })]);
    expect((await app.inject({ method: 'GET', url: `/api/v1/groups/${groupId}/challenges`, headers })).json()).toEqual([expect.objectContaining({ id: challenge.json().id, status: 'ACTIVE', showOnProjection: false })]);
    const archived = await app.inject({ method: 'POST', url: `/api/v1/prompt-decks/${deckId}/archive`, headers });
    expect(archived.statusCode).toBe(200);
    expect((await app.inject({ method: 'GET', url: '/api/v1/prompt-decks', headers })).json()).toEqual([]);
    expect((await app.inject({ method: 'GET', url: '/api/v1/prompt-decks?includeArchived=true', headers })).json()).toEqual([archived.json()]);
  });

  it('protects team and display controls from another teacher', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'eclipsegames-team-ownership-'));
    directories.push(directory);
    const database = join(directory, 'api.sqlite');
    const owner = await authenticatedApp({ database, teacher: { email: 'owner@example.test', password: 'owner password' } });
    const other = await authenticatedApp({ database, teacher: { email: 'other@example.test', password: 'other password' } });
    const owned = await classroom(owner.app, owner.headers, 'Team owner', 2);
    const launched = await owner.app.inject({ method: 'POST', url: `/api/v1/groups/${owned.groupId}/minigames/team-draw`, headers: owner.headers, payload: { teamCount: 2 } });
    const sessionId = launched.json().id as string;
    expect((await other.app.inject({ method: 'GET', url: `/api/v1/groups/${owned.groupId}/minigames/current`, headers: other.headers })).statusCode).toBe(404);
    expect((await other.app.inject({ method: 'POST', url: `/api/v1/minigames/${sessionId}/shuffle`, headers: other.headers })).statusCode).toBe(404);
    expect((await other.app.inject({ method: 'GET', url: `/api/v1/teacher/groups/${owned.groupId}/display`, headers: other.headers })).statusCode).toBe(404);
  });
});
