// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AvatarWorkflow } from './AvatarWorkflow';
import { workspaceApi, type AvatarCatalogue, type AvatarHistory, type AvatarProfile, type TeacherAvatar, type TeacherStudent } from './workspace-api';

const student: TeacherStudent = { id: 'student-1', groupId: 'group-1', realName: 'Ada Lovelace', alias: 'Ada', avatar: 'default', specialty: 'Leader', archivedAt: null };
const context = { academicYearId: 'year-1', groupId: 'group-1', studentId: 'student-1', realName: student.realName, alias: student.alias, readOnly: false } as const;
const profile: AvatarProfile = { faceId: 'face-human', skinToneId: 'skin-medium', hairId: 'hair-short', featureId: 'feature-none', clothingId: 'clothing-eclipse', accessoryId: 'accessory-none', frameId: 'frame-none', backgroundId: 'background-eclipse' };
const changedProfile: AvatarProfile = { ...profile, faceId: 'face-fox' };
const catalog: AvatarCatalogue = { version: 'm7-v1', categories: [
  ['faceId', 'Rostro'], ['skinToneId', 'Tono de piel'], ['hairId', 'Cabello'], ['featureId', 'Rasgo'],
  ['clothingId', 'Ropa'], ['accessoryId', 'Accesorio'], ['frameId', 'Marco'], ['backgroundId', 'Fondo'],
].map(([id, label]) => ({ id: id as keyof AvatarProfile, label, items: [{ id: profile[id as keyof AvatarProfile], label: 'Actual' }, ...(id === 'faceId' ? [{ id: 'face-fox', label: 'Zorro' }] : [])] })) };

const avatar = (overrides: Partial<TeacherAvatar> = {}): TeacherAvatar => ({
  studentId: student.id, alias: student.alias, specialty: student.specialty, specialtyCategory: 'COMMUNICATION', academicYearId: context.academicYearId,
  annualEffectiveXp: 45, level: 4, progress: { isMaxLevel: false, progressPercent: 0, nextLevel: 5, xpToNextLevel: 25 }, badges: [], revision: 2, profile, updatedAt: '2026-09-15T10:00:00Z', editable: true, ...overrides,
});
const history: AvatarHistory[] = [
  { revision: 2, operation: 'UPDATE', revertedFromRevision: null, reason: null, actorTeacherId: 'teacher-1', createdAt: '2026-09-15T10:00:00Z', profile },
  { revision: 1, operation: 'BACKFILL', revertedFromRevision: null, reason: null, actorTeacherId: null, createdAt: '2026-09-14T10:00:00Z', profile },
];

async function renderWorkflow(value = student, valueContext = context, readOnly = false) {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  const container = document.createElement('div'); document.body.append(container);
  const root = createRoot(container);
  await act(async () => { root.render(<AvatarWorkflow student={value} context={valueContext} readOnly={readOnly} />); });
  await settle();
  return { container, root };
}
async function settle() { await act(async () => { await Promise.resolve(); }); }
function waitFor(container: Element, condition: () => boolean): Promise<void> {
  if (condition()) return Promise.resolve();
  return new Promise(resolve => {
    const observer = new MutationObserver(() => {
      if (condition()) { observer.disconnect(); resolve(); }
    });
    observer.observe(container, { childList: true, subtree: true, characterData: true, attributes: true });
  });
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(value => { resolve = value; });
  return { promise, resolve };
}
function button(container: Element, label: string) { return [...container.querySelectorAll('button')].find(item => item.textContent?.trim() === label) as HTMLButtonElement | undefined; }
function getByRole(container: Element, role: 'button', options: { name: string }) {
  const match = [...container.querySelectorAll('button')].find(item => item.textContent?.trim() === options.name);
  if (!match) throw new Error(`Unable to find role ${role} with name: ${options.name}`);
  return match as HTMLButtonElement;
}
function select(container: Element, label: string) { return container.querySelector(`select[aria-label="${label}"]`) as HTMLSelectElement; }
function status(container: Element, text: string) { return [...container.querySelectorAll('[role="status"]')].find(item => item.textContent?.trim() === text); }
function getByLabelText<T extends HTMLElement>(container: Element, label: string) {
  const labelElement = [...container.querySelectorAll('label')].find(item => [...item.childNodes].some(node => node.nodeType === Node.TEXT_NODE && node.textContent?.trim() === label));
  const control = labelElement?.querySelector('input, textarea, select');
  if (!control) throw new Error(`Unable to find a control for label: ${label}`);
  return control as T;
}

afterEach(() => { vi.restoreAllMocks(); document.body.innerHTML = ''; });

describe('AvatarWorkflow focused teacher coverage', () => {
  let root: Root | undefined;
  afterEach(() => { act(() => root?.unmount()); root = undefined; });

  it('loads current avatar, renders derived labels, edits a valid profile, saves, and refreshes history', async () => {
    vi.spyOn(workspaceApi, 'avatar').mockResolvedValue(avatar());
    vi.spyOn(workspaceApi, 'avatarCatalog').mockResolvedValue(catalog);
    vi.spyOn(workspaceApi, 'avatarHistory').mockResolvedValue(history);
    const save = vi.spyOn(workspaceApi, 'saveAvatar').mockResolvedValue(avatar({ profile: changedProfile, revision: 3 }));
    const container = document.body;
      root = (await renderWorkflow()).root; await waitFor(container, () => container.querySelector('.level-mark')?.textContent === 'Nivel 4');
     expect(container.querySelector('.level-mark')?.textContent).toBe('Nivel 4');
     expect(container.querySelector('.muted')?.textContent).toBe('Especialidad: Leader');
     expect(container.querySelector('[data-testid="specialty-category"]')?.textContent).toContain('Categoría: Comunicación');
     expect(container.querySelector('[data-testid="specialty-category"]')?.textContent).toContain('Derivado de la especialidad');
     expect(button(container, 'Personalizar avatar')).toBeDefined();
     await act(async () => { button(container, 'Personalizar avatar')?.click(); });
     expect(container.querySelector('[data-testid="specialty-category"] select')).toBeNull();
     expect(select(container, 'Rostro')).toBeDefined();
    await act(async () => { select(container, 'Rostro').value = 'face-fox'; select(container, 'Rostro').dispatchEvent(new Event('change', { bubbles: true })); });
    await act(async () => { button(container, 'Guardar cambios')?.click(); });
    await waitFor(container, () => container.querySelector('.avatar-face-fox') !== null);
    expect(save).toHaveBeenCalledWith(student.id, context.academicYearId, 2, changedProfile, expect.any(String));
    expect(container.querySelector('.avatar-face-fox')).toBeTruthy();
     expect(workspaceApi.avatarHistory).toHaveBeenCalledTimes(2);
  });

  it.each([
    ['null', null],
    ['absent', undefined],
  ])('handles %s specialtyCategory without exposing an editable category control', async (_label, specialtyCategory) => {
    vi.spyOn(workspaceApi, 'avatar').mockResolvedValue(avatar({ specialtyCategory: specialtyCategory as TeacherAvatar['specialtyCategory'] }));
    vi.spyOn(workspaceApi, 'avatarCatalog').mockResolvedValue(catalog);
    vi.spyOn(workspaceApi, 'avatarHistory').mockResolvedValue(history);

    const container = document.body;
    root = (await renderWorkflow()).root;
    await waitFor(container, () => container.querySelector('.level-mark') !== null);

    expect(container.querySelector('[data-testid="specialty-category"]')).toBeNull();
    expect(container.querySelector('[aria-label="Categoría de especialidad"]')).toBeNull();
    expect(button(container, 'Personalizar avatar')).toBeDefined();
  });

  it('cancels a draft and appends a selected history revision with its reason', async () => {
    vi.spyOn(workspaceApi, 'avatar').mockResolvedValue(avatar());
    vi.spyOn(workspaceApi, 'avatarCatalog').mockResolvedValue(catalog);
    vi.spyOn(workspaceApi, 'avatarHistory').mockResolvedValue(history);
    const revert = vi.spyOn(workspaceApi, 'revertAvatar').mockResolvedValue(avatar({ profile: changedProfile, revision: 3 }));
    const container = document.body;
      root = (await renderWorkflow()).root; await waitFor(container, () => container.querySelector('.level-mark') !== null);
    await act(async () => { button(container, 'Personalizar avatar')?.click(); });
    await act(async () => { select(container, 'Rostro').value = 'face-fox'; select(container, 'Rostro').dispatchEvent(new Event('change', { bubbles: true })); button(container, 'Cancelar')?.click(); });
    expect(container.querySelector('.avatar-face-human')).toBeTruthy();
    await act(async () => { (container.querySelector('summary') as HTMLElement).click(); });
     const revisionSelector = select(container, 'Versión a restaurar');
     expect([...revisionSelector.options].map(option => option.textContent)).toEqual(['Selecciona una versión', 'Versión 1']);
     await act(async () => { revisionSelector.value = '1'; revisionSelector.dispatchEvent(new Event('change', { bubbles: true })); });
    await waitFor(container, () => container.querySelector('textarea') !== null && button(container, 'Restaurar esta versión') !== undefined);
    const restoreVersion = button(container, 'Restaurar esta versión');
    const reason = getByLabelText<HTMLTextAreaElement>(container, 'Motivo');
    expect(reason.value).toBe('');
    expect(restoreVersion?.disabled).toBe(true);
      await act(async () => { Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set?.call(reason, 'Corrección solicitada por la docente'); reason.dispatchEvent(new InputEvent('input', { bubbles: true })); });
      await waitFor(container, () => button(container, 'Restaurar esta versión')?.disabled === false);
      await act(async () => { getByRole(container, 'button', { name: 'Restaurar esta versión' }).click(); });
    await waitFor(container, () => revert.mock.calls.length === 1);
    expect(revert).toHaveBeenCalledWith(student.id, context.academicYearId, 2, 1, 'Corrección solicitada por la docente', expect.any(String));
  });

  it('retains the draft for validation and stale failures, and offers retry', async () => {
    vi.spyOn(workspaceApi, 'avatar').mockResolvedValue(avatar());
    vi.spyOn(workspaceApi, 'avatarCatalog').mockResolvedValue(catalog);
    vi.spyOn(workspaceApi, 'avatarHistory').mockResolvedValue(history);
    const failure = Object.assign(new Error('invalid'), { status: 422 });
    const container = document.body;
    const saved = avatar({ profile: changedProfile, revision: 3 });
    const save = vi.spyOn(workspaceApi, 'saveAvatar').mockRejectedValueOnce(failure).mockResolvedValueOnce(saved);
      root = (await renderWorkflow()).root; await waitFor(container, () => container.querySelector('.level-mark') !== null);
    await act(async () => { button(container, 'Personalizar avatar')?.click(); });
    await act(async () => { select(container, 'Rostro').value = 'face-fox'; select(container, 'Rostro').dispatchEvent(new Event('change', { bubbles: true })); });
    await act(async () => { button(container, 'Guardar cambios')?.click(); });
     await waitFor(container, () => status(container, 'No se pudo guardar el avatar. Reintentar') === undefined && container.querySelector('[role="alert"]')?.textContent?.includes('No se pudo guardar el avatar. Reintentar') === true);
     expect(container.querySelector('[role="alert"]')?.textContent).toContain('No se pudo guardar el avatar. Reintentar');
    expect(select(container, 'Rostro').value).toBe('face-fox');
    const firstCall = save.mock.calls[0];
    await act(async () => { button(container, 'Reintentar')?.click(); });
    const queryByRole = (role: 'combobox', options: { name: string }) => role === 'combobox'
      ? container.querySelector(`select[aria-label="${options.name}"]`)
      : null;
    await waitFor(container, () => queryByRole('combobox', { name: 'Rostro' }) === null);
       expect(save.mock.calls[1]).toEqual(firstCall);
       expect(workspaceApi.avatar).toHaveBeenCalledTimes(1);
       expect(select(container, 'Rostro')).toBeNull();
      expect(select(container, 'Versión a restaurar')).toBeDefined();
     expect(container.querySelector('.level-mark')?.textContent).toBe('Nivel 4');
    expect(container.querySelector('.avatar-face-fox')).toBeTruthy();
   expect(save).toHaveBeenCalledTimes(2);
  });

  it('preserves the exact draft and edit mode after a stale save until explicit reload', async () => {
    const load = vi.spyOn(workspaceApi, 'avatar').mockResolvedValueOnce(avatar()).mockResolvedValueOnce(avatar({ revision: 3, profile: { ...profile, faceId: 'face-owl' } }));
    vi.spyOn(workspaceApi, 'avatarCatalog').mockResolvedValue(catalog);
    vi.spyOn(workspaceApi, 'avatarHistory').mockResolvedValue(history);
    const stale = Object.assign(new Error('stale'), { status: 409 });
    const save = vi.spyOn(workspaceApi, 'saveAvatar').mockRejectedValue(stale);
    const container = document.body;
    root = (await renderWorkflow()).root;
    await waitFor(container, () => container.querySelector('.level-mark') !== null);
    await act(async () => { button(container, 'Personalizar avatar')?.click(); });
    const draftBeforeSave = changedProfile;
    for (const [label, value] of [['Rostro', draftBeforeSave.faceId], ['Tono de piel', draftBeforeSave.skinToneId], ['Cabello', draftBeforeSave.hairId]]) {
      await act(async () => { const control = select(container, label); control.value = value; control.dispatchEvent(new Event('change', { bubbles: true })); });
    }
    await act(async () => { button(container, 'Guardar cambios')?.click(); });
    await waitFor(container, () => container.querySelector('[role="alert"]')?.textContent?.includes('El avatar cambió en otra sesión.') === true);
    expect(save).toHaveBeenCalledTimes(1);
    expect(select(container, 'Rostro').value).toBe(draftBeforeSave.faceId);
    expect(select(container, 'Tono de piel').value).toBe(draftBeforeSave.skinToneId);
    expect(select(container, 'Cabello').value).toBe(draftBeforeSave.hairId);
    expect(save).toHaveBeenCalledWith(student.id, context.academicYearId, 2, draftBeforeSave, expect.any(String));
    expect(button(container, 'Guardar cambios')).toBeDefined();
    expect(container.querySelector('.avatar-face-fox')).toBeTruthy();
    expect(button(container, 'Recargar')).toBeDefined();

    await act(async () => { button(container, 'Recargar')?.click(); });
    await waitFor(container, () => container.querySelector('.avatar-face-owl') !== null);
    expect(load).toHaveBeenCalledTimes(2);
    expect(save).toHaveBeenCalledTimes(1);
    expect(select(container, 'Rostro')).toBeNull();
    expect(container.querySelector('.avatar-face-owl')).toBeTruthy();
  });

  it('recovers loading errors, isolates an older selected-student response, and enforces the private read-only boundary', async () => {
    let reads = 0;
    const first = vi.spyOn(workspaceApi, 'avatar').mockImplementation(async () => { reads += 1; if (reads === 1) throw new Error('load'); return avatar({ annualEffectiveXp: 99 }); });
    vi.spyOn(workspaceApi, 'avatarCatalog').mockResolvedValue(catalog);
    vi.spyOn(workspaceApi, 'avatarHistory').mockResolvedValue(history);
    root = (await renderWorkflow()).root;
    await act(async () => { await Promise.resolve(); });
    await settle();
    expect(document.body.querySelector('[role="alert"]')?.textContent).toContain('No se pudo cargar el avatar.');
    const initialLoadCalls = first.mock.calls.length;
    await act(async () => { button(document.body, 'Reintentar')?.click(); await Promise.resolve(); });
    await settle();
    expect(document.body.querySelector('.level-mark')).not.toBeNull();
      expect(first).toHaveBeenCalledTimes(initialLoadCalls + 1);
      expect(document.body.querySelector('.level-mark')?.textContent).toBe('Nivel 4');
    const other: TeacherStudent = { ...student, id: 'student-2', realName: 'Grace Hopper', alias: 'Grace' };
    const otherContext = { ...context, academicYearId: 'year-2', studentId: other.id, realName: other.realName, alias: other.alias };
    const staleStudentA = deferred<TeacherAvatar>();
    const currentStudentB = deferred<TeacherAvatar>();
    first.mockImplementationOnce(() => staleStudentA.promise).mockImplementationOnce(() => currentStudentB.promise);
    await act(async () => { root?.render(<AvatarWorkflow student={student} context={{ ...context, academicYearId: 'year-2' }} readOnly />); await Promise.resolve(); });
    await act(async () => { root?.render(<AvatarWorkflow student={other} context={otherContext} readOnly />); await Promise.resolve(); });
    currentStudentB.resolve(avatar({ studentId: other.id, alias: other.alias, profile: changedProfile }));
    await act(async () => { await currentStudentB.promise; await Promise.resolve(); });
    await settle();
    expect(document.body.querySelector('[role="status"]')?.textContent).toBe('Este avatar es de solo lectura.');
    expect(document.body.querySelector('.avatar-face-fox')).not.toBeNull();
     expect(button(document.body, 'Personalizar avatar')?.disabled).toBe(true);
    staleStudentA.resolve(avatar({ profile }));
    await act(async () => { await staleStudentA.promise; await Promise.resolve(); });
    await settle();
    expect(document.body.querySelector('.avatar-face-fox')).not.toBeNull();
  });
});
