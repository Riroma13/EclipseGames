import type { UndoOpportunity } from './workspace-state';
import { useEffect, useRef, useState } from 'react';

export function UndoBanner({ opportunity, onResult }: { opportunity: UndoOpportunity | null; onResult: (message: string) => void }) {
  const [pending, setPending] = useState(false);
  const current = useRef(opportunity);
  const onResultRef = useRef(onResult);
  current.current = opportunity;
  onResultRef.current = onResult;
  useEffect(() => {
    current.current = opportunity; setPending(false);
    if (!opportunity) return;
    if (opportunity.result) return;
    const timer = window.setTimeout(() => { if (current.current === opportunity) onResultRef.current('Undo period ended.'); }, Math.max(0, opportunity.expiresAt - Date.now()));
    return () => window.clearTimeout(timer);
  }, [opportunity]);
  if (!opportunity) return null;
  const activeOpportunity = opportunity;
  async function undo() {
    if (pending || activeOpportunity.result) return;
    const capturedOpportunity = activeOpportunity;
    setPending(true);
    try {
      const value = await capturedOpportunity.undo();
      if (current.current !== capturedOpportunity) return;
       onResultRef.current(value.message);
    } catch {
      const message = `Could not undo ${capturedOpportunity.label}.`;
      if (current.current !== capturedOpportunity) return;
       onResultRef.current(message);
    } finally {
      if (current.current === capturedOpportunity) setPending(false);
    }
  }
  return <div className="undo-banner" role="status" aria-live="polite"><span>{opportunity.result?.message ?? opportunity.label}</span>{!opportunity.result && <button type="button" disabled={pending} onClick={undo}>{pending ? 'Undoing…' : 'Undo'}</button>}</div>;
}
