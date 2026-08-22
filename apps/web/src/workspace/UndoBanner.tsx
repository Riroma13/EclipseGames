import type { UndoOpportunity } from './workspace-state';
import { useEffect, useRef, useState } from 'react';

export function UndoBanner({ opportunity, onResult }: { opportunity: UndoOpportunity | null; onResult: (message: string) => void }) {
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<{ kind: 'undone' | 'invalid' | 'failure'; message: string } | null>(null);
  const current = useRef(opportunity);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;
  useEffect(() => {
    current.current = opportunity; setPending(false); setResult(null);
    if (!opportunity) return;
    const timer = window.setTimeout(() => { if (current.current === opportunity) { setResult({ kind: 'failure', message: 'Undo period ended.' }); onResultRef.current('Undo period ended.'); } }, Math.max(0, opportunity.expiresAt - Date.now()));
    return () => window.clearTimeout(timer);
  }, [opportunity]);
  if (!opportunity) return null;
  const activeOpportunity = opportunity;
  async function undo() {
    if (pending || result) return;
    setPending(true);
    try { const value = await activeOpportunity.undo(); setResult({ kind: value.kind, message: value.message }); onResultRef.current(value.message); }
    catch { const message = `Could not undo ${activeOpportunity.label}.`; setResult({ kind: 'failure', message }); onResultRef.current(message); }
    finally { setPending(false); }
  }
  return <div className="undo-banner" role="status" aria-live="polite"><span>{result?.message ?? opportunity.label}</span>{!result && <button type="button" disabled={pending} onClick={undo}>{pending ? 'Undoing…' : 'Undo'}</button>}</div>;
}
