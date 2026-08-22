import type Database from 'better-sqlite3';

export const DEMO_GROUP_ID = '00000000-0000-4000-8000-000000000001';
export const DEMO_STUDENT_ID = '00000000-0000-4000-8000-000000000002';

export type ProjectionStudentRecord = {
  id: string;
  groupId: string;
  ownerTeacherId: string;
  avatar: string;
  alias: string;
  specialty: string;
  unlockedBadge: string | null;
  xpLevel: number;
  progressToNextLevel: number;
  energyVisualState: string;
  coinBalance: number;
  narrativeProgress: number;
  behaviourState: string;
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

export function ensureProjectionFixture(database: Database.Database, teacherId: string) {
  database.prepare(`
    INSERT OR IGNORE INTO projection_students (
      id, group_id, owner_teacher_id, avatar, alias, specialty, unlocked_badge,
      xp_level, progress_to_next_level, energy_visual_state, coin_balance, narrative_progress,
      behaviour_state, real_name, rt_average, rubric, observation_grade, xp_breakdown,
      comments, incidents, red_codes, disciplinary_history, detailed_history
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    DEMO_STUDENT_ID, DEMO_GROUP_ID, teacherId, 'default', 'Demo Student', 'Communication', null,
    1, 0, 'stable', 0, 0, 'NORMAL', 'Demo Student Private Name', null, '{}', null, '{}',
    'private comment', '[]', '[]', '[]', '[]',
  );
}

export function findStudents(database: Database.Database, groupId: string) {
  return database.prepare(`
    SELECT id, group_id AS groupId, owner_teacher_id AS ownerTeacherId, avatar, alias, specialty,
      unlocked_badge AS unlockedBadge, xp_level AS xpLevel, progress_to_next_level AS progressToNextLevel,
      energy_visual_state AS energyVisualState, coin_balance AS coinBalance, narrative_progress AS narrativeProgress,
      behaviour_state AS behaviourState, real_name AS realName, rt_average AS rtAverage, rubric,
      observation_grade AS observationGrade, xp_breakdown AS xpBreakdown, comments, incidents, red_codes AS redCodes,
      disciplinary_history AS disciplinaryHistory, detailed_history AS detailedHistory
    FROM projection_students WHERE group_id = ?
  `).all(groupId) as ProjectionStudentRecord[];
}

export function findStudent(database: Database.Database, groupId: string, studentId: string) {
  return database.prepare(`
    SELECT id, group_id AS groupId, owner_teacher_id AS ownerTeacherId, avatar, alias, specialty,
      unlocked_badge AS unlockedBadge, xp_level AS xpLevel, progress_to_next_level AS progressToNextLevel,
      energy_visual_state AS energyVisualState, coin_balance AS coinBalance, narrative_progress AS narrativeProgress,
      behaviour_state AS behaviourState, real_name AS realName, rt_average AS rtAverage, rubric,
      observation_grade AS observationGrade, xp_breakdown AS xpBreakdown, comments, incidents, red_codes AS redCodes,
      disciplinary_history AS disciplinaryHistory, detailed_history AS detailedHistory
    FROM projection_students WHERE group_id = ? AND id = ?
  `).get(groupId, studentId) as ProjectionStudentRecord | undefined;
}
