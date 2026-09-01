import { describe, expect, it } from 'vitest';
import { effectiveXpForAction } from './xp-presentation';

const baseValues = [1, 2, 3] as const;

describe('XP presentation', () => {
  it('shows +2, +3, and +4 for a matching specialty discipline', () => {
    expect(baseValues.map(value => effectiveXpForAction(value, 'Leader', 'COMMUNICATION'))).toEqual([2, 3, 4]);
  });

  it('shows +1, +2, and +3 for a non-matching specialty discipline', () => {
    expect(baseValues.map(value => effectiveXpForAction(value, 'Leader', 'PRECISION'))).toEqual([1, 2, 3]);
  });
});
