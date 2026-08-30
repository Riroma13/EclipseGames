import type { ReactNode } from 'react';
import { ClassroomSetup } from './ClassroomSetup';
export function WorkspaceShell({ children }: { children: ReactNode }) { return <main className="shell workspace-shell"><ClassroomSetup />{children}<a className="projection-handoff" href="/" aria-label="Open separate fixture Projection">Open separate fixture Projection</a></main>; }
