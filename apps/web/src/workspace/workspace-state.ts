export const DEFAULT_UNDO_DURATION = 10_000;
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type UndoPolicy = 'default' | Readonly<{ kind: 'window'; durationMs: number }> | Readonly<{ kind: 'none' }>;
export type WorkspaceStudentContext = Readonly<{ academicYearId: string; groupId: string; studentId: string; realName: string; alias: string; readOnly: boolean }>;
export type WorkspaceUndoResult = Readonly<{ kind: 'undone'; message: string }> | Readonly<{ kind: 'invalid'; message: string }>;
export type WorkspaceUndoCapability = Readonly<{ label: string; undo: () => Promise<WorkspaceUndoResult> }>;
export type WorkspaceActionResult = Readonly<{ message: string; undo?: WorkspaceUndoCapability }>;
export type WorkspaceNonUndoableActionResult = Readonly<{ message: string; undo?: never }>;
export type WorkspaceUndoableAction = Readonly<{ id: string; label: string; undoPolicy?: Exclude<UndoPolicy, { kind: 'none' }>; perform: (context: WorkspaceStudentContext) => Promise<WorkspaceActionResult> }>;
export type WorkspaceNonUndoableAction = Readonly<{ id: string; label: string; undoPolicy: Readonly<{ kind: 'none' }>; perform: (context: WorkspaceStudentContext) => Promise<WorkspaceNonUndoableActionResult> }>;
export type WorkspaceAction = WorkspaceUndoableAction | WorkspaceNonUndoableAction;
export type UndoOpportunity = Readonly<{ actionId: string; studentId: string; groupId: string; expiresAt: number; label: string; undo: WorkspaceUndoCapability['undo'] }>;

export type WorkspaceState = Readonly<{ search: string; selectedStudentId: string | null; feedback: string; undo: UndoOpportunity | null; requestGeneration: number; pendingActionId: string | null }>;
export type WorkspaceEvent =
  | { type: 'search'; value: string }
  | { type: 'select'; studentId: string }
  | { type: 'context-changed' }
  | { type: 'request-started' }
  | { type: 'action-pending'; id: string }
  | { type: 'action-result'; actionId?: string; message: string; undo: UndoOpportunity | null }
  | { type: 'undo-expired' }
  | { type: 'undo-pending' }
  | { type: 'undo-result'; message: string }
  | { type: 'selection-invalidated' };

export const initialWorkspaceState: WorkspaceState = { search: '', selectedStudentId: null, feedback: '', undo: null, requestGeneration: 0, pendingActionId: null };

export function reducer(state: WorkspaceState, event: WorkspaceEvent): WorkspaceState {
  switch (event.type) {
    case 'search': return { ...state, search: event.value };
    case 'select': return { ...state, selectedStudentId: event.studentId, feedback: '', undo: null, pendingActionId: null };
    case 'context-changed': return { ...initialWorkspaceState, requestGeneration: state.requestGeneration + 1 };
    case 'request-started': return { ...state, requestGeneration: state.requestGeneration + 1, feedback: '', undo: null, pendingActionId: null };
    case 'action-pending': return { ...state, pendingActionId: event.id, feedback: '', undo: null };
    case 'action-result':
      if (event.actionId && state.pendingActionId !== event.actionId) return state;
      return { ...state, pendingActionId: null, feedback: event.message, undo: event.undo };
    case 'undo-expired': return { ...state, undo: null, feedback: 'Undo period ended.' };
    case 'undo-pending': return { ...state, pendingActionId: '__undo__' };
    case 'undo-result': return { ...state, pendingActionId: null, undo: null, feedback: event.message };
    case 'selection-invalidated': return { ...state, selectedStudentId: null, undo: null, pendingActionId: null, feedback: 'The selected student is no longer available.' };
  }
}

export function undoDuration(policy: UndoPolicy | undefined): number | null {
  if (!policy || policy === 'default') return DEFAULT_UNDO_DURATION;
  if (policy.kind === 'none') return null;
  return Number.isFinite(policy.durationMs) && policy.durationMs > 0 ? policy.durationMs : null;
}

export function makeUndoOpportunity(action: WorkspaceAction, result: WorkspaceActionResult, context: WorkspaceStudentContext, now = Date.now()): UndoOpportunity | null {
  const duration = undoDuration(action.undoPolicy);
  if (!duration || !result.undo) return null;
  return { actionId: action.id, studentId: context.studentId, groupId: context.groupId, expiresAt: now + duration, label: result.undo.label, undo: result.undo.undo };
}

export function parseContext(value: string | null): string | null { return value && UUID.test(value) ? value : null; }
export function sameStudentContext(left: WorkspaceStudentContext, right: WorkspaceStudentContext): boolean { return left.academicYearId === right.academicYearId && left.groupId === right.groupId && left.studentId === right.studentId; }
