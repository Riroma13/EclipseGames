import { useMemo, useRef, useState } from 'react';
import { FastActionShell } from './FastActionShell';
import { UndoBanner } from './UndoBanner';
import type { UndoOpportunity, WorkspaceStudentContext } from './workspace-state';

const initialContext: WorkspaceStudentContext = {
  academicYearId: '00000000-0000-4000-8000-000000000001',
  groupId: '00000000-0000-4000-8000-000000000002',
  studentId: '00000000-0000-4000-8000-000000000003',
  realName: 'Runtime Student',
  alias: 'Runtime',
  readOnly: false,
};

export function RuntimePresentationHarness() {
  const [context, setContext] = useState(initialContext);
  const [actionResult, setActionResult] = useState('');
  const [actionCalls, setActionCalls] = useState(0);
  const actionResolver = useRef<((value: { message: string; undo?: never }) => void) | null>(null);
  const action = useMemo(() => ({
    id: 'runtime-action',
    label: 'Record classroom signal',
    perform: () => new Promise<{ message: string }>((resolve) => {
      setActionCalls((count) => count + 1);
      actionResolver.current = resolve;
    }),
  }), []);

  const [opportunity, setOpportunity] = useState<UndoOpportunity | null>(null);
  const [undoResult, setUndoResult] = useState('');
  const undoResolver = useRef<((value: { kind: 'undone' | 'invalid'; message: string }) => void) | null>(null);

  function createUndo(mode: 'undone' | 'invalid' | 'failure' | 'expiry' | 'pending') {
    if (mode === 'expiry') {
      setOpportunity({ actionId: 'runtime-action', studentId: context.studentId, groupId: context.groupId, expiresAt: Date.now() + 1_000, label: 'Expired signal', undo: async () => ({ kind: 'invalid', message: 'Should not run' }) });
      return;
    }
    setOpportunity({ actionId: 'runtime-action', studentId: context.studentId, groupId: context.groupId, expiresAt: Date.now() + 10_000, label: 'Runtime signal', undo: async () => {
      if (mode === 'failure') throw new Error('controlled failure');
      if (mode === 'pending') return new Promise((resolve) => { undoResolver.current = resolve; });
      return { kind: mode, message: mode === 'undone' ? 'Signal undone.' : 'Signal is no longer valid.' };
    } });
  }

  return <main className="shell" data-testid="runtime-presentation-harness">
    <h1>Presentation runtime harness</h1>
    <section aria-label="Fast action runtime">
      <FastActionShell context={context} action={action} state="empty" onResult={(result) => setActionResult(result.message)} />
      <button type="button" onClick={() => actionResolver.current?.({ message: 'Signal recorded.' })}>Resolve action</button>
      <button type="button" onClick={() => setContext((value) => ({ ...value, studentId: '00000000-0000-4000-8000-000000000004' }))}>Change context</button>
      <output data-testid="action-calls">{actionCalls}</output>
      <output data-testid="action-result">{actionResult}</output>
    </section>
    <section aria-label="Undo runtime">
      <button type="button" onClick={() => createUndo('expiry')}>Create expiring opportunity</button>
      <button type="button" onClick={() => createUndo('undone')}>Create undo opportunity</button>
      <button type="button" onClick={() => createUndo('invalid')}>Create invalid opportunity</button>
      <button type="button" onClick={() => createUndo('failure')}>Create failing opportunity</button>
      <button type="button" onClick={() => createUndo('pending')}>Create pending opportunity</button>
      <button type="button" onClick={() => setOpportunity(null)}>Replace opportunity</button>
      <button type="button" onClick={() => undoResolver.current?.({ kind: 'undone', message: 'Signal undone.' })}>Resolve pending undo</button>
      <UndoBanner opportunity={opportunity} onResult={(message) => { setUndoResult(message); if (message === 'Undo period ended.') setOpportunity(null); }} />
      <output data-testid="undo-result">{undoResult}</output>
    </section>
  </main>;
}
