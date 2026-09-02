import { useEffect, useRef, useState, type ReactNode } from 'react';
import { gameApi, type ProjectionControl } from '../game/game-api';
import { displayStatus } from '../app/display-status';
import { ClassroomSetup } from './ClassroomSetup';

export type WorkspaceRoute = 'home' | 'classroom' | 'events' | 'challenges' | 'minigames';

function contextQuery() {
  const source = window.location.hash.split('?')[1] ?? window.location.search;
  const params = new URLSearchParams(source);
  const context = new URLSearchParams();
  for (const key of ['year', 'group']) {
    const value = params.get(key);
    if (value) context.set(key, value);
  }
  return context.toString();
}

const routePaths: Record<WorkspaceRoute, string> = {
  home: '/',
  classroom: '/workspace',
  events: '/events',
  challenges: '/challenges',
  minigames: '/minigames',
};

function routeHref(route: WorkspaceRoute) {
  const base = `/#${routePaths[route]}`;
  const query = contextQuery();
  return `${base}${query ? `?${query}` : ''}`;
}

function projectionHref() {
  const group = new URLSearchParams(contextQuery()).get('group');
  return `/#/projection${group ? `?group=${encodeURIComponent(group)}` : ''}`;
}

function groupIdFromUrl() {
  return new URLSearchParams(contextQuery()).get('group');
}

function DisplayStatusFooter() {
  const [groupId, setGroupId] = useState<string | null>(() => groupIdFromUrl());
  const [display, setDisplay] = useState<ProjectionControl | null>(null);
  const groupRef = useRef(groupId);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const read = async () => {
      const nextGroupId = groupIdFromUrl();
      if (nextGroupId !== groupRef.current) {
        groupRef.current = nextGroupId;
        setGroupId(nextGroupId);
        setDisplay(null);
        setError('');
      }
      if (!nextGroupId) return;
      try {
        const value = await gameApi.projectionControl(nextGroupId);
        if (!cancelled && groupIdFromUrl() === nextGroupId) { setDisplay(value); setError(''); }
      } catch {
        if (!cancelled && groupIdFromUrl() === nextGroupId) { setDisplay(null); setError('Display status unavailable.'); }
      }
    };
    void read();
    const interval = window.setInterval(() => void read(), 2_000);
    return () => { cancelled = true; window.clearInterval(interval); };
  }, []);

  const status = groupId ? displayStatus(display) : { state: 'idle' as const, label: 'Idle' as const, title: 'Choose a classroom', detail: 'Select a class to read display status.' };
  const displayedStatus = error ? { ...displayStatus(null), detail: error } : status;
  return <div className="academy-rail-footer">
    <div className={`rail-display-status is-${displayedStatus.state}`} aria-label="Classroom display status" aria-live="polite">
      <div className="rail-display-topline"><span className="rail-display-state">{displayedStatus.label}</span><span className="rail-display-kicker">Display status</span></div>
      <strong>{displayedStatus.title}</strong>
      <span>{displayedStatus.detail}</span>
    </div>
    <a className="projection-handoff" href={projectionHref()} aria-label="Open Classroom Preview">
      <span className="preview-seal" aria-hidden="true">◉</span>
      <span><strong>Open display →</strong><small>Classroom Preview</small></span>
    </a>
    <p className="rail-caption">Private teacher workspace</p>
  </div>;
}

const navigation: Array<{ route: WorkspaceRoute; label: string; caption: string; glyph: string }> = [
  { route: 'home', label: 'Home', caption: 'Command center', glyph: '⌂' },
  { route: 'classroom', label: 'Classroom', caption: 'Live roster', glyph: '◌' },
  { route: 'events', label: 'Events', caption: 'Class moments', glyph: '◇' },
  { route: 'challenges', label: 'Challenges', caption: 'Collective goals', glyph: '✦' },
  { route: 'minigames', label: 'Minigames', caption: 'Quick activities', glyph: '⊕' },
];

export function WorkspaceShell({ children, activeRoute = 'classroom' }: { children: ReactNode; activeRoute?: WorkspaceRoute }) {
  return <div className="workspace-frame">
    <aside className="academy-rail" aria-label="Academy navigation">
      <a className="academy-brand" href={routeHref('home')} aria-label="EclipseGames Home">
        <span className="academy-mark" aria-hidden="true"><span /></span>
        <span className="academy-brand-copy"><strong>EclipseGames</strong><small>Academy Chronicle</small></span>
      </a>
      <nav className="academy-nav" aria-label="Primary">
        {navigation.map(item => <a className={`academy-nav-item${activeRoute === item.route ? ' is-active' : ''}`} href={routeHref(item.route)} aria-current={activeRoute === item.route ? 'page' : undefined} key={item.route}>
          <span className="nav-glyph" aria-hidden="true">{item.glyph}</span>
          <span><strong>{item.label}</strong><small>{item.caption}</small></span>
        </a>)}
      </nav>
       <DisplayStatusFooter />
    </aside>
    <main className="shell workspace-shell"><ClassroomSetup />{children}</main>
  </div>;
}
