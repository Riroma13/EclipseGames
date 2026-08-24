export const COIN_REWARD_COSTS = { STANDARD: 2, EXCEPTIONAL: 3 } as const;

export const allowedCoinSources = [
  'LEVEL_ENTITLEMENT',
  'PERSONAL_IMPROVEMENT',
  'EXCEPTIONAL_FRENCH',
  'EXCEPTIONAL_COLLABORATION',
  'SPECIAL_CHALLENGE',
] as const;
export type AllowedCoinSource = (typeof allowedCoinSources)[number];

export function isAllowedCoinSource(value: unknown): value is AllowedCoinSource {
  return typeof value === 'string' && (allowedCoinSources as readonly string[]).includes(value);
}

export function validateCoinLedger(entries: readonly { amount: number }[]) {
  const balance = entries.reduce((sum, entry) => sum + entry.amount, 0);
  return balance < 0 ? { ok: false as const, reason: 'NEGATIVE_BALANCE' as const } : { ok: true as const, balance };
}

type CorrectionEntry = { id: string; correctionOfId: string | null; source: string; amount: number };

export function validateCorrectionChain(entries: readonly CorrectionEntry[]) {
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  for (const entry of entries) {
    if (entry.correctionOfId === null) continue;
    const original = byId.get(entry.correctionOfId);
    if (!original || entry.amount !== -1 || entry.source !== 'MANUAL_CORRECTION' || original.amount !== 1 || !isAllowedCoinSource(original.source)) {
      return { ok: false as const, reason: 'INVALID_CORRECTION' as const };
    }
    if (original.correctionOfId !== null) return { ok: false as const, reason: 'INVALID_CORRECTION' as const };
  }
  return { ok: true as const };
}
