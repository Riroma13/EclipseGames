import { useEffect, useState } from 'react';
import { workspaceApi, type AcademicYear, type ApiFailure, type Group } from './workspace-api';

type Draft = { realName: string; alias: string };
const emptyDraft = (): Draft => ({ realName: '', alias: '' });

export function ClassroomSetup({ years: providedYears, groups: providedGroups, yearId: providedYearId, onCreated = () => window.location.reload() }: { years?: AcademicYear[]; groups?: Group[]; yearId?: string | null; onCreated?: () => void }) {
  const [loadedYears, setLoadedYears] = useState<AcademicYear[]>(providedYears ?? []);
  const [loadedGroups, setLoadedGroups] = useState<Group[]>(providedGroups ?? []);
  const [loadedYearId, setLoadedYearId] = useState<string | null>(providedYearId ?? null);
  const [ready, setReady] = useState(providedYears !== undefined);
  const [accessible, setAccessible] = useState(providedYears !== undefined);
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState({ label: '', startsOn: '', endsOn: '' });
  const [groupName, setGroupName] = useState('');
  const [drafts, setDrafts] = useState<Draft[]>([emptyDraft()]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (providedYears !== undefined) { setLoadedYears(providedYears); setLoadedGroups(providedGroups ?? []); setLoadedYearId(providedYearId ?? null); return; }
    const controller = new AbortController();
    workspaceApi.years(false, controller.signal).then(values => { setLoadedYears(values); setLoadedYearId(values.find(value => !value.archivedAt)?.id ?? null); setAccessible(true); }).then(() => setReady(true)).catch(() => setReady(true));
    return () => controller.abort();
  }, [providedYears, providedGroups, providedYearId]);
  useEffect(() => { if (!loadedYearId || providedYears !== undefined) return; const controller = new AbortController(); workspaceApi.groups(loadedYearId, controller.signal).then(setLoadedGroups).catch(() => setLoadedGroups([])); return () => controller.abort(); }, [loadedYearId, providedYears]);
  const years = loadedYears; const groups = loadedGroups; const yearId = providedYearId === undefined ? loadedYearId : providedYearId;
  const writableYear = years.find(value => value.id === yearId && !value.archivedAt);
  const hasWritableGroup = groups.some(group => group.academicYearId === writableYear?.id);

  function addStudent() { if (drafts.length < 30) setDrafts(current => [...current, emptyDraft()]); }
  function updateStudent(index: number, field: keyof Draft, value: string) { setDrafts(current => current.map((draft, item) => item === index ? { ...draft, [field]: value } : draft)); }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (pending) return; setPending(true); setError('');
    try {
      let currentYear = writableYear;
      if (!currentYear) currentYear = (await workspaceApi.createYear(year)).value;
      let currentGroup = groups.find(value => value.academicYearId === currentYear.id);
      if (!currentGroup) currentGroup = (await workspaceApi.createGroup(currentYear.id, groupName)).value;
      await workspaceApi.createStudents(currentGroup.id, drafts);
      setOpen(false); onCreated();
    } catch (caught) {
      const failure = caught as ApiFailure;
      setError(failure.status === 409 ? 'This classroom value already exists. Check the current context and try again.' : failure.status === 422 ? 'Check the classroom details and student rows.' : failure.message || 'Could not create the classroom. Try again.');
    } finally { setPending(false); }
  }

  if (!ready || !accessible || (writableYear && hasWritableGroup)) return null;
  return <section className="classroom-setup" aria-label="Classroom setup">
    <button type="button" className="setup-toggle" aria-expanded={open} onClick={() => setOpen(value => !value)}>{open ? 'Close classroom setup' : 'Set up a classroom'}</button>
    {open && <form className="setup-form" onSubmit={submit}><div><p className="eyebrow">MINIMAL SETUP</p><h2>{writableYear ? `Add a group to ${writableYear.label}` : 'Create a classroom context'}</h2><p className="muted">Create one context and up to 30 students, then return to the roster.</p></div>{!writableYear && <><label htmlFor="setup-year-label">School year<input id="setup-year-label" required value={year.label} onChange={event => setYear({ ...year, label: event.target.value })} placeholder="2026–2027" /></label><div className="setup-dates"><label htmlFor="setup-year-start">Starts<input id="setup-year-start" required type="date" value={year.startsOn} onChange={event => setYear({ ...year, startsOn: event.target.value })} /></label><label htmlFor="setup-year-end">Ends<input id="setup-year-end" required type="date" value={year.endsOn} onChange={event => setYear({ ...year, endsOn: event.target.value })} /></label></div></>}<label htmlFor="setup-group-name">Group name<input id="setup-group-name" required value={groupName} onChange={event => setGroupName(event.target.value)} placeholder="Group A" /></label><fieldset><legend>Students (1–30)</legend>{drafts.map((draft, index) => <div className="student-draft" key={index}><label htmlFor={`setup-student-name-${index}`}>Name<input id={`setup-student-name-${index}`} required value={draft.realName} onChange={event => updateStudent(index, 'realName', event.target.value)} /></label><label htmlFor={`setup-student-alias-${index}`}>Alias<input id={`setup-student-alias-${index}`} required value={draft.alias} onChange={event => updateStudent(index, 'alias', event.target.value)} /></label></div>)}<button type="button" className="quiet-button" disabled={drafts.length >= 30} onClick={addStudent}>Add student</button></fieldset><button type="submit" disabled={pending}>{pending ? 'Creating classroom…' : 'Create classroom'}</button>{error && <p className="error" role="alert">{error}</p>}</form>}
  </section>;
}
