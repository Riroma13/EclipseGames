import Database from 'better-sqlite3';
import { describe, expect, it } from 'vitest';
import { migrateDatabase } from '../db/migrate.js';
import { migrations } from '../db/migrations.js';
import * as xp from '../xp/service.js';
import { createGemSourceOrchestrator } from './source-orchestrator.js';
import { reconcileBeforeReadiness } from './startup-reconciliation.js';
import { runImmediateTransaction } from '../services/transactions.js';
import * as calendar from '../calendar/service.js';

const ids = {
  teacher: '70000000-0000-4000-8000-000000000001',
  year: '70000000-0000-4000-8000-000000000002',
  group: '70000000-0000-4000-8000-000000000003',
  student: '70000000-0000-4000-8000-000000000004',
  term: '70000000-0000-4000-8000-000000000005',
};
const key = (value: number) => `70000000-0000-4000-8000-${String(value).padStart(12, '0')}`;

function database() {
  const db = new Database(':memory:');
  db.pragma('foreign_keys=ON');
  migrateDatabase(db, migrations);
  db.prepare('INSERT INTO teacher_accounts VALUES (?,?,?,?)').run(ids.teacher, 'startup@test', 'hash', 'now');
  db.prepare('INSERT INTO academic_years (id,owner_teacher_id,label,starts_on,ends_on,created_at) VALUES (?,?,?,?,?,?)').run(ids.year, ids.teacher, '2026', '2026-01-01', '2027-01-01', 'now');
  db.prepare('INSERT INTO groups VALUES (?,?,?,?,?)').run(ids.group, ids.teacher, ids.year, 'A', 'now');
  db.prepare('INSERT INTO students (id,group_id,real_name,alias,avatar,specialty,created_at) VALUES (?,?,?,?,?,?,?)').run(ids.student, ids.group, 'Student', 'S', 'default', 'Leader', 'now');
  db.prepare('INSERT INTO academic_calendars (id,academic_year_id,owner_teacher_id,timezone,created_at,updated_at) VALUES (?,?,?,?,?,?)').run('70000000-0000-4000-8000-000000000006', ids.year, ids.teacher, 'UTC', 'now', 'now');
  db.prepare('INSERT INTO academic_terms (id,calendar_id,academic_year_id,owner_teacher_id,code,starts_on,ends_on) VALUES (?,?,?,?,?,?,?)').run(ids.term, '70000000-0000-4000-8000-000000000006', ids.year, ids.teacher, 'T1', '2026-01-01', '2027-01-01');
  db.prepare('INSERT INTO weekly_timetable_slots VALUES (?,?,?,?,?,?,?,?)').run('70000000-0000-4000-8000-000000000007', '70000000-0000-4000-8000-000000000006', ids.year, ids.teacher, ids.group, 1, '00:00', '23:59');
  calendar.start(db, ids.teacher, ids.year, ids.group, key(9), { now: () => new Date('2026-01-05T12:00:00.000Z') });
  return db;
}

function entitlement(db: Database.Database, allowed: 0 | 1, active = 1) {
  const id = key(50);
  db.pragma('foreign_keys=OFF');
  db.prepare('INSERT INTO rt_streak_emerald_entitlements (id,source_key,source_entry_id,student_id,term_id,active,revision,gem_receipt_allowed) VALUES (?,?,?,?,?,?,?,?)').run(id, `RT_STREAK:${key(51)}`, key(51), ids.student, ids.term, active, 1, allowed);
  db.pragma('foreign_keys=ON');
  return id;
}

describe('startup reconciliation replay chain', () => {
  it('replays persisted allowed and denied XP outcomes without a catch-up movement', () => {
    const db = database();
    const coordinator = createGemSourceOrchestrator();
    xp.create(db, ids.teacher, ids.student, { category: 'COMMUNICATION', baseXp: 3 }, key(1), undefined, coordinator);
    xp.create(db, ids.teacher, ids.student, { category: 'COMMUNICATION', baseXp: 3 }, key(4), undefined, coordinator);
    xp.create(db, ids.teacher, ids.student, { category: 'COMMUNICATION', baseXp: 3 }, key(5), undefined, coordinator);
    xp.create(db, ids.teacher, ids.student, { category: 'COMMUNICATION', baseXp: 3 }, key(6), undefined, coordinator);
    const before = db.prepare('SELECT COUNT(*) AS count FROM gem_ledger').get();
    reconcileBeforeReadiness(db, coordinator);
    expect(db.prepare('SELECT sequence,outcome,movement_id FROM gem_xp_transition_receipts ORDER BY sequence').all()).toEqual([{ sequence: 1, outcome: 'APPLIED', movement_id: expect.any(String) }]);
    expect(db.prepare('SELECT COUNT(*) AS count FROM gem_ledger').get()).toEqual(before);
    db.close();

    const deniedDb = database();
    const deniedCoordinator = createGemSourceOrchestrator();
    xp.create(deniedDb, ids.teacher, ids.student, { category: 'COMMUNICATION', baseXp: 3 }, key(2), { specialtyBonusAllowed: () => false }, deniedCoordinator);
    xp.create(deniedDb, ids.teacher, ids.student, { category: 'COMMUNICATION', baseXp: 3 }, key(3), { specialtyBonusAllowed: () => false }, deniedCoordinator);
    xp.create(deniedDb, ids.teacher, ids.student, { category: 'COMMUNICATION', baseXp: 3 }, key(7), { specialtyBonusAllowed: () => false }, deniedCoordinator);
    xp.create(deniedDb, ids.teacher, ids.student, { category: 'COMMUNICATION', baseXp: 3 }, key(8), { specialtyBonusAllowed: () => false }, deniedCoordinator);
    const deniedBefore = deniedDb.prepare('SELECT COUNT(*) AS count FROM gem_ledger').get();
    reconcileBeforeReadiness(deniedDb, deniedCoordinator);
    expect(deniedDb.prepare('SELECT outcome,movement_id FROM gem_xp_transition_receipts').all()).toEqual([{ outcome: 'DENIED', movement_id: null }]);
    expect(deniedDb.prepare('SELECT COUNT(*) AS count FROM gem_ledger').get()).toEqual(deniedBefore);
    deniedDb.close();
  });

  it.each([[1, 'APPLIED'], [0, 'DENIED']] as const)('replays RT %s eligibility with no new movement', (allowed, outcome) => {
    const db = database();
    const coordinator = createGemSourceOrchestrator();
    const id = entitlement(db, allowed);
    runImmediateTransaction(db, 'startup-seed', tx => coordinator.applyRtScope(tx, ids.student, ids.term));
    const before = db.prepare('SELECT COUNT(*) AS count FROM gem_ledger').get();
    reconcileBeforeReadiness(db, coordinator);
    expect(db.prepare('SELECT outcome,movement_id FROM gem_reconciliation_revisions WHERE entitlement_id=?').get(id)).toEqual({ outcome, movement_id: allowed ? expect.any(String) : null });
    expect(db.prepare('SELECT COUNT(*) AS count FROM gem_ledger').get()).toEqual(before);
    db.close();
  });

  it('replays NO_MOVEMENT and rejects a missing revision atomically', () => {
    const db = database();
    const coordinator = createGemSourceOrchestrator();
    const id = entitlement(db, 1, 0);
    runImmediateTransaction(db, 'startup-no-movement', tx => coordinator.applyRtScope(tx, ids.student, ids.term));
    expect(db.prepare('SELECT outcome,movement_id FROM gem_reconciliation_revisions WHERE entitlement_id=?').get(id)).toEqual({ outcome: 'NO_MOVEMENT', movement_id: null });
    db.prepare('UPDATE rt_streak_emerald_entitlements SET revision=2 WHERE id=?').run(id);
    expect(() => reconcileBeforeReadiness(db, coordinator)).toThrow(/revision continuity or CAS is invalid/i);
    expect(db.prepare('SELECT revision FROM rt_streak_emerald_entitlements WHERE id=?').get(id)).toEqual({ revision: 2 });
    expect(db.prepare('SELECT COUNT(*) AS count FROM gem_reconciliation_revisions WHERE entitlement_id=?').get(id)).toEqual({ count: 1 });
    db.close();
  });

  it('rejects contradictory RT lineage before startup can commit other work', () => {
    const db = database();
    const coordinator = createGemSourceOrchestrator();
    const id = entitlement(db, 1);
    runImmediateTransaction(db, 'startup-corrupt', tx => coordinator.applyRtScope(tx, ids.student, ids.term));
    db.prepare('UPDATE gem_reconciliation_revisions SET revision_fingerprint=? WHERE entitlement_id=?').run('contradictory', id);
    expect(() => reconcileBeforeReadiness(db, coordinator)).toThrow(/fingerprint|lineage/i);
    expect(db.prepare('SELECT revision_fingerprint FROM gem_reconciliation_revisions WHERE entitlement_id=?').get(id)).toEqual({ revision_fingerprint: 'contradictory' });
    db.close();
  });
});
