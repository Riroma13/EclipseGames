import { describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import { migrateDatabase } from '../db/migrate.js';
import { migrations } from '../db/migrations.js';
import * as service from './service.js';
import { createLevelGrantTransitionPort } from './level-grant-transition-port.js';
import { createGemSourceOrchestrator } from '../gems/source-orchestrator.js';
import { reconcileBeforeReadiness } from '../gems/startup-reconciliation.js';

it('exposes ordered immutable transitions for SPEC-0005 replay', () => {
  const db=new Database(':memory:'); db.pragma('foreign_keys=ON'); migrateDatabase(db,migrations);
  const t='00000000-0000-4000-8000-000000000101', y='00000000-0000-4000-8000-000000000102', g='00000000-0000-4000-8000-000000000103', s='00000000-0000-4000-8000-000000000104';
  db.prepare('INSERT INTO teacher_accounts VALUES (?,?,?,?)').run(t,'t@test','h','now'); db.prepare('INSERT INTO academic_years (id,owner_teacher_id,label,starts_on,ends_on,created_at) VALUES (?,?,?,?,?,?)').run(y,t,'Y','2026','2027','now'); db.prepare('INSERT INTO groups VALUES (?,?,?,?,?)').run(g,t,y,'G','now'); db.prepare('INSERT INTO students (id,group_id,real_name,alias,avatar,specialty,created_at) VALUES (?,?,?,?,?,?,?)').run(s,g,'Student','S','default','Leader','now');
  service.create(db,t,s,{category:'COMMUNICATION',baseXp:3},'00000000-0000-4000-8000-000000000105'); service.create(db,t,s,{category:'COMMUNICATION',baseXp:3},'00000000-0000-4000-8000-000000000106'); service.create(db,t,s,{category:'COMMUNICATION',baseXp:3},'00000000-0000-4000-8000-000000000107');
  const port=createLevelGrantTransitionPort(db); const transitions=port.listAfter(0,10); expect(transitions).toHaveLength(1); expect(transitions[0]).toMatchObject({sequence:1,kind:'GRANT',level:2}); expect(port.get(transitions[0].id)).toEqual(transitions[0]); db.close();
});

function fixture() {
  const db=new Database(':memory:'); db.pragma('foreign_keys=ON'); migrateDatabase(db,migrations);
  const t='00000000-0000-4000-8000-000000000201', y='00000000-0000-4000-8000-000000000202', g='00000000-0000-4000-8000-000000000203', s='00000000-0000-4000-8000-000000000204';
  db.prepare('INSERT INTO teacher_accounts VALUES (?,?,?,?)').run(t,'t201@test','h','now'); db.prepare('INSERT INTO academic_years (id,owner_teacher_id,label,starts_on,ends_on,created_at) VALUES (?,?,?,?,?,?)').run(y,t,'Y','2026','2027','now'); db.prepare('INSERT INTO groups VALUES (?,?,?,?,?)').run(g,t,y,'G','now'); db.prepare('INSERT INTO students (id,group_id,real_name,alias,avatar,specialty,created_at) VALUES (?,?,?,?,?,?,?)').run(s,g,'Student','S','default','Leader','now');
  return {db,t,y,s};
}

it.each([[174,6],[175,7],[180,7]] as const)('completes historical XP totals at %i without inventing L9', (total, count) => {
  const {db,t,y,s}=fixture();
  for(let i=0;i<total/3;i+=1) service.create(db,t,s,{category:'PRECISION',baseXp:3},`00000000-0000-4000-8000-000000000${String(300+i).padStart(3,'0')}`);
  db.prepare('DELETE FROM xp_level_grant_transitions').run(); db.prepare('DELETE FROM xp_level_unlocks').run();
  const port=createLevelGrantTransitionPort(db); const result=port.completeAuthoritativeLevelTransitions(db);
  expect(result.appendedTransitions).toHaveLength(count); expect(result.throughSequence).toBe(count); expect(port.listAfter(0,100).every(row => row.level <= 8)).toBe(true);
  expect(port.completeAuthoritativeLevelTransitions(db)).toEqual({throughSequence:count,appendedTransitions:[]}); db.close();
});

it('startup drains XP from zero and performs the empty terminal probe', () => {
  const {db,t,s}=fixture(); for (const key of ['401','402','403','404']) service.create(db,t,s,{category:'PRECISION',baseXp:3},`00000000-0000-4000-8000-000000000${key}`); db.prepare('DELETE FROM xp_level_grant_transitions').run(); db.prepare('DELETE FROM xp_level_unlocks').run();
  reconcileBeforeReadiness(db,createGemSourceOrchestrator());
  expect(db.prepare("SELECT last_sequence FROM gem_reconciliation_cursors WHERE stream='xp-level-grant-transitions'").get()).toEqual({last_sequence:1});
  db.close();
});

it('rolls back completion and receipt work when startup fails after an XP page', () => {
  const {db,t,s}=fixture(); for (const key of ['409','410','411','412']) service.create(db,t,s,{category:'PRECISION',baseXp:3},`00000000-0000-4000-8000-000000000${key}`); db.prepare('DELETE FROM xp_level_grant_transitions').run(); db.prepare('DELETE FROM xp_level_unlocks').run();
  expect(() => reconcileBeforeReadiness(db,createGemSourceOrchestrator(),{onStep: step => { if (step === 'xp-page') throw new Error('startup injection'); }})).toThrow('startup injection');
  expect(db.prepare('SELECT COUNT(*) AS count FROM xp_level_grant_transitions').get()).toEqual({count:0}); expect(db.prepare('SELECT COUNT(*) AS count FROM gem_xp_transition_receipts').get()).toEqual({count:0}); expect(db.prepare('SELECT last_sequence FROM gem_reconciliation_cursors WHERE stream=?').get('xp-level-grant-transitions')).toEqual({last_sequence:0}); db.close();
});

it('rejects malformed historical transition lineage atomically', () => {
  const {db,t,s}=fixture(); for (const key of ['405','406','407','408']) service.create(db,t,s,{category:'PRECISION',baseXp:3},`00000000-0000-4000-8000-000000000${key}`); const later=(db.prepare('SELECT id FROM xp_evidence_events ORDER BY created_at,id LIMIT 1 OFFSET 1').get() as {id:string}).id; db.prepare('UPDATE xp_level_grant_transitions SET source_event_id=?').run(later);
  expect(() => createLevelGrantTransitionPort(db).completeAuthoritativeLevelTransitions(db)).toThrow();
  expect(db.prepare('SELECT source_event_id FROM xp_level_grant_transitions').get()).toEqual({source_event_id:later}); db.close();
});
