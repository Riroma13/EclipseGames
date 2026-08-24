import { afterEach, describe, expect, it } from 'vitest';
import { openDatabase } from '../../src/db/client.js';
import { reconcileEntitlements } from '../../src/coins/entitlement-reconciler.js';
import { grant } from '../../src/coins/repository.js';
import { spend } from '../../src/coins/service.js';

const databases: ReturnType<typeof openDatabase>[] = [];
afterEach(() => { for (const database of databases.splice(0)) database.close(); });

describe('SPEC-0004 entitlement replay', () => {
  it('replays allocation-triggering REVOKE without duplicate refund or resurrection', () => {
    const database = openDatabase(':memory:'); databases.push(database); const db = database.database;
    const teacher='00000000-0000-4000-8000-000000000001', year='00000000-0000-4000-8000-000000000002', group='00000000-0000-4000-8000-000000000003', student='00000000-0000-4000-8000-000000000004', context='00000000-0000-4000-8000-000000000005', event='00000000-0000-4000-8000-000000000006', unlock='00000000-0000-4000-8000-000000000007', reversal='00000000-0000-4000-8000-000000000008', transition='00000000-0000-4000-8000-000000000009', revoke='00000000-0000-4000-8000-000000000010';
    const at='2026-09-01T00:00:00.000Z';
    db.prepare('INSERT INTO teacher_accounts (id,email,password_hash,created_at) VALUES (?,?,?,?)').run(teacher,'t@example.test','x',at);
    db.prepare('INSERT INTO academic_years (id,owner_teacher_id,label,starts_on,ends_on,created_at) VALUES (?,?,?,?,?,?)').run(year,teacher,'Y','2026-09-01','2027-07-01',at);
    db.prepare('INSERT INTO groups (id,owner_teacher_id,academic_year_id,name,created_at) VALUES (?,?,?,?,?)').run(group,teacher,year,'G',at);
    db.prepare('INSERT INTO students (id,group_id,real_name,alias,avatar,created_at) VALUES (?,?,?,?,?,?)').run(student,group,'Student','S','default',at);
    db.prepare('INSERT INTO xp_evidence_events (id,owner_teacher_id,student_id,academic_year_id,category,base_xp,specialty_at_award,specialty_category_at_award,bonus_eligible_at_award,specialty_bonus_xp,effective_xp,created_at,created_by_teacher_id,client_request_id,request_fingerprint) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(event,teacher,student,year,'PRECISION',1,null,null,0,0,1,at,teacher,'k','f');
    db.prepare('INSERT INTO xp_level_unlocks (id,student_id,academic_year_id,level,active,first_crossed_at,first_source_event_id,updated_at) VALUES (?,?,?,?,?,?,?,?)').run(unlock,student,year,2,1,at,event,at);
    db.prepare('INSERT INTO xp_level_grant_transitions (id,sequence,unlock_id,kind,source_event_id,occurred_at) VALUES (?,?,?,?,?,?)').run(transition,1,unlock,'GRANT',event,at);
    db.prepare('INSERT INTO assessment_contexts (id,group_id,name,created_at) VALUES (?,?,?,?)').run(context,group,'Assessment',at);
    reconcileEntitlements(db); grant(db,{studentId:student,academicYearId:year,source:'PERSONAL_IMPROVEMENT'});
    const redemption=spend(db,teacher,student,context,'standard-assessment-advantage','00000000-0000-4000-8000-000000000011');
    db.prepare('INSERT INTO xp_evidence_reversals (id,owner_teacher_id,target_event_id,created_at,created_by_teacher_id,client_request_id,request_fingerprint) VALUES (?,?,?,?,?,?,?)').run(reversal,teacher,event,at,teacher,'r','r');
    db.prepare('INSERT INTO xp_level_grant_transitions (id,sequence,unlock_id,kind,source_reversal_id,occurred_at) VALUES (?,?,?,?,?,?)').run(revoke,2,unlock,'REVOKE',reversal,at);
    const snapshot = () => ({
      ledger: db.prepare('SELECT id,amount,source,correction_of_id,redemption_id,source_transition_id FROM coin_ledger WHERE student_id=? AND academic_year_id=? ORDER BY created_at,id').all(student,year),
      ledgerCounts: db.prepare('SELECT source,COUNT(*) AS count FROM coin_ledger WHERE student_id=? AND academic_year_id=? GROUP BY source ORDER BY source').all(student,year),
      refunds: db.prepare("SELECT id,amount,source,redemption_id FROM coin_ledger WHERE source='REDEMPTION_REFUND' AND redemption_id=? ORDER BY id").all(redemption.id),
      compensations: db.prepare("SELECT id,amount,source,correction_of_id,source_transition_id FROM coin_ledger WHERE source='LEVEL_ENTITLEMENT_REVOKE' ORDER BY id").all(),
      redemption: db.prepare('SELECT id,reversed_at,reversal_ledger_id FROM advantage_redemptions WHERE id=?').get(redemption.id),
      allocations: db.prepare('SELECT id,redemption_id,grant_ledger_entry_id,released_at,release_reason FROM coin_spend_allocations WHERE redemption_id=? ORDER BY id').all(redemption.id),
      allocationCounts: db.prepare('SELECT COUNT(*) AS total,SUM(CASE WHEN released_at IS NULL THEN 1 ELSE 0 END) AS active,SUM(CASE WHEN released_at IS NOT NULL THEN 1 ELSE 0 END) AS released FROM coin_spend_allocations WHERE redemption_id=?').get(redemption.id),
      eligible: db.prepare(`SELECT l.id FROM coin_ledger l LEFT JOIN coin_spend_allocations a ON a.grant_ledger_entry_id=l.id AND a.released_at IS NULL WHERE l.student_id=? AND l.academic_year_id=? AND l.amount=1 AND a.id IS NULL AND l.source IN ('LEVEL_ENTITLEMENT','PERSONAL_IMPROVEMENT','EXCEPTIONAL_FRENCH','EXCEPTIONAL_COLLABORATION','SPECIAL_CHALLENGE') ORDER BY l.created_at,l.id`).all(student,year),
      balance: db.prepare('SELECT COALESCE(SUM(amount),0) AS balance FROM coin_ledger WHERE student_id=? AND academic_year_id=?').get(student,year),
    });
    reconcileEntitlements(db);
    const afterFirstReplay = snapshot();
    reconcileEntitlements(db);
    const afterExactReplay = snapshot();
    expect(afterExactReplay).toEqual(afterFirstReplay);
    expect(afterFirstReplay.refunds).toHaveLength(1);
    expect(afterFirstReplay.compensations).toHaveLength(1);
    expect(afterFirstReplay.allocations).toHaveLength(2);
    expect(afterFirstReplay.allocations.every((allocation: any) => allocation.released_at !== null)).toBe(true);
    expect(afterFirstReplay.allocationCounts).toEqual({ total: 2, active: 0, released: 2 });
    expect(afterFirstReplay.redemption).toMatchObject({ reversed_at: expect.any(String), reversal_ledger_id: expect.any(String) });
    expect(afterFirstReplay.eligible).toHaveLength(2);
    expect(afterFirstReplay.eligible.every((entry: any) => afterFirstReplay.allocations.every((allocation: any) => allocation.grant_ledger_entry_id !== entry.id || allocation.released_at !== null))).toBe(true);
    expect(afterFirstReplay.balance).toEqual({ balance: 1 });
    expect(db.prepare("SELECT COUNT(*) AS count FROM coin_ledger WHERE source='REDEMPTION_REFUND'").get()).toEqual({count:1});
    expect(db.prepare('SELECT COUNT(*) AS count FROM coin_spend_allocations WHERE redemption_id=? AND released_at IS NULL').get(redemption.id)).toEqual({count:0});
    expect(db.prepare("SELECT COUNT(*) AS count FROM coin_ledger WHERE source='LEVEL_ENTITLEMENT_REVOKE'").get()).toEqual({count:1});
  });

  it('proves exact active allocation counts for fixed costs and released-grant reuse', () => {
    const database = openDatabase(':memory:'); databases.push(database); const db = database.database;
    const teacher='00000000-0000-4000-8000-000000000101', year='00000000-0000-4000-8000-000000000102', group='00000000-0000-4000-8000-000000000103', student='00000000-0000-4000-8000-000000000104', context2='00000000-0000-4000-8000-000000000105', context3='00000000-0000-4000-8000-000000000106';
    const at='2026-09-01T00:00:00.000Z';
    db.prepare('INSERT INTO teacher_accounts (id,email,password_hash,created_at) VALUES (?,?,?,?)').run(teacher,'t2@example.test','x',at);
    db.prepare('INSERT INTO academic_years (id,owner_teacher_id,label,starts_on,ends_on,created_at) VALUES (?,?,?,?,?,?)').run(year,teacher,'Y2','2026-09-01','2027-07-01',at);
    db.prepare('INSERT INTO groups (id,owner_teacher_id,academic_year_id,name,created_at) VALUES (?,?,?,?,?)').run(group,teacher,year,'G2',at);
    db.prepare('INSERT INTO students (id,group_id,real_name,alias,avatar,created_at) VALUES (?,?,?,?,?,?)').run(student,group,'Student 2','S2','default',at);
    db.prepare('INSERT INTO assessment_contexts (id,group_id,name,created_at) VALUES (?,?,?,?)').run(context2,group,'Standard',at);
    db.prepare('INSERT INTO assessment_contexts (id,group_id,name,created_at) VALUES (?,?,?,?)').run(context3,group,'Exceptional',at);
    for (const source of ['PERSONAL_IMPROVEMENT','EXCEPTIONAL_FRENCH','EXCEPTIONAL_COLLABORATION','SPECIAL_CHALLENGE','PERSONAL_IMPROVEMENT']) grant(db,{studentId:student,academicYearId:year,source});
    db.prepare('UPDATE assessment_contexts SET archived_at=? WHERE id=?').run(at, context2);
    expect(() => spend(db,teacher,student,context2,'standard-assessment-advantage','00000000-0000-4000-8000-000000000109')).toThrow();
    db.prepare('UPDATE assessment_contexts SET archived_at=NULL WHERE id=?').run(context2);
    const standard=spend(db,teacher,student,context2,'standard-assessment-advantage','00000000-0000-4000-8000-000000000107');
    const standardGrantIds=db.prepare('SELECT grant_ledger_entry_id AS id FROM coin_spend_allocations WHERE redemption_id=? AND released_at IS NULL ORDER BY id').all(standard.id).map((row: any)=>row.id);
    expect(standardGrantIds).toHaveLength(2);
    expect(new Set(standardGrantIds).size).toBe(2);
    db.prepare("INSERT INTO coin_ledger (id,student_id,academic_year_id,amount,source,redemption_id,created_at) VALUES (?,?,?,?,?,?,?)").run('refund-only',student,year,2,'REDEMPTION_REFUND',standard.id,at);
    expect(db.prepare('SELECT COUNT(*) AS count FROM coin_spend_allocations WHERE redemption_id=? AND released_at IS NULL').get(standard.id)).toEqual({count:2});
    db.prepare("UPDATE coin_spend_allocations SET released_at=?,release_reason='REDEMPTION_REVERSED' WHERE redemption_id=?").run(at,standard.id);
    const exceptional=spend(db,teacher,student,context3,'exceptional-assessment-advantage','00000000-0000-4000-8000-000000000108');
    const exceptionalAllocations=db.prepare('SELECT grant_ledger_entry_id AS id FROM coin_spend_allocations WHERE redemption_id=? AND released_at IS NULL').all(exceptional.id).map((row: any)=>row.id);
    expect(exceptionalAllocations).toHaveLength(3);
    expect(new Set(exceptionalAllocations).size).toBe(3);
    expect(exceptionalAllocations).not.toContain('refund-only');
  });
});
