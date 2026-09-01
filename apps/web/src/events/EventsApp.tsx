import { useEffect, useState } from 'react';
import { TeacherGate } from '../auth/TeacherGate';
import { gameApi, type ClassroomEvent, type EventTheme } from '../game/game-api';
import { TeacherContextBar, useTeacherContext } from '../app/teacher-context';
import { WorkspaceShell } from '../workspace/WorkspaceShell';

type EventDraft = { id?: string; title: string; description: string; showOnProjection: boolean; theme: EventTheme };
const emptyDraft = (): EventDraft => ({ title: '', description: '', showOnProjection: false, theme: 'MISSION' });

function pageLink(context: ReturnType<typeof useTeacherContext>, route = 'events') {
  const params = new URLSearchParams();
  if (context.yearId) params.set('year', context.yearId);
  if (context.groupId) params.set('group', context.groupId);
  return `/#/${route}${params.toString() ? `?${params}` : ''}`;
}

function EventForm({ draft, busy, onChange, onCancel, onSave }: { draft: EventDraft; busy: boolean; onChange: (value: EventDraft) => void; onCancel: () => void; onSave: (activate: boolean) => void }) {
  return <form className="game-form" onSubmit={event => { event.preventDefault(); onSave(false); }}>
    <div className="form-heading"><div><p className="eyebrow">{draft.id ? 'EDIT EVENT' : 'NEW EVENT'}</p><h2>{draft.id ? 'Refine the classroom moment' : 'Create a classroom moment'}</h2></div><button type="button" className="icon-close" aria-label="Close event form" onClick={onCancel}>×</button></div>
    <label htmlFor="event-title">Title<input id="event-title" required maxLength={120} value={draft.title} onChange={event => onChange({ ...draft, title: event.target.value })} placeholder="e.g. La signal retrouvée" /></label>
    <label htmlFor="event-description">Description<textarea id="event-description" maxLength={500} value={draft.description} onChange={event => onChange({ ...draft, description: event.target.value })} placeholder="What should the class know about this moment?" /></label>
    <div className="form-row"><label htmlFor="event-theme">Theme<select id="event-theme" value={draft.theme} onChange={event => onChange({ ...draft, theme: event.target.value as EventTheme })}><option value="MISSION">Mission</option><option value="NARRATIVE">Narrative</option><option value="CELEBRATION">Celebration</option></select></label><label className="check-control"><input type="checkbox" checked={draft.showOnProjection} onChange={event => onChange({ ...draft, showOnProjection: event.target.checked })} />Show on Classroom Preview</label></div>
    <div className="form-actions"><button type="button" className="secondary-action" disabled={busy} onClick={onCancel}>Cancel</button><button type="submit" disabled={busy || !draft.title.trim()}>{busy ? 'Saving…' : draft.id ? 'Save changes' : 'Save draft'}</button>{!draft.id && <button type="button" className="primary-action" disabled={busy || !draft.title.trim()} onClick={() => onSave(true)}>Save & activate</button>}</div>
  </form>;
}

function EventCard({ event, busy, onEdit, onActivate, onComplete, onArchive, onDisplay }: { event: ClassroomEvent; busy: boolean; onEdit: () => void; onActivate: () => void; onComplete: () => void; onArchive: () => void; onDisplay: () => void }) {
  return <article className={`game-card event-card status-${event.status.toLowerCase()}`}>
    <div className="game-card-topline"><span className={`status-chip status-${event.status.toLowerCase()}`}>{event.status.toLowerCase()}</span><span className="theme-label">{event.theme.toLowerCase()}</span></div>
    <h3>{event.title}</h3>
    <p>{event.description || 'No description yet.'}</p>
    <div className="game-card-actions">{event.status === 'DRAFT' && <button type="button" disabled={busy} onClick={onActivate}>Start event</button>}{event.status === 'ACTIVE' && <button type="button" disabled={busy} onClick={onComplete}>End event</button>}<button type="button" className="secondary-action" disabled={busy} onClick={onEdit}>Edit</button>{event.status === 'ACTIVE' && <button type="button" className="quiet-action" disabled={busy} onClick={onDisplay}>{event.showOnProjection ? 'Hide from Classroom Preview' : 'Show on Classroom Preview'}</button>}<button type="button" className="quiet-action" disabled={busy} onClick={onArchive}>Archive</button></div>
    {event.status === 'ACTIVE' && <div className="display-state"><span className={`display-dot${event.showOnProjection ? ' is-visible' : ''}`} aria-hidden="true" />{event.showOnProjection ? 'Visible on Classroom Preview' : 'Teacher view only'}</div>}
  </article>;
}

function EventsPage() {
  const context = useTeacherContext();
  const [events, setEvents] = useState<ClassroomEvent[]>([]);
  const [form, setForm] = useState<EventDraft | null>(() => window.location.hash.includes('new=1') ? emptyDraft() : null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!context.groupId) { setEvents([]); return; }
    let cancelled = false;
    setLoading(true);
    gameApi.events(context.groupId).then(value => { if (!cancelled) { setEvents(value); setError(''); } }).catch(() => { if (!cancelled) setError('Could not load events.'); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [context.groupId, context.revision]);

  async function save(draft: EventDraft, activate: boolean) {
    if (!context.groupId || busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const value = draft.id ? await gameApi.updateEvent(draft.id, { title: draft.title, description: draft.description, showOnProjection: draft.showOnProjection, theme: draft.theme }) : await gameApi.createEvent(context.groupId, { title: draft.title, description: draft.description, showOnProjection: draft.showOnProjection, theme: draft.theme });
      if (activate && value.status === 'DRAFT') await gameApi.activateEvent(value.id);
      setNotice(activate ? 'Event saved and activated.' : draft.id ? 'Event updated.' : 'Event saved as a draft.');
      setForm(null); context.refresh();
    } catch (caught) { setError((caught as Error).message || 'Could not save event.'); }
    finally { setBusy(false); }
  }

  async function mutate(action: () => Promise<unknown>, message: string) {
    if (busy) return;
    setBusy(true); setError(''); setNotice('');
    try { await action(); setNotice(message); context.refresh(); } catch (caught) { setError((caught as Error).message || 'Could not update event.'); } finally { setBusy(false); }
  }

  const active = events.filter(event => event.status === 'ACTIVE');
  const drafts = events.filter(event => event.status === 'DRAFT');
  const completed = events.filter(event => event.status === 'COMPLETED');
  const projection = context.groupId ? `/#/projection?group=${encodeURIComponent(context.groupId)}` : '/#/projection';

  return <WorkspaceShell activeRoute="events">
    <header className="product-page-header"><div><p className="eyebrow">ACADEMY NOTICE BOARD</p><h1>Events</h1><p className="page-lede">Create a memorable classroom moment without turning it into a calendar.</p></div><div className="page-header-actions"><button type="button" className="primary-action" disabled={!context.groupId || context.historical} onClick={() => setForm(emptyDraft())}>New Event</button><a className="action-link secondary-action" href={projection}>Open Classroom Preview</a></div></header>
    <TeacherContextBar context={context} eyebrow="Event classroom" />
    {form && <EventForm draft={form} busy={busy} onChange={setForm} onCancel={() => setForm(null)} onSave={activate => save(form, activate)} />}
    {notice && <p className="game-notice" role="status">{notice}</p>}{error && <p className="game-error" role="alert">{error}</p>}
    {loading ? <p className="game-loading" role="status">Reading the notice board…</p> : !context.groupId ? <div className="game-empty"><span className="empty-sigil" aria-hidden="true">◇</span><h2>Choose a classroom</h2><p>Select a group above to create and lead events.</p></div> : !events.length ? <div className="game-empty"><span className="empty-sigil" aria-hidden="true">◇</span><h2>No events yet</h2><p>Create a classroom event to introduce a special mission, narrative moment, or activity.</p><button type="button" onClick={() => setForm(emptyDraft())}>Create event</button></div> : <div className="collection-stack">
      {active.length > 0 && <section className="collection-section"><div className="section-heading"><div><p className="eyebrow">LIVE IN THE ROOM</p><h2>Active</h2></div><span className="section-note">{active.length} active</span></div><div className="game-card-grid">{active.map(event => <EventCard key={event.id} event={event} busy={busy} onEdit={() => setForm({ id: event.id, title: event.title, description: event.description, showOnProjection: event.showOnProjection, theme: event.theme })} onActivate={() => mutate(() => gameApi.activateEvent(event.id), 'Event activated.')} onComplete={() => mutate(() => gameApi.completeEvent(event.id), 'Event completed.')} onArchive={() => mutate(() => gameApi.archiveEvent(event.id), 'Event archived.')} onDisplay={() => mutate(() => gameApi.displayEvent(event.id, !event.showOnProjection), event.showOnProjection ? 'Event hidden from Classroom Preview.' : 'Event shown on Classroom Preview.')} />)}</div></section>}
      {drafts.length > 0 && <section className="collection-section"><div className="section-heading"><div><p className="eyebrow">READY TO LEAD</p><h2>Drafts</h2></div><span className="section-note">{drafts.length} waiting</span></div><div className="game-card-grid">{drafts.map(event => <EventCard key={event.id} event={event} busy={busy} onEdit={() => setForm({ id: event.id, title: event.title, description: event.description, showOnProjection: event.showOnProjection, theme: event.theme })} onActivate={() => mutate(() => gameApi.activateEvent(event.id), 'Event activated.')} onComplete={() => mutate(() => gameApi.completeEvent(event.id), 'Event completed.')} onArchive={() => mutate(() => gameApi.archiveEvent(event.id), 'Event archived.')} onDisplay={() => mutate(() => gameApi.displayEvent(event.id, !event.showOnProjection), event.showOnProjection ? 'Event hidden from Classroom Preview.' : 'Event shown on Classroom Preview.')} />)}</div></section>}
      {completed.length > 0 && <section className="collection-section"><div className="section-heading"><div><p className="eyebrow">FIELD NOTES</p><h2>Completed</h2></div><span className="section-note">{completed.length} archived moments</span></div><div className="game-card-grid">{completed.map(event => <EventCard key={event.id} event={event} busy={busy} onEdit={() => setForm({ id: event.id, title: event.title, description: event.description, showOnProjection: event.showOnProjection, theme: event.theme })} onActivate={() => mutate(() => gameApi.activateEvent(event.id), 'Event activated.')} onComplete={() => mutate(() => gameApi.completeEvent(event.id), 'Event completed.')} onArchive={() => mutate(() => gameApi.archiveEvent(event.id), 'Event archived.')} onDisplay={() => mutate(() => gameApi.displayEvent(event.id, !event.showOnProjection), event.showOnProjection ? 'Event hidden from Classroom Preview.' : 'Event shown on Classroom Preview.')} />)}</div></section>}
    </div>}
  </WorkspaceShell>;
}

export function EventsApp() { return <TeacherGate activeRoute="events"><EventsPage /></TeacherGate>; }
