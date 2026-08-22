import type { AcademicYearRecord, GroupRecord, StudentRecord } from './repository.js';

export type AcademicYearDto = Pick<AcademicYearRecord, 'id' | 'label' | 'startsOn' | 'endsOn' | 'archivedAt'>;
export type GroupDto = Pick<GroupRecord, 'id' | 'academicYearId' | 'name'>;
export type TeacherStudentDto = Pick<StudentRecord, 'id' | 'groupId' | 'realName' | 'alias' | 'avatar' | 'specialty' | 'archivedAt'>;
export type ClassroomStudentIdentityDto = Pick<StudentRecord, 'id' | 'alias' | 'avatar' | 'specialty'>;

export const toAcademicYearDto = (value: AcademicYearRecord): AcademicYearDto => ({ id: value.id, label: value.label, startsOn: value.startsOn, endsOn: value.endsOn, archivedAt: value.archivedAt });
export const toGroupDto = (value: GroupRecord): GroupDto => ({ id: value.id, academicYearId: value.academicYearId, name: value.name });
export const toTeacherStudentDto = (value: StudentRecord): TeacherStudentDto => ({ id: value.id, groupId: value.groupId, realName: value.realName, alias: value.alias, avatar: value.avatar, specialty: value.specialty, archivedAt: value.archivedAt });
export const toClassroomStudentIdentityDto = (value: StudentRecord): ClassroomStudentIdentityDto => ({ id: value.id, alias: value.alias, avatar: value.avatar, specialty: value.specialty });
