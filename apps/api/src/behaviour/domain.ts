export const MIN_LIVES = 0;
export const MAX_LIVES = 4;

export type BehaviourState = 'NORMAL' | 'VIGILANCE' | 'ALERT' | 'RED_CODE';

export type BehaviourPolicy = {
  state: BehaviourState;
  bonusAllowed: boolean;
  receiveGemAllowed: boolean;
  spendGemAllowed: boolean;
  specialActivityAllowed: boolean;
};

export function derivePolicy(lives: number): BehaviourPolicy {
  if (!Number.isInteger(lives) || lives < MIN_LIVES || lives > MAX_LIVES) throw new RangeError('Lives must be an integer from 0 to 4.');
  if (lives === 4) return { state: 'NORMAL', bonusAllowed: true, receiveGemAllowed: true, spendGemAllowed: true, specialActivityAllowed: true };
  if (lives === 3) return { state: 'VIGILANCE', bonusAllowed: true, receiveGemAllowed: false, spendGemAllowed: true, specialActivityAllowed: true };
  if (lives === 2) return { state: 'ALERT', bonusAllowed: false, receiveGemAllowed: false, spendGemAllowed: false, specialActivityAllowed: true };
  return { state: 'RED_CODE', bonusAllowed: false, receiveGemAllowed: false, spendGemAllowed: false, specialActivityAllowed: false };
}

export function applyDelta(lives: number, delta: number) {
  if (!Number.isInteger(delta) || ![-1, 1].includes(delta)) throw new RangeError('Behaviour actions change exactly one life.');
  const next = lives + delta;
  if (next < MIN_LIVES || next > MAX_LIVES) throw new RangeError('Behaviour lives would be outside 0 to 4.');
  return next;
}

export function carryLives(previousLives: number | null | undefined) {
  return previousLives ?? MAX_LIVES;
}

export function effectiveActionDelta(kind: 'LOSS' | 'RESTORE' | 'CORRECTION', delta: number) {
  if (kind === 'CORRECTION') return -delta;
  if (kind === 'LOSS' && delta !== -1) throw new RangeError('Loss actions must use delta -1.');
  if (kind === 'RESTORE' && delta !== 1) throw new RangeError('Restore actions must use delta 1.');
  return delta;
}

export function canReceiveGem(lives: number) { return derivePolicy(lives).receiveGemAllowed; }
export function canSpendGem(lives: number) { return derivePolicy(lives).spendGemAllowed; }
