import { describe, expect, it } from 'vitest';
import { badgeActivity, calculateEventXp, levelForXp, progressForXp } from '../src/index.js';

describe('XP rules', () => {
  it('applies a flat event-time specialty bonus without reducing base XP', () => {
    expect(calculateEventXp('COMMUNICATION', 3, 'Leader', true)).toMatchObject({ specialtyBonusXp: 1, effectiveXp: 4, specialtyCategoryAtAward: 'COMMUNICATION' });
    expect(calculateEventXp('COMMUNICATION', 3, 'Leader', false)).toMatchObject({ specialtyBonusXp: 0, effectiveXp: 3, bonusEligibleAtAward: false });
    expect(calculateEventXp('PRECISION', 1, null, true).effectiveXp).toBe(1);
  });
  it('derives thresholds and caps level eight progress', () => {
    expect(levelForXp(24)).toBe(2);
    expect(levelForXp(175)).toBe(8);
    expect(progressForXp(175)).toEqual({ current: 0, required: 0, nextLevel: null, isMaxLevel: true });
  });
  it('counts exactly three qualifying active records, not points', () => {
    const events = [1, 2, 3].map((id) => ({ id: String(id), category: 'COMMUNICATION' as const, specialtyCategoryAtAward: 'COMMUNICATION' as const, active: true }));
    expect(badgeActivity(events)[0]).toMatchObject({ unlocked: true, sourceEventId: '3' });
    expect(badgeActivity(events.slice(0, 2))[0].unlocked).toBe(false);
  });
});
