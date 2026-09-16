import type { ClassroomStudentDto, ClassroomBehaviourState, RestrictedAvatarDto, ShowStudentDto } from '@eclipse/contracts';

export type ClassroomGemBalances = { EMERALD:number; RUBY:number; DIAMOND:number };
export type ClassroomEnergy = 'CRITICAL'|'LOW'|'STABLE'|'HIGH'|'MAXIMUM';

export function toClassroomStudentDto(avatar: RestrictedAvatarDto, energy: ClassroomEnergy|null, gems: ClassroomGemBalances): ClassroomStudentDto {
  return { avatar, energy, gems: { EMERALD: gems.EMERALD, RUBY: gems.RUBY, DIAMOND: gems.DIAMOND } };
}

export function toAlertOnlyBehaviour(state: ClassroomBehaviourState|null|undefined): { state: ClassroomBehaviourState }|null {
  return state === 'ALERT' ? { state: 'ALERT' } : null;
}

export function toShowStudentDto(expiresAt: string, student: ClassroomStudentDto, state: ClassroomBehaviourState|null|undefined): ShowStudentDto {
  return { kind: 'SHOW_STUDENT', expiresAt, student, behaviour: toAlertOnlyBehaviour(state) };
}
