import { describe, expect, it } from 'vitest';
import { calculateRubricCategory, formatGrade, transitionRubric } from '../src/index.js';

describe('quarterly observation rubric rules', () => {
  it('uses base XP thresholds and counts records, not points', () => {
    expect(calculateRubricCategory([0, 2])).toMatchObject({ baseXp: 2, suggestedLevel: 1, lowEvidence: true });
    expect(calculateRubricCategory([1, 2, 2])).toMatchObject({ baseXp: 5, suggestedLevel: 2, lowEvidence: true });
    expect(calculateRubricCategory([2, 2, 2])).toMatchObject({ baseXp: 6, suggestedLevel: 3, lowEvidence: true });
    expect(calculateRubricCategory([10, 0, 0, 0])).toMatchObject({ baseXp: 10, qualifyingEventCount: 4, suggestedLevel: 4, lowEvidence: false });
  });

  it('applies nullable overrides and exact integer grade formatting', () => {
    expect(calculateRubricCategory([10], 2).finalLevel).toBe(2);
    expect(formatGrade(13)).toBe('8.125');
    expect(formatGrade(16)).toBe('10');
    expect(formatGrade(12)).toBe('7.5');
  });

  it('allows only the designed lifecycle transitions', () => {
    expect(transitionRubric('OPEN', 'CLOSE')).toBe('CLOSED');
    expect(transitionRubric('CLOSED', 'REOPEN')).toBe('REOPENED');
    expect(transitionRubric('REOPENED', 'CLOSE')).toBe('CLOSED');
    expect(() => transitionRubric('OPEN', 'REOPEN')).toThrow();
  });
});
