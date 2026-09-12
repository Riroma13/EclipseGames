import Database from 'better-sqlite3';
import { afterEach, describe, expect, it } from 'vitest';
import { migrateDatabase } from '../db/migrate.js';
import { migrations } from '../db/migrations.js';
import * as xp from '../xp/service.js';
import { createGemSourceOrchestrator } from './source-orchestrator.js';
import { resultReward, spend, correctResultReward } from './service.js';

const ids = {
  teacher: '00000000-0000-4000-8000-000000000201',
  year: '00000000-0000-4000-8000-000000000202',
  group: '00000000-0000-4000-8000-000000000203',
  student: '00000000-0000-4000-8000-000000000204',
  context: '00000000-0000-4000-8000-000000000205',
};
const key = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

function database() {
  const db = new Database(':memory:');
  db.pragma('foreign_keys=ON');
  migrateDatabase(db, migrations);
  db.prepare('INSERT INTO teacher_accounts VALUES (?,?,?,?)').run(ids.teacher, 'xp@test', 'hash', 'now');
  db.prepare('INSERT INTO academic_years (id,owner_teacher_id,label,starts_on,ends_on,created_at) VALUES (?,?,?,?,?,?)').run(ids.year, ids.teacher, '2026', '2026', '2027', 'now');
  db.prepare('INSERT INTO groups VALUES (?,?,?,?,?)').run(ids.group, ids.teacher, ids.year, 'A', 'now');
  db.prepare('INSERT INTO students (id,group_id,real_name,alias,avatar,specialty,created_at) VALUES (?,?,?,?,?,?,?)').run(ids.student, ids.group, 'Student', 'S', 'default', 'Leader', 'now');
  db.prepare('INSERT INTO assessment_contexts (id,group_id,name,created_at) VALUES (?,?,?,?)').run(ids.context, ids.group, 'Assessment', 'now');
  return db;
}

describe('XP gem source boundary', () => {
  const open: Database.Database[] = [];
  afterEach(() => { for (const db of open.splice(0)) db.close(); });

  it('commits threshold receipts, replays them exactly, and reverses the same lineage', () => {
    const db = database(); open.push(db);
    const coordinator = createGemSourceOrchestrator();
    for (let index = 1; index <= 7; index += 1) {
      const result = xp.create(db, ids.teacher, ids.student, { category: 'COMMUNICATION', baseXp: 3 }, key(210 + index), undefined, coordinator);
      if (index === 7) expect(result.event.id).toBeTruthy();
    }

    expect(db.prepare('SELECT sequence,kind FROM xp_level_grant_transitions ORDER BY sequence').all()).toEqual([
      { sequence: 1, kind: 'GRANT' }, { sequence: 2, kind: 'GRANT' },
    ]);
    expect(db.prepare('SELECT sequence,kind,movement_id FROM gem_xp_transition_receipts ORDER BY sequence').all()).toHaveLength(2);
    expect(db.prepare('SELECT last_sequence FROM gem_reconciliation_cursors WHERE stream=?').get('xp-level-grant-transitions')).toEqual({ last_sequence: 2 });
    expect(db.prepare('SELECT COUNT(*) AS count FROM gem_ledger WHERE source_kind=?').get('XP_TRANSITION')).toEqual({ count: 2 });

    const replay = xp.create(db, ids.teacher, ids.student, { category: 'COMMUNICATION', baseXp: 3 }, key(217), undefined, coordinator);
    expect(replay.replay).toBe(true);
    expect(db.prepare('SELECT COUNT(*) AS count FROM gem_ledger').get()).toEqual({ count: 2 });

    const seventh = db.prepare('SELECT id FROM xp_evidence_events WHERE client_request_id=?').get(key(217)) as { id: string };
    const reversed = xp.reverse(db, ids.teacher, seventh.id, { reason: 'Correction' }, key(218), coordinator);
    expect(reversed.replay).toBe(false);
    expect(db.prepare('SELECT sequence,kind FROM xp_level_grant_transitions ORDER BY sequence').all()).toEqual([
      { sequence: 1, kind: 'GRANT' }, { sequence: 2, kind: 'GRANT' }, { sequence: 3, kind: 'REVOKE' },
    ]);
    expect(db.prepare('SELECT sequence,kind FROM gem_xp_transition_receipts ORDER BY sequence').all()).toEqual([
      { sequence: 1, kind: 'GRANT' }, { sequence: 2, kind: 'GRANT' }, { sequence: 3, kind: 'REVOKE' },
    ]);
    expect(db.prepare('SELECT last_sequence FROM gem_reconciliation_cursors WHERE stream=?').get('xp-level-grant-transitions')).toEqual({ last_sequence: 3 });
  });

  it('rejects changed receipt lineage and rolls back a failed source transaction', () => {
    const db = database(); open.push(db);
    const real = createGemSourceOrchestrator();
    xp.create(db, ids.teacher, ids.student, { category: 'COMMUNICATION', baseXp: 3 }, key(220), undefined, real);
    xp.create(db, ids.teacher, ids.student, { category: 'COMMUNICATION', baseXp: 3 }, key(221), undefined, real);
    xp.create(db, ids.teacher, ids.student, { category: 'COMMUNICATION', baseXp: 3 }, key(222), undefined, real);
    db.prepare('UPDATE gem_xp_transition_receipts SET fingerprint=? WHERE sequence=1').run('changed');
    expect(() => xp.create(db, ids.teacher, ids.student, { category: 'COMMUNICATION', baseXp: 3 }, key(222), undefined, real)).toThrow(/lineage|receipt/i);

    const failing = {
      applyXp(tx: Parameters<typeof real.applyXp>[0], transitionIds: readonly string[]) {
        real.applyXp(tx, transitionIds);
        throw new Error('injected source failure');
      },
      applyRtScope: real.applyRtScope,
      applyRtBaselineEntitlement: real.applyRtBaselineEntitlement,
    };
    expect(() => xp.create(db, ids.teacher, ids.student, { category: 'COMMUNICATION', baseXp: 3 }, key(223), undefined, failing)).toThrow('injected source failure');
    expect(db.prepare('SELECT COUNT(*) AS count FROM xp_evidence_events WHERE client_request_id=?').get(key(223))).toEqual({ count: 0 });
    expect(db.prepare('SELECT COUNT(*) AS count FROM gem_ledger').get()).toEqual({ count: 1 });
  });
});

describe('result reward and redemption lineage', () => {
  const open: Database.Database[] = [];
  afterEach(() => { for (const db of open.splice(0)) db.close(); });

  it('uses exact operation identities, replays, and refunds before correction', () => {
    const db = database(); open.push(db);
    const grant = resultReward(db, ids.teacher, ids.student, ids.context, '8.00', key(230));
    expect(grant.status).toBe(201);
    const redemption = spend(db, ids.teacher, ids.student, ids.context, 'emerald-assessment-advantage', key(231));
    expect(redemption.status).toBe(201);
    const correction = correctResultReward(db, ids.teacher, grant.id, 'Score corrected', key(232));
    expect(correction.status).toBe(201);
    expect(db.prepare('SELECT movement_kind,source_kind,source_id,source_family_id,correction_of_id FROM gem_ledger ORDER BY rowid').all()).toMatchObject([
      { movement_kind: 'GRANT', source_kind: 'RESULT_REWARD' },
      { movement_kind: 'GRANT', source_kind: 'RESULT_REWARD' },
      { movement_kind: 'SPEND', source_kind: 'REDEMPTION' },
      { movement_kind: 'SPEND', source_kind: 'REDEMPTION' },
      { movement_kind: 'SPEND_REVERSAL', source_kind: 'REDEMPTION' },
      { movement_kind: 'SPEND_REVERSAL', source_kind: 'REDEMPTION' },
      { movement_kind: 'CORRECTION', source_kind: 'RESULT_REWARD' },
      { movement_kind: 'CORRECTION', source_kind: 'RESULT_REWARD' },
    ]);
    expect(db.prepare('SELECT state FROM gem_advantage_redemptions WHERE id=?').get(redemption.id)).toEqual({ state: 'REVERSED' });
    expect(db.prepare('SELECT balances FROM (SELECT json_group_array(amount) AS balances FROM gem_ledger)').get()).toBeTruthy();
    expect(correctResultReward(db, ids.teacher, grant.id, 'Score corrected', key(232)).replay).toBe(true);
  });
});
