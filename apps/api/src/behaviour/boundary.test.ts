import { describe, expect, it } from 'vitest';
import { reportConfirmationRouteStatus, validatePrivateTarget } from './boundary.js';

describe('behaviour private boundary RED cases', () => {
  const valid = { authenticatedTeacherId: 'teacher', ownerTeacherId: 'teacher', sessionId: 'session', requestedSessionId: 'session', groupId: 'group', requestedGroupId: 'group', studentIsRosterMember: true };
  it.each([
    [{ authenticatedTeacherId: undefined }, 401, 'AUTH_REQUIRED'],
    [{ ownerTeacherId: 'other' }, 404, 'NOT_FOUND'],
    [{ requestedSessionId: 'other' }, 404, 'NOT_FOUND'],
    [{ requestedGroupId: 'other' }, 404, 'NOT_FOUND'],
    [{ studentIsRosterMember: false }, 404, 'NOT_FOUND'],
    [{ malformed: true }, 422, 'VALIDATION_FAILED'],
  ])('returns the safe boundary for invalid request %o', (change, status, code) => {
    expect(validatePrivateTarget({ ...valid, ...change })).toEqual({ status, code });
  });
  it('does not expose report-confirmation resources', () => expect(reportConfirmationRouteStatus()).toEqual({ status: 404, code: 'NOT_FOUND' }));
});
