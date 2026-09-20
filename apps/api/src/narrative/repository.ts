import { createHash, randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import { ApiError } from '../http/errors.js';
import { findNarrativeEvent } from './catalogue.js';

export type Lineage = { ownerTeacherId: string; groupId: string; academicYearId: string };
export type NarrativeHead = Lineage & { revision: number; createdAt: string; updatedAt: string };
export type NarrativeEventRow = Lineage & { id: string; eventKey: string; ordinal: number; term: string; startedAt: string; completedAt: string | null; revealedClueCount: number; mechanicKind: 'CHALLENGE' | 'MINIGAME' | null; mechanicId: string | null; revision: number; updatedAt: string };
export type Receipt = Lineage & { command: string; idempotencyKey: string; requestFingerprint: string; eventKey: string; resultingRevision: number; responseStatus: number; responseBodyJson: string };

const scope = (l: Lineage) => [l.ownerTeacherId, l.groupId, l.academicYearId];
const eventSelect = `SELECT id, group_id AS groupId, academic_year_id AS academicYearId, owner_teacher_id AS ownerTeacherId,
  event_key AS eventKey, ordinal, term, started_at AS startedAt, completed_at AS completedAt,
  revealed_clue_count AS revealedClueCount, mechanic_kind AS mechanicKind, mechanic_id AS mechanicId,
  revision, updated_at AS updatedAt FROM narrative_group_events`;

export function findLineage(db: Database.Database, ownerTeacherId: string, groupId: string, academicYearId: string) {
  return db.prepare(`SELECT g.id AS groupId, g.academic_year_id AS academicYearId, g.owner_teacher_id AS ownerTeacherId,
    y.archived_at AS archivedAt FROM groups g JOIN academic_years y ON y.id=g.academic_year_id
    WHERE g.id=? AND g.academic_year_id=? AND g.owner_teacher_id=?`).get(groupId, academicYearId, ownerTeacherId) as { groupId: string; academicYearId: string; ownerTeacherId: string; archivedAt: string | null } | undefined;
}

export function findHead(db: Database.Database, lineage: Lineage) {
  return db.prepare(`SELECT group_id AS groupId, academic_year_id AS academicYearId, owner_teacher_id AS ownerTeacherId,
    revision, created_at AS createdAt, updated_at AS updatedAt FROM narrative_group_state
    WHERE owner_teacher_id=? AND group_id=? AND academic_year_id=?`).get(...scope(lineage)) as NarrativeHead | undefined;
}

export function ensureHead(db: Database.Database, lineage: Lineage, now: string) {
  db.prepare(`INSERT OR IGNORE INTO narrative_group_state
    (group_id, academic_year_id, owner_teacher_id, revision, created_at, updated_at) VALUES (?, ?, ?, 0, ?, ?)`)
    .run(lineage.groupId, lineage.academicYearId, lineage.ownerTeacherId, now, now);
  return findHead(db, lineage)!;
}

export function listEvents(db: Database.Database, lineage: Lineage) {
  return db.prepare(`${eventSelect} WHERE owner_teacher_id=? AND group_id=? AND academic_year_id=? ORDER BY ordinal`)
    .all(...scope(lineage)) as NarrativeEventRow[];
}

export function findEvent(db: Database.Database, lineage: Lineage, eventKey: string) {
  return db.prepare(`${eventSelect} WHERE owner_teacher_id=? AND group_id=? AND academic_year_id=? AND event_key=?`)
    .get(...scope(lineage), eventKey) as NarrativeEventRow | undefined;
}

export function findReceipt(db: Database.Database, lineage: Lineage, command: string, key: string) {
  return db.prepare(`SELECT group_id AS groupId, academic_year_id AS academicYearId, owner_teacher_id AS ownerTeacherId,
    command, idempotency_key AS idempotencyKey, request_fingerprint AS requestFingerprint, event_key AS eventKey,
    resulting_revision AS resultingRevision, response_status AS responseStatus, response_body_json AS responseBodyJson
    FROM narrative_command_requests WHERE owner_teacher_id=? AND group_id=? AND academic_year_id=? AND command=? AND idempotency_key=?`)
    .get(...scope(lineage), command, key) as Receipt | undefined;
}

export function claimRevision(db: Database.Database, lineage: Lineage, expected: number, now: string) {
  return db.prepare(`UPDATE narrative_group_state SET revision=revision+1, updated_at=?
    WHERE owner_teacher_id=? AND group_id=? AND academic_year_id=? AND revision=?`).run(now, ...scope(lineage), expected).changes === 1;
}

export function insertEvent(db: Database.Database, row: Omit<NarrativeEventRow, 'id'>) {
  db.prepare(`INSERT INTO narrative_group_events
    (id, group_id, academic_year_id, owner_teacher_id, event_key, ordinal, term, started_at, completed_at,
     revealed_clue_count, mechanic_kind, mechanic_id, revision, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(randomUUID(), row.groupId, row.academicYearId, row.ownerTeacherId, row.eventKey, row.ordinal, row.term,
      row.startedAt, row.completedAt, row.revealedClueCount, row.mechanicKind, row.mechanicId, row.revision, row.updatedAt);
}

export function updateEvent(db: Database.Database, lineage: Lineage, eventKey: string, expectedRevision: number, values: { revealedClueCount?: number; mechanicKind?: string | null; mechanicId?: string | null; completedAt?: string }) {
  const sets: string[] = ['revision=?', 'updated_at=?'];
  const args: unknown[] = [expectedRevision + 1, new Date().toISOString()];
  if (values.revealedClueCount !== undefined) { sets.push('revealed_clue_count=?'); args.push(values.revealedClueCount); }
  if (values.mechanicKind !== undefined) { sets.push('mechanic_kind=?'); args.push(values.mechanicKind); }
  if (values.mechanicId !== undefined) { sets.push('mechanic_id=?'); args.push(values.mechanicId); }
  if (values.completedAt !== undefined) { sets.push('completed_at=?'); args.push(values.completedAt); }
  const result = db.prepare(`UPDATE narrative_group_events SET ${sets.join(', ')}
    WHERE owner_teacher_id=? AND group_id=? AND academic_year_id=? AND event_key=? AND completed_at IS NULL AND revision=?`)
    .run(...args, ...scope(lineage), eventKey, expectedRevision);
  return result.changes === 1;
}

export function insertReceipt(db: Database.Database, lineage: Lineage, command: string, key: string, fingerprint: string, eventKey: string, revision: number, status: number, body: unknown, now: string) {
  db.prepare(`INSERT INTO narrative_command_requests
    (id, group_id, academic_year_id, owner_teacher_id, command, idempotency_key, request_fingerprint, event_key,
     resulting_revision, response_status, response_body_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(randomUUID(), lineage.groupId, lineage.academicYearId, lineage.ownerTeacherId, command, key, fingerprint, eventKey, revision, status, JSON.stringify(body), now);
}

export function canonicalFingerprint(value: unknown) {
  const sort = (v: unknown): unknown => Array.isArray(v) ? v.map(sort) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([k, x]) => [k, sort(x)])) : v;
  return createHash('sha256').update(JSON.stringify(sort(value))).digest('hex');
}

export function catalogueForRow(row: NarrativeEventRow) {
  const event = findNarrativeEvent(row.eventKey);
  if (!event || event.ordinal !== row.ordinal || event.term !== row.term) throw new ApiError('INTERNAL_ERROR', 500, 'Narrative catalogue and progress do not match.');
  return event;
}
