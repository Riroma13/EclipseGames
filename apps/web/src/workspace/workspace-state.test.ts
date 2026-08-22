import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_UNDO_DURATION, initialWorkspaceState, makeUndoOpportunity, parseContext, reducer, sameStudentContext, undoDuration } from './workspace-state';

const context = { academicYearId: '00000000-0000-4000-8000-000000000001', groupId: '00000000-0000-4000-8000-000000000002', studentId: '00000000-0000-4000-8000-000000000003', realName: 'Ada', alias: 'A', readOnly: false } as const;
const action = (policy?: any) => ({ id: 'a', label: 'Award', undoPolicy: policy, perform: vi.fn() });

describe('workspace state', () => {
  it('resets transient state and advances request generation on context changes', () => {
    const state = reducer({ ...initialWorkspaceState, search: 'Ada', selectedStudentId: context.studentId, feedback: 'x' }, { type: 'context-changed' });
    expect(state).toEqual({ ...initialWorkspaceState, requestGeneration: 1 });
  });
  it('accepts only valid opaque UUID context values through the helper', () => {
    expect(parseContext(context.studentId)).toBe(context.studentId);
    expect(parseContext('Ada')).toBeNull();
  });
  it('uses ten seconds by default and exact positive finite overrides', () => {
    expect(undoDuration(undefined)).toBe(DEFAULT_UNDO_DURATION);
    expect(undoDuration({ kind: 'window', durationMs: 2500 })).toBe(2500);
    expect(undoDuration({ kind: 'window', durationMs: 0 })).toBeNull();
    expect(undoDuration({ kind: 'window', durationMs: -1 })).toBeNull();
    expect(undoDuration({ kind: 'window', durationMs: Infinity })).toBeNull();
    expect(undoDuration({ kind: 'window', durationMs: NaN })).toBeNull();
    expect(undoDuration({ kind: 'none' })).toBeNull();
  });
  it('creates one capability-bound opportunity and never infers one without capability', () => {
    const undo = vi.fn(async () => ({ kind: 'undone' as const, message: 'Undone.' }));
    expect(makeUndoOpportunity(action(), { message: 'Done', undo: { label: 'Undo award', undo } }, context, 100)).toMatchObject({ expiresAt: 100 + DEFAULT_UNDO_DURATION, label: 'Undo award' });
    expect(makeUndoOpportunity(action(), { message: 'Done' }, context, 100)).toBeNull();
    expect(makeUndoOpportunity(action({ kind: 'none' }), { message: 'Done', undo: { label: 'Undo', undo } }, context, 100)).toBeNull();
  });
  it('clears an opportunity on selection, expiry, replacement, and undo result', () => {
    const opportunity = { actionId: 'a', studentId: context.studentId, groupId: context.groupId, expiresAt: 4, label: 'Undo', undo: vi.fn() };
    let state = reducer({ ...initialWorkspaceState, undo: opportunity }, { type: 'select', studentId: context.studentId });
    expect(state.undo).toBeNull();
    state = reducer({ ...initialWorkspaceState, undo: opportunity }, { type: 'undo-expired' });
    expect(state.feedback).toBe('Undo period ended.');
    state = reducer({ ...initialWorkspaceState, undo: opportunity }, { type: 'action-result', message: 'New', undo: null });
    expect(state.undo).toBeNull();
    expect(reducer({ ...initialWorkspaceState, undo: opportunity, pendingActionId: '__undo__' }, { type: 'undo-result', message: 'Could not undo Award' }).feedback).toContain('Could not');
  });

  it('resets search, selection, feedback, undo, and pending work for every new context', () => {
    const state = reducer({ ...initialWorkspaceState, search: 'Ada', selectedStudentId: context.studentId, feedback: 'Done', undo: { actionId: 'a', studentId: context.studentId, groupId: context.groupId, expiresAt: 10, label: 'Undo', undo: vi.fn() }, pendingActionId: 'a' }, { type: 'context-changed' });
    expect(state.search).toBe('');
    expect(state.selectedStudentId).toBeNull();
    expect(state.feedback).toBe('');
    expect(state.undo).toBeNull();
    expect(state.pendingActionId).toBeNull();
    expect(state.requestGeneration).toBe(1);
  });

  it('suppresses stale action completion while accepting the current action', () => {
    const pending = reducer(initialWorkspaceState, { type: 'action-pending', id: 'new-action' });
    expect(reducer(pending, { type: 'action-result', actionId: 'old-action', message: 'stale', undo: null })).toBe(pending);
    expect(reducer(pending, { type: 'action-result', actionId: 'new-action', message: 'complete', undo: null })).toMatchObject({ pendingActionId: null, feedback: 'complete' });
  });
  it('treats a changed year, group, or student as stale action context', () => {
    expect(sameStudentContext(context, { ...context, studentId: '00000000-0000-4000-8000-000000000004' })).toBe(false);
    expect(sameStudentContext(context, context)).toBe(true);
  });

  it('keeps undo pending until the callback returns and then removes it', () => {
    const opportunity = { actionId: 'a', studentId: context.studentId, groupId: context.groupId, expiresAt: 10, label: 'Undo', undo: vi.fn() };
    const pending = reducer({ ...initialWorkspaceState, undo: opportunity }, { type: 'undo-pending' });
    expect(pending.undo).toBe(opportunity);
    expect(pending.pendingActionId).toBe('__undo__');
    expect(reducer(pending, { type: 'undo-result', message: 'The domain rejected this correction.' })).toMatchObject({ undo: null, pendingActionId: null, feedback: 'The domain rejected this correction.' });
  });
});
