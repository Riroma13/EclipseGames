import type Database from 'better-sqlite3';
import { ensureOwnedDemoRoster, type DemoRosterStudent } from '../roster/service.js';
import * as xp from '../xp/service.js';
import type { XpCategory } from '../xp/service.js';
import * as coins from '../coins/repository.js';
import * as game from '../game/repository.js';

export const DEMO_YEAR = { id: '9b6f3b9e-3d0f-4b1e-9b1e-202620270001', label: '2026–2027', startsOn: '2026-09-01', endsOn: '2027-07-01' } as const;
export const DEMO_GROUP = { id: '9b6f3b9e-3d0f-4b1e-9b1e-202620270002', name: 'Demo · Groupe principal' } as const;
export const DEMO_EVENT = { id: '9b6f3b9e-3d0f-4b1e-9b1e-202620270101', title: 'La signal retrouvée', description: 'A short French-speaking mission for the class.', theme: 'NARRATIVE' as const };
export const DEMO_CHALLENGE = { id: '9b6f3b9e-3d0f-4b1e-9b1e-202620270102', title: 'French Only', description: 'Reach 20 spontaneous French contributions.', target: 20 } as const;
export const DEMO_PRESET = { id: '9b6f3b9e-3d0f-4b1e-9b1e-202620270103', title: 'Weekend Story', prompt: 'Tell a short story about your weekend in French.', durationSeconds: 60 } as const;
export const DEMO_PROMPT_DECK = { id: '9b6f3b9e-3d0f-4b1e-9b1e-202620270104', title: 'Conversation Starters', prompts: ['What did you do yesterday?', 'Describe the place where you are.', 'Ask a classmate one follow-up question.'] } as const;
export const DEMO_PREPARED_EVENT = { id: '9b6f3b9e-3d0f-4b1e-9b1e-202620270105', title: 'The Weekend Signal', description: 'A prepared speaking moment for the next lesson.', theme: 'MISSION' as const };
export const DEMO_PREPARED_CHALLENGE = { id: '9b6f3b9e-3d0f-4b1e-9b1e-202620270106', title: 'Ten French Voices', description: 'Prepare ten contributions in French.', target: 10 } as const;

const names = [
  ['Camille Martin', 'Camille', 'fox', 'Leader'], ['Lina Bernard', 'Lina', 'owl', 'Diplomat'],
  ['Noah Petit', 'Noah', 'cat', 'Strategist'], ['Inès Robert', 'Inès', 'wolf', 'Analyst'],
  ['Hugo Moreau', 'Hugo', 'default', 'Disciplined'], ['Maya Laurent', 'Maya', 'fox', 'Perseverant'],
  ['Adam Simon', 'Adam', 'owl', 'Helper'], ['Zoé Michel', 'Zoé', 'cat', 'Ally'],
  ['Sacha Leroy', 'Sacha', 'wolf', 'Leader'], ['Nora Roux', 'Nora', 'default', 'Diplomat'],
  ['Eli Fontaine', 'Eli', 'fox', 'Strategist'], ['Jade André', 'Jade', 'owl', 'Analyst'],
  ['Tom Garcia', 'Tom', 'cat', 'Disciplined'], ['Aya Lopez', 'Aya', 'wolf', 'Perseverant'],
  ['Louis Faure', 'Louis', 'default', 'Helper'], ['Emma Vidal', 'Emma', 'fox', 'Ally'],
] as const;
const studentIds = names.map((_, index) => `9b6f3b9e-3d0f-4b1e-9b1e-20262027${String(index + 10).padStart(4, '0')}`);
const requestIds = Array.from({ length: 64 }, (_, index) => `8a5d2c71-6e4f-4c20-9a1b-20262027${String(index + 1).padStart(4, '0')}`);
const xpPlan = [
  [1, 2, 3], [3, 3, 3], [3, 3, 3, 3, 3, 3, 3], [1, 1, 1], [2, 2], [3, 3, 3], [1], [2, 2, 2, 2],
  [1, 2], [3, 3, 3, 3, 3, 3], [3, 3, 3, 3, 3, 3, 3], [1, 1, 1, 1, 1], [2, 2, 2], [3, 3, 3, 3, 3, 3], [1, 1], [2, 2, 2, 2, 2, 2, 2],
] as const;
const coinGrantPlan = [2, 0, 1, 3, 0, 1, 0, 3, 0, 1, 2, 0, 1, 0, 3, 0] as const;
const coinGrantIds = Array.from({ length: coinGrantPlan.reduce((sum, count) => sum + count, 0 as number) }, (_, index) => `7c2f1a90-5d44-4c61-8f20-20262027${String(index + 1).padStart(4, '0')}`);
const coinGrantSources = ['PERSONAL_IMPROVEMENT', 'EXCEPTIONAL_FRENCH', 'EXCEPTIONAL_COLLABORATION', 'SPECIAL_CHALLENGE'] as const;

export const DEMO_STUDENTS: readonly DemoRosterStudent[] = names.map((value, index) => ({ id: studentIds[index], realName: value[0], alias: value[1], avatar: value[2], specialty: value[3] })) as readonly DemoRosterStudent[];

const categories = ['COMMUNICATION', 'PRECISION', 'CONSISTENCY', 'COLLABORATION'] as const;
const categoryFor = (specialty: string | null): XpCategory => categories[['Leader', 'Diplomat'].includes(specialty ?? '') ? 0 : ['Strategist', 'Analyst'].includes(specialty ?? '') ? 1 : ['Disciplined', 'Perseverant'].includes(specialty ?? '') ? 2 : 3];

function plannedCoinGrants() {
  let cursor = 0;
  return DEMO_STUDENTS.flatMap((student, studentIndex) => Array.from({ length: coinGrantPlan[studentIndex] }, () => ({ id: coinGrantIds[cursor++], studentId: student.id, source: coinGrantSources[(cursor - 1) % coinGrantSources.length] })));
}

function preflightDemo(database: Database.Database, teacherId: string) {
  const existing = coinGrantIds.map((id) => database.prepare('SELECT id,student_id AS studentId,academic_year_id AS academicYearId,amount,source,correction_of_id AS correctionOfId,redemption_id AS redemptionId FROM coin_ledger WHERE id=?').get(id) as any);
  const grants = plannedCoinGrants();
  existing.forEach((entry, index) => {
    if (!entry) return;
    const expected = grants[index];
    if (entry.studentId !== expected.studentId || entry.academicYearId !== DEMO_YEAR.id || entry.amount !== 1 || entry.source !== expected.source || entry.correctionOfId !== null || entry.redemptionId !== null) {
      throw new Error(`Demo coin collision: grant ${entry.id}`);
    }
  });
  const requests = xpPlan.flatMap((plan, studentIndex) => plan.map((baseXp, eventIndex) => ({ requestId: requestIds[studentIndex === 0 ? eventIndex : xpPlan.slice(0, studentIndex).reduce((sum, values) => sum + values.length, 0) + eventIndex], studentId: DEMO_STUDENTS[studentIndex].id, category: categoryFor(DEMO_STUDENTS[studentIndex].specialty), baseXp })));
  requests.forEach((request) => {
    const entry = database.prepare('SELECT student_id AS studentId, academic_year_id AS academicYearId, category, base_xp AS baseXp FROM xp_evidence_events WHERE owner_teacher_id=? AND client_request_id=?').get(teacherId, request.requestId) as any;
    if (entry && (entry.studentId !== request.studentId || entry.academicYearId !== DEMO_YEAR.id || entry.category !== request.category || entry.baseXp !== request.baseXp)) throw new Error(`Demo XP collision: request ${request.requestId}`);
  });

  const preset = database.prepare('SELECT owner_teacher_id AS ownerTeacherId,title,prompt,duration_seconds AS durationSeconds,archived_at AS archivedAt FROM minigame_presets WHERE id=?').get(DEMO_PRESET.id) as any;
  if (preset && (preset.ownerTeacherId !== teacherId || preset.title !== DEMO_PRESET.title || preset.prompt !== DEMO_PRESET.prompt || preset.durationSeconds !== DEMO_PRESET.durationSeconds || preset.archivedAt !== null)) throw new Error(`Demo minigame preset collision: ${DEMO_PRESET.id}`);
  const deck = database.prepare('SELECT owner_teacher_id AS ownerTeacherId,title,prompts,archived_at AS archivedAt FROM prompt_decks WHERE id=?').get(DEMO_PROMPT_DECK.id) as any;
  if (deck && (deck.ownerTeacherId !== teacherId || deck.title !== DEMO_PROMPT_DECK.title || deck.prompts !== JSON.stringify(DEMO_PROMPT_DECK.prompts) || deck.archivedAt !== null)) throw new Error(`Demo prompt deck collision: ${DEMO_PROMPT_DECK.id}`);
  const preparedEvent = database.prepare('SELECT owner_teacher_id AS ownerTeacherId,group_id AS groupId,title,description,status,show_on_projection AS showOnProjection,theme,archived_at AS archivedAt FROM classroom_events WHERE id=?').get(DEMO_PREPARED_EVENT.id) as any;
  if (preparedEvent && (preparedEvent.ownerTeacherId !== teacherId || preparedEvent.groupId !== DEMO_GROUP.id || preparedEvent.title !== DEMO_PREPARED_EVENT.title || preparedEvent.description !== DEMO_PREPARED_EVENT.description || preparedEvent.status !== 'DRAFT' || preparedEvent.showOnProjection !== 0 || preparedEvent.theme !== DEMO_PREPARED_EVENT.theme || preparedEvent.archivedAt !== null)) throw new Error(`Demo prepared event collision: ${DEMO_PREPARED_EVENT.id}`);
  const preparedChallenge = database.prepare('SELECT owner_teacher_id AS ownerTeacherId,group_id AS groupId,title,description,target,progress,status,show_on_projection AS showOnProjection,archived_at AS archivedAt FROM classroom_challenges WHERE id=?').get(DEMO_PREPARED_CHALLENGE.id) as any;
  if (preparedChallenge && (preparedChallenge.ownerTeacherId !== teacherId || preparedChallenge.groupId !== DEMO_GROUP.id || preparedChallenge.title !== DEMO_PREPARED_CHALLENGE.title || preparedChallenge.description !== DEMO_PREPARED_CHALLENGE.description || preparedChallenge.target !== DEMO_PREPARED_CHALLENGE.target || preparedChallenge.progress !== 0 || preparedChallenge.status !== 'DRAFT' || preparedChallenge.showOnProjection !== 0 || preparedChallenge.archivedAt !== null)) throw new Error(`Demo prepared challenge collision: ${DEMO_PREPARED_CHALLENGE.id}`);
}

function seedDemoCoins(database: Database.Database) {
  const existing = new Set(coinGrantIds.filter((id) => database.prepare('SELECT 1 FROM coin_ledger WHERE id=?').get(id)));
  return plannedCoinGrants().map((grant) => {
    if (existing.has(grant.id)) return { id: grant.id, replay: true };
    coins.grant(database, { id: grant.id, studentId: grant.studentId, academicYearId: DEMO_YEAR.id, source: grant.source });
    return { id: grant.id, replay: false };
  });
}

function seedDemoGameplay(database: Database.Database, teacherId: string) {
  const createdAt = new Date().toISOString();
  const existingEvent = game.findEvent(database, teacherId, DEMO_EVENT.id);
  if (!existingEvent) game.insertEvent(database, { id: DEMO_EVENT.id, ownerTeacherId: teacherId, groupId: DEMO_GROUP.id, title: DEMO_EVENT.title, description: DEMO_EVENT.description, status: 'ACTIVE', showOnProjection: 1, theme: DEMO_EVENT.theme, createdAt, updatedAt: createdAt, activatedAt: createdAt, completedAt: null, archivedAt: null, clientRequestId: null, requestFingerprint: null });
  else if (existingEvent.groupId !== DEMO_GROUP.id || existingEvent.title !== DEMO_EVENT.title || existingEvent.description !== DEMO_EVENT.description || existingEvent.theme !== DEMO_EVENT.theme) throw new Error(`Demo event collision: ${DEMO_EVENT.id}`);

  const existingChallenge = game.findChallenge(database, teacherId, DEMO_CHALLENGE.id);
  if (!existingChallenge) game.insertChallenge(database, { id: DEMO_CHALLENGE.id, ownerTeacherId: teacherId, groupId: DEMO_GROUP.id, title: DEMO_CHALLENGE.title, description: DEMO_CHALLENGE.description, target: DEMO_CHALLENGE.target, progress: 12, status: 'ACTIVE', showOnProjection: 1, createdAt, updatedAt: createdAt, activatedAt: createdAt, completedAt: null, archivedAt: null });
  else if (existingChallenge.groupId !== DEMO_GROUP.id || existingChallenge.title !== DEMO_CHALLENGE.title || existingChallenge.description !== DEMO_CHALLENGE.description || existingChallenge.target !== DEMO_CHALLENGE.target) throw new Error(`Demo challenge collision: ${DEMO_CHALLENGE.id}`);

  const existingPreset = game.findMinigamePreset(database, teacherId, DEMO_PRESET.id);
  if (!existingPreset) game.insertMinigamePreset(database, { id: DEMO_PRESET.id, ownerTeacherId: teacherId, title: DEMO_PRESET.title, prompt: DEMO_PRESET.prompt, durationSeconds: DEMO_PRESET.durationSeconds, archivedAt: null, createdAt, updatedAt: createdAt });
  const existingDeck = game.findPromptDeck(database, teacherId, DEMO_PROMPT_DECK.id);
  if (!existingDeck) game.insertPromptDeck(database, { id: DEMO_PROMPT_DECK.id, ownerTeacherId: teacherId, title: DEMO_PROMPT_DECK.title, prompts: JSON.stringify(DEMO_PROMPT_DECK.prompts), archivedAt: null, createdAt, updatedAt: createdAt });
  const existingPreparedEvent = game.findEvent(database, teacherId, DEMO_PREPARED_EVENT.id);
  if (!existingPreparedEvent) game.insertEvent(database, { id: DEMO_PREPARED_EVENT.id, ownerTeacherId: teacherId, groupId: DEMO_GROUP.id, title: DEMO_PREPARED_EVENT.title, description: DEMO_PREPARED_EVENT.description, status: 'DRAFT', showOnProjection: 0, theme: DEMO_PREPARED_EVENT.theme, createdAt, updatedAt: createdAt, activatedAt: null, completedAt: null, archivedAt: null, clientRequestId: null, requestFingerprint: null });
  const existingPreparedChallenge = game.findChallenge(database, teacherId, DEMO_PREPARED_CHALLENGE.id);
  if (!existingPreparedChallenge) game.insertChallenge(database, { id: DEMO_PREPARED_CHALLENGE.id, ownerTeacherId: teacherId, groupId: DEMO_GROUP.id, title: DEMO_PREPARED_CHALLENGE.title, description: DEMO_PREPARED_CHALLENGE.description, target: DEMO_PREPARED_CHALLENGE.target, progress: 0, status: 'DRAFT', showOnProjection: 0, createdAt, updatedAt: createdAt, activatedAt: null, completedAt: null, archivedAt: null });

  return { event: DEMO_EVENT.id, challenge: DEMO_CHALLENGE.id, preset: DEMO_PRESET.id, promptDeck: DEMO_PROMPT_DECK.id, preparedEvent: DEMO_PREPARED_EVENT.id, preparedChallenge: DEMO_PREPARED_CHALLENGE.id };
}

export function seedDemo(database: Database.Database, teacherId: string) {
  return database.transaction(() => {
    preflightDemo(database, teacherId);
    const roster = ensureOwnedDemoRoster(database, teacherId, { year: DEMO_YEAR, group: DEMO_GROUP, students: DEMO_STUDENTS });
    let keyIndex = 0;
    const events = roster.students.flatMap((student, index) => xpPlan[index].map((baseXp) => xp.create(database, teacherId, student.id, {
      category: categoryFor(student.specialty), baseXp: baseXp as 1 | 2 | 3,
    }, requestIds[keyIndex++])));
    const coinGrants = seedDemoCoins(database);
    const gameplay = seedDemoGameplay(database, teacherId);
    return { roster, events, coinGrants, gameplay };
  })();
}
