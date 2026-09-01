import { useEffect, useState, type ReactNode } from 'react';
import { SignIn } from './SignIn';
import { WorkspaceShell, type WorkspaceRoute } from '../workspace/WorkspaceShell';

type GateState = 'checking' | 'signed-out' | 'ready';

export function TeacherGate({ children, activeRoute }: { children: ReactNode; activeRoute: WorkspaceRoute }) {
  const [state, setState] = useState<GateState>('checking');

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/v1/academic-years', { credentials: 'same-origin', signal: controller.signal }).then(response => {
      setState(response.status === 401 ? 'signed-out' : 'ready');
    }).catch(caught => { if ((caught as { name?: string }).name !== 'AbortError') setState('ready'); });
    return () => controller.abort();
  }, []);

  if (state === 'checking') return <WorkspaceShell activeRoute={activeRoute}><p className="status" role="status">Opening the Game Master desk…</p></WorkspaceShell>;
  if (state === 'signed-out') return <SignIn activeRoute={activeRoute} onSignedIn={() => window.location.reload()} />;
  return <>{children}</>;
}
