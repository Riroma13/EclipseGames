export const levelThresholds = [0, 10, 25, 45, 70, 100, 135, 175] as const;
export type XpLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export const MAX_SAFE_XP = Number.MAX_SAFE_INTEGER;
export function assertSafeXpTotal(total: number): number { if (!Number.isSafeInteger(total) || total < 0) throw new Error('XP total must be a non-negative safe integer.'); return total; }
export function levelForXp(total: number): XpLevel { assertSafeXpTotal(total); let level: XpLevel = 1; for (let i = 1; i < levelThresholds.length; i += 1) if (total >= levelThresholds[i]) level = (i + 1) as XpLevel; return level; }
export type XpProgress = { isMaxLevel: false; progressPercent: number; nextLevel: 2|3|4|5|6|7|8; xpToNextLevel: number } | { isMaxLevel: true; progressPercent: 100; nextLevel: null; xpToNextLevel: null };
export function progressForXp(total: number): XpProgress {
  assertSafeXpTotal(total);
  const level = levelForXp(total);
  if (level === 8) return { isMaxLevel: true, progressPercent: 100, nextLevel: null, xpToNextLevel: null };
  const current = total - levelThresholds[level - 1];
  const required = levelThresholds[level] - levelThresholds[level - 1];
  return { isMaxLevel: false, progressPercent: Math.max(0, Math.min(100, Math.floor((current * 100) / required))), nextLevel: (level + 1) as 2|3|4|5|6|7|8, xpToNextLevel: levelThresholds[level] - total };
}
