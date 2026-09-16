import { xpCategorySchema, type ClassroomBehaviourState, type ClassroomStudentDto, type RestrictedAvatarDto } from '@eclipse/contracts';
import type Database from 'better-sqlite3';
import { levelForXp, progressForXp } from '@eclipse/domain';
import { replayRt } from '../rt/domain.js';
import { derivePolicy } from '../behaviour/domain.js';
import * as xpRepository from '../xp/repository.js';
import * as gemRepository from '../gems/repository.js';
import { specialtyCategoryFor } from '../avatar-core/domain.js';
import { toRestrictedAvatarDto, deriveAvatarXp } from '../avatar-core/contracts.js';
import { toClassroomStudentDto } from './classroom-mapper.js';

export type ClassroomRosterStudent = { studentId: string };
export type ClassroomXpSummary = Pick<RestrictedAvatarDto, 'studentId'|'level'|'progress'|'badges'>;
export type ClassroomEnergy = { studentId: string; energy: 'CRITICAL'|'LOW'|'STABLE'|'HIGH'|'MAXIMUM'|null };
export type ClassroomBehaviour = { studentId: string; state: ClassroomBehaviourState };
export type ClassroomGems = { studentId: string; balances: { EMERALD:number; RUBY:number; DIAMOND:number } };

export type ClassroomCompositionInput = { groupId: string; academicYearId: string };
export type ClassroomCompositionPorts = {
  roster: { listActive(input: ClassroomCompositionInput): ClassroomRosterStudent[]|Promise<ClassroomRosterStudent[]> };
  avatar: { listRestricted(input: ClassroomCompositionInput, studentIds: readonly string[]): RestrictedAvatarDto[]|Promise<RestrictedAvatarDto[]> };
  xp: { listAnnual(input: ClassroomCompositionInput, studentIds: readonly string[]): ClassroomXpSummary[]|Promise<ClassroomXpSummary[]> };
  gems: { listBalances(input: ClassroomCompositionInput, studentIds: readonly string[]): ClassroomGems[]|Promise<ClassroomGems[]> };
  energy?: { listCurrent(input: ClassroomCompositionInput, studentIds: readonly string[]): ClassroomEnergy[]|Promise<ClassroomEnergy[]> };
  behaviour?: { listCurrent(input: ClassroomCompositionInput, studentIds: readonly string[]): ClassroomBehaviour[]|Promise<ClassroomBehaviour[]> };
};

const required = async <T>(value: T|Promise<T>): Promise<T> => value;

/** Compose the safe classroom payload with one batch call per owner port. */
export async function composeClassroomCards(input: ClassroomCompositionInput, ports: ClassroomCompositionPorts): Promise<ClassroomStudentDto[]> {
  const roster = await required(ports.roster.listActive(input));
  const studentIds = roster.map(student => student.studentId);
  const [avatars, xp, gems] = await Promise.all([
    required(ports.avatar.listRestricted(input, studentIds)),
    required(ports.xp.listAnnual(input, studentIds)),
    required(ports.gems.listBalances(input, studentIds)),
  ]);
  const energy = ports.energy ? await Promise.resolve(ports.energy.listCurrent(input, studentIds)).catch(() => [] as ClassroomEnergy[]) : [];
  const behaviour = ports.behaviour ? await Promise.resolve(ports.behaviour.listCurrent(input, studentIds)).catch(() => [] as ClassroomBehaviour[]) : [];
  const byId = <T extends { studentId:string }>(rows: readonly T[]) => new Map(rows.map(row => [row.studentId, row]));
  const avatarById = byId(avatars); const xpById = byId(xp); const gemsById = byId(gems);
  const energyById = byId(energy); const behaviourById = byId(behaviour);
  return roster.map(({ studentId }) => {
    const avatar = avatarById.get(studentId); const summary = xpById.get(studentId); const balance = gemsById.get(studentId);
    if (!avatar || !summary || !balance) throw new Error(`Required classroom data missing for student ${studentId}.`);
    const restrictedAvatar: RestrictedAvatarDto = { ...avatar, level: summary.level, progress: summary.progress, badges: summary.badges };
    return toClassroomStudentDto(restrictedAvatar, energyById.get(studentId)?.energy ?? null, balance.balances);
  });
}

export const composeClassroom = composeClassroomCards;

/** Bind the canonical owner read models to the composer; this is the only DB adapter. */
export function createClassroomCompositionPorts(db: Database.Database, ownerTeacherId: string): ClassroomCompositionPorts {
  return {
    roster: { listActive: ({ groupId, academicYearId }) => db.prepare(`
      SELECT s.id AS studentId FROM students s JOIN groups g ON g.id=s.group_id
      WHERE s.group_id=? AND g.academic_year_id=? AND s.archived_at IS NULL
      ORDER BY s.alias COLLATE NOCASE,s.id`).all(groupId, academicYearId) as ClassroomRosterStudent[] },
    avatar: { listRestricted: ({ groupId, academicYearId }, studentIds) => {
      if (!studentIds.length) return [];
      const placeholders = studentIds.map(() => '?').join(',');
      const rows = db.prepare(`SELECT s.id AS studentId,s.alias,s.specialty,y.id AS academicYearId,
        p.current_revision AS currentRevision,p.updated_at AS updatedAt,
        pv.face_id AS faceId,pv.skin_tone_id AS skinToneId,pv.hair_id AS hairId,
        pv.feature_id AS featureId,pv.clothing_id AS clothingId,pv.accessory_id AS accessoryId,
        pv.frame_id AS frameId,pv.background_id AS backgroundId
        FROM students s JOIN groups g ON g.id=s.group_id JOIN academic_years y ON y.id=g.academic_year_id
        JOIN avatar_profiles p ON p.student_id=s.id
        JOIN avatar_profile_versions pv ON pv.profile_student_id=p.student_id AND pv.revision=p.current_revision
        WHERE s.group_id=? AND y.id=? AND g.owner_teacher_id=? AND s.archived_at IS NULL
          AND s.id IN (${placeholders})`).all(groupId, academicYearId, ownerTeacherId, ...studentIds) as Array<Record<string, any>>;
      return rows.map(row => toRestrictedAvatarDto(toTeacherAvatar(row, deriveAvatarXp(0, []))));
    } },
    xp: { listAnnual: ({ groupId, academicYearId }, studentIds) => {
      const wanted = new Set(studentIds);
      return xpRepository.groupSummaryRows(db, groupId, academicYearId)
        .filter(row => wanted.has(row.studentId)).map(row => {
          const total = Number(row.annualEffectiveXp);
           return { studentId: row.studentId, level: levelForXp(total), progress: progressForXp(total), badges: row.badges ? row.badges.split(';;').map(value => { const [category, label, unlockedAt] = value.split('|'); return { category: xpCategorySchema.parse(category), label, unlockedAt }; }) : [] };
        });
    } },
    gems: { listBalances: ({ academicYearId }, studentIds) => [...gemRepository.groupBalances(db, studentIds, academicYearId)].map(([studentId, balances]) => ({ studentId, balances })) },
    energy: { listCurrent: ({ groupId, academicYearId }, studentIds) => {
      const active = db.prepare('SELECT id FROM real_class_sessions WHERE owner_teacher_id=? AND academic_year_id=? AND group_id=? AND ended_at IS NULL').get(ownerTeacherId, academicYearId, groupId) as { id:string }|undefined;
      if (!active) return [];
      const rows = db.prepare(`SELECT student_id AS studentId,value FROM rt_entries WHERE session_id=? AND student_id IN (${studentIds.map(() => '?').join(',')})`).all(active.id, ...studentIds) as Array<{ studentId:string; value:string|number }>;
      const values = new Map<string, any[]>(); for (const row of rows) values.set(row.studentId, [...(values.get(row.studentId) ?? []), row.value === 'ABSENT' ? 'ABSENT' : Number(row.value)]);
      return [...values].map(([studentId, entries]) => ({ studentId, energy: replayRt(entries).energy }));
    } },
    behaviour: { listCurrent: ({ groupId, academicYearId }, studentIds) => {
      const active = db.prepare('SELECT id FROM real_class_sessions WHERE owner_teacher_id=? AND academic_year_id=? AND group_id=? AND ended_at IS NULL').get(ownerTeacherId, academicYearId, groupId) as { id:string }|undefined;
      if (!active) return [];
      const rows = db.prepare(`SELECT student_id AS studentId,current_lives AS lives FROM behaviour_student_state WHERE academic_year_id=? AND group_id=? AND student_id IN (${studentIds.map(() => '?').join(',')})`).all(academicYearId, groupId, ...studentIds) as Array<{ studentId:string; lives:number }>;
       return rows.map(row => ({ studentId: row.studentId, state: derivePolicy(row.lives).state }));
    } },
  };
}

function toTeacherAvatar(row: Record<string, any>, xp: ReturnType<typeof deriveAvatarXp>) {
  return {
    studentId: row.studentId, alias: row.alias, specialty: row.specialty, specialtyCategory: specialtyCategoryFor(row.specialty),
    academicYearId: row.academicYearId, ...xp, revision: row.currentRevision,
    profile: { faceId: row.faceId, skinToneId: row.skinToneId, hairId: row.hairId, featureId: row.featureId, clothingId: row.clothingId, accessoryId: row.accessoryId, frameId: row.frameId, backgroundId: row.backgroundId },
    updatedAt: row.updatedAt, editable: false,
  };
}
