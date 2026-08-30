import { describe, expect, it } from 'vitest';
import { studentCardMeta } from './StudentCard';
import { activityState, classSummaryState, deriveClassSummary } from './workspace-api';
import { makeUndoOpportunity, parseContext, reducer, initialWorkspaceState } from './workspace-state';

const student = { id: '00000000-0000-4000-8000-000000000001', groupId: '00000000-0000-4000-8000-000000000002', realName: 'Camille Martin', alias: 'Camille', avatar: 'fox', specialty: 'Leader', archivedAt: null };
const summary = { studentId: student.id, academicYearId: '00000000-0000-4000-8000-000000000003', annualEffectiveXp: 12, level: 2 as const, progress: { current: 2, required: 15, nextLevel: 3 as const, isMaxLevel: false }, badges: [{ category: 'COMMUNICATION' as const, label: 'Voz activa', unlockedAt: '2026-09-01' }] };

describe('workspace demo presentation', () => {
  it('distinguishes truthful zero activity from unavailable activity', () => {
    expect(activityState({ items: [], nextCursor: null })).toEqual({ kind: 'zero' });
    expect(activityState(null)).toEqual({ kind: 'unavailable', message: 'Recent activity is unavailable. Retry.' });
  });

  it('derives a compact class summary without comparative ranking', () => {
    expect(deriveClassSummary([student], { [student.id]: summary })).toEqual({ students: 1, activeEvidence: 1, badges: 1 });
  });

  it('keeps a normal zero summary distinct from an unavailable summary failure', () => {
    expect(classSummaryState([], {})).toEqual({ kind: 'available', summary: { students: 0, activeEvidence: 0, badges: 0 } });
    expect(classSummaryState([student], {}, false)).toEqual({ kind: 'unavailable', message: 'Class summary is unavailable. Retry.' });
  });

  it('keeps card scan information bounded to identity, progress, badge and archive state', () => {
    expect(studentCardMeta(student, summary)).toEqual({ archived: false, level: 2, badge: 'Voz activa', progress: summary.progress });
    expect(studentCardMeta({ ...student, archivedAt: '2027-01-01' })).toMatchObject({ archived: true, level: null, badge: null });
  });

  it('validates opaque context values and clears selection when context changes', () => {
    expect(parseContext(student.id)).toBe(student.id);
    expect(parseContext('Ada Lovelace')).toBeNull();
    const selected = reducer(initialWorkspaceState, { type: 'select', studentId: student.id });
    expect(reducer(selected, { type: 'context-changed' }).selectedStudentId).toBeNull();
  });

  it('creates an individual ten-second undo window without comparative state', () => {
    const context = { academicYearId: student.id, groupId: student.groupId, studentId: student.id, realName: student.realName, alias: student.alias, readOnly: false };
    const opportunity = makeUndoOpportunity({ id: 'xp', label: 'Undo XP', perform: async () => ({ message: 'done', undo: { label: 'Undo XP', undo: async () => ({ kind: 'undone' as const, message: 'undone' }) } }) }, { message: 'done', undo: { label: 'Undo XP', undo: async () => ({ kind: 'undone' as const, message: 'undone' }) } }, context, 1000);
    expect(opportunity?.expiresAt).toBe(11000);
  });
});
