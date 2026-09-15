import { createHash, randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import { avatarProfileSchema, type AvatarProfile } from '@eclipse/contracts';
import { ApiError } from '../http/errors.js';
import { availability } from './domain.js';
import * as repository from './repository.js';

const uuidV4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const stamp = () => new Date().toISOString();
function fail(code: 'NOT_FOUND' | 'CONFLICT' | 'VALIDATION_FAILED', status: number, message: string): never { throw new ApiError(code, status, message); }
const fingerprint = (operation: string, studentId: string, body: unknown) => createHash('sha256').update(JSON.stringify({ operation, studentId, body })).digest('hex');

export type AvatarMutation = {
  ownerTeacherId: string;
  studentId: string;
  academicYearId: string;
  expectedRevision: number;
  idempotencyKey: string;
  profile?: unknown;
  targetRevision?: number;
  reason?: string;
};

async function validatedProfile(value: unknown, studentId: string): Promise<AvatarProfile> {
  const parsed = avatarProfileSchema.safeParse(value);
  if (!parsed.success) fail('VALIDATION_FAILED', 422, 'Avatar profile contains an invalid catalogue item.');
  const profile: AvatarProfile = parsed.data;
  const fields: string[] = [profile.faceId, profile.skinToneId, profile.hairId, profile.featureId, profile.clothingId, profile.accessoryId, profile.frameId, profile.backgroundId];
  for (const id of fields) {
    if (!(await availability.allows(studentId, id))) fail('VALIDATION_FAILED', 422, 'Avatar profile contains an invalid catalogue item.');
  }
  return profile;
}

function key(key: string) { if (!uuidV4.test(key)) fail('VALIDATION_FAILED', 422, 'Idempotency-Key must be a UUID-v4.'); }
function ownerOr404(db: Database.Database, input: AvatarMutation) {
  const owner = repository.findOwner(db, input.studentId, input.ownerTeacherId, input.academicYearId);
  if (!owner) fail('NOT_FOUND', 404, 'Avatar resource not found.');
  return owner as repository.AvatarOwner;
}
function writable(owner: repository.AvatarOwner) {
  if (owner.studentArchivedAt || owner.yearArchivedAt) fail('CONFLICT', 409, 'Archived avatars are read-only.');
}
function result(db: Database.Database, owner: repository.AvatarOwner, revision: number, replay = false) {
  const version = repository.findVersion(db, owner.studentId, revision);
  if (!version) throw new Error('Avatar revision is missing.');
  const validatedVersion = version;
  const profile: AvatarProfile = { faceId: validatedVersion.faceId, skinToneId: validatedVersion.skinToneId, hairId: validatedVersion.hairId, featureId: validatedVersion.featureId, clothingId: validatedVersion.clothingId, accessoryId: validatedVersion.accessoryId, frameId: validatedVersion.frameId, backgroundId: validatedVersion.backgroundId };
  return { studentId: owner.studentId, alias: owner.alias, specialty: owner.specialty, academicYearId: owner.academicYearId, revision, profile, updatedAt: revision === owner.currentRevision ? owner.updatedAt : validatedVersion.createdAt, editable: !owner.studentArchivedAt && !owner.yearArchivedAt, replay };
}

function existingRequest(db: Database.Database, input: AvatarMutation, operation: string, body: unknown) {
  key(input.idempotencyKey);
  const found = db.prepare('SELECT * FROM avatar_profile_requests WHERE owner_teacher_id=? AND idempotency_key=?').get(input.ownerTeacherId, input.idempotencyKey) as { operation: string; fingerprint: string; student_id: string; resulting_revision: number | null } | undefined;
  if (!found) return undefined;
  if (found.operation !== operation || found.fingerprint !== fingerprint(operation, input.studentId, body)) fail('CONFLICT', 409, 'Idempotency key was already used for another request.');
  const owner = repository.findOwner(db, input.studentId, input.ownerTeacherId, input.academicYearId);
  if (!owner || found.resulting_revision === null) fail('NOT_FOUND', 404, 'Avatar resource not found.');
  return result(db, owner, found.resulting_revision, true);
}

function mutate(input: AvatarMutation, operation: 'CREATE' | 'UPDATE' | 'REVERT', body: unknown, work: (db: Database.Database, owner: repository.AvatarOwner) => { profile: AvatarProfile; revertedFromRevision?: number | null; reason?: string | null }) {
  key(input.idempotencyKey);
  return (db: Database.Database) => db.transaction(() => {
    const replay = existingRequest(db, input, operation, body); if (replay) return replay;
    const owner = ownerOr404(db, input); writable(owner);
    if (owner.currentRevision !== input.expectedRevision) fail('CONFLICT', 409, 'Avatar revision is stale.');
    const change = work(db, owner);
    const revision = owner.currentRevision + 1;
    const now = stamp();
    repository.appendVersion(db, { studentId: owner.studentId, revision, profile: change.profile, operation, revertedFromRevision: change.revertedFromRevision, reason: change.reason, actorTeacherId: input.ownerTeacherId, createdAt: now });
    if (!repository.advanceHead(db, owner.studentId, owner.currentRevision, revision, now)) fail('CONFLICT', 409, 'Avatar revision is stale.');
    db.prepare(`INSERT INTO avatar_profile_requests (owner_teacher_id,idempotency_key,operation,fingerprint,student_id,resulting_revision,created_at) VALUES (?,?,?,?,?,?,?)`).run(input.ownerTeacherId, input.idempotencyKey, operation, fingerprint(operation, input.studentId, body), input.studentId, revision, now);
    return result(db, { ...owner, currentRevision: revision, updatedAt: now }, revision);
  }).immediate();
}

export function getAvatar(db: Database.Database, ownerTeacherId: string, studentId: string, academicYearId: string) {
  const owner = repository.findOwner(db, studentId, ownerTeacherId, academicYearId); if (!owner) fail('NOT_FOUND', 404, 'Avatar resource not found.');
  const verifiedOwner = owner as repository.AvatarOwner;
  const version = repository.findCurrent(db, verifiedOwner); if (!version) throw new Error('Avatar profile invariant is missing.');
  return result(db, verifiedOwner, verifiedOwner.currentRevision);
}

export function getHistory(db: Database.Database, ownerTeacherId: string, studentId: string, academicYearId?: string) {
  const owner = repository.findOwner(db, studentId, ownerTeacherId, academicYearId); if (!owner) fail('NOT_FOUND', 404, 'Avatar resource not found.');
  return repository.listVersions(db, studentId);
}

export async function updateAvatar(db: Database.Database, input: AvatarMutation) {
  const profile = await validatedProfile(input.profile, input.studentId);
  return mutate(input, 'UPDATE', { expectedRevision: input.expectedRevision, profile }, () => ({ profile }))(db);
}

export function revertAvatar(db: Database.Database, input: AvatarMutation) {
  const targetRevision = input.targetRevision;
  const reasonInput = input.reason;
  if (typeof targetRevision !== 'number' || !Number.isInteger(targetRevision) || targetRevision < 1 || typeof reasonInput !== 'string' || !reasonInput.trim() || reasonInput.trim().length > 500) fail('VALIDATION_FAILED', 422, 'A valid revert reason and target revision are required.');
  const reason = reasonInput.trim();
  return mutate(input, 'REVERT', { expectedRevision: input.expectedRevision, targetRevision, reason }, (database) => {
    const foundTarget = repository.findVersion(database, input.studentId, targetRevision); if (!foundTarget) fail('NOT_FOUND', 404, 'Avatar revision not found.');
    const target = foundTarget;
    const profile: AvatarProfile = { faceId: target.faceId, skinToneId: target.skinToneId, hairId: target.hairId, featureId: target.featureId, clothingId: target.clothingId, accessoryId: target.accessoryId, frameId: target.frameId, backgroundId: target.backgroundId };
    return { profile, revertedFromRevision: targetRevision, reason };
  })(db);
}

export async function createAvatar(db: Database.Database, input: AvatarMutation) {
  const profile = await validatedProfile(input.profile, input.studentId);
  return mutate(input, 'CREATE', { expectedRevision: input.expectedRevision, profile }, () => ({ profile }))(db);
}
export { randomUUID };
