import { randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import { ApiError } from '../http/errors.js';
import { runImmediateTransaction } from '../services/transactions.js';
import { deriveNarrativeState } from './domain.js';
import { findNarrativeEvent, narrativeCatalogue, type MechanicKind, type NarrativeCatalogueEvent, type NarrativeTerm } from './catalogue.js';
import * as repository from './repository.js';
import { mapNarrativeState } from './mapper.js';

const uuidV4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type Command = 'START' | 'REVEAL_NEXT_CLUE' | 'LINK' | 'COMPLETE';
type Link = { kind: MechanicKind; id: string };
type Input = { expectedRevision: number; link?: Link };
const now = () => new Date().toISOString();
const fail = (code: 'NOT_FOUND' | 'CONFLICT' | 'VALIDATION_FAILED' | 'INTERNAL_ERROR', status: number, message: string): never => { throw new ApiError(code, status, message); };

function key(value: string) { if (!uuidV4.test(value)) fail('VALIDATION_FAILED', 422, 'A UUID v4 Idempotency-Key header is required.'); return value; }
function commandInput(command: Command, input: Input): Input { if (!Number.isInteger(input.expectedRevision) || input.expectedRevision < 0) fail('VALIDATION_FAILED', 422, 'expectedRevision is invalid.'); if (command === 'LINK' && (!input.link || !uuidV4.test(input.link.id) || !['CHALLENGE', 'MINIGAME'].includes(input.link.kind))) fail('VALIDATION_FAILED', 422, 'A valid mechanic link is required.'); return input; }

function currentTerm(db: Database.Database, owner: string, year: string): NarrativeTerm {
  const today = new Date().toISOString().slice(0, 10);
  const row = db.prepare(`SELECT code FROM academic_terms WHERE owner_teacher_id=? AND academic_year_id=? AND starts_on<=? ORDER BY starts_on DESC LIMIT 1`).get(owner, year, today) as { code: NarrativeTerm } | undefined;
  return row?.code ?? 'T1';
}

type Context = repository.Lineage & { archivedAt: string | null };
function context(db: Database.Database, owner: string, group: string, year: string): Context {
  const row = repository.findLineage(db, owner, group, year);
  return row ?? fail('NOT_FOUND', 404, 'Group not found.');
}
function readState(db: Database.Database, owner: string, group: string, year: string) {
  const c = context(db, owner, group, year); return mapNarrativeState(repository.findHead(db, c), repository.listEvents(db, c), currentTerm(db, owner, year), Boolean(c.archivedAt));
}

export function getState(db: Database.Database, owner: string, group: string, year: string) { return readState(db, owner, group, year); }

export function executeCommand(db: Database.Database, owner: string, group: string, year: string, eventKey: string, command: Command, input: Input, idempotencyKey: string, options: { now?: () => string; failBeforeReceipt?: boolean } = {}) {
  const requestKey = key(idempotencyKey); const body = commandInput(command, input); const stamp = options.now?.() ?? now();
  const fingerprint = repository.canonicalFingerprint({ command, routeTarget: { groupId: group, academicYearId: year, eventKey }, payload: body });
  return runImmediateTransaction(db, `${command}:${requestKey}`, tx => {
    const lineage = context(tx.db, owner, group, year);
    const prior = repository.findReceipt(tx.db, lineage, command, requestKey);
    if (prior) { if (prior.requestFingerprint !== fingerprint) fail('CONFLICT', 409, 'Idempotency key was already used for another request.'); return { status: prior.responseStatus, body: JSON.parse(prior.responseBodyJson), replay: true }; }
    const head = repository.ensureHead(tx.db, lineage, stamp);
    if (head.revision !== body.expectedRevision) fail('CONFLICT', 409, 'Narrative state changed. Refresh and retry.');
    if (lineage.archivedAt) fail('CONFLICT', 409, 'Archived academic years are read-only.');
    const rows = repository.listEvents(tx.db, lineage); const completed = new Set(rows.filter(row => row.completedAt).map(row => row.ordinal));
    const catalogue = findNarrativeEvent(eventKey);
    if (!catalogue) return fail('NOT_FOUND', 404, 'Narrative event not found.');
    const row = repository.findEvent(tx.db, lineage, eventKey); const state = deriveNarrativeState(catalogue, { completedOrdinals: completed, currentTerm: currentTerm(tx.db, owner, year) });
    if (state !== 'AVAILABLE') fail('CONFLICT', 409, 'The narrative event is not available.');
    if (command === 'START' && row) fail('CONFLICT', 409, 'The narrative event has already started.');
    if (command !== 'START' && !row) fail('CONFLICT', 409, 'The narrative event must be started first.');
    if (command === 'REVEAL_NEXT_CLUE' && row && row.revealedClueCount >= catalogue.clues.length) fail('CONFLICT', 409, 'All clues are already revealed.');
    if (command === 'LINK') validateLink(tx.db, lineage, catalogue.mechanic, body.link!, false);
    if (command === 'COMPLETE') validateCompletion(tx.db, lineage, catalogue, row!);
    if (!repository.claimRevision(tx.db, lineage, head.revision, stamp)) fail('CONFLICT', 409, 'Narrative state changed. Refresh and retry.');
    const revision = head.revision + 1;
    if (command === 'START') repository.insertEvent(tx.db, { ...lineage, eventKey, ordinal: catalogue.ordinal, term: catalogue.term, startedAt: stamp, completedAt: null, revealedClueCount: 0, mechanicKind: null, mechanicId: null, revision, updatedAt: stamp });
    else if (command === 'REVEAL_NEXT_CLUE') repository.updateEvent(tx.db, lineage, eventKey, head.revision, { revealedClueCount: row!.revealedClueCount + 1 });
    else if (command === 'LINK') repository.updateEvent(tx.db, lineage, eventKey, head.revision, { mechanicKind: body.link!.kind, mechanicId: body.link!.id });
    else repository.updateEvent(tx.db, lineage, eventKey, head.revision, { completedAt: stamp });
    const result = readState(tx.db, owner, group, year); if (options.failBeforeReceipt) throw new Error('injected pre-receipt failure');
    repository.insertReceipt(tx.db, lineage, command, requestKey, fingerprint, eventKey, revision, 200, result, stamp);
    return { status: 200 as const, body: result, replay: false };
  });
}

function validateLink(db: Database.Database, lineage: repository.Lineage, mechanic: NarrativeCatalogueEvent['mechanic'], link: Link, requireTerminal: boolean) {
  if (mechanic.requirement === 'NONE' || mechanic.kind !== link.kind) fail('CONFLICT', 409, 'This event does not accept that mechanic.');
  const table = link.kind === 'CHALLENGE' ? 'classroom_challenges' : 'minigame_sessions';
  const terminal = link.kind === 'CHALLENGE' ? 'COMPLETED' : 'ENDED';
  const row = db.prepare(`SELECT id FROM ${table} WHERE id=? AND owner_teacher_id=? AND group_id=? ${requireTerminal ? 'AND status=?' : ''}`).get(...(requireTerminal ? [link.id, lineage.ownerTeacherId, lineage.groupId, terminal] : [link.id, lineage.ownerTeacherId, lineage.groupId]));
  if (!row) fail('CONFLICT', 409, 'The mechanic must be owned by this group and reach its terminal state.');
}
function validateCompletion(db: Database.Database, lineage: repository.Lineage, catalogue: NarrativeCatalogueEvent, row: repository.NarrativeEventRow) {
  if (catalogue.mechanic.requirement === 'NONE' && row.mechanicId) fail('CONFLICT', 409, 'This event does not accept a mechanic link.');
  if (catalogue.mechanic.requirement === 'REQUIRED' && (!row.mechanicId || row.mechanicKind !== catalogue.mechanic.kind)) fail('CONFLICT', 409, 'The required mechanic must be linked and terminal.');
  if (row.mechanicId) validateLink(db, lineage, catalogue.mechanic, { kind: row.mechanicKind!, id: row.mechanicId }, true);
}
export const start = (db: Database.Database, owner: string, group: string, year: string, event: string, input: Input, key: string) => executeCommand(db, owner, group, year, event, 'START', input, key);
export const revealNextClue = (db: Database.Database, owner: string, group: string, year: string, event: string, input: Input, key: string) => executeCommand(db, owner, group, year, event, 'REVEAL_NEXT_CLUE', input, key);
export const link = (db: Database.Database, owner: string, group: string, year: string, event: string, input: Input, key: string) => executeCommand(db, owner, group, year, event, 'LINK', input, key);
export const complete = (db: Database.Database, owner: string, group: string, year: string, event: string, input: Input, key: string) => executeCommand(db, owner, group, year, event, 'COMPLETE', input, key);
