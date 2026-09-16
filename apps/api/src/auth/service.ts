import argon2 from 'argon2';
import { createHash, randomUUID, randomBytes } from 'node:crypto';
import type Database from 'better-sqlite3';
import { createSession, createTeacher, findSession, findSessionById, findTeacherByEmail, revokeSession, type TeacherRecord } from './repository.js';

const PRODUCTION_SESSION_COOKIE = '__Host-session';
const NON_PRODUCTION_SESSION_COOKIE = 'eclipse-session';
const SESSION_TTL_SECONDS = 60 * 60 * 8;

export function sessionCookieName() {
  return process.env.NODE_ENV === 'production' ? PRODUCTION_SESSION_COOKIE : NON_PRODUCTION_SESSION_COOKIE;
}

export function sessionCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    ...(process.env.NODE_ENV === 'production' ? { secure: true } : {}),
    sameSite: 'strict' as const,
    path: '/',
    maxAge,
  };
}

function tokenHash(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export async function bootstrapTeacher(database: Database.Database, email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const existing = findTeacherByEmail(database, normalizedEmail);
  if (existing) return existing;
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  return createTeacher(database, { id: randomUUID(), email: normalizedEmail, passwordHash });
}

export async function authenticate(database: Database.Database, email: string, password: string) {
  const teacher = findTeacherByEmail(database, email.trim().toLowerCase());
  if (!teacher || !(await argon2.verify(teacher.passwordHash, password))) return undefined;
  return teacher;
}

export function issueSession(database: Database.Database, teacher: TeacherRecord) {
  const token = randomBytes(32).toString('base64url');
  createSession(database, {
    id: randomUUID(),
    teacherId: teacher.id,
    tokenHash: tokenHash(token),
    expiresAt: new Date(Date.now() + SESSION_TTL_SECONDS * 1000).toISOString(),
  });
  return { token, maxAge: SESSION_TTL_SECONDS };
}

export function authenticateSession(database: Database.Database, token: string | undefined) {
  if (!token) return undefined;
  const session = findSession(database, tokenHash(token));
  if (!session || session.revokedAt || Date.parse(session.expiresAt) <= Date.now()) return undefined;
  return session;
}

export function authenticateSessionById(database: Database.Database, sessionId: string, teacherId: string) {
  const session = findSessionById(database, sessionId);
  if (!session || session.teacherId !== teacherId || session.revokedAt || Date.parse(session.expiresAt) <= Date.now()) return undefined;
  return session;
}

export function revoke(database: Database.Database, token: string | undefined) {
  if (token) revokeSession(database, tokenHash(token));
}
