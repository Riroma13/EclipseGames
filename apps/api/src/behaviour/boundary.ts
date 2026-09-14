export type BoundaryErrorCode = 'AUTH_REQUIRED' | 'NOT_FOUND' | 'VALIDATION_FAILED';
export type BoundaryError = { code: BoundaryErrorCode; status: 401 | 404 | 422 };

export function validatePrivateTarget(input: { authenticatedTeacherId?: string; ownerTeacherId?: string; sessionId?: string; requestedSessionId?: string; groupId?: string; requestedGroupId?: string; studentIsRosterMember?: boolean; malformed?: boolean }): BoundaryError | null {
  if (!input.authenticatedTeacherId) return { code: 'AUTH_REQUIRED', status: 401 };
  if (input.malformed) return { code: 'VALIDATION_FAILED', status: 422 };
  if (input.ownerTeacherId !== input.authenticatedTeacherId || input.sessionId !== input.requestedSessionId || input.groupId !== input.requestedGroupId || input.studentIsRosterMember === false) return { code: 'NOT_FOUND', status: 404 };
  return null;
}

export function reportConfirmationRouteStatus() {
  return { code: 'NOT_FOUND' as const, status: 404 as const };
}
