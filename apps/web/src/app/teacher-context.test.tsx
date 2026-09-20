// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useTeacherContext } from './teacher-context';
import { workspaceApi, type AcademicYear, type Group } from '../workspace/workspace-api';

const activeYear: AcademicYear = { id: 'active-year', label: 'Current', startsOn: '', endsOn: '', archivedAt: null };
const archivedYear: AcademicYear = { id: 'archived-year', label: 'Previous', startsOn: '', endsOn: '', archivedAt: '2026-01-01' };
const activeGroup: Group = { id: 'active-group', academicYearId: activeYear.id, name: 'Current group' };
const archivedGroup: Group = { id: 'archived-group', academicYearId: archivedYear.id, name: 'Previous group' };

function Probe() {
  const context = useTeacherContext();
  return <output data-testid="context">{JSON.stringify({ yearId: context.yearId, groupId: context.groupId, historical: context.historical })}</output>;
}

describe('teacher context archived rehydration', () => {
  let root: Root | undefined;

  afterEach(() => {
    act(() => root?.unmount());
    vi.restoreAllMocks();
    window.history.replaceState(null, '', '/');
  });

  async function render(hash: string, years: AcademicYear[], groups: Group[]) {
    window.history.replaceState(null, '', `/${hash}`);
    vi.spyOn(workspaceApi, 'years').mockResolvedValue(years);
    vi.spyOn(workspaceApi, 'groups').mockImplementation(async yearId => groups.filter(group => group.academicYearId === yearId));
    const container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    await act(async () => {
      root?.render(<HashRouter><Probe /></HashRouter>);
      await Promise.resolve();
      await Promise.resolve();
    });
    return container;
  }

  it('looks up an explicit year with archived years and preserves its valid group', async () => {
    const container = await render('#/workspace?year=archived-year&group=archived-group', [activeYear, archivedYear], [archivedGroup]);
    expect(workspaceApi.years).toHaveBeenCalledWith(true, expect.any(AbortSignal));
    expect(JSON.parse(container.textContent!)).toEqual({ yearId: archivedYear.id, groupId: archivedGroup.id, historical: true });
    expect(window.location.hash).toContain('year=archived-year');
    expect(window.location.hash).toContain('group=archived-group');
  });

  it('keeps no-explicit-year selection active-only and never defaults to archived', async () => {
    const container = await render('#/workspace', [activeYear, archivedYear], [activeGroup]);
    expect(workspaceApi.years).toHaveBeenCalledWith(false, expect.any(AbortSignal));
    expect(JSON.parse(container.textContent!)).toEqual({ yearId: activeYear.id, groupId: activeGroup.id, historical: false });
  });

  it('falls back an invalid year to the first active year and replaces the URL', async () => {
    const container = await render('#/workspace?year=missing-year&group=active-group', [activeYear], [activeGroup]);
    expect(JSON.parse(container.textContent!)).toEqual({ yearId: activeYear.id, groupId: activeGroup.id, historical: false });
    expect(window.location.hash).toContain('year=active-year');
    expect(window.location.hash).not.toContain('year=missing-year');
  });

  it('falls back an invalid group within the selected archived year and replaces the URL', async () => {
    const container = await render('#/workspace?year=archived-year&group=missing-group', [archivedYear], [archivedGroup]);
    expect(JSON.parse(container.textContent!)).toEqual({ yearId: archivedYear.id, groupId: archivedGroup.id, historical: true });
    expect(window.location.hash).toContain('year=archived-year');
    expect(window.location.hash).toContain('group=archived-group');
    expect(window.location.hash).not.toContain('group=missing-group');
  });
});
