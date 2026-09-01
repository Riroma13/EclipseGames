import type { ReactNode } from 'react';
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
      <div className="academy-rail-footer">
        <a className="projection-handoff" href={projectionHref()} aria-label="Open Classroom Preview">
          <span className="preview-seal" aria-hidden="true">◉</span>
          <span><strong>Classroom Preview</strong><small>Safe projection</small></span>
          <span className="handoff-arrow" aria-hidden="true">→</span>
        </a>
        <p className="rail-caption">Private teacher workspace</p>
      </div>
    </aside>
    <main className="shell workspace-shell"><ClassroomSetup />{children}</main>
  </div>;
}
