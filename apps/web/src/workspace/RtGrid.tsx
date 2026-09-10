import { useEffect, useState } from 'react';
import { workspaceApi, type Group, type RtValue, type Session, type TeacherStudent } from './workspace-api';

export function mapRtSelectValue(value: string): RtValue | null {
  if (value === '10') return 10;
  if (value === '5') return 5;
  if (value === '0') return 0;
  if (value === 'ABSENT') return 'ABSENT';
  return null;
}

export function RtGrid({ group, session, students }: { group: Group; session: Session | null; students: TeacherStudent[] }) {
  const [roster, setRoster] = useState<Awaited<ReturnType<typeof workspaceApi.rtEntries>> | null>(null);
  const [values, setValues] = useState<Record<string, RtValue>>({});
  const [summaries, setSummaries] = useState<Record<string, { average: number | null; energy: string | null; streak: number }>>({});
  const [pending, setPending] = useState<Record<string, { value: RtValue; key: ReturnType<typeof crypto.randomUUID> }>>({});
  const [message, setMessage] = useState('');
  useEffect(() => { if (!session) { setRoster(null); setPending({}); return; } workspaceApi.rtEntries(session.id).then(async value => { setRoster(value); setValues(Object.fromEntries(value.entries.map(entry => [entry.studentId, entry.value]))); setPending({}); const result = await workspaceApi.rtSummaries(group.id, group.academicYearId, value.termId); setSummaries(Object.fromEntries(result.summaries.map(item => [item.studentId, item]))); }).catch(() => setMessage('RT is unavailable.')); }, [session?.id, group.id]);
  if (!session || !roster) return null;
  const sessionId = session.id;
  const readOnly = Boolean(session.endedAt);
   async function save(studentId: string, value: RtValue, key: ReturnType<typeof crypto.randomUUID> = crypto.randomUUID()) { if (readOnly) return; setValues(current => ({ ...current, [studentId]: value })); setMessage(''); try { const result = await workspaceApi.saveRt(sessionId, [{ studentId, value }], key); setPending(current => { const next = { ...current }; delete next[studentId]; return next; }); setRoster(result.value); const updated = await workspaceApi.rtSummaries(group.id, group.academicYearId, result.value.termId); setSummaries(Object.fromEntries(updated.summaries.map(item => [item.studentId, item]))); setMessage('RT saved.'); } catch { setPending(current => ({ ...current, [studentId]: { value, key } })); setMessage('RT could not be saved. Retry.'); } }
   return <section className="panel" aria-label="RT register"><p className="eyebrow">TASK REGISTER · {roster.termId}</p><h2>Class RT</h2>{readOnly&&<p className="read-only-note">Read-only — class ended</p>}<div className="rt-grid">{roster.students.map(student => { const result = summaries[student.studentId]; const identity = students.find(value => value.id === student.studentId); const retry = pending[student.studentId]; return <label key={student.studentId}>{identity?.alias ?? student.studentId.slice(0, 8)}<select aria-label={`RT for ${identity?.alias ?? student.studentId}`} value={values[student.studentId] ?? ''} disabled={readOnly||!!retry} onChange={event => { const value = mapRtSelectValue(event.target.value); if (value !== null) void save(student.studentId, value); }}><option value="">—</option><option value="10">10</option><option value="5">5</option><option value="0">0</option><option value="ABSENT">Ausente</option></select>{retry&&!readOnly&&<button type="button" onClick={() => void save(student.studentId, retry.value, retry.key)}>Retry RT</button>}{result&&<small>{result.average===null?'Sin datos':`${result.average.toFixed(1)} · ${result.energy} · streak ${result.streak}`}</small>}</label>; })}</div>{message&&<p className="status" role="status">{message}</p>}</section>;
}
