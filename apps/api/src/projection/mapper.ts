import type { ProjectionStudentRecord } from './repository.js';

export type ProjectionStudentDto = {
  avatar: string;
  alias: string;
  specialty: string;
  unlockedBadge: string | null;
  xpLevel: number;
  progressToNextLevel: number;
  energyVisualState: string;
  coinBalance: number;
  narrativeProgress: number;
  behaviourState?: string;
};

export type TeacherStudentDto = ProjectionStudentDto & {
  realName: string;
  rtAverage: number | null;
  rubric: string;
  observationGrade: number | null;
  xpBreakdown: string;
  comments: string;
  incidents: string;
  redCodes: string;
  disciplinaryHistory: string;
  detailedHistory: string;
};

export function toProjectionStudentDto(student: ProjectionStudentRecord, showStudent = false): ProjectionStudentDto {
  return {
    avatar: student.avatar,
    alias: student.alias,
    specialty: student.specialty,
    unlockedBadge: student.unlockedBadge,
    xpLevel: student.xpLevel,
    progressToNextLevel: student.progressToNextLevel,
    energyVisualState: student.energyVisualState,
    coinBalance: student.coinBalance,
    narrativeProgress: student.narrativeProgress,
    ...(showStudent ? { behaviourState: student.behaviourState } : {}),
  };
}

export function toTeacherStudentDto(student: ProjectionStudentRecord): TeacherStudentDto {
  return { ...toProjectionStudentDto(student), realName: student.realName, rtAverage: student.rtAverage, rubric: student.rubric, observationGrade: student.observationGrade, xpBreakdown: student.xpBreakdown, comments: student.comments, incidents: student.incidents, redCodes: student.redCodes, disciplinaryHistory: student.disciplinaryHistory, detailedHistory: student.detailedHistory };
}
