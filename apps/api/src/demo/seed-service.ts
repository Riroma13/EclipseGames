import type Database from 'better-sqlite3';
import { ensureOwnedDemoRoster, type DemoRosterStudent } from '../roster/service.js';
import * as xp from '../xp/service.js';
import type { XpCategory } from '../xp/service.js';

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
const requestIds = Array.from({ length: 23 }, (_, index) => `8a5d2c71-6e4f-4c20-9a1b-20262027${String(index + 1).padStart(4, '0')}`);

export const DEMO_STUDENTS: readonly DemoRosterStudent[] = names.map((value, index) => ({ id: studentIds[index], realName: value[0], alias: value[1], avatar: value[2], specialty: value[3] })) as readonly DemoRosterStudent[];

const categories = ['COMMUNICATION', 'PRECISION', 'CONSISTENCY', 'COLLABORATION'] as const;
const categoryFor = (specialty: string | null): XpCategory => categories[['Leader', 'Diplomat'].includes(specialty ?? '') ? 0 : ['Strategist', 'Analyst'].includes(specialty ?? '') ? 1 : ['Disciplined', 'Perseverant'].includes(specialty ?? '') ? 2 : 3];

export function seedDemo(database: Database.Database, teacherId: string) {
  const roster = ensureOwnedDemoRoster(database, teacherId, { year: DEMO_YEAR, group: DEMO_GROUP, students: DEMO_STUDENTS });
  let keyIndex = 0;
  const events = roster.students.flatMap((student, index) => {
    const count = index === 0 ? 3 : index < 6 ? 2 : 1;
    return Array.from({ length: count }, (_, eventIndex) => xp.create(database, teacherId, student.id, {
      category: categoryFor(student.specialty), baseXp: (index + eventIndex) % 3 + 1 as 1 | 2 | 3,
    }, requestIds[keyIndex++]));
  });
  return { roster, events };
}
