import { describe, expect, it } from 'vitest';
import { contains, intervalContains, intervalsOverlap, overlaps } from './rules.js';

describe('calendar rules', () => {
  it('uses inclusive dates and half-open time intervals', () => {
    expect(contains({ startsOn: '2026-09-01', endsOn: '2026-09-10' }, '2026-09-10')).toBe(true);
    expect(intervalContains('09:00', '10:00', '09:00')).toBe(true);
    expect(intervalContains('09:00', '10:00', '10:00')).toBe(false);
  });
  it('detects only real range and interval overlaps', () => {
    expect(overlaps({ startsOn: '2026-09-01', endsOn: '2026-09-03' }, { startsOn: '2026-09-03', endsOn: '2026-09-04' })).toBe(true);
    expect(intervalsOverlap({ startsAt: '09:00', endsAt: '10:00' }, { startsAt: '10:00', endsAt: '11:00' })).toBe(false);
  });
});
