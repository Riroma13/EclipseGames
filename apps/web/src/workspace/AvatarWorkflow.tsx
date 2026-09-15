import { useEffect, useRef, useState } from 'react';
import { AvatarPreview, initialsForAvatar, isAvatarProfile } from './AvatarPreview';
import { workspaceApi, type AvatarCatalogue, type AvatarHistory, type AvatarProfile, type TeacherAvatar, type TeacherStudent } from './workspace-api';
import type { WorkspaceStudentContext } from './workspace-state';

const specialtyCategoryLabels = {
  COMMUNICATION: 'Comunicación',
  PRECISION: 'Precisión',
  CONSISTENCY: 'Constancia',
  COLLABORATION: 'Colaboración',
} as const;

const fallbackProfile = (avatar: string): AvatarProfile => ({ faceId: `face-${avatar === 'default' ? 'human' : avatar}`, skinToneId: 'skin-medium', hairId: avatar === 'default' ? 'hair-short' : 'hair-none', featureId: 'feature-none', clothingId: 'clothing-eclipse', accessoryId: 'accessory-none', frameId: 'frame-none', backgroundId: 'background-eclipse' });

export function AvatarWorkflow({ student, context, readOnly, onProfileState }: { student: TeacherStudent; context: WorkspaceStudentContext; readOnly: boolean; onProfileState?: (profile: AvatarProfile | null) => void }) {
  const [avatar, setAvatar] = useState<TeacherAvatar | null>(null);
  const [catalog, setCatalog] = useState<AvatarCatalogue | null>(null);
  const [history, setHistory] = useState<AvatarHistory[]>([]);
  const [draft, setDraft] = useState<AvatarProfile | null>(null);
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [retryAction, setRetryAction] = useState<'load' | 'save'>('load');
  const [retry, setRetry] = useState(0);
  const [restoreRevision, setRestoreRevision] = useState<number | null>(null);
  const [reason, setReason] = useState('');
  const keyRef = useRef<string | null>(null);
  const generation = useRef(0);

  useEffect(() => {
    const current = ++generation.current;
    const controller = new AbortController();
    setAvatar(null); setDraft(null); setEditing(false); setRestoreRevision(null); setReason(''); setError(''); setRetryAction('load');
    Promise.all([
      workspaceApi.avatar(student.id, context.academicYearId, controller.signal),
      workspaceApi.avatarCatalog(controller.signal),
      workspaceApi.avatarHistory(student.id, controller.signal),
    ]).then(([value, available, revisions]) => {
      if (current !== generation.current) return;
       setAvatar(value); setDraft(value.profile); setCatalog(available); setHistory(revisions); setRetryAction('load'); onProfileState?.(isAvatarProfile(value.profile) ? value.profile : null);
      if (!isAvatarProfile(value.profile)) setError('Error de invariantes: el perfil del avatar no es válido.');
     }).catch((caught: any) => {
       if (caught?.name !== 'AbortError' && current === generation.current) { setRetryAction('load'); setError(caught?.status === 401 ? 'La sesión ha caducado. Vuelve a iniciar sesión.' : 'No se pudo cargar el avatar.'); }
    });
    return () => controller.abort();
  }, [student.id, context.academicYearId, retry]);

  const profile = avatar?.profile ?? fallbackProfile(student.avatar);
  const initials = initialsForAvatar(student.realName);
  const disabled = pending || readOnly || !avatar?.editable;
  const availableRevisions = avatar ? history.filter(item => item.revision !== avatar.revision) : [];

  function beginEdit() { if (avatar) { setDraft(avatar.profile); setEditing(true); setError(''); } }
  function cancel() { setDraft(avatar?.profile ?? null); setEditing(false); setError(''); keyRef.current = null; }

  async function save() {
    if (!avatar || !draft || disabled) return;
    const key = keyRef.current ?? crypto.randomUUID(); keyRef.current = key; setPending(true); setError('');
    try {
      const value = await workspaceApi.saveAvatar(student.id, context.academicYearId, avatar.revision, draft, key);
       setAvatar(value); setDraft(value.profile); setEditing(false); keyRef.current = null; setRetryAction('load'); onProfileState?.(isAvatarProfile(value.profile) ? value.profile : null);
      setHistory(await workspaceApi.avatarHistory(student.id));
     } catch (caught: any) {
        if (caught?.status === 409) { keyRef.current = null; setRetryAction('load'); setError('El avatar cambió en otra sesión. Recarga antes de guardar.'); }
       else if (caught?.status === 401) { setRetryAction('load'); setError('La sesión ha caducado. Vuelve a iniciar sesión.'); }
       else { setRetryAction('save'); setError('No se pudo guardar el avatar. Reintentar'); }
    } finally { setPending(false); }
  }

  async function restore() {
    if (!avatar || restoreRevision === null || !reason.trim() || disabled) return;
    const key = keyRef.current ?? crypto.randomUUID(); keyRef.current = key; setPending(true); setError('');
    try {
      const value = await workspaceApi.revertAvatar(student.id, context.academicYearId, avatar.revision, restoreRevision, reason.trim(), key);
       setAvatar(value); setDraft(value.profile); setRestoreRevision(null); setReason(''); keyRef.current = null; onProfileState?.(isAvatarProfile(value.profile) ? value.profile : null);
      setHistory(await workspaceApi.avatarHistory(student.id));
    } catch (caught: any) {
      if (caught?.status === 409) { keyRef.current = null; setRetryAction('load'); setError('El avatar cambió en otra sesión. Recarga antes de guardar.'); }
       else { setRetryAction('load'); setError('No se pudo restaurar el avatar. Reintentar'); }
    } finally { setPending(false); }
  }

  return <section className="avatar-workflow panel-section" aria-labelledby="avatar-title">
    <div className="action-heading"><h3 id="avatar-title">Avatar del agente</h3>{avatar && <span className="level-mark">Nivel {avatar.level}</span>}</div>
    {readOnly && <p className="read-only-note" role="status">Este avatar es de solo lectura.</p>}
     {error && <p className="action-error" role="alert">{error} {!error.startsWith('Error de invariantes') && <button type="button" onClick={() => retryAction === 'save' ? void save() : setRetry(value => value + 1)}>{retryAction === 'load' && error.includes('cambió en otra sesión') ? 'Recargar' : 'Reintentar'}</button>}</p>}
    {!avatar && !error && <p className="action-status" role="status">Cargando avatar…</p>}
    {avatar && <>
       <div className="avatar-editor-layout"><AvatarPreview profile={editing ? draft : profile} initials={initials} /><div><p className="muted">Especialidad: {avatar.specialty ?? 'Sin especialidad'}</p>{avatar.specialtyCategory && <p className="muted" data-testid="specialty-category">Categoría: {specialtyCategoryLabels[avatar.specialtyCategory]} <span aria-label="Derivado de la especialidad">(Derivado de la especialidad)</span></p>}{!editing && <button type="button" disabled={disabled} onClick={beginEdit}>Personalizar avatar</button>}</div></div>
      {editing && catalog && draft && <div className="avatar-fields">{catalog.categories.map(category => <label key={category.id}>{category.label}<select aria-label={category.label} value={draft[category.id]} disabled={pending} onChange={event => setDraft({ ...draft, [category.id]: event.target.value })}>{category.items.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>)}<div className="avatar-actions"><button type="button" disabled={pending} onClick={() => void save()}>{pending ? 'Guardando…' : 'Guardar cambios'}</button><button type="button" className="quiet-button" disabled={pending} onClick={cancel}>Cancelar</button></div></div>}
      <details className="avatar-history"><summary>Historial del avatar</summary>{availableRevisions.length > 0 && <label>Versión a restaurar<select aria-label="Versión a restaurar" value={restoreRevision?.toString() ?? ''} disabled={disabled} onChange={event => { const value = event.target.value; setRestoreRevision(value ? Number(value) : null); setReason(''); }}>{<option value="">Selecciona una versión</option>}{availableRevisions.map(item => <option key={item.revision} value={item.revision}>Versión {item.revision}</option>)}</select></label>}{restoreRevision !== null && <div className="avatar-fields"><label>Motivo<textarea value={reason} onChange={event => setReason(event.target.value)} disabled={pending} required /></label><button type="button" disabled={pending || !reason.trim()} onClick={() => void restore()}>Restaurar esta versión</button></div>}</details>
    </>}
  </section>;
}
