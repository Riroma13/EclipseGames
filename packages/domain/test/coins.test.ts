import { describe, expect, it } from 'vitest';
import {
  COIN_REWARD_COSTS,
  isAllowedCoinSource,
  validateCoinLedger,
  validateCorrectionChain,
} from '../src/index.js';

describe('coin rules', () => {
  it('keeps the two fixed assessment advantage costs', () => {
    expect(COIN_REWARD_COSTS.STANDARD).toBe(2);
    expect(COIN_REWARD_COSTS.EXCEPTIONAL).toBe(3);
  });

  it('accepts only approved +1 source types', () => {
    expect(isAllowedCoinSource('PERSONAL_IMPROVEMENT')).toBe(true);
    expect(isAllowedCoinSource('REDEMPTION_DEBIT')).toBe(false);
    expect(isAllowedCoinSource('MANUAL_CORRECTION')).toBe(false);
  });

  it('rejects a negative resulting balance', () => {
    expect(validateCoinLedger([{ amount: 1 }, { amount: -2 }])).toEqual({ ok: false, reason: 'NEGATIVE_BALANCE' });
    expect(validateCoinLedger([{ amount: 1 }, { amount: -1 }])).toEqual({ ok: true, balance: 0 });
  });

  it('allows finite correction chains only for approved pairs', () => {
    expect(validateCorrectionChain([{ id: 'a', correctionOfId: null, source: 'PERSONAL_IMPROVEMENT', amount: 1 }])).toEqual({ ok: true });
    expect(validateCorrectionChain([
      { id: 'a', correctionOfId: null, source: 'PERSONAL_IMPROVEMENT', amount: 1 },
      { id: 'b', correctionOfId: 'a', source: 'MANUAL_CORRECTION', amount: -1 },
    ])).toEqual({ ok: true });
    expect(validateCorrectionChain([{ id: 'a', correctionOfId: 'missing', source: 'MANUAL_CORRECTION', amount: -1 }])).toEqual({ ok: false, reason: 'INVALID_CORRECTION' });
  });
});
