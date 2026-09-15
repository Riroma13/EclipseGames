import { levelForXp, progressForXp, type XpLevel, type XpProgress } from '@eclipse/domain';
import type { AvatarProfile, RestrictedAvatarDto, TeacherAvatarDto } from '@eclipse/contracts';
import { specialtyCategoryFor } from './domain.js';

export type AvatarXpFields = { annualEffectiveXp: number; level: XpLevel; progress: XpProgress; badges: TeacherAvatarDto['badges'] };
export function deriveAvatarXp(annualEffectiveXp: number, badges: AvatarXpFields['badges']): AvatarXpFields {
  return { annualEffectiveXp, level: levelForXp(annualEffectiveXp), progress: progressForXp(annualEffectiveXp), badges };
}

type AvatarStudent = { studentId: string; alias: string; specialty: string|null; academicYearId: string; revision: number; profile: AvatarProfile; updatedAt: string; editable: boolean };
export function toTeacherAvatarDto(student: AvatarStudent, xp: AvatarXpFields): TeacherAvatarDto {
  return { studentId: student.studentId, alias: student.alias, specialty: student.specialty, specialtyCategory: specialtyCategoryFor(student.specialty), academicYearId: student.academicYearId, annualEffectiveXp: xp.annualEffectiveXp, level: xp.level, progress: xp.progress, badges: xp.badges, revision: student.revision, profile: student.profile, updatedAt: student.updatedAt, editable: student.editable };
}
export function toRestrictedAvatarDto(value: TeacherAvatarDto): RestrictedAvatarDto {
  return { studentId: value.studentId, alias: value.alias, specialty: value.specialty, specialtyCategory: value.specialtyCategory, level: value.level, progress: value.progress, badges: value.badges, profile: value.profile };
}
