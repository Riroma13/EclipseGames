import type { TeacherStudent } from './workspace-api';
import type { XpSummary } from './workspace-api';

export function studentCardMeta(student: TeacherStudent, summary?: XpSummary) { return { archived: Boolean(student.archivedAt), level: summary?.level ?? null, badge: summary?.badges[0]?.label ?? null, progress: summary?.progress ?? null }; }

export function studentInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '·';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function StudentCard({ student, summary, selected, onSelect }: { student: TeacherStudent; summary?: XpSummary; selected: boolean; onSelect: () => void }) {
  const badge = summary?.badges[0]?.label;
  const progress = summary?.progress.isMaxLevel ? 100 : summary?.progress.required ? Math.min(100, Math.max(0, (summary.progress.current / summary.progress.required) * 100)) : 0;
  return <button type="button" className={`workspace-student-card${selected ? ' is-selected' : ''}${student.archivedAt ? ' is-archived' : ''}`} aria-pressed={selected} aria-label={`${student.realName}, ${student.alias}${student.specialty ? `, ${student.specialty}` : ''}${student.archivedAt ? ', archived' : ''}`} onClick={onSelect}>
    <span className="student-crest avatar" aria-hidden="true"><span className="crest-initials">{studentInitials(student.realName)}</span><span className="crest-orbit" /></span>
    <span className="student-card-copy">
      <span className="student-card-topline"><strong>{student.realName}</strong>{selected && <span className="student-selected-marker" aria-hidden="true">Selected</span>}</span>
      <span className="student-alias">{student.alias}{student.specialty ? ` · ${student.specialty}` : ''}</span>
      {summary && <span className="student-progress-row"><span>Lv {summary.level}</span><span>{summary.annualEffectiveXp} XP</span></span>}
      {summary && <span className="student-progress-track" aria-hidden="true"><span style={{ width: `${progress}%` }} /></span>}
      {badge && <span className="student-badge"><span className="mini-seal" aria-hidden="true">◇</span>{badge}</span>}
      {student.archivedAt && <span className="historical-badge">Archived</span>}
    </span>
    <span className="student-card-chevron" aria-hidden="true">›</span>
  </button>;
}
