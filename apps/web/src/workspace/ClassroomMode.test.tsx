// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { gameApi } from '../game/game-api';
import { ClassroomMode, durationLabel, remainingSeconds } from './ClassroomMode';

const student = { id: 'student-a', alias: 'Ada' };
const card = { avatar: { studentId: student.id, alias: student.alias, specialty: null, specialtyCategory: null, level: 1, progress: { progressPercent: 0 }, badges: [], profile: {} }, energy: null, gems: { EMERALD: 0, RUBY: 0, DIAMOND: 0 } };
const lease = { accessCode: 'OLD-CODE', accessUrl: '/#/show-student?token=OLD-TOKEN', expiresAt: new Date(Date.now() + 60_000).toISOString(), showStudent: { kind: 'SHOW_STUDENT' as const, expiresAt: new Date(Date.now() + 60_000).toISOString(), student: card, behaviour: null } };

describe('ClassroomMode context safety', () => {
  let root: Root | undefined;
  let container: HTMLDivElement | undefined;

  afterEach(() => { act(() => root?.unmount()); container?.remove(); vi.restoreAllMocks(); });

  it('derives TTL copy and countdown values from the server expiry', () => {
    const now = Date.parse('2026-01-01T00:00:00.000Z');
    const expiresAt = new Date(now + 30_000).toISOString();
    expect(remainingSeconds(expiresAt, now)).toBe(30);
    expect(durationLabel(remainingSeconds(expiresAt, now))).toBe('30 segundos');
    expect(durationLabel(120)).toBe('2 minutos');
  });

  async function render(groupId = 'group-a', academicYearId = 'year-a') {
    container = document.createElement('div'); document.body.append(container); root = createRoot(container);
    await act(async () => { root?.render(<ClassroomMode groupId={groupId} academicYearId={academicYearId} students={[student]} historical={false} />); await Promise.resolve(); });
    await act(async () => { container?.querySelector<HTMLButtonElement>('button')?.click(); await Promise.resolve(); });
  }

  it('revokes the old group and clears bootstrap secrets and selection on group change', async () => {
    vi.spyOn(gameApi, 'classroomCards').mockResolvedValue([card]);
    const createShowStudent = vi.spyOn(gameApi, 'createShowStudent').mockResolvedValue(lease);
    const revoke = vi.spyOn(gameApi, 'revokeShowStudent').mockResolvedValue(undefined);
    await render();
    await act(async () => { container?.querySelector<HTMLButtonElement>('button[aria-pressed]')?.click(); await new Promise(resolve => setTimeout(resolve, 20)); });
    const showStudentButton = Array.from(container?.querySelectorAll('button') ?? []).find(button => button.textContent === 'Mostrar al alumno');
    expect(showStudentButton?.disabled).toBe(false);
    await act(async () => { showStudentButton?.click(); await new Promise(resolve => setTimeout(resolve, 20)); });
    expect(createShowStudent).toHaveBeenCalledWith('group-a', 'student-a', expect.any(String), expect.any(AbortSignal));
    expect(container?.textContent).toContain('OLD-CODE');
     await act(async () => { root?.render(<ClassroomMode groupId="group-b" academicYearId="year-a" students={[student]} historical={false} />); await Promise.resolve(); });
     expect(revoke).toHaveBeenCalledWith('group-a');
     expect(container?.textContent).not.toContain('OLD-CODE');
     expect(container?.textContent).not.toContain('OLD-TOKEN');
     expect(container?.querySelector('button[aria-pressed="true"]')).toBeNull();
     expect(container?.querySelector('input[aria-label="Show Student URL"]')).toBeNull();
  });

  it('revokes on academic-year transition and switching back does not restore the old grant', async () => {
    vi.spyOn(gameApi, 'classroomCards').mockResolvedValue([card]);
    vi.spyOn(gameApi, 'createShowStudent').mockResolvedValue(lease);
    const revoke = vi.spyOn(gameApi, 'revokeShowStudent').mockResolvedValue(undefined);
    await render('group-a', 'year-a');
    await act(async () => { container?.querySelector<HTMLButtonElement>('button[aria-pressed]')?.click(); await Promise.resolve(); });
    await act(async () => { Array.from(container?.querySelectorAll('button') ?? []).find(button => button.textContent === 'Mostrar al alumno')?.click(); await Promise.resolve(); });
    expect(container?.textContent).toContain('OLD-CODE');
    await act(async () => { root?.render(<ClassroomMode groupId="group-a" academicYearId="year-b" students={[student]} historical={false} />); await Promise.resolve(); });
    expect(revoke).toHaveBeenCalledWith('group-a');
    expect(container?.textContent).not.toContain('OLD-CODE');
    await act(async () => { root?.render(<ClassroomMode groupId="group-a" academicYearId="year-a" students={[student]} historical={false} />); await Promise.resolve(); });
    expect(container?.textContent).not.toContain('OLD-CODE');
    expect(container?.textContent).not.toContain('OLD-TOKEN');
  });

  it('does not revoke or disturb state when changing context without an active grant', async () => {
    vi.spyOn(gameApi, 'classroomCards').mockResolvedValue([card]);
    const revoke = vi.spyOn(gameApi, 'revokeShowStudent').mockResolvedValue(undefined);
    await render();
    await act(async () => { root?.render(<ClassroomMode groupId="group-b" academicYearId="year-a" students={[student]} historical={false} />); await Promise.resolve(); });
    expect(revoke).not.toHaveBeenCalled();
  });

  it('keeps the visible state fail-safe and exposes a Spanish retry after revoke failure', async () => {
    vi.spyOn(gameApi, 'classroomCards').mockResolvedValue([card]);
    const createShowStudent = vi.spyOn(gameApi, 'createShowStudent').mockResolvedValue(lease);
    const revoke = vi.spyOn(gameApi, 'revokeShowStudent').mockRejectedValueOnce(new Error('offline'));
    await render();
    await act(async () => { container?.querySelector<HTMLButtonElement>('button[aria-pressed]')?.click(); await new Promise(resolve => setTimeout(resolve, 20)); });
    const showStudentButton = Array.from(container?.querySelectorAll('button') ?? []).find(button => button.textContent === 'Mostrar al alumno');
    expect(showStudentButton?.disabled).toBe(false);
    await act(async () => { showStudentButton?.click(); await new Promise(resolve => setTimeout(resolve, 20)); });
    expect(createShowStudent).toHaveBeenCalledWith('group-a', 'student-a', expect.any(String), expect.any(AbortSignal));
    await act(async () => { root?.render(<ClassroomMode groupId="group-b" academicYearId="year-a" students={[student]} historical={false} />); await Promise.resolve(); });
    expect(container?.textContent).toContain('No se pudo finalizar el acceso anterior');
    expect(container?.textContent).not.toContain('OLD-CODE');
    expect(container?.textContent).not.toContain('OLD-TOKEN');
    revoke.mockResolvedValue(undefined);
     await act(async () => { container?.querySelector<HTMLButtonElement>('p[role="alert"] button')?.click(); await Promise.resolve(); });
    expect(revoke).toHaveBeenCalledTimes(2);
  });

  it('clears bootstrap secrets immediately and closes only after explicit revoke succeeds', async () => {
    vi.spyOn(gameApi, 'classroomCards').mockResolvedValue([card]);
    vi.spyOn(gameApi, 'createShowStudent').mockResolvedValue(lease);
    const revoke = vi.spyOn(gameApi, 'revokeShowStudent').mockResolvedValue(undefined);
    await render();
    await act(async () => { container?.querySelector<HTMLButtonElement>('button[aria-pressed]')?.click(); await Promise.resolve(); });
    await act(async () => { Array.from(container?.querySelectorAll('button') ?? []).find(button => button.textContent === 'Mostrar al alumno')?.click(); await Promise.resolve(); });
    await act(async () => { container?.querySelector<HTMLButtonElement>('.panel-close')?.click(); await Promise.resolve(); });
    expect(revoke).toHaveBeenCalledWith('group-a');
    expect(container?.textContent).not.toContain('OLD-CODE');
    expect(container?.querySelector('[role="dialog"]')).toBeNull();
  });

  it('keeps explicit close open in Spanish fail-safe state and retries successfully', async () => {
    vi.spyOn(gameApi, 'classroomCards').mockResolvedValue([card]);
    vi.spyOn(gameApi, 'createShowStudent').mockResolvedValue(lease);
    const revoke = vi.spyOn(gameApi, 'revokeShowStudent').mockRejectedValueOnce(new Error('offline'));
    await render();
    await act(async () => { container?.querySelector<HTMLButtonElement>('button[aria-pressed]')?.click(); await Promise.resolve(); });
    await act(async () => { Array.from(container?.querySelectorAll('button') ?? []).find(button => button.textContent === 'Mostrar al alumno')?.click(); await Promise.resolve(); });
    await act(async () => { container?.querySelector<HTMLButtonElement>('.panel-close')?.click(); await Promise.resolve(); });
    expect(container?.querySelector('[role="dialog"]')).not.toBeNull();
    expect(container?.textContent).toContain('No se pudo finalizar el acceso');
    expect(container?.textContent).toContain('Reintentar');
    expect(container?.textContent).not.toContain('OLD-CODE');
    revoke.mockResolvedValue(undefined);
    await act(async () => { container?.querySelector<HTMLButtonElement>('p[role="alert"] button')?.click(); await Promise.resolve(); });
    expect(revoke).toHaveBeenCalledTimes(2);
    expect(container?.querySelector('[role="dialog"]')).toBeNull();
  });

  it('closes unchanged without an active grant', async () => {
    vi.spyOn(gameApi, 'classroomCards').mockResolvedValue([card]);
    const revoke = vi.spyOn(gameApi, 'revokeShowStudent').mockResolvedValue(undefined);
    await render();
    await act(async () => { container?.querySelector<HTMLButtonElement>('.panel-close')?.click(); await Promise.resolve(); });
    expect(revoke).not.toHaveBeenCalled();
    expect(container?.querySelector('[role="dialog"]')).toBeNull();
  });

  it('best-effort revokes an active grant on teardown and guards duplicate requests', async () => {
    vi.spyOn(gameApi, 'classroomCards').mockResolvedValue([card]);
    vi.spyOn(gameApi, 'createShowStudent').mockResolvedValue(lease);
    const revoke = vi.spyOn(gameApi, 'revokeShowStudent').mockResolvedValue(undefined);
    await render();
    await act(async () => { container?.querySelector<HTMLButtonElement>('button[aria-pressed]')?.click(); await Promise.resolve(); });
    await act(async () => { Array.from(container?.querySelectorAll('button') ?? []).find(button => button.textContent === 'Mostrar al alumno')?.click(); await Promise.resolve(); });
    await act(async () => { root?.unmount(); await Promise.resolve(); });
    expect(revoke).toHaveBeenCalledTimes(1);
  });
});
