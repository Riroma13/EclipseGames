import { useEffect, useMemo, useRef, useState } from 'react';
import { workspaceApi, type AcademicYear, type Calendar, type Group, type HistoryFamily, type HistoryItem, type TeacherStudent } from './workspace-api';

const families: Array<{ value: HistoryFamily; label: string }> = [
  ['SESSION','Sesiones'], ['XP','XP'], ['RT','RT'], ['GEM','Gemas'], ['LEGACY_COIN','Monedas heredadas'], ['BEHAVIOUR','Conducta'], ['RUBRIC','Rúbrica'], ['TERM_CLOSE','Cierre de curso'], ['AVATAR','Avatar'], ['BOUTIQUE','Boutique'], ['CLASSROOM_EVENT','Eventos de aula'], ['CHALLENGE','Desafíos'], ['MINIGAME','Minijuegos'],
].map(([value, label]) => ({ value: value as HistoryFamily, label }));
type FilterState = { studentId:string; termId:string; family:''|HistoryFamily; from:string; to:string };
const emptyFilters: FilterState = { studentId:'', termId:'', family:'', from:'', to:'' };
function paramsFromUrl() { return new URLSearchParams(window.location.hash.split('?')[1] ?? window.location.search); }
function readFilters(): FilterState { const p = paramsFromUrl(); return { studentId:p.get('historyStudent') ?? '', termId:p.get('historyTerm') ?? '', family:(p.get('historyFamily') as FilterState['family']) ?? '', from:p.get('historyFrom') ?? '', to:p.get('historyTo') ?? '' }; }
function dateBoundary(value:string, end:boolean) { if (!value) return undefined; return end ? new Date(`${value}T00:00:00.000Z`).toISOString() : new Date(`${value}T00:00:00.000Z`).toISOString(); }
function nextDay(value:string) { if (!value) return undefined; const date = new Date(`${value}T00:00:00.000Z`); date.setUTCDate(date.getUTCDate() + 1); return date.toISOString(); }
function errorMessage(error: any) { if (error?.status === 401) return 'La sesión ha caducado. Inicia sesión de nuevo.'; if (error?.status === 422) return 'Revisa los filtros de historial.'; return 'El historial no está disponible. Puedes reintentarlo.'; }

export function HistoryPanel({ group, year, students, onSessionExpired }: { group:Group; year:AcademicYear; students:TeacherStudent[]; onSessionExpired:() => void }) {
  const [filters, setFilters] = useState<FilterState>(() => readFilters());
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [cursor, setCursor] = useState<string|null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [loadMoreError, setLoadMoreError] = useState('');
  const [retry, setRetry] = useState(0);
  const [calendar, setCalendar] = useState<Calendar | null>(null);
  const generation = useRef(0);
  const loadMoreController = useRef<AbortController | null>(null);
  const terms = calendar?.configured ? calendar.terms : [];
  const filterKey = useMemo(() => JSON.stringify(filters), [filters]);

  useEffect(() => { const controller = new AbortController(); workspaceApi.calendar(year.id, controller.signal).then(setCalendar).catch(() => undefined); return () => controller.abort(); }, [year.id]);
  useEffect(() => {
    const onUrl = () => setFilters(readFilters()); window.addEventListener('hashchange', onUrl); window.addEventListener('popstate', onUrl); return () => { window.removeEventListener('hashchange', onUrl); window.removeEventListener('popstate', onUrl); };
  }, []);
  function updateUrl(next:FilterState) { const p = paramsFromUrl(); for (const [key, value] of Object.entries({ historyStudent:next.studentId, historyTerm:next.termId, historyFamily:next.family, historyFrom:next.from, historyTo:next.to })) { if (value) p.set(key, value); else p.delete(key); } const context = ['year','group','student'].map(key => { const value = p.get(key); return value ? `${key}=${encodeURIComponent(value)}` : ''; }).filter(Boolean); for (const key of ['historyStudent','historyTerm','historyFamily','historyFrom','historyTo']) { const value = p.get(key); if (value) context.push(`${key}=${encodeURIComponent(value)}`); } window.history.replaceState(null, '', `/#/workspace?${context.join('&')}`); setFilters(next); }
  function requestFilters() { return { academicYearId:year.id, studentId:filters.studentId || undefined, termId:filters.termId || undefined, family:filters.family || undefined, from:dateBoundary(filters.from, false), to:nextDay(filters.to), limit:25 }; }
  useEffect(() => {
    const controller = new AbortController(); const current = ++generation.current; loadMoreController.current?.abort(); setLoading(true); setLoadingMore(false); setItems([]); setCursor(null); setError(''); setLoadMoreError('');
    workspaceApi.history(group.id, requestFilters(), controller.signal).then(result => { if (current !== generation.current) return; const safe = result && !Array.isArray(result) ? result : { items: [], nextCursor: null }; setItems(safe.items ?? []); setCursor(safe.nextCursor ?? null); }).catch((caught:any) => { if (caught.name === 'AbortError' || current !== generation.current) return; setItems([]); setCursor(null); setError(errorMessage(caught)); if (caught.status === 401) onSessionExpired(); }).finally(() => { if (current === generation.current) setLoading(false); });
    return () => { controller.abort(); loadMoreController.current?.abort(); };
  }, [group.id, year.id, filterKey, retry]);
  async function loadMore() { if (!cursor || loadingMore) return; const current = generation.current; const controller = new AbortController(); loadMoreController.current = controller; setLoadingMore(true); setLoadMoreError(''); try { const result = await workspaceApi.history(group.id, { ...requestFilters(), cursor }, controller.signal); if (current !== generation.current) return; setItems(previous => { const seen = new Set(previous.map(item => item.id)); return [...previous, ...result.items.filter(item => !seen.has(item.id))]; }); setCursor(result.nextCursor); } catch (caught:any) { if (caught.name !== 'AbortError' && current === generation.current) { setLoadMoreError(errorMessage(caught)); if (caught.status === 401) onSessionExpired(); } } finally { if (current === generation.current) setLoadingMore(false); if (loadMoreController.current === controller) loadMoreController.current = null; } }
  function reset() { updateUrl(emptyFilters); }
  return <section className="history-panel panel" aria-labelledby="history-title">
    <div className="activity-heading"><div><p className="eyebrow">HISTORIAL PRIVADO</p><h2 id="history-title">Historial</h2></div><span>{items.length} registros</span></div>
    <div className="history-filters" aria-label="Filtros de historial">
      <label>Estudiante<select aria-label="Estudiante" value={filters.studentId} onChange={e => updateUrl({...filters, studentId:e.target.value})}><option value="">Todo el grupo</option>{students.map(student => <option key={student.id} value={student.id}>{student.alias}</option>)}</select></label>
      <label>Curso<select aria-label="Curso" value={filters.termId} onChange={e => updateUrl({...filters, termId:e.target.value})}><option value="">Todo el curso</option>{terms.map(term => <option key={term.id} value={term.id}>{term.code}</option>)}</select></label>
      <label>Familia<select aria-label="Familia" value={filters.family} onChange={e => updateUrl({...filters, family:e.target.value as FilterState['family']})}><option value="">Todas</option>{families.map(family => <option key={family.value} value={family.value}>{family.label}</option>)}</select></label>
      <label>Desde<input aria-label="Desde" type="date" value={filters.from} onChange={e => updateUrl({...filters, from:e.target.value})} /></label><label>Hasta<input aria-label="Hasta" type="date" value={filters.to} onChange={e => updateUrl({...filters, to:e.target.value})} /></label>
      <button type="button" className="quiet-button" onClick={reset} disabled={JSON.stringify(filters) === JSON.stringify(emptyFilters)}>Restablecer</button>
    </div>
    <div aria-live="polite" className="sr-status">{loading ? 'Cargando historial…' : error || (items.length ? `${items.length} registros cargados.` : 'No hay registros para estos filtros.')}</div>
    {loading && <p className="status" role="status">Cargando historial…</p>}
    {!loading && error && <p className="error" role="alert">{error} <button type="button" onClick={() => setRetry(value => value + 1)}>Reintentar</button></p>}
    {!loading && !error && !items.length && <p className="empty-state">{Object.values(filters).some(Boolean) ? 'No hay registros con estos filtros.' : 'Todavía no hay historial cerrado.'}</p>}
    {!loading && !error && <ol className="history-list">{items.map(item => <li key={item.id} className="history-item"><span className={`history-family family-${item.family.toLowerCase()}`}>{item.family}</span><div><strong>{item.title}</strong><p>{item.summary}</p>{item.student && <small>{item.student.alias} · {item.student.realName}</small>}{item.correction && <span className="history-correction">{item.correction.state === 'ACTIVE' ? 'Estado actual' : item.correction.state === 'CORRECTED' ? 'Corregido' : 'Revertido'}</span>}</div><time dateTime={item.occurredAt}>{new Date(item.occurredAt).toLocaleString('es-ES')}</time></li>)}</ol>}
    {!loading && !error && loadMoreError && <p className="error" role="alert">{loadMoreError} <button type="button" onClick={() => void loadMore()}>Reintentar</button></p>}
    {!loading && !error && cursor && <button type="button" onClick={() => void loadMore()} disabled={loadingMore}>{loadingMore ? 'Cargando…' : 'Cargar más'}</button>}
    {!loading && !error && !cursor && items.length > 0 && <p className="muted">No hay más registros.</p>}
    <p className="read-only-note" role="status">El historial es de solo lectura. Los registros archivados permanecen visibles.</p>
  </section>;
}
