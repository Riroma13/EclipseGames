import { randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import { applyDelta, carryLives, effectiveActionDelta, type BehaviourState, derivePolicy } from './domain.js';

export type BehaviourStateRow = {
  studentId: string; ownerTeacherId: string; academicYearId: string; groupId: string;
  currentLives: number; lastEffectiveActionId: string | null; activeZeroSourceActionId: string | null;
};

const stateSelect = `SELECT student_id AS studentId, owner_teacher_id AS ownerTeacherId, academic_year_id AS academicYearId,
 group_id AS groupId, current_lives AS currentLives, last_effective_action_id AS lastEffectiveActionId,
 active_zero_source_action_id AS activeZeroSourceActionId FROM behaviour_student_state`;

export function findState(db: Database.Database, studentId: string, academicYearId: string): BehaviourStateRow | undefined {
  return db.prepare(`${stateSelect} WHERE student_id=? AND academic_year_id=?`).get(studentId, academicYearId) as BehaviourStateRow | undefined;
}

export function readState(db: Database.Database, studentId: string, academicYearId: string): BehaviourStateRow {
  return findState(db, studentId, academicYearId) ?? {
    studentId, academicYearId, ownerTeacherId: '', groupId: '', currentLives: 4,
    lastEffectiveActionId: null, activeZeroSourceActionId: null,
  };
}

export function saveState(db: Database.Database, state: BehaviourStateRow) {
  db.prepare(`INSERT INTO behaviour_student_state (student_id,owner_teacher_id,academic_year_id,group_id,current_lives,last_effective_action_id,active_zero_source_action_id)
    VALUES (?,?,?,?,?,?,?) ON CONFLICT(student_id,academic_year_id) DO UPDATE SET current_lives=excluded.current_lives,last_effective_action_id=excluded.last_effective_action_id,active_zero_source_action_id=excluded.active_zero_source_action_id`)
    .run(state.studentId, state.ownerTeacherId, state.academicYearId, state.groupId, state.currentLives, state.lastEffectiveActionId, state.activeZeroSourceActionId);
}

export function snapshotLives(db: Database.Database, sessionId: string, studentId: string, ownerTeacherId: string, academicYearId: string, groupId: string, termId: string, inheritedActionId: string | null = null) {
  const state = findState(db, studentId, academicYearId);
  const lives = carryLives(state?.currentLives);
  db.prepare(`INSERT INTO real_class_session_behaviour_roster (session_id,student_id,owner_teacher_id,academic_year_id,group_id,term_id,lives_at_start,inherited_action_id,zero_source_action_id) VALUES (?,?,?,?,?,?,?,?,?)`)
    .run(sessionId, studentId, ownerTeacherId, academicYearId, groupId, termId, lives, inheritedActionId ?? state?.lastEffectiveActionId ?? null, state?.activeZeroSourceActionId ?? null);
  return lives;
}

export function appendAction(db: Database.Database, input: { id?: string; ownerTeacherId: string; academicYearId: string; groupId: string; sessionId: string; studentId: string; kind: 'LOSS'|'RESTORE'|'CORRECTION'; delta: number; lineage: string; requestKey: string; fingerprint: string; correctionOf?: string | null; createdAt: string }) {
  const roster = db.prepare('SELECT lives_at_start AS livesAtStart FROM real_class_session_behaviour_roster WHERE session_id=? AND student_id=?').get(input.sessionId, input.studentId) as { livesAtStart: number } | undefined;
  if (!roster) throw new Error('Behaviour student is not in the session roster.');
  const actions = db.prepare('SELECT delta,kind FROM behaviour_actions WHERE session_id=? AND student_id=? ORDER BY created_at,id').all(input.sessionId, input.studentId) as { delta:number; kind:'LOSS'|'RESTORE'|'CORRECTION' }[];
  const current = actions.reduce((lives, action) => lives + effectiveActionDelta(action.kind, action.delta), roster.livesAtStart);
  const effectiveDelta = effectiveActionDelta(input.kind, input.delta);
  applyDelta(current, effectiveDelta);
  const id = input.id ?? randomUUID();
  db.prepare(`INSERT INTO behaviour_actions (id,owner_teacher_id,academic_year_id,group_id,session_id,student_id,kind,delta,lineage,request_key,fingerprint,correction_of,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(id, input.ownerTeacherId, input.academicYearId, input.groupId, input.sessionId, input.studentId, input.kind, input.delta, input.lineage, input.requestKey, input.fingerprint, input.correctionOf ?? null, input.createdAt);
  const next = current + effectiveDelta;
  const prior = findState(db, input.studentId, input.academicYearId);
  saveState(db, {
    studentId: input.studentId,
    ownerTeacherId: prior?.ownerTeacherId || input.ownerTeacherId,
    academicYearId: input.academicYearId,
    groupId: prior?.groupId || input.groupId,
    currentLives: next,
    lastEffectiveActionId: id,
    activeZeroSourceActionId: next === 0 ? (prior?.activeZeroSourceActionId ?? id) : null,
  });
  return { id, currentLives: next, state: derivePolicy(next).state as BehaviourState };
}
