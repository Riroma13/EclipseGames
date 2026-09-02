import { createHash } from 'node:crypto';
import type Database from 'better-sqlite3';

export type EventStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED';
export type ChallengeStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED';
export type MinigameKind = 'RANDOM_DRAW' | 'FRENCH_SPRINT' | 'TEAM_DRAW' | 'PROMPT_DECK';
export type MinigameStatus = 'READY' | 'RUNNING' | 'PAUSED' | 'ENDED';

export type GroupContext = { id: string; name: string; academicYearId: string; yearArchivedAt: string | null };
export type EventRecord = { id: string; ownerTeacherId: string; groupId: string; title: string; description: string; status: EventStatus; showOnProjection: number; theme: string; createdAt: string; updatedAt: string; activatedAt: string | null; completedAt: string | null; archivedAt: string | null; clientRequestId: string | null; requestFingerprint: string | null };
export type ChallengeRecord = { id: string; ownerTeacherId: string; groupId: string; title: string; description: string; target: number; progress: number; status: ChallengeStatus; showOnProjection: number; createdAt: string; updatedAt: string; activatedAt: string | null; completedAt: string | null; archivedAt: string | null };
export type MinigameRecord = { id: string; ownerTeacherId: string; groupId: string; kind: MinigameKind; title: string; prompt: string; durationSeconds: number; status: MinigameStatus; remainingSeconds: number; startedAt: string | null; pausedAt: string | null; selectedStudentId: string | null; drawOrder: string; drawIndex: number; createdAt: string; updatedAt: string; teamCount: number; teamAssignments: string; promptDeckPrompts: string; promptRevealed: number };
export type MinigamePresetRecord = { id: string; ownerTeacherId: string; title: string; prompt: string; durationSeconds: number; archivedAt: string | null; createdAt: string; updatedAt: string };
export type PromptDeckRecord = { id: string; ownerTeacherId: string; title: string; prompts: string; archivedAt: string | null; createdAt: string; updatedAt: string };
export type StudentRecord = { id: string; realName: string; alias: string; avatar: string; specialty: string | null };
export type SafeStudentRecord = { id: string; alias: string; avatar: string; specialty: string | null };

const eventFields = 'id, owner_teacher_id AS ownerTeacherId, group_id AS groupId, title, description, status, show_on_projection AS showOnProjection, theme, created_at AS createdAt, updated_at AS updatedAt, activated_at AS activatedAt, completed_at AS completedAt, archived_at AS archivedAt, client_request_id AS clientRequestId, request_fingerprint AS requestFingerprint';
const challengeFields = 'id, owner_teacher_id AS ownerTeacherId, group_id AS groupId, title, description, target, progress, status, show_on_projection AS showOnProjection, created_at AS createdAt, updated_at AS updatedAt, activated_at AS activatedAt, completed_at AS completedAt, archived_at AS archivedAt';
const minigameFields = 'id, owner_teacher_id AS ownerTeacherId, group_id AS groupId, kind, title, prompt, duration_seconds AS durationSeconds, status, remaining_seconds AS remainingSeconds, started_at AS startedAt, paused_at AS pausedAt, selected_student_id AS selectedStudentId, draw_order AS drawOrder, draw_index AS drawIndex, created_at AS createdAt, updated_at AS updatedAt, team_count AS teamCount, team_assignments AS teamAssignments, prompt_deck_prompts AS promptDeckPrompts, prompt_revealed AS promptRevealed';
const presetFields = 'id, owner_teacher_id AS ownerTeacherId, title, prompt, duration_seconds AS durationSeconds, archived_at AS archivedAt, created_at AS createdAt, updated_at AS updatedAt';
const promptDeckFields = 'id, owner_teacher_id AS ownerTeacherId, title, prompts, archived_at AS archivedAt, created_at AS createdAt, updated_at AS updatedAt';

export function groupContext(db: Database.Database, teacherId: string, groupId: string) {
  return db.prepare(`SELECT g.id, g.name, g.academic_year_id AS academicYearId, y.archived_at AS yearArchivedAt
    FROM groups g JOIN academic_years y ON y.id = g.academic_year_id
    WHERE g.id = ? AND g.owner_teacher_id = ?`).get(groupId, teacherId) as GroupContext | undefined;
}

export function listEvents(db: Database.Database, teacherId: string, groupId: string) {
  return db.prepare(`SELECT ${eventFields} FROM classroom_events
    WHERE owner_teacher_id = ? AND group_id = ? AND archived_at IS NULL
    ORDER BY CASE status WHEN 'ACTIVE' THEN 0 WHEN 'DRAFT' THEN 1 ELSE 2 END, updated_at DESC, id`).all(teacherId, groupId) as EventRecord[];
}

export function findEvent(db: Database.Database, teacherId: string, eventId: string) {
  return db.prepare(`SELECT ${eventFields} FROM classroom_events WHERE id = ? AND owner_teacher_id = ?`).get(eventId, teacherId) as EventRecord | undefined;
}

export function findEventByRequest(db: Database.Database, teacherId: string, requestId: string) {
  return db.prepare(`SELECT ${eventFields} FROM classroom_events WHERE owner_teacher_id = ? AND client_request_id = ?`).get(teacherId, requestId) as EventRecord | undefined;
}

export function fingerprint(value: unknown) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

export function insertEvent(db: Database.Database, value: EventRecord) {
  db.prepare(`INSERT INTO classroom_events (id, owner_teacher_id, group_id, title, description, status, show_on_projection, theme, created_at, updated_at, activated_at, completed_at, archived_at, client_request_id, request_fingerprint)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(value.id, value.ownerTeacherId, value.groupId, value.title, value.description, value.status, value.showOnProjection, value.theme, value.createdAt, value.updatedAt, value.activatedAt, value.completedAt, value.archivedAt, value.clientRequestId, value.requestFingerprint);
  return value;
}

export function updateEvent(db: Database.Database, eventId: string, value: Partial<Pick<EventRecord, 'title' | 'description' | 'showOnProjection' | 'theme' | 'status' | 'updatedAt' | 'activatedAt' | 'completedAt' | 'archivedAt'>>) {
  const assignments: string[] = [];
  const values: unknown[] = [];
  const columns: Array<[keyof typeof value, string]> = [['title', 'title'], ['description', 'description'], ['showOnProjection', 'show_on_projection'], ['theme', 'theme'], ['status', 'status'], ['updatedAt', 'updated_at'], ['activatedAt', 'activated_at'], ['completedAt', 'completed_at'], ['archivedAt', 'archived_at']];
  for (const [key, column] of columns) if (value[key] !== undefined) { assignments.push(`${column} = ?`); values.push(value[key]); }
  if (assignments.length) db.prepare(`UPDATE classroom_events SET ${assignments.join(', ')} WHERE id = ?`).run(...values, eventId);
}

export function listChallenges(db: Database.Database, teacherId: string, groupId: string) {
  return db.prepare(`SELECT ${challengeFields} FROM classroom_challenges
    WHERE owner_teacher_id = ? AND group_id = ? AND archived_at IS NULL
    ORDER BY CASE status WHEN 'ACTIVE' THEN 0 WHEN 'PAUSED' THEN 1 WHEN 'DRAFT' THEN 2 ELSE 3 END, updated_at DESC, id`).all(teacherId, groupId) as ChallengeRecord[];
}

export function findChallenge(db: Database.Database, teacherId: string, challengeId: string) {
  return db.prepare(`SELECT ${challengeFields} FROM classroom_challenges WHERE id = ? AND owner_teacher_id = ?`).get(challengeId, teacherId) as ChallengeRecord | undefined;
}

export function insertChallenge(db: Database.Database, value: ChallengeRecord) {
  db.prepare(`INSERT INTO classroom_challenges (id, owner_teacher_id, group_id, title, description, target, progress, status, show_on_projection, created_at, updated_at, activated_at, completed_at, archived_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(value.id, value.ownerTeacherId, value.groupId, value.title, value.description, value.target, value.progress, value.status, value.showOnProjection, value.createdAt, value.updatedAt, value.activatedAt, value.completedAt, value.archivedAt);
  return value;
}

export function updateChallenge(db: Database.Database, challengeId: string, value: Partial<Pick<ChallengeRecord, 'title' | 'description' | 'target' | 'progress' | 'showOnProjection' | 'status' | 'updatedAt' | 'activatedAt' | 'completedAt' | 'archivedAt'>>) {
  const assignments: string[] = [];
  const values: unknown[] = [];
  const columns: Array<[keyof typeof value, string]> = [['title', 'title'], ['description', 'description'], ['target', 'target'], ['progress', 'progress'], ['showOnProjection', 'show_on_projection'], ['status', 'status'], ['updatedAt', 'updated_at'], ['activatedAt', 'activated_at'], ['completedAt', 'completed_at'], ['archivedAt', 'archived_at']];
  for (const [key, column] of columns) if (value[key] !== undefined) { assignments.push(`${column} = ?`); values.push(value[key]); }
  if (assignments.length) db.prepare(`UPDATE classroom_challenges SET ${assignments.join(', ')} WHERE id = ?`).run(...values, challengeId);
}

export function adjustChallengeAtomically(db: Database.Database, challengeId: string, delta: -1 | 1, completedAt: string, updatedAt: string) {
  const nextProgress = 'MIN(target, MAX(0, progress + ?))';
  return db.prepare(`UPDATE classroom_challenges SET
      progress = ${nextProgress},
      status = CASE
        WHEN ${nextProgress} >= target THEN 'COMPLETED'
        WHEN status = 'COMPLETED' AND ? < 0 THEN 'ACTIVE'
        ELSE status
      END,
      completed_at = CASE
        WHEN ${nextProgress} >= target THEN COALESCE(completed_at, ?)
        WHEN status = 'COMPLETED' AND ? < 0 THEN NULL
        ELSE completed_at
      END,
      updated_at = ?
    WHERE id = ? AND status IN ('ACTIVE', 'COMPLETED') AND archived_at IS NULL`).run(delta, delta, delta, delta, completedAt, delta, updatedAt, challengeId).changes;
}

export function findActiveMinigame(db: Database.Database, teacherId: string, groupId: string) {
  return db.prepare(`SELECT ${minigameFields} FROM minigame_sessions
    WHERE owner_teacher_id = ? AND group_id = ? AND status IN ('READY', 'RUNNING', 'PAUSED')
    ORDER BY updated_at DESC, id DESC LIMIT 1`).get(teacherId, groupId) as MinigameRecord | undefined;
}

export function findMinigame(db: Database.Database, teacherId: string, minigameId: string) {
  return db.prepare(`SELECT ${minigameFields} FROM minigame_sessions WHERE id = ? AND owner_teacher_id = ?`).get(minigameId, teacherId) as MinigameRecord | undefined;
}

export function insertMinigame(db: Database.Database, value: MinigameRecord) {
  db.prepare(`INSERT INTO minigame_sessions
    (id, owner_teacher_id, group_id, kind, title, prompt, duration_seconds, status, remaining_seconds,
     started_at, paused_at, selected_student_id, draw_order, draw_index, created_at, updated_at,
     team_count, team_assignments, prompt_deck_prompts, prompt_revealed)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(value.id, value.ownerTeacherId, value.groupId, value.kind, value.title, value.prompt, value.durationSeconds, value.status, value.remainingSeconds, value.startedAt, value.pausedAt, value.selectedStudentId, value.drawOrder, value.drawIndex, value.createdAt, value.updatedAt, value.teamCount, value.teamAssignments, value.promptDeckPrompts, value.promptRevealed);
  return value;
}

export function updateMinigame(db: Database.Database, minigameId: string, value: Partial<Pick<MinigameRecord, 'prompt' | 'status' | 'remainingSeconds' | 'startedAt' | 'pausedAt' | 'selectedStudentId' | 'drawOrder' | 'drawIndex' | 'updatedAt' | 'teamCount' | 'teamAssignments' | 'promptDeckPrompts' | 'promptRevealed'>>) {
  const assignments: string[] = [];
  const values: unknown[] = [];
  const columns: Array<[keyof typeof value, string]> = [['prompt', 'prompt'], ['status', 'status'], ['remainingSeconds', 'remaining_seconds'], ['startedAt', 'started_at'], ['pausedAt', 'paused_at'], ['selectedStudentId', 'selected_student_id'], ['drawOrder', 'draw_order'], ['drawIndex', 'draw_index'], ['updatedAt', 'updated_at'], ['teamCount', 'team_count'], ['teamAssignments', 'team_assignments'], ['promptDeckPrompts', 'prompt_deck_prompts'], ['promptRevealed', 'prompt_revealed']];
  for (const [key, column] of columns) if (value[key] !== undefined) { assignments.push(`${column} = ?`); values.push(value[key]); }
  if (assignments.length) db.prepare(`UPDATE minigame_sessions SET ${assignments.join(', ')} WHERE id = ?`).run(...values, minigameId);
}

export function advanceDrawAtomically(db: Database.Database, minigameId: string, expectedIndex: number, selectedStudentId: string, drawOrder: string, nextIndex: number, updatedAt: string) {
  return db.prepare(`UPDATE minigame_sessions SET selected_student_id = ?, draw_order = ?, draw_index = ?, updated_at = ?
    WHERE id = ? AND draw_index = ? AND status IN ('READY', 'RUNNING', 'PAUSED')`).run(selectedStudentId, drawOrder, nextIndex, updatedAt, minigameId, expectedIndex).changes;
}

export function advancePromptAtomically(db: Database.Database, minigameId: string, expectedIndex: number, prompt: string, nextIndex: number, updatedAt: string, promptRevealed = 0) {
  return db.prepare(`UPDATE minigame_sessions SET prompt = ?, draw_index = ?, updated_at = ?, prompt_revealed = ?
    WHERE id = ? AND draw_index = ? AND status IN ('READY', 'RUNNING', 'PAUSED')`).run(prompt, nextIndex, updatedAt, promptRevealed, minigameId, expectedIndex).changes;
}

export function listStudents(db: Database.Database, groupId: string, includeRealName = true) {
  const fields = includeRealName ? 'id, real_name AS realName, alias, avatar, specialty' : 'id, alias, avatar, specialty';
  return db.prepare(`SELECT ${fields} FROM students WHERE group_id = ? AND archived_at IS NULL ORDER BY alias COLLATE NOCASE, id`).all(groupId) as StudentRecord[];
}

export function listSafeStudents(db: Database.Database, groupId: string) {
  return db.prepare('SELECT id, alias, avatar, specialty FROM students WHERE group_id = ? AND archived_at IS NULL ORDER BY alias COLLATE NOCASE, id').all(groupId) as SafeStudentRecord[];
}

export function findSafeStudent(db: Database.Database, groupId: string, studentId: string) {
  return db.prepare('SELECT id, alias, avatar, specialty FROM students WHERE group_id = ? AND id = ? AND archived_at IS NULL').get(groupId, studentId) as SafeStudentRecord | undefined;
}

export function findStudent(db: Database.Database, groupId: string, studentId: string) {
  return db.prepare('SELECT id, real_name AS realName, alias, avatar, specialty FROM students WHERE group_id = ? AND id = ? AND archived_at IS NULL').get(groupId, studentId) as StudentRecord | undefined;
}

export function projectionEvent(db: Database.Database, teacherId: string, groupId: string) {
  return db.prepare(`SELECT id, title, description, theme, status FROM classroom_events
    WHERE owner_teacher_id = ? AND group_id = ? AND status = 'ACTIVE' AND show_on_projection = 1 AND archived_at IS NULL
    ORDER BY updated_at DESC, id DESC LIMIT 1`).get(teacherId, groupId) as Pick<EventRecord, 'id' | 'title' | 'description' | 'theme' | 'status'> | undefined;
}

export function projectionChallenge(db: Database.Database, teacherId: string, groupId: string) {
  return db.prepare(`SELECT id, title, description, target, progress, status FROM classroom_challenges
    WHERE owner_teacher_id = ? AND group_id = ? AND status IN ('ACTIVE', 'COMPLETED') AND show_on_projection = 1 AND archived_at IS NULL
    ORDER BY updated_at DESC, id DESC LIMIT 1`).get(teacherId, groupId) as Pick<ChallengeRecord, 'id' | 'title' | 'description' | 'target' | 'progress' | 'status'> | undefined;
}

export function clearProjectionContent(db: Database.Database, teacherId: string, groupId: string, updatedAt: string) {
  db.prepare(`UPDATE classroom_events SET show_on_projection = 0, updated_at = ?
    WHERE owner_teacher_id = ? AND group_id = ? AND show_on_projection = 1 AND archived_at IS NULL`).run(updatedAt, teacherId, groupId);
  db.prepare(`UPDATE classroom_challenges SET show_on_projection = 0, updated_at = ?
    WHERE owner_teacher_id = ? AND group_id = ? AND show_on_projection = 1 AND archived_at IS NULL`).run(updatedAt, teacherId, groupId);
}

export function listMinigamePresets(db: Database.Database, teacherId: string, includeArchived: boolean) {
  return db.prepare(`SELECT ${presetFields} FROM minigame_presets
    WHERE owner_teacher_id = ? ${includeArchived ? '' : 'AND archived_at IS NULL'}
    ORDER BY updated_at DESC, id`).all(teacherId) as MinigamePresetRecord[];
}

export function findMinigamePreset(db: Database.Database, teacherId: string, presetId: string) {
  return db.prepare(`SELECT ${presetFields} FROM minigame_presets WHERE id = ? AND owner_teacher_id = ?`).get(presetId, teacherId) as MinigamePresetRecord | undefined;
}

export function insertMinigamePreset(db: Database.Database, value: MinigamePresetRecord) {
  db.prepare(`INSERT INTO minigame_presets (id, owner_teacher_id, title, prompt, duration_seconds, archived_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(value.id, value.ownerTeacherId, value.title, value.prompt, value.durationSeconds, value.archivedAt, value.createdAt, value.updatedAt);
  return value;
}

export function updateMinigamePreset(db: Database.Database, presetId: string, value: Pick<MinigamePresetRecord, 'title' | 'prompt' | 'durationSeconds' | 'updatedAt' | 'archivedAt'>) {
  db.prepare(`UPDATE minigame_presets SET title = ?, prompt = ?, duration_seconds = ?, updated_at = ?, archived_at = ? WHERE id = ?`).run(value.title, value.prompt, value.durationSeconds, value.updatedAt, value.archivedAt, presetId);
}

export function listPromptDecks(db: Database.Database, teacherId: string, includeArchived: boolean) {
  return db.prepare(`SELECT ${promptDeckFields} FROM prompt_decks
    WHERE owner_teacher_id = ? ${includeArchived ? '' : 'AND archived_at IS NULL'}
    ORDER BY updated_at DESC, id`).all(teacherId) as PromptDeckRecord[];
}

export function findPromptDeck(db: Database.Database, teacherId: string, deckId: string) {
  return db.prepare(`SELECT ${promptDeckFields} FROM prompt_decks WHERE id = ? AND owner_teacher_id = ?`).get(deckId, teacherId) as PromptDeckRecord | undefined;
}

export function insertPromptDeck(db: Database.Database, value: PromptDeckRecord) {
  db.prepare(`INSERT INTO prompt_decks (id, owner_teacher_id, title, prompts, archived_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)`).run(value.id, value.ownerTeacherId, value.title, value.prompts, value.archivedAt, value.createdAt, value.updatedAt);
  return value;
}

export function updatePromptDeck(db: Database.Database, deckId: string, value: Pick<PromptDeckRecord, 'title' | 'prompts' | 'updatedAt' | 'archivedAt'>) {
  db.prepare(`UPDATE prompt_decks SET title = ?, prompts = ?, updated_at = ?, archived_at = ? WHERE id = ?`).run(value.title, value.prompts, value.updatedAt, value.archivedAt, deckId);
}
