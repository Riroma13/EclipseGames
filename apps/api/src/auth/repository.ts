import type Database from 'better-sqlite3';

export type TeacherRecord = { id: string; email: string; passwordHash: string };
export type SessionRecord = { id: string; teacherId: string; expiresAt: string; revokedAt: string | null };

export function findTeacherByEmail(database: Database.Database, email: string): TeacherRecord | undefined {
  const row = database.prepare('SELECT id, email, password_hash AS passwordHash FROM teacher_accounts WHERE email = ?').get(email) as TeacherRecord | undefined;
  return row;
}

export function createTeacher(database: Database.Database, teacher: TeacherRecord) {
  database.prepare('INSERT INTO teacher_accounts (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)').run(teacher.id, teacher.email, teacher.passwordHash, new Date().toISOString());
  return teacher;
}

export function createSession(database: Database.Database, session: { id: string; teacherId: string; tokenHash: string; expiresAt: string }) {
  database.prepare('INSERT INTO sessions (id, teacher_id, token_hash, expires_at) VALUES (?, ?, ?, ?)').run(session.id, session.teacherId, session.tokenHash, session.expiresAt);
}

export function findSession(database: Database.Database, tokenHash: string): SessionRecord | undefined {
  return database.prepare('SELECT id, teacher_id AS teacherId, expires_at AS expiresAt, revoked_at AS revokedAt FROM sessions WHERE token_hash = ?').get(tokenHash) as SessionRecord | undefined;
}

export function revokeSession(database: Database.Database, tokenHash: string) {
  database.prepare('UPDATE sessions SET revoked_at = ? WHERE token_hash = ? AND revoked_at IS NULL').run(new Date().toISOString(), tokenHash);
}
