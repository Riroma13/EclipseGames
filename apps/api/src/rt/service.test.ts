import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { migrateDatabase } from '../db/migrate.js';
import * as calendar from '../calendar/service.js';
import { RtStreakEmeraldEntitlementPort, upsertEntries, listEntries, summaries } from './service.js';
import { createGemSourceOrchestrator } from '../gems/source-orchestrator.js';
import { runImmediateTransaction } from '../services/transactions.js';

const ids = { teacher: '11111111-1111-4111-8111-111111111111', year: '22222222-2222-4222-8222-222222222222', group: '33333333-3333-4333-8333-333333333333', student: '44444444-4444-4444-8444-444444444444' };
const input = { timezone: 'Europe/Paris', terms: [{ code: 'T1' as const, startsOn: '2026-09-01', endsOn: '2026-12-20' }, { code: 'T2' as const, startsOn: '2026-12-21', endsOn: '2027-03-31' }, { code: 'T3' as const, startsOn: '2027-04-01', endsOn: '2027-07-01' }], holidays: [], slots: [{ groupId: ids.group, weekday: 1, startsAt: '08:00', endsAt: '09:00' }] };
const clock = { now: () => new Date('2026-09-07T06:30:00Z') };

describe('RT persistence', () => {
  let db: Database.Database;
  const defaultCoordinator = createGemSourceOrchestrator();
  beforeEach(() => { db = new Database(':memory:'); migrateDatabase(db); const at = new Date().toISOString(); db.prepare('INSERT INTO teacher_accounts VALUES (?,?,?,?)').run(ids.teacher, 'rt@example.test', 'hash', at); db.prepare('INSERT INTO academic_years (id,owner_teacher_id,label,starts_on,ends_on,created_at) VALUES (?,?,?,?,?,?)').run(ids.year, ids.teacher, '2026', '2026-09-01', '2027-07-01', at); db.prepare('INSERT INTO groups VALUES (?,?,?,?,?)').run(ids.group, ids.teacher, ids.year, 'RT', at); db.prepare('INSERT INTO students (id,group_id,real_name,alias,avatar,created_at) VALUES (?,?,?,?,?,?)').run(ids.student, ids.group, 'Private', 'A', 'default', at); calendar.replaceCalendar(db, ids.teacher, ids.year, input); });
  afterEach(() => db.close());

  it('lists the current roster before its first mutation, snapshots it on save, derives the term summary, and never writes coins', () => {
    const session = calendar.start(db, ids.teacher, ids.year, ids.group, '11111111-1111-4111-8111-111111111112', clock).session;
    expect(listEntries(db, ids.teacher, session.id).students).toEqual([{ studentId: ids.student }]);
    const saved = upsertEntries(db, ids.teacher, session.id, [{ studentId: ids.student, value: 'ABSENT' }], '11111111-1111-4111-8111-111111111113', defaultCoordinator);
    expect(saved.status).toBe(201);
    expect(listEntries(db, ids.teacher, session.id).entries[0]).toMatchObject({ studentId: ids.student, value: 'ABSENT' });
    expect(summaries(db, ids.teacher, ids.group, ids.year, saved.termId).summaries[0]).toMatchObject({ average: null, energy: null, streak: 0 });
    expect(db.prepare('SELECT COUNT(*) AS count FROM coin_ledger').get()).toEqual({ count: 0 });
    expect(db.prepare('SELECT group_correction_locked_at FROM students WHERE id=?').get(ids.student)).not.toEqual({ group_correction_locked_at: null });
    expect(upsertEntries(db, ids.teacher, session.id, [{ studentId: ids.student, value: 10 }], '11111111-1111-4111-8111-111111111114', defaultCoordinator).status).toBe(201);
    calendar.end(db, ids.teacher, session.id, '11111111-1111-4111-8111-111111111115', clock);
    expect(() => upsertEntries(db, ids.teacher, session.id, [{ studentId: ids.student, value: 5 }], '11111111-1111-4111-8111-111111111116', defaultCoordinator)).toThrowError(/read-only/);
  });

  it('replays a term by real-session start order rather than entry save order', () => {
    calendar.replaceCalendar(db, ids.teacher, ids.year, { ...input, slots: [...input.slots, { groupId: ids.group, weekday: 2, startsAt: '08:00', endsAt: '09:00' }] });
    const monday = { now: () => new Date('2026-09-07T06:30:00Z') };
    const tuesday = { now: () => new Date('2026-09-08T06:30:00Z') };
    const first = calendar.start(db, ids.teacher, ids.year, ids.group, '11111111-1111-4111-8111-111111111121', monday).session;
    upsertEntries(db, ids.teacher, first.id, [{ studentId: ids.student, value: 5 }], '11111111-1111-4111-8111-111111111124', defaultCoordinator);
    calendar.end(db, ids.teacher, first.id, '11111111-1111-4111-8111-111111111122', monday);
    const second = calendar.start(db, ids.teacher, ids.year, ids.group, '11111111-1111-4111-8111-111111111123', tuesday).session;
    const saved = upsertEntries(db, ids.teacher, second.id, [{ studentId: ids.student, value: 10 }], '11111111-1111-4111-8111-111111111125', defaultCoordinator);
    db.prepare("UPDATE rt_entries SET created_at='2026-09-09T00:00:00.000Z' WHERE session_id=?").run(first.id);
    db.prepare("UPDATE rt_entries SET created_at='2026-09-01T00:00:00.000Z' WHERE session_id=?").run(second.id);
    expect(summaries(db, ids.teacher, ids.group, ids.year, saved.termId).summaries[0]?.streak).toBe(1);
  });

  it('exposes revisioned entitlement snapshots and consumes with compare-and-set', () => {
    const session = calendar.start(db, ids.teacher, ids.year, ids.group, '11111111-1111-4111-8111-111111111131', clock).session;
    const saved = upsertEntries(db, ids.teacher, session.id, [{ studentId: ids.student, value: 10 }], '11111111-1111-4111-8111-111111111132', defaultCoordinator);
    const source = saved.entries[0]!;
    const entitlementId = '55555555-5555-4555-8555-555555555555';
    db.prepare('INSERT INTO rt_streak_emerald_entitlements (id,source_key,source_entry_id,student_id,term_id,active,revision) VALUES (?,?,?,?,?,?,?)').run(entitlementId, `RT_STREAK:${source.id}`, source.id, ids.student, saved.termId, 1, 1);
    expect(RtStreakEmeraldEntitlementPort.listForReconciliation(ids.student, saved.termId, db)).toEqual([expect.objectContaining({ id: entitlementId, active: true, revision: 1, consumption: null })]);
    expect(RtStreakEmeraldEntitlementPort.consumeActive(entitlementId, 1, 'm3-consumer', 'm3-grant', db)).toEqual(expect.objectContaining({ active: true, consumption: expect.objectContaining({ consumerId: 'm3-consumer', grantId: 'm3-grant', consumedRevision: 1 }) }));
    expect(() => RtStreakEmeraldEntitlementPort.consumeActive(entitlementId, 1, 'another', 'grant', db)).toThrowError(/stale/);
  });

  it('replays atomically, rejects a changed request, and rolls back every student on coordinator failure', () => {
    db.prepare('INSERT INTO students (id,group_id,real_name,alias,avatar,created_at) VALUES (?,?,?,?,?,?)').run('66666666-6666-4666-8666-666666666666', ids.group, 'Second', 'B', 'default', new Date().toISOString());
    const session = calendar.start(db, ids.teacher, ids.year, ids.group, '11111111-1111-4111-8111-111111111141', clock).session;
    const coordinator = createGemSourceOrchestrator();
    const first = upsertEntries(db, ids.teacher, session.id, [{ studentId: ids.student, value: 10 }], '11111111-1111-4111-8111-111111111142', coordinator);
    expect(upsertEntries(db, ids.teacher, session.id, [{ studentId: ids.student, value: 10 }], '11111111-1111-4111-8111-111111111142', coordinator).replay).toBe(true);
    expect(() => upsertEntries(db, ids.teacher, session.id, [{ studentId: ids.student, value: 5 }], '11111111-1111-4111-8111-111111111142', coordinator)).toThrowError(/another request/);
    const before = db.prepare('SELECT COUNT(*) AS count FROM rt_entries').get();
    const failing = { ...coordinator, applyRtScope: (() => { let calls = 0; return (tx: Parameters<typeof coordinator.applyRtScope>[0], studentId: string, termId: string) => { calls += 1; if (calls === 2) throw new Error('injected coordinator failure'); coordinator.applyRtScope(tx, studentId, termId); }; })() };
    expect(() => upsertEntries(db, ids.teacher, session.id, [{ studentId: ids.student, value: 5 }, { studentId: '66666666-6666-4666-8666-666666666666', value: 10 }], '11111111-1111-4111-8111-111111111143', failing)).toThrowError(/injected/);
    expect(db.prepare('SELECT COUNT(*) AS count FROM rt_entries').get()).toEqual(before);
    expect(first.entries).toHaveLength(1);
    const calls: string[] = [];
    const ordered = { ...coordinator, applyRtScope: (tx: Parameters<typeof coordinator.applyRtScope>[0], studentId: string, termId: string) => { calls.push(studentId); coordinator.applyRtScope(tx, studentId, termId); } };
    const bulk = upsertEntries(db, ids.teacher, session.id, [{ studentId: '66666666-6666-4666-8666-666666666666', value: 10 }, { studentId: ids.student, value: 10 }], '11111111-1111-4111-8111-111111111144', ordered);
    expect(bulk.status).toBe(201);
    expect(calls).toEqual([ids.student, '66666666-6666-4666-8666-666666666666']);
    calls.length = 0;
    expect(upsertEntries(db, ids.teacher, session.id, [{ studentId: '66666666-6666-4666-8666-666666666666', value: 10 }, { studentId: ids.student, value: 10 }], '11111111-1111-4111-8111-111111111144', ordered).replay).toBe(true);
    expect(calls).toEqual([ids.student, '66666666-6666-4666-8666-666666666666']);
    expect(() => upsertEntries(db, ids.teacher, session.id, [{ studentId: ids.student, value: 5 }, { studentId: '66666666-6666-4666-8666-666666666666', value: 10 }], '11111111-1111-4111-8111-111111111144', ordered)).toThrowError(/another request/);
  });

  it('creates a revision receipt and closes then reinstates its gem source through CAS', () => {
    const session = calendar.start(db, ids.teacher, ids.year, ids.group, '11111111-1111-4111-8111-111111111151', clock).session;
    const coordinator = createGemSourceOrchestrator();
    const first = upsertEntries(db, ids.teacher, session.id, [{ studentId: ids.student, value: 10 }], '11111111-1111-4111-8111-111111111152', coordinator);
    const entitlementId = '55555555-5555-4555-8555-555555555556';
    db.prepare('INSERT INTO rt_streak_emerald_entitlements (id,source_key,source_entry_id,student_id,term_id,active,revision) VALUES (?,?,?,?,?,?,?)').run(entitlementId, `RT_STREAK:${first.entries[0].id}`, first.entries[0].id, ids.student, first.termId, 1, 1);
    const secondEntitlementId = '55555555-5555-4555-8555-555555555557';
    db.prepare('INSERT INTO rt_streak_emerald_entitlements (id,source_key,source_entry_id,student_id,term_id,active,revision) VALUES (?,?,?,?,?,?,?)').run(secondEntitlementId, `RT_STREAK:second:${first.entries[0].id}`, first.entries[0].id, ids.student, first.termId, 1, 1);
    runImmediateTransaction(db, 'rt-test-1', tx => coordinator.applyRtScope(tx, ids.student, first.termId));
    expect(db.prepare('SELECT COUNT(*) AS count FROM gem_reconciliation_revisions WHERE entitlement_id IN (?,?)').get(entitlementId, secondEntitlementId)).toEqual({ count: 2 });
    expect(db.prepare('SELECT state FROM gem_reconciliation_revisions WHERE entitlement_id=?').get(entitlementId)).toEqual({ state: 'ACTIVE' });
    const movementCount = db.prepare('SELECT COUNT(*) AS count FROM gem_ledger').get();
    runImmediateTransaction(db, 'rt-test-replay', tx => coordinator.applyRtScope(tx, ids.student, first.termId));
    expect(db.prepare('SELECT COUNT(*) AS count FROM gem_ledger').get()).toEqual(movementCount);
    const receiptFingerprint = (db.prepare('SELECT revision_fingerprint AS fingerprint FROM gem_reconciliation_revisions WHERE entitlement_id=?').get(entitlementId) as { fingerprint: string }).fingerprint;
    db.prepare('UPDATE gem_reconciliation_revisions SET revision_fingerprint=? WHERE entitlement_id=?').run('changed', entitlementId);
    expect(() => runImmediateTransaction(db, 'rt-test-conflict', tx => coordinator.applyRtScope(tx, ids.student, first.termId))).toThrowError(/fingerprint/);
    db.prepare('UPDATE gem_reconciliation_revisions SET revision_fingerprint=? WHERE entitlement_id=?').run(receiptFingerprint, entitlementId);
    db.prepare('UPDATE rt_streak_emerald_entitlements SET active=0,revision=2 WHERE id=?').run(entitlementId);
    runImmediateTransaction(db, 'rt-test-2', tx => coordinator.applyRtScope(tx, ids.student, first.termId));
    expect(db.prepare('SELECT state FROM gem_reconciliation_revisions WHERE entitlement_id=? ORDER BY revision').all(entitlementId)).toEqual([{ state: 'ACTIVE' }, { state: 'INACTIVE' }]);
    expect(db.prepare("SELECT movement_kind AS kind FROM gem_ledger WHERE source_family_id=? ORDER BY rowid").all(`rt:entitlement:${entitlementId}`)).toEqual([{ kind: 'GRANT' }, { kind: 'REVOKE' }]);
    db.prepare('UPDATE rt_streak_emerald_entitlements SET active=1,revision=3 WHERE id=?').run(entitlementId);
    runImmediateTransaction(db, 'rt-test-3', tx => coordinator.applyRtScope(tx, ids.student, first.termId));
    expect(db.prepare("SELECT movement_kind AS kind FROM gem_ledger WHERE source_family_id=? ORDER BY rowid").all(`rt:entitlement:${entitlementId}`)).toEqual([{ kind: 'GRANT' }, { kind: 'REVOKE' }, { kind: 'REINSTATE' }]);
  });
});
