// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { gameApi } from '../game/game-api';
import { ShowStudentApp, credentialFromHash } from './ShowStudentApp';

const safe = { kind: 'SHOW_STUDENT' as const, expiresAt: new Date(Date.now() + 60_000).toISOString(), student: { avatar: { studentId: 's', alias: 'Nova', specialty: 'French', specialtyCategory: null, level: 3, progress: { progressPercent: 40 }, badges: [], profile: {} }, energy: null, gems: { EMERALD: 0, RUBY: 1, DIAMOND: 0 } }, behaviour: { state: 'ALERT' as const } };
const replacement = { ...safe, student: { ...safe.student, avatar: { ...safe.student.avatar, alias: 'Luna' } } };

afterEach(() => { vi.restoreAllMocks(); window.history.replaceState(null, '', '/#/show-student'); });

describe('temporary student viewer', () => {
  async function renderViewer() {
    const container = document.createElement('div'); document.body.append(container);
    const root = createRoot(container);
    await act(async () => { root.render(<HashRouter><ShowStudentApp /></HashRouter>); await Promise.resolve(); });
    return { container, root };
  }

  it('exchanges the initial token, strips it, and renders only the safe allowlist', async () => {
    window.history.replaceState(null, '', '/#/show-student?token=secret-value');
    const exchange = vi.spyOn(gameApi, 'exchangeShowStudent').mockResolvedValue(undefined);
    vi.spyOn(gameApi, 'showStudent').mockResolvedValue(safe);
    const { container, root } = await renderViewer();
    expect(exchange).toHaveBeenCalledWith({ token: 'secret-value' });
    expect(window.location.hash).toBe('#/show-student');
    expect(container.textContent).toContain('Nova');
    expect(container.textContent).toContain('Alerta');
    expect(container.textContent).not.toContain('studentId');
    expect(container.textContent).not.toContain('lives');
    act(() => root.unmount()); container.remove();
  });

  it('exchanges and renders a replacement token after hash-only navigation without re-exchanging after stripping', async () => {
    window.history.replaceState(null, '', '/#/show-student?token=first');
    const exchange = vi.spyOn(gameApi, 'exchangeShowStudent').mockResolvedValue(undefined);
    const showStudent = vi.spyOn(gameApi, 'showStudent').mockResolvedValue(safe);
    const { container, root } = await renderViewer();
    expect(exchange).toHaveBeenCalledTimes(1);

    showStudent.mockResolvedValue(replacement);
    await act(async () => {
      window.location.hash = '#/show-student?token=second';
      window.dispatchEvent(new PopStateEvent('popstate'));
      await Promise.resolve();
    });
    expect(exchange).toHaveBeenCalledTimes(2);
    expect(exchange).toHaveBeenLastCalledWith({ token: 'second' });
    expect(showStudent).toHaveBeenCalledTimes(2);
    expect(container.textContent).toContain('Luna');
    expect(window.location.hash).toBe('#/show-student');

    await act(async () => { await Promise.resolve(); });
    expect(exchange).toHaveBeenCalledTimes(2);
    act(() => root.unmount()); container.remove();
  });

  it('reloads with a viewer cookie using only the restricted read', async () => {
    window.history.replaceState(null, '', '/#/show-student');
    const exchange = vi.spyOn(gameApi, 'exchangeShowStudent').mockResolvedValue(undefined);
    const showStudent = vi.spyOn(gameApi, 'showStudent').mockResolvedValue(safe);
    const { container, root } = await renderViewer();
    expect(showStudent).toHaveBeenCalledTimes(1);
    expect(exchange).not.toHaveBeenCalled();
    expect(container.textContent).toContain('Nova');
    act(() => root.unmount()); container.remove();
  });
});
