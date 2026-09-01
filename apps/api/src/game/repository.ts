import type Database from 'better-sqlite3';

export type EventStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED';
export type ChallengeStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED';
export type MinigameKind = 'RANDOM_DRAW' | 'FRENCH_SPRINT';
export type MinigameStatus = 'READY' | 'RUNNING' | 'PAUSED' | 'ENDED';

export type GroupContext = { id: string; name: string; academicYearId: string; yearArchivedAt: string | null };
export type EventRecord = { id: string; ownerTeacherId: string; groupId: string; title: string; description: string; status: EventStatus; showOnProjection: number; theme: string; createdAt: string; updatedAt: string; activatedAt: string | null; completedAt: string | null; archivedAt: string | null };
export type ChallengeRecord = { id: string; ownerTeacherId: string; groupId: string; title: string; description: string; target: number; progress: number; status: ChallengeStatus; showOnProjection: number; createdAt: string; updatedAt: string; activatedAt: string | null; completedAt: string | null; archivedAt: string | null };
export type MinigameRecord = { id: string; ownerTeacherId: string; groupId: string; kind: MinigameKind; title: string; prompt: string; durationSeconds: number; status: MinigameStatus; remainingSeconds: number; startedAt: string | null; pausedAt: string | null; selectedStudentId: string | null; drawOrder: string; drawIndex: number; createdAt: string; updatedAt: string };
export type StudentRecord = { id: string; realName: string; alias: string; avatar: string; specialty: string | null };
export type SafeStudentRecord = { id: string; alias: string; avatar: string; specialty: string | null };

const eventFields = 'id, owner_teacher_id AS ownerTeacherId, group_id AS groupId, title, description, status, show_on_projection AS showOnProjection, theme, created_at AS createdAt, updated_at AS updatedAt, activated_at AS activatedAt, completed_at AS completedAt, archived_at AS archivedAt';
const challengeFields = 'id, owner_teacher_id AS ownerTeacherId, group_id AS groupId, title, description, target, progress, status, show_on_projection AS showOnProjection, created_at AS createdAt, updated_at AS updatedAt, activated_at AS activatedAt, completed_at AS completedAt, archived_at AS archivedAt';
const minigameFields = 'id, owner_teacher_id AS ownerTeacherId, group_id AS groupId, kind, title, prompt, duration_seconds AS durationSeconds, status, remaining_seconds AS remainingSeconds, started_at AS startedAt, paused_at AS pausedAt, selected_student_id AS selectedStudentId, draw_order AS drawOrder, draw_index AS drawIndex, created_at AS createdAt, updated_at AS updatedAt';

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

export function insertEvent(db: Database.Database, value: EventRecord) {
  db.prepare(`INSERT INTO classroom_events (id, owner_teacher_id, group_id, title, description, status, show_on_projection, theme, created_at, updated_at, activated_at, completed_at, archived_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(value.id, value.ownerTeacherId, value.groupId, value.title, value.description, value.status, value.showOnProjection, value.theme, value.createdAt, value.updatedAt, value.activatedAt, value.completedAt, value.archivedAt);
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
    ORDER BY CASE status WHEN 'ACTIVE' THEN 0 WHEN 'DRAFT' THEN 1 ELSE 2 END, updated_at DESC, id`).all(teacherId, groupId) as ChallengeRecord[];
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

export function findActiveMinigame(db: Database.Database, teacherId: string, groupId: string) {
  return db.prepare(`SELECT ${minigameFields} FROM minigame_sessions
    WHERE owner_teacher_id = ? AND group_id = ? AND status IN ('READY', 'RUNNING', 'PAUSED')
    ORDER BY updated_at DESC, id DESC LIMIT 1`).get(teacherId, groupId) as MinigameRecord | undefined;
}

export function findMinigame(db: Database.Database, teacherId: string, minigameId: string) {
  return db.prepare(`SELECT ${minigameFields} FROM minigame_sessions WHERE id = ? AND owner_teacher_id = ?`).get(minigameId, teacherId) as MinigameRecord | undefined;
}

export function insertMinigame(db: Database.Database, value: MinigameRecord) {
  db.prepare(`INSERT INTO minigame_sessions (id, owner_teacher_id, group_id, kind, title, prompt, duration_seconds, status, remaining_seconds, started_at, paused_at, selected_student_id, draw_order, draw_index, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(value.id, value.ownerTeacherId, value.groupId, value.kind, value.title, value.prompt, value.durationSeconds, value.status, value.remainingSeconds, value.startedAt, value.pausedAt, value.selectedStudentId, value.drawOrder, value.drawIndex, value.createdAt, value.updatedAt);
  return value;
}

export function updateMinigame(db: Database.Database, minigameId: string, value: Partial<Pick<MinigameRecord, 'status' | 'remainingSeconds' | 'startedAt' | 'pausedAt' | 'selectedStudentId' | 'drawOrder' | 'drawIndex' | 'updatedAt'>>) {
  const assignments: string[] = [];
  const values: unknown[] = [];
  const columns: Array<[keyof typeof value, string]> = [['status', 'status'], ['remainingSeconds', 'remaining_seconds'], ['startedAt', 'started_at'], ['pausedAt', 'paused_at'], ['selectedStudentId', 'selected_student_id'], ['drawOrder', 'draw_order'], ['drawIndex', 'draw_index'], ['updatedAt', 'updated_at']];
  for (const [key, column] of columns) if (value[key] !== undefined) { assignments.push(`${column} = ?`); values.push(value[key]); }
  if (assignments.length) db.prepare(`UPDATE minigame_sessions SET ${assignments.join(', ')} WHERE id = ?`).run(...values, minigameId);
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
  return db.prepare(`SELECT title, description, theme, status FROM classroom_events
    WHERE owner_teacher_id = ? AND group_id = ? AND status = 'ACTIVE' AND show_on_projection = 1 AND archived_at IS NULL
    ORDER BY updated_at DESC, id DESC LIMIT 1`).get(teacherId, groupId) as Pick<EventRecord, 'title' | 'description' | 'theme' | 'status'> | undefined;
}

export function projectionChallenge(db: Database.Database, teacherId: string, groupId: string) {
  return db.prepare(`SELECT title, description, target, progress, status FROM classroom_challenges
    WHERE owner_teacher_id = ? AND group_id = ? AND status IN ('ACTIVE', 'COMPLETED') AND show_on_projection = 1 AND archived_at IS NULL
    ORDER BY updated_at DESC, id DESC LIMIT 1`).get(teacherId, groupId) as Pick<ChallengeRecord, 'title' | 'description' | 'target' | 'progress' | 'status'> | undefined;
}
