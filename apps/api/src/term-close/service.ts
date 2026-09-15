import { createHash, randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import { ApiError } from '../http/errors.js';
import { runImmediateTransaction } from '../services/transactions.js';
import * as repo from './repository.js';
import { buildTermCloseWorkbook } from './xlsx.js';
import { closeRt } from './domain.js';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const fail = (message: string, status = 422): never => { throw new ApiError(status === 409 ? 'CONFLICT' : status === 404 ? 'NOT_FOUND' : 'VALIDATION_FAILED', status, message); };
const fingerprint = (operation: string, target: unknown, body: unknown) => createHash('sha256').update(JSON.stringify({ operation, target, body })).digest('hex');
const key = (value: string) => { if (!UUID_V4.test(value)) fail('Idempotency-Key must be a UUID-v4.'); return value; };
const requiredContext = (db: Database.Database, owner: string, year: string, group: string, term: string) => { const value = repo.ownedContext(db, owner, year, group, term); if (!value) fail('Group term close not found.', 404); return value!; };

export function readiness(db: Database.Database, owner: string, year: string, group: string, term: string) { const result = repo.readReadiness(db, owner, year, group, term); if (!result) fail('Group term close not found.', 404); const value = result!; return { ...value, staleReasons: value.closure ? repo.staleReasonsFor(db, value.closure.id) : [] }; }

export async function close(db: Database.Database, owner: string, year: string, group: string, term: string, idempotencyKey: string, input: { expectedRevision: number }) {
  const requestKey = key(idempotencyKey); const fp = fingerprint('CLOSE', { year, group, term }, input);
  const preparedContext = requiredContext(db, owner, year, group, term);
  if (preparedContext.yearArchived) fail('Archived academic years are read-only.', 422);
  const prepared = repo.readReadiness(db, owner, year, group, term)!;
  if (!prepared.ready) fail('Every active student must have a closed M5 snapshot.');
  const preparedRows = prepared.rows.map((row: any) => {
    const rt = closeRt(row.rt);
    return { ...row, rtSum: rt.sum, rtEvaluatedCount: rt.evaluatedCount };
  });
  const preparedFingerprint = JSON.stringify(preparedRows);
  const xlsxBytes = await buildTermCloseWorkbook({ termCode: preparedContext.termCode, rows: preparedRows });

  return runImmediateTransaction(db, fp, (tx) => {
    const context = requiredContext(tx.db, owner, year, group, term); if (context.yearArchived) fail('Archived academic years are read-only.', 422);
    const prior = tx.db.prepare('SELECT * FROM group_term_close_requests WHERE owner_teacher_id=? AND idempotency_key=?').get(owner, requestKey) as any;
    if (prior) { if (prior.fingerprint !== fp) fail('Idempotency key was already used for another request.', 409); return { status: 200 as const, replay: true, revision: prior.resulting_revision, version: prior.snapshot_version }; }
    let closure = tx.db.prepare('SELECT * FROM group_term_closures WHERE owner_teacher_id=? AND academic_year_id=? AND group_id=? AND term_id=?').get(owner, year, group, term) as any;
    if (!closure) { const id = randomUUID(); const stamp = new Date().toISOString(); tx.db.prepare('INSERT INTO group_term_closures (id,owner_teacher_id,academic_year_id,group_id,calendar_id,term_id,state,revision,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)').run(id, owner, year, group, context.calendarId, term, 'OPEN', 0, stamp, stamp); closure = tx.db.prepare('SELECT * FROM group_term_closures WHERE id=?').get(id) as any; }
    if (closure.revision !== input.expectedRevision) fail('The term-close revision is stale.', 409);
    if (closure.state === 'CLOSED') fail('The term is already closed.', 409);
    const current = repo.readReadiness(tx.db, owner, year, group, term)!; if (!current.ready) fail('Every active student must have a closed M5 snapshot.');
    const currentRows = current.rows.map((row: any) => { const rt = closeRt(row.rt); return { ...row, rtSum: rt.sum, rtEvaluatedCount: rt.evaluatedCount }; });
    if (JSON.stringify(currentRows) !== preparedFingerprint) fail('The term-close data changed while the export was prepared.', 409);
    const version = (closure.current_snapshot_version ?? 0) + 1; const snap = repo.closeSnapshot(tx.db, context, closure.id, version, owner, xlsxBytes, closure.current_snapshot_version, current.rows);
    const revision = closure.revision + 1; const stamp = new Date().toISOString(); const update = tx.db.prepare('UPDATE group_term_closures SET state=?,revision=?,current_snapshot_version=?,updated_at=? WHERE id=? AND revision=?').run('CLOSED', revision, version, stamp, closure.id, closure.revision); if (update.changes !== 1) fail('The term-close revision is stale.', 409);
    tx.db.prepare('INSERT INTO group_term_close_lifecycle_events (id,closure_id,operation,resulting_revision,resulting_state,snapshot_version,reason,actor_teacher_id,occurred_at) VALUES (?,?,?,?,?,?,?,?,?)').run(randomUUID(), closure.id, 'CLOSE', revision, 'CLOSED', version, null, owner, stamp);
    tx.db.prepare('INSERT INTO group_term_close_requests (id,owner_teacher_id,idempotency_key,operation,closure_id,fingerprint,resulting_revision,snapshot_version,created_at) VALUES (?,?,?,?,?,?,?,?,?)').run(randomUUID(), owner, requestKey, 'CLOSE', closure.id, fp, revision, version, stamp);
    return { status: 201 as const, replay: false, revision, version, snapshotId: snap.snapshotId };
  });
}

export function reopen(db: Database.Database, owner: string, year: string, group: string, term: string, idempotencyKey: string, input: { expectedRevision: number; reason: string }) {
  const requestKey = key(idempotencyKey); const reason = input.reason.trim(); if (reason.length < 1 || reason.length > 500) fail('Reopen reason must be between 1 and 500 characters.'); const fp = fingerprint('REOPEN', { year, group, term }, { expectedRevision: input.expectedRevision, reason });
  return runImmediateTransaction(db, fp, (tx) => { const context = requiredContext(tx.db, owner, year, group, term); if (context.yearArchived) fail('Archived academic years are read-only.', 422); const prior = tx.db.prepare('SELECT * FROM group_term_close_requests WHERE owner_teacher_id=? AND idempotency_key=?').get(owner, requestKey) as any; if (prior) { if (prior.fingerprint !== fp) fail('Idempotency key was already used for another request.', 409); return { status: 200 as const, replay: true, revision: prior.resulting_revision, version: prior.snapshot_version }; } const closure = tx.db.prepare('SELECT * FROM group_term_closures WHERE owner_teacher_id=? AND academic_year_id=? AND group_id=? AND term_id=?').get(owner, year, group, term) as any; if (!closure) fail('Group term close not found.', 404); if (closure.revision !== input.expectedRevision) fail('The term-close revision is stale.', 409); if (closure.state !== 'CLOSED') fail('Only a closed term can be reopened.', 409); const revision = closure.revision + 1; const stamp = new Date().toISOString(); const update = tx.db.prepare('UPDATE group_term_closures SET state=?,revision=?,updated_at=? WHERE id=? AND revision=?').run('REOPENED', revision, stamp, closure.id, closure.revision); if (update.changes !== 1) fail('The term-close revision is stale.', 409); tx.db.prepare('INSERT INTO group_term_close_lifecycle_events (id,closure_id,operation,resulting_revision,resulting_state,snapshot_version,reason,actor_teacher_id,occurred_at) VALUES (?,?,?,?,?,?,?,?,?)').run(randomUUID(), closure.id, 'REOPEN', revision, 'REOPENED', closure.current_snapshot_version, reason, owner, stamp); tx.db.prepare('INSERT INTO group_term_close_requests (id,owner_teacher_id,idempotency_key,operation,closure_id,fingerprint,resulting_revision,snapshot_version,created_at) VALUES (?,?,?,?,?,?,?,?,?)').run(randomUUID(), owner, requestKey, 'REOPEN', closure.id, fp, revision, closure.current_snapshot_version, stamp); return { status: 201 as const, replay: false, revision, version: closure.current_snapshot_version }; });
}
