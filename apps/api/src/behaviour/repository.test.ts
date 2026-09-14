import { afterEach, describe, expect, it } from 'vitest';
import BetterSqlite3 from 'better-sqlite3';
import { migrateDatabase } from '../db/migrate.js';
import { migrations } from '../db/migrations.js';
import { appendAction, findState, snapshotLives } from './repository.js';

const databases: BetterSqlite3.Database[] = [];
afterEach(() => databases.splice(0).forEach(db => db.close()));

describe('behaviour repository', () => {
  it('defaults absent state to four lives and persists the materialized invariant', () => {
    const db = new BetterSqlite3(':memory:'); databases.push(db); db.pragma('foreign_keys = OFF'); migrateDatabase(db, migrations);
    db.prepare(`INSERT INTO real_class_session_behaviour_roster (session_id,student_id,owner_teacher_id,academic_year_id,group_id,term_id,lives_at_start) VALUES (?,?,?,?,?,?,?)`).run('session', 'student', 'teacher', 'year', 'group', 'term', 4);
    expect(snapshotLives(db, 'session-2', 'student-2', 'teacher', 'year', 'group', 'term')).toBe(4);
    const result = appendAction(db, { ownerTeacherId:'teacher', academicYearId:'year', groupId:'group', sessionId:'session', studentId:'student', kind:'LOSS', delta:-1, lineage:'session', requestKey:'request', fingerprint:'fingerprint', createdAt:'2026-09-01T00:00:00.000Z' });
    expect(result).toMatchObject({ currentLives: 3, state: 'VIGILANCE' });
    expect(findState(db, 'student', 'year')).toMatchObject({ currentLives: 3, lastEffectiveActionId: result.id });
  });
});
