import type { TeacherStudent } from './workspace-api';
export function StudentCard({ student, selected, onSelect }: { student: TeacherStudent; selected: boolean; onSelect: () => void }) {
  return <button type="button" className={`workspace-student-card${selected ? ' is-selected' : ''}`} aria-pressed={selected} onClick={onSelect}><span className="avatar" aria-hidden="true">{student.avatar === 'default' ? '◌' : '•'}</span><span><strong>{student.realName}</strong><span className="student-alias">{student.alias}{student.specialty ? ` · ${student.specialty}` : ''}</span>{student.archivedAt && <span className="historical-badge">Archived</span>}</span></button>;
}
