import { describe, expect, it } from 'vitest';
import { localParts, validTimezone } from './clock.js';

describe('calendar clock', () => {
  it('formats instants in the configured IANA zone, independently of host zone', () => {
    expect(localParts(new Date('2026-03-29T00:30:00.000Z'), 'Europe/Paris')).toEqual({ date: '2026-03-29', time: '01:30', weekday: 7 });
    expect(localParts(new Date('2026-03-29T01:30:00.000Z'), 'Europe/Paris')).toEqual({ date: '2026-03-29', time: '03:30', weekday: 7 });
  });
  it('accepts IANA zones and rejects malformed zones', () => {
    expect(validTimezone('America/Montreal')).toBe(true);
    expect(validTimezone('not-an-iana-zone')).toBe(false);
  });
});
