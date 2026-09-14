import { describe, expect, it } from 'vitest';
import { resolveXpAttribution } from './attribution.js';

describe('XP session attribution', () => {
  it('accepts only a matching active session and snapshots its term', () => {
    expect(resolveXpAttribution({ id: 'session', ownerTeacherId: 'teacher', academicYearId: 'year', groupId: 'group', termId: 'term', active: true }, 'teacher', 'year', 'group')).toEqual({ realClassSessionId: 'session', termId: 'term' });
  });

  it('rejects missing, closed, or mismatched sessions', () => {
    expect(() => resolveXpAttribution(null, 'teacher', 'year', 'group')).toThrow();
    expect(() => resolveXpAttribution({ id: 's', ownerTeacherId: 'teacher', academicYearId: 'year', groupId: 'other', termId: 'term', active: true }, 'teacher', 'year', 'group')).toThrow();
    expect(() => resolveXpAttribution({ id: 's', ownerTeacherId: 'teacher', academicYearId: 'year', groupId: 'group', termId: 'term', active: false }, 'teacher', 'year', 'group')).toThrow();
  });
});
