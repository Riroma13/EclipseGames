import type Database from 'better-sqlite3';
import { ensureOwnedDemoRoster, type DemoRosterStudent } from '../roster/service.js';
import * as xp from '../xp/service.js';
import type { XpCategory } from '../xp/service.js';
import * as coins from '../coins/repository.js';

export const DEMO_YEAR = { id: '9b6f3b9e-3d0f-4b1e-9b1e-202620270001', label: '2026–2027', startsOn: '2026-09-01', endsOn: '2027-07-01' } as const;
export const DEMO_GROUP = { id: '9b6f3b9e-3d0f-4b1e-9b1e-202620270002', name: 'Demo · Groupe principal' } as const;

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
}

function seedDemoCoins(database: Database.Database) {
  const existing = new Set(coinGrantIds.filter((id) => database.prepare('SELECT 1 FROM coin_ledger WHERE id=?').get(id)));
  return plannedCoinGrants().map((grant) => {
    if (existing.has(grant.id)) return { id: grant.id, replay: true };
    coins.grant(database, { id: grant.id, studentId: grant.studentId, academicYearId: DEMO_YEAR.id, source: grant.source });
    return { id: grant.id, replay: false };
  });
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
    return { roster, events, coinGrants };
  })();
}
