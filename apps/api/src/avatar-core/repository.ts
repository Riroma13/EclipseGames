import type Database from 'better-sqlite3';
import type { AvatarProfile } from '@eclipse/contracts';

export type AvatarVersion = AvatarProfile & {
  studentId: string;
  revision: number;
  operation: 'BACKFILL' | 'CREATE' | 'UPDATE' | 'REVERT';
  revertedFromRevision: number | null;
  reason: string | null;
  actorTeacherId: string | null;
  createdAt: string;
};

export type AvatarOwner = {
  studentId: string;
  alias: string;
  specialty: string | null;
  academicYearId: string;
  ownerTeacherId: string;
  studentArchivedAt: string | null;
  yearArchivedAt: string | null;
  currentRevision: number;
  updatedAt: string;
};

const versionFields = `profile_student_id AS studentId, revision, face_id AS faceId,
  skin_tone_id AS skinToneId, hair_id AS hairId, feature_id AS featureId,
  clothing_id AS clothingId, accessory_id AS accessoryId, frame_id AS frameId,
  background_id AS backgroundId, operation, reverted_from_revision AS revertedFromRevision,
  reason, actor_teacher_id AS actorTeacherId, created_at AS createdAt`;

export function findOwner(db: Database.Database, studentId: string, ownerTeacherId: string, academicYearId?: string) {
  return db.prepare(`SELECT s.id AS studentId, s.alias, s.specialty,
    y.id AS academicYearId,
    y.owner_teacher_id AS ownerTeacherId, s.archived_at AS studentArchivedAt,
    y.archived_at AS yearArchivedAt, p.current_revision AS currentRevision,
    p.updated_at AS updatedAt
    FROM students s JOIN groups g ON g.id=s.group_id
    JOIN academic_years y ON y.id=g.academic_year_id
    JOIN avatar_profiles p ON p.student_id=s.id
    WHERE s.id=? AND g.owner_teacher_id=? AND y.owner_teacher_id=?
      ${academicYearId ? 'AND y.id=?' : ''}`)
    .get(...(academicYearId ? [studentId, ownerTeacherId, ownerTeacherId, academicYearId] : [studentId, ownerTeacherId, ownerTeacherId])) as AvatarOwner | undefined;
}

export function findVersion(db: Database.Database, studentId: string, revision: number) {
  return db.prepare(`SELECT ${versionFields} FROM avatar_profile_versions WHERE profile_student_id=? AND revision=?`).get(studentId, revision) as AvatarVersion | undefined;
}

export function findCurrent(db: Database.Database, owner: AvatarOwner) {
  return findVersion(db, owner.studentId, owner.currentRevision);
}

export function listVersions(db: Database.Database, studentId: string) {
  return db.prepare(`SELECT ${versionFields} FROM avatar_profile_versions WHERE profile_student_id=? ORDER BY revision DESC`).all(studentId) as AvatarVersion[];
}

export function appendVersion(db: Database.Database, input: { studentId: string; revision: number; profile: AvatarProfile; operation: AvatarVersion['operation']; revertedFromRevision?: number | null; reason?: string | null; actorTeacherId: string; createdAt: string }) {
  db.prepare(`INSERT INTO avatar_profile_versions
    (profile_student_id,revision,face_id,skin_tone_id,hair_id,feature_id,clothing_id,accessory_id,frame_id,background_id,operation,reverted_from_revision,reason,actor_teacher_id,created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    input.studentId, input.revision, input.profile.faceId, input.profile.skinToneId,
    input.profile.hairId, input.profile.featureId, input.profile.clothingId,
    input.profile.accessoryId, input.profile.frameId, input.profile.backgroundId,
    input.operation, input.revertedFromRevision ?? null, input.reason ?? null,
    input.actorTeacherId, input.createdAt,
  );
}

export function advanceHead(db: Database.Database, studentId: string, expectedRevision: number, revision: number, updatedAt: string) {
  return db.prepare('UPDATE avatar_profiles SET current_revision=?, updated_at=? WHERE student_id=? AND current_revision=?').run(revision, updatedAt, studentId, expectedRevision).changes === 1;
}
