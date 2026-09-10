export const rtValues = [10, 5, 0, 'ABSENT'] as const;
export type RtValue = (typeof rtValues)[number];
export type EnergyState = 'CRITICAL' | 'LOW' | 'STABLE' | 'HIGH' | 'MAXIMUM';

export function energyForAverage(average: number | null): EnergyState | null {
  if (average === null) return null;
  if (average < 3) return 'CRITICAL';
  if (average < 5) return 'LOW';
  if (average < 6.5) return 'STABLE';
  if (average < 8.5) return 'HIGH';
  return 'MAXIMUM';
}

export function replayRt(values: readonly RtValue[]) {
  let total = 0;
  let evaluated = 0;
  let streak = 0;
  let emeraldEntitlements = 0;
  for (const value of values) {
    if (value === 'ABSENT') continue;
    total += value;
    evaluated += 1;
    if (value === 10) {
      streak += 1;
      if (streak === 4) {
        emeraldEntitlements += 1;
        streak = 0;
      }
    } else streak = 0;
  }
  const average = evaluated ? total / evaluated : null;
  return { average, energy: energyForAverage(average), streak, emeraldEntitlements };
}
