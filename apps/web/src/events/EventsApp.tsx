import { useEffect, useRef, useState } from 'react';
import { TeacherGate } from '../auth/TeacherGate';
import { isCurrentDisplay } from '../app/display-status';
import { gameApi, type ClassroomEvent, type EventStatus, type EventTheme, type ProjectionControl } from '../game/game-api';
import { TeacherContextBar, useTeacherContext } from '../app/teacher-context';
import { WorkspaceShell } from '../workspace/WorkspaceShell';

type EventDraft = { id?: string; status?: EventStatus; createRequestId?: ReturnType<Crypto['randomUUID']>; title: string; description: string; showOnProjection: boolean; theme: EventTheme };
const emptyDraft = (): EventDraft => ({ createRequestId: crypto.randomUUID(), title: '', description: '', showOnProjection: false, theme: 'MISSION' });

function pageLink(context: ReturnType<typeof useTeacherContext>, route = 'events') {
  const params = new URLSearchParams();
  if (context.yearId) params.set('year', context.yearId);
  if (context.groupId) params.set('group', context.groupId);
  return `/#/${route}${params.toString() ? `?${params}` : ''}`;
}

function EventForm({ draft, busy, readOnly, onChange, onCancel, onSave }: { draft: EventDraft; busy: boolean; readOnly: boolean; onChange: (value: EventDraft) => void; onCancel: () => void; onSave: (activate: boolean) => void }) {
  return <form className="game-form" onSubmit={event => { event.preventDefault(); onSave(false); }}>
    <div className="form-heading"><div><p className="eyebrow">{draft.id ? 'EDIT EVENT' : 'NEW EVENT'}</p><h2>{draft.id ? 'Refine the classroom moment' : 'Create a classroom moment'}</h2></div><button type="button" className="icon-close" aria-label="Close event form" onClick={onCancel}>×</button></div>
    {readOnly && <p className="read-only-note" role="status">Historical year — this event is read-only.</p>}
    <label htmlFor="event-title">Title<input id="event-title" required maxLength={120} value={draft.title} disabled={readOnly || busy} onChange={event => onChange({ ...draft, title: event.target.value })} placeholder="e.g. La signal retrouvée" /></label>
    <label htmlFor="event-description">Description<textarea id="event-description" maxLength={500} value={draft.description} disabled={readOnly || busy} onChange={event => onChange({ ...draft, description: event.target.value })} placeholder="What should the class know about this moment?" /></label>
    <div className="form-row"><label htmlFor="event-theme">Theme<select id="event-theme" value={draft.theme} disabled={readOnly || busy} onChange={event => onChange({ ...draft, theme: event.target.value as EventTheme })}><option value="MISSION">Mission</option><option value="NARRATIVE">Narrative</option><option value="CELEBRATION">Celebration</option></select></label><label className="check-control"><input type="checkbox" checked={draft.showOnProjection} disabled={readOnly || busy} onChange={event => onChange({ ...draft, showOnProjection: event.target.checked })} />Show on Classroom Preview</label></div>
    <div className="form-actions"><button type="button" className="secondary-action" disabled={busy} onClick={onCancel}>Cancel</button><button type="submit" disabled={busy || readOnly || !draft.title.trim()}>{busy ? 'Saving…' : draft.id ? 'Save changes' : 'Save draft'}</button>{(!draft.id || draft.status === 'DRAFT') && <button type="button" className="primary-action" disabled={busy || readOnly || !draft.title.trim()} onClick={() => onSave(true)}>Save & activate</button>}</div>
  </form>;
}

function EventCard({ event, display, busy, readOnly, onEdit, onActivate, onComplete, onArchive, onDisplay }: { event: ClassroomEvent; display: ProjectionControl | null; busy: boolean; readOnly: boolean; onEdit: () => void; onActivate: () => void; onComplete: () => void; onArchive: () => void; onDisplay: () => void }) {
  const onClassroomDisplay = isCurrentDisplay(display, 'EVENT', event.id);
  return <article className={`game-card event-card status-${event.status.toLowerCase()}`}>
    <div className="game-card-topline"><span className={`status-chip status-${event.status.toLowerCase()}`}>{event.status.toLowerCase()}</span><span className="theme-label">{event.theme.toLowerCase()}</span></div>
    <h3>{event.title}</h3>
    <p>{event.description || 'No description yet.'}</p>
    <div className="game-card-actions">{event.status === 'DRAFT' && <button type="button" disabled={busy || readOnly} onClick={onActivate}>Start event</button>}{event.status === 'ACTIVE' && <button type="button" disabled={busy || readOnly} onClick={onComplete}>End event</button>}<button type="button" className="secondary-action" disabled={busy || readOnly} onClick={onEdit}>Edit</button>{event.status === 'ACTIVE' && <button type="button" className="quiet-action" disabled={busy || readOnly} onClick={onDisplay}>{event.showOnProjection ? 'Hide from Classroom Preview' : 'Show on Classroom Preview'}</button>}<button type="button" className="quiet-action" disabled={busy || readOnly} onClick={onArchive}>Archive</button></div>
    {event.status === 'ACTIVE' && <div className="display-state"><span className={`display-dot${onClassroomDisplay ? ' is-visible' : ''}`} aria-hidden="true" />{display ? onClassroomDisplay ? 'Visible on Classroom Preview' : 'Teacher view only' : 'Checking Classroom Preview status…'}</div>}
  </article>;
}

function EventsPage() {
  const context = useTeacherContext();
  const initialQuery = window.location.hash.split('?')[1] ?? window.location.search;
  const initialParams = new URLSearchParams(initialQuery);
  const initialCreateIntent = useRef(initialParams.get('new') === '1' && Boolean(initialParams.get('group')));
  const initialCreateContextKey = useRef(initialCreateIntent.current ? `${initialParams.get('year') ?? ''}:${initialParams.get('group') ?? ''}` : null);
  const [events, setEvents] = useState<ClassroomEvent[]>([]);
  const [form, setForm] = useState<EventDraft | null>(() => window.location.hash.includes('new=1') ? emptyDraft() : null);
  const settledContextKey = useRef<string | null>(null);
  const [loadedContextKey, setLoadedContextKey] = useState<string | null>(null);
  const [loadedDisplay, setLoadedDisplay] = useState<{ key: string; value: ProjectionControl } | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const groupId = context.groupId;
    if (!groupId) { setEvents([]); setLoadedContextKey(null); setLoading(false); return; }
    const requestKey = `${context.yearId ?? ''}:${groupId}:${context.revision}`;
    let cancelled = false;
    setLoading(true);
    setLoadedContextKey(null);
    setEvents([]);
    setError('');
    gameApi.events(groupId).then(value => { if (!cancelled) { setEvents(value); setLoadedContextKey(requestKey); setError(''); } }).catch(() => { if (!cancelled) { setEvents([]); setLoadedContextKey(null); setError('Could not load events.'); } }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [context.groupId, context.yearId, context.revision]);

  useEffect(() => {
    const groupId = context.groupId;
    if (!groupId) { setLoadedDisplay(null); return; }
    const requestKey = `${context.yearId ?? ''}:${groupId}:${context.revision}`;
    let cancelled = false;
    setLoadedDisplay(null);
    gameApi.projectionControl(groupId).then(value => { if (!cancelled) setLoadedDisplay({ key: requestKey, value }); }).catch(() => { if (!cancelled) setLoadedDisplay(null); });
    return () => { cancelled = true; };
  }, [context.groupId, context.yearId, context.revision]);

  useEffect(() => {
    const resolvedContextKey = context.year && context.group && context.yearId && context.groupId ? `${context.yearId}:${context.groupId}` : null;
    if (context.error || context.historical) {
      setForm(null);
      return;
    }
    if (resolvedContextKey) {
      if ((initialCreateContextKey.current && initialCreateContextKey.current !== resolvedContextKey) || (settledContextKey.current && settledContextKey.current !== resolvedContextKey)) setForm(null);
      settledContextKey.current = resolvedContextKey;
      return;
    }
    if (!initialCreateIntent.current || settledContextKey.current) setForm(null);
  }, [context.error, context.historical, context.group, context.groupId, context.year, context.yearId]);

  const currentContextKey = context.groupId ? `${context.yearId ?? ''}:${context.groupId}:${context.revision}` : null;
  const dataReady = loadedContextKey !== null && loadedContextKey === currentContextKey;
  const visibleEvents = dataReady ? events : [];
  const display = loadedDisplay?.key === currentContextKey ? loadedDisplay.value : null;

  async function save(draft: EventDraft, activate: boolean) {
    if (!context.groupId || context.historical || busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
       const saved = draft.id ? await gameApi.updateEvent(draft.id, { title: draft.title, description: draft.description, showOnProjection: draft.showOnProjection, theme: draft.theme }) : await gameApi.createEvent(context.groupId, { title: draft.title, description: draft.description, showOnProjection: draft.showOnProjection, theme: draft.theme }, draft.createRequestId);
      const replaceEvent = (value: ClassroomEvent) => setEvents(current => current.some(item => item.id === value.id) ? current.map(item => item.id === value.id ? value : item) : [value, ...current]);
      replaceEvent(saved);
      if (activate && saved.status === 'DRAFT') {
        try {
          const activated = await gameApi.activateEvent(saved.id);
          replaceEvent(activated);
          setNotice('Event saved and activated.');
          setForm(null);
          context.refresh();
        } catch (caught) {
          setForm({ ...draft, id: saved.id, status: 'DRAFT' });
          setNotice('Event draft saved. Activation failed; retry activation.');
          setError((caught as Error).message || 'Could not activate the saved event.');
        }
        return;
      }
      setNotice(draft.id ? 'Event updated.' : 'Event saved as a draft.');
      setForm(null); context.refresh();
    } catch (caught) { setError((caught as Error).message || 'Could not save event.'); }
    finally { setBusy(false); }
  }

  async function mutate(action: () => Promise<unknown>, message: string) {
    if (context.historical || busy) return;
    setBusy(true); setError(''); setNotice('');
    try { await action(); setNotice(message); context.refresh(); } catch (caught) { setError((caught as Error).message || 'Could not update event.'); } finally { setBusy(false); }
  }

  const active = visibleEvents.filter(event => event.status === 'ACTIVE');
  const drafts = visibleEvents.filter(event => event.status === 'DRAFT');
  const completed = visibleEvents.filter(event => event.status === 'COMPLETED');
  const projection = context.groupId ? `/#/projection?group=${encodeURIComponent(context.groupId)}` : '/#/projection';

  return <WorkspaceShell activeRoute="events">
     <header className="product-page-header"><div><p className="eyebrow">ACADEMY NOTICE BOARD</p><h1>Events</h1><p className="page-lede">Create a memorable classroom moment without turning it into a calendar.</p></div><div className="page-header-actions"><button type="button" className="primary-action" disabled={!context.groupId || context.historical} onClick={() => setForm(emptyDraft())}>New Event</button><a className="action-link secondary-action" href={projection}>Open Classroom Preview</a></div></header>
     <TeacherContextBar context={context} eyebrow="Event classroom" />
     {context.historical && <p className="read-only-note" role="status">Historical year — events are read-only. You can review their content, but cannot create, edit, activate, archive, or change display state.</p>}
     {form && <EventForm draft={form} busy={busy} readOnly={context.historical} onChange={setForm} onCancel={() => setForm(null)} onSave={activate => save(form, activate)} />}
     {notice && <p className="game-notice" role="status">{notice}</p>}{error && <p className="game-error" role="alert">{error}</p>}
     {(loading || (context.groupId && !dataReady)) ? <p className="game-loading" role="status">Reading the notice board…</p> : !context.groupId ? <div className="game-empty"><span className="empty-sigil" aria-hidden="true">◇</span><h2>Choose a classroom</h2><p>Select a group above to create and lead events.</p></div> : !visibleEvents.length ? <div className="game-empty"><span className="empty-sigil" aria-hidden="true">◇</span><h2>No events yet</h2><p>{context.historical ? 'There are no events recorded for this historical classroom.' : 'Create a classroom event to introduce a special mission, narrative moment, or activity.'}</p><button type="button" disabled={context.historical} onClick={() => setForm(emptyDraft())}>Create event</button></div> : <div className="collection-stack">
       {active.length > 0 && <section className="collection-section"><div className="section-heading"><div><p className="eyebrow">LIVE IN THE ROOM</p><h2>Active</h2></div><span className="section-note">{active.length} active</span></div><div className="game-card-grid">{active.map(event => <EventCard key={event.id} event={event} display={display} busy={busy} readOnly={context.historical} onEdit={() => setForm({ id: event.id, status: event.status, title: event.title, description: event.description, showOnProjection: event.showOnProjection, theme: event.theme })} onActivate={() => mutate(() => gameApi.activateEvent(event.id), 'Event activated.')} onComplete={() => mutate(() => gameApi.completeEvent(event.id), 'Event completed.')} onArchive={() => mutate(() => gameApi.archiveEvent(event.id), 'Event archived.')} onDisplay={() => mutate(() => gameApi.displayEvent(event.id, !event.showOnProjection), event.showOnProjection ? 'Event hidden from Classroom Preview.' : 'Event shown on Classroom Preview.')} />)}</div></section>}
       {drafts.length > 0 && <section className="collection-section"><div className="section-heading"><div><p className="eyebrow">READY TO LEAD</p><h2>Drafts</h2></div><span className="section-note">{drafts.length} waiting</span></div><div className="game-card-grid">{drafts.map(event => <EventCard key={event.id} event={event} display={display} busy={busy} readOnly={context.historical} onEdit={() => setForm({ id: event.id, status: event.status, title: event.title, description: event.description, showOnProjection: event.showOnProjection, theme: event.theme })} onActivate={() => mutate(() => gameApi.activateEvent(event.id), 'Event activated.')} onComplete={() => mutate(() => gameApi.completeEvent(event.id), 'Event completed.')} onArchive={() => mutate(() => gameApi.archiveEvent(event.id), 'Event archived.')} onDisplay={() => mutate(() => gameApi.displayEvent(event.id, !event.showOnProjection), event.showOnProjection ? 'Event hidden from Classroom Preview.' : 'Event shown on Classroom Preview.')} />)}</div></section>}
        {completed.length > 0 && <section className="collection-section"><div className="section-heading"><div><p className="eyebrow">FIELD NOTES</p><h2>Completed</h2></div><span className="section-note">{completed.length} completed</span></div><div className="game-card-grid">{completed.map(event => <EventCard key={event.id} event={event} display={display} busy={busy} readOnly={context.historical} onEdit={() => setForm({ id: event.id, status: event.status, title: event.title, description: event.description, showOnProjection: event.showOnProjection, theme: event.theme })} onActivate={() => mutate(() => gameApi.activateEvent(event.id), 'Event activated.')} onComplete={() => mutate(() => gameApi.completeEvent(event.id), 'Event completed.')} onArchive={() => mutate(() => gameApi.archiveEvent(event.id), 'Event archived.')} onDisplay={() => mutate(() => gameApi.displayEvent(event.id, !event.showOnProjection), event.showOnProjection ? 'Event hidden from Classroom Preview.' : 'Event shown on Classroom Preview.')} />)}</div></section>}
    </div>}
  </WorkspaceShell>;
}

export function EventsApp() { return <TeacherGate activeRoute="events"><EventsPage /></TeacherGate>; }
