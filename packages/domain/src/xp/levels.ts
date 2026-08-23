export const levelThresholds = [0, 10, 25, 45, 70, 100, 135, 175] as const;
export type XpLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export function levelForXp(total: number): XpLevel { let level: XpLevel = 1; for (let i = 1; i < levelThresholds.length; i += 1) if (total >= levelThresholds[i]) level = (i + 1) as XpLevel; return level; }
export function progressForXp(total: number) {
  const level = levelForXp(total);
  if (level === 8) return { current: 0, required: 0, nextLevel: null, isMaxLevel: true as const };
  return { current: total - levelThresholds[level - 1], required: levelThresholds[level] - levelThresholds[level - 1], nextLevel: (level + 1) as XpLevel, isMaxLevel: false as const };
}
