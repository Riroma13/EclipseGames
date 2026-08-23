import type { TeacherStudent } from './workspace-api';
import type { XpSummary } from './workspace-api';
export function studentCardMeta(student: TeacherStudent, summary?: XpSummary) { return { archived: Boolean(student.archivedAt), level: summary?.level ?? null, badge: summary?.badges[0]?.label ?? null, progress: summary?.progress ?? null }; }
export function StudentCard({ student, summary, selected, onSelect }: { student: TeacherStudent; summary?: XpSummary; selected: boolean; onSelect: () => void }) {
  const badge = summary?.badges[0]?.label;
  return <button type="button" className={`workspace-student-card${selected ? ' is-selected' : ''}${student.archivedAt ? ' is-archived' : ''}`} aria-pressed={selected} aria-label={`${student.realName}, ${student.alias}${student.specialty ? `, ${student.specialty}` : ''}${student.archivedAt ? ', archived' : ''}`} onClick={onSelect}>
    <span className="avatar" aria-hidden="true">{student.avatar === 'default' ? '◌' : '•'}</span>
    <span className="student-card-copy"><strong>{student.realName}</strong><span className="student-alias">{student.alias}{student.specialty ? ` · ${student.specialty}` : ''}</span>{summary && <span className="student-progress">Level {summary.level} · {summary.annualEffectiveXp} XP</span>}{badge && <span className="student-badge">{badge}</span>}{student.archivedAt && <span className="historical-badge">Archived</span>}</span>
  </button>;
}
