import { describe, expect, it } from 'vitest';
import { energyForAverage, replayRt } from './domain.js';

describe('RT domain replay', () => {
  it('excludes ABSENT, returns null with no evaluated values, and uses unrounded bands', () => {
    expect(replayRt(['ABSENT'])).toMatchObject({ average: null, energy: null, streak: 0 });
    expect(replayRt([10, 5, 'ABSENT', 0])).toMatchObject({ average: 5, energy: 'STABLE', streak: 0 });
    expect(replayRt([10, 10, 10, 10])).toMatchObject({ average: 10, energy: 'MAXIMUM', streak: 0, emeraldEntitlements: 1 });
    expect(replayRt([10, 10, 10, 5, 'ABSENT', 10])).toMatchObject({ streak: 1, emeraldEntitlements: 0 });
  });

  it.each([
    [2.9, 'CRITICAL'], [3, 'LOW'], [4.9, 'LOW'], [5, 'STABLE'],
    [6.4, 'STABLE'], [6.5, 'HIGH'], [8.4, 'HIGH'], [8.5, 'MAXIMUM'],
  ] as Array<[number, string]>)('maps average %s to %s', (average, energy) => {
    expect(energyForAverage(average)).toBe(energy);
  });
});
