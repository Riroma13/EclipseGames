import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { gameApi, type ProjectionControl } from '../game/game-api';
import { workspaceApi, type AcademicYear, type Group } from '../workspace/workspace-api';
import { displayStatus } from './display-status';

function contextFromUrl() {
  const source = window.location.hash.split('?')[1] ?? window.location.search;
  const params = new URLSearchParams(source);
  return { yearId: params.get('year'), groupId: params.get('group') };
}

function replaceContext(yearId: string | null, groupId: string | null) {
  const route = window.location.hash.split('?')[0] || '#/';
  const params = new URLSearchParams();
  const current = new URLSearchParams(window.location.hash.split('?')[1] ?? window.location.search);
  if (yearId) params.set('year', yearId);
  if (groupId) params.set('group', groupId);
  if (current.get('new') === '1') params.set('new', '1');
  window.history.replaceState(null, '', `/${route}${params.toString() ? `?${params}` : ''}`);
}

export type TeacherContext = {
  years: AcademicYear[];
  groups: Group[];
  yearId: string | null;
  groupId: string | null;
  year: AcademicYear | null;
  group: Group | null;
  historical: boolean;
  loading: boolean;
  error: string;
  revision: number;
  selectYear: (id: string) => void;
  selectGroup: (id: string) => void;
  refresh: () => void;
};

export function useTeacherContext(): TeacherContext {
  const location = useLocation();
  const initial = contextFromUrl();
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [yearId, setYearId] = useState<string | null>(initial.yearId);
  const [groupId, setGroupId] = useState<string | null>(initial.groupId);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const yearGeneration = useRef(0);
  const groupGeneration = useRef(0);

  useEffect(() => {
    const generation = ++yearGeneration.current;
    const requestContext = contextFromUrl();
    const controller = new AbortController();
    const isCurrent = () => generation === yearGeneration.current
      && contextFromUrl().yearId === requestContext.yearId
      && contextFromUrl().groupId === requestContext.groupId;
    setLoading(true);
    workspaceApi.years(false, controller.signal).then(async values => {
      const available = values.length ? values : await workspaceApi.years(true, controller.signal);
      if (!isCurrent()) return;
      setYears(available);
      const chosen = available.find(value => value.id === requestContext.yearId) ?? available[0] ?? null;
      setYearId(chosen?.id ?? null);
      if (chosen?.id !== requestContext.yearId) {
        setGroupId(null);
        replaceContext(chosen?.id ?? null, null);
      } else if (groupId !== requestContext.groupId) {
        setGroupId(requestContext.groupId);
      }
      setError('');
    }).catch((caught: any) => {
      if (isCurrent() && caught.name !== 'AbortError') setError(caught.status === 401 ? 'Your session has expired.' : 'Could not load classroom context.');
    }).finally(() => { if (isCurrent()) setLoading(false); });
    return () => controller.abort();
  }, [location.pathname, location.search, refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const generation = ++groupGeneration.current;
    const requestYearId = yearId;
    const requestGroupId = groupId;
    const requestContext = contextFromUrl();
    const isCurrent = () => generation === groupGeneration.current
      && yearId === requestYearId
      && contextFromUrl().yearId === requestContext.yearId
      && contextFromUrl().groupId === requestContext.groupId;
    if (!yearId || !years.some(year => year.id === yearId)) {
      setGroups([]);
      setGroupId(null);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    workspaceApi.groups(yearId, controller.signal).then(values => {
      if (!isCurrent()) return;
      setGroups(values);
      const chosen = values.find(value => value.id === requestGroupId) ?? values[0] ?? null;
      setGroupId(chosen?.id ?? null);
      if (chosen?.id !== requestGroupId) replaceContext(requestYearId, chosen?.id ?? null);
      setError('');
    }).catch((caught: any) => { if (isCurrent() && caught.name !== 'AbortError') setError(caught.status === 401 ? 'Your session has expired.' : 'Could not load groups.'); })
      .finally(() => { if (isCurrent()) setLoading(false); });
    return () => controller.abort();
  }, [yearId, years, groupId, refreshKey]);

  function selectYear(id: string) {
    ++groupGeneration.current;
    setYearId(id || null);
    setGroups([]);
    setGroupId(null);
    setLoading(true);
    setError('');
    replaceContext(id || null, null);
  }

  function selectGroup(id: string) {
    setGroupId(id || null);
    replaceContext(yearId, id || null);
  }

  const year = useMemo(() => years.find(value => value.id === yearId) ?? null, [years, yearId]);
  const group = useMemo(() => groups.find(value => value.id === groupId) ?? null, [groups, groupId]);
  const refresh = useCallback(() => setRefreshKey(value => value + 1), []);
  return { years, groups, yearId, groupId, year, group, historical: Boolean(year?.archivedAt), loading, error, revision: refreshKey, selectYear, selectGroup, refresh };
}

export function TeacherContextBar({ context, eyebrow = 'Operating class' }: { context: TeacherContext; eyebrow?: string }) {
  const [loadedDisplay, setLoadedDisplay] = useState<{ key: string; value: ProjectionControl } | null>(null);
  const [displayBusy, setDisplayBusy] = useState(false);
  const [loadedDisplayError, setLoadedDisplayError] = useState<{ key: string; message: string } | null>(null);
  const displayKey = context.groupId ? `${context.yearId ?? ''}:${context.groupId}:${context.revision}` : null;

  useEffect(() => {
    const groupId = context.groupId;
    if (!groupId || !displayKey) {
      setLoadedDisplay(null);
      setLoadedDisplayError(null);
      return;
    }
    const requestKey = displayKey;
    let cancelled = false;
    setLoadedDisplay(null);
    setLoadedDisplayError(null);
    gameApi.projectionControl(groupId).then(value => { if (!cancelled) setLoadedDisplay({ key: requestKey, value }); }).catch(() => { if (!cancelled) setLoadedDisplayError({ key: requestKey, message: 'Display status unavailable.' }); });
    return () => { cancelled = true; };
  }, [context.groupId, context.yearId, context.revision, displayKey]);

  const display = loadedDisplay?.key === displayKey ? loadedDisplay.value : null;
  const displayError = loadedDisplayError?.key === displayKey ? loadedDisplayError.message : '';

  async function clearDisplay() {
    if (!context.groupId || displayBusy || context.historical || !display?.resourceId) return;
    const requestKey = displayKey;
    if (!requestKey) return;
    setDisplayBusy(true);
    setLoadedDisplayError(null);
    try {
      setLoadedDisplay({ key: requestKey, value: await gameApi.clearProjection(context.groupId) });
      context.refresh();
    } catch (caught) {
      setLoadedDisplayError({ key: requestKey, message: (caught as Error).message || 'Could not clear the classroom display.' });
    } finally {
      setDisplayBusy(false);
    }
  }

  const displaySummary = display ? displayStatus(display) : null;
  return <div className="game-context-bar">
    <div className="context-bar-heading"><p className="eyebrow">{eyebrow}</p><strong>{context.group?.name ?? 'Choose a classroom'}</strong><span>{context.year?.label ?? 'No school year selected'}</span></div>
    <label>Academic year<select aria-label="Academic year" value={context.yearId ?? ''} onChange={event => context.selectYear(event.target.value)} disabled={!context.years.length}>{context.years.map(year => <option key={year.id} value={year.id}>{year.label}{year.archivedAt ? ' · archived' : ''}</option>)}</select></label>
    <label>Group<select aria-label="Group" value={context.groupId ?? ''} onChange={event => context.selectGroup(event.target.value)} disabled={!context.groups.length}>{context.groups.map(group => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label>
      <div className="context-display-control"><div><span className="context-display-label">Classroom Preview</span><span className="context-display-state">{displaySummary?.label ?? (displayError ? 'Unavailable' : context.groupId ? 'Reading…' : 'Idle')}</span><strong>{displaySummary?.title ?? (displayError || (!context.groupId ? 'Nothing currently displayed' : 'Reading display status…'))}</strong><span className="context-display-detail">{displaySummary?.detail ?? (context.groupId ? 'Checking the current scene.' : 'Choose a classroom to begin.')}</span>{display?.resourceId && <small className="context-display-note">Clear hides every scene; events and challenges stay live, minigames end.</small>}</div>{display?.resourceId && <button type="button" className="quiet-action" disabled={displayBusy || context.historical} onClick={clearDisplay}>{displayBusy ? 'Clearing…' : 'Clear display'}</button>}</div>
   </div>;
}
