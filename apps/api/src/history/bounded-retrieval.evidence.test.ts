import Database from 'better-sqlite3';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { migrateDatabase } from '../db/migrate.js';
import { adapters, composeHistory } from './adapters.js';

const teacher = '10000000-0000-4000-8000-000000000001';
const year = '20000000-0000-4000-8000-000000000001';
const group = '30000000-0000-4000-8000-000000000001';
const student = '40000000-0000-4000-8000-000000000001';

function seed(db: Database.Database) {
  db.prepare('INSERT INTO teacher_accounts VALUES (?,?,?,?)').run(teacher, 't@example.test', 'hash', '2026-01-01T00:00:00.000Z');
  db.prepare('INSERT INTO academic_years VALUES (?,?,?,?,?,?,?)').run(year, teacher, '2026', '2026-01-01', '2026-12-31', null, '2026-01-01T00:00:00.000Z');
  db.prepare('INSERT INTO groups VALUES (?,?,?,?,?)').run(group, teacher, year, 'Group', '2026-01-01T00:00:00.000Z');
  db.prepare('INSERT INTO students VALUES (?,?,?,?,?,?,?,?,?)').run(student, group, 'Student', 'S', 'default', null, null, null, '2026-01-01T00:00:00.000Z');
}

function addXp(db: Database.Database, id: string, createdAt: string) {
  db.prepare('INSERT INTO xp_evidence_events (id,owner_teacher_id,student_id,academic_year_id,category,base_xp,specialty_at_award,specialty_category_at_award,bonus_eligible_at_award,specialty_bonus_xp,effective_xp,comment,created_at,created_by_teacher_id,client_request_id,request_fingerprint) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
    .run(id, teacher, student, year, 'COMMUNICATION', 1, null, null, 1, 0, 1, null, createdAt, teacher, `request-${id}`, `fingerprint-${id}`);
}

function addGem(db: Database.Database, id: string, createdAt: string) {
  db.prepare('INSERT INTO gem_ledger (id,student_id,academic_year_id,currency,amount,movement_kind,source_kind,source_id,source_family_id,unit_index,created_at,owner_teacher_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)')
    .run(id, student, year, 'EMERALD', 1, 'GRANT', 'RESULT_REWARD', id, `test:${id}`, 1, createdAt, teacher);
}

describe('SPEC-0041 bounded retrieval and enrichment evidence', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
    migrateDatabase(db);
    seed(db);
    addXp(db, '60000000-0000-4000-8000-000000000001', '2026-02-02T00:00:00.000Z');
    addXp(db, '60000000-0000-4000-8000-000000000002', '2026-02-03T00:00:00.000Z');
    addGem(db, '61000000-0000-4000-8000-000000000001', '2026-02-02T00:00:00.000Z');
    addGem(db, '61000000-0000-4000-8000-000000000002', '2026-02-03T00:00:00.000Z');
  });

  it('passes page limit plus one to bounded XP orchestration and avoids item student reads', () => {
    const limits: unknown[] = [];
    let studentLookups = 0;
    const originalPrepare = db.prepare.bind(db);
    const prepare = vi.spyOn(db, 'prepare').mockImplementation((sql: string) => {
      const statement = originalPrepare(sql);
      if (sql.includes('SELECT id, real_name realName, alias FROM students')) studentLookups++;
      if (sql.includes('LIMIT ?')) {
        const originalAll = statement.all.bind(statement);
        statement.all = ((...args: unknown[]) => {
          limits.push(args.at(-1));
          return originalAll(...args);
        }) as typeof statement.all;
      }
      return statement;
    });

    try {
      const rows = composeHistory(db, {
        ownerTeacherId: teacher,
        groupId: group,
        academicYearId: year,
        query: { academicYearId: year, family: 'XP', limit: 2 },
      });
      expect(rows).toHaveLength(2);
      expect(limits).toEqual([3, 3, 3]);
      expect(studentLookups).toBe(0);
    } finally {
      prepare.mockRestore();
    }
  });

  it('does not perform per-item student lookups on another enriched adapter', () => {
    let studentLookups = 0;
    const originalPrepare = db.prepare.bind(db);
    const prepare = vi.spyOn(db, 'prepare').mockImplementation((sql: string) => {
      if (sql.includes('SELECT id, real_name realName, alias FROM students')) studentLookups++;
      return originalPrepare(sql);
    });

    try {
      adapters.GEM(db, { ownerTeacherId: teacher, groupId: group, academicYearId: year, query: { academicYearId: year, limit: 2 } }, 3);
      expect(studentLookups).toBe(0);
    } finally {
      prepare.mockRestore();
    }
  });
});
