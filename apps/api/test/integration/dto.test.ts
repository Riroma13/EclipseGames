import { describe, expect, it } from 'vitest';
import { toProjectionStudentDto, toTeacherStudentDto } from '../../src/projection/mapper.js';

const record = {
  id: 'student', groupId: 'group', ownerTeacherId: 'teacher', avatar: 'default', alias: 'Alias', specialty: 'Communication',
  unlockedBadge: null, xpLevel: 1, progressToNextLevel: 0, energyVisualState: 'stable', coinBalance: 0, narrativeProgress: 0,
  behaviourState: 'NORMAL', realName: 'Private Name', rtAverage: 10, rubric: '{}', observationGrade: 8, xpBreakdown: '{}',
  comments: 'Private comment', incidents: '[]', redCodes: '[]', disciplinaryHistory: '[]', detailedHistory: '[]',
};

describe('DTO boundaries', () => {
  it('maps teacher and projection DTOs independently', () => {
    expect(toTeacherStudentDto(record)).toMatchObject({ realName: 'Private Name', rtAverage: 10 });
    expect(toProjectionStudentDto(record)).toEqual({ avatar: 'default', alias: 'Alias', specialty: 'Communication', unlockedBadge: null, xpLevel: 1, progressToNextLevel: 0, energyVisualState: 'stable', coinBalance: 0, narrativeProgress: 0 });
    expect(JSON.stringify(toProjectionStudentDto(record))).not.toMatch(/Private Name|rtAverage|comments|incidents|history/i);
  });
});
