import { afterEach, describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import { migrateDatabase } from '../../src/db/migrate.js';
import { migrations } from '../../src/db/migrations.js';

const databases: Database.Database[] = [];
afterEach(() => { for (const db of databases.splice(0)) db.close(); });

describe('coin schema', () => {
  it('enables foreign keys and creates restricted allocation invariants', () => {
    const db = new Database(':memory:');
    databases.push(db);
    db.pragma('foreign_keys = ON');
    expect(db.pragma('foreign_keys', { simple: true })).toBe(1);
    migrateDatabase(db, migrations);
    expect(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='coin_ledger'").get()).toBeTruthy();
    expect(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='coin_spend_allocations'").get()).toBeTruthy();
    expect(db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND name='uq_coin_allocations_active_grant'").get()).toBeTruthy();
  });

  it('rolls back a failed coin transaction without mutation', () => {
    const db = new Database(':memory:');
    databases.push(db);
    db.pragma('foreign_keys = ON');
    migrateDatabase(db, migrations);
    expect(() => db.transaction(() => {
      db.prepare("INSERT INTO coin_ledger (id, student_id, academic_year_id, amount, source, created_at) VALUES ('x','missing','year',1,'PERSONAL_IMPROVEMENT','now')").run();
    })()).toThrow();
    expect(db.prepare('SELECT COUNT(*) AS count FROM coin_ledger').get()).toEqual({ count: 0 });
  });

  it('enforces foreign keys, active allocation uniqueness, release reuse, and context uniqueness', () => {
    const db = new Database(':memory:');
    databases.push(db);
    db.pragma('foreign_keys = ON');
    migrateDatabase(db, migrations);
    const ids = { teacher: '00000000-0000-4000-8000-000000000011', year: '00000000-0000-4000-8000-000000000012', group: '00000000-0000-4000-8000-000000000013', student: '00000000-0000-4000-8000-000000000014', context: '00000000-0000-4000-8000-000000000015', reward: 'standard-assessment-advantage', debit: '00000000-0000-4000-8000-000000000016', redemption: '00000000-0000-4000-8000-000000000017', grant: '00000000-0000-4000-8000-000000000018' };
    const at = '2026-09-01T00:00:00.000Z';
    db.prepare('INSERT INTO teacher_accounts (id,email,password_hash,created_at) VALUES (?,?,?,?)').run(ids.teacher, 'schema@example.test', 'x', at);
    db.prepare('INSERT INTO academic_years (id,owner_teacher_id,label,starts_on,ends_on,created_at) VALUES (?,?,?,?,?,?)').run(ids.year, ids.teacher, 'Schema', '2026-09-01', '2027-07-01', at);
    db.prepare('INSERT INTO groups (id,owner_teacher_id,academic_year_id,name,created_at) VALUES (?,?,?,?,?)').run(ids.group, ids.teacher, ids.year, 'Schema', at);
    db.prepare('INSERT INTO students (id,group_id,real_name,alias,avatar,created_at) VALUES (?,?,?,?,?,?)').run(ids.student, ids.group, 'Schema Student', 'Schema', 'default', at);
    db.prepare('INSERT INTO assessment_contexts (id,group_id,name,created_at) VALUES (?,?,?,?)').run(ids.context, ids.group, 'Schema context', at);
    db.prepare('INSERT INTO coin_ledger (id,student_id,academic_year_id,amount,source,created_at) VALUES (?,?,?,?,?,?)').run(ids.grant, ids.student, ids.year, 1, 'PERSONAL_IMPROVEMENT', at);
    db.prepare('INSERT INTO coin_ledger (id,student_id,academic_year_id,amount,source,redemption_id,created_at) VALUES (?,?,?,?,?,?,?)').run(ids.debit, ids.student, ids.year, -2, 'REDEMPTION_DEBIT', ids.redemption, at);
    db.prepare('INSERT INTO advantage_redemptions (id,student_id,assessment_context_id,reward_id,cost,debit_ledger_id,created_at,owner_teacher_id) VALUES (?,?,?,?,?,?,?,?)').run(ids.redemption, ids.student, ids.context, ids.reward, 2, ids.debit, at, ids.teacher);
    db.prepare('INSERT INTO coin_spend_allocations (id,redemption_id,grant_ledger_entry_id,created_at) VALUES (?,?,?,?)').run('00000000-0000-4000-8000-000000000019', ids.redemption, ids.grant, at);
    expect(() => db.prepare('INSERT INTO coin_spend_allocations (id,redemption_id,grant_ledger_entry_id,created_at) VALUES (?,?,?,?)').run('00000000-0000-4000-8000-000000000020', ids.redemption, ids.grant, at)).toThrow();
    expect(() => db.prepare('INSERT INTO coin_ledger (id,student_id,academic_year_id,amount,source,created_at) VALUES (?,?,?,?,?,?)').run('00000000-0000-4000-8000-000000000021', 'missing', ids.year, 1, 'PERSONAL_IMPROVEMENT', at)).toThrow();
    db.prepare("UPDATE coin_spend_allocations SET released_at=?,release_reason='REDEMPTION_REVERSED' WHERE grant_ledger_entry_id=?").run(at, ids.grant);
    const secondContext = '00000000-0000-4000-8000-000000000024'; const secondRedemption = '00000000-0000-4000-8000-000000000025'; const secondDebit = '00000000-0000-4000-8000-000000000026';
    db.prepare('INSERT INTO assessment_contexts (id,group_id,name,created_at) VALUES (?,?,?,?)').run(secondContext, ids.group, 'Schema context 2', at);
    db.prepare('INSERT INTO coin_ledger (id,student_id,academic_year_id,amount,source,redemption_id,created_at) VALUES (?,?,?,?,?,?,?)').run(secondDebit, ids.student, ids.year, -2, 'REDEMPTION_DEBIT', secondRedemption, at);
    db.prepare('INSERT INTO advantage_redemptions (id,student_id,assessment_context_id,reward_id,cost,debit_ledger_id,created_at,owner_teacher_id) VALUES (?,?,?,?,?,?,?,?)').run(secondRedemption, ids.student, secondContext, ids.reward, 2, secondDebit, at, ids.teacher);
    expect(() => db.prepare('INSERT INTO coin_spend_allocations (id,redemption_id,grant_ledger_entry_id,created_at) VALUES (?,?,?,?)').run('00000000-0000-4000-8000-000000000022', secondRedemption, ids.grant, at)).not.toThrow();
    expect(() => db.prepare('INSERT INTO advantage_redemptions (id,student_id,assessment_context_id,reward_id,cost,debit_ledger_id,created_at,owner_teacher_id) VALUES (?,?,?,?,?,?,?,?)').run('00000000-0000-4000-8000-000000000023', ids.student, ids.context, ids.reward, 2, ids.debit, at, ids.teacher)).toThrow();
  });
});
