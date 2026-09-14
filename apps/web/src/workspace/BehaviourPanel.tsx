import { useEffect, useState } from 'react';
import { workspaceApi, type ApiFailure, type BehaviourStudentState, type Session } from './workspace-api';
import type { WorkspaceStudentContext } from './workspace-state';
import type { TeacherStudent } from './workspace-api';

const stateLabels = { NORMAL:'Normal', VIGILANCE:'Vigilancia', ALERT:'Alerta', RED_CODE:'Código Rojo' } as const;

export function BehaviourPanel({ student, context, session, readOnly, onFeedback }: { student:TeacherStudent; context:WorkspaceStudentContext; session:Session|null; readOnly:boolean; onFeedback:(message:string)=>void }) {
  const [value, setValue] = useState<BehaviourStudentState|null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [retry, setRetry] = useState(0);
  const scope = `${session?.id ?? 'none'}:${context.studentId}:${context.academicYearId}:${context.groupId}`;

  useEffect(() => {
    if (!session || session.groupId !== context.groupId || session.academicYearId !== context.academicYearId) { setValue(null); setError(''); setLoading(false); return; }
    const controller = new AbortController();
    setLoading(true); setError(''); setValue(null);
    workspaceApi.behaviour(session.id, controller.signal).then(result => {
      if (!controller.signal.aborted) setValue(result.students.find(item => item.studentId === student.id) ?? null);
    }).catch((caught:ApiFailure) => { if (caught.name !== 'AbortError') setError('No se pudo cargar Vidas. Reintentar.'); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [scope, retry]);

  async function mutate(run:(key:string)=>Promise<{value:BehaviourStudentState}>, success:string) {
    if (!session || !value || pending || readOnly) return;
    setPending(true); setError('');
    try { const result = await run(crypto.randomUUID()); setValue(result.value); onFeedback(success); }
    catch (caught) { setError((caught as ApiFailure).status === 409 ? 'La acción ya no está disponible.' : 'No se pudo guardar. Reintentar.'); }
    finally { setPending(false); }
  }
  const disabled = readOnly || pending || loading || !value;
  return <section className="behaviour-panel panel-section" aria-label="Vidas y estado de comportamiento">
    <div className="action-heading"><div><p className="eyebrow">SEGUIMIENTO PRIVADO</p><h3>Vidas</h3></div>{value && <strong className={`behaviour-state behaviour-${value.state}`}>{stateLabels[value.state]}</strong>}</div>
    {!session ? <p className="empty-state">No hay una clase activa para este grupo.</p> : loading ? <p className="status" role="status">Cargando Vidas…</p> : error ? <p className="action-error" role="alert">{error}<button type="button" className="quiet-button" onClick={() => setRetry(item => item + 1)}>Reintentar</button></p> : !value ? <p className="empty-state">Este estudiante no está en la clase activa.</p> : <>
      <p className="behaviour-lives" aria-label={`${value.lives} vidas`}>{'●'.repeat(value.lives)}{'○'.repeat(4-value.lives)} <strong>{value.lives}/4</strong></p>
      {readOnly && <p className="read-only-note" role="status">Este registro es de solo lectura.</p>}
      <div className="behaviour-actions"><button type="button" disabled={disabled || value.lives === 0} onClick={() => void mutate(key => workspaceApi.loseLife(session.id, student.id, key), 'Vida quitada.')}>Quitar vida</button><button type="button" disabled={disabled || value.lives === 4} onClick={() => void mutate(key => workspaceApi.restoreLife(session.id, student.id, key), 'Vida restaurada.')}>Restaurar vida</button><button type="button" disabled={disabled || !value.lastActionId} onClick={() => void mutate(key => workspaceApi.correctBehaviourAction(value.lastActionId!, key), 'Deshacer aplicado.')}>Deshacer</button></div>
      {value.incidentStatus === 'ACTIVE' && <p className="action-status">Parte leve activa en esta clase.</p>}
      {value.proposal?.status === 'OPEN' && <div className="behaviour-proposal"><strong>Propuesta de parte leve</strong><span>Revisa antes de confirmar. No se registra automáticamente.</span><button type="button" disabled={disabled} onClick={() => void (async () => { try { await workspaceApi.dismissBehaviourProposal(value.proposal!.id); setValue(current => current ? {...current, proposal:{...current.proposal!, status:'DISMISSED'}} : current); onFeedback('Propuesta descartada.'); } catch { setError('No se pudo descartar la propuesta. Reintentar.'); } })()}>Descartar propuesta</button></div>}
    </>}
  </section>;
}
