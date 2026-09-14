import { describe, expect, it } from 'vitest';
import { applyDelta, carryLives, derivePolicy, effectiveActionDelta } from './domain.js';

describe('behaviour policy', () => {
  it('derives the four design states without treating zero as a fifth state', () => {
    expect([4, 3, 2, 1, 0].map(lives => derivePolicy(lives).state)).toEqual(['NORMAL', 'VIGILANCE', 'ALERT', 'RED_CODE', 'RED_CODE']);
    expect(derivePolicy(2)).toMatchObject({ bonusAllowed: false, receiveGemAllowed: false, spendGemAllowed: false, specialActivityAllowed: true });
    expect(derivePolicy(0).specialActivityAllowed).toBe(false);
  });

  it('keeps base lives when no state exists and bounds one-life actions', () => {
    expect(carryLives(undefined)).toBe(4);
    expect(applyDelta(4, -1)).toBe(3);
    expect(() => applyDelta(0, -1)).toThrow();
    expect(() => applyDelta(4, 1)).toThrow();
  });

  it('uses inverse deltas for correction without changing the action history', () => {
    expect(effectiveActionDelta('LOSS', -1)).toBe(-1);
    expect(effectiveActionDelta('CORRECTION', -1)).toBe(1);
  });
});
