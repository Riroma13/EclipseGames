import { useEffect, useRef, useState } from 'react';
import { sameStudentContext, type WorkspaceAction, type WorkspaceActionResult, type WorkspaceStudentContext } from './workspace-state';

export type ActionState = 'empty' | 'pending' | 'success' | 'failure';
export function FastActionShell({ context, action, state, onResult }: { context: WorkspaceStudentContext; action?: WorkspaceAction; state: ActionState; onResult: (result: WorkspaceActionResult, actionId: string, context: WorkspaceStudentContext) => void }) {
  const [error, setError] = useState('');
  const [localPending, setLocalPending] = useState(false);
  const actionRef = useRef(action);
  const contextRef = useRef(context);
  useEffect(() => { actionRef.current = action; contextRef.current = context; setLocalPending(false); }, [action, context]);
  if (!action) return <section className="action-shell" aria-label="Fast actions"><p className="muted">Actions will appear here when a classroom tool is available.</p></section>;
  const currentAction = action;
  const pending = localPending || state === 'pending';
  async function perform() {
    if (pending || !actionRef.current) return;
    const capturedAction = actionRef.current;
    const capturedContext = contextRef.current;
    setLocalPending(true);
    setError('');
    try {
      const result = await capturedAction.perform(capturedContext);
      const current = actionRef.current === capturedAction && sameStudentContext(contextRef.current, capturedContext);
      if (current) onResult(result, capturedAction.id, capturedContext);
    } catch { if (actionRef.current === capturedAction) setError(`Could not complete ${capturedAction.label}.`); }
    finally { if (actionRef.current === capturedAction) setLocalPending(false); }
  }
  return <section className="action-shell" aria-label="Fast actions"><button type="button" disabled={pending} onClick={perform}>{pending ? 'Working…' : currentAction.label}</button>{pending && <p role="status" aria-live="polite">Working on {currentAction.label}…</p>}{error && <p className="error" role="alert">{error}</p>}</section>;
}
