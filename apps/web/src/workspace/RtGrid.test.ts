import { describe, expect, it } from 'vitest';
import { mapRtSelectValue } from './RtGrid';

describe('RT native select boundary', () => {
  it.each([
    ['10', 10, 'number'],
    ['5', 5, 'number'],
    ['0', 0, 'number'],
    ['ABSENT', 'ABSENT', 'string'],
  ] as const)('maps %s to the canonical runtime value', (input, expected, type) => {
    const value = mapRtSelectValue(input);
    expect(value).toBe(expected);
    expect(typeof value).toBe(type);
  });

  it.each(['', '  ', '10.0', 'unexpected'])('rejects %s without an RT value', input => {
    expect(mapRtSelectValue(input)).toBeNull();
  });
});
