import { describe, expect, it, vi } from 'vitest';
import type { RestrictedAvatarDto } from '@eclipse/contracts';
import { composeClassroomCards } from './classroom-composer.js';
import { toAlertOnlyBehaviour, toShowStudentDto } from './classroom-mapper.js';

const avatar = (studentId:string): RestrictedAvatarDto => ({ studentId, alias: `A-${studentId}`, specialty: null, specialtyCategory: null, level: 1, progress: { isMaxLevel:false, progressPercent:0, nextLevel:2, xpToNextLevel:10 }, badges: [], profile: { faceId:'face-human', skinToneId:'skin-medium', hairId:'hair-short', featureId:'feature-none', clothingId:'clothing-eclipse', accessoryId:'accessory-none', frameId:'frame-none', backgroundId:'background-eclipse' } });
const ports = (ids:string[]) => ({
  roster: { listActive: vi.fn(() => ids.map(studentId => ({ studentId }))) },
  avatar: { listRestricted: vi.fn(() => ids.map(studentId => avatar(studentId))) },
  xp: { listAnnual: vi.fn(() => ids.map(studentId => ({ studentId, level: 1 as const, progress: avatar(studentId).progress, badges: [] })) ) },
  gems: { listBalances: vi.fn(() => ids.map(studentId => ({ studentId, balances: { EMERALD:0, RUBY:1, DIAMOND:2 } }))) },
  energy: { listCurrent: vi.fn(() => ids.filter(id => id !== 'b').map(studentId => ({ studentId, energy:'HIGH' as const }))) },
  behaviour: { listCurrent: vi.fn(() => [{ studentId:'a', state:'ALERT' as const }]) },
});

describe('classroom contracts and composition', () => {
  it('joins in canonical roster order and makes optional data null', async () => {
    const p = ports(['b','a']);
    const result = await composeClassroomCards({ groupId:'g', academicYearId:'y' }, p);
    expect(result.map(item => item.avatar.studentId)).toEqual(['b','a']);
    expect(result[0].energy).toBeNull();
    expect(result[1].energy).toBe('HIGH');
    expect(Object.keys(result[0]).sort()).toEqual(['avatar','energy','gems']);
    expect(p.avatar.listRestricted).toHaveBeenCalledTimes(1);
    expect(p.xp.listAnnual).toHaveBeenCalledTimes(1);
    expect(p.gems.listBalances).toHaveBeenCalledTimes(1);
  });

  it('fails the whole composition when required data fails or is missing', async () => {
    const p = ports(['a']); p.xp.listAnnual.mockRejectedValueOnce(new Error('unavailable'));
    await expect(composeClassroomCards({ groupId:'g', academicYearId:'y' }, p)).rejects.toThrow('unavailable');
    const missing = ports(['a']); missing.gems.listBalances.mockReturnValueOnce([]);
    await expect(composeClassroomCards({ groupId:'g', academicYearId:'y' }, missing)).rejects.toThrow('Required classroom data missing');
  });

  it('allows only Alert behaviour in the restricted Show Student DTO', () => {
    expect(toAlertOnlyBehaviour('ALERT')).toEqual({ state:'ALERT' });
    for (const state of ['NORMAL', 'VIGILANCE', 'RED_CODE'] as const) {
      expect(toAlertOnlyBehaviour(state)).toBeNull();
      expect(toShowStudentDto('2026-01-01T00:00:00.000Z', { avatar:avatar('a'), energy:null, gems:{ EMERALD:0, RUBY:0, DIAMOND:0 } }, state).behaviour).toBeNull();
    }
    expect(toAlertOnlyBehaviour(undefined)).toBeNull();
    expect(toShowStudentDto('2026-01-01T00:00:00.000Z', { avatar:avatar('a'), energy:null, gems:{ EMERALD:0, RUBY:0, DIAMOND:0 } }, 'ALERT')).toEqual(expect.objectContaining({ kind:'SHOW_STUDENT', behaviour:{ state:'ALERT' } }));
  });

  it('does not write domain state while composing a thirty-student batch', async () => {
    const ids = Array.from({ length:30 }, (_, i) => String(i)); const p = ports(ids);
    await composeClassroomCards({ groupId:'g', academicYearId:'y' }, p);
    expect(p.roster.listActive).toHaveBeenCalledTimes(1);
    expect(p.energy?.listCurrent).toHaveBeenCalledTimes(1);
    expect(p.behaviour?.listCurrent).toHaveBeenCalledTimes(1);
  });
});
